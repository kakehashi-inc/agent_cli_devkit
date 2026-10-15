import type { AssetKind, CleanupCandidateSpec, PluginCapabilities, SettingsFieldSpec } from '../types';
import { wslCliTest } from '../wsl';

// 対象は OpenCode 2（npm @opencode/cli 2.x、コマンド名 opencode2）。
export const OPENCODE_CONFIG_DIR = '.config/opencode';
export const OPENCODE_CONFIG_SCHEMA_URL = 'https://opencode.ai/config.json';
// グローバル設定ファイルの候補。OpenCode は両方を読み込み、同じ値は opencode.jsonc が優先する。
// MCP・プラグインの編集対象は `opencode2 mcp add --global` / `opencode2 plugin add` と同じく存在する最初の候補、
// 設定画面の編集対象は OpenCode が値を優先する、存在する最後の候補とし、どちらも無ければ先頭を作成する。
export const OPENCODE_CONFIG_CANDIDATES_REL = [
    `${OPENCODE_CONFIG_DIR}/opencode.json`,
    `${OPENCODE_CONFIG_DIR}/opencode.jsonc`,
] as const;
// 設定ファイル内で MCP サーバーを並べるオブジェクトの位置（mcp.servers.<name>）。
export const OPENCODE_MCP_SERVERS_PATH = ['mcp', 'servers'];
// 無効化した MCP はエントリごと sidecar ファイルへ退避する（他 agent と同じ方式）。
// 命名は「<設定ファイル名>-disabled-mcp.<ext>」、中身は設定ファイルと同じ { mcp: { servers: {...} } }。
export const OPENCODE_DISABLED_MCP_REL = `${OPENCODE_CONFIG_DIR}/opencode-disabled-mcp.json`;
export const OPENCODE_AGENTS_REL = `${OPENCODE_CONFIG_DIR}/agents`;
export const OPENCODE_SKILLS_REL = `${OPENCODE_CONFIG_DIR}/skills`;
// ローカルプラグインの配置先。OpenCode は直下の .ts / .js ファイルとプラグインパッケージのフォルダーを読み込む。
export const OPENCODE_PLUGINS_DIR = 'plugins';
// 無効化したローカルプラグインの退避先（OpenCode は読み込まない）。
export const OPENCODE_DISABLED_PLUGINS_DIR = 'plugins-disabled';
// 無効化した plugins 配列の要素の退避先。中身は設定ファイルと同じ { plugins: [...] } と、
// 有効化で元の位置へ戻すための無効化した時点の並び { positions: { <指定子>: [...] } }。
export const OPENCODE_DISABLED_PLUGINS_REL = `${OPENCODE_CONFIG_DIR}/opencode-disabled-plugins.json`;
// ターミナル UI の設定。`opencode2 plugin add` は TUI 専用のプラグインをこのファイルの plugins へ追加する。
export const OPENCODE_CLI_CONFIG_REL = `${OPENCODE_CONFIG_DIR}/cli.json`;

export const ASSET_PARENT_REL: Record<AssetKind, string> = {
    agents: OPENCODE_AGENTS_REL,
    skills: OPENCODE_SKILLS_REL,
};

// OpenCode 2 のコマンド名。このコマンドの有無で OpenCode 2 の導入を判定する（CLI 本体は実行しない）。
export const OPENCODE_CLI_COMMAND = 'opencode2';
// WSL distro の検出は opencode2 コマンドの有無で行う。CLI の実行と同じ PATH・同じ規則（Windows 側のドライブにある
// ものを除く）で解決する。
export const OPENCODE_WSL_CLI_TEST = wslCliTest(OPENCODE_CLI_COMMAND);
export const OPENCODE_MCP_CHANNELS = {
    GET_ENVIRONMENTS: 'opencode-mcp:get-environments',
    GET_MCP_SERVERS: 'opencode-mcp:get-mcp-servers',
    ENABLE: 'opencode-mcp:enable-mcp-server',
    DISABLE: 'opencode-mcp:disable-mcp-server',
    REORDER: 'opencode-mcp:reorder-mcp-servers',
    REORDER_DISABLED: 'opencode-mcp:reorder-disabled-mcp-servers',
} as const;

export const OPENCODE_ASSET_CHANNELS = {
    GET_ENVIRONMENTS: 'opencode-asset:get-environments',
    LIST: 'opencode-asset:list',
    READ_ENTRY: 'opencode-asset:read-entry',
    REVEAL_ENTRY: 'opencode-asset:reveal-entry',
    DOWNLOAD: 'opencode-asset:download',
    INSPECT_UPLOAD: 'opencode-asset:inspect-upload',
    UPLOAD: 'opencode-asset:upload',
    UPLOAD_FILE: 'opencode-asset:upload-file',
    DELETE: 'opencode-asset:delete',
} as const;

export const OPENCODE_CLEANUP_CHANNELS = {
    GET_ENVIRONMENTS: 'opencode-cleanup:get-environments',
    SCAN: 'opencode-cleanup:scan',
    DELETE: 'opencode-cleanup:delete',
} as const;

export const OPENCODE_SETTINGS_CHANNELS = {
    GET_ENVIRONMENTS: 'opencode-settings:get-environments',
    READ: 'opencode-settings:read',
    WRITE: 'opencode-settings:write',
    WRITE_RAW: 'opencode-settings:write-raw',
} as const;

export const OPENCODE_PLUGIN_CHANNELS = {
    GET_ENVIRONMENTS: 'opencode-plugin:get-environments',
    LIST: 'opencode-plugin:list',
    CATALOG: 'opencode-plugin:catalog',
    INSTALL: 'opencode-plugin:install',
    INSTALL_SOURCE: 'opencode-plugin:install-source',
    UNINSTALL: 'opencode-plugin:uninstall',
    SET_ENABLED: 'opencode-plugin:set-enabled',
    ADD_MARKETPLACE: 'opencode-plugin:add-marketplace',
    REMOVE_MARKETPLACE: 'opencode-plugin:remove-marketplace',
} as const;

export const OPENCODE_PLUGIN_CAPABILITIES: PluginCapabilities = {
    directInstall: true,
    marketplaceRemoteUrl: false,
    catalog: false,
    marketplaceManagement: false,
    packageSource: true,
    sourceHelpKey: 'opencode.plugins.sourceHelp',
};

// OpenCode の公式 XDG ディレクトリ（cache / data / state）のうち、再生成されるデータと履歴だけを対象にする。
// データベース（opencode.db*。資格情報と保存済みの権限を含むためファイルごとは消さない）は、
// セッション履歴だけを OpenCode の CLI（session delete）で消す候補（sessions）として扱う。
// ワークツリー（worktree）、
// サービスの設定と登録（service.json）、永続ターミナル（pty）、ロック（locks。OpenCode が古いものを自動で回収する）、
// TUI の状態（model.json / session.json / prompt-stash.jsonl）、設定ファイルと資産は対象にしない。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: 'cache', path: '.cache/opencode', defaultChecked: false },
    { key: 'logs', path: '.local/share/opencode/log', defaultChecked: false },
    { key: 'tool-output', path: '.local/share/opencode/tool-output', defaultChecked: false },
    { key: 'shell-output', path: '.local/share/opencode/shell', defaultChecked: false },
    {
        key: 'snapshot',
        path: '.local/share/opencode/snapshot',
        defaultChecked: false,
        expandable: true,
        childKind: 'dir',
    },
    { key: 'repos', path: '.local/share/opencode/repos', defaultChecked: false, expandable: true, childKind: 'dir' },
    {
        key: 'prompt-history',
        path: '.local/state/opencode/prompt-history.jsonl',
        kind: 'file',
        defaultChecked: false,
    },
    { key: 'frecency', path: '.local/state/opencode/frecency.jsonl', kind: 'file', defaultChecked: false },
    // セッション履歴。パスは持たず、CLI で一覧・削除する（子要素 = 親なしのセッション）。
    { key: 'sessions', defaultChecked: false, expandable: true, childKind: 'dir' },
];

// セッション履歴を保存するデータベース（XDG データ領域の opencode.db。OpenCode 2 の正式リリースが使う名前）。
// これが無い環境ではセッション履歴が無いため、CLI を実行せずにセッション履歴の候補を出さない。
export const OPENCODE_DATABASE_REL = '.local/share/opencode/opencode.db';

// model の文字列形式（provider/model#variant。variant は省略可）。OpenCode の設定スキーマと同じパターン。
export const OPENCODE_MODEL_PATTERN = '^[^/#]+/[^#]+(?:#[^#]+)?$';

// OpenCode 2 のグローバル設定ファイル（opencode.json / opencode.jsonc）のキー。
// 単一スカラーと model はテーブル編集、配列・マップ・オブジェクトとそのほかの union 型は直接編集。
// enterprise（組織管理）、受け付けるだけで動作に使われないキー（share / username / instructions / lsp）、
// TUI 専用の cli.json とバックグラウンドサービスの service.json は対象外。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    // model は provider/model#variant 形式の文字列と { providerID, model, variant } オブジェクトの union。
    // 表では文字列として編集し、オブジェクト形式は文字列表記で示す（変更して保存したときだけ文字列で上書きする）。
    {
        key: 'model',
        path: 'model',
        group: 'model',
        type: 'string',
        pattern: OPENCODE_MODEL_PATTERN,
    },
    {
        key: 'defaultAgent',
        path: 'default_agent',
        group: 'model',
        type: 'string',
        choices: ['build', 'plan'],
        allowCustom: true,
        defaultValue: 'build',
    },
    { key: 'agents', path: 'agents', group: 'model', type: 'directEdit' },
    { key: 'providers', path: 'providers', group: 'model', type: 'directEdit' },
    { key: 'shell', path: 'shell', group: 'behavior', type: 'string' },
    {
        key: 'update',
        path: 'update',
        group: 'behavior',
        type: 'string',
        choices: ['disable', 'notify', 'auto'],
        defaultValue: 'notify',
    },
    { key: 'snapshots', path: 'snapshots', group: 'behavior', type: 'boolean', defaultOn: true },
    // 未設定時はサーバーのデータディレクトリ配下（worktree/<プロジェクト ID>）を使うため既定値を宣言しない。
    { key: 'worktreeDirectory', path: 'worktree.directory', group: 'behavior', type: 'string' },
    { key: 'websearch', path: 'websearch', group: 'behavior', type: 'directEdit' },
    { key: 'warming', path: 'warming', group: 'behavior', type: 'directEdit' },
    { key: 'formatter', path: 'formatter', group: 'behavior', type: 'directEdit' },
    { key: 'watcherIgnore', path: 'watcher.ignore', group: 'behavior', type: 'directEdit' },
    { key: 'permissions', path: 'permissions', group: 'permissions', type: 'directEdit' },
    { key: 'policies', path: 'policies', group: 'permissions', type: 'directEdit' },
    {
        key: 'mcpTimeoutStartup',
        path: 'mcp.timeout.startup',
        group: 'mcp',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 30000,
    },
    {
        key: 'mcpTimeoutCatalog',
        path: 'mcp.timeout.catalog',
        group: 'mcp',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 30000,
    },
    {
        key: 'mcpTimeoutExecution',
        path: 'mcp.timeout.execution',
        group: 'mcp',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 43200000,
    },
    { key: 'mcpServers', path: 'mcp.servers', group: 'mcp', type: 'directEdit' },
    {
        key: 'mediaImageAutoResize',
        path: 'media.image.auto_resize',
        group: 'media',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'mediaImageMaxWidth',
        path: 'media.image.max_width',
        group: 'media',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 2000,
    },
    {
        key: 'mediaImageMaxHeight',
        path: 'media.image.max_height',
        group: 'media',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 2000,
    },
    {
        key: 'mediaImageMaxBase64Bytes',
        path: 'media.image.max_base64_bytes',
        group: 'media',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 5242880,
    },
    {
        key: 'toolOutputMaxLines',
        path: 'tool_output.max_lines',
        group: 'toolOutput',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 2000,
    },
    {
        key: 'toolOutputMaxBytes',
        path: 'tool_output.max_bytes',
        group: 'toolOutput',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 51200,
    },
    { key: 'compactionAuto', path: 'compaction.auto', group: 'compaction', type: 'boolean', defaultOn: true },
    {
        key: 'compactionKeepTokens',
        path: 'compaction.keep.tokens',
        group: 'compaction',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 15000,
    },
    // 未設定時はモデルの上限の 10% のため既定値を宣言しない。
    {
        key: 'compactionBuffer',
        path: 'compaction.buffer',
        group: 'compaction',
        type: 'number',
        min: 0,
        integer: true,
    },
    { key: 'skills', path: 'skills', group: 'extensions', type: 'directEdit' },
    { key: 'commands', path: 'commands', group: 'extensions', type: 'directEdit' },
    { key: 'references', path: 'references', group: 'extensions', type: 'directEdit' },
    { key: 'plugins', path: 'plugins', group: 'extensions', type: 'directEdit' },
    // 未設定時に使う解析器は実行環境によって異なるため既定値を宣言しない。
    {
        key: 'experimentalPortableShellScanner',
        path: 'experimental.portable_shell_scanner',
        group: 'experimental',
        type: 'boolean',
    },
    {
        key: 'experimentalSubagentDepth',
        path: 'experimental.subagent_depth',
        group: 'experimental',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 1,
    },
];
