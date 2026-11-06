import type { BrowserWindow } from 'electron';
import type { AgentEnvironment, AssetOpResult } from '../../../../shared/agents/types';
import { shortestDistinctPaths } from '../../../../shared/agents/profile/pathLabels';
import {
    MISSING_REVISION,
    type AgentProfileSpec,
    type CommandFieldData,
    type CommandFieldsSectionSpec,
    type FileCollectionReport,
    type FileCollectionSectionSpec,
    type FileCollectionSpec,
    type FixedFileRow,
    type FixedFileSetSectionSpec,
    type FixedFileSpec,
    type HookAddTarget,
    type HookDisableListData,
    type HookEntryAddition,
    type HookEntryLocator,
    type HookEntryRead,
    type HookOverviewSectionSpec,
    type HookSourceNaming,
    type OrderedListData,
    type OrderedListsSectionSpec,
    type ProfileActiveNotice,
    type ProfileCollectionResult,
    type ProfileDocFormat,
    type ProfileFileData,
    type ProfileNoticeCondition,
    type ProfileOtherForm,
    type ProfileSectionData,
    type ProfileSectionSpec,
    type ProfileWriteError,
    type ProfileWriteResult,
    type ScopedEditorSectionSpec,
} from '../../../../shared/agents/profile/types';
import {
    parseJsonc,
    parseJsoncObject,
    readJsoncScope,
    removeJsoncProperty,
    setJsoncRaw,
} from '../../../utils/jsoncEdit';
import { strictDeepEqual } from '../../../utils/strictDeepEqual';
import {
    parseToml,
    readTomlTable,
    readTomlValue,
    replaceTomlTable,
    lostTomlComments,
    renderTomlArrayItem,
    replaceTomlValue,
    setTomlValue,
    TomlEditError,
} from '../../../utils/tomlSubtree';
import { codeOf, revisionOf, withBom, type ListedEntry, type ListedTree, type StrictRead } from '../fs/atomicFile';
import { HomeFs } from '../wsl/HomeFs';
import type { WslDetector } from '../wsl/WslDetector';
import { FileCollectionManager, isLoadedEntry } from './FileCollectionManager';
import {
    additionInfoOf,
    applyHookEntryChange,
    eventKeyForAddition,
    HookEditFailure,
    hookEntryTemplate,
    isHookEntryAddition,
    isHookEntryLocator,
    parseHookEntryText,
    readHookEntryText,
    type HookEntryChange,
    type HookEntryEditResult,
    type HookEntryPart,
    type HookScope,
} from './hookEntryEdit';
import {
    analyzeHookDocuments,
    editDisabledHookLines,
    isSameGrokEvent,
    parseDisabledHookNames,
    planHookToggle,
    renameDisabledHookLines,
    renumberedHookName,
    type AnalyzedHookRow,
    type HookDocument,
} from './hookOverview';
import {
    bomAfterSave,
    conflictOf,
    failureOfException,
    normalizeEditedText,
    readFailure,
    resultOfWrite,
    revisionOfRead,
    saveFileText,
    sameEditedText,
    toFileData,
} from './profileFileOps';
import { runProfileValidator } from './profileValidators';

/** 実行時に文書の相対パスを決める処理。resolver は文書の定義にある処理の名前。 */
export type ProfileDocResolver = (fs: HomeFs, resolver: string) => Promise<string>;

/** 編集の失敗。本文を含まないコードと、行番号などの付加情報だけを持つ。 */
class ProfileEditFailure extends Error {
    constructor(
        readonly code: ProfileWriteError,
        readonly detail?: string
    ) {
        super(code);
        this.name = 'ProfileEditFailure';
    }
}

/** 文書の現在の内容。 */
interface DocSnapshot {
    rel: string;
    format: ProfileDocFormat;
    text: string;
    read: StrictRead;
    hadBom: boolean;
    // ファイル全体の revision。
    fileRevision: string;
}

/** 文書の編集の内容。 */
interface DocEdit {
    next: string;
    warnings: string[];
    // 編集後の本文から、結果として返す revision を求める。無ければファイル全体の revision を返す。
    revisionOf?: (text: string) => string;
    // 警告が無くても、確認されるまで何も変えない。
    confirmAlways?: boolean;
}

/** 文書の値 1 つの読み取り結果。 */
interface PathValue {
    present: boolean;
    raw: string;
    value: unknown;
    // この部品で編集できない形（テーブルの形で書かれている、親が配列やインラインテーブルなど）。
    blocked: boolean;
}

/** 本文を読んでから hook の文書にする読み取り元。target があれば編集できる。 */
interface PendingHookDocument {
    rel: string;
    target?: HookTarget;
    make: (text: string | null) => HookDocument;
}

/** 編集できる hook の読み取り元。 */
interface HookTarget {
    sourceId: string;
    rel: string;
    format: ProfileDocFormat;
    path: string[] | null;
    excludePaths?: string[][];
    naming?: HookSourceNaming;
    // 一覧のファイルの名前。
    fileName?: string;
    entryValidator?: string;
    fileValidator?: string;
}

/** 位置を含むキーの記録の位置。 */
interface HookStatePosition {
    eventLabel: string;
    group: number;
    handler: number;
}

// 位置を含むキーの記録のキー。定義元のファイルのパス、イベント、グループの位置、ハンドラの位置をつないだ形。
const HOOK_STATE_KEY = /^(.+):([a-z_]+):(\d+):(\d+)$/;

/** 固定ファイルの実ファイルの解決結果。 */
interface FixedFileTarget {
    // 読み書きする実ファイルの相対パス。
    realRel: string;
    // 正式名と大文字小文字だけ違う、realRel 以外の実ファイルの名前。
    variants: string[];
}

const textRevision = (text: string) => revisionOf(Buffer.from(text, 'utf8'));

function dirOf(rel: string): string {
    const slash = rel.lastIndexOf('/');
    return slash === -1 ? '' : rel.slice(0, slash);
}

function baseOf(rel: string): string {
    return rel.slice(rel.lastIndexOf('/') + 1);
}

function joinRel(dir: string, name: string): string {
    return dir === '' ? name : `${dir}/${name}`;
}

/** JSON.parse の例外の位置から行番号の情報を作る。例外のメッセージそのものは返さない。 */
function jsonLineDetail(error: unknown, text: string): string | undefined {
    const position = /position (\d+)/.exec(error instanceof Error ? error.message : '');
    if (!position) return undefined;
    const before = text.slice(0, Number(position[1]));
    return `line:${before.split('\n').length}`;
}

/** 断片が文書の形式の値として読めることを確かめ、値を返す。 */
function parseFragment(format: ProfileDocFormat, text: string): unknown {
    try {
        return format === 'json' ? JSON.parse(text) : parseJsonc(text);
    } catch (error) {
        throw new ProfileEditFailure('invalid-input', format === 'json' ? jsonLineDetail(error, text) : undefined);
    }
}

/** 文書全体をオブジェクトとして読む。空白だけのテキストは空のオブジェクトにする。 */
function parseJsonDocument(text: string): Record<string, unknown> {
    if (text.trim() === '') return {};
    try {
        return parseJsoncObject(text);
    } catch {
        throw new ProfileEditFailure('invalid-existing');
    }
}

function isPlainTable(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** path の途中にオブジェクト以外の値があるか。 */
function hasBlockedParent(model: Record<string, unknown>, path: string[]): boolean {
    let current: unknown = model;
    for (const key of path.slice(0, -1)) {
        if (!isPlainTable(current) || !Object.hasOwn(current, key)) return false;
        current = current[key];
        if (!isPlainTable(current)) return true;
    }
    return false;
}

function getPath(model: unknown, path: string[]): unknown {
    let current = model;
    for (const key of path) {
        if (!isPlainTable(current) || !Object.hasOwn(current, key)) return undefined;
        current = current[key];
    }
    return current;
}

/** モデルのコピーへ path の値の設定か削除（value が undefined）を適用する。 */
function withPathValue(model: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
    const copy = structuredClone(model);
    let current = copy;
    for (const key of path.slice(0, -1)) {
        if (!isPlainTable(current[key])) {
            if (value === undefined) return copy;
            current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
    }
    const leaf = path[path.length - 1];
    if (value === undefined) delete current[leaf];
    else current[leaf] = value;
    return copy;
}

/** 文書全体を形式に合わせて読む。 */
function parseDocModel(format: ProfileDocFormat, text: string): Record<string, unknown> {
    return format === 'toml' ? parseToml(text) : parseJsonDocument(text);
}

/** 別の書き方が同じ文書にあるか。 */
function hasOtherForm(snapshot: DocSnapshot, other: ProfileOtherForm | undefined): boolean {
    if (!other) return false;
    const model = parseDocModel(snapshot.format, snapshot.text);
    return other.paths.some(path => getPath(model, path) !== undefined);
}

/**
 * 別の書き方がある文書の編集を判定する。別の書き方だけがある文書には書き足さず、両方ある文書は確認を求める。
 * ownPaths はこの部品が編集するキーの位置。
 */
function otherFormCheck(
    snapshot: DocSnapshot,
    other: ProfileOtherForm | undefined,
    ownPaths: string[][]
): { blocked: ProfileWriteResult | null; warnings: string[] } {
    if (!hasOtherForm(snapshot, other)) return { blocked: null, warnings: [] };
    const model = parseDocModel(snapshot.format, snapshot.text);
    if (ownPaths.some(path => getPath(model, path) !== undefined)) {
        return { blocked: null, warnings: ['both-forms-present'] };
    }
    return { blocked: { ok: false, message: 'unsupported-form', detail: 'other-form-present' }, warnings: [] };
}

/** 相対パスから最後の拡張子を除く。 */
function withoutExtension(relPath: string): string {
    const dot = relPath.lastIndexOf('.');
    return dot > relPath.lastIndexOf('/') + 1 ? relPath.slice(0, dot) : relPath;
}

/** JSON の編集結果が、変更を適用したモデルと一致することを確かめる。 */
function verifyJsonEdit(before: Record<string, unknown>, after: string, path: string[], value: unknown): void {
    let actual: unknown;
    try {
        actual = parseJsonc(after);
    } catch {
        throw new ProfileEditFailure('verify-failed');
    }
    if (!strictDeepEqual(actual, withPathValue(before, path, value))) throw new ProfileEditFailure('verify-failed');
}

/** JSON の値を生テキストで置き換えるか、rawValue が null なら削除する。結果を検証して返す。 */
function editJsonValue(text: string, path: string[], rawValue: string | null, value: unknown): string {
    const model = parseJsonDocument(text);
    if (rawValue === null) {
        const removed = removeJsoncProperty(text, path, { cascade: false });
        verifyJsonEdit(model, removed, path, undefined);
        return removed;
    }
    if (hasBlockedParent(model, path)) throw new ProfileEditFailure('unsupported-form');
    let next: string;
    try {
        next = setJsoncRaw(text, path, rawValue);
    } catch {
        throw new ProfileEditFailure('invalid-input');
    }
    verifyJsonEdit(model, next, path, value);
    return next;
}

/** TOML の 1 行の値を読む。テーブルの形や親がインラインの形は blocked にする。 */
function readTomlPathValue(text: string, path: string[]): PathValue {
    try {
        const read = readTomlValue(text, path);
        const value = read.present ? parseToml(`v = ${read.fragment}`).v : undefined;
        return { present: read.present, raw: read.fragment, value, blocked: false };
    } catch (error) {
        if (error instanceof TomlEditError && error.code !== 'invalid-existing') {
            return { present: false, raw: '', value: undefined, blocked: true };
        }
        throw error;
    }
}

function readPathValue(format: ProfileDocFormat, text: string, path: string[]): PathValue {
    if (format === 'toml') return readTomlPathValue(text, path);
    const model = parseJsonDocument(text);
    if (hasBlockedParent(model, path)) return { present: false, raw: '', value: undefined, blocked: true };
    const read = readJsoncScope(text, path);
    return { present: read.present, raw: read.rawText, value: read.value, blocked: false };
}

function pathRevision(value: PathValue): string {
    return value.present ? textRevision(value.raw) : MISSING_REVISION;
}

/** スコープ編集の断片を文書から読む。 */
function readScopeOf(section: ScopedEditorSectionSpec, format: ProfileDocFormat, text: string) {
    const path = section.path as string[];
    if (format === 'toml') {
        if (section.mode === 'value') {
            const value = readTomlValue(text, path);
            return { present: value.present, text: value.fragment, normalized: false };
        }
        const table = readTomlTable(text, path, section.excludePaths ?? []);
        return { present: table.present, text: table.fragment, normalized: table.normalized };
    }
    parseJsonDocument(text);
    const scope = readJsoncScope(text, path);
    return { present: scope.present, text: scope.rawText, normalized: false };
}

/** スコープ編集の失敗のコードを保存の失敗のコードにする。 */
function writeErrorOf(error: TomlEditError): ProfileWriteError {
    return error.code === 'already-defined' ? 'unsupported-form' : error.code;
}

/** 例外を読み取りの失敗の形にする。 */
function failedSection(section: ProfileSectionSpec, error: unknown): ProfileSectionData {
    const base = { kind: 'failed' as const, sectionKind: section.kind };
    if (error instanceof TomlEditError) {
        const message = writeErrorOf(error);
        return { ...base, message, ...(error.line !== undefined ? { detail: `line:${error.line}` } : {}) };
    }
    if (error instanceof ProfileEditFailure) {
        return { ...base, message: error.code, ...(error.detail ? { detail: error.detail } : {}) };
    }
    return { ...base, message: 'read-failed', detail: codeOf(error, 'EUNKNOWN') };
}

/** 例外を保存の失敗の形にする。 */
function failedWrite(error: unknown): ProfileWriteResult {
    if (error instanceof TomlEditError) {
        const message = writeErrorOf(error);
        return { ok: false, message, ...(error.line !== undefined ? { detail: `line:${error.line}` } : {}) };
    }
    if (error instanceof ProfileEditFailure || error instanceof HookEditFailure) {
        return { ok: false, message: error.code, ...(error.detail ? { detail: error.detail } : {}) };
    }
    return failureOfException(error);
}

/** 例外を hook の 1 件の読み取りの失敗の形にする。 */
function failedHookRead(error: unknown): HookEntryRead {
    const failed = failedWrite(error);
    if (failed.ok || failed.message === 'needs-confirmation') return { ok: false, message: 'read-failed' };
    return { ok: false, message: failed.message, ...(failed.detail ? { detail: failed.detail } : {}) };
}

/** 絶対パスをホームからの相対パスにする。ホームの外なら null。ドライブ文字のあるホームは大文字小文字を区別しない。 */
function homeRelativeOf(absPath: string, home: string): string | null {
    const target = absPath.replace(/\\/g, '/');
    const base = home.replace(/\\/g, '/').replace(/\/+$/, '');
    const ignoreCase = /^[a-zA-Z]:/.test(base);
    const fold = (value: string) => (ignoreCase ? value.toLowerCase() : value);
    if (!fold(target).startsWith(`${fold(base)}/`)) return null;
    const rel = target.slice(base.length + 1);
    return rel.split('/').some(segment => segment === '' || segment === '..') ? null : rel;
}

function isAbsoluteRegistryPath(line: string): boolean {
    return line.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(line) || line.startsWith('\\\\');
}

/**
 * エージェントのプロファイル設定を読み書きする。仕様（タブと section の定義）を受け取るだけで、派生クラスは作らない。
 * sectionId は仕様と照合し、パスは仕様から決める。renderer から受け取るパスは検証したファイル一覧の相対パスだけ。
 * 本文を含み得る例外のメッセージは返さず、エラーコードにする。
 */
export class ProfileManager {
    private readonly sections = new Map<string, ProfileSectionSpec>();
    private readonly collections: FileCollectionManager;

    constructor(
        private readonly detector: WslDetector,
        private readonly spec: AgentProfileSpec,
        private readonly resolveDoc?: ProfileDocResolver
    ) {
        for (const tab of [...spec.settingsTabs, ...spec.assetTabs]) {
            for (const section of tab.sections) this.sections.set(section.id, section);
        }
        this.collections = new FileCollectionManager(detector, spec.agentId);
    }

    getSpec(): AgentProfileSpec {
        return this.spec;
    }

    private fsFor(env: AgentEnvironment): HomeFs {
        return new HomeFs(env, this.detector);
    }

    private sectionOf<K extends ProfileSectionSpec['kind']>(
        sectionId: unknown,
        kind: K
    ): Extract<ProfileSectionSpec, { kind: K }> | null {
        if (typeof sectionId !== 'string') return null;
        const section = this.sections.get(sectionId);
        return section?.kind === kind ? (section as Extract<ProfileSectionSpec, { kind: K }>) : null;
    }

    /** 文書の相対パスと形式を決める。 */
    private async docOf(fs: HomeFs, docId: string): Promise<{ rel: string; format: ProfileDocFormat }> {
        const ref = Object.hasOwn(this.spec.docs, docId) ? this.spec.docs[docId] : undefined;
        if (!ref) throw new ProfileEditFailure('unavailable');
        if ('rel' in ref) return { rel: ref.rel, format: ref.format };
        if (!this.resolveDoc) throw new ProfileEditFailure('unavailable');
        return { rel: await this.resolveDoc(fs, ref.resolver), format: ref.format };
    }

    /** 文書を読む。編集できない読み取り結果は失敗にする。 */
    private async snapshotOf(fs: HomeFs, docId: string): Promise<DocSnapshot> {
        const { rel, format } = await this.docOf(fs, docId);
        return this.snapshotOfFile(fs, rel, format);
    }

    /** ファイルを文書として読む。編集できない読み取り結果は失敗にする。 */
    private async snapshotOfFile(fs: HomeFs, rel: string, format: ProfileDocFormat): Promise<DocSnapshot> {
        const read = await fs.readTextStrict(rel);
        const blocked = readFailure(read);
        if (blocked && !blocked.ok) {
            const message = blocked.message as ProfileWriteError;
            throw new ProfileEditFailure(message, 'detail' in blocked ? blocked.detail : undefined);
        }
        const ok = read.kind === 'ok' ? read : null;
        return {
            rel,
            format,
            read,
            text: ok?.text ?? '',
            hadBom: ok?.hadBom ?? false,
            fileRevision: ok?.revision ?? MISSING_REVISION,
        };
    }

    /**
     * 文書の最新の内容へ編集を適用して書き込む。読み取りの後に書き込みの前でファイルが変わっていたら、1 回だけ読み直す。
     * build は本文の検証と編集を行い、DocEdit か保存の結果（失敗）を返す。
     * 内容が変わる編集では、CLI が読めない可能性のある文書の警告を加える。
     */
    private async applyDocEdit(
        fs: HomeFs,
        docId: string,
        confirmedWarnings: boolean,
        build: (snapshot: DocSnapshot) => DocEdit | ProfileWriteResult
    ): Promise<ProfileWriteResult> {
        return this.applyEdit(fs, () => this.snapshotOf(fs, docId), confirmedWarnings, build);
    }

    /** load が読む文書へ編集を適用して書き込む。手順は applyDocEdit と同じ。 */
    private async applyEdit(
        fs: HomeFs,
        load: () => Promise<DocSnapshot>,
        confirmedWarnings: boolean,
        build: (snapshot: DocSnapshot) => DocEdit | ProfileWriteResult
    ): Promise<ProfileWriteResult> {
        for (let attempt = 0; ; attempt += 1) {
            const snapshot = await load();
            const edit = build(snapshot);
            if ('ok' in edit) return edit;
            const warnings =
                edit.next === snapshot.text ? edit.warnings : [...edit.warnings, ...strictDocWarnings(snapshot)];
            if ((warnings.length > 0 || edit.confirmAlways) && !confirmedWarnings) {
                return { ok: false, message: 'needs-confirmation', warnings };
            }
            const notes = warnings.length > 0 ? { warnings } : {};
            if (edit.next === snapshot.text) {
                return { ok: true, revision: edit.revisionOf?.(edit.next) ?? snapshot.fileRevision, ...notes };
            }
            const write = await fs.writeTextAtomic(
                snapshot.rel,
                withBom(edit.next, bomAfterSave(snapshot.rel, snapshot.hadBom)),
                { expectedRevision: snapshot.fileRevision }
            );
            if (write.kind === 'ok') {
                return { ok: true, revision: edit.revisionOf?.(edit.next) ?? write.revision, ...notes };
            }
            if (write.kind === 'conflict') {
                if (attempt === 0) continue;
                return { ok: false, message: 'conflict' };
            }
            return resultOfWrite(fs, snapshot.rel, write, warnings);
        }
    }

    // ------------------------------------------------------------
    // 読み取り
    // ------------------------------------------------------------

    /** section の表示内容を返す。例外を投げず、失敗は kind が failed の結果にする。 */
    async readSection(
        env: AgentEnvironment,
        sectionId: string,
        options?: { reveal?: boolean }
    ): Promise<ProfileSectionData> {
        const section = typeof sectionId === 'string' ? this.sections.get(sectionId) : undefined;
        if (!section) return { kind: 'failed', message: 'invalid-input' };
        const fs = this.fsFor(env);
        let data: ProfileSectionData;
        try {
            data = await this.readSectionBody(env, fs, section, options?.reveal === true);
        } catch (error) {
            data = failedSection(section, error);
        }
        const notices = await this.activeNotices(fs, section);
        return notices.length > 0 ? { ...data, notices } : data;
    }

    private async readSectionBody(
        env: AgentEnvironment,
        fs: HomeFs,
        section: ProfileSectionSpec,
        reveal: boolean
    ): Promise<ProfileSectionData> {
        switch (section.kind) {
            case 'hookOverview':
                return this.readHookOverview(fs, section);
            case 'scopedEditor':
                return this.readScoped(fs, section, reveal);
            case 'commandFields':
                return this.readCommandFields(fs, section);
            case 'orderedLists':
                return this.readLists(fs, section);
            case 'fixedFileSet':
                return this.readFixedSet(fs, section);
            default:
                return { kind: 'fileCollection', report: await this.collectionReport(env, fs, section.collection) };
        }
    }

    /** 条件を満たす注記を返す。条件を判定できないものは出さない。 */
    private async activeNotices(fs: HomeFs, section: ProfileSectionSpec): Promise<ProfileActiveNotice[]> {
        const active: ProfileActiveNotice[] = [];
        for (const notice of section.conditionalNotices ?? []) {
            try {
                const names = await this.noticeNames(fs, notice.when);
                if (names) active.push({ key: notice.key, ...(names.length > 0 ? { names } : {}) });
            } catch {
                continue;
            }
        }
        return active;
    }

    /** 条件を判定する。満たさなければ null、満たせば注記に並べる名前（無ければ空）を返す。 */
    private async noticeNames(fs: HomeFs, when: ProfileNoticeCondition): Promise<string[] | null> {
        if (when.kind === 'filesExist') {
            for (const rel of when.rels) {
                if (!(await fs.exists(rel))) return null;
            }
            return [];
        }
        const snapshot = await this.snapshotOf(fs, when.doc);
        const value = getPath(parseDocModel(snapshot.format, snapshot.text), when.path);
        if (when.kind === 'docPath') return value === undefined ? null : [];
        if (!isPlainTable(value)) return null;
        const stems = new Set<string>();
        for (const id of when.collections) {
            const spec = this.collectionById(id);
            if (spec) for (const stem of await this.loadedStems(fs, spec)) stems.add(stem);
        }
        const shadowed = Object.keys(value).filter(key => stems.has(key));
        return shadowed.length > 0 ? shadowed : null;
    }

    /** 一覧のうち CLI が読み込むファイルの、拡張子を除いた相対パスを返す。 */
    private async loadedStems(fs: HomeFs, spec: FileCollectionSpec): Promise<string[]> {
        const tree = await fs.listTree(spec.rootRel, { maxDepth: spec.maxDepth });
        if (tree.kind !== 'ok') return [];
        return tree.entries
            .filter((entry: ListedEntry) => isLoadedEntry(spec, entry))
            .map((entry: ListedEntry) => withoutExtension(entry.relPath));
    }

    /** 一覧を読み、別の一覧の同じ名前のファイルに隠れるファイルに警告を付ける。 */
    private async collectionReport(
        env: AgentEnvironment,
        fs: HomeFs,
        spec: FileCollectionSpec
    ): Promise<FileCollectionReport> {
        const report = await this.collections.list(env, spec);
        for (const id of spec.shadowedBy ?? []) {
            const other = this.collectionById(id);
            if (!other) continue;
            const stems = new Set(await this.loadedStems(fs, other));
            for (const entry of report.entries) {
                if (stems.has(withoutExtension(entry.relPath))) {
                    const warning = `shadowed-by:${other.rootRel}/${entry.relPath}`;
                    entry.warnings = [...(entry.warnings ?? []), warning];
                }
            }
        }
        return report;
    }

    /** スコープの断片を返す。sensitive の section は reveal があるまで本文と revision を返さない。 */
    private async readScoped(
        fs: HomeFs,
        section: ScopedEditorSectionSpec,
        reveal: boolean
    ): Promise<ProfileSectionData> {
        const { rel, format } = await this.docOf(fs, section.doc);
        const displayPath = await fs.displayPath(rel);
        try {
            const snapshot = await this.snapshotOf(fs, section.doc);
            const whole = section.path === null;
            const scope = whole
                ? { present: snapshot.read.kind === 'ok', text: snapshot.text, normalized: false }
                : readScopeOf(section, format, snapshot.text);
            const withheld = section.sensitive === true && !reveal;
            const revision = whole
                ? snapshot.fileRevision
                : scope.present
                  ? textRevision(scope.text)
                  : MISSING_REVISION;
            return {
                kind: 'scopedEditor',
                present: scope.present,
                text: withheld ? null : scope.text,
                withheld,
                normalized: scope.normalized,
                revision: withheld ? '' : revision,
                displayPath,
                ...(hasOtherForm(snapshot, section.otherForm) ? { otherForm: true } : {}),
            };
        } catch (error) {
            return failedSection(section, error);
        }
    }

    private async readCommandFields(fs: HomeFs, section: CommandFieldsSectionSpec): Promise<ProfileSectionData> {
        const snapshot = await this.snapshotOf(fs, section.doc);
        const values: Record<string, CommandFieldData> = {};
        for (const field of section.fields) {
            const current = readPathValue(snapshot.format, snapshot.text, field.path);
            const isText = typeof current.value === 'string';
            values[field.key] = {
                value: isText ? (current.value as string) : null,
                unsupported: current.blocked || (current.present && !isText),
                revision: pathRevision(current),
            };
        }
        return { kind: 'commandFields', values };
    }

    private async readLists(fs: HomeFs, section: OrderedListsSectionSpec): Promise<ProfileSectionData> {
        const snapshot = await this.snapshotOf(fs, section.doc);
        const lists: Record<string, OrderedListData> = {};
        for (const list of section.lists) {
            const current = readPathValue(snapshot.format, snapshot.text, list.path);
            const items = stringItems(current.value);
            lists[list.key] = {
                items,
                unsupported: current.blocked || (current.present && items === null),
                revision: pathRevision(current),
            };
        }
        return {
            kind: 'orderedLists',
            lists,
            ...(hasOtherForm(snapshot, section.otherForm) ? { otherForm: true } : {}),
        };
    }

    // ------------------------------------------------------------
    // スコープ編集
    // ------------------------------------------------------------

    /**
     * スコープの断片、またはファイル全体を保存する。比較はスコープの断片の revision で行うので、スコープ外の変更は競合にならない。
     * 全行を消した断片はキーの削除として扱う。ファイル全体を空にする保存は拒否する。
     */
    async saveScoped(
        env: AgentEnvironment,
        sectionId: string,
        text: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'scopedEditor');
        if (!section || typeof text !== 'string' || typeof baseRevision !== 'string') {
            return { ok: false, message: 'invalid-input' };
        }
        try {
            const fs = this.fsFor(env);
            if (section.path === null) {
                return await this.saveWholeDoc(fs, section, text, baseRevision, confirmedWarnings);
            }
            const ownPath = section.path;
            return await this.applyDocEdit(fs, section.doc, confirmedWarnings, snapshot => {
                const scope = readScopeOf(section, snapshot.format, snapshot.text);
                const current = scope.present ? textRevision(scope.text) : MISSING_REVISION;
                if (current !== baseRevision) {
                    return {
                        ok: false,
                        message: 'conflict',
                        current: { text: scope.present ? scope.text : null, revision: current },
                    };
                }
                const revisionOfScope = (next: string) => {
                    const after = readScopeOf(section, snapshot.format, next);
                    return after.present ? textRevision(after.text) : MISSING_REVISION;
                };
                const blank = text.trim() === '';
                if (scope.present ? sameEditedText(text, scope.text) : blank) {
                    return { next: snapshot.text, warnings: [], revisionOf: revisionOfScope };
                }
                const forms = otherFormCheck(snapshot, section.otherForm, [ownPath]);
                if (forms.blocked) return forms.blocked;
                const next = applyScopedEdit(section, snapshot, text, blank);
                const validation = blank
                    ? { errors: [], warnings: [] }
                    : runProfileValidator(section.validator, { text: normalizeEditedText(text, '\n') });
                if (validation.errors.length > 0) {
                    return {
                        ok: false,
                        message: 'invalid-input',
                        detail: validation.errors.join(','),
                        warnings: validation.warnings,
                    };
                }
                const warnings = [...validation.warnings, ...forms.warnings];
                return { next, warnings, revisionOf: revisionOfScope };
            });
        } catch (error) {
            return failedWrite(error);
        }
    }

    /** ファイル全体を編集する文書の保存。形式として読めない本文は拒否する。 */
    private async saveWholeDoc(
        fs: HomeFs,
        section: ScopedEditorSectionSpec,
        text: string,
        baseRevision: string,
        confirmedWarnings: boolean
    ): Promise<ProfileWriteResult> {
        if (text.trim() === '') return { ok: false, message: 'empty-content' };
        const { rel, format } = await this.docOf(fs, section.doc);
        return saveFileText(fs, rel, {
            text,
            baseRevision,
            confirmedWarnings,
            check: normalized => {
                const parseError = wholeDocParseError(format, normalized);
                if (parseError) return { error: parseError };
                const validation = runProfileValidator(section.validator, { text: normalized });
                if (validation.errors.length > 0) {
                    return {
                        error: {
                            ok: false,
                            message: 'invalid-input',
                            detail: validation.errors.join(','),
                            warnings: validation.warnings,
                        },
                    };
                }
                return { warnings: validation.warnings };
            },
        });
    }

    // ------------------------------------------------------------
    // コマンド入力と順序付きリスト
    // ------------------------------------------------------------

    /** コマンドの値を保存する。キーごとに開いた時点の revision と比較する。null と空白だけの値はキーの削除。 */
    async saveCommandFields(
        env: AgentEnvironment,
        sectionId: string,
        values: Record<string, string | null>,
        base: Record<string, string>,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'commandFields');
        if (!section || !isPlainTable(values) || !isPlainTable(base)) return { ok: false, message: 'invalid-input' };
        const fields = section.fields;
        for (const [key, value] of Object.entries(values)) {
            const known = fields.some(field => field.key === key);
            if (!known || (value !== null && typeof value !== 'string')) return { ok: false, message: 'invalid-input' };
        }
        try {
            return await this.applyDocEdit(this.fsFor(env), section.doc, confirmedWarnings, snapshot => {
                let next = snapshot.text;
                const warnings: string[] = [];
                for (const field of fields) {
                    if (!Object.hasOwn(values, field.key)) continue;
                    const current = readPathValue(snapshot.format, snapshot.text, field.path);
                    const revision = pathRevision(current);
                    if (revision !== base[field.key]) {
                        return {
                            ok: false,
                            message: 'conflict',
                            detail: field.key,
                            current: { text: typeof current.value === 'string' ? current.value : null, revision },
                        };
                    }
                    const isText = current.present && typeof current.value === 'string';
                    if (current.blocked || (current.present && !isText)) {
                        return { ok: false, message: 'unsupported-form', detail: field.key };
                    }
                    const raw = values[field.key];
                    const value = raw === null || raw.trim() === '' ? null : raw;
                    if (value === (current.present ? current.value : null)) continue;
                    if (value !== null) {
                        const validation = runProfileValidator(section.validator, { text: value });
                        if (validation.errors.length > 0) {
                            return { ok: false, message: 'invalid-input', detail: validation.errors.join(',') };
                        }
                        warnings.push(...validation.warnings);
                    }
                    next = applyPathValue(snapshot.format, next, field.path, value);
                }
                return { next, warnings, revisionOf: textRevision };
            });
        } catch (error) {
            return failedWrite(error);
        }
    }

    /** 順序付きリストを保存する。キーごとに開いた時点の revision と比較する。 */
    async saveLists(
        env: AgentEnvironment,
        sectionId: string,
        lists: Record<string, string[] | null>,
        base: Record<string, string>,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'orderedLists');
        if (!section || !isPlainTable(lists) || !isPlainTable(base)) return { ok: false, message: 'invalid-input' };
        for (const [key, items] of Object.entries(lists)) {
            const known = section.lists.some(list => list.key === key);
            const valid = items === null || (Array.isArray(items) && items.every(item => typeof item === 'string'));
            if (!known || !valid) return { ok: false, message: 'invalid-input' };
        }
        try {
            return await this.applyDocEdit(this.fsFor(env), section.doc, confirmedWarnings, snapshot => {
                let next = snapshot.text;
                const warnings: string[] = [];
                for (const list of section.lists) {
                    if (!Object.hasOwn(lists, list.key)) continue;
                    const current = readPathValue(snapshot.format, snapshot.text, list.path);
                    const revision = pathRevision(current);
                    if (revision !== base[list.key]) {
                        return { ok: false, message: 'conflict', detail: list.key, current: { text: null, revision } };
                    }
                    const currentItems = stringItems(current.value);
                    if (current.blocked || (current.present && currentItems === null)) {
                        return { ok: false, message: 'unsupported-form', detail: list.key };
                    }
                    const items = lists[list.key];
                    const value = items === null || (items.length === 0 && list.emptyMeans === 'unset') ? null : items;
                    if (strictDeepEqual(value, currentItems)) continue;
                    for (const [index, item] of (value ?? []).entries()) {
                        const validation = runProfileValidator(list.itemValidator, { text: item });
                        warnings.push(...validation.warnings.map(code => `${code}:${list.key}[${index}]`));
                    }
                    next = applyPathValue(snapshot.format, next, list.path, value);
                }
                if (next !== snapshot.text) {
                    const ownPaths = section.lists.map(list => list.path);
                    const forms = otherFormCheck(snapshot, section.otherForm, ownPaths);
                    if (forms.blocked) return forms.blocked;
                    warnings.push(...forms.warnings);
                }
                return { next, warnings, revisionOf: textRevision };
            });
        } catch (error) {
            return failedWrite(error);
        }
    }

    // ------------------------------------------------------------
    // 固定ファイル
    // ------------------------------------------------------------

    /** 固定ファイルの実ファイルを、ディレクトリの一覧から解決する。listings を渡すと同じディレクトリの一覧を使い回す。 */
    private async resolveFixedFile(
        fs: HomeFs,
        file: FixedFileSpec,
        listings: Map<string, Promise<ListedTree>> = new Map()
    ): Promise<FixedFileTarget> {
        const dir = dirOf(file.rel);
        const base = baseOf(file.rel);
        let pending = listings.get(dir);
        if (!pending) {
            pending = fs.listEntries(dir);
            listings.set(dir, pending);
        }
        const listing = await pending;
        if (listing.kind !== 'ok') return { realRel: file.rel, variants: [] };
        const sameName = listing.entries.filter(
            entry => entry.kind !== 'dir' && entry.name.toLowerCase() === base.toLowerCase()
        );
        const others = sameName
            .filter(entry => entry.name !== base)
            .map(entry => entry.name)
            .sort();
        if (sameName.some(entry => entry.name === base) || others.length === 0) {
            return { realRel: file.rel, variants: others };
        }
        return { realRel: joinRel(dir, others[0]), variants: others.slice(1) };
    }

    /** 固定ファイルの一覧。実ファイルの名前の違い、同じ実体、有効なファイルを判定する。 */
    private async readFixedSet(fs: HomeFs, section: FixedFileSetSectionSpec): Promise<ProfileSectionData> {
        const listings = new Map<string, Promise<ListedTree>>();
        const targets = await Promise.all(section.files.map(file => this.resolveFixedFile(fs, file, listings)));
        const reads = await fs.readTextStrictMany(targets.map(target => target.realRel));
        const rows = await Promise.all(
            section.files.map((file, index) =>
                this.fixedRow(fs, file, targets[index], reads.get(targets[index].realRel) as StrictRead)
            )
        );
        applyFixedEffective(section, rows, targets, reads);
        if (section.aggregateByIdentity) applyFixedAliases(rows, targets, reads);
        return { kind: 'fixedFileSet', files: rows };
    }

    private async fixedRow(
        fs: HomeFs,
        file: FixedFileSpec,
        target: FixedFileTarget,
        read: StrictRead
    ): Promise<FixedFileRow> {
        const data = toFileData(read, await fs.displayPath(target.realRel));
        const revision = revisionOfRead(read);
        const realName = baseOf(target.realRel);
        return {
            key: file.key,
            rel: file.rel,
            displayPath: data.displayPath,
            state: data.state,
            ...(revision !== null ? { revision } : {}),
            isLink: read.kind === 'dangling-link' || (read.kind === 'ok' && read.isLink),
            ...('linkTarget' in data && data.linkTarget !== undefined ? { linkTarget: data.linkTarget } : {}),
            ...(data.state === 'ok' ? { empty: data.text.trim() === '' } : {}),
            ...(target.variants.length > 0 ? { variants: target.variants } : {}),
            ...(realName !== baseOf(file.rel) ? { realName } : {}),
        };
    }

    private fixedFileOf(sectionId: unknown, fileKey: unknown) {
        const section = this.sectionOf(sectionId, 'fixedFileSet');
        const file = section?.files.find(item => item.key === fileKey);
        return section && file ? { section, file } : null;
    }

    async readFixedFile(env: AgentEnvironment, sectionId: string, fileKey: string): Promise<ProfileFileData> {
        const found = this.fixedFileOf(sectionId, fileKey);
        if (!found) return { state: 'error', code: 'invalid-input', displayPath: '' };
        try {
            const fs = this.fsFor(env);
            const target = await this.resolveFixedFile(fs, found.file);
            return toFileData(await fs.readTextStrict(target.realRel), await fs.displayPath(target.realRel));
        } catch (error) {
            return { state: 'error', code: codeOf(error, 'EUNKNOWN'), displayPath: '' };
        }
    }

    /**
     * 固定ファイルを保存する。空のファイルを作る保存は拒否する（削除は deleteFixedFile で明示する）。
     * リンクは実体へ書いてリンクを残す。保存後に実ファイルの名前が正式名と大文字小文字だけ違えば正式名へ改名する。
     * 改名で読み込み順が変わるときは、本文が同じでも確認されるまで何も変えない。
     */
    async saveFixedFile(
        env: AgentEnvironment,
        sectionId: string,
        fileKey: string,
        text: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const found = this.fixedFileOf(sectionId, fileKey);
        if (!found || typeof text !== 'string' || typeof baseRevision !== 'string') {
            return { ok: false, message: 'invalid-input' };
        }
        if (text.trim() === '') return { ok: false, message: 'empty-content' };
        try {
            const fs = this.fsFor(env);
            const target = await this.resolveFixedFile(fs, found.file);
            const renameOrder = await this.renameChangesLoadOrder(fs, found.file, target);
            if (renameOrder && !confirmedWarnings) {
                return { ok: false, message: 'needs-confirmation', warnings: ['rename-changes-load-order'] };
            }
            const saved = await saveFileText(fs, target.realRel, {
                text,
                baseRevision,
                confirmedWarnings,
                check: () => ({ warnings: renameOrder ? ['rename-changes-load-order'] : [] }),
            });
            if (!saved.ok) return saved;
            const renamed = await this.ensureCanonicalName(fs, found.file);
            if (renamed) return saved;
            return { ...saved, warnings: [...(saved.warnings ?? []), 'canonical-rename-failed'] };
        } catch (error) {
            return failedWrite(error);
        }
    }

    /** 大文字小文字を区別するファイルシステムで実ファイルが正式名と違うか。改名すると読み込み順が変わる。 */
    private async renameChangesLoadOrder(fs: HomeFs, file: FixedFileSpec, target: FixedFileTarget): Promise<boolean> {
        if (target.realRel === file.rel) return false;
        return (await fs.readTextStrict(file.rel)).kind === 'missing';
    }

    /**
     * 実ファイルの名前を正式名に揃え、ディレクトリの一覧で確かめる。揃っていれば true。
     * 別の実体が正式名で既にあるときは改名しない。
     */
    private async ensureCanonicalName(fs: HomeFs, file: FixedFileSpec): Promise<boolean> {
        const dir = dirOf(file.rel);
        const base = baseOf(file.rel);
        const before = await fs.listEntries(dir);
        if (before.kind !== 'ok') return false;
        if (before.entries.some(entry => entry.name === base)) return true;
        const actual = before.entries.find(entry => entry.name.toLowerCase() === base.toLowerCase());
        if (!actual) return false;
        const renamed = await fs.renameViaTemp(joinRel(dir, actual.name), file.rel);
        if (renamed.kind !== 'ok') return false;
        const after = await fs.listEntries(dir);
        return after.kind === 'ok' && after.entries.some(entry => entry.name === base);
    }

    /**
     * 固定ファイルを削除する。シンボリックリンクはリンク自体だけを消す。
     * リンクの削除、共有のファイル、有効なファイルの移動は、確認されるまで何も消さない。
     */
    async deleteFixedFile(
        env: AgentEnvironment,
        sectionId: string,
        fileKey: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const found = this.fixedFileOf(sectionId, fileKey);
        if (!found || typeof baseRevision !== 'string') return { ok: false, message: 'invalid-input' };
        try {
            const fs = this.fsFor(env);
            const target = await this.resolveFixedFile(fs, found.file);
            const warnings = await this.fixedDeleteWarnings(fs, found.section, found.file, target);
            if (warnings.length > 0 && !confirmedWarnings) {
                return { ok: false, message: 'needs-confirmation', warnings };
            }
            const removed = await fs.deleteStrict(target.realRel, baseRevision);
            switch (removed.kind) {
                case 'removed':
                case 'missing':
                    return { ok: true, revision: MISSING_REVISION };
                case 'conflict':
                    return conflictOf(await fs.readTextStrict(target.realRel));
                default:
                    return { ok: false, message: 'write-failed', detail: removed.code };
            }
        } catch (error) {
            return failedWrite(error);
        }
    }

    private async fixedDeleteWarnings(
        fs: HomeFs,
        section: FixedFileSetSectionSpec,
        file: FixedFileSpec,
        target: FixedFileTarget
    ): Promise<string[]> {
        const warnings: string[] = [];
        const read = await fs.readTextStrict(target.realRel);
        if (read.kind === 'dangling-link' || (read.kind === 'ok' && read.isLink)) warnings.push('delete-link-only');
        if (section.sharedWarningKey) warnings.push('delete-shared-file');
        if (section.effective === 'firstNonEmpty') {
            const next = await this.nextEffectiveKey(fs, section, file);
            if (next) warnings.push(`delete-effective-moves:${next}`);
        }
        return warnings;
    }

    /** file が有効なファイルのとき、削除すると有効になるファイルの key を返す。 */
    private async nextEffectiveKey(
        fs: HomeFs,
        section: FixedFileSetSectionSpec,
        file: FixedFileSpec
    ): Promise<string | null> {
        const listings = new Map<string, Promise<ListedTree>>();
        const targets = await Promise.all(section.files.map(item => this.resolveFixedFile(fs, item, listings)));
        const reads = await fs.readTextStrictMany(targets.map(target => target.realRel));
        const nonEmpty = section.files.filter((_, index) => {
            const read = reads.get(targets[index].realRel);
            return read?.kind === 'ok' && (!read.utf8Clean || read.text.trim() !== '');
        });
        return nonEmpty[0]?.key === file.key && nonEmpty[1] ? nonEmpty[1].key : null;
    }

    /**
     * 大文字小文字だけ違う別ファイルを正式名のファイルへ統合する。読み込み順に合わせて別ファイルの内容を先に置く。
     * 正式名のファイルへ書いてから別ファイルを消す。別ファイルを読めなければ何も変えない。
     * 統合する内容が無ければ正式名のファイルへ書かず、確認のうえ別ファイルだけを消す。
     */
    async mergeFixedFileVariants(
        env: AgentEnvironment,
        sectionId: string,
        fileKey: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const found = this.fixedFileOf(sectionId, fileKey);
        if (!found || typeof baseRevision !== 'string') return { ok: false, message: 'invalid-input' };
        try {
            const fs = this.fsFor(env);
            const { file } = found;
            const target = await this.resolveFixedFile(fs, file);
            const dir = dirOf(file.rel);
            const canonicalExists = target.realRel === file.rel;
            const variantRels = [
                ...(canonicalExists ? [] : [target.realRel]),
                ...target.variants.map(name => joinRel(dir, name)),
            ];
            if (target.variants.length === 0) return { ok: false, message: 'not-found' };

            const shownRead = await fs.readTextStrict(target.realRel);
            if (revisionOfRead(shownRead) !== baseRevision) return conflictOf(shownRead);
            const canonicalRead = canonicalExists ? shownRead : await fs.readTextStrict(file.rel);
            const blocked = readFailure(canonicalRead);
            if (blocked) return blocked;
            const canonicalRevision = canonicalRead.kind === 'ok' ? canonicalRead.revision : MISSING_REVISION;

            const variantReads = await fs.readTextStrictMany(variantRels);
            const pieces: string[] = [];
            const variantRevisions = new Map<string, string>();
            for (const rel of variantRels) {
                const read = variantReads.get(rel) as StrictRead;
                if (read.kind !== 'ok' || read.isLink || !read.utf8Clean) {
                    return { ok: false, message: 'unsupported-form', detail: baseOf(rel) };
                }
                pieces.push(read.text);
                variantRevisions.set(rel, read.revision);
            }
            if (!confirmedWarnings) {
                return { ok: false, message: 'needs-confirmation', warnings: ['merge-changes-load-order'] };
            }
            const eol = canonicalRead.kind === 'ok' ? canonicalRead.eol : '\n';
            if (canonicalRead.kind === 'ok') pieces.push(canonicalRead.text);
            const merged = mergeTexts(pieces, eol);
            let revision = canonicalRevision;
            if (merged !== '') {
                const hadBom = bomAfterSave(file.rel, canonicalRead.kind === 'ok' && canonicalRead.hadBom);
                const write = await fs.writeTextAtomic(file.rel, withBom(merged, hadBom), {
                    expectedRevision: canonicalRevision,
                });
                if (write.kind !== 'ok') return await resultOfWrite(fs, file.rel, write, []);
                revision = write.revision;
            }
            const left: string[] = [];
            for (const rel of variantRels) {
                const removed = await fs.deleteStrict(rel, variantRevisions.get(rel));
                if (removed.kind !== 'removed') left.push(`variant-not-removed:${baseOf(rel)}`);
            }
            return { ok: true, revision, ...(left.length > 0 ? { warnings: left } : {}) };
        } catch (error) {
            return failedWrite(error);
        }
    }

    // ------------------------------------------------------------
    // hook の一覧と切り替え
    // ------------------------------------------------------------

    private collectionById(id: string): FileCollectionSpec | undefined {
        for (const section of this.sections.values()) {
            if (section.kind === 'fileCollection' && section.collection.id === id) return section.collection;
        }
        return undefined;
    }

    /** 読み取り元を列挙する。ファイルはまだ読まない。 */
    private async pendingHookDocuments(
        fs: HomeFs,
        section: HookOverviewSectionSpec
    ): Promise<(PendingHookDocument | HookDocument)[]> {
        const pending: (PendingHookDocument | HookDocument)[] = [];
        for (const source of section.sources) {
            if ('doc' in source) {
                const { rel, format } = await this.docOf(fs, source.doc);
                const target: HookTarget = {
                    sourceId: `doc:${source.doc}`,
                    rel,
                    format,
                    path: source.path,
                    excludePaths: source.excludePaths,
                    naming: source.naming,
                    entryValidator: source.entryValidator,
                    fileValidator: source.fileValidator,
                };
                pending.push({
                    rel,
                    target,
                    make: text => ({
                        label: rel,
                        dir: dirOf(rel),
                        format,
                        path: source.path,
                        excludePaths: source.excludePaths,
                        text,
                        naming: source.naming,
                        sourceId: target.sourceId,
                        repairable: source.doc !== this.spec.settingsDoc,
                    }),
                });
            } else if ('collection' in source) {
                pending.push(...(await this.collectionDocuments(fs, source)));
            } else {
                pending.push(...(await this.registryDocuments(fs, section, source.registry, source.path)));
            }
        }
        return pending;
    }

    /** 一覧のうち CLI が読み込むファイルを、名前の順の hook の文書にする。シンボリックリンクのファイルは編集しない。 */
    private async collectionDocuments(
        fs: HomeFs,
        source: Extract<HookOverviewSectionSpec['sources'][number], { collection: FileCollectionSpec }>
    ): Promise<(PendingHookDocument | HookDocument)[]> {
        const { collection: spec, path, naming } = source;
        const listing = await fs.listEntries(spec.rootRel);
        if (listing.kind === 'missing' || listing.kind === 'dangling-link') return [];
        if (listing.kind === 'error') {
            return [hookDocumentOf(spec.rootRel, spec.rootRel, path, null, naming, false)];
        }
        return listing.entries
            .filter((entry: ListedEntry) => isLoadedEntry(spec, entry))
            .map((entry: ListedEntry) => {
                const rel = `${spec.rootRel}/${entry.relPath}`;
                const sourceId = `file:${entry.relPath}`;
                const target: HookTarget | undefined = entry.isLink
                    ? undefined
                    : {
                          sourceId,
                          rel,
                          format: 'json',
                          path,
                          naming,
                          fileName: entry.name,
                          entryValidator: source.entryValidator,
                          fileValidator: source.fileValidator,
                      };
                return {
                    rel,
                    ...(target ? { target } : {}),
                    make: (text: string | null) => ({
                        ...hookDocumentOf(rel, spec.rootRel, path, text, naming, false),
                        ...(target ? { sourceId, repairable: true } : { linked: true }),
                    }),
                };
            });
    }

    /** 読み取り元のファイルをまとめて読み、hook の文書と追加先を返す。行の source は見分けられる最小の名前にする。 */
    private async hookSources(
        fs: HomeFs,
        section: HookOverviewSectionSpec
    ): Promise<{ documents: HookDocument[]; addTargets: HookAddTarget[] }> {
        const pending = await this.pendingHookDocuments(fs, section);
        const rels = pending.flatMap(item => ('make' in item ? [item.rel] : []));
        const reads = await fs.readTextStrictMany(rels);
        const names = pending.map(item => ('make' in item ? item.rel : item.label));
        const labels = shortestDistinctPaths(names);
        const documents: HookDocument[] = [];
        const addTargets: HookAddTarget[] = [];
        pending.forEach((item, index) => {
            const label = labels[index];
            if (!('make' in item)) {
                documents.push({ ...item, label });
                return;
            }
            const read = reads.get(item.rel);
            const text = read?.kind === 'ok' && read.utf8Clean ? read.text : null;
            const addable = read?.kind === 'missing' || text !== null;
            if (item.target && addable) {
                const info = additionInfoOf(text ?? '', hookScopeOf(section, item.target));
                if (info) addTargets.push({ source: item.target.sourceId, label, ...info });
            }
            if (read?.kind === 'missing') return;
            const revision = read?.kind === 'ok' ? read.revision : undefined;
            documents.push({ ...item.make(text), label, ...(revision !== undefined ? { revision } : {}) });
        });
        // 文書の読み取り元を先に並べる。
        addTargets.sort((a, b) => Number(a.source.startsWith('file:')) - Number(b.source.startsWith('file:')));
        return { documents, addTargets };
    }

    /** 読み取り元のファイルをまとめて読み、hook の文書にする。 */
    private async hookDocuments(fs: HomeFs, section: HookOverviewSectionSpec): Promise<HookDocument[]> {
        return (await this.hookSources(fs, section)).documents;
    }

    /** 編集できる読み取り元を ID から探す。一覧のファイルは今の一覧にあるものだけを受け付ける。 */
    private async hookTargetOf(
        fs: HomeFs,
        section: HookOverviewSectionSpec,
        sourceId: string
    ): Promise<HookTarget | null> {
        for (const item of await this.pendingHookDocuments(fs, section)) {
            if ('make' in item && item.target?.sourceId === sourceId) return item.target;
        }
        return null;
    }

    /**
     * 登録簿の行が指すファイルを hook の文書にする。読み取り表示だけで、エージェントのフォルダの外は読まない。
     * 一覧の読み取り元と重なるパスは飛ばす。ディレクトリは直下の .json を読む。
     */
    private async registryDocuments(
        fs: HomeFs,
        section: HookOverviewSectionSpec,
        registry: string,
        path: string[] | null
    ): Promise<(PendingHookDocument | HookDocument)[]> {
        const read = await fs.readTextStrict(registry);
        if (read.kind === 'missing') return [];
        if (read.kind !== 'ok' || !read.utf8Clean) return [customDocument(registry, null, path)];
        const home = await fs.displayPath('');
        const agentDir = dirOf(registry);
        const loadedRoots = section.sources.flatMap(source =>
            'collection' in source ? [source.collection.rootRel] : []
        );
        const items: (PendingHookDocument | HookDocument)[] = [];
        for (const line of read.text.split(/\r?\n/)) {
            const target = line.trim();
            if (!isAbsoluteRegistryPath(target)) continue;
            const rel = homeRelativeOf(target, home);
            if (rel === null || !rel.startsWith(`${agentDir}/`)) {
                items.push(customDocument(target, null, path));
                continue;
            }
            if (loadedRoots.some(root => rel === root || rel.startsWith(`${root}/`))) continue;
            const listing = await fs.listEntries(rel);
            if (listing.kind === 'ok') {
                const names = listing.entries
                    .filter(
                        (entry: ListedEntry) =>
                            entry.kind !== 'dir' && entry.name.endsWith('.json') && !entry.name.startsWith('.')
                    )
                    .map((entry: ListedEntry) => entry.name);
                for (const name of names) {
                    const child = `${rel}/${name}`;
                    items.push({ rel: child, make: text => customDocument(child, text, path) });
                }
            } else {
                items.push({ rel, make: text => customDocument(rel, text, path) });
            }
        }
        return items;
    }

    private async readHookOverview(fs: HomeFs, section: HookOverviewSectionSpec): Promise<ProfileSectionData> {
        const { documents, addTargets } = await this.hookSources(fs, section);
        const naming = section.hookNaming;
        if (!naming) {
            const rows = analyzeHookDocuments(section, documents, null).map(entry => entry.row);
            return { kind: 'hookOverview', rows, addTargets };
        }
        const read = await fs.readTextStrict(naming.disableListRel);
        const readable = read.kind === 'missing' || (read.kind === 'ok' && read.utf8Clean);
        const disabled = readable ? parseDisabledHookNames(read.kind === 'ok' ? read.text : '') : null;
        const rows = analyzeHookDocuments(section, documents, disabled).map(entry => entry.row);
        const disableList: HookDisableListData = {
            state: read.kind === 'missing' ? 'missing' : readable ? 'ok' : 'unreadable',
            revision: readable ? (revisionOfRead(read) ?? '') : '',
        };
        return { kind: 'hookOverview', rows, disableList, addTargets };
    }

    /** 行の 1 件の内容を JSON のテキストで返す。 */
    async readHookEntry(env: AgentEnvironment, sectionId: string, locator: HookEntryLocator): Promise<HookEntryRead> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (!section || !isHookEntryLocator(locator)) return { ok: false, message: 'invalid-input' };
        try {
            const fs = this.fsFor(env);
            const target = await this.hookTargetOf(fs, section, locator.source);
            if (!target) return { ok: false, message: 'not-found' };
            const snapshot = await this.snapshotOfFile(fs, target.rel, target.format);
            return {
                ok: true,
                text: readHookEntryText(snapshot.text, hookScopeOf(section, target), locator),
                revision: snapshot.fileRevision,
                displayPath: await fs.displayPath(target.rel),
            };
        } catch (error) {
            return failedHookRead(error);
        }
    }

    /** 形の崩れたフックファイルの全体を読む。設定ファイル本体は対象にしない。 */
    async readHookSourceFile(env: AgentEnvironment, sectionId: string, source: string): Promise<HookEntryRead> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (!section || typeof source !== 'string') return { ok: false, message: 'invalid-input' };
        try {
            const fs = this.fsFor(env);
            const target = await this.hookRepairTargetOf(fs, section, source);
            if (!target) return { ok: false, message: 'not-found' };
            const snapshot = await this.snapshotOfFile(fs, target.rel, target.format);
            return {
                ok: true,
                text: snapshot.text,
                revision: snapshot.fileRevision,
                displayPath: await fs.displayPath(target.rel),
            };
        } catch (error) {
            return failedHookRead(error);
        }
    }

    /** フックファイルの全体を保存する。JSON として読めない内容は保存しない。 */
    async saveHookSourceFile(
        env: AgentEnvironment,
        sectionId: string,
        source: string,
        text: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (!section || typeof source !== 'string' || typeof text !== 'string' || typeof baseRevision !== 'string') {
            return { ok: false, message: 'invalid-input' };
        }
        try {
            const fs = this.fsFor(env);
            const target = await this.hookRepairTargetOf(fs, section, source);
            if (!target) return { ok: false, message: 'not-found' };
            return await this.applyEdit(
                fs,
                () => this.snapshotOfFile(fs, target.rel, target.format),
                confirmedWarnings,
                snapshot => {
                    if (snapshot.fileRevision !== baseRevision) {
                        return {
                            ok: false,
                            message: 'conflict',
                            current: { text: null, revision: snapshot.fileRevision },
                        };
                    }
                    const next = normalizeEditedText(text, snapshot.read.kind === 'ok' ? snapshot.read.eol : '\n');
                    if (!isStrictJson(next)) {
                        return { ok: false, message: 'invalid-input', detail: 'json-invalid', warnings: [] };
                    }
                    const validation = runProfileValidator(target.fileValidator, { text: next });
                    if (validation.errors.length > 0) {
                        return {
                            ok: false,
                            message: 'invalid-input',
                            detail: validation.errors.join(','),
                            warnings: validation.warnings,
                        };
                    }
                    return { next, warnings: validation.warnings };
                }
            );
        } catch (error) {
            return failedWrite(error);
        }
    }

    /** 全体を編集できる読み取り元を探す。設定ファイル本体と JSON 以外は対象にしない。 */
    private async hookRepairTargetOf(
        fs: HomeFs,
        section: HookOverviewSectionSpec,
        sourceId: string
    ): Promise<HookTarget | null> {
        if (sourceId === `doc:${this.spec.settingsDoc}`) return null;
        const target = await this.hookTargetOf(fs, section, sourceId);
        return target?.format === 'json' ? target : null;
    }

    /** イベントに合わせた追加の雛形を JSON のテキストで返す。 */
    async readHookTemplate(
        env: AgentEnvironment,
        sectionId: string,
        addition: HookEntryAddition
    ): Promise<HookEntryRead> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (!section || !isValidAddition(section, addition)) return { ok: false, message: 'invalid-input' };
        try {
            const fs = this.fsFor(env);
            const target = await this.hookTargetOf(fs, section, addition.source);
            if (!target) return { ok: false, message: 'not-found' };
            const snapshot = await this.snapshotOfFile(fs, target.rel, target.format);
            return {
                ok: true,
                text: hookEntryTemplate(section.matcherEvents.includes(addition.event)),
                revision: snapshot.fileRevision,
                displayPath: await fs.displayPath(target.rel),
            };
        } catch (error) {
            return failedHookRead(error);
        }
    }

    /**
     * 行の 1 件を JSON のテキストの内容で置き換える。hooks 以外のキーが同じならグループの中で置き換え、
     * 違えばハンドラをグループから取り出して同じ位置に新しいグループを入れる。
     */
    async saveHookEntry(
        env: AgentEnvironment,
        sectionId: string,
        locator: HookEntryLocator,
        text: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (!section || !isHookEntryLocator(locator) || typeof text !== 'string' || typeof baseRevision !== 'string') {
            return { ok: false, message: 'invalid-input' };
        }
        try {
            const part = parseHookEntryText(normalizeEditedText(text, '\n'));
            const change: HookEntryChange = { kind: 'replace', locator, part };
            return await this.applyHookChange(env, section, locator.source, baseRevision, confirmedWarnings, change);
        } catch (error) {
            return failedWrite(error);
        }
    }

    /** イベントの配列の末尾へ 1 件を追加する。キーが無ければ作る。同じイベントのキーが別の書き方であれば、そのキーへ加える。 */
    async addHookEntry(
        env: AgentEnvironment,
        sectionId: string,
        addition: HookEntryAddition,
        text: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (
            !section ||
            !isValidAddition(section, addition) ||
            typeof text !== 'string' ||
            typeof baseRevision !== 'string'
        ) {
            return { ok: false, message: 'invalid-input' };
        }
        try {
            const part = parseHookEntryText(normalizeEditedText(text, '\n'));
            const flat =
                section.parser === 'agyNamed' &&
                !section.matcherEvents.includes(addition.event) &&
                Object.keys(part.groupKeys).length === 0;
            const change: HookEntryChange = { kind: 'add', addition, key: addition.event, flat, part };
            return await this.applyHookChange(env, section, addition.source, baseRevision, confirmedWarnings, change);
        } catch (error) {
            return failedWrite(error);
        }
    }

    /** 行の 1 件を削除する。空になったグループとキーも取り除く。confirmedWarnings が無ければ確認の内容だけを返す。 */
    async deleteHookEntry(
        env: AgentEnvironment,
        sectionId: string,
        locator: HookEntryLocator,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (!section || !isHookEntryLocator(locator) || typeof baseRevision !== 'string') {
            return { ok: false, message: 'invalid-input' };
        }
        const change: HookEntryChange = { kind: 'delete', locator };
        return this.applyHookChange(env, section, locator.source, baseRevision, confirmedWarnings, change);
    }

    /**
     * hook の 1 件の変更を読み取り元へ書き込み、位置がずれた名前を無効化の行へ反映する。
     * 無効化の行のファイルを読めなければ、名前が変わる変更はしない。
     */
    private async applyHookChange(
        env: AgentEnvironment,
        section: HookOverviewSectionSpec,
        sourceId: string,
        baseRevision: string,
        confirmedWarnings: boolean,
        change: HookEntryChange
    ): Promise<ProfileWriteResult> {
        try {
            const fs = this.fsFor(env);
            const target = await this.hookTargetOf(fs, section, sourceId);
            if (!target) return { ok: false, message: 'not-found' };
            const scope = hookScopeOf(section, target);
            const naming = target.naming ? section.hookNaming : undefined;
            if (naming && change.kind !== 'add') {
                const blocked = readFailure(await fs.readTextStrict(naming.disableListRel));
                if (blocked) return blocked;
            }
            const stateEntries = await this.hookStateEntries(fs, section, target);
            let renames = new Map<string, string | null>();
            const result = await this.applyEdit(
                fs,
                () => this.snapshotOfFile(fs, target.rel, target.format),
                confirmedWarnings,
                snapshot => {
                    if (snapshot.fileRevision !== baseRevision) {
                        return {
                            ok: false,
                            message: 'conflict',
                            current: { text: null, revision: snapshot.fileRevision },
                        };
                    }
                    const resolved = resolveAddedEvent(change, snapshot.text, scope, section);
                    const edit = applyHookEntryChange(snapshot.text, scope, resolved);
                    if (naming) renames = hookNameRenames(section, target, snapshot.text, resolved, edit);
                    const validation = validateHookChange(target, scope, resolved, edit);
                    if (validation.errors.length > 0) {
                        return {
                            ok: false,
                            message: 'invalid-input',
                            detail: validation.errors.join(','),
                            warnings: validation.warnings,
                        };
                    }
                    return {
                        next: edit.next,
                        warnings: [
                            ...validation.warnings,
                            ...hookCommentWarnings(target, snapshot.text, edit.next),
                            ...hookStateWarnings(stateEntries, resolved, edit),
                        ],
                        confirmAlways: change.kind === 'delete',
                    };
                }
            );
            if (!result.ok || !naming || renames.size === 0) return result;
            const notes = await this.renameDisabledHooks(fs, naming.disableListRel, renames);
            return notes.length > 0 ? { ...result, warnings: [...(result.warnings ?? []), ...notes] } : result;
        } catch (error) {
            return failedWrite(error);
        }
    }

    /** 無効化の行の名前を変える。ファイルが変わっていれば読み直す。変えられなければ警告を返す。 */
    private async renameDisabledHooks(
        fs: HomeFs,
        rel: string,
        renames: ReadonlyMap<string, string | null>
    ): Promise<string[]> {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const read = await fs.readTextStrict(rel);
            if (read.kind === 'missing') return [];
            if (read.kind !== 'ok' || !read.utf8Clean) break;
            const next = renameDisabledHookLines(read.text, renames);
            if (next === read.text) return [];
            const write = await fs.writeTextAtomic(rel, withBom(next, read.hadBom), {
                expectedRevision: read.revision,
            });
            if (write.kind === 'ok') return [];
            if (write.kind !== 'conflict') break;
        }
        return ['hook-disabled-list-not-updated'];
    }

    /** 位置を含むキーで hook を指す記録のうち、読み取り元のものを位置にして返す。読めなければ空。 */
    private async hookStateEntries(
        fs: HomeFs,
        section: HookOverviewSectionSpec,
        target: HookTarget
    ): Promise<HookStatePosition[]> {
        const state = section.hookState;
        if (!state) return [];
        try {
            const snapshot = await this.snapshotOf(fs, state.doc);
            const table = getPath(parseDocModel(snapshot.format, snapshot.text), state.path);
            if (!isPlainTable(table)) return [];
            const owner = comparablePath(await fs.displayPath(target.rel));
            return Object.keys(table).flatMap(key => {
                const match = HOOK_STATE_KEY.exec(key);
                if (!match || comparablePath(match[1]) !== owner) return [];
                return [{ eventLabel: match[2], group: Number(match[3]), handler: Number(match[4]) }];
            });
        } catch {
            return [];
        }
    }

    /**
     * 名前の付いた hook の無効化の行を切り替える。コメントと未知の行は残す。無効化の行のファイルを読めなければ切り替えない。
     * 他のコピーに及ぶ切り替えは、相手の名前を警告で返し、確認されるまで何も変えない。
     */
    async setHookEnabled(
        env: AgentEnvironment,
        sectionId: string,
        hookName: string,
        enabled: boolean,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.sectionOf(sectionId, 'hookOverview');
        if (!section || typeof hookName !== 'string' || typeof enabled !== 'boolean') {
            return { ok: false, message: 'invalid-input' };
        }
        const naming = section.hookNaming;
        if (!naming) return { ok: false, message: 'unsupported-form' };
        try {
            const fs = this.fsFor(env);
            const rel = naming.disableListRel;
            const read = await fs.readTextStrict(rel);
            const blocked = readFailure(read);
            if (blocked) return blocked;
            const current = read.kind === 'ok' ? read.revision : MISSING_REVISION;
            if (current !== baseRevision) return conflictOf(read);
            const text = read.kind === 'ok' ? read.text : '';
            const disabled = parseDisabledHookNames(text);
            const documents = await this.hookDocuments(fs, section);
            const rows: AnalyzedHookRow[] = analyzeHookDocuments(section, documents, disabled);
            const plan = planHookToggle(rows, disabled, hookName, enabled);
            if (!plan) return { ok: false, message: 'not-found' };
            if (plan.warnings.length > 0 && !confirmedWarnings) {
                return { ok: false, message: 'needs-confirmation', warnings: plan.warnings };
            }
            const notes = plan.warnings.length > 0 ? { warnings: plan.warnings } : {};
            const next = editDisabledHookLines(text, plan, read.kind === 'ok' ? read.eol : '\n');
            if (next === text) return { ok: true, revision: current, ...notes };
            const hadBom = read.kind === 'ok' && read.hadBom;
            const write = await fs.writeTextAtomic(rel, withBom(next, hadBom), { expectedRevision: current });
            return await resultOfWrite(fs, rel, write, plan.warnings);
        } catch (error) {
            return failedWrite(error);
        }
    }

    // ------------------------------------------------------------
    // ファイル一覧
    // ------------------------------------------------------------

    private collectionSection(sectionId: unknown): FileCollectionSectionSpec | null {
        return this.sectionOf(sectionId, 'fileCollection');
    }

    /** 一覧の操作を実行する。例外は本文を含み得るのでコードにする。 */
    private async runCollectionOp<T extends { ok: boolean; message?: string }>(
        sectionId: unknown,
        run: (collection: FileCollectionSpec) => Promise<T>
    ): Promise<T> {
        const section = this.collectionSection(sectionId);
        if (!section) return { ok: false, message: 'invalid-input' } as T;
        try {
            return await run(section.collection);
        } catch (error) {
            console.error(`A collection operation failed (${section.id}): ${codeOf(error, 'EUNKNOWN')}`);
            return { ok: false, message: 'operation-failed' } as T;
        }
    }

    async listCollection(env: AgentEnvironment, sectionId: string): Promise<FileCollectionReport> {
        const failed: FileCollectionReport = {
            displayRoot: '',
            rootMissing: false,
            entries: [],
            truncated: false,
            incomplete: true,
            capabilities: { zip: false, reveal: false },
        };
        const section = this.collectionSection(sectionId);
        if (!section) return failed;
        try {
            return await this.collectionReport(env, this.fsFor(env), section.collection);
        } catch {
            return failed;
        }
    }

    async readEntry(env: AgentEnvironment, sectionId: string, relPath: string): Promise<ProfileFileData> {
        const section = this.collectionSection(sectionId);
        if (!section) return { state: 'error', code: 'invalid-input', displayPath: '' };
        try {
            return await this.collections.readEntry(env, section.collection, relPath);
        } catch (error) {
            return { state: 'error', code: codeOf(error, 'EUNKNOWN'), displayPath: '' };
        }
    }

    async saveEntry(
        env: AgentEnvironment,
        sectionId: string,
        relPath: string,
        text: string,
        baseRevision: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.collectionSection(sectionId);
        if (!section) return { ok: false, message: 'invalid-input' };
        return this.collections.saveEntry(env, section.collection, relPath, text, baseRevision, confirmedWarnings);
    }

    async createEntry(
        env: AgentEnvironment,
        sectionId: string,
        relPath: string,
        text: string,
        confirmedWarnings = false
    ): Promise<ProfileWriteResult> {
        const section = this.collectionSection(sectionId);
        if (!section) return { ok: false, message: 'invalid-input' };
        return this.collections.createEntry(env, section.collection, relPath, text, confirmedWarnings);
    }

    async deleteEntries(
        env: AgentEnvironment,
        sectionId: string,
        relPaths: string[],
        confirmedWarnings = false
    ): Promise<ProfileCollectionResult> {
        return this.runCollectionOp(sectionId, collection =>
            this.collections.deleteEntries(env, collection, relPaths, confirmedWarnings)
        );
    }

    async revealEntry(env: AgentEnvironment, sectionId: string, relPath: string): Promise<AssetOpResult> {
        return this.runCollectionOp(sectionId, collection => this.collections.reveal(env, collection, relPath));
    }

    async download(
        env: AgentEnvironment,
        sectionId: string,
        relPaths: string[],
        window: BrowserWindow | null
    ): Promise<AssetOpResult> {
        return this.runCollectionOp(sectionId, collection =>
            this.collections.download(env, collection, relPaths, window)
        );
    }

    async inspectUpload(
        env: AgentEnvironment,
        sectionId: string,
        window: BrowserWindow | null
    ): Promise<ProfileCollectionResult> {
        return this.runCollectionOp(sectionId, collection => this.collections.inspectUpload(env, collection, window));
    }

    async upload(
        env: AgentEnvironment,
        sectionId: string,
        srcPath: string,
        overwrite: boolean,
        confirmedWarnings = false
    ): Promise<ProfileCollectionResult> {
        return this.runCollectionOp(sectionId, collection =>
            this.collections.upload(env, collection, srcPath, overwrite === true, confirmedWarnings)
        );
    }
}

/** hook の読み取り元の中の hooks の位置と形式を返す。 */
function hookScopeOf(section: HookOverviewSectionSpec, target: HookTarget): HookScope {
    return { parser: section.parser, format: target.format, path: target.path, excludePaths: target.excludePaths };
}

/** 追加の指定がタブの定義に合うか。名前付きの形式は hook の名前が要る。 */
function isValidAddition(section: HookOverviewSectionSpec, addition: unknown): addition is HookEntryAddition {
    if (!isHookEntryAddition(addition) || !section.knownEvents.includes(addition.event)) return false;
    return (section.parser === 'agyNamed') === (addition.name !== undefined);
}

/** 追加のイベントのキーを文書の書き方に揃えた変更を返す。 */
function resolveAddedEvent(
    change: HookEntryChange,
    text: string,
    scope: HookScope,
    section: HookOverviewSectionSpec
): HookEntryChange {
    if (change.kind !== 'add' || !section.hookNaming) return change;
    return { ...change, key: eventKeyForAddition(text, scope, change.addition, isSameGrokEvent) };
}

/** 変更で位置が変わる名前と、無くなる名前（null）を返す。 */
function hookNameRenames(
    section: HookOverviewSectionSpec,
    target: HookTarget,
    text: string,
    change: HookEntryChange,
    edit: HookEntryEditResult
): Map<string, string | null> {
    const renames = new Map<string, string | null>();
    if (change.kind === 'add') return renames;
    const stem = target.fileName === undefined ? undefined : stemOfFile(target.fileName);
    const document: HookDocument = {
        label: target.rel,
        dir: dirOf(target.rel),
        format: target.format,
        path: target.path,
        excludePaths: target.excludePaths,
        text,
        naming: target.naming,
        sourceId: target.sourceId,
        ...(stem !== undefined ? { stem } : {}),
    };
    for (const { row } of analyzeHookDocuments(section, [document], null)) {
        const { hookName, locator } = row;
        if (hookName === undefined || locator?.handler == null || locator.event !== edit.eventKey) continue;
        const moved = edit.positionAfter(locator.group, locator.handler);
        if (moved === null) renames.set(hookName, null);
        else if (moved.group !== locator.group || moved.handler !== locator.handler) {
            renames.set(hookName, renumberedHookName(hookName, moved.group, moved.handler as number));
        }
    }
    return renames;
}

/** 編集する 1 件と編集後のファイルを検証する。 */
function validateHookChange(
    target: HookTarget,
    scope: HookScope,
    change: HookEntryChange,
    edit: HookEntryEditResult
): { errors: string[]; warnings: string[] } {
    if (change.kind === 'delete') return { errors: [], warnings: [] };
    const entry = runProfileValidator(
        target.entryValidator,
        hookEntryValidationInput(target, scope, change.part, edit)
    );
    // ファイル全体の検証は、厳密な JSON として読めるファイルだけが対象。
    const file = isStrictJson(edit.next)
        ? runProfileValidator(target.fileValidator, { text: edit.next })
        : { errors: [], warnings: [] };
    return { errors: [...entry.errors, ...file.errors], warnings: [...entry.warnings, ...file.warnings] };
}

/** 編集する 1 件を検証の入力にする。TOML の読み取り元は TOML の断片、JSON の読み取り元は JSON にする。 */
function hookEntryValidationInput(
    target: HookTarget,
    scope: HookScope,
    part: HookEntryPart,
    edit: HookEntryEditResult
): { text: string; fileName?: string } {
    const group = { ...part.groupKeys, hooks: part.handlers };
    if (target.format === 'toml') {
        return { text: renderTomlArrayItem([...(scope.path ?? []), edit.eventKey], group) };
    }
    return {
        text: JSON.stringify({ hooks: { [edit.eventKey]: [group] } }),
        ...(target.fileName !== undefined ? { fileName: target.fileName } : {}),
    };
}

function isStrictJson(text: string): boolean {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

/** TOML の編集で失われるコメントがあれば警告を返す。 */
function hookCommentWarnings(target: HookTarget, before: string, after: string): string[] {
    if (target.format !== 'toml') return [];
    const lost = lostTomlComments(before, after);
    return lost.length > 0 ? [`hook-comments-lost:${lost.length}`] : [];
}

/** 位置を含むキーの記録のうち、変更で別の hook に当たる件数があれば警告を返す。 */
function hookStateWarnings(
    entries: readonly HookStatePosition[],
    change: HookEntryChange,
    edit: HookEntryEditResult
): string[] {
    if (change.kind === 'add') return [];
    const label = hookEventLabel(edit.eventKey);
    const affected = entries.filter(entry => {
        if (entry.eventLabel !== label) return false;
        const moved = edit.positionAfter(entry.group, entry.handler);
        return moved === null || moved.group !== entry.group || moved.handler !== entry.handler;
    });
    return affected.length > 0 ? [`hook-state-shift:${affected.length}`] : [];
}

/** イベントのキーを記録のキーの書き方（snake_case）にする。 */
function hookEventLabel(event: string): string {
    return event.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/** パスを比較できる形にする。ドライブ文字のあるパスは大文字小文字を区別しない。 */
function comparablePath(path: string): string {
    const unified = path.replace(/\\/g, '/');
    return /^[a-zA-Z]:/.test(unified) ? unified.toLowerCase() : unified;
}

/** ファイル名から最後の拡張子を除く。 */
function stemOfFile(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(0, dot) : name;
}

/** 文字列だけの配列なら返す。それ以外は null。 */
function stringItems(value: unknown): string[] | null {
    return Array.isArray(value) && value.every(item => typeof item === 'string') ? (value as string[]) : null;
}

/** 文書の値を設定する。value が null ならキーを削除する。親のテーブルは残す。 */
function applyPathValue(
    format: ProfileDocFormat,
    text: string,
    path: string[],
    value: string | string[] | null
): string {
    if (format === 'toml') return setTomlValue(text, path, value);
    return editJsonValue(text, path, value === null ? null : JSON.stringify(value, null, 2), value ?? undefined);
}

/** スコープの断片を文書へ適用する。blank ならスコープを削除する。 */
function applyScopedEdit(
    section: ScopedEditorSectionSpec,
    snapshot: DocSnapshot,
    text: string,
    blank: boolean
): string {
    const path = section.path as string[];
    if (snapshot.format === 'toml') {
        const exclude = section.excludePaths ?? [];
        if (section.mode === 'value') return replaceTomlValue(snapshot.text, path, blank ? null : text);
        return replaceTomlTable(snapshot.text, path, blank ? null : normalizeEditedText(text, '\n'), exclude);
    }
    const value = blank ? undefined : parseFragment(snapshot.format, normalizeEditedText(text, '\n'));
    const next = editJsonValue(snapshot.text, path, blank ? null : normalizeEditedText(text, '\n'), value);
    const before = parseJsonDocument(snapshot.text);
    const after = parseJsonDocument(next);
    for (const excluded of section.excludePaths ?? []) {
        if (!strictDeepEqual(getPath(before, excluded), getPath(after, excluded))) {
            throw new ProfileEditFailure('forbidden-subpath');
        }
    }
    return next;
}

/** 厳密な JSON の文書にコメントなどがあり、CLI が読めない可能性があれば警告を返す。 */
function strictDocWarnings(snapshot: DocSnapshot): string[] {
    if (snapshot.format !== 'json' || snapshot.text.trim() === '') return [];
    try {
        JSON.parse(snapshot.text);
        return [];
    } catch {
        return ['existing-not-strict-json'];
    }
}

/** ファイル全体の本文が文書の形式として読めなければ失敗の結果を返す。 */
function wholeDocParseError(format: ProfileDocFormat, text: string): ProfileWriteResult | null {
    try {
        if (format === 'toml') parseToml(text);
        else if (format === 'json') JSON.parse(text);
        else parseJsonc(text);
        return null;
    } catch (error) {
        const line = (error as { line?: unknown }).line;
        const detail =
            typeof line === 'number' ? `line:${line}` : format === 'json' ? jsonLineDetail(error, text) : undefined;
        return { ok: false, message: 'invalid-input', ...(detail ? { detail } : {}) };
    }
}

function hookDocumentOf(
    rel: string,
    rootRel: string,
    path: string[] | null,
    text: string | null,
    naming: HookSourceNaming | undefined,
    custom: boolean
): HookDocument {
    const name = baseOf(rel);
    const dot = name.lastIndexOf('.');
    return {
        label: rel,
        dir: dirOf(rel) || rootRel,
        format: name.toLowerCase().endsWith('.toml') ? 'toml' : 'json',
        path,
        text,
        naming,
        stem: dot > 0 ? name.slice(0, dot) : name,
        custom,
    };
}

function customDocument(label: string, text: string | null, path: string[] | null): HookDocument {
    return hookDocumentOf(label, dirOf(label), path, text, undefined, true);
}

/** 固定ファイルの有効の判定を行に反映する。読めないファイルより後は判定しない。 */
function applyFixedEffective(
    section: FixedFileSetSectionSpec,
    rows: FixedFileRow[],
    targets: FixedFileTarget[],
    reads: ReadonlyMap<string, StrictRead>
): void {
    if (!section.effective) return;
    let found = false;
    for (const [index, row] of rows.entries()) {
        const read = reads.get(targets[index].realRel) as StrictRead;
        if (read.kind === 'error') return;
        const nonEmpty = read.kind === 'ok' && (!read.utf8Clean || read.text.trim() !== '');
        row.effective = section.effective === 'all' ? nonEmpty : nonEmpty && !found;
        if (nonEmpty) found = true;
    }
}

/** 同じ実体を指す行に、相手の key を付ける。 */
function applyFixedAliases(
    rows: FixedFileRow[],
    targets: FixedFileTarget[],
    reads: ReadonlyMap<string, StrictRead>
): void {
    const keysByIdentity = new Map<string, string[]>();
    rows.forEach((row, index) => {
        const read = reads.get(targets[index].realRel);
        if (read?.kind !== 'ok') return;
        keysByIdentity.set(read.identity, [...(keysByIdentity.get(read.identity) ?? []), row.key]);
    });
    for (const keys of keysByIdentity.values()) {
        if (keys.length < 2) continue;
        for (const row of rows) {
            if (keys.includes(row.key)) row.aliasKeys = keys.filter(key => key !== row.key);
        }
    }
}

/** 本文を順に連結する。同じ本文は 1 回だけ入れ、間に空行を置く。 */
function mergeTexts(pieces: readonly string[], eol: '\n' | '\r\n'): string {
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const piece of pieces) {
        const unified = normalizeEditedText(piece, eol).replace(/\s+$/, '');
        if (unified === '' || seen.has(unified)) continue;
        seen.add(unified);
        parts.push(unified);
    }
    return parts.length > 0 ? `${parts.join(`${eol}${eol}`)}${eol}` : '';
}
