// ============================================================
// Agent CLI 共通型定義
// ------------------------------------------------------------
// すべての agent（Claude / Codex / 今後追加される CLI）で共有する
// agent 非依存の型をここに置く。特定 agent 固有の型は
// shared/agents/<agent>/types.ts に置くこと。
// ============================================================

import type { ConfigDetail, ConfigFileFailure, ConfigParseCode } from './configFileFailure';

// アプリ共通型のうち agent コードからも頻繁に参照するものを再エクスポートする
export type { OSType } from '../types';

// agent 環境（native = ホストOS、wsl = Windows 上の WSL distro）
export type AgentEnvKind = 'native' | 'wsl';

export interface AgentEnvironment {
    kind: AgentEnvKind;
    distro?: string;
}

// WSL distro の情報
export interface WslDistroInfo {
    distro: string;
    home: string;
}

// 必須のコマンドが足りない distro。
export interface WslMissingCommands {
    distro: string;
    commands: string[];
}

// ============================================================
// MCP サーバー
// ============================================================

// MCP サーバー設定。command / args / env のほか、
// agent 固有の任意キー（type / startup_timeout_sec など）も落とさず保持する。
export interface MCPServerConfig {
    command?: string | string[];
    args?: string[];
    env?: Record<string, string>;
    disabled?: boolean;
    // Claude Code (CLI) のエントリは "stdio" などの type を持つ場合がある。
    type?: string;
    [key: string]: unknown;
}

// MCP の一覧に出す設定の項目。環境変数やヘッダーの値は含めない。
export interface MCPServerDisplayConfig {
    command?: string | string[];
    args?: string[];
    type?: string;
    url?: string;
    serverUrl?: string;
}

export interface MCPServerInfo {
    name: string;
    config: MCPServerDisplayConfig;
    enabled: boolean;
    // 有効化・無効化・並べ替えができない。ファイル上の形（インラインテーブルなど）を保ったまま移せないサーバー。
    readOnly?: boolean;
    // 定義のあるファイルの名前。複数の設定ファイルを読む agent だけが返す。
    definedIn?: string[];
}

// 一覧の読み取りで読めなかったファイル。
export interface McpFileProblem {
    failure: ConfigFileFailure;
    // ファイルの表示パス。
    path: string;
    detail?: string;
}

export type MCPServers = {
    enabled: MCPServerInfo[];
    disabled: MCPServerInfo[];
    // 読めなかったファイルがあれば、その分の一覧は空で返す。
    problems?: McpFileProblem[];
};

// MCP 管理の環境ごとの情報
export interface McpEnvInfo {
    env: AgentEnvironment;
    label: string;
    configPath: string;
    configExists: boolean;
    disabledConfigPath: string;
}

// ============================================================
// クリーンアップ
// ============================================================

// クリーンアップ候補の静的定義（各 agent の constants に registry として並べる）
export interface CleanupCandidateSpec {
    key: string;
    defaultChecked: boolean;
    // expandable=true の候補は「すべて削除／個別選択」を切り替えられる。
    expandable?: boolean;
    // expandable のときの子要素の種類。'dir'=サブディレクトリ単位、'file'=ファイル単位。
    childKind?: 'dir' | 'file';
    // 候補自体の種類。'dir'=ディレクトリ（既定）、'file'=単一ファイル。
    kind?: 'dir' | 'file';
    // データディレクトリ配下の実パス。key と異なる場合に指定
    // （i18n キーにドットを使えないため history.jsonl 等で使用）。
    path?: string;
    // kind='file' のロックファイル。他から保持されている間は候補に出さず、削除もしない。
    lockFile?: boolean;
    // 削除の確認に表示する注意文の i18n キー（全キー）。候補全体の選択でも子要素の個別選択でも表示する。
    confirmWarningKey?: string;
    // 候補の行に表示する注記の i18n キー（全キー）。
    noticeKey?: string;
    // ファイルやフォルダーを消さず、設定ファイルの中の記録だけを編集する候補。
    editsFileOnly?: boolean;
}

// クリーンアップ: 子要素に添える状態の表示。値そのものは持たず、種類と件数だけを持つ。
export type CleanupChildBadgeKey =
    'trusted' | 'untrusted' | 'trustUnset' | 'mcpServers' | 'duplicateKeys' | 'grants' | 'sessions' | 'savedApprovals';

export interface CleanupChildBadge {
    key: CleanupChildBadgeKey;
    // 件数（省略すると種類だけを表示する）。
    count?: number;
}

// クリーンアップ: 削除の確認で一緒に削除するかを選べる、同じ候補の子要素。
export interface CleanupRelatedChild {
    // 候補内の子要素の識別子
    name: string;
    // 画面に表示する名前
    label: string;
    // 一緒に削除されるファイルの名前
    files: string[];
}

// クリーンアップ: 展開可能候補配下の個別の子要素
export interface CleanupChild {
    // 候補内で一意の識別子。選択と承認はこの値で行う。
    name: string;
    // 画面に表示する名前（無ければ name を表示する）。複数の場合は改行で区切る。
    displayName?: string;
    // 対応するワークスペースのパスを特定できない子要素。name を「パス不明」として表示する。
    pathUnknown?: boolean;
    // パス不明の印に使う文言の i18n キー（全キー。無ければ共通の文言）。
    pathUnknownLabelKey?: string;
    // 名前の横に添える状態の表示。
    badges?: CleanupChildBadge[];
    // この子要素を共有している複数のパス。削除の確認に列挙する。
    sharedPaths?: string[];
    // 削除の確認で一緒に削除するかを選べる、同じ候補の子要素。
    relatedChildren?: CleanupRelatedChild[];
    size: number;
    fileCount: number;
    // 大きさを取得できない子要素（画面にはサイズを表示しない）。
    sizeUnknown?: boolean;
    // 使用中（またはその可能性がある）ため削除対象から外した子要素。画面では、inUseSessions のある子要素を除いて選択できない。
    inUse?: boolean;
    // 子要素の中身と付随する対象のうち、使用中の可能性があるため削除対象から外したものの件数（size / fileCount には含めない）。
    inUseParts?: number;
    // 本体が既に無く、付随する一時物だけが残っている子要素。
    orphan?: boolean;
    // 使用中の可能性があると判定した根拠のセッション（削除時に子要素ごとに問い合わせる）。
    inUseSessions?: CleanupInUseSession[];
    // 下の階層の子要素（階層で展開する子要素だけ）。name は階層をまたいで候補内で一意にする。
    children?: CleanupChild[];
    // 子要素に属するスレッドの数（スレッド単位で数える子要素だけ）。
    threadCount?: number;
    // 最終更新日時（エポックミリ秒。日時を表示する子要素だけ）。
    mtimeMs?: number;
}

// クリーンアップ: 子要素を使用中の可能性があると判定した根拠のセッション。
// プロセスを調べない推定のため、利用者が承認した子要素は削除する。
export interface CleanupInUseSession {
    // セッションの識別子（agent ごとのセッション ID など。agent が判定できないことを表す値を使う場合もある）
    id: string;
    // 判定の根拠
    // - 'registered': 実行中として登録されている（終了済みのセッションの登録が残っている場合を含む）
    // - 'recent': 直近に更新された
    // - 'unknown': 更新日時や登録を読めないなどで判定できない
    reason: 'registered' | 'recent' | 'unknown';
    // セッション名（登録にある場合）
    title?: string;
}

// クリーンアップ候補ディレクトリ/ファイル
export interface CleanupCandidate {
    key: string;
    exists: boolean;
    size: number;
    fileCount: number;
    defaultChecked: boolean;
    expandable?: boolean;
    // expandable のときの子要素の種類。'dir'=サブディレクトリ、'file'=ファイル。
    childKind?: 'dir' | 'file';
    children?: CleanupChild[];
    // すべての子要素の大きさを取得できない候補（画面にはサイズを表示しない）。
    sizeUnknown?: boolean;
    // 削除の確認に表示する注意文の i18n キー（全キー）。候補全体の選択でも子要素の個別選択でも表示する。
    confirmWarningKey?: string;
    // 候補の行に表示する注記の i18n キー（全キー）。
    noticeKey?: string;
    // 注記の文言に渡す値。
    noticeParams?: Record<string, string>;
    // この環境では使えない候補。行と注記を表示し、選択できない。
    blocked?: boolean;
    // ファイルやフォルダーを消さず、設定ファイルの中の記録だけを編集する候補。
    editsFileOnly?: boolean;
    // 候補自体の種類。'file' は単一のファイルを消す候補。
    kind?: 'dir' | 'file';
}

// クリーンアップの環境ごとのレポート
export interface CleanupEnvReport {
    env: AgentEnvironment;
    label: string;
    candidates: CleanupCandidate[];
    // 使用中（ロック）などで完全に削除できず一部スキップした対象のキー一覧。
    // 例外は投げずに best-effort で削除し、スキップした分をここで報告する。
    skipped?: string[];
    // OS のファイルロックなどで削除できずに残ったパス（環境内の絶対パス）。消せるものは消したうえで残ったものだけを並べる。
    failedPaths?: string[];
}

// クリーンアップ削除の選択内容
export interface CleanupSelection {
    dirs: string[];
    // expandable 候補で個別選択された子要素名。キー=候補キー、値=選択された子要素名の配列。
    // dirs に候補キー全体が含まれる場合、その候補の childSelections は無視される。
    childSelections: Record<string, string[]>;
    // 使用中の可能性がある子要素（inUseSessions のあるもの）のうち、利用者が削除を承認したもの。
    // キー=候補キー、値=子要素名の配列。承認されなかった使用中の可能性がある子要素は削除しない。
    approvedChildren?: Record<string, string[]>;
}

// 「その他のツール」クリーンアップ: 各項目が自分の掃除方法を宣言で内包する汎用モデル
export type OtherCleanupActionKind = 'dir-delete' | 'yaml-list-clear';
export type OtherCleanupMetricKind = 'size' | 'count';

// 静的定義（registry に並べる）
export interface OtherCleanupItem {
    key: string;
    action: OtherCleanupActionKind;
    targetPath: string; // HOME 相対（'.serena/logs' など）
    yamlKey?: string; // yaml-list-clear 用（'projects'）
    metricKind: OtherCleanupMetricKind; // dir-delete→size, yaml-list-clear→count
    requiresPath: string; // この相対パスが存在する時のみ表示
    defaultChecked: boolean;
    group: string; // 'serena'（将来のグルーピング用）
}

// 実行時の各項目の状態
export interface OtherCleanupItemStatus {
    key: string;
    available: boolean;
    metricKind: OtherCleanupMetricKind;
    metricValue: number; // size=バイト, count=件数
    fileCount?: number; // dir-delete のときファイル数も
}

// 「その他」の環境ごとのレポート
export interface OtherCleanupReport {
    env: AgentEnvironment;
    label: string;
    items: OtherCleanupItemStatus[];
    // 使用中（ロック）などで完全に処理できず一部スキップした項目のキー一覧。
    skipped?: string[];
}

// 「その他」削除の選択内容（項目キーの配列）
export type OtherCleanupSelection = string[];

// ============================================================
// Agent・Skill 管理
// ============================================================

// 対象種別（agents / skills。実パスは agent ごとの constants で定義する）
export type AssetKind = 'agents' | 'skills';

// 行とリンクの関係。
// - 'self': 行そのものがリンク。削除はリンクだけを外す。
// - 'via': 途中のフォルダーがリンクで、実体はリンク先にある。参照はできるが、ここからは削除しない。
export type AssetEntryLink = 'self' | 'via';

// 通常の 1 件ではない行の状態。
// - 'dangling-link': リンク先がなく CLI に読み込まれない。削除（リンクを外す）だけができる。
// - 'no-entry-file': 定義ファイルがない、または CLI が飛ばす名前のフォルダーで CLI に読み込まれない。削除とダウンロードができる。
// - 'link-folder': フォルダーへのリンク。配下の定義は別の行に出る。削除（リンクを外す）だけができる。
// - 'link-loop': 既に読んだフォルダーへのリンクで、配下を読まない。削除（リンクを外す）だけができる。
// - 'refused-name': 別の場所を指し得る名前で、何も操作できない。
export type AssetEntryStatus = 'dangling-link' | 'no-entry-file' | 'link-folder' | 'link-loop' | 'refused-name';

// 一覧の 1 件（= 各エージェント / 各スキル）
// - skills: <skill>/ ディレクトリ（メタは <skill>/SKILL.md の YAML frontmatter から読む）。agent によっては単一ファイル。
// - agents: agents/ 配下の単一ファイル（.md / .toml など agent による）。agent によっては <name>/ ディレクトリ。
export interface AssetEntry {
    name: string; // 表示名（ディレクトリ名、またはファイル名から拡張子を除いたもの）
    // 操作に渡す識別子。読み取り元のルートからの相対パス（区切りは '/'）で、書き込み先以外のルートでは
    // 先頭に「<読み取り元の識別子>::」が付く。
    relPath: string;
    isFile: boolean; // true=単一ファイル / false=ディレクトリ
    fileCount?: number; // 再帰ファイル数。skills でのみ取得・表示する。
    // メタ情報（YAML frontmatter や TOML フィールド）。無い場合は空。
    frontmatter: Record<string, string>;
    // メタの生テキスト。無ければ null。
    frontmatterRaw: string | null;
    // 最終更新日時（エポックミリ秒）。取得できない場合は 0。
    mtimeMs: number;
    link?: AssetEntryLink;
    status?: AssetEntryStatus;
    // 読み取り元の識別子。複数のルートを読む種別だけが返す。
    origin?: string;
    // 同じ名前の定義で優先される読み取り元の識別子。
    overriddenBy?: string;
    // 同じ名前の定義がある読み取り元の識別子。どちらが優先されるかは公式に示されていない。
    sameNameIn?: string;
}

// Agent・Skill 管理の一覧レポート（環境 × 種別）
export interface AssetListReport {
    env: AgentEnvironment;
    label: string;
    kind: AssetKind;
    // 環境のファイルに届くか。false の場合（WSL のホームを解決できないなど）は一覧も DL/UL も行わない。
    available: boolean;
    entries: AssetEntry[];
    // OS のファイルマネージャーで開けない（WSL で UNC に届かない）。他の操作は使える。
    revealUnavailable?: boolean;
    // 一覧を打ち切った深さ。これより深い階層にエントリがあるときだけ返す。
    truncatedDepth?: number;
    // 読み取れなかったフォルダーがあり、一覧が欠けている可能性がある。
    incomplete?: boolean;
}

// Agent・Skill 管理の操作結果（ダウンロード / アップロード / アップロード前検査 / 公式スキル一覧）
export interface AssetOpResult {
    ok: boolean;
    canceled?: boolean; // ダイアログをキャンセルした
    message?: string; // エラー詳細（任意）
    conflicts?: string[]; // アップロード前検査で検出した同名サブディレクトリ
    // 上書きで一緒に置き換わる、衝突先のフォルダーの中のスキル（relPath）。
    nestedReplaced?: string[];
    zipPath?: string; // アップロード前検査で選択された ZIP の実パス
    importedCount?: number; // アップロードで展開したサブディレクトリ数
    deletedCount?: number; // 削除に成功した件数
    skipped?: string[]; // 使用中などで削除できなかった対象（relPath）
    // アップロード前検査で選択されたファイル種別。renderer が確定 IPC を呼び分ける。
    uploadKind?: 'zip' | 'md' | 'toml';
    // 単一ファイルアップロード時の元ファイル実パス（zipPath と役割分担）。
    srcPath?: string;
    // 単一ファイルアップロード時に算出した取り込み先ディレクトリ名（skills）／ファイル名（agents）。
    targetName?: string;
    // 公式スキル一覧返却用（list-official-skills）。既存スキル一覧と同形の AssetEntry。
    entries?: AssetEntry[];
    // アップロード前検査の種別整合チェック結果。
    // - 'warn': アップロード対象が現在のタブ（種別）と食い違う疑いがある（続行/キャンセルを確認）。
    kindCheck?: 'warn';
    // kindCheck の理由コード（i18n キーの末尾。例 'agent-md-into-skill'）。
    kindMessage?: string;
    // kindCheck が対象とする名前（定義ファイルがなく取り込まれないフォルダーなど）。
    kindNames?: string[];
    // readEntry の返却用: エントリの内容全体（agents=ファイル本体 / skills=SKILL.md）。
    content?: string;
}

// ============================================================
// プラグイン管理
// ------------------------------------------------------------
// 一覧・カタログは各 agent CLI の `plugin list --json` 等の出力を
// main 側で共通型へ正規化する。変更操作（インストール / アンインストール /
// マーケットプレイス追加・削除）は agent CLI のヘッドレス実行で行う。
// ============================================================

// インストール済みプラグイン 1 件
export interface PluginEntry {
    // アンインストール等の操作に渡す識別子（agent により形式が異なる。
    // claude/codex は "<plugin>@<marketplace>"、grok はプラグイン名）。
    id: string;
    name: string;
    version: string | null;
    // 提供元マーケットプレイス名（個別リポジトリ導入などで不明なら null）。
    marketplace: string | null;
    enabled: boolean;
    // インストールスコープ（claude のみ。user / synced）。
    scope?: string;
    // false のとき CLI でアンインストールできない（マーケットプレイス以外の由来など）。省略時は可能。
    uninstallable?: boolean;
    // false のとき有効/無効を切り替えられない（CLI が設定を参照しないリモート提供など）。省略時は可能。
    toggleable?: boolean;
    // 行に添える注記の i18n キー（画面から変更できない理由など）。指定時は切り替え・削除を無効にした理由としても示す。
    noteKey?: string;
    // アンインストールで一緒に削除される、同じリポジトリから導入された他のプラグイン名（grok のみ）。
    sameRepoPlugins?: string[];
    // 指定のあるファイルの名前。複数の設定ファイルを読む agent だけが返す。
    definedIn?: string[];
}

// マーケットプレイスの由来。
// - user: この agent で追加されたもの（削除可）
// - builtin: agent 組み込み（削除不可として扱う）
// - external: 他 agent 由来の合成表示（grok が Claude 設定を自動読込したもの等。削除不可）
export type PluginMarketplaceOrigin = 'user' | 'builtin' | 'external';

// 登録済みマーケットプレイス 1 件
export interface PluginMarketplaceEntry {
    name: string;
    // ソース種別（'github' / 'git' / 'local' / 'url' など agent の表現をそのまま保持）
    sourceKind: string;
    // リポジトリ / URL / パスなどの表示用文字列
    sourceDetail: string;
    origin: PluginMarketplaceOrigin;
    // プラグイン追加ダイアログでインストール元として選択できるか。
    // grok では Claude 由来の外部マーケット（公式 claude-plugins-official を除く）を false にする。
    selectable: boolean;
}

// マーケットプレイスカタログ（インストール可能なプラグイン）1 件
export interface PluginCatalogEntry {
    // インストール操作に渡す識別子（agent 側で組み立て済み）
    id: string;
    name: string;
    description: string | null;
    marketplace: string;
    installed: boolean;
    // プラグインのリポジトリ / ホームページ URL（外部ブラウザで開く。導出できなければ null）
    homepage: string | null;
}

// プラグイン管理の環境ごとのレポート
export interface PluginEnvReport {
    env: AgentEnvironment;
    label: string;
    // agent CLI がこの環境で実行可能か。false の場合 plugins / marketplaces は空で、
    // UI は案内メッセージを表示して変更操作を無効化する。
    cliAvailable: boolean;
    cliVersion: string | null;
    plugins: PluginEntry[];
    marketplaces: PluginMarketplaceEntry[];
    // GUI の機能出し分け（単一ソースは main 側の agent constants。renderer は
    // OS 依存の constants を import せず、このレポート経由で受け取る）。
    capabilities: PluginCapabilities;
    // 一覧取得自体が失敗した場合の CLI エラー出力（詳細表示用）
    error?: string;
    // 一覧は取得できたが、知らせることがある場合の警告の i18n キー（管理用のファイルを読めず一部を表示できないなど）
    warningKey?: string;
}

// カタログ取得の結果
export interface PluginCatalogReport {
    ok: boolean;
    entries: PluginCatalogEntry[];
    // 失敗時の CLI エラー出力（詳細表示用）
    message?: string;
}

// プラグイン変更操作（インストール / アンインストール / マーケットプレイス追加・削除）の結果
export interface PluginOpResult {
    ok: boolean;
    // 失敗時の CLI エラー出力（詳細表示用）
    message?: string;
}

// GUI 側の機能出し分け（agent ごとの constants で宣言する registry）
export interface PluginCapabilities {
    // 個別リポジトリ / ローカルパス / package から 1 操作で直接インストールできるか。
    // false の agent は「マーケットプレイスとして追加 → 含まれるプラグインを選択」の 2 段階で行う。
    directInstall: boolean;
    // マーケットプレイスソースにリモート marketplace.json の URL を指定できるか（claude のみ true）
    marketplaceRemoteUrl: boolean;
    // カタログ一覧を CLI から取得できるか。false の agent は追加画面を直接ソース入力だけにする。
    catalog: boolean;
    // マーケットプレイスの一覧・追加・削除をサポートするか。
    marketplaceManagement: boolean;
    // 直接インストール元として npm パッケージ名を受け付けるか（OpenCode）。
    packageSource: boolean;
    // 直接インストール画面の説明文の i18n キー。省略時は共通の説明（@ref / #subdir 指定に対応する書式）。
    sourceHelpKey?: string;
}

// ============================================================
// 設定ファイル編集（settings.json / config.toml など）
// ============================================================

// 設定項目の値の型。
// - boolean: 未設定/true/false の 3 状態セレクトで編集。
// - string: 文字列（choices のみならセレクト、allowCustom 付きなら候補入力）。
// - number:  数値（オプションで min/max を持つ）。
// - envFlag: env オブジェクト内の特定キー（envKey）を編集するフラグ。
//            ON で env[envKey] = onValue（既定 "1"）を設定、OFF で削除する。
//            onValue と異なる保存済み値は string として表示・保持する。
// - enum: 型が混在する固定候補から 1 つを選ぶ（例: true / false / "notify"）。候補ごとに実際の値と
//         その型（boolean / string / number）を保持し、選択された値を型のまま読み書きする。
// - directEdit: 配列・テーブル・オブジェクトなど、設定画面では編集しない項目。linkTab / linkRoute があれば編集先へのリンク、
//               なければファイルの直接編集への案内を値欄に表示する。
export type SettingsFieldType = 'boolean' | 'string' | 'number' | 'envFlag' | 'enum' | 'directEdit';

// enum 型の候補 1 件。value は実際に読み書きする型付きの値、labelKey は i18n サフィックス
// （settings.field.<key>.choice.<labelKey> を引く）。
export interface SettingsEnumChoice {
    value: string | number | boolean;
    labelKey: string;
}

// 表示・編集対象の 1 設定項目の定義（registry）。
// 編集可能型は読み書きと UI へ反映し、directEdit は UI の案内行だけを生成する。
export interface SettingsFieldSpec {
    key: string; // i18n キー兼識別子
    path: string; // 設定ファイル上のキー（agent により JSON トップレベルキー / TOML ドット区切りキー）
    group: string; // UI のグループ見出し用キー。i18n: settings.group.<group>
    type: SettingsFieldType;
    choices?: string[]; // type='string' で表示する候補（allowCustom=false なら選択肢を限定）
    // choices にないモデル ID なども受け付ける候補入力。保存済みの未知値もそのまま表示する。
    allowCustom?: boolean;
    enumChoices?: SettingsEnumChoice[]; // type='enum' のとき: 型付き候補の一覧
    envKey?: string; // type='envFlag' のとき: env オブジェクト内の対象キー
    onValue?: string; // type='envFlag' のとき: ON 時に設定する値（既定 '1'）
    // type='number' のとき: 受け付ける最小値。min / max / exclusiveMin / integer に合わない値は丸めずに保存を拒否する。
    min?: number;
    // type='number' のとき: min を範囲に含めない（min より大きい値だけを受け付ける）。
    exclusiveMin?: boolean;
    max?: number; // type='number' のとき: 受け付ける最大値
    integer?: boolean; // type='number' のとき: 整数だけを受け付ける
    // type='boolean' のとき: 未設定時に agent が実際に採用する既定値。
    // UI で「未設定（既定: 有効/無効）」と表示するために使う。未確定なら省略する。
    defaultOn?: boolean;
    // type='string' / 'number' のとき: 未設定時に agent が採用する公式の固定既定値。
    // UI で「未設定（既定: <値>）」と表示するために使う。環境依存・未確定なら省略する。
    defaultValue?: string | number;
    // type='string' のとき: 受け付ける値の形式（RegExp のパターン文字列。u フラグで評価する）。
    // 一致しない値は保存しない。
    pattern?: string;
    // type='directEdit' のとき: この項目を編集する同じ画面のタブの ID。
    linkTab?: string;
    // type='directEdit' のとき: この項目を編集する別の画面のルート。
    linkRoute?: string;
}

// 設定項目 1 件の現在値（読み取り結果）。
export type SettingsFieldValue = boolean | string | number | undefined;

// 設定ファイルを解釈できなかった理由。本文を含まず、コードと位置だけを持つ。
export type SettingsParseError = ConfigDetail<ConfigParseCode>;

// 設定の読み取り結果（環境ごと）。
// available=false は環境のファイルに届かない。
export interface SettingsReadResult {
    env: AgentEnvironment;
    label: string;
    available: boolean;
    // 設定ファイルが存在するか（存在しなくても編集・新規作成は可能）。
    exists: boolean;
    // 各登録項目の現在値（key -> 値）。
    values: Record<string, SettingsFieldValue>;
    // 表示・編集対象項目の定義（registry）。レンダラーはこれを使って UI を描くため、
    // os 依存の shared/constants を import する必要がない（schema の単一ソースはメイン側）。
    fields: SettingsFieldSpec[];
    // 設定ファイルを読めなかった理由（未作成は含まない）。values は未確定で、保存も直接編集もできない。
    readFailed?: string;
    // 設定ファイルを読めたが解釈できなかった理由。values は未確定で、直接編集でだけ修正できる。
    parseError?: SettingsParseError;
    // 項目ごとの注記（key -> i18n キー。<agentId>.settings. からの相対）。値の下に表示する。
    notices?: Record<string, string>;
    // 設定ファイル全体への注記（i18n キー。<agentId>.settings. からの相対）。表の上に表示する。
    fileNotice?: string;
}

// 直接編集を始めるときに読む、設定ファイルの全文。
export interface SettingsRawResult {
    // 設定ファイルの生テキスト全体（JSON / TOML）。BOM は含まない。存在しなければ null か初期内容。
    raw: string | null;
    // 読み取った時点の内容の識別子。直接編集の保存で baseRevision として渡す。
    revision: string;
    // 先頭に BOM がある。
    hadBom: boolean;
    // 主な改行コード。
    eol: '\n' | '\r\n';
    // CRLF と LF が混在している（直接編集で保存すると eol へ揃う）。
    mixedEol: boolean;
    // 設定ファイルを読めなかった理由（未作成は含まない）。
    readFailed?: string;
}

// テーブル編集による設定保存の入力（変更した key -> 値）。
// 関係ない項目と未編集項目には触れず、含まれる登録項目だけを差分マージで反映する。
export type SettingsValues = Record<string, SettingsFieldValue>;

// 設定保存の結果。
export interface SettingsWriteResult {
    ok: boolean;
    // エラー詳細（'read-failed' / 'conflict' / 'invalid-json' / 'invalid-toml' / 'invalid-value' / 'write-failed' など）。
    // conflict は読み込んだ後にファイルが変わったことを表し、何も書かない。
    message?: string;
    // テーブル編集の conflict で、読み込んだ後に値が変わった項目の key。
    conflictKeys?: string[];
    // 保存後の内容の識別子（ok のとき）。
    revision?: string;
}
