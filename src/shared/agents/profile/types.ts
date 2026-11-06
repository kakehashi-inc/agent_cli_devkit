// ============================================================
// エージェント別プロファイル設定の共通型
// ------------------------------------------------------------
// section の種類と IPC の形だけを定義する。タブの一覧・ID・構成は
// エージェントごとの定義が持ち、ここには置かない。
// ============================================================
import type { AgentEnvironment, AssetOpResult } from '../types';

// 未作成のファイルを表す revision。
export const MISSING_REVISION = 'missing';
// リンク切れのシンボリックリンクを表す revision。
export const DANGLING_LINK_REVISION = 'dangling-link';

// ============================================================
// 仕様（エージェントごとの定義が組み立てる純データ）
// ============================================================

export type ProfileDocFormat = 'json' | 'jsonc' | 'toml';

// 論理文書。タブ間の再読込の単位。rel はホームからの相対パス。
// resolver は実行時に相対パスを決める処理の名前（候補が複数ある設定ファイルなど）。
export type ProfileDocRef = { format: ProfileDocFormat; rel: string } | { format: ProfileDocFormat; resolver: string };

// main 側に登録された検証処理の名前。
export type ProfileValidatorId = string;
// main 側に登録された表示名の算出処理の名前。
export type ProfileNameRuleId = string;

export interface AgentProfileSpec {
    agentId: string;
    docs: Record<string, ProfileDocRef>;
    // 設定タブが編集する文書の ID。
    settingsDoc: string;
    // 設定画面のタブ。定義したタブはファイルが 0 件でも表示する。
    settingsTabs: ProfileTabSpec[];
    // エージェント・スキル画面に追加するタブ。
    assetTabs: ProfileTabSpec[];
}

export interface ProfileTabSpec {
    id: string;
    sections: ProfileSectionSpec[];
}

// 条件付きの注記の条件。
export type ProfileNoticeCondition =
    // 文書の path に値がある。
    | { kind: 'docPath'; doc: string; path: string[] }
    // rels のファイルがすべてある（ホームからの相対パス）。
    | { kind: 'filesExist'; rels: string[] }
    // 文書の path の表のキーのうち、一覧のファイルに同じ名前があるものがある。
    | { kind: 'keysShadowedByCollections'; doc: string; path: string[]; collections: string[] };

export interface ProfileConditionalNotice {
    key: string;
    when: ProfileNoticeCondition;
}

interface ProfileSectionBase {
    id: string;
    // 見出しのキー。無ければ見出しを出さない。
    titleKey?: string;
    // 条件を満たすときだけ出す注記。
    conditionalNotices?: ProfileConditionalNotice[];
}

// 同じ文書に併記しない別の書き方の定義。
export interface ProfileOtherForm {
    // 別の書き方のキーの位置。
    paths: string[][];
    // 別の書き方だけがあり、この部品では編集できないときの注記のキー。
    blockedKey: string;
    // 両方の書き方があるときの注記のキー。
    bothKey: string;
}

// hook の名前の付け方。'user' は設定ファイルの hook、'global' はファイル名を名前に含む hook。
export type HookSourceNaming = 'user' | 'global';

// hook の読み取り元の検証。entryValidator は編集する 1 件の内容、fileValidator は編集後のファイル全体を検証する。
interface HookSourceValidators {
    entryValidator?: ProfileValidatorId;
    fileValidator?: ProfileValidatorId;
}

// hook 一覧の読み取り元。path は文書またはファイル内の hooks の位置で、null はファイル全体。
// naming を持つ読み取り元の hook にだけ名前を付ける。
// collection はフォルダのファイルの一覧で、シンボリックリンクのファイルは読み取り表示する。
// registry は 1 行 1 絶対パスの登録簿（ホームからの相対パス）で、指すファイルの hook を読み取り表示する。
export type HookOverviewSource =
    | ({
          doc: string;
          path: string[] | null;
          excludePaths?: string[][];
          naming?: HookSourceNaming;
      } & HookSourceValidators)
    | ({ collection: FileCollectionSpec; path: string[] | null; naming?: HookSourceNaming } & HookSourceValidators)
    | { registry: string; path: string[] | null };

// 位置を含むキーで hook を指す記録の場所。doc の path の表のキーを照合する。
export interface HookStateSpec {
    doc: string;
    path: string[];
}

// hook に名前を付けて無効化の行で切り替える形式の定義。disableListRel は無効化の行のファイル（ホームからの相対パス）。
export interface HookNamingSpec {
    scheme: 'grok';
    disableListRel: string;
}

export interface HookOverviewSectionSpec extends ProfileSectionBase {
    kind: 'hookOverview';
    parser: 'claudeStyle' | 'agyNamed';
    sources: HookOverviewSource[];
    // 追加できるイベント。
    knownEvents: string[];
    // matcher が効くイベント。追加の雛形の matcher の有無を決める。
    matcherEvents: string[];
    hookNaming?: HookNamingSpec;
    hookState?: HookStateSpec;
    // 保存の通知に添える文のキー。
    savedNoteKey?: string;
}

export interface ScopedEditorSectionSpec extends ProfileSectionBase {
    kind: 'scopedEditor';
    // 編集ダイアログの題名のキー。
    editorTitleKey: string;
    doc: string;
    // null はファイル全体。
    path: string[] | null;
    mode: 'table' | 'value';
    excludePaths?: string[][];
    emptyTemplate?: string;
    validator?: ProfileValidatorId;
    // true なら展開か編集の操作があるまで本文を返さない。
    sensitive?: boolean;
    otherForm?: ProfileOtherForm;
}

export interface CommandFieldSpec {
    key: string;
    path: string[];
    // 入力欄の見出しのキー。無ければ section の見出しだけを出す。
    labelKey?: string;
    suggestions?: string[];
}

export interface CommandFieldsSectionSpec extends ProfileSectionBase {
    kind: 'commandFields';
    doc: string;
    fields: CommandFieldSpec[];
    validator?: ProfileValidatorId;
}

export interface OrderedListSpec {
    key: string;
    path: string[];
    // リストの見出しのキー。無ければ section の見出しだけを出す。
    labelKey?: string;
    itemValidator?: ProfileValidatorId;
    // 全行を消したときの保存内容。'unset' はキーの削除、'emptyArray' は空配列。
    emptyMeans: 'unset' | 'emptyArray';
    suggestions?: string[];
}

export interface OrderedListsSectionSpec extends ProfileSectionBase {
    kind: 'orderedLists';
    doc: string;
    lists: OrderedListSpec[];
    otherForm?: ProfileOtherForm;
}

export interface FixedFileSpec {
    key: string;
    rel: string;
}

export interface FixedFileSetSectionSpec extends ProfileSectionBase {
    kind: 'fixedFileSet';
    files: FixedFileSpec[];
    // 'firstNonEmpty' は先頭の空でないファイルだけが有効、'all' はすべて有効。
    effective?: 'firstNonEmpty' | 'all';
    // 同じ実体を指す名前を 1 行にまとめる。
    aggregateByIdentity?: boolean;
    sharedWarningKey?: string;
}

export interface FileCollectionSpec {
    id: string;
    rootRel: string;
    extensions: string[];
    createExtension: string;
    // CLI が読む深さ。0 は直下のみ。
    maxDepth: number;
    // maxDepth より深いものを「読み込まれない」として一覧に出す深さ。
    scanExtraDepth: number;
    frontmatter: 'yaml' | 'none';
    allowCreate: boolean;
    validator?: ProfileValidatorId;
    // 相対パスごとの削除時の警告キー。
    deleteWarningKeys?: Record<string, string>;
    // 拡張子の大文字小文字が extensions と違うファイルは読み込まれない。
    exactExtensionCase?: boolean;
    // 一覧には出すが読み込まれない拡張子。
    notLoadedExtensions?: string[];
    // パスのどこかがドットで始まるファイルは読み込まれない。
    dotNamesNotLoaded?: boolean;
    // この名前（大文字小文字を区別しない）のファイルがあるフォルダでは、そのファイルだけが読み込まれる。
    exclusiveFolderFile?: string;
    // frontmatter の形が壊れているファイルは読み込まれない。
    invalidFrontmatterNotLoaded?: boolean;
    // main 側に登録された表示名の算出処理の名前。
    nameRule?: ProfileNameRuleId;
    // CLI が読むファイルの名前が決まっている一覧（maxDepth の深さのこの名前のファイルだけが読まれる）。
    fixedFileName?: string;
    // シンボリックリンクは読み込まれない。
    linksNotLoaded?: boolean;
    // 同じ名前のファイルがあると、こちらが隠れる一覧の ID。
    shadowedBy?: string[];
}

export interface FileCollectionSectionSpec extends ProfileSectionBase {
    kind: 'fileCollection';
    collection: FileCollectionSpec;
    // 読み込まれないファイルに出す文言のキー。読み込まれないと断定できない一覧で指定する。
    notLoadedNoteKey?: string;
    // この表示名のファイルに注記を出す（完全一致）。
    displayNameNote?: { names: string[]; noteKey: string };
}

export type ProfileSectionSpec =
    | HookOverviewSectionSpec
    | ScopedEditorSectionSpec
    | CommandFieldsSectionSpec
    | OrderedListsSectionSpec
    | FixedFileSetSectionSpec
    | FileCollectionSectionSpec;

export type ProfileSectionKind = ProfileSectionSpec['kind'];

// ============================================================
// 読み取り結果
// ============================================================

export type ProfileEol = '\n' | '\r\n';

interface ProfileFileBase {
    displayPath: string;
}

// ファイルの読み取り結果。読めない場合を未作成と区別して返す。
export type ProfileFileData =
    | (ProfileFileBase & { state: 'missing'; revision: typeof MISSING_REVISION })
    | (ProfileFileBase & {
          state: 'ok';
          text: string;
          revision: string;
          hadBom: boolean;
          eol: ProfileEol;
          // CRLF と LF が混在している。
          mixedEol: boolean;
          isLink: boolean;
          linkTarget?: string;
      })
    | (ProfileFileBase & { state: 'dangling-link'; revision: typeof DANGLING_LINK_REVISION; linkTarget: string })
    | (ProfileFileBase & { state: 'not-utf8'; revision: string; isLink: boolean; linkTarget?: string })
    | (ProfileFileBase & { state: 'error'; code: string });

export type ProfileFileState = ProfileFileData['state'];

// hook の行の位置。source は main が決める読み取り元の ID で、パスを含まない。
// name は名前付きの形式の hook の名前。group はイベントの配列の位置。
// handler はグループの hooks の位置で、イベントの配列に直接書かれたハンドラは null。
export interface HookEntryLocator {
    source: string;
    name?: string;
    event: string;
    group: number;
    handler: number | null;
}

// 追加する hook の位置。
export interface HookEntryAddition {
    source: string;
    name?: string;
    event: string;
}

// 追加先の読み取り元。names は名前付きの形式の既存の hook の名前。
export interface HookAddTarget {
    source: string;
    label: string;
    names?: string[];
}

// hook の 1 件の読み取り結果。text は JSON のテキスト。
export type HookEntryRead =
    | { ok: true; text: string; revision: string; displayPath: string }
    | { ok: false; message: ProfileWriteError; detail?: string };

export interface HookOverviewRow {
    source: string;
    hookName?: string;
    event: string;
    matcher?: string;
    type?: string;
    command?: string;
    timeoutSec?: number;
    // 'maskedByOtherCopy' は別のコピーの無効化で止まっている状態。無効化の概念がない形式では持たない。
    state?: 'enabled' | 'disabled' | 'maskedByOtherCopy';
    // 覆っている無効化の行の名前。
    maskedBy?: string;
    // CLI の登録ではなく利用者が追加した場所の hook。読み取り表示のみ。
    custom?: boolean;
    // シンボリックリンクのファイルの hook。読み取り表示のみ。
    linked?: boolean;
    unknownEvent?: boolean;
    invalid?: boolean;
    // 形の崩れたファイルの全体を編集するときの読み取り元の ID。
    repairSource?: string;
    // 編集と削除ができる行の位置と、読み取り元のファイルの revision。
    locator?: HookEntryLocator;
    revision?: string;
}

// 無効化の行のファイルの状態。unreadable の間は状態を断定せず、切り替えもできない。
export interface HookDisableListData {
    state: 'ok' | 'missing' | 'unreadable';
    revision: string;
}

export interface ScopedEditorData {
    kind: 'scopedEditor';
    present: boolean;
    // sensitive の section で本文を返さないときは null。
    text: string | null;
    withheld: boolean;
    // 表示用に正規形へ組み立てた本文で、保存するとコメントを失う。
    normalized: boolean;
    // スコープの断片の sha256。
    revision: string;
    displayPath: string;
    // 別の書き方が同じ文書にある。
    otherForm?: boolean;
}

export interface CommandFieldData {
    value: string | null;
    // 文字列以外の値が入っているなど、この部品で編集できない。
    unsupported: boolean;
    revision: string;
}

export interface OrderedListData {
    // 未設定は null。
    items: string[] | null;
    // 文字列以外の要素を含むなど、この部品で編集できない。
    unsupported: boolean;
    revision: string;
}

export interface FixedFileRow {
    key: string;
    rel: string;
    displayPath: string;
    state: ProfileFileState;
    revision?: string;
    isLink: boolean;
    linkTarget?: string;
    // 空白を除いて本文がない。
    empty?: boolean;
    // effective の判定結果。
    effective?: boolean;
    // 同じ実体を指す他の行の key。
    aliasKeys?: string[];
    // 大文字小文字だけ違う別ファイルなど、同時に読み込まれている別の実ファイルの名前。
    variants?: string[];
    // 実ファイルの名前が正式名と大文字小文字だけ違うときの実名。保存で正式名になる。
    realName?: string;
}

export interface FileCollectionEntry {
    relPath: string;
    name: string;
    displayName?: string;
    isLink: boolean;
    dangling: boolean;
    readOnly: boolean;
    // CLI が読み込まない場所または名前のファイル。
    notLoaded: boolean;
    size: number;
    mtimeMs: number;
    frontmatter?: Record<string, string>;
    warnings?: string[];
}

export interface FileCollectionReport {
    displayRoot: string;
    rootMissing: boolean;
    entries: FileCollectionEntry[];
    // 深さの上限で打ち切った。
    truncated: boolean;
    // 読み取れなかったディレクトリがある。
    incomplete: boolean;
    capabilities: { zip: boolean; reveal: boolean };
    // たどらなかったディレクトリへのリンク。
    linkedDirs?: string[];
}

// 条件を満たした注記。names は注記に並べる名前。
export interface ProfileActiveNotice {
    key: string;
    names?: string[];
}

export type ProfileSectionData = (
    | { kind: 'hookOverview'; rows: HookOverviewRow[]; disableList?: HookDisableListData; addTargets: HookAddTarget[] }
    | ScopedEditorData
    | { kind: 'commandFields'; values: Record<string, CommandFieldData> }
    | {
          kind: 'orderedLists';
          lists: Record<string, OrderedListData>;
          // 別の書き方が同じ文書にある。
          otherForm?: boolean;
      }
    | { kind: 'fixedFileSet'; files: FixedFileRow[] }
    | { kind: 'fileCollection'; report: FileCollectionReport }
    | {
          kind: 'failed';
          // 不明な sectionId のときは持たない。
          sectionKind?: ProfileSectionKind;
          message: ProfileWriteError;
          detail?: string;
      }
) & { notices?: ProfileActiveNotice[] };

// ============================================================
// 書き込み結果
// ============================================================

export type ProfileWriteError =
    | 'unavailable'
    | 'read-failed'
    | 'not-utf8'
    | 'invalid-existing'
    | 'invalid-input'
    | 'outside-scope'
    | 'forbidden-subpath'
    | 'fragment-needs-header'
    | 'inline-parent'
    | 'unsupported-form'
    | 'verify-failed'
    | 'conflict'
    | 'dangling-link'
    | 'unsafe-path'
    | 'nested-not-allowed'
    | 'empty-content'
    | 'read-only'
    | 'exists'
    | 'not-found'
    | 'write-failed';

// warnings の各要素は警告コードで、`<コード>` または `<コード>:<引数>` の形。
export type ProfileWriteResult =
    | { ok: true; revision: string; warnings?: string[] }
    // 警告があり未確認。confirmedWarnings を付けて再送すると保存する。
    | { ok: false; message: 'needs-confirmation'; warnings: string[] }
    | {
          ok: false;
          message: ProfileWriteError;
          detail?: string;
          warnings?: string[];
          // conflict のときの最新の内容。未作成になっていれば text は null。
          current?: { text: string | null; revision: string };
      };

// ファイル一覧の削除とアップロードの結果。warnings は未確認の警告で、needsConfirmation とともに返す。
// uploadKind は選ばれたファイルの種別で、srcPath はそのファイルの実パス。detail は失敗の対象を示す値。
export interface ProfileCollectionResult extends Omit<AssetOpResult, 'uploadKind'> {
    uploadKind?: 'zip' | 'file';
    needsConfirmation?: boolean;
    warnings?: string[];
    detail?: string;
}

// ============================================================
// IPC API
// ============================================================

export interface ProfileApi {
    getSpec(): Promise<AgentProfileSpec>;
    // options.reveal は sensitive の section の本文を返す要求。
    readSection(env: AgentEnvironment, sectionId: string, options?: { reveal?: boolean }): Promise<ProfileSectionData>;
    saveScoped(
        env: AgentEnvironment,
        sectionId: string,
        text: string,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    // base はキーごとの開いた時点の revision。
    saveCommandFields(
        env: AgentEnvironment,
        sectionId: string,
        values: Record<string, string | null>,
        base: Record<string, string>,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    saveLists(
        env: AgentEnvironment,
        sectionId: string,
        lists: Record<string, string[] | null>,
        base: Record<string, string>,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    readFixedFile(env: AgentEnvironment, sectionId: string, fileKey: string): Promise<ProfileFileData>;
    saveFixedFile(
        env: AgentEnvironment,
        sectionId: string,
        fileKey: string,
        text: string,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    deleteFixedFile(
        env: AgentEnvironment,
        sectionId: string,
        fileKey: string,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    // 大文字小文字だけ違う別ファイルを正式名のファイルへ統合する。
    mergeFixedFileVariants(
        env: AgentEnvironment,
        sectionId: string,
        fileKey: string,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    // hook の無効化の行を切り替える。無効化の概念がない形式では unsupported-form を返す。
    setHookEnabled(
        env: AgentEnvironment,
        sectionId: string,
        hookName: string,
        enabled: boolean,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    // 行の 1 件の内容を JSON のテキストで返す。
    readHookEntry(env: AgentEnvironment, sectionId: string, locator: HookEntryLocator): Promise<HookEntryRead>;
    readHookSourceFile(env: AgentEnvironment, sectionId: string, source: string): Promise<HookEntryRead>;
    saveHookSourceFile(
        env: AgentEnvironment,
        sectionId: string,
        source: string,
        text: string,
        baseRevision: string,
        confirmed?: boolean
    ): Promise<ProfileWriteResult>;
    // イベントに合わせた追加の雛形を JSON のテキストで返す。
    readHookTemplate(env: AgentEnvironment, sectionId: string, addition: HookEntryAddition): Promise<HookEntryRead>;
    saveHookEntry(
        env: AgentEnvironment,
        sectionId: string,
        locator: HookEntryLocator,
        text: string,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    addHookEntry(
        env: AgentEnvironment,
        sectionId: string,
        addition: HookEntryAddition,
        text: string,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    // confirmedWarnings が無ければ何も変えず、確認の内容を needs-confirmation で返す。
    deleteHookEntry(
        env: AgentEnvironment,
        sectionId: string,
        locator: HookEntryLocator,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    listCollection(env: AgentEnvironment, sectionId: string): Promise<FileCollectionReport>;
    readEntry(env: AgentEnvironment, sectionId: string, relPath: string): Promise<ProfileFileData>;
    saveEntry(
        env: AgentEnvironment,
        sectionId: string,
        relPath: string,
        text: string,
        baseRevision: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    createEntry(
        env: AgentEnvironment,
        sectionId: string,
        relPath: string,
        text: string,
        confirmedWarnings?: boolean
    ): Promise<ProfileWriteResult>;
    deleteEntries(
        env: AgentEnvironment,
        sectionId: string,
        relPaths: string[],
        confirmedWarnings?: boolean
    ): Promise<ProfileCollectionResult>;
    revealEntry(env: AgentEnvironment, sectionId: string, relPath: string): Promise<AssetOpResult>;
    download(env: AgentEnvironment, sectionId: string, relPaths: string[]): Promise<AssetOpResult>;
    inspectUpload(env: AgentEnvironment, sectionId: string): Promise<ProfileCollectionResult>;
    upload(
        env: AgentEnvironment,
        sectionId: string,
        srcPath: string,
        overwrite: boolean,
        confirmedWarnings?: boolean
    ): Promise<ProfileCollectionResult>;
}
