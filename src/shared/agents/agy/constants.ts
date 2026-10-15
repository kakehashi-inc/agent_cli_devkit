import type { AssetKind, CleanupCandidateSpec, PluginCapabilities, SettingsFieldSpec } from '../types';

// Antigravity CLI 固有領域。別製品の Agy / Antigravity IDE の領域とは混在させない。
export const AGY_CLI_DIR = '.gemini/antigravity-cli';
export const AGY_SETTINGS_REL = `${AGY_CLI_DIR}/settings.json`;
export const AGY_SKILLS_REL = `${AGY_CLI_DIR}/skills`;

// MCP / Custom Agent / Plugin は Antigravity CLI が Gemini CLI と共有する公式グローバル領域。
export const AGY_SHARED_CONFIG_DIR = '.gemini/config';
// Plugin の有効/無効は共通 config.json の plugins.<インストール先のディレクトリ名>.enabled だけに保存される。
export const AGY_SHARED_CONFIG_JSON_REL = `${AGY_SHARED_CONFIG_DIR}/config.json`;
export const AGY_MCP_CONFIG_REL = `${AGY_SHARED_CONFIG_DIR}/mcp_config.json`;
// 無効化した MCP はブロックごと sidecar ファイルへ退避する（他 agent と同じ方式）。
export const AGY_DISABLED_MCP_REL = `${AGY_SHARED_CONFIG_DIR}/mcp_config_disabled.json`;
export const AGY_AGENTS_REL = `${AGY_SHARED_CONFIG_DIR}/agents`;
export const AGY_PLUGINS_REL = `${AGY_SHARED_CONFIG_DIR}/plugins`;

export const ASSET_PARENT_REL: Record<AssetKind, string> = {
    agents: AGY_AGENTS_REL,
    skills: AGY_SKILLS_REL,
};

export const AGY_CLI_COMMAND = 'agy';
// WSL distro の検出は他 agent と同じくディレクトリ存在チェックで行う。
// bash -lc（非対話シェル）では .bashrc の PATH 追記が効かず `command -v agy` が
// 失敗し得るため、CLI 実行による判定は使わない。
export const AGY_WSL_CLI_TEST = `test -d ~/${AGY_CLI_DIR}`;

export const AGY_MCP_CHANNELS = {
    GET_ENVIRONMENTS: 'agy-mcp:get-environments',
    GET_MCP_SERVERS: 'agy-mcp:get-mcp-servers',
    ENABLE: 'agy-mcp:enable-mcp-server',
    DISABLE: 'agy-mcp:disable-mcp-server',
    REORDER: 'agy-mcp:reorder-mcp-servers',
    REORDER_DISABLED: 'agy-mcp:reorder-disabled-mcp-servers',
} as const;

export const AGY_ASSET_CHANNELS = {
    GET_ENVIRONMENTS: 'agy-asset:get-environments',
    LIST: 'agy-asset:list',
    READ_ENTRY: 'agy-asset:read-entry',
    REVEAL_ENTRY: 'agy-asset:reveal-entry',
    DOWNLOAD: 'agy-asset:download',
    INSPECT_UPLOAD: 'agy-asset:inspect-upload',
    UPLOAD: 'agy-asset:upload',
    UPLOAD_FILE: 'agy-asset:upload-file',
    DELETE: 'agy-asset:delete',
} as const;

export const AGY_CLEANUP_CHANNELS = {
    GET_ENVIRONMENTS: 'agy-cleanup:get-environments',
    SCAN: 'agy-cleanup:scan',
    DELETE: 'agy-cleanup:delete',
} as const;

export const AGY_SETTINGS_CHANNELS = {
    GET_ENVIRONMENTS: 'agy-settings:get-environments',
    READ: 'agy-settings:read',
    WRITE: 'agy-settings:write',
    WRITE_RAW: 'agy-settings:write-raw',
} as const;

export const AGY_PLUGIN_CHANNELS = {
    GET_ENVIRONMENTS: 'agy-plugin:get-environments',
    LIST: 'agy-plugin:list',
    CATALOG: 'agy-plugin:catalog',
    INSTALL: 'agy-plugin:install',
    INSTALL_SOURCE: 'agy-plugin:install-source',
    UNINSTALL: 'agy-plugin:uninstall',
    SET_ENABLED: 'agy-plugin:set-enabled',
    ADD_MARKETPLACE: 'agy-plugin:add-marketplace',
    REMOVE_MARKETPLACE: 'agy-plugin:remove-marketplace',
} as const;

export const AGY_PLUGIN_CAPABILITIES: PluginCapabilities = {
    directInstall: true,
    marketplaceRemoteUrl: false,
    catalog: false,
    marketplaceManagement: false,
    packageSource: false,
    sourceHelpKey: 'agy.plugins.sourceHelp',
};

// 自動更新が保持するロック（更新処理中は保持される）。
export const AGY_UPDATE_LOCK_REL = `${AGY_CLI_DIR}/updater/update.lock`;

// 再生成されるデータと会話データだけを並べる。settings.json・keybindings.json・skills・bin・builtin・
// plugin_data・knowledge・implicit・認証トークン・実行中セッションのロック（presence）は対象にしない。
// cli.log は log 配下の最新ログを指すシンボリックリンクのため、ログの実体は log で扱う。
// update-lock は自動更新が保持していないときだけ扱う。old-binaries は ~/.gemini の外にある
// 退避済みの旧実行ファイルの特別候補（AGY_OLD_BINARIES_KEY）。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: 'cache', defaultChecked: false },
    { key: 'log', defaultChecked: false },
    { key: 'crashes', defaultChecked: false },
    // 会話は 1 会話ごとの SQLite ファイル（.db と -wal / -shm）として保存される。
    { key: 'conversations', defaultChecked: false, expandable: true, childKind: 'file' },
    { key: 'brain', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'scratch', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'worktrees', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'conversation-summaries', path: 'conversation_summaries.db', kind: 'file', defaultChecked: false },
    { key: 'conversation-summaries-wal', path: 'conversation_summaries.db-wal', kind: 'file', defaultChecked: false },
    { key: 'conversation-summaries-shm', path: 'conversation_summaries.db-shm', kind: 'file', defaultChecked: false },
    { key: 'history', path: 'history.jsonl', kind: 'file', defaultChecked: false },
    { key: 'update-lock', path: 'updater/update.lock', kind: 'file', lockFile: true, defaultChecked: false },
    { key: 'old-binaries', defaultChecked: false, expandable: true, childKind: 'file' },
];

// 自動更新で退避された旧実行ファイルの特別候補のキー（子要素はリゾルバで特定する）。
// 対象は Windows の %LOCALAPPDATA%\agy\bin\agy.exe.<退避時刻 ns>.old と、Linux・WSL の
// ~/.local/bin/agy.<退避時刻 ns>.old のうち、同じ場所に現行の agy があり、中身が実行ファイルで、
// 退避から 15 分以上経過し、自動更新のロックが保持されておらず、実行中でないもの。
export const AGY_OLD_BINARIES_KEY = 'old-binaries';

// settings.json のスカラーだけをテーブル編集し、配列・オブジェクトは直接編集へ送る。
// キーバインドは Claude 相当機能ではないため、この registry には含めない。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    {
        key: 'colorScheme',
        path: 'colorScheme',
        group: 'appearance',
        type: 'string',
        choices: [
            'terminal',
            'light',
            'solarized light',
            'colorblind-friendly light',
            'dark',
            'solarized dark',
            'colorblind-friendly dark',
            'tokyo night',
        ],
        defaultValue: 'terminal',
    },
    {
        key: 'altScreenMode',
        path: 'altScreenMode',
        group: 'appearance',
        type: 'string',
        choices: ['default', 'always', 'never'],
        defaultValue: 'default',
    },
    { key: 'notifications', path: 'notifications', group: 'appearance', type: 'boolean', defaultOn: false },
    { key: 'showTips', path: 'showTips', group: 'appearance', type: 'boolean', defaultOn: true },
    { key: 'showFeedbackSurvey', path: 'showFeedbackSurvey', group: 'appearance', type: 'boolean', defaultOn: true },
    {
        key: 'verbosity',
        path: 'verbosity',
        group: 'appearance',
        type: 'string',
        choices: ['high', 'medium', 'low'],
        defaultValue: 'medium',
    },
    {
        key: 'runningLightSpeed',
        path: 'runningLightSpeed',
        group: 'appearance',
        type: 'string',
        choices: ['fast', 'medium', 'slow', 'off'],
        defaultValue: 'medium',
    },
    {
        key: 'editor',
        path: 'editor',
        group: 'behavior',
        type: 'string',
        choices: ['auto', 'vim', 'emacs'],
        allowCustom: true,
        defaultValue: 'auto',
    },
    {
        key: 'editorMode',
        path: 'editorMode',
        group: 'behavior',
        type: 'string',
        choices: ['default', 'vim'],
        defaultValue: 'default',
    },
    { key: 'vimInsertFirst', path: 'vimInsertFirst', group: 'behavior', type: 'boolean', defaultOn: false },
    { key: 'copyOnSelect', path: 'copyOnSelect', group: 'behavior', type: 'boolean', defaultOn: true },
    // 既定（ターン終了まで保持）は未設定で表す。CLI は既定と異なる値だけを書き込む。
    {
        key: 'queuedMessages',
        path: 'queuedMessages',
        group: 'behavior',
        type: 'string',
        choices: ['send-immediately'],
    },
    {
        key: 'toolPermission',
        path: 'toolPermission',
        group: 'security',
        type: 'string',
        choices: ['request-review', 'proceed-in-sandbox', 'always-proceed', 'strict'],
        defaultValue: 'request-review',
    },
    {
        key: 'agentMode',
        path: 'agentMode',
        group: 'security',
        type: 'string',
        choices: ['default', 'accept-edits', 'plan'],
        defaultValue: 'default',
    },
    {
        key: 'artifactReviewPolicy',
        path: 'artifactReviewPolicy',
        group: 'security',
        type: 'string',
        choices: ['asks-for-review', 'agent-decides', 'always-proceed'],
        defaultValue: 'asks-for-review',
    },
    {
        key: 'allowNonWorkspaceAccess',
        path: 'allowNonWorkspaceAccess',
        group: 'security',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'enableTerminalSandbox',
        path: 'enableTerminalSandbox',
        group: 'security',
        type: 'boolean',
        defaultOn: false,
    },
    // 未設定は Google アカウントでのサインインを使う。
    {
        key: 'modelProvider',
        path: 'modelProvider',
        group: 'data',
        type: 'string',
        choices: ['gemini'],
        allowCustom: true,
    },
    { key: 'enableTelemetry', path: 'enableTelemetry', group: 'data', type: 'boolean', defaultOn: true },
    { key: 'useG1Credits', path: 'useG1Credits', group: 'data', type: 'boolean', defaultOn: false },
    { key: 'permissions', path: 'permissions', group: 'advanced', type: 'directEdit' },
    { key: 'statusLine', path: 'statusLine', group: 'advanced', type: 'directEdit' },
    { key: 'title', path: 'title', group: 'advanced', type: 'directEdit' },
    { key: 'hooks', path: 'hooks', group: 'advanced', type: 'directEdit' },
];
