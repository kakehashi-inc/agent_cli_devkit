// ============================================================
// Agent CLI 共通型定義
// ------------------------------------------------------------
// すべての agent（Claude / Codex / 今後追加される CLI）で共有する
// agent 非依存の型をここに置く。特定 agent 固有の型は
// shared/agents/<agent>/types.ts に置くこと。
// ============================================================

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

export interface MCPServerInfo {
    name: string;
    config: MCPServerConfig;
    enabled: boolean;
}

export type MCPServers = { enabled: MCPServerInfo[]; disabled: MCPServerInfo[] };

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
}

// クリーンアップ: 展開可能候補配下の個別の子要素
export interface CleanupChild {
    name: string;
    size: number;
    fileCount: number;
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
}

// クリーンアップの環境ごとのレポート
export interface CleanupEnvReport {
    env: AgentEnvironment;
    label: string;
    candidates: CleanupCandidate[];
    // 使用中（ロック）などで完全に削除できず一部スキップした対象のキー一覧。
    // 例外は投げずに best-effort で削除し、スキップした分をここで報告する。
    skipped?: string[];
}

// クリーンアップ削除の選択内容
export interface CleanupSelection {
    dirs: string[];
    // expandable 候補で個別選択された子要素名。キー=候補キー、値=選択された子要素名の配列。
    // dirs に候補キー全体が含まれる場合、その候補の childSelections は無視される。
    childSelections: Record<string, string[]>;
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

// 一覧の 1 件（= 各エージェント / 各スキル）
// - skills: <skill>/ ディレクトリ（メタは <skill>/SKILL.md の YAML frontmatter から読む）
// - agents: agents/ 直下および再帰サブディレクトリの単一ファイル（.md / .toml など agent による）
export interface AssetEntry {
    name: string; // 表示名（skills=ディレクトリ名 / agents=ファイル名から拡張子を除いたもの）
    relPath: string; // asset 親からの相対パス（DL/UL の単位）
    isFile: boolean; // true=単一ファイル（agents） / false=ディレクトリ（skills）
    fileCount?: number; // 再帰ファイル数。skills でのみ取得・表示する。
    // メタ情報（YAML frontmatter や TOML フィールド）。無い場合は空。
    frontmatter: Record<string, string>;
    // メタの生テキスト。無ければ null。
    frontmatterRaw: string | null;
    // 最終更新日時（エポックミリ秒）。取得できない場合は 0。
    mtimeMs: number;
}

// Agent・Skill 管理の一覧レポート（環境 × 種別）
export interface AssetListReport {
    env: AgentEnvironment;
    label: string;
    kind: AssetKind;
    // 実 OS パス（native 絶対パス / WSL UNC パス）に到達でき、ZIP 操作が可能か。
    // false の場合（WSL コマンドモードで UNC 不可など）は DL/UL を行わない。
    available: boolean;
    entries: AssetEntry[];
}

// Agent・Skill 管理の操作結果（ダウンロード / アップロード / アップロード前検査 / 公式スキル一覧）
export interface AssetOpResult {
    ok: boolean;
    canceled?: boolean; // ダイアログをキャンセルした
    message?: string; // エラー詳細（任意）
    conflicts?: string[]; // アップロード前検査で検出した同名サブディレクトリ
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
    // インストールスコープ（claude のみ。user / project / local）。
    scope?: string;
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
// - directEdit: 配列・テーブル・オブジェクトなど、設定画面では編集せずファイルの直接編集へ案内する。
export type SettingsFieldType = 'boolean' | 'string' | 'number' | 'envFlag' | 'directEdit';

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
    envKey?: string; // type='envFlag' のとき: env オブジェクト内の対象キー
    onValue?: string; // type='envFlag' のとき: ON 時に設定する値（既定 '1'）
    min?: number; // type='number' のとき: 最小値（クランプに使用）
    max?: number; // type='number' のとき: 最大値（クランプに使用）
    integer?: boolean; // type='number' のとき: 整数へ丸める
    // type='boolean' のとき: 未設定時に agent が実際に採用する既定値。
    // UI で「未設定（既定: 有効/無効）」と表示するために使う。未確定なら省略する。
    defaultOn?: boolean;
    // type='string' / 'number' のとき: 未設定時に agent が採用する公式の固定既定値。
    // UI で「未設定（既定: <値>）」と表示するために使う。環境依存・未確定なら省略する。
    defaultValue?: string | number;
}

// 設定項目 1 件の現在値（読み取り結果）。
export type SettingsFieldValue = boolean | string | number | undefined;

// 設定の読み取り結果（環境ごと）。
// available=false は実 OS パスに到達できない（WSL コマンドモードで UNC 不可など）。
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
    // 直接編集用: 設定ファイルの生テキスト全体（JSON / TOML）。存在しなければ null。
    raw: string | null;
}

// テーブル編集による設定保存の入力（変更した key -> 値）。
// 関係ない項目と未編集項目には触れず、含まれる登録項目だけを差分マージで反映する。
export type SettingsValues = Record<string, SettingsFieldValue>;

// 設定保存の結果。
export interface SettingsWriteResult {
    ok: boolean;
    message?: string; // エラー詳細（'unavailable' / 'invalid-json' / 'invalid-toml' / 'write-failed' など）
}
