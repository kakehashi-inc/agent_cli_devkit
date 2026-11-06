import { app, BrowserWindow, dialog } from 'electron';
import { createWriteStream, existsSync, readdirSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { basename, extname, join } from 'path';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import {
    ASSET_PARENT_REL,
    OFFICIAL_SKILLS_REPO_BRANCH,
    OFFICIAL_SKILLS_REPO_DIRNAME,
    OFFICIAL_SKILLS_REPO_SUBDIR,
    OFFICIAL_SKILLS_REPO_URL,
    CODEX_WSL_CLI_TEST,
} from '../../../shared/agents/codex/constants';
import {
    AssetEntry,
    AssetKind,
    AssetListReport,
    AssetOpResult,
    CodexEnvironment,
    OSType,
} from '../../../shared/agents/codex/types';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { GitRunner } from '../common/git/GitRunner';
import { revealAssetPath } from '../common/assets/revealAssetPath';
import { assetArchiveFileName } from '../common/assets/archiveFileName';
import { installFiles, stagedFilesOfArchive } from '../common/assets/stagedInstall';
import { RECURSIVE_ASSET_MAX_DEPTH, scanDirAssets, scanFileAssets, type AssetScan } from '../common/assets/assetScan';
import {
    nestedReplacedOf,
    readEntryFile,
    removeAssetEntry,
    resolveZipSources,
    writeAssetZip,
} from '../common/assets/assetEntryOps';
import { InspectedUploads } from '../common/assets/inspectedUploads';
import {
    archiveTopLevelDirs,
    archiveTopLevelNames,
    isSafePathSegment,
    normalizedArchiveEntries,
} from '../common/fs/archiveEntryPath';
import { parseFrontmatter, parseYamlScalars } from '../../utils/frontmatter';
import { parseToml } from '../../utils/tomlSubtree';
import { fileMtimeMs, zipArchiveOptions } from '../../utils/fileTime';
import { recursiveDirStats } from '../../utils/fsSize';

const SKILL_ENTRY_FILE = 'SKILL.md';

// Codex がスキルを探すフォルダーの階層の上限（CLI の MAX_SCAN_DEPTH。ルートを 0 として 6 階層目のフォルダーまで読む）。
const SKILL_SCAN_MAX_LEVELS = 6;

// 作業用ディレクトリは Codex が再帰で読むルートの外に作る。
const OUTSIDE_ROOT_STAGING = { stagingOutsideDest: true };

// 公式スキルリポジトリ配下を探索する深さの上限（ネストしたスキルを拾うため）。
const OFFICIAL_SKILLS_SCAN_MAX_DEPTH = 3;

// エージェント .toml から一覧表示に用いるメタキー。
const AGENT_META_KEYS = ['name', 'description', 'model', 'model_reasoning_effort'] as const;

/**
 * Codex CLI の ~/.codex/agents（*.toml）・~/.agents/skills（<skill>/SKILL.md）を管理する。
 *
 * 一覧の単位は種別で異なる:
 * - skills: SKILL.md を持つフォルダー（スキルの中のスキルを含むネストも読む。frontmatter は <skill>/SKILL.md から読む）。
 *           '.' で始まるフォルダーは読み込まれない行として出す。新規の配置は skills/ 直下。
 * - agents: agents/ 直下および再帰サブディレクトリの .toml ファイル。1 ファイル = 1 エージェント。
 *           メタは TOML の name/description/model/model_reasoning_effort フィールドから読む。
 *
 * リンクも一覧に出して印を付ける。削除はリンクだけを外し、リンク先のフォルダーの中のものは削除しない。
 *
 * DL/UL は ZIP で行う。単体ファイル UL は skills=.md（SKILL.md 化）、agents=.toml（そのまま配置）。
 * ZIP の作成と取り込みは native は通常の fs で、WSL は distro のスクリプトで本文を受け渡して行う。
 * ファイルマネージャーでの表示だけは OS のプロセスから見えるパスが要るので、UNC に届かない WSL では使えない。
 */
export class CodexAssetManager {
    // ファイル選択ダイアログで選ばれたファイル（環境と種別ごと）。取り込みはこのファイルだけを受け付ける。
    private readonly inspectedUploads = new InspectedUploads();
    private readonly detector: WslDetector;
    private readonly git: GitRunner;

    constructor(detector: WslDetector, git: GitRunner = new GitRunner()) {
        this.detector = detector;
        this.git = git;
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: CodexEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /** agents/ skills/ の HOME 相対パス（'.codex/agents' / '.agents/skills'）。 */
    private parentRel(kind: AssetKind): string {
        return ASSET_PARENT_REL[kind];
    }

    /** パストラバーサル対策: 区切り文字・'.'・'..' を含む名前や、別の場所を指し得る名前を拒否する。 */
    private isUnsafeName(name: string): boolean {
        return !isSafePathSegment(name);
    }

    /** parentRel 直下の dirs のいずれかがリンク（シンボリックリンク・ジャンクション）か。 */
    private async anyLinkedDir(fs: HomeFs, parentRel: string, dirs: string[]): Promise<boolean> {
        for (const dir of dirs) {
            if (await fs.isLink(`${parentRel}/${dir}`)) {
                return true;
            }
        }
        return false;
    }

    /** 相対パス（区切りは '/'）が安全か。各セグメントを isUnsafeName で検証する。 */
    private isUnsafeRelPath(relPath: string): boolean {
        const normalized = relPath.replace(/\\/g, '/');
        if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) {
            return true;
        }
        const segments = normalized.split('/').filter(s => s.length > 0);
        if (segments.length === 0) {
            return true;
        }
        return segments.some(s => this.isUnsafeName(s));
    }

    /** 管理対象の環境一覧（native + Codex 入り WSL distro）。 */
    async getEnvironments(refresh = false): Promise<{ env: CodexEnvironment; label: string }[]> {
        if (refresh) this.detector.invalidate();
        const result: { env: CodexEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(CODEX_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /**
     * 指定環境・種別の一覧を返す。
     * 環境のファイルに届かない場合は available:false で空一覧。
     */
    async list(env: CodexEnvironment, kind: AssetKind): Promise<AssetListReport> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);

        if (!(await fs.isReachable())) {
            return { env, label, kind, available: false, entries: [] };
        }
        const canReveal = (await fs.resolveRealPath(parentRel)) !== null;

        const scan = kind === 'skills' ? await this.scanSkills(fs, parentRel) : await this.scanAgents(fs, parentRel);
        scan.entries.sort((a, b) => a.name.localeCompare(b.name));
        return {
            env,
            label,
            kind,
            available: true,
            entries: scan.entries,
            ...(canReveal ? {} : { revealUnavailable: true }),
            ...(scan.truncated ? { truncatedDepth: RECURSIVE_ASSET_MAX_DEPTH } : {}),
            ...(scan.incomplete ? { incomplete: true } : {}),
        };
    }

    /**
     * skills/: SKILL.md を持つフォルダーを 1 件とする（Codex の探索の深さまで。SKILL.md のあるフォルダーの下も読む）。
     * Codex は '.' で始まるフォルダーを飛ばすので、そこに SKILL.md があれば読み込まれない行にする。
     * <skill>/agents/openai.yaml があれば、その呼び出しポリシー（policy.*）もメタへ加える。リンクも対象にする。
     */
    private scanSkills(fs: HomeFs, parentRel: string): Promise<AssetScan> {
        return scanDirAssets(fs, parentRel, {
            entryFile: SKILL_ENTRY_FILE,
            maxLevels: SKILL_SCAN_MAX_LEVELS,
            walkBelowEntry: true,
            hiddenNotLoaded: true,
            listWithoutEntry: true,
            extraMeta: async dirRel => this.parseSkillPolicy(await fs.readText(`${dirRel}/agents/openai.yaml`)),
        });
    }

    /**
     * agents/: 配下の .toml ファイルを再帰で 1 件ずつ展開する。リンクも対象にする。
     * メタは TOML の name/description/model/model_reasoning_effort から読む。
     */
    private scanAgents(fs: HomeFs, parentRel: string): Promise<AssetScan> {
        return scanFileAssets(fs, parentRel, {
            extension: '.toml',
            maxDepth: RECURSIVE_ASSET_MAX_DEPTH,
            describe: raw => ({ frontmatter: this.parseAgentMeta(raw), frontmatterRaw: raw }),
        });
    }

    /** agents/openai.yaml のテキストから policy.* のスカラー値だけを抽出する。 */
    private parseSkillPolicy(raw: string | null): Record<string, string> {
        const policy: Record<string, string> = {};
        for (const [key, value] of Object.entries(parseYamlScalars(raw))) {
            if (key.startsWith('policy.')) {
                policy[key] = value;
            }
        }
        return policy;
    }

    /** エージェント .toml のテキストからメタフィールドと無効化した機能（features）を抽出する（欠落キーは入れない）。 */
    private parseAgentMeta(raw: string | null): Record<string, string> {
        if (!raw) {
            return {};
        }
        let data: unknown;
        try {
            data = parseToml(raw);
        } catch {
            return {};
        }
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            return {};
        }
        const obj = data as Record<string, unknown>;
        const meta: Record<string, string> = {};
        for (const key of AGENT_META_KEYS) {
            const value = obj[key];
            if (value !== undefined && value !== null && typeof value !== 'object') {
                meta[key] = String(value);
            }
        }
        // [features] で無効にした機能（`機能名 = false`、またはテーブル形式の `[features.機能名]` で
        // `enabled = false`）を「機能名=false」のカンマ区切りでまとめる。
        const features = obj.features;
        if (features && typeof features === 'object' && !Array.isArray(features)) {
            const disabled = Object.entries(features as Record<string, unknown>)
                .filter(
                    ([, value]) =>
                        value === false ||
                        (!!value &&
                            typeof value === 'object' &&
                            !Array.isArray(value) &&
                            (value as Record<string, unknown>).enabled === false)
                )
                .map(([name]) => `${name}=false`);
            if (disabled.length > 0) {
                meta.features = disabled.join(', ');
            }
        }
        return meta;
    }

    /**
     * 1 エントリの内容全体を読み取る（参照ダイアログの「全体」表示用）。
     * - agents: relPath のファイルそのもの
     * - skills: <relPath>/SKILL.md
     */
    async readEntry(env: CodexEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
        if (this.isUnsafeRelPath(relPath)) {
            return { ok: false, message: 'not-found' };
        }
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        const content =
            kind === 'skills'
                ? await readEntryFile(fs, `${parentRel}/${relPath}`, SKILL_ENTRY_FILE)
                : await fs.readText(`${parentRel}/${relPath}`);
        if (content === null) {
            return { ok: false, message: 'not-found' };
        }
        return { ok: true, content };
    }

    /** OS 標準のファイルマネージャーで対象エントリを表示する。 */
    async revealEntry(env: CodexEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
        if ((kind !== 'agents' && kind !== 'skills') || this.isUnsafeRelPath(relPath)) {
            return { ok: false, message: 'not-found' };
        }
        const fs = this.fsFor(env);
        const parentReal = await fs.resolveRealPath(this.parentRel(kind));
        if (parentReal === null) {
            return { ok: false, message: 'unavailable' };
        }
        return revealAssetPath(join(parentReal, relPath), kind === 'skills');
    }

    /**
     * 選択したエントリ（relPaths）を 1 つの ZIP にまとめて保存する。複数選択でも 1 ファイルにまとめ、保存先はダイアログで指定する。
     * リンクはリンク先の内容を入れ、リンク切れは含めない。relPaths は list() が返した AssetEntry.relPath。
     */
    async download(
        env: CodexEnvironment,
        kind: AssetKind,
        relPaths: string[],
        window: BrowserWindow | null
    ): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        if (!(await fs.isReachable())) {
            return { ok: false, message: 'unavailable' };
        }

        const safe = relPaths.filter(p => !this.isUnsafeRelPath(p));
        const sources = await resolveZipSources(
            fs,
            safe.map(rel => ({ rootRel: parentRel, rel }))
        );
        if (sources.length === 0) {
            return { ok: false, message: 'no-selection' };
        }

        const defaultName = assetArchiveFileName({
            kind,
            agentId: 'codex',
            distro: env.kind === 'wsl' ? env.distro : undefined,
            relPaths: safe,
        });

        const saveResult = window
            ? await dialog.showSaveDialog(window, {
                  defaultPath: defaultName,
                  filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
              })
            : await dialog.showSaveDialog({
                  defaultPath: defaultName,
                  filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
              });

        if (saveResult.canceled || !saveResult.filePath) {
            return { ok: false, canceled: true };
        }

        try {
            await writeAssetZip(fs, sources, saveResult.filePath);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to create archive (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'download-failed' };
        }
    }

    /**
     * アップロード前検査: ファイル（ZIP or 単体）を選択させ、取り込み対象のうち既にあるもの（衝突）を返す。
     * 実際の展開は upload()/uploadFile() で行う（renderer が衝突確認後に呼ぶ）。
     */
    async inspectUpload(env: CodexEnvironment, kind: AssetKind, window: BrowserWindow | null): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        if (!(await fs.isReachable())) {
            return { ok: false, message: 'unavailable' };
        }

        // 単体ファイルの拡張子は種別で分岐する（skills=md, agents=toml）。
        const fileExt = kind === 'skills' ? 'md' : 'toml';
        const filters = [
            { name: 'Archive / File', extensions: ['zip', fileExt] },
            { name: 'ZIP Archives', extensions: ['zip'] },
            { name: kind === 'skills' ? 'Markdown' : 'TOML', extensions: [fileExt] },
        ];
        const openResult = window
            ? await dialog.showOpenDialog(window, { filters, properties: ['openFile'] })
            : await dialog.showOpenDialog({ filters, properties: ['openFile'] });

        if (openResult.canceled || openResult.filePaths.length === 0) {
            return { ok: false, canceled: true };
        }

        const srcPath = openResult.filePaths[0];
        this.inspectedUploads.remember(env, kind, srcPath);
        if (extname(srcPath).toLowerCase() !== '.zip') {
            return this.inspectFileUpload(env, fs, parentRel, kind, srcPath);
        }

        let zip: AdmZip;
        try {
            zip = new AdmZip(srcPath);
        } catch (error) {
            console.error(`Failed to read archive ${srcPath}:`, error);
            return { ok: false, message: 'invalid-archive' };
        }
        // パストラバーサル対策: 不正なエントリ名を含む ZIP は拒否する。
        const normalized = normalizedArchiveEntries(zip);
        if (normalized === null) {
            return { ok: false, message: 'invalid-archive' };
        }
        // OS の管理用エントリだけの ZIP は空として扱う。
        if (normalized.length === 0) {
            return { ok: false, message: 'empty-archive' };
        }

        if (this.uploadItems(zip, kind).length === 0) {
            return { ok: false, message: 'invalid-archive' };
        }

        const cls = this.classifyZipKind(zip, kind);
        const conflicts = await this.computeConflicts(fs, parentRel, zip, kind);
        const warn = cls.verdict === 'warn' ? { kindCheck: 'warn' as const, kindMessage: cls.reason } : {};
        const nested = await nestedReplacedOf(kind, conflicts, () => this.list(env, kind));
        return { ok: true, uploadKind: 'zip', zipPath: srcPath, conflicts, ...warn, ...nested };
    }

    /** 単体ファイル UL の前検査。取り込み先の名前を算出し、既存との衝突を返す。 */
    private async inspectFileUpload(
        env: CodexEnvironment,
        fs: HomeFs,
        parentRel: string,
        kind: AssetKind,
        filePath: string
    ): Promise<AssetOpResult> {
        const target = await this.resolveFileTarget(kind, filePath);
        if (!target.ok || !target.name || !target.relPath) {
            return target;
        }
        const conflictRel = kind === 'skills' ? `${parentRel}/${target.name}` : `${parentRel}/${target.relPath}`;
        const conflicts = (await fs.exists(conflictRel)) ? [target.name] : [];

        const cls = this.classifyFileKind(kind, filePath);
        const warn = cls.verdict === 'warn' ? { kindCheck: 'warn' as const, kindMessage: cls.reason } : {};
        const uploadKind = kind === 'skills' ? ('md' as const) : ('toml' as const);
        const nested = await nestedReplacedOf(kind, conflicts, () => this.list(env, kind));
        return { ok: true, uploadKind, srcPath: filePath, targetName: target.name, conflicts, ...warn, ...nested };
    }

    /**
     * 単体ファイルから取り込み先（名前 / 相対パス）を算出する。
     * - skills: SKILL.md なら frontmatter の name、それ以外はファイル名（拡張子除去・小文字化）を
     *   ディレクトリ名にし、<dir>/SKILL.md へ配置する。
     * - agents: 元ファイル名のまま .codex/agents 直下へ配置する。
     */
    private async resolveFileTarget(
        kind: AssetKind,
        filePath: string
    ): Promise<AssetOpResult & { name?: string; relPath?: string }> {
        const fileName = basename(filePath);
        if (kind === 'agents') {
            if (this.isUnsafeName(fileName) || extname(fileName).toLowerCase() !== '.toml') {
                return { ok: false, message: 'invalid-file' };
            }
            return { ok: true, name: fileName, relPath: fileName };
        }
        // skills
        if (extname(fileName).toLowerCase() !== '.md') {
            return { ok: false, message: 'invalid-file' };
        }
        let dirName: string;
        if (fileName.toLowerCase() === 'skill.md') {
            let content: string;
            try {
                content = readFileSync(filePath, 'utf-8');
            } catch (error) {
                console.error(`Failed to read file ${filePath}:`, error);
                return { ok: false, message: 'invalid-file' };
            }
            const fm = parseFrontmatter(content);
            const name = fm?.fields?.name?.trim();
            if (!name || this.isUnsafeName(name)) {
                return { ok: false, message: 'md-no-name' };
            }
            dirName = name;
        } else {
            dirName = basename(fileName, extname(fileName)).toLowerCase();
            if (!dirName || this.isUnsafeName(dirName)) {
                return { ok: false, message: 'invalid-file' };
            }
        }
        return { ok: true, name: dirName, relPath: `${dirName}/SKILL.md` };
    }

    /**
     * 単体ファイルを取り込む。
     * - skills: <dir>/SKILL.md として配置。overwrite 時は既存の <dir> を丸ごと置き換える。
     * - agents: 元ファイル名のまま .codex/agents 直下へ配置。overwrite 時は既存のファイルを置き換える。
     * 既にある取り込み先は overwrite=true のときだけ置き換える。書き込みに失敗した場合は取り込み前の状態に戻す。
     * 検査で選ばれたファイル以外は受け付けない。
     */
    async uploadFile(
        env: CodexEnvironment,
        kind: AssetKind,
        filePath: string,
        overwrite: boolean
    ): Promise<AssetOpResult> {
        if (!this.inspectedUploads.accepts(env, kind, filePath)) return { ok: false, message: 'invalid-input' };
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        if (!(await fs.isReachable())) {
            return { ok: false, message: 'unavailable' };
        }

        const target = await this.resolveFileTarget(kind, filePath);
        if (!target.ok || !target.name || !target.relPath) {
            return target;
        }

        let content: string;
        try {
            content = readFileSync(filePath, 'utf-8');
        } catch (error) {
            console.error(`Failed to read file ${filePath}:`, error);
            return { ok: false, message: 'invalid-file' };
        }

        // 取り込み元ファイルの更新日時。配置後のファイルへ引き継ぐ（アップロード日にしない）。
        const srcMtimeMs = fileMtimeMs(filePath);
        const item = kind === 'skills' ? target.name : target.relPath;
        const relPath = target.relPath;

        try {
            await installFiles(
                fs,
                parentRel,
                [item],
                new Set(overwrite ? [item] : []),
                [{ relPath, bytes: Buffer.from(content, 'utf8'), mtimeMs: srcMtimeMs }],
                OUTSIDE_ROOT_STAGING
            );
            this.inspectedUploads.forget(env, kind);
            return { ok: true, importedCount: 1 };
        } catch (error) {
            console.error(`Failed to upload file (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    /**
     * ZIP を対象フォルダへ展開する。
     * 取り込み対象のうち既にあるもの（computeConflicts）は、overwrite=true のときだけ丸ごと置き換え
     * （skills=トップレベルのディレクトリ / agents=ファイル）、overwrite=false のときは何も変えずに conflict を返す。
     * 展開は作業用ディレクトリで行い、失敗した場合は取り込み前の状態に戻す。検査で選ばれたファイル以外は受け付けない。
     */
    async upload(env: CodexEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean): Promise<AssetOpResult> {
        if (!this.inspectedUploads.accepts(env, kind, zipPath)) return { ok: false, message: 'invalid-input' };
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        if (!(await fs.isReachable())) {
            return { ok: false, message: 'unavailable' };
        }

        let zip: AdmZip;
        try {
            zip = new AdmZip(zipPath);
        } catch (error) {
            console.error(`Failed to read archive ${zipPath}:`, error);
            return { ok: false, message: 'invalid-archive' };
        }

        if (zip.getEntries().length === 0) {
            return { ok: false, message: 'empty-archive' };
        }

        // パストラバーサル対策: 不正なエントリ名を含む ZIP は拒否する。
        const entries = normalizedArchiveEntries(zip);
        if (entries === null) {
            console.error(`Rejected archive with unsafe entry: ${zipPath}`);
            return { ok: false, message: 'invalid-archive' };
        }
        // OS の管理用エントリだけの ZIP は空として扱う。
        if (entries.length === 0) {
            return { ok: false, message: 'empty-archive' };
        }

        const items = this.uploadItems(zip, kind);
        if (items.length === 0) {
            return { ok: false, message: 'invalid-archive' };
        }

        try {
            // リンクのスキルディレクトリには展開しない（リンク先の管理対象外のファイルを書き換えないため）。
            if (kind === 'skills' && (await this.anyLinkedDir(fs, parentRel, this.zipTopLevelNamesFrom(zip)))) {
                return { ok: false, message: 'upload-failed' };
            }

            const conflicts = await this.computeConflicts(fs, parentRel, zip, kind);
            if (conflicts.length > 0 && !overwrite) {
                return { ok: false, message: 'conflict', conflicts };
            }
            await installFiles(
                fs,
                parentRel,
                items,
                new Set(conflicts),
                stagedFilesOfArchive(entries),
                OUTSIDE_ROOT_STAGING
            );
            this.inspectedUploads.forget(env, kind);
            const importedCount = kind === 'skills' ? this.zipTopLevelDirsFrom(zip).length : items.length;
            return { ok: true, importedCount };
        } catch (error) {
            console.error(`Failed to extract archive (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    // ============================================================
    // 公式スキルインポート（openai/skills）
    // ============================================================

    /** 公式リポジトリの clone 先（app userData 配下の repos）。 */
    private officialReposDir(): string {
        return join(app.getPath('userData'), 'repos');
    }

    /** 公式スキルリポジトリの clone 先ディレクトリ（実 OS パス）。 */
    private officialSkillsRepoDir(): string {
        return join(this.officialReposDir(), OFFICIAL_SKILLS_REPO_DIRNAME);
    }

    /** リポジトリ内のスキル格納ディレクトリ（subdir が '' の場合は repo ルート）。 */
    private officialSkillsSourceDir(): string {
        return OFFICIAL_SKILLS_REPO_SUBDIR
            ? join(this.officialSkillsRepoDir(), OFFICIAL_SKILLS_REPO_SUBDIR)
            : this.officialSkillsRepoDir();
    }

    /** git がインストールされ利用可能か。公式インポートボタンの活性判定に使う。 */
    async isGitAvailable(): Promise<boolean> {
        return this.git.isAvailable();
    }

    /**
     * 公式スキルリポジトリを clone/更新し、SKILL.md を持つスキル一覧を返す。
     * relPath は sourceDir からの相対（'/' 区切り）。
     */
    async listOfficialSkills(): Promise<AssetOpResult> {
        if (!(await this.git.isAvailable())) {
            return { ok: false, message: 'git-unavailable' };
        }
        const repoDir = this.officialSkillsRepoDir();
        try {
            await this.git.cloneOrUpdate(OFFICIAL_SKILLS_REPO_URL, repoDir, OFFICIAL_SKILLS_REPO_BRANCH);
        } catch (error) {
            console.error('Failed to clone/update official skills repository:', error);
            return { ok: false, message: 'repo-update-failed' };
        }

        const sourceDir = this.officialSkillsSourceDir();
        if (!existsSync(sourceDir)) {
            return { ok: false, message: 'repo-update-failed' };
        }

        try {
            const entries = this.scanOfficialSkills(sourceDir);
            entries.sort((a, b) => a.name.localeCompare(b.name));
            return { ok: true, entries };
        } catch (error) {
            console.error('Failed to scan official skills:', error);
            return { ok: false, message: 'repo-update-failed' };
        }
    }

    /**
     * sourceDir 配下から SKILL.md を持つスキルディレクトリを収集する（深さ 3 まで）。
     * relPath は sourceDir からの相対パス（'/' 区切り）。
     */
    private scanOfficialSkills(sourceDir: string): AssetEntry[] {
        const entries: AssetEntry[] = [];

        const visit = (relDir: string, depth: number): void => {
            const absDir = relDir ? join(sourceDir, relDir) : sourceDir;
            let dirents;
            try {
                dirents = readdirSync(absDir, { withFileTypes: true });
            } catch {
                return;
            }
            const hasSkillMd = dirents.some(d => d.isFile() && d.name.toLowerCase() === 'skill.md');
            if (hasSkillMd && relDir) {
                entries.push(this.buildOfficialEntry(sourceDir, relDir));
                return; // スキルディレクトリ配下はこれ以上潜らない
            }
            if (depth >= OFFICIAL_SKILLS_SCAN_MAX_DEPTH) {
                return;
            }
            for (const d of dirents) {
                if (!d.isDirectory() || d.isSymbolicLink() || this.isUnsafeName(d.name) || d.name.startsWith('.')) {
                    continue;
                }
                visit(relDir ? `${relDir}/${d.name}` : d.name, depth + 1);
            }
        };

        visit('', 0);
        return entries;
    }

    /**
     * sourceDir 配下の相対パス（skillRel）から 1 件分の AssetEntry を構築する。
     * <skill>/agents/openai.yaml があれば、その呼び出しポリシー（policy.*）もメタへ加える。
     */
    private buildOfficialEntry(sourceDir: string, skillRel: string): AssetEntry {
        const absDir = join(sourceDir, skillRel);
        let mdContent: string | null = null;
        try {
            const mdName = readdirSync(absDir, { withFileTypes: true }).find(
                d => d.isFile() && d.name.toLowerCase() === 'skill.md'
            )?.name;
            if (mdName) {
                mdContent = readFileSync(join(absDir, mdName), 'utf-8');
            }
        } catch {
            mdContent = null;
        }
        let yamlContent: string | null = null;
        try {
            yamlContent = readFileSync(join(absDir, 'agents', 'openai.yaml'), 'utf-8');
        } catch {
            yamlContent = null;
        }
        const fm = parseFrontmatter(mdContent);
        const policy = this.parseSkillPolicy(yamlContent);
        const stats = recursiveDirStats(absDir);
        const dirName = skillRel.split('/').pop() ?? skillRel;
        return {
            name: fm?.fields?.name ?? dirName,
            relPath: skillRel,
            isFile: false,
            fileCount: stats.fileCount,
            frontmatter: { ...(fm?.fields ?? {}), ...policy },
            frontmatterRaw: fm?.raw ?? null,
            mtimeMs: stats.mtimeMs,
        };
    }

    /**
     * 選択した公式スキル（relPaths は sourceDir からの相対）を対象環境へ取り込む。
     * 取り込み先のディレクトリ名は relPath の末尾セグメント（= スキルディレクトリ名）。
     * 公式スキル同士の置換のため、同名は確認なしで丸ごと置き換える（失敗した場合は取り込み前の状態に戻す）。
     */
    async importOfficialSkills(env: CodexEnvironment, relPaths: string[]): Promise<AssetOpResult> {
        if (!(await this.git.isAvailable())) {
            return { ok: false, message: 'git-unavailable' };
        }

        const fs = this.fsFor(env);
        const parentRel = this.parentRel('skills');
        if (!(await fs.isReachable())) {
            return { ok: false, message: 'unavailable' };
        }

        const sourceDir = this.officialSkillsSourceDir();
        const targets = relPaths
            .filter(p => !this.isUnsafeRelPath(p))
            .map(p => ({ rel: p, abs: join(sourceDir, p), dirName: p.split('/').pop() ?? p }))
            .filter(t => !this.isUnsafeName(t.dirName) && existsSync(t.abs));
        if (targets.length === 0) {
            return { ok: false, message: 'no-selection' };
        }

        const tmpZip = join(tmpdir(), `official-skills-${process.pid}-${targets.length}.zip`);
        try {
            await this.zipDirectories(
                targets.map(t => ({ abs: t.abs, name: t.dirName })),
                tmpZip
            );

            const entries = normalizedArchiveEntries(new AdmZip(tmpZip));
            if (entries === null) {
                throw new Error('Archive contains an unsafe entry name');
            }
            const dirs = archiveTopLevelDirs(entries);
            await installFiles(fs, parentRel, dirs, new Set(dirs), stagedFilesOfArchive(entries), OUTSIDE_ROOT_STAGING);
            return { ok: true, importedCount: targets.length };
        } catch (error) {
            console.error(`Failed to import official skills (${JSON.stringify(env)}):`, error);
            return { ok: false, message: 'official-import-failed' };
        } finally {
            try {
                rmSync(tmpZip, { force: true });
            } catch {
                // 一時ファイルの削除失敗は無視
            }
        }
    }

    /** 複数のディレクトリ（実 OS パス）を ZIP に固める。ZIP 内のトップは指定 name。 */
    private zipDirectories(dirs: { abs: string; name: string }[], destZip: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(destZip);
            const archive = archiver('zip', zipArchiveOptions());
            output.on('close', () => resolve());
            output.on('error', reject);
            archive.on('error', reject);
            archive.pipe(output);
            for (const d of dirs) {
                archive.directory(d.abs, d.name);
            }
            archive.finalize();
        });
    }

    /**
     * 選択したエントリ（relPaths）を削除する。
     * - skills: ディレクトリごと削除（ベストエフォート。使用中で消せない分は skipped に報告）。
     * - agents: .toml ファイルを削除。
     */
    async deleteSelected(env: CodexEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        if (!(await fs.isReachable())) {
            return { ok: false, message: 'unavailable' };
        }

        const safe = relPaths.filter(p => !this.isUnsafeRelPath(p));
        if (safe.length === 0) {
            return { ok: false, message: 'no-selection' };
        }

        const skipped: string[] = [];
        let deletedCount = 0;
        for (const rel of safe) {
            try {
                if (await removeAssetEntry(fs, parentRel, rel, kind === 'skills')) {
                    deletedCount++;
                } else {
                    skipped.push(rel);
                }
            } catch (error) {
                console.error(`Failed to delete ${rel} (${JSON.stringify(env)}, ${kind}):`, error);
                skipped.push(rel);
            }
        }

        return { ok: skipped.length === 0, deletedCount, skipped: skipped.length > 0 ? skipped : undefined };
    }

    /** ZIP の取り込み対象（skills=トップレベルの名前 / agents=.toml ファイルの相対パス）。 */
    private uploadItems(zip: AdmZip, kind: AssetKind): string[] {
        if (kind === 'skills') {
            return this.zipTopLevelNamesFrom(zip);
        }
        return this.zipFileEntries(zip).filter(path => path.toLowerCase().endsWith('.toml'));
    }

    /**
     * 取り込み対象のうち、取り込み先に既にあるもの（上書きの確認対象で、上書き時に置き換えるもの）を返す。
     * 既にあるかはファイルシステムで判定する（大文字・小文字を区別しないファイルシステムでは、大文字・小文字だけが
     * 異なる既存の名前も既にあるものになる）。
     */
    private async computeConflicts(fs: HomeFs, parentRel: string, zip: AdmZip, kind: AssetKind): Promise<string[]> {
        const conflicts: string[] = [];
        for (const item of this.uploadItems(zip, kind)) {
            if (!this.isUnsafeRelPath(item) && (await fs.exists(`${parentRel}/${item}`))) {
                conflicts.push(item);
            }
        }
        return conflicts;
    }

    /**
     * AdmZip インスタンスから、正規化したエントリ名のトップレベルディレクトリ名一覧を抽出する（skills 用）。
     * 不正なエントリ名を含む ZIP は空配列。
     */
    private zipTopLevelDirsFrom(zip: AdmZip): string[] {
        return archiveTopLevelDirs(normalizedArchiveEntries(zip) ?? []);
    }

    /** AdmZip インスタンスから、正規化したエントリ名の先頭セグメント（トップレベルのファイルを含む）を抽出する。 */
    private zipTopLevelNamesFrom(zip: AdmZip): string[] {
        return archiveTopLevelNames(normalizedArchiveEntries(zip) ?? []);
    }

    /**
     * AdmZip インスタンスから、ファイルエントリの正規化した相対パス一覧を抽出する（agents 用）。
     * 不正なエントリ名を含む ZIP は空配列。
     */
    private zipFileEntries(zip: AdmZip): string[] {
        return (normalizedArchiveEntries(zip) ?? []).filter(({ entry }) => !entry.isDirectory).map(({ path }) => path);
    }

    // ============================================================
    // 種別整合チェック（誤アップロードの警告のみ。ブロックはしない）
    // ============================================================

    /** ZIP の構造と取り込み先種別の軽い整合チェック（warn / ok）。 */
    private classifyZipKind(zip: AdmZip, kind: AssetKind): { verdict: 'ok' | 'warn'; reason?: string } {
        let hasSkillDir = false;
        let hasToml = false;
        for (const file of this.zipFileEntries(zip)) {
            const segments = file.split('/').filter(s => s.length > 0);
            if (segments.length === 0) {
                continue;
            }
            const base = segments[segments.length - 1].toLowerCase();
            if (segments.length >= 2 && base === 'skill.md') {
                hasSkillDir = true;
            }
            if (base.endsWith('.toml')) {
                hasToml = true;
            }
        }
        if (kind === 'skills' && !hasSkillDir && hasToml) {
            return { verdict: 'warn', reason: 'agents-into-skills' };
        }
        return { verdict: 'ok' };
    }

    /** 単体ファイルと取り込み先種別の軽い整合チェック（warn / ok）。 */
    private classifyFileKind(kind: AssetKind, filePath: string): { verdict: 'ok' | 'warn'; reason?: string } {
        const fileName = basename(filePath).toLowerCase();
        if (kind === 'agents' && fileName === 'skill.md') {
            return { verdict: 'warn', reason: 'skillmd-into-agents' };
        }
        return { verdict: 'ok' };
    }
}
