import type { AssetKind, CleanupCandidateSpec, PluginCapabilities, SettingsFieldSpec } from '../types';

export const OPENCODE_CONFIG_DIR = '.config/opencode';
export const OPENCODE_CONFIG_REL = `${OPENCODE_CONFIG_DIR}/opencode.json`;
// 無効化した MCP はエントリごと sidecar ファイルへ退避する（他 agent と同じ方式）。
// 命名は Claude Code（.claude.json → .claude-disabled-mcp.json）と同じ
// 「<設定ファイル名>-disabled-mcp.<ext>」ルールに従う。
export const OPENCODE_DISABLED_MCP_REL = `${OPENCODE_CONFIG_DIR}/opencode-disabled-mcp.json`;
export const OPENCODE_AGENTS_REL = `${OPENCODE_CONFIG_DIR}/agents`;
export const OPENCODE_SKILLS_REL = `${OPENCODE_CONFIG_DIR}/skills`;
export const OPENCODE_PLUGINS_REL = `${OPENCODE_CONFIG_DIR}/plugins`;
export const OPENCODE_DISABLED_PLUGINS_REL = `${OPENCODE_CONFIG_DIR}/plugins-disabled`;
export const OPENCODE_DISABLED_NPM_PLUGINS_REL = `${OPENCODE_CONFIG_DIR}/disabled-npm-plugins.json`;

export const ASSET_PARENT_REL: Record<AssetKind, string> = {
    agents: OPENCODE_AGENTS_REL,
    skills: OPENCODE_SKILLS_REL,
};

export const OPENCODE_CLI_COMMAND = 'opencode';
// WSL distro の検出は他 agent と同じくディレクトリ存在チェックで行う。
// bash -lc（非対話シェル）では .bashrc の PATH 追記が効かず `command -v opencode` が
// 失敗し得るため、CLI 実行による判定は使わない。
export const OPENCODE_WSL_CLI_TEST = `test -d ~/${OPENCODE_CONFIG_DIR}`;

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
};

// OpenCode の公式 XDG ディレクトリだけを対象にする。認証ファイルと設定資産は除外する。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: 'cache', path: '.cache/opencode', defaultChecked: false },
    { key: 'logs', path: '.local/share/opencode/log', defaultChecked: false },
    { key: 'repos', path: '.local/share/opencode/repos', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'database', path: '.local/share/opencode/opencode.db', kind: 'file', defaultChecked: false },
    { key: 'database-wal', path: '.local/share/opencode/opencode.db-wal', kind: 'file', defaultChecked: false },
    { key: 'database-shm', path: '.local/share/opencode/opencode.db-shm', kind: 'file', defaultChecked: false },
    { key: 'locks', path: '.local/state/opencode/locks', defaultChecked: false },
];

// トップレベルの単一スカラーのみテーブル編集。配列・マップ・オブジェクトと union 型は直接編集。
// TUI 専用 tui.json / keybinds は Claude の機能対応外なので扱わない。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    { key: 'model', path: 'model', group: 'model', type: 'string', allowCustom: true },
    { key: 'smallModel', path: 'small_model', group: 'model', type: 'string', allowCustom: true },
    { key: 'defaultAgent', path: 'default_agent', group: 'model', type: 'string', allowCustom: true },
    {
        key: 'subagentDepth',
        path: 'subagent_depth',
        group: 'model',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 1,
    },
    { key: 'username', path: 'username', group: 'behavior', type: 'string' },
    { key: 'shell', path: 'shell', group: 'behavior', type: 'string', allowCustom: true },
    {
        key: 'logLevel',
        path: 'logLevel',
        group: 'behavior',
        type: 'string',
        choices: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
    },
    {
        key: 'share',
        path: 'share',
        group: 'behavior',
        type: 'string',
        choices: ['manual', 'auto', 'disabled'],
        defaultValue: 'manual',
    },
    { key: 'snapshot', path: 'snapshot', group: 'behavior', type: 'boolean', defaultOn: true },
    // autoupdate は boolean（true/false）でも文字列 "notify" でも書ける型混在キー。
    // 候補ごとに型を保持し、選択された値を真偽値 / 文字列のまま書き分ける。
    {
        key: 'autoupdate',
        path: 'autoupdate',
        group: 'behavior',
        type: 'enum',
        enumChoices: [
            { value: true, labelKey: 'enabled' },
            { value: false, labelKey: 'disabled' },
            { value: 'notify', labelKey: 'notify' },
        ],
    },
    // ネストしたスカラー（server.* / attachment.image.* など）もテーブル編集できる。
    // 親オブジェクト（server / attachment / compaction ...）は複合値も含むため directEdit 側にも残す。
    { key: 'serverPort', path: 'server.port', group: 'server', type: 'number', min: 1, max: 65535, integer: true },
    { key: 'serverHostname', path: 'server.hostname', group: 'server', type: 'string', defaultValue: '0.0.0.0' },
    { key: 'serverMdns', path: 'server.mdns', group: 'server', type: 'boolean' },
    {
        key: 'serverMdnsDomain',
        path: 'server.mdnsDomain',
        group: 'server',
        type: 'string',
        defaultValue: 'opencode.local',
    },
    { key: 'serverCors', path: 'server.cors', group: 'server', type: 'directEdit' },
    {
        key: 'attachmentImageAutoResize',
        path: 'attachment.image.auto_resize',
        group: 'attachment',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'attachmentImageMaxWidth',
        path: 'attachment.image.max_width',
        group: 'attachment',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 2000,
    },
    {
        key: 'attachmentImageMaxHeight',
        path: 'attachment.image.max_height',
        group: 'attachment',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 2000,
    },
    {
        key: 'attachmentImageMaxBase64Bytes',
        path: 'attachment.image.max_base64_bytes',
        group: 'attachment',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 5242880,
    },
    {
        key: 'toolOutputMaxLines',
        path: 'tool_output.max_lines',
        group: 'toolOutput',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 2000,
    },
    {
        key: 'toolOutputMaxBytes',
        path: 'tool_output.max_bytes',
        group: 'toolOutput',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 51200,
    },
    { key: 'compactionAuto', path: 'compaction.auto', group: 'compaction', type: 'boolean', defaultOn: true },
    { key: 'compactionPrune', path: 'compaction.prune', group: 'compaction', type: 'boolean', defaultOn: false },
    {
        key: 'compactionTailTurns',
        path: 'compaction.tail_turns',
        group: 'compaction',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 2,
    },
    {
        key: 'compactionPreserveRecentTokens',
        path: 'compaction.preserve_recent_tokens',
        group: 'compaction',
        type: 'number',
        min: 0,
        integer: true,
    },
    {
        key: 'compactionReserved',
        path: 'compaction.reserved',
        group: 'compaction',
        type: 'number',
        min: 0,
        integer: true,
    },
    {
        key: 'permissionRead',
        path: 'permission.read',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionEdit',
        path: 'permission.edit',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionGlob',
        path: 'permission.glob',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionGrep',
        path: 'permission.grep',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionList',
        path: 'permission.list',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionBash',
        path: 'permission.bash',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionTask',
        path: 'permission.task',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionExternalDirectory',
        path: 'permission.external_directory',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionLsp',
        path: 'permission.lsp',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionSkill',
        path: 'permission.skill',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionTodowrite',
        path: 'permission.todowrite',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionQuestion',
        path: 'permission.question',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionWebfetch',
        path: 'permission.webfetch',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionWebsearch',
        path: 'permission.websearch',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'permissionDoomLoop',
        path: 'permission.doom_loop',
        group: 'permission',
        type: 'string',
        choices: ['ask', 'allow', 'deny'],
    },
    {
        key: 'experimentalDisablePasteSummary',
        path: 'experimental.disable_paste_summary',
        group: 'experimental',
        type: 'boolean',
    },
    { key: 'experimentalBatchTool', path: 'experimental.batch_tool', group: 'experimental', type: 'boolean' },
    { key: 'experimentalOpenTelemetry', path: 'experimental.openTelemetry', group: 'experimental', type: 'boolean' },
    {
        key: 'experimentalContinueLoopOnDeny',
        path: 'experimental.continue_loop_on_deny',
        group: 'experimental',
        type: 'boolean',
    },
    {
        key: 'experimentalMcpTimeout',
        path: 'experimental.mcp_timeout',
        group: 'experimental',
        type: 'number',
        min: 0,
        integer: true,
    },
    { key: 'experimentalPrimaryTools', path: 'experimental.primary_tools', group: 'experimental', type: 'directEdit' },
    { key: 'experimentalPolicies', path: 'experimental.policies', group: 'experimental', type: 'directEdit' },
    { key: 'skills', path: 'skills', group: 'advanced', type: 'directEdit' },
    { key: 'references', path: 'references', group: 'advanced', type: 'directEdit' },
    { key: 'provider', path: 'provider', group: 'advanced', type: 'directEdit' },
    { key: 'agent', path: 'agent', group: 'advanced', type: 'directEdit' },
    { key: 'permission', path: 'permission', group: 'advanced', type: 'directEdit' },
    { key: 'tools', path: 'tools', group: 'advanced', type: 'directEdit' },
    { key: 'server', path: 'server', group: 'advanced', type: 'directEdit' },
    { key: 'command', path: 'command', group: 'advanced', type: 'directEdit' },
    { key: 'formatter', path: 'formatter', group: 'advanced', type: 'directEdit' },
    { key: 'lsp', path: 'lsp', group: 'advanced', type: 'directEdit' },
    { key: 'compaction', path: 'compaction', group: 'advanced', type: 'directEdit' },
    { key: 'watcher', path: 'watcher', group: 'advanced', type: 'directEdit' },
    { key: 'attachment', path: 'attachment', group: 'advanced', type: 'directEdit' },
    { key: 'toolOutput', path: 'tool_output', group: 'advanced', type: 'directEdit' },
    { key: 'mcp', path: 'mcp', group: 'advanced', type: 'directEdit' },
    { key: 'plugin', path: 'plugin', group: 'advanced', type: 'directEdit' },
    { key: 'instructions', path: 'instructions', group: 'advanced', type: 'directEdit' },
    { key: 'disabledProviders', path: 'disabled_providers', group: 'advanced', type: 'directEdit' },
    { key: 'enabledProviders', path: 'enabled_providers', group: 'advanced', type: 'directEdit' },
    { key: 'experimental', path: 'experimental', group: 'advanced', type: 'directEdit' },
];
