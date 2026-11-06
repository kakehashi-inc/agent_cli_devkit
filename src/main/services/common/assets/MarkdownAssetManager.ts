import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import { readFileSync } from 'fs';
import { basename, extname, join } from 'path';
import AdmZip from 'adm-zip';
import type {
    AgentEnvironment,
    AssetEntry,
    AssetKind,
    AssetListReport,
    AssetOpResult,
    OSType,
} from '../../../../shared/agents/types';
import { parseFrontmatter } from '../../../utils/frontmatter';
import { fileMtimeMs } from '../../../utils/fileTime';
import { revealAssetPath } from './revealAssetPath';
import { assetArchiveFileName } from './archiveFileName';
import { nestedReplacedOf, readEntryFile, removeAssetEntry, resolveZipSources, writeAssetZip } from './assetEntryOps';
import { InspectedUploads } from './inspectedUploads';
import { RECURSIVE_ASSET_MAX_DEPTH, scanDirAssets, scanFileAssets, type AssetScan } from './assetScan';
import { installFiles, stagedFilesOfArchive } from './stagedInstall';
import {
    archiveTopLevelDirs,
    isSafePathSegment,
    normalizedArchiveEntries,
    type NormalizedArchiveEntry,
} from '../fs/archiveEntryPath';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';

// 書き込み先以外のルートの行の relPath で、読み取り元の識別子と相対パスを分ける区切り。':' は安全なパスの名前に含まれない。
const ORIGIN_SEPARATOR = '::';

const MD_EXTENSION = '.md';

// 作業用ディレクトリは CLI が再帰で読むルートの外に作る。
const OUTSIDE_ROOT_STAGING = { stagingOutsideDest: true };

/** .md 1 ファイルを 1 件とする読み取り元。maxDepth は再帰で読む深さの上限で、0 は直下だけ。 */
export interface FileLayout {
    layout: 'file';
    maxDepth: number;
    // 行のメタ情報へ上書きする内容（読み取り元によって CLI が値を固定するもの）。
    fixedFields?: Record<string, string>;
}

/** 目印のファイルを持つフォルダーを 1 件とする読み取り元。maxLevels はフォルダーの階層の上限で、1 はルート直下だけ。 */
export interface DirectoryLayout {
    layout: 'directory';
    entryFile: string;
    maxLevels: number;
    // ルート直下の <name>.md も 1 件として読む。
    rootFiles?: boolean;
    // '.' で始まる目印のあるフォルダーを、読み込まれない行として出す。
    hiddenNotLoaded?: boolean;
}

export interface AssetReadRoot {
    rel: string;
    // 読み取り元の識別子。複数のルートを読む種別で、行の由来と優先関係の表示に使う。
    origin?: string;
    // このルートの行に由来を表示しない。
    hideOrigin?: boolean;
    // 同じ名前の定義があるときの優先度。大きい方が優先され、同じ値は優先関係が不明なものとして示す。
    rank?: number;
    scan: FileLayout | DirectoryLayout;
}

// 一覧の 1 行と、その行の読み取り元と、読み取り元からの相対パス。
interface ListedRow {
    entry: AssetEntry;
    root: AssetReadRoot;
    rel: string;
}

interface Options {
    id: string;
    wslTest: string;
    // native 環境を一覧に出すかの判定。指定した場合は、true を返すときだけ native 環境を一覧に出す。
    nativeAvailable?: () => Promise<boolean>;
    wslAvailable?: (env: AgentEnvironment) => Promise<boolean>;
    // 種別ごとの読み取り元。先頭が書き込み先で、アップロードは常に先頭のルートの直下へ置く。
    roots: Record<AssetKind, readonly AssetReadRoot[]>;
}

// ZIP の取り込み計画。
interface ZipPlan {
    // 取り込み対象（ディレクトリ型はトップレベルのディレクトリ名、ファイルは .md の相対パス）。
    targets: string[];
    // 目印のファイルがないため取り込まないトップレベルのディレクトリ名。
    withoutEntry: string[];
}

// 読み取り元で実際に指すパス。
interface ResolvedEntry {
    root: AssetReadRoot;
    rel: string;
    full: string;
}

/** Markdown agent と SKILL.md ディレクトリを管理する agent 非依存実装。 */
export class MarkdownAssetManager {
    // ファイル選択ダイアログで選ばれたファイル（環境と種別ごと）。取り込みはこのファイルだけを受け付ける。
    private readonly inspectedUploads = new InspectedUploads();

    constructor(
        private readonly detector: WslDetector,
        private readonly options: Options
    ) {}

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: AgentEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    private writeRoot(kind: AssetKind): AssetReadRoot {
        return this.options.roots[kind][0];
    }

    private parent(kind: AssetKind): string {
        return this.writeRoot(kind).rel;
    }

    private isDirectoryAsset(kind: AssetKind): boolean {
        return this.writeRoot(kind).scan.layout === 'directory';
    }

    /** 書き込み先のルートの目印のファイル名。ファイル型は使わない。 */
    private entryFile(kind: AssetKind): string {
        const { scan } = this.writeRoot(kind);
        return scan.layout === 'directory' ? scan.entryFile : '';
    }

    /** パストラバーサル対策: 区切り文字・'.'・'..' を含む名前や、別の場所を指し得る名前を拒否する。 */
    private unsafeName(name: string): boolean {
        return !isSafePathSegment(name);
    }

    private unsafeRelPath(path: string): boolean {
        const normalized = path.replace(/\\/g, '/');
        if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return true;
        const segments = normalized.split('/').filter(Boolean);
        return segments.length === 0 || segments.some(segment => this.unsafeName(segment));
    }

    /** 行の relPath を読み取り元と相対パスに分ける。読み取り元が無いか相対パスが安全でなければ null。 */
    private resolveEntry(kind: AssetKind, relPath: string): ResolvedEntry | null {
        const separator = relPath.indexOf(ORIGIN_SEPARATOR);
        const roots = this.options.roots[kind];
        const root =
            separator === -1 ? roots[0] : roots.slice(1).find(item => item.origin === relPath.slice(0, separator));
        const rel = separator === -1 ? relPath : relPath.slice(separator + ORIGIN_SEPARATOR.length);
        if (!root || this.unsafeRelPath(rel)) return null;
        return { root, rel, full: `${root.rel}/${rel.replace(/\\/g, '/')}` };
    }

    async getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]> {
        const result: { env: AgentEnvironment; label: string }[] = [];
        if (!this.options.nativeAvailable || (await this.options.nativeAvailable())) {
            result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        }
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const distro of distros) {
            const env: AgentEnvironment = { kind: 'wsl', distro: distro.distro };
            if (!this.options.wslAvailable || (await this.options.wslAvailable(env))) {
                result.push({ env, label: distro.distro });
            }
        }
        return result;
    }

    async list(env: AgentEnvironment, kind: AssetKind): Promise<AssetListReport> {
        const fs = this.fsFor(env);
        const label = env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel();
        if (!(await fs.isReachable())) {
            return { env, label, kind, available: false, entries: [] };
        }
        const canReveal = (await fs.resolveRealPath(this.parent(kind))) !== null;
        const roots = this.options.roots[kind];
        const rows: ListedRow[] = [];
        let truncated = false;
        let incomplete = false;
        for (const [index, root] of roots.entries()) {
            const scan = await this.scanRoot(fs, root);
            truncated ||= scan.truncated;
            incomplete ||= scan.incomplete;
            for (const entry of scan.entries) {
                rows.push({
                    root,
                    rel: entry.relPath,
                    entry: {
                        ...entry,
                        relPath: index === 0 ? entry.relPath : `${root.origin}${ORIGIN_SEPARATOR}${entry.relPath}`,
                        ...(root.origin && !root.hideOrigin ? { origin: root.origin } : {}),
                    },
                });
            }
        }
        this.markSameNames(rows);
        const entries = rows.map(row => row.entry).sort((a, b) => a.name.localeCompare(b.name));
        return {
            env,
            label,
            kind,
            available: true,
            entries,
            ...(canReveal ? {} : { revealUnavailable: true }),
            ...(truncated ? { truncatedDepth: RECURSIVE_ASSET_MAX_DEPTH } : {}),
            ...(incomplete ? { incomplete: true } : {}),
        };
    }

    private async scanRoot(fs: HomeFs, root: AssetReadRoot): Promise<AssetScan> {
        const { scan } = root;
        if (scan.layout === 'directory') {
            return scanDirAssets(fs, root.rel, {
                entryFile: scan.entryFile,
                maxLevels: scan.maxLevels,
                ...(scan.rootFiles ? { rootFileExtension: MD_EXTENSION } : {}),
                ...(scan.hiddenNotLoaded ? { hiddenNotLoaded: true } : {}),
            });
        }
        const result = await scanFileAssets(fs, root.rel, { extension: MD_EXTENSION, maxDepth: scan.maxDepth });
        const { fixedFields } = scan;
        if (!fixedFields) return result;
        return {
            ...result,
            entries: result.entries.map(entry => ({
                ...entry,
                frontmatter: { ...entry.frontmatter, ...fixedFields },
            })),
        };
    }

    /**
     * 複数の読み取り元で名前が同じ定義の行に、優先される読み取り元か、優先関係の不明な読み取り元を記録する。
     * 名前は読み取り元からの相対パスから拡張子を除いたもの。読み込まれない行は比べない。
     */
    private markSameNames(rows: readonly ListedRow[]): void {
        const groups = new Map<string, ListedRow[]>();
        for (const row of rows) {
            if (row.entry.status) continue;
            const name = row.rel.replace(/\.md$/i, '');
            groups.set(name, [...(groups.get(name) ?? []), row]);
        }
        for (const group of groups.values()) {
            if (new Set(group.map(row => row.root)).size < 2) continue;
            const best = Math.max(...group.map(row => row.root.rank ?? 0));
            const winners = group.filter(row => (row.root.rank ?? 0) === best);
            for (const row of group) {
                if ((row.root.rank ?? 0) < best) {
                    row.entry.overriddenBy = winners[0].root.origin;
                } else if (winners.length > 1) {
                    row.entry.sameNameIn = winners.find(other => other.root !== row.root)?.root.origin;
                }
            }
        }
    }

    async readEntry(env: AgentEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
        const entry = this.resolveEntry(kind, relPath);
        if (!entry) return { ok: false, message: 'not-found' };
        const fs = this.fsFor(env);
        const stat = await fs.statFile(entry.full);
        let content: string | null = null;
        if (stat.kind === 'file') {
            content = await fs.readText(entry.full);
        } else if (stat.kind === 'other' && entry.root.scan.layout === 'directory') {
            content = await readEntryFile(fs, entry.full, entry.root.scan.entryFile);
        }
        return content === null ? { ok: false, message: 'not-found' } : { ok: true, content };
    }

    async revealEntry(env: AgentEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
        const entry = this.resolveEntry(kind, relPath);
        if (!entry) return { ok: false, message: 'not-found' };
        const fs = this.fsFor(env);
        const parent = await fs.resolveRealPath(entry.root.rel);
        if (parent === null) return { ok: false, message: 'unavailable' };
        const stat = await fs.statFile(entry.full);
        return revealAssetPath(join(parent, entry.rel), stat.kind !== 'file');
    }

    /** 選択したエントリを 1 つの ZIP にまとめて保存する。リンクはリンク先の内容を入れ、リンク切れは含めない。 */
    async download(
        env: AgentEnvironment,
        kind: AssetKind,
        relPaths: string[],
        window: BrowserWindow | null
    ): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        if (!(await fs.isReachable())) return { ok: false, message: 'unavailable' };
        const resolved = relPaths.flatMap(path => this.resolveEntry(kind, path) ?? []);
        // 読み取り元が違う同じ相対パスは、ZIP の中で重ならないよう読み取り元の識別子の下へ入れる。
        const usedNames = new Set<string>();
        const items = resolved.map(({ root, rel }) => {
            const name = usedNames.has(rel) ? `${root.origin}/${rel}` : rel;
            usedNames.add(name);
            return { rootRel: root.rel, rel, name };
        });
        const sources = await resolveZipSources(fs, items);
        if (sources.length === 0) return { ok: false, message: 'no-selection' };
        const options = {
            defaultPath: assetArchiveFileName({
                kind,
                agentId: this.options.id,
                distro: env.kind === 'wsl' ? env.distro : undefined,
                relPaths: resolved.map(item => item.rel),
            }),
            filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
        };
        const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
        if (result.canceled || !result.filePath) return { ok: false, canceled: true };
        try {
            await writeAssetZip(fs, sources, result.filePath);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to archive assets (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'download-failed' };
        }
    }

    /** ZIP のエントリを正規化した相対パスと組にして返す（'./' などは取り除く）。不正な名前を含む ZIP は null。 */
    private safeZipEntries(zip: AdmZip): NormalizedArchiveEntry[] | null {
        return normalizedArchiveEntries(zip);
    }

    /**
     * 取り込み計画を作る。ファイル型は .md の相対パスを対象にする。ディレクトリ型は目印のファイルを持つ
     * トップレベルのディレクトリを対象にし、一覧に出ないものを取り込まないよう、目印のないディレクトリは対象から外す。
     * 直下の .md を読む種別はトップレベルの .md も対象にする。
     */
    private zipPlan(entries: readonly NormalizedArchiveEntry[], kind: AssetKind): ZipPlan {
        const { scan } = this.writeRoot(kind);
        const isMd = (path: string) => path.toLowerCase().endsWith(MD_EXTENSION);
        if (scan.layout === 'file') {
            const targets = entries
                .filter(({ path, entry }) => !entry.isDirectory && isMd(path))
                .map(({ path }) => path);
            return { targets, withoutEntry: [] };
        }
        const entryLower = scan.entryFile.toLowerCase();
        const hasEntry = (dir: string) =>
            entries.some(({ path, entry }) => {
                if (entry.isDirectory || !path.startsWith(`${dir}/`)) return false;
                const segments = path.split('/');
                return (
                    segments.length - 1 <= scan.maxLevels && segments[segments.length - 1].toLowerCase() === entryLower
                );
            });
        const dirs = archiveTopLevelDirs(entries);
        const rootFiles = scan.rootFiles
            ? entries.filter(({ path, entry }) => !entry.isDirectory && !path.includes('/') && isMd(path))
            : [];
        return {
            targets: [...dirs.filter(hasEntry), ...rootFiles.map(({ path }) => path)],
            withoutEntry: dirs.filter(dir => !hasEntry(dir)),
        };
    }

    /** ZIP の取り込み計画に対する拒否の理由。取り込めるなら null。 */
    private planProblem(plan: ZipPlan): string | null {
        if (plan.targets.length > 0) return null;
        return plan.withoutEntry.length > 0 ? 'no-entry-file' : 'invalid-archive';
    }

    async inspectUpload(env: AgentEnvironment, kind: AssetKind, window: BrowserWindow | null): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        if (!(await fs.isReachable())) return { ok: false, message: 'unavailable' };
        const filters = [
            { name: 'Markdown / ZIP', extensions: ['md', 'zip'] },
            { name: 'Markdown', extensions: ['md'] },
            { name: 'ZIP Archives', extensions: ['zip'] },
        ];
        const options: OpenDialogOptions = { filters, properties: ['openFile'] };
        const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
        if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true };
        this.inspectedUploads.remember(env, kind, result.filePaths[0]);
        return this.inspectSource(env, fs, kind, result.filePaths[0]);
    }

    /**
     * 選択されたファイルの取り込み前の検査。同じ名前の既存のものを conflicts に、取り込まないものを kindNames に、
     * 上書きで一緒に置き換わるスキルを nestedReplaced に返す。
     */
    private async inspectSource(
        env: AgentEnvironment,
        fs: HomeFs,
        kind: AssetKind,
        source: string
    ): Promise<AssetOpResult> {
        if (extname(source).toLowerCase() === MD_EXTENSION) {
            const target = this.fileTarget(kind, source);
            if (!target) return { ok: false, message: 'md-no-name' };
            const item = this.isDirectoryAsset(kind) ? target.name : target.relPath;
            const conflicts = (await fs.exists(`${this.parent(kind)}/${item}`)) ? [item] : [];
            const nested = await nestedReplacedOf(kind, conflicts, () => this.list(env, kind));
            return { ok: true, uploadKind: 'md', srcPath: source, targetName: target.name, conflicts, ...nested };
        }
        try {
            const entries = this.safeZipEntries(new AdmZip(source));
            if (entries === null) return { ok: false, message: 'invalid-archive' };
            const plan = this.zipPlan(entries, kind);
            const problem = this.planProblem(plan);
            if (problem) return { ok: false, message: problem };
            const conflicts: string[] = [];
            for (const target of plan.targets) {
                if (await fs.exists(`${this.parent(kind)}/${target}`)) conflicts.push(target);
            }
            const warn =
                plan.withoutEntry.length > 0
                    ? { kindCheck: 'warn' as const, kindMessage: 'no-entry-file', kindNames: plan.withoutEntry }
                    : {};
            const nested = await nestedReplacedOf(kind, conflicts, () => this.list(env, kind));
            return { ok: true, uploadKind: 'zip', zipPath: source, conflicts, ...warn, ...nested };
        } catch (error) {
            console.error(`Failed to inspect asset archive ${source}:`, error);
            return { ok: false, message: 'invalid-archive' };
        }
    }

    private fileTarget(kind: AssetKind, source: string): { name: string; relPath: string } | null {
        const fileName = basename(source);
        if (!this.isDirectoryAsset(kind)) {
            if (this.unsafeName(fileName)) return null;
            return { name: fileName.replace(/\.md$/i, ''), relPath: fileName };
        }
        let name = basename(fileName, extname(fileName)).toLowerCase();
        if (fileName.toLowerCase() === this.entryFile(kind).toLowerCase()) {
            try {
                name = parseFrontmatter(readFileSync(source, 'utf8'))?.fields.name?.trim() ?? '';
            } catch {
                return null;
            }
        }
        if (this.unsafeName(name)) return null;
        return { name, relPath: `${name}/${this.entryFile(kind)}` };
    }

    /**
     * md 単体を取り込む（ディレクトリ型は <名前>/<エントリファイル>、ファイル型は元のファイル名で書き込み先の直下へ配置する）。
     * .md 以外のファイルと、検査で選ばれたファイル以外は取り込まない。既にある取り込み先（ディレクトリ型はディレクトリ）は
     * overwrite=true のときだけ丸ごと置き換える。書き込みに失敗した場合は取り込み前の状態に戻す。
     */
    async uploadFile(
        env: AgentEnvironment,
        kind: AssetKind,
        source: string,
        overwrite: boolean
    ): Promise<AssetOpResult> {
        if (!this.inspectedUploads.accepts(env, kind, source)) return { ok: false, message: 'invalid-input' };
        if (extname(source).toLowerCase() !== MD_EXTENSION) return { ok: false, message: 'invalid-file' };
        const target = this.fileTarget(kind, source);
        if (!target) return { ok: false, message: 'md-no-name' };
        const fs = this.fsFor(env);
        if (!(await fs.isReachable())) return { ok: false, message: 'unavailable' };
        const item = this.isDirectoryAsset(kind) ? target.name : target.relPath;
        if ((await fs.exists(`${this.parent(kind)}/${item}`)) && !overwrite) return { ok: false, message: 'conflict' };
        // 取り込み元ファイルの更新日時。配置後のファイルへ引き継ぐ（アップロード日にしない）。
        const srcMtimeMs = fileMtimeMs(source);
        try {
            const content = Buffer.from(readFileSync(source, 'utf8'), 'utf8');
            await installFiles(
                fs,
                this.parent(kind),
                [item],
                new Set(overwrite ? [item] : []),
                [{ relPath: target.relPath, bytes: content, mtimeMs: srcMtimeMs }],
                OUTSIDE_ROOT_STAGING
            );
            this.inspectedUploads.forget(env, kind);
            return { ok: true, importedCount: 1 };
        } catch (error) {
            console.error(`Failed to upload markdown asset (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    /**
     * ZIP の取り込み対象（zipPlan）だけを取り込む。検査で選ばれたファイル以外は受け付けない。
     * 既にある取り込み対象は overwrite=true のときだけ丸ごと置き換え、
     * overwrite=false のときは何も変えずに conflict を返す。展開は作業用ディレクトリで行い、失敗した場合は取り込み前の状態に戻す。
     */
    async upload(env: AgentEnvironment, kind: AssetKind, source: string, overwrite: boolean): Promise<AssetOpResult> {
        if (!this.inspectedUploads.accepts(env, kind, source)) return { ok: false, message: 'invalid-input' };
        const fs = this.fsFor(env);
        const parentRel = this.parent(kind);
        if (!(await fs.isReachable())) return { ok: false, message: 'unavailable' };
        try {
            const entries = this.safeZipEntries(new AdmZip(source));
            if (entries === null) return { ok: false, message: 'invalid-archive' };
            const plan = this.zipPlan(entries, kind);
            const problem = this.planProblem(plan);
            if (problem) return { ok: false, message: problem };
            const conflicts: string[] = [];
            for (const target of plan.targets) {
                if (await fs.exists(`${parentRel}/${target}`)) conflicts.push(target);
            }
            if (conflicts.length > 0 && !overwrite) return { ok: false, message: 'conflict', conflicts };
            const allowed = new Set(plan.targets);
            const included = entries.filter(({ path }) =>
                allowed.has(this.isDirectoryAsset(kind) ? path.split('/')[0] : path)
            );
            await installFiles(
                fs,
                parentRel,
                plan.targets,
                new Set(conflicts),
                stagedFilesOfArchive(included),
                OUTSIDE_ROOT_STAGING
            );
            this.inspectedUploads.forget(env, kind);
            return { ok: true, importedCount: plan.targets.length };
        } catch (error) {
            console.error(`Failed to upload asset archive (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    /**
     * 選択したエントリを削除する。行そのものがリンクならリンクだけを外し、リンク先のフォルダーの中のものは削除しない。
     * 削除で空になった親フォルダーは読み取り元のルートの手前まで削除する。例外は投げず、消せなかった対象を skipped に返す。
     */
    async deleteSelected(env: AgentEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        if (!(await fs.isReachable())) return { ok: false, message: 'unavailable' };
        const safe = relPaths.filter(path => this.resolveEntry(kind, path) !== null);
        if (safe.length === 0) return { ok: false, message: 'no-selection' };
        let deletedCount = 0;
        const skipped: string[] = [];
        for (const relPath of safe) {
            const { root, rel } = this.resolveEntry(kind, relPath) as ResolvedEntry;
            try {
                if (await removeAssetEntry(fs, root.rel, rel, root.scan.layout === 'directory')) deletedCount += 1;
                else skipped.push(relPath);
            } catch (error) {
                console.error(`Failed to delete asset ${relPath} (${JSON.stringify(env)}, ${kind}):`, error);
                skipped.push(relPath);
            }
        }
        return { ok: skipped.length === 0, deletedCount, skipped: skipped.length > 0 ? skipped : undefined };
    }
}
