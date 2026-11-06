import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';
import { createWriteStream, readFileSync } from 'fs';
import { basename, extname, join } from 'path';
import AdmZip from 'adm-zip';
import archiver from 'archiver';
import type { AgentEnvironment, AssetOpResult } from '../../../../shared/agents/types';
import {
    MISSING_REVISION,
    type FileCollectionEntry,
    type FileCollectionReport,
    type FileCollectionSpec,
    type ProfileCollectionResult,
    type ProfileFileData,
    type ProfileWriteResult,
} from '../../../../shared/agents/profile/types';
import { fileMtimeMs, zipArchiveOptions } from '../../../utils/fileTime';
import { parseFrontmatter } from '../../../utils/frontmatter';
import { assetArchiveFileName } from '../assets/archiveFileName';
import { revealAssetPath } from '../assets/revealAssetPath';
import { InspectedUploads } from '../assets/inspectedUploads';
import { installFiles, stagedFilesOfArchive, type StagedFile } from '../assets/stagedInstall';
import { normalizedArchiveEntries, type NormalizedArchiveEntry } from '../fs/archiveEntryPath';
import { describeBytes, isWorkEntryName, type ListedEntry, type StrictRead } from '../fs/atomicFile';
import { validateArchiveEntries, validateRelPath, type RelPathRule } from '../fs/profilePathSafety';
import { HomeFs } from '../wsl/HomeFs';
import type { WslDetector } from '../wsl/WslDetector';
import {
    bomAfterSave,
    failureOfException,
    normalizeEditedText,
    resultOfWrite,
    saveFileText,
    toFileData,
} from './profileFileOps';
import { computeEntryName, runProfileValidator } from './profileValidators';

// 一覧のために本文を読むファイルのサイズの上限。
const LIST_READ_MAX_BYTES = 2 * 1024 * 1024;

type CheckedPath = { ok: true; relPath: string; segments: string[]; rel: string } | { ok: false; reason: string };

/** 取り込むファイル 1 つ。 */
interface UploadItem {
    relPath: string;
    bytes: Buffer;
}

type UploadPlan =
    | { ok: true; kind: 'zip'; items: UploadItem[]; entries: NormalizedArchiveEntry[] }
    | { ok: true; kind: 'file'; items: UploadItem[]; mtimeMs: number | null }
    | { ok: false; result: ProfileCollectionResult };

function dirOfRel(relPath: string): string {
    const slash = relPath.lastIndexOf('/');
    return slash === -1 ? '' : relPath.slice(0, slash);
}

function hasExtension(name: string, extensions: readonly string[]): boolean {
    const lower = name.toLowerCase();
    return extensions.some(extension => lower.endsWith(extension.toLowerCase()));
}

function listedExtensions(spec: FileCollectionSpec): string[] {
    return [...spec.extensions, ...(spec.notLoadedExtensions ?? [])];
}

/** ファイル名が決まっている一覧で、CLI が読む場所と名前か。名前が決まっていない一覧は常に true。 */
function matchesFixedFileName(spec: FileCollectionSpec, segments: readonly string[]): boolean {
    return (
        spec.fixedFileName === undefined ||
        (segments.length === spec.maxDepth + 1 && segments[segments.length - 1] === spec.fixedFileName)
    );
}

/** 取り込むファイルが BOM を付けないファイルなら、BOM を除いた内容にする。 */
function withoutStagedBom(spec: FileCollectionSpec, file: StagedFile): StagedFile {
    if (file.bytes === null) return file;
    const { hadBom, text } = describeBytes(file.bytes);
    if (!hadBom || bomAfterSave(`${spec.rootRel}/${file.relPath}`, hadBom)) return file;
    return { ...file, bytes: Buffer.from(text, 'utf8') };
}

/** 本文の先頭が `---` なのに frontmatter として閉じていないか。 */
function hasBrokenFrontmatter(text: string): boolean {
    return text.trimStart().startsWith('---') && parseFrontmatter(text) === null;
}

/** ファイルが CLI に読み込まれない場所や名前か。本文の形で決まる条件は text があるときだけ判定する。 */
function isNotLoaded(
    spec: FileCollectionSpec,
    entry: ListedEntry,
    text: string | null,
    exclusiveDirs: ReadonlySet<string>
): boolean {
    if (entry.depth > spec.maxDepth) return true;
    if (spec.linksNotLoaded && entry.isLink) return true;
    if (!matchesFixedFileName(spec, entry.relPath.split('/'))) return true;
    if (spec.exactExtensionCase && !spec.extensions.some(extension => entry.name.endsWith(extension))) return true;
    if (hasExtension(entry.name, spec.notLoadedExtensions ?? []) && !hasExtension(entry.name, spec.extensions)) {
        return true;
    }
    if (spec.dotNamesNotLoaded && entry.relPath.split('/').some(segment => segment.startsWith('.'))) return true;
    if (
        spec.exclusiveFolderFile &&
        exclusiveDirs.has(dirOfRel(entry.relPath)) &&
        entry.name.toLowerCase() !== spec.exclusiveFolderFile.toLowerCase()
    ) {
        return true;
    }
    return spec.invalidFrontmatterNotLoaded === true && text !== null && hasBrokenFrontmatter(text);
}

/** 一覧の 1 件が CLI に読み込まれるファイルか。本文で決まる条件は見ない。 */
export function isLoadedEntry(spec: FileCollectionSpec, entry: ListedEntry): boolean {
    return (
        entry.kind !== 'dir' &&
        hasExtension(entry.name, spec.extensions) &&
        !isNotLoaded(spec, entry, null, new Set<string>())
    );
}

/** 表示名が重なる行に警告を付ける。 */
function markDuplicateNames(entries: FileCollectionEntry[]): void {
    const counts = new Map<string, number>();
    for (const entry of entries) {
        if (entry.displayName !== undefined && !entry.notLoaded) {
            counts.set(entry.displayName, (counts.get(entry.displayName) ?? 0) + 1);
        }
    }
    for (const entry of entries) {
        if (entry.displayName !== undefined && !entry.notLoaded && (counts.get(entry.displayName) ?? 0) > 1) {
            entry.warnings = [...(entry.warnings ?? []), `duplicate-name:${entry.displayName}`];
        }
    }
}

function rejected(message: string, extra: Partial<ProfileCollectionResult> = {}): ProfileCollectionResult {
    return { ok: false, message, ...extra };
}

function failedOp(message: string): AssetOpResult {
    return { ok: false, message };
}

/**
 * ホーム配下の 1 つのフォルダのファイル一覧を管理する。
 * 一覧、読み取り、保存、新規作成、削除、エクスプローラ表示、ZIP のダウンロード、アップロードを扱う。
 * 相対パスはすべて検証し、ルートより下の中間のリンクを拒否する。ルート自身はリンクでもよい。
 */
export class FileCollectionManager {
    // ファイル選択ダイアログで選ばれたファイル（環境と一覧の ID ごと）。アップロードはこのファイルだけを受け付ける。
    private readonly inspectedUploads = new InspectedUploads();

    constructor(
        private readonly detector: WslDetector,
        private readonly agentId: string
    ) {}

    private fsFor(env: AgentEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    /** 相対パスを検証する。既存のパスは読み込まれない深さと拡張子まで受け付ける。 */
    private async checkPath(
        fs: HomeFs,
        spec: FileCollectionSpec,
        relPath: unknown,
        creating: boolean
    ): Promise<CheckedPath> {
        if (typeof relPath !== 'string') return { ok: false, reason: 'unsafe-path' };
        const rule: RelPathRule = creating
            ? { extensions: spec.extensions, maxDepth: spec.maxDepth, creating: true }
            : { extensions: listedExtensions(spec), maxDepth: spec.maxDepth + spec.scanExtraDepth };
        const check = validateRelPath(relPath, rule);
        if (!check.ok || check.segments.some(isWorkEntryName)) return { ok: false, reason: 'unsafe-path' };
        if (creating && !matchesFixedFileName(spec, check.segments)) return { ok: false, reason: 'unsafe-path' };
        const link = await fs.findLinkBelowRoot(spec.rootRel, check.segments);
        if (link.kind === 'link') return { ok: false, reason: 'unsafe-path' };
        if (link.kind === 'error') return { ok: false, reason: 'read-failed' };
        return {
            ok: true,
            relPath: check.relPath,
            segments: check.segments,
            rel: `${spec.rootRel}/${check.relPath}`,
        };
    }

    /**
     * ファイル一覧を返す。フォルダがなければ空の一覧を返す。ZIP は環境のファイルに届かないときだけ無効にする。
     * ファイルマネージャーでの表示は OS のプロセスから見えるパスが無い環境（UNC に届かない WSL）では無効にする。
     */
    async list(env: AgentEnvironment, spec: FileCollectionSpec): Promise<FileCollectionReport> {
        const fs = this.fsFor(env);
        const displayRoot = await fs.displayPath(spec.rootRel);
        const real = await fs.resolveRealPath(spec.rootRel).catch(() => null);
        const capabilities = { zip: await fs.isReachable(), reveal: real !== null };
        const empty = { displayRoot, entries: [], truncated: false, capabilities };
        const tree = await fs.listTree(spec.rootRel, { maxDepth: spec.maxDepth + spec.scanExtraDepth });
        if (tree.kind === 'missing' || tree.kind === 'dangling-link') {
            return { ...empty, rootMissing: true, incomplete: false };
        }
        if (tree.kind === 'error') return { ...empty, rootMissing: false, incomplete: true };

        const extensions = listedExtensions(spec);
        const listed = tree.entries.filter(
            entry => (entry.kind === 'file' || entry.kind === 'dangling') && hasExtension(entry.name, extensions)
        );
        const texts = await this.readTexts(fs, spec, listed);
        const exclusiveDirs = new Set<string>();
        for (const entry of listed) {
            if (entry.name.toLowerCase() === spec.exclusiveFolderFile?.toLowerCase()) {
                exclusiveDirs.add(dirOfRel(entry.relPath));
            }
        }
        const entries = listed.map(entry => this.toEntry(spec, entry, texts.get(entry.relPath) ?? null, exclusiveDirs));
        markDuplicateNames(entries);
        const linkedDirs = tree.entries.filter(entry => entry.kind === 'dir' && entry.isLink).map(e => e.relPath);
        return {
            displayRoot,
            rootMissing: false,
            entries,
            truncated: tree.truncated,
            incomplete: tree.incomplete,
            capabilities,
            ...(linkedDirs.length > 0 ? { linkedDirs } : {}),
        };
    }

    /** 一覧に必要なファイルの本文をまとめて読む。 */
    private async readTexts(
        fs: HomeFs,
        spec: FileCollectionSpec,
        entries: readonly ListedEntry[]
    ): Promise<Map<string, StrictRead>> {
        const needsText =
            spec.frontmatter === 'yaml' ||
            spec.nameRule !== undefined ||
            spec.validator !== undefined ||
            spec.invalidFrontmatterNotLoaded === true;
        const texts = new Map<string, StrictRead>();
        if (!needsText) return texts;
        const targets = entries.filter(entry => entry.kind === 'file' && entry.size <= LIST_READ_MAX_BYTES);
        const reads = await fs.readTextStrictMany(targets.map(entry => `${spec.rootRel}/${entry.relPath}`));
        for (const entry of targets) {
            const read = reads.get(`${spec.rootRel}/${entry.relPath}`);
            if (read) texts.set(entry.relPath, read);
        }
        return texts;
    }

    private toEntry(
        spec: FileCollectionSpec,
        entry: ListedEntry,
        read: StrictRead | null,
        exclusiveDirs: ReadonlySet<string>
    ): FileCollectionEntry {
        const dangling = entry.kind === 'dangling';
        const readable = read?.kind === 'ok' && read.utf8Clean ? read : null;
        const text = readable?.text ?? null;
        const parsed = spec.frontmatter === 'yaml' && text !== null ? parseFrontmatter(text) : null;
        // 検証の失敗は保存を止めるものだが、既にあるファイルでは行の警告として示す。
        const validation =
            text === null
                ? { errors: [], warnings: [] }
                : runProfileValidator(spec.validator, { text, fileName: entry.name, hadBom: readable?.hadBom });
        const warnings = [...validation.errors, ...validation.warnings];
        if (read?.kind === 'ok' && !read.utf8Clean) warnings.push('not-utf8');
        const displayName = computeEntryName(spec.nameRule, {
            relPath: entry.relPath,
            name: entry.name,
            text,
            frontmatter: parsed?.fields ?? null,
        });
        return {
            relPath: entry.relPath,
            name: entry.name,
            ...(displayName !== undefined ? { displayName } : {}),
            isLink: entry.isLink,
            dangling,
            readOnly: entry.isLink || dangling || (read?.kind === 'ok' && !read.utf8Clean),
            notLoaded: isNotLoaded(spec, entry, text, exclusiveDirs),
            size: entry.size,
            mtimeMs: entry.mtimeMs,
            ...(parsed ? { frontmatter: parsed.fields } : {}),
            ...(warnings.length > 0 ? { warnings } : {}),
        };
    }

    /** ファイルの本文を読む。パスが不正なら state は error。 */
    async readEntry(env: AgentEnvironment, spec: FileCollectionSpec, relPath: string): Promise<ProfileFileData> {
        const fs = this.fsFor(env);
        const checked = await this.checkPath(fs, spec, relPath, false);
        if (!checked.ok) return { state: 'error', code: checked.reason, displayPath: '' };
        return toFileData(await fs.readTextStrict(checked.rel), await fs.displayPath(checked.rel));
    }

    /** 既存のファイルを保存する。リンクは読み取り専用として拒否する。 */
    async saveEntry(
        env: AgentEnvironment,
        spec: FileCollectionSpec,
        relPath: string,
        text: string,
        baseRevision: string,
        confirmedWarnings: boolean
    ): Promise<ProfileWriteResult> {
        try {
            if (typeof text !== 'string' || typeof baseRevision !== 'string') {
                return { ok: false, message: 'invalid-input' };
            }
            const fs = this.fsFor(env);
            const checked = await this.checkPath(fs, spec, relPath, false);
            if (!checked.ok) return { ok: false, message: 'unsafe-path' };
            const fileName = checked.segments[checked.segments.length - 1];
            return await saveFileText(fs, checked.rel, {
                text,
                baseRevision,
                confirmedWarnings,
                rejectLink: true,
                requireExisting: true,
                check: (normalized, hadBom) => this.checkContent(spec, normalized, fileName, hadBom),
            });
        } catch (error) {
            return failureOfException(error);
        }
    }

    private checkContent(spec: FileCollectionSpec, text: string, fileName: string, hadBom: boolean) {
        const result = runProfileValidator(spec.validator, { text, fileName, hadBom });
        const error: ProfileWriteResult | undefined =
            result.errors.length > 0
                ? { ok: false, message: 'invalid-input', detail: result.errors.join(','), warnings: result.warnings }
                : undefined;
        return { error, warnings: result.warnings };
    }

    /** 新しいファイルを作る。親フォルダがなければ作る。既にあれば何も変えず exists を返す。 */
    async createEntry(
        env: AgentEnvironment,
        spec: FileCollectionSpec,
        relPath: string,
        text: string,
        confirmedWarnings: boolean
    ): Promise<ProfileWriteResult> {
        try {
            if (!spec.allowCreate) return { ok: false, message: 'read-only' };
            if (typeof text !== 'string') return { ok: false, message: 'invalid-input' };
            const fs = this.fsFor(env);
            const checked = await this.checkPath(fs, spec, relPath, true);
            if (!checked.ok) return { ok: false, message: 'unsafe-path' };
            const read = await fs.readTextStrict(checked.rel);
            if (read.kind === 'error') return { ok: false, message: 'read-failed', detail: read.code };
            if (read.kind !== 'missing') return { ok: false, message: 'exists' };
            const fileName = checked.segments[checked.segments.length - 1];
            const content = normalizeEditedText(text, '\n');
            const { error, warnings } = this.checkContent(spec, content, fileName, false);
            if (error) return error;
            if (warnings.length > 0 && !confirmedWarnings) {
                return { ok: false, message: 'needs-confirmation', warnings };
            }
            const write = await fs.writeTextAtomic(checked.rel, content, { expectedRevision: MISSING_REVISION });
            if (write.kind === 'conflict') return { ok: false, message: 'exists' };
            return await resultOfWrite(fs, checked.rel, write, warnings);
        } catch (error) {
            return failureOfException(error);
        }
    }

    /**
     * 選択したファイルを削除し、空になった親フォルダを片付ける（ルートは残す）。リンクはリンク自体だけを消す。
     * 警告のあるファイルは、確認されるまで何も消さない。
     */
    async deleteEntries(
        env: AgentEnvironment,
        spec: FileCollectionSpec,
        relPaths: string[],
        confirmedWarnings: boolean
    ): Promise<ProfileCollectionResult> {
        if (!Array.isArray(relPaths)) return rejected('invalid-input');
        const fs = this.fsFor(env);
        const warningKeys = spec.deleteWarningKeys ?? {};
        const warnings = relPaths.flatMap(rel =>
            typeof rel === 'string' && Object.hasOwn(warningKeys, rel) ? [warningKeys[rel]] : []
        );
        if (warnings.length > 0 && !confirmedWarnings) return { ok: false, needsConfirmation: true, warnings };
        let deletedCount = 0;
        const skipped: string[] = [];
        for (const relPath of relPaths) {
            const checked = await this.checkPath(fs, spec, relPath, false);
            if (!checked.ok) {
                skipped.push(String(relPath));
                continue;
            }
            const removed = await fs.deleteStrict(checked.rel);
            if (removed.kind !== 'removed' && removed.kind !== 'missing') {
                skipped.push(checked.relPath);
                continue;
            }
            if (removed.kind === 'removed') deletedCount += 1;
            await fs.removeEmptyParents(checked.rel, spec.rootRel);
        }
        return { ok: skipped.length === 0, deletedCount, ...(skipped.length > 0 ? { skipped } : {}) };
    }

    /** OS のファイルマネージャーでファイルを表示する。OS のプロセスから見えるパスが無い環境では unavailable。 */
    async reveal(env: AgentEnvironment, spec: FileCollectionSpec, relPath: string): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        const real = await fs.resolveRealPath(spec.rootRel).catch(() => null);
        if (real === null) return failedOp('unavailable');
        const checked = await this.checkPath(fs, spec, relPath, false);
        if (!checked.ok) return failedOp('unsafe-path');
        return revealAssetPath(join(real, checked.relPath), false);
    }

    /** 選択したファイルを 1 つの ZIP に保存する。リンクはリンク先の内容を入れる。読めないファイルは skipped に返す。 */
    async download(
        env: AgentEnvironment,
        spec: FileCollectionSpec,
        relPaths: string[],
        window: BrowserWindow | null
    ): Promise<AssetOpResult> {
        const fs = this.fsFor(env);
        if (!(await fs.isReachable())) return failedOp('unavailable');
        if (!Array.isArray(relPaths)) return failedOp('invalid-input');
        const safe: string[] = [];
        for (const relPath of relPaths) {
            const checked = await this.checkPath(fs, spec, relPath, false);
            if (checked.ok && !safe.includes(checked.relPath)) safe.push(checked.relPath);
        }
        if (safe.length === 0) return failedOp('no-selection');
        const options = {
            defaultPath: assetArchiveFileName({
                kind: spec.id,
                agentId: this.agentId,
                distro: env.kind === 'wsl' ? env.distro : undefined,
                relPaths: safe,
            }),
            filters: [{ name: 'ZIP Archives', extensions: ['zip'] }],
        };
        const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
        if (result.canceled || !result.filePath) return { ok: false, canceled: true };
        try {
            const skipped: string[] = [];
            await this.writeArchive(fs, spec, result.filePath, safe, skipped);
            return { ok: skipped.length < safe.length, ...(skipped.length > 0 ? { skipped } : {}) };
        } catch (error) {
            console.error(`Failed to archive a collection (${JSON.stringify(env)}, ${spec.id}):`, error);
            return failedOp('download-failed');
        }
    }

    private async writeArchive(
        fs: HomeFs,
        spec: FileCollectionSpec,
        target: string,
        relPaths: string[],
        skipped: string[]
    ): Promise<void> {
        const contents = await fs.readArchiveFiles(relPaths.map(relPath => `${spec.rootRel}/${relPath}`));
        const archive = archiver('zip', zipArchiveOptions());
        const output = createWriteStream(target);
        const finished = new Promise<void>((resolve, reject) => {
            output.on('close', resolve);
            output.on('error', reject);
            archive.on('error', reject);
        });
        archive.pipe(output);
        for (const relPath of relPaths) {
            const file = contents.get(`${spec.rootRel}/${relPath}`);
            if (file) archive.append(file.bytes, { name: relPath, date: new Date(file.mtimeMs) });
            else skipped.push(relPath);
        }
        void archive.finalize();
        await finished;
    }

    /** ファイルを選ばせて、取り込み先の衝突と検証の結果を返す。何も変更しない。 */
    async inspectUpload(
        env: AgentEnvironment,
        spec: FileCollectionSpec,
        window: BrowserWindow | null
    ): Promise<ProfileCollectionResult> {
        const fs = this.fsFor(env);
        if (!(await fs.isReachable())) return rejected('unavailable');
        const extensions = spec.extensions.map(extension => extension.replace(/^\./, ''));
        const options: OpenDialogOptions = {
            filters: [
                { name: `${extensions.join(' / ')} / ZIP`, extensions: [...extensions, 'zip'] },
                { name: extensions.join(' / '), extensions },
                { name: 'ZIP Archives', extensions: ['zip'] },
            ],
            properties: ['openFile'],
        };
        const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
        if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true };
        const source = result.filePaths[0];
        this.inspectedUploads.remember(env, spec.id, source);
        const plan = await this.planUpload(fs, spec, source);
        if (!plan.ok) return plan.result;
        const conflicts = await this.existingItems(fs, spec, plan.items);
        const warnings = this.contentWarnings(spec, plan.items);
        return {
            ok: true,
            uploadKind: plan.kind,
            srcPath: source,
            ...(plan.kind === 'file' ? { targetName: plan.items[0].relPath } : {}),
            conflicts,
            ...(warnings.length > 0 ? { warnings } : {}),
        };
    }

    /**
     * ファイルを読み、取り込むファイルの一覧を作る。拡張子で分岐し、ZIP 以外は書庫として読まない。
     * ZIP の全エントリを新しいパスとして検証し、深さの上限を超えるものは nested-not-allowed で拒否する。
     */
    private async planUpload(fs: HomeFs, spec: FileCollectionSpec, source: string): Promise<UploadPlan> {
        const rule: RelPathRule = { extensions: spec.extensions, maxDepth: spec.maxDepth };
        if (extname(source).toLowerCase() !== '.zip') {
            const name = basename(source);
            if (!hasExtension(name, spec.extensions) || spec.fixedFileName !== undefined) {
                return { ok: false, result: rejected('unsupported-file') };
            }
            const check = validateRelPath(name, { ...rule, creating: true });
            if (!check.ok) return { ok: false, result: rejected('unsafe-path', { detail: check.reason }) };
            const bytes = readFileSync(source);
            if (!describeBytes(bytes).utf8Clean) return { ok: false, result: rejected('not-utf8') };
            return {
                ok: true,
                kind: 'file',
                items: [{ relPath: check.relPath, bytes }],
                mtimeMs: fileMtimeMs(source),
            };
        }
        let entries: NormalizedArchiveEntry[] | null;
        try {
            entries = normalizedArchiveEntries(new AdmZip(source));
        } catch {
            return { ok: false, result: rejected('invalid-archive') };
        }
        if (entries === null) return { ok: false, result: rejected('invalid-archive') };
        const files = entries.filter(({ entry }) => !entry.isDirectory);
        if (files.length === 0) return { ok: false, result: rejected('invalid-archive') };
        const check = validateArchiveEntries(entries, rule);
        if (!check.ok) {
            const message = check.reason === 'too-deep' ? 'nested-not-allowed' : 'invalid-archive';
            return { ok: false, result: rejected(message, { detail: check.reason }) };
        }
        for (const { path } of files) {
            if (!matchesFixedFileName(spec, path.split('/'))) {
                return { ok: false, result: rejected('invalid-archive', { detail: path }) };
            }
            const link = await fs.findLinkBelowRoot(spec.rootRel, path.split('/'));
            if (link.kind !== 'none') return { ok: false, result: rejected('unsafe-path', { detail: path }) };
        }
        return {
            ok: true,
            kind: 'zip',
            entries,
            items: files.map(({ path, entry }) => ({ relPath: path, bytes: entry.getData() })),
        };
    }

    private async existingItems(fs: HomeFs, spec: FileCollectionSpec, items: readonly UploadItem[]): Promise<string[]> {
        const existing: string[] = [];
        for (const item of items) {
            if (await fs.exists(`${spec.rootRel}/${item.relPath}`)) existing.push(item.relPath);
        }
        return existing;
    }

    private contentWarnings(spec: FileCollectionSpec, items: readonly UploadItem[]): string[] {
        const warnings: string[] = [];
        for (const item of items) {
            const described = describeBytes(item.bytes);
            const fileName = item.relPath.slice(item.relPath.lastIndexOf('/') + 1);
            const result = runProfileValidator(spec.validator, {
                text: described.text,
                fileName,
                hadBom: described.hadBom,
            });
            warnings.push(...result.errors, ...result.warnings);
        }
        return [...new Set(warnings)];
    }

    /**
     * 選ばれたファイルを取り込む。既にある対象は overwrite のときだけ置き換える。失敗すれば取り込み前の状態に戻す。
     * CLI がルートを再帰で読む一覧では、作業用ディレクトリをルートの外に作る。
     */
    async upload(
        env: AgentEnvironment,
        spec: FileCollectionSpec,
        srcPath: string,
        overwrite: boolean,
        confirmedWarnings: boolean
    ): Promise<ProfileCollectionResult> {
        if (!this.inspectedUploads.accepts(env, spec.id, srcPath)) return rejected('invalid-input');
        const fs = this.fsFor(env);
        if (!(await fs.isReachable())) return rejected('unavailable');
        try {
            const plan = await this.planUpload(fs, spec, srcPath);
            if (!plan.ok) return plan.result;
            const conflicts = await this.existingItems(fs, spec, plan.items);
            if (conflicts.length > 0 && !overwrite) return rejected('conflict', { conflicts });
            for (const item of plan.items) {
                if (await fs.isLink(`${spec.rootRel}/${item.relPath}`)) {
                    return rejected('unsafe-path', { detail: item.relPath });
                }
            }
            const warnings = this.contentWarnings(spec, plan.items);
            if (warnings.length > 0 && !confirmedWarnings) return { ok: false, needsConfirmation: true, warnings };
            const items = plan.items.map(item => item.relPath);
            const files =
                plan.kind === 'zip'
                    ? stagedFilesOfArchive(plan.entries)
                    : [{ relPath: plan.items[0].relPath, bytes: plan.items[0].bytes, mtimeMs: plan.mtimeMs }];
            await installFiles(
                fs,
                spec.rootRel,
                items,
                new Set(conflicts),
                files.map(file => withoutStagedBom(spec, file)),
                { stagingOutsideDest: spec.maxDepth > 0 }
            );
            this.inspectedUploads.forget(env, spec.id);
            return { ok: true, importedCount: items.length };
        } catch (error) {
            console.error(`Failed to upload to a collection (${JSON.stringify(env)}, ${spec.id}):`, error);
            return rejected('upload-failed');
        }
    }
}
