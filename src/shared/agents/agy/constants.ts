import type { CleanupCandidateSpec, PluginCapabilities, SettingsFieldSpec } from '../types';

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
// CLI がスキルを読む他のルート。~/.gemini/skills は CLI のみ、config/skills は App と CLI で共有する。
export const AGY_SHARED_SKILLS_REL = '.gemini/skills';
export const AGY_CONFIG_SKILLS_REL = `${AGY_SHARED_CONFIG_DIR}/skills`;
export const AGY_PLUGINS_REL = `${AGY_SHARED_CONFIG_DIR}/plugins`;
// プロジェクトの定義（<id>.json）。App と共有している。
export const AGY_PROJECT_DEFINITIONS_REL = `${AGY_SHARED_CONFIG_DIR}/projects`;

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
    READ_RAW: 'agy-settings:read-raw',
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
};

// 自動更新が保持するロック（更新処理中は保持される）。
export const AGY_UPDATE_LOCK_REL = `${AGY_CLI_DIR}/updater/update.lock`;

// 子要素をハンドラーかリゾルバで特定する候補と、削除後に付随データを片付ける候補のキー。
export const AGY_PROJECTS_CLEANUP_KEY = 'projects';
export const AGY_TRUSTED_WORKSPACES_CLEANUP_KEY = 'trusted-workspaces';
export const AGY_CONVERSATIONS_CLEANUP_KEY = 'conversations';
export const AGY_ANNOTATIONS_CLEANUP_KEY = 'annotations';
export const AGY_CHAPTER_TITLES_CLEANUP_KEY = 'chapter-titles';
export const AGY_VOICE_CHATS_CLEANUP_KEY = 'voice-chats';
export const AGY_BROWSER_RECORDINGS_CLEANUP_KEY = 'browser-recordings';

// 再生成されるデータと会話データ、ワークスペースのパス単位の記録だけを並べる。keybindings.json・skills・bin・
// builtin・plugin_data・knowledge・implicit・認証トークン・実行中セッションのロック（presence）は対象にしない。
// settings.json は trusted-workspaces の要素だけを消す。
// cli.log は log 配下の最新ログを指すシンボリックリンクのため、ログの実体は log で扱う。
// update-lock は自動更新が保持していないときだけ扱う。old-binaries は ~/.gemini の外にある
// 退避済みの旧実行ファイルの特別候補（AGY_OLD_BINARIES_KEY）。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    // ワークスペースのパスごとの行。そのパスの会話、入力履歴の行、直近の会話の記録、定義の該当フォルダを消す。
    { key: AGY_PROJECTS_CLEANUP_KEY, defaultChecked: false, expandable: true, childKind: 'dir' },
    // settings.json の trustedWorkspaces の要素ごとの行。
    {
        key: AGY_TRUSTED_WORKSPACES_CLEANUP_KEY,
        defaultChecked: false,
        expandable: true,
        childKind: 'file',
        editsFileOnly: true,
    },
    { key: 'cache', defaultChecked: false },
    { key: 'log', defaultChecked: false },
    { key: 'crashes', defaultChecked: false },
    // 会話は 1 会話ごとの SQLite ファイル（.db と -wal / -shm）として保存される。
    { key: AGY_CONVERSATIONS_CLEANUP_KEY, defaultChecked: false, expandable: true, childKind: 'file' },
    // 会話のファイルが無くなった付随データの行。
    { key: AGY_ANNOTATIONS_CLEANUP_KEY, defaultChecked: false, expandable: true, childKind: 'file' },
    { key: AGY_CHAPTER_TITLES_CLEANUP_KEY, defaultChecked: false, expandable: true, childKind: 'file' },
    { key: AGY_VOICE_CHATS_CLEANUP_KEY, defaultChecked: false, expandable: true, childKind: 'file' },
    { key: AGY_BROWSER_RECORDINGS_CLEANUP_KEY, defaultChecked: false, expandable: true, childKind: 'dir' },
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
    { key: 'hideActiveItems', path: 'hideActiveItems', group: 'appearance', type: 'boolean', defaultOn: false },
    { key: 'useTerminalCursor', path: 'useTerminalCursor', group: 'appearance', type: 'boolean', defaultOn: false },
    {
        key: 'clearScrollbackOnResize',
        path: 'clearScrollbackOnResize',
        group: 'appearance',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'editor', path: 'editor', group: 'behavior', type: 'directEdit', linkTab: 'externalCommands' },
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
    {
        key: 'queuedMessages',
        path: 'queuedMessages',
        group: 'behavior',
        type: 'string',
        choices: ['queue', 'send-immediately'],
        defaultValue: 'queue',
    },
    {
        key: 'pickerGrouping',
        path: 'pickerGrouping',
        group: 'behavior',
        type: 'string',
        choices: ['none', 'grouped'],
        defaultValue: 'none',
    },
    {
        key: 'historySize',
        path: 'historySize',
        group: 'behavior',
        type: 'number',
        min: -1,
        integer: true,
        defaultValue: 2000,
    },
    {
        key: 'disableSlashCommands',
        path: 'disableSlashCommands',
        group: 'behavior',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'toolPermission',
        path: 'toolPermission',
        group: 'security',
        type: 'string',
        choices: ['request-review', 'proceed-in-sandbox', 'always-proceed', 'strict'],
        defaultValue: 'request-review',
    },
    // 既定（ファイル編集の前に確認する）は未設定で表す。default は /config の表示名で、スキーマの値にない。
    {
        key: 'agentMode',
        path: 'agentMode',
        group: 'security',
        type: 'string',
        choices: ['accept-edits', 'auto', 'plan'],
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
    // /model で選んだモデルの表示名が入る。未設定は既定のモデルを使う。
    { key: 'model', path: 'model', group: 'data', type: 'string', allowCustom: true },
    // 未設定は Google アカウントでのサインインを使う。
    {
        key: 'modelProvider',
        path: 'modelProvider',
        group: 'data',
        type: 'string',
        choices: ['gemini'],
    },
    { key: 'useG1Credits', path: 'useG1Credits', group: 'data', type: 'boolean', defaultOn: false },
    { key: 'permissions', path: 'permissions', group: 'advanced', type: 'directEdit', linkTab: 'permissions' },
    { key: 'statusLine', path: 'statusLine', group: 'advanced', type: 'directEdit', linkTab: 'statusLine' },
    { key: 'title', path: 'title', group: 'advanced', type: 'directEdit', linkTab: 'externalCommands' },
    // settings.json の hooks は CLI に読まれないため、編集先のタブへのリンクとして置く。
    { key: 'hooks', path: 'hooks', group: 'advanced', type: 'directEdit', linkTab: 'hooks' },
    { key: 'customModelsConfig', path: 'customModelsConfig', group: 'advanced', type: 'directEdit' },
    { key: 'sandboxProxy', path: 'sandboxProxy', group: 'advanced', type: 'directEdit' },
];
