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
    { key: 'autoupdate', path: 'autoupdate', group: 'behavior', type: 'directEdit' },
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
    { key: 'enterprise', path: 'enterprise', group: 'advanced', type: 'directEdit' },
    { key: 'toolOutput', path: 'tool_output', group: 'advanced', type: 'directEdit' },
    { key: 'mcp', path: 'mcp', group: 'advanced', type: 'directEdit' },
    { key: 'plugin', path: 'plugin', group: 'advanced', type: 'directEdit' },
    { key: 'instructions', path: 'instructions', group: 'advanced', type: 'directEdit' },
    { key: 'disabledProviders', path: 'disabled_providers', group: 'advanced', type: 'directEdit' },
    { key: 'enabledProviders', path: 'enabled_providers', group: 'advanced', type: 'directEdit' },
    { key: 'experimental', path: 'experimental', group: 'advanced', type: 'directEdit' },
];
