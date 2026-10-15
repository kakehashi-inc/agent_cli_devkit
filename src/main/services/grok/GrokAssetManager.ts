import { BrowserWindow, dialog } from 'electron';
import { createWriteStream, readFileSync } from 'fs';
import { basename, extname, join } from 'path';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { GROK_DIR, GROK_WSL_CLI_TEST } from '../../../shared/agents/grok/constants';
import {
    AssetEntry,
    AssetKind,
    AssetListReport,
    AssetOpResult,
    GrokEnvironment,
    OSType,
} from '../../../shared/agents/grok/types';
import { HomeFs } from '../common/wsl/HomeFs';
import { WslDetector } from '../common/wsl/WslDetector';
import { revealAssetPath } from '../common/assets/revealAssetPath';
import { assetArchiveFileName } from '../common/assets/archiveFileName';
import { extractArchiveEntries, installStaged, writeTextFile } from '../common/assets/stagedInstall';
import {
    archiveTopLevelDirs,
    archiveTopLevelNames,
    isSafePathSegment,
    normalizedArchiveEntries,
} from '../common/fs/archiveEntryPath';
import { parseFrontmatter } from '../../utils/frontmatter';
import { fileMtimeMs, zipArchiveOptions } from '../../utils/fileTime';

// agents/ サブディレクトリを再帰探索する深さの上限（暴走防止）。
// Grok はエージェント定義を ~/.grok/agents 直下の .md のみ認識する（サブディレクトリは探索しない）。
// 実機の grok inspect で確認済み。再帰探索は行わない。
const AGENT_SCAN_MAX_DEPTH = 0;

/**
 * Grok (CLI) の ~/.grok/agents・~/.grok/skills を管理する。
 *
 * 一覧の単位は種別で異なる:
 * - skills: skills/ 直下の各サブディレクトリ（frontmatter は <skill>/SKILL.md から読む）。
 * - agents: agents/ 直下の .md ファイル、およびサブディレクトリ配下の .md ファイル（再帰）。
 *           ディレクトリ自体はエージェントではなく、その配下の .md を 1 件ずつ展開する。
 *
 * いずれも先頭の YAML frontmatter（--- で囲まれたヘッダー部）を読み取り、UI で展開・参照できる。
 *
 * DL/UL は ZIP で行う:
 * - 選択した各エントリ（skills=ディレクトリ / agents=.md ファイル）を 1 つの ZIP にまとめる。
 * - アップロードは ZIP を対象フォルダへ解凍・展開する（同名は確認後に丸ごと置換）。
 *
 * ZIP 圧縮・解凍は実 OS パス（native 絶対パス / WSL UNC パス）に対する通常の fs で行う。
 * WSL でコマンドモードへフォールバックする（UNC 到達不可）環境では操作不可（available:false）。
 */
export class GrokAssetManager {
    private readonly detector: WslDetector;

    constructor(detector: WslDetector) {
        this.detector = detector;
    }

    private nativeLabel(): string {
        const platform = process.platform as OSType;
        if (platform === 'win32') return 'Windows';
        if (platform === 'darwin') return 'macOS';
        return 'Linux';
    }

    private fsFor(env: GrokEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /** agents/ skills/ の HOME 相対パス（'.grok/agents' など）。 */
    private parentRel(kind: AssetKind): string {
        return `${GROK_DIR}/${kind}`;
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

    /** 管理対象の環境一覧（native + Grok 入り WSL distro）。 */
    async getEnvironments(): Promise<{ env: GrokEnvironment; label: string }[]> {
        const result: { env: GrokEnvironment; label: string }[] = [];
        result.push({ env: { kind: 'native' }, label: this.nativeLabel() });
        const distros = await this.detector.getDistrosWithTest(GROK_WSL_CLI_TEST);
        for (const d of distros) {
            result.push({ env: { kind: 'wsl', distro: d.distro }, label: d.distro });
        }
        return result;
    }

    /**
     * 指定環境・種別の一覧を返す。
     * 実 OS パスに到達できない（UNC 不可）場合は available:false で空一覧。
     */
    async list(env: GrokEnvironment, kind: AssetKind): Promise<AssetListReport> {
        const label = env.kind === 'wsl' ? (env.distro ?? '') : this.nativeLabel();
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);

        const real = await fs.resolveRealPath(parentRel);
        if (real === null) {
            // WSL コマンドモード（UNC 不可）: ZIP 操作不可
            return { env, label, kind, available: false, entries: [] };
        }

        const entries = kind === 'skills' ? await this.listSkills(fs, parentRel) : await this.listAgents(fs, parentRel);
        entries.sort((a, b) => a.name.localeCompare(b.name));
        return { env, label, kind, available: true, entries };
    }

    /** skills/: 直下サブディレクトリを 1 件とし、<skill>/SKILL.md の frontmatter を読む。 */
    private async listSkills(fs: HomeFs, parentRel: string): Promise<AssetEntry[]> {
        const entries: AssetEntry[] = [];
        const dirs = await fs.listDirs(parentRel);
        for (const name of dirs) {
            if (this.isUnsafeName(name)) {
                continue;
            }
            const dirRel = `${parentRel}/${name}`;
            const md = await fs.readText(`${dirRel}/SKILL.md`);
            // SKILL.md を持たない隠しディレクトリ（.trash/ など）はスキルではない。
            if (md === null && name.startsWith('.')) {
                continue;
            }
            // skills はファイル数のみ表示する（サイズは取得・保持しない）。
            const stats = await fs.dirStats(dirRel);
            const fm = parseFrontmatter(md);
            entries.push({
                name,
                relPath: name,
                isFile: false,
                fileCount: stats.fileCount,
                frontmatter: fm?.fields ?? {},
                frontmatterRaw: fm?.raw ?? null,
                // フォルダ単位: 配下ファイルの最終更新日時の最大値。
                mtimeMs: stats.mtimeMs,
            });
        }
        return entries;
    }

    /**
     * agents/: 直下の .md ファイル、およびサブディレクトリ配下の .md ファイル（再帰）を 1 件ずつ展開。
     * ディレクトリ自体は対象にせず、その配下の .md を対象とする。
     */
    private async listAgents(fs: HomeFs, parentRel: string): Promise<AssetEntry[]> {
        const entries: AssetEntry[] = [];

        const walk = async (relDir: string, depth: number): Promise<void> => {
            // 直下の .md ファイル
            const files = await fs.listFiles(relDir);
            for (const file of files) {
                if (!file.toLowerCase().endsWith('.md') || this.isUnsafeName(file)) {
                    continue;
                }
                const fileRel = `${relDir}/${file}`;
                const relPath = fileRel.slice(parentRel.length + 1); // 親からの相対
                // agents は 1 ファイル固定でサイズ・ファイル数を表示しないため取得しない。
                // 最終更新日時のみファイル単位で取得する。
                const md = await fs.readText(fileRel);
                const fm = parseFrontmatter(md);
                const stats = await fs.fileStats(fileRel);
                entries.push({
                    name: file.replace(/\.md$/i, ''),
                    relPath,
                    isFile: true,
                    frontmatter: fm?.fields ?? {},
                    frontmatterRaw: fm?.raw ?? null,
                    // ファイル単位: その .md ファイルの最終更新日時。
                    mtimeMs: stats.mtimeMs,
                });
            }
            // サブディレクトリを再帰
            if (depth < AGENT_SCAN_MAX_DEPTH) {
                const subdirs = await fs.listDirs(relDir);
                for (const sub of subdirs) {
                    if (this.isUnsafeName(sub)) {
                        continue;
                    }
                    await walk(`${relDir}/${sub}`, depth + 1);
                }
            }
        };

        await walk(parentRel, 0);
        return entries;
    }

    /**
     * 選択したエントリ（relPaths）を 1 つの ZIP にまとめて保存する。
     * 複数選択でも 1 ファイルにまとめる。保存先はダイアログで指定。
     * relPaths は list() が返した AssetEntry.relPath（skills=ディレクトリ名 / agents=.md の相対パス）。
     */
    /**
     * 1 エントリの内容全体を読み取る（参照ダイアログの「全体」表示用）。
     * - agents: relPath のファイルそのもの
     * - skills: <relPath>/SKILL.md
     */
    async readEntry(env: GrokEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
        if (this.isUnsafeRelPath(relPath)) {
            return { ok: false, message: 'not-found' };
        }
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        const fileRel = kind === 'skills' ? `${parentRel}/${relPath}/SKILL.md` : `${parentRel}/${relPath}`;
        const content = await fs.readText(fileRel);
        if (content === null) {
            return { ok: false, message: 'not-found' };
        }
        return { ok: true, content };
    }

    /** OS 標準のファイルマネージャーで対象エントリを表示する。 */
    async revealEntry(env: GrokEnvironment, kind: AssetKind, relPath: string): Promise<AssetOpResult> {
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

    async download(
        env: GrokEnvironment,
        kind: AssetKind,
        relPaths: string[],
        window: BrowserWindow | null
    ): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        const parentReal = await fs.resolveRealPath(parentRel);
        if (parentReal === null) {
            return { ok: false, message: 'unavailable' };
        }

        const safe = relPaths.filter(p => !this.isUnsafeRelPath(p));
        if (safe.length === 0) {
            return { ok: false, message: 'no-selection' };
        }

        const defaultName = assetArchiveFileName({
            kind,
            agentId: 'grok',
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
            await this.zipEntries(parentReal, safe, kind, saveResult.filePath);
            return { ok: true };
        } catch (error) {
            console.error(`Failed to create archive (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'download-failed' };
        }
    }

    /**
     * 選択エントリを ZIP に追加する。
     * - skills（ディレクトリ）: <name>/ としてディレクトリごと追加。
     * - agents（.md ファイル）: 親からの相対パスを保持して追加（サブディレクトリ構造を維持）。
     */
    private zipEntries(parentReal: string, relPaths: string[], kind: AssetKind, destZip: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const output = createWriteStream(destZip);
            const archive = archiver('zip', zipArchiveOptions());
            output.on('close', () => resolve());
            output.on('error', reject);
            archive.on('error', reject);
            archive.pipe(output);
            for (const rel of relPaths) {
                // ZIP 内のパスは agents ディレクトリからの相対パスを '/' 区切りで維持する。
                const zipPath = rel.replace(/\\/g, '/');
                const sourceAbs = join(parentReal, rel);
                if (kind === 'skills') {
                    archive.directory(sourceAbs, zipPath);
                } else {
                    archive.file(sourceAbs, { name: zipPath });
                }
            }
            archive.finalize();
        });
    }

    /**
     * アップロード前検査: ZIP を選択させ、取り込み対象のうち既にあるもの（衝突）を返す（computeConflicts）。
     * 実際の展開は upload() で行う（renderer が衝突確認後に呼ぶ）。
     */
    async inspectUpload(env: GrokEnvironment, kind: AssetKind, window: BrowserWindow | null): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        const parentReal = await fs.resolveRealPath(parentRel);
        if (parentReal === null) {
            return { ok: false, message: 'unavailable' };
        }

        // ZIP に加えて md 単体アップロードを受け付ける。拡張子で取り込み方を分岐する。
        const filters = [
            { name: 'Skill / Archive', extensions: ['zip', 'md'] },
            { name: 'ZIP Archives', extensions: ['zip'] },
            { name: 'Markdown', extensions: ['md'] },
        ];
        const openResult = window
            ? await dialog.showOpenDialog(window, { filters, properties: ['openFile'] })
            : await dialog.showOpenDialog({ filters, properties: ['openFile'] });

        if (openResult.canceled || openResult.filePaths.length === 0) {
            return { ok: false, canceled: true };
        }

        const srcPath = openResult.filePaths[0];
        if (extname(srcPath).toLowerCase() === '.md') {
            return this.inspectMdUpload(fs, parentRel, kind, srcPath);
        }

        let zip: AdmZip;
        try {
            zip = new AdmZip(srcPath);
        } catch (error) {
            console.error(`Failed to read archive ${srcPath}:`, error);
            return { ok: false, message: 'invalid-archive' };
        }
        // パストラバーサル対策: 不正なエントリ名を含む ZIP は拒否する。
        if (normalizedArchiveEntries(zip) === null) {
            return { ok: false, message: 'invalid-archive' };
        }

        // 種別整合チェック（エージェント / スキルの誤アップロード防止）。
        const cls = this.classifyZipKind(zip, kind);
        if (cls.verdict === 'block') {
            return { ok: false, message: `kind-block-${cls.reason}` };
        }

        // Grok はエージェント定義を agents 直下の .md しか認識しない（サブディレクトリは無視される）。
        // ネストした構成の ZIP を展開すると UI からも CLI からも見えない孤児ファイルになるため拒否する。
        if (kind === 'agents' && this.zipFileEntries(zip).some(f => f.includes('/'))) {
            return { ok: false, message: 'kind-block-agent-nested-dirs' };
        }

        const conflicts = await this.computeConflicts(fs, parentRel, zip, kind);
        const warn = cls.verdict === 'warn' ? { kindCheck: 'warn' as const, kindMessage: cls.reason } : {};
        return { ok: true, uploadKind: 'zip', zipPath: srcPath, conflicts, ...warn };
    }

    /**
     * md 単体アップロードの前検査。取り込み先の名前を算出し、既存との衝突を返す。
     * - skills: ファイル名（大小無視）が SKILL.md なら frontmatter の name を、
     *   それ以外はファイル名（拡張子除去・小文字化）をディレクトリ名にする。
     *   取り込み先は <dir>/SKILL.md（大文字固定）。衝突判定は <dir> の存在。
     * - agents: 元ファイル名そのままで .grok/agents 直下へ配置。衝突判定は同名ファイルの存在。
     */
    private async inspectMdUpload(
        fs: HomeFs,
        parentRel: string,
        kind: AssetKind,
        mdPath: string
    ): Promise<AssetOpResult> {
        const target = await this.resolveMdTarget(kind, mdPath);
        if (!target.ok || !target.name) {
            return target;
        }
        const conflictRel = kind === 'skills' ? `${parentRel}/${target.name}` : `${parentRel}/${target.relPath}`;
        const conflicts = (await fs.exists(conflictRel)) ? [target.name] : [];

        // 種別整合チェック（md は誤りでもブロックせず警告のみ）。
        const cls = this.classifyMdKind(mdPath);
        const verdict = kind === 'skills' ? cls.skills : cls.agents;
        const reason = kind === 'skills' ? cls.reasonSkills : 'skillmd-into-agent';
        const warn = verdict === 'warn' ? { kindCheck: 'warn' as const, kindMessage: reason } : {};

        return { ok: true, uploadKind: 'md', srcPath: mdPath, targetName: target.name, conflicts, ...warn };
    }

    /**
     * md ファイルから取り込み先（ディレクトリ名 / 相対パス）を算出する。
     * 失敗時は AssetOpResult のエラーを返す（name 未取得など）。
     */
    private async resolveMdTarget(
        kind: AssetKind,
        mdPath: string
    ): Promise<AssetOpResult & { name?: string; relPath?: string }> {
        const fileName = basename(mdPath);
        if (kind === 'agents') {
            // agents は .md ファイルそのものが 1 エントリ。元ファイル名のまま配置する。
            if (this.isUnsafeName(fileName)) {
                return { ok: false, message: 'invalid-md' };
            }
            return { ok: true, name: fileName, relPath: fileName };
        }
        // skills
        let dirName: string;
        if (fileName.toLowerCase() === 'skill.md') {
            let content: string;
            try {
                content = readFileSync(mdPath, 'utf-8');
            } catch (error) {
                console.error(`Failed to read md ${mdPath}:`, error);
                return { ok: false, message: 'invalid-md' };
            }
            const fm = parseFrontmatter(content);
            const name = fm?.fields?.name?.trim();
            if (!name || this.isUnsafeName(name)) {
                return { ok: false, message: 'md-no-name' };
            }
            dirName = name;
        } else {
            // SKILL.md 以外: ファイル名の拡張子を除き小文字化したものをディレクトリ名にする。
            dirName = basename(fileName, extname(fileName)).toLowerCase();
            if (!dirName || this.isUnsafeName(dirName)) {
                return { ok: false, message: 'invalid-md' };
            }
        }
        return { ok: true, name: dirName, relPath: `${dirName}/SKILL.md` };
    }

    /**
     * md 単体を取り込む。
     * - skills: <dir>/SKILL.md（大文字固定）として配置。overwrite 時は既存の <dir> を丸ごと置き換える。
     * - agents: 元ファイル名のまま .grok/agents 直下へ配置。overwrite 時は既存のファイルを置き換える。
     * 既にある取り込み先は overwrite=true のときだけ置き換える。書き込みに失敗した場合は取り込み前の状態に戻す。
     */
    async uploadMd(env: GrokEnvironment, kind: AssetKind, mdPath: string, overwrite: boolean): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        const parentReal = await fs.resolveRealPath(parentRel);
        if (parentReal === null) {
            return { ok: false, message: 'unavailable' };
        }

        const target = await this.resolveMdTarget(kind, mdPath);
        if (!target.ok || !target.name || !target.relPath) {
            return target;
        }

        let content: string;
        try {
            content = readFileSync(mdPath, 'utf-8');
        } catch (error) {
            console.error(`Failed to read md ${mdPath}:`, error);
            return { ok: false, message: 'invalid-md' };
        }

        // 取り込み元 md の更新日時。配置後のファイルへ引き継ぐ（アップロード日にしない）。
        const srcMtimeMs = fileMtimeMs(mdPath);
        const item = kind === 'skills' ? target.name : target.relPath;
        const relPath = target.relPath;

        try {
            installStaged(parentReal, [item], new Set(overwrite ? [item] : []), dir =>
                writeTextFile(dir, relPath, content, srcMtimeMs)
            );
            return { ok: true, importedCount: 1 };
        } catch (error) {
            console.error(`Failed to upload md (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    /**
     * ZIP を対象フォルダへ展開する。
     * 取り込み対象のうち既にあるもの（computeConflicts）は、overwrite=true のときだけ丸ごと置き換え
     * （skills=トップレベルのディレクトリ / agents=ファイル）、overwrite=false のときは何も変えずに conflict を返す。
     * 展開は作業用ディレクトリで行い、失敗した場合は取り込み前の状態に戻す。
     */
    async upload(env: GrokEnvironment, kind: AssetKind, zipPath: string, overwrite: boolean): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        const parentReal = await fs.resolveRealPath(parentRel);
        if (parentReal === null) {
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

        // 防御的チェック: agents はネスト構成の ZIP を受け付けない（inspectUpload と同条件）。
        if (kind === 'agents' && this.zipFileEntries(zip).some(f => f.includes('/'))) {
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
            installStaged(parentReal, this.uploadItems(zip, kind), new Set(conflicts), dir =>
                extractArchiveEntries(entries, dir)
            );
            const importedCount =
                kind === 'skills' ? this.zipTopLevelDirsFrom(zip).length : this.zipFileEntries(zip).length;
            return { ok: true, importedCount };
        } catch (error) {
            console.error(`Failed to extract archive (${JSON.stringify(env)}, ${kind}):`, error);
            return { ok: false, message: 'upload-failed' };
        }
    }

    /**
     * 選択したエントリ（relPaths）を削除する。
     * - skills: ディレクトリごと削除（ベストエフォート。使用中で消せない分は skipped に報告）。
     * - agents: .md ファイルを削除。
     * 例外は投げず、削除できた件数（deletedCount）と消せなかった対象（skipped）を返す。
     */
    async deleteSelected(env: GrokEnvironment, kind: AssetKind, relPaths: string[]): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const parentRel = this.parentRel(kind);
        const parentReal = await fs.resolveRealPath(parentRel);
        if (parentReal === null) {
            return { ok: false, message: 'unavailable' };
        }

        const safe = relPaths.filter(p => !this.isUnsafeRelPath(p));
        if (safe.length === 0) {
            return { ok: false, message: 'no-selection' };
        }

        const skipped: string[] = [];
        let deletedCount = 0;
        for (const rel of safe) {
            const target = `${parentRel}/${rel}`;
            try {
                if (kind === 'skills') {
                    const { removedAll } = await fs.removeDirBestEffort(target);
                    if (removedAll) {
                        deletedCount++;
                    } else {
                        skipped.push(rel);
                    }
                } else {
                    await fs.deleteFile(target);
                    deletedCount++;
                }
            } catch (error) {
                console.error(`Failed to delete ${rel} (${JSON.stringify(env)}, ${kind}):`, error);
                skipped.push(rel);
            }
        }

        return { ok: skipped.length === 0, deletedCount, skipped: skipped.length > 0 ? skipped : undefined };
    }

    /** ZIP の取り込み対象（skills=トップレベルの名前 / agents=ファイルの相対パス）。 */
    private uploadItems(zip: AdmZip, kind: AssetKind): string[] {
        return kind === 'skills' ? this.zipTopLevelNamesFrom(zip) : this.zipFileEntries(zip);
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
    // 種別整合チェック（エージェント / スキルの誤アップロード防止）
    // ============================================================

    /**
     * ZIP の構造的な特徴を抽出する。
     * - hasSkillDir:  トップレベルディレクトリ配下に SKILL.md（大小無視）を持つものがある（= スキル構造）。
     * - hasTopLevelMd: トップレベル（ディレクトリ配下でない）に .md ファイルが直置きされている（= エージェント構造）。
     * - hasAnyMd:     どこかに .md ファイルがある。
     */
    private detectZipStructure(zip: AdmZip): {
        hasSkillDir: boolean;
        hasTopLevelMd: boolean;
        hasAnyMd: boolean;
    } {
        let hasSkillDir = false;
        let hasTopLevelMd = false;
        let hasAnyMd = false;
        for (const file of this.zipFileEntries(zip)) {
            const segments = file.split('/').filter(s => s.length > 0);
            if (segments.length === 0) {
                continue;
            }
            const base = segments[segments.length - 1];
            const isMd = base.toLowerCase().endsWith('.md');
            if (isMd) {
                hasAnyMd = true;
            }
            // トップレベル直置きの .md（サブディレクトリに属さない）
            if (isMd && segments.length === 1) {
                hasTopLevelMd = true;
            }
            // <topdir>/SKILL.md（大小無視）。深さは問わずトップレベルディレクトリ直下を見る。
            if (segments.length === 2 && base.toLowerCase() === 'skill.md') {
                hasSkillDir = true;
            }
        }
        return { hasSkillDir, hasTopLevelMd, hasAnyMd };
    }

    /**
     * ZIP の構造と取り込み先の種別（kind）の整合を判定する。
     * 戻り値:
     * - { verdict: 'ok' }          問題なし（無音で取り込み）。
     * - { verdict: 'block', reason } 明白な誤り（取り込み不可）。
     * - { verdict: 'warn', reason }  疑いあり（続行/キャンセルを確認）。
     */
    private classifyZipKind(zip: AdmZip, kind: AssetKind): { verdict: 'ok' | 'block' | 'warn'; reason?: string } {
        const s = this.detectZipStructure(zip);
        if (kind === 'skills') {
            // スキルに必須の SKILL.md ディレクトリが無く、エージェント構造（.md 直置き）→ ブロック
            if (!s.hasSkillDir && s.hasTopLevelMd) {
                return { verdict: 'block', reason: 'agent-into-skill' };
            }
            // SKILL.md ディレクトリがある → 正当なスキル
            if (s.hasSkillDir) {
                return { verdict: 'ok' };
            }
            // ディレクトリ構成だが SKILL.md が無い（他構成）→ 注意
            return { verdict: 'warn', reason: 'skill-no-skillmd' };
        }
        // agents
        // スキルの確定構造（SKILL.md ディレクトリ）→ ブロック
        if (s.hasSkillDir) {
            return { verdict: 'block', reason: 'skill-into-agent' };
        }
        // .md を 1 つも含まない → エージェントとして取り込む意味がない → ブロック
        if (!s.hasAnyMd) {
            return { verdict: 'block', reason: 'no-md' };
        }
        return { verdict: 'ok' };
    }

    /**
     * 単一 md の内容・ファイル名と取り込み先の種別（kind）の整合を判定する。
     * - skills へ: SKILL.md なら OK。frontmatter に tools/model（エージェント特有）があれば warn。
     * - agents へ: ファイル名が SKILL.md（スキル由来の疑い）なら warn。それ以外は OK。
     */
    private classifyMdKind(mdPath: string): { skills: 'ok' | 'warn'; agents: 'ok' | 'warn'; reasonSkills?: string } {
        const fileName = basename(mdPath);
        const isSkillMd = fileName.toLowerCase() === 'skill.md';
        let hasAgentKeys = false;
        try {
            const fm = parseFrontmatter(readFileSync(mdPath, 'utf-8'));
            hasAgentKeys = !!(fm?.fields?.tools !== undefined || fm?.fields?.model !== undefined);
        } catch {
            hasAgentKeys = false;
        }
        // skills 側: SKILL.md は OK。エージェント特有キーがあれば warn。
        const skills: 'ok' | 'warn' = !isSkillMd && hasAgentKeys ? 'warn' : 'ok';
        // agents 側: SKILL.md という名前はスキル由来の疑い → warn。
        const agents: 'ok' | 'warn' = isSkillMd ? 'warn' : 'ok';
        return { skills, agents, reasonSkills: skills === 'warn' ? 'agent-md-into-skill' : undefined };
    }
}
