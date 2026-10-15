import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import { createWriteStream, readFileSync } from 'fs';
import { basename, extname, join } from 'path';
import archiver from 'archiver';
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
import { fileMtimeMs, zipArchiveOptions } from '../../../utils/fileTime';
import { revealAssetPath } from './revealAssetPath';
import { assetArchiveFileName } from './archiveFileName';
import { extractArchiveEntries, installStaged, writeTextFile } from './stagedInstall';
import {
    archiveTopLevelDirs,
    isSafePathSegment,
    normalizedArchiveEntries,
    type NormalizedArchiveEntry,
} from '../fs/archiveEntryPath';
import { HomeFs } from '../wsl/HomeFs';
import { WslDetector } from '../wsl/WslDetector';

interface Options {
    id: string;
    wslTest: string;
    // native 環境を一覧に出すかの判定。指定した場合は、true を返すときだけ native 環境を一覧に出す。
    nativeAvailable?: () => Promise<boolean>;
    parents: Record<AssetKind, string>;
    // Agy custom agents are <name>/agent.md. OpenCode custom agents are <name>.md.
    agentLayout: 'directory' | 'file';
    agentEntryFile?: string;
}

/** Markdown agent と SKILL.md ディレクトリを管理する agent 非依存実装。 */
export class MarkdownAssetManager {
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

    private parent(kind: AssetKind): string {
        return this.options.parents[kind];
    }

    private isDirectoryAsset(kind: AssetKind): boolean {
        return kind === 'skills' || this.options.agentLayout === 'directory';
    }

    private entryFile(kind: AssetKind): string {
        return kind === 'skills' ? 'SKILL.md' : (this.options.agentEntryFile ?? 'agent.md');
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

    async getEnvironments(): Promise<{ env: AgentEnvironment; label: string }[]> {
        const result: { env: AgentEnvironment; label: string }[] = [];
        if (!this.options.nativeAvailable || (await this.options.nativeAvailable())) {
            result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        }
        const distros = await this.detector.getDistrosWithTest(this.options.wslTest);
        for (const distro of distros)
            result.push({ env: { kind: 'wsl', distro: distro.distro }, label: distro.distro });
        return result;
    }

    async list(env: AgentEnvironment, kind: AssetKind): Promise<AssetListReport> {
        const fs = this.fsFor(env);
        const parent = this.parent(kind);
        if ((await fs.resolveRealPath(parent)) === null) {
            return {
                env,
                label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
                kind,
                available: false,
                entries: [],
            };
        }
        const entries = this.isDirectoryAsset(kind)
            ? await this.listDirectories(fs, parent, kind)
            : await this.listFiles(fs, parent);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        return {
            env,
            label: env.kind === 'wsl' ? (env.distro ?? 'WSL') : this.nativeLabel(),
            kind,
            available: true,
            entries,
        };
    }

    private async listDirectories(fs: HomeFs, parent: string, kind: AssetKind): Promise<AssetEntry[]> {
        const entries: AssetEntry[] = [];
        for (const name of await fs.listDirs(parent)) {
            if (this.unsafeName(name)) continue;
            const rel = `${parent}/${name}`;
            const content = await fs.readText(`${rel}/${this.entryFile(kind)}`);
            // Marker file is required by both Agy agents and skills; omit unrelated directories.
            if (content === null) continue;
            const stats = await fs.dirStats(rel);
            const frontmatter = parseFrontmatter(content);
            entries.push({
                name,
                relPath: name,
                isFile: false,
                fileCount: stats.fileCount,
                frontmatter: frontmatter?.fields ?? {},
                frontmatterRaw: frontmatter?.raw ?? null,
                mtimeMs: stats.mtimeMs,
            });
        }
        return entries;
    }

    private async listFiles(fs: HomeFs, parent: string): Promise<AssetEntry[]> {
        const entries: AssetEntry[] = [];
        const walk = async (dir: string, depth: number): Promise<void> => {
            for (const file of await fs.listFiles(dir)) {
                if (!file.toLowerCase().endsWith('.md') || this.unsafeName(file)) continue;
                const full = `${dir}/${file}`;
                const relPath = full.slice(parent.length + 1);
                const content = await fs.readText(full);
                const stats = await fs.fileStats(full);
                const frontmatter = parseFrontmatter(content);
                entries.push({
                    name: file.replace(/\.md$/i, ''),
                    relPath,
                    isFile: true,
                    frontmatter: frontmatter?.fields ?? {},
                    frontmatterRaw: frontmatter?.raw ?? null,
                    mtimeMs: stats.mtimeMs,
                });
            }
            if (depth >= 5) return;
            for (const subdir of await fs.listDirs(dir)) {
                if (!this.unsafeName(subdir)) await walk(`${dir}/${subdir}`, depth + 1);
            }
        };
        await walk(parent, 0);
        return entries;
    }

    async readEntry(env: AgentEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
        if (this.unsafeRelPath(relPath)) return { ok: false, message: 'not-found' };
        const parent = this.parent(kind);
        const file = this.isDirectoryAsset(kind)
            ? `${parent}/${relPath}/${this.entryFile(kind)}`
            : `${parent}/${relPath}`;
        const content = await this.fsFor(env).readText(file);
        return content === null ? { ok: false, message: 'not-found' } : { ok: true, content };
    }

    async revealEntry(env: AgentEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
        if (this.unsafeRelPath(relPath)) return { ok: false, message: 'not-found' };
        const parent = await this.fsFor(env).resolveRealPath(this.parent(kind));
        if (parent === null) return { ok: false, message: 'unavailable' };
        return revealAssetPath(join(parent, relPath), this.isDirectoryAsset(kind));
    }

    async download(
        env: AgentEnvironment,
        kind: AssetKind,
        relPaths: string[],
        window: BrowserWindow | null
    ): Promise<AssetOpResult> {
        const parent = await this.fsFor(env).resolveRealPath(this.parent(kind));
        if (parent === null) return { ok: false, message: 'unavailable' };
        const safe = relPaths.filter(path => !this.unsafeRelPath(path));
        if (safe.length === 0) return { ok: false, message: 'no-selection' };
        const options = {
            defaultPath: assetArchiveFileName({
                kind,
                agentId: this.options.id,
                distro: env.kind === 'wsl' ? env.distro : undefined,
                relPaths: safe,
            }),
            filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
        };
        const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
        if (result.canceled || !result.filePath) return { ok: false, canceled: true };
        try {
            await new Promise<void>((resolve, reject) => {
                const output = createWriteStream(result.filePath as string);
                const archive = archiver('zip', zipArchiveOptions());
                output.on('close', resolve);
                output.on('error', reject);
                archive.on('error', reject);
                archive.pipe(output);
                for (const rel of safe) {
                    if (this.isDirectoryAsset(kind)) archive.directory(join(parent, rel), rel.replace(/\\/g, '/'));
                    else archive.file(join(parent, rel), { name: rel.replace(/\\/g, '/') });
                }
                void archive.finalize();
            });
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

    /** 取り込み対象（ディレクトリ型はトップレベルのディレクトリ名、ファイル型は .md の相対パス）。 */
    private zipTargets(zip: AdmZip, kind: AssetKind): string[] {
        const entries = this.safeZipEntries(zip) ?? [];
        if (this.isDirectoryAsset(kind)) {
            return archiveTopLevelDirs(entries);
        }
        return entries
            .filter(({ path, entry }) => !entry.isDirectory && path.toLowerCase().endsWith('.md'))
            .map(({ path }) => path);
    }

    async inspectUpload(env: AgentEnvironment, kind: AssetKind, window: BrowserWindow | null): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        if ((await fs.resolveRealPath(this.parent(kind))) === null) return { ok: false, message: 'unavailable' };
        const filters = [
            { name: 'Markdown / ZIP', extensions: ['md', 'zip'] },
            { name: 'Markdown', extensions: ['md'] },
            { name: 'ZIP Archives', extensions: ['zip'] },
        ];
        const options: OpenDialogOptions = { filters, properties: ['openFile'] };
        const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
        if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true };
        const source = result.filePaths[0];
        if (extname(source).toLowerCase() === '.md') {
            const target = this.fileTarget(kind, source);
            if (!target) return { ok: false, message: 'md-no-name' };
            const rel = this.isDirectoryAsset(kind) ? target.name : target.relPath;
            const conflicts = (await fs.exists(`${this.parent(kind)}/${rel}`)) ? [target.name] : [];
            return { ok: true, uploadKind: 'md', srcPath: source, targetName: target.name, conflicts };
        }
        try {
            const zip = new AdmZip(source);
            if (this.safeZipEntries(zip) === null) return { ok: false, message: 'invalid-archive' };
            const targets = this.zipTargets(zip, kind);
            if (targets.length === 0) return { ok: false, message: 'invalid-archive' };
            const conflicts: string[] = [];
            for (const target of targets) {
                if (await fs.exists(`${this.parent(kind)}/${target}`)) conflicts.push(target);
            }
            return { ok: true, uploadKind: 'zip', zipPath: source, conflicts };
        } catch (error) {
            console.error(`Failed to inspect asset archive ${source}:`, error);
            return { ok: false, message: 'invalid-archive' };
        }
    }

    private fileTarget(kind: AssetKind, source: string): { name: string; relPath: string } | null {
        const fileName = basename(source);
        if (kind === 'agents' && this.options.agentLayout === 'file') {
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
     * md 単体を取り込む（ディレクトリ型は <名前>/<エントリファイル>、ファイル型は元のファイル名で配置する）。
     * 既にある取り込み先（ディレクトリ型はディレクトリ）は overwrite=true のときだけ丸ごと置き換える。
     * 書き込みに失敗した場合は取り込み前の状態に戻す。
     */
    async uploadFile(
        env: AgentEnvironment,
        kind: AssetKind,
        source: string,
        overwrite: boolean
    ): Promise<AssetOpResult> {
        const target = this.fileTarget(kind, source);
        if (!target) return { ok: false, message: 'md-no-name' };
        const fs = this.fsFor(env);
        const parent = await fs.resolveRealPath(this.parent(kind));
        if (parent === null) return { ok: false, message: 'unavailable' };
        const item = this.isDirectoryAsset(kind) ? target.name : target.relPath;
        if ((await fs.exists(`${this.parent(kind)}/${item}`)) && !overwrite) return { ok: false, message: 'conflict' };
        // 取り込み元ファイルの更新日時。配置後のファイルへ引き継ぐ（アップロード日にしない）。
        const srcMtimeMs = fileMtimeMs(source);
        try {
            const content = readFileSync(source, 'utf8');
            installStaged(parent, [item], new Set(overwrite ? [item] : []), dir =>
                writeTextFile(dir, target.relPath, content, srcMtimeMs)
            );
            return { ok: true, importedCount: 1 };
        } catch (error) {
            console.error(`Failed to upload markdown asset (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    /**
     * ZIP の取り込み対象（zipTargets）だけを取り込む。既にある取り込み対象は overwrite=true のときだけ丸ごと置き換え、
     * overwrite=false のときは何も変えずに conflict を返す。展開は作業用ディレクトリで行い、失敗した場合は取り込み前の状態に戻す。
     */
    async upload(env: AgentEnvironment, kind: AssetKind, source: string, overwrite: boolean): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parent(kind);
        const parent = await fs.resolveRealPath(parentRel);
        if (parent === null) return { ok: false, message: 'unavailable' };
        try {
            const zip = new AdmZip(source);
            const entries = this.safeZipEntries(zip);
            if (entries === null) return { ok: false, message: 'invalid-archive' };
            const targets = this.zipTargets(zip, kind);
            if (targets.length === 0) return { ok: false, message: 'invalid-archive' };
            const conflicts: string[] = [];
            for (const target of targets) {
                if (await fs.exists(`${parentRel}/${target}`)) conflicts.push(target);
            }
            if (conflicts.length > 0 && !overwrite) return { ok: false, message: 'conflict', conflicts };
            const allowed = new Set(targets);
            const included = entries.filter(({ path }) =>
                allowed.has(this.isDirectoryAsset(kind) ? path.split('/')[0] : path)
            );
            installStaged(parent, targets, new Set(conflicts), dir => extractArchiveEntries(included, dir));
            return { ok: true, importedCount: targets.length };
        } catch (error) {
            console.error(`Failed to upload asset archive (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    async deleteSelected(env: AgentEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        let deletedCount = 0;
        const skipped: string[] = [];
        for (const rel of relPaths.filter(path => !this.unsafeRelPath(path))) {
            try {
                if (this.isDirectoryAsset(kind)) {
                    if (!(await fs.removeDirBestEffort(`${this.parent(kind)}/${rel}`)).removedAll) {
                        skipped.push(rel);
                        continue;
                    }
                } else await fs.deleteFile(`${this.parent(kind)}/${rel}`);
                deletedCount += 1;
            } catch (error) {
                console.error(`Failed to delete asset ${rel} (${JSON.stringify(env)}, ${kind}):`, error);
                skipped.push(rel);
            }
        }
        return { ok: skipped.length === 0, deletedCount, skipped: skipped.length > 0 ? skipped : undefined };
    }
}
