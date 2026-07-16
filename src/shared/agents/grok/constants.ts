// ============================================================
// Grok 固有の定数・IPC チャンネル・レジストリ
// ------------------------------------------------------------
// Grok CLI (Grok Build, @xai-official/grok) を対象とする。
// 対象は ~/.grok 配下のみ（共有の ~/.agents/skills や、Grok が互換読み込みする
// ~/.claude 系の設定には一切触れない）。
// ============================================================
import type {
    AssetKind,
    CleanupCandidateSpec,
    OtherCleanupItem,
    PluginCapabilities,
    SettingsFieldSpec,
} from '../types';

// ============================================================
// Grok のパス（すべて HOME 相対、区切りは '/'）
// ============================================================

// Grok CLI のデータディレクトリ（~/.grok）
export const GROK_DIR = '.grok';
// Grok 設定ファイル（~/.grok/config.toml）
export const GROK_CONFIG_REL = `${GROK_DIR}/config.toml`;
// 無効化した MCP の退避先（~/.grok/config-disabled-mcp.toml）。無効化した TOML ブロックを保持する。
export const GROK_DISABLED_MCP_REL = `${GROK_DIR}/config-disabled-mcp.toml`;
// カスタムエージェントのディレクトリ（~/.grok/agents、直下の *.md のみ・非再帰）
export const GROK_AGENTS_REL = `${GROK_DIR}/agents`;
// ユーザースキルのディレクトリ（~/.grok/skills、<skill>/SKILL.md）
export const GROK_SKILLS_REL = `${GROK_DIR}/skills`;
// AssetKind → 親ディレクトリ（HOME 相対）
export const ASSET_PARENT_REL: Record<AssetKind, string> = {
    agents: GROK_AGENTS_REL,
    skills: GROK_SKILLS_REL,
};

// WSL distro に Grok CLI が導入されているかの判定コマンド（bash -lc で実行）。
// 共通 WslDetector.getDistrosWithTest() に渡す。
export const GROK_WSL_CLI_TEST = `test -d ~/${GROK_DIR}`;

// ============================================================
// IPC チャンネル
// ============================================================

// Grok MCP 管理用
export const GROK_MCP_CHANNELS = {
    GET_ENVIRONMENTS: 'grok-mcp:get-environments',
    GET_MCP_SERVERS: 'grok-mcp:get-mcp-servers',
    ENABLE: 'grok-mcp:enable-mcp-server',
    DISABLE: 'grok-mcp:disable-mcp-server',
    REORDER: 'grok-mcp:reorder-mcp-servers',
    REORDER_DISABLED: 'grok-mcp:reorder-disabled-mcp-servers',
} as const;

// Grok Agent・Skill 管理用
export const GROK_ASSET_CHANNELS = {
    GET_ENVIRONMENTS: 'grok-asset:get-environments',
    LIST: 'grok-asset:list',
    READ_ENTRY: 'grok-asset:read-entry',
    DOWNLOAD: 'grok-asset:download',
    INSPECT_UPLOAD: 'grok-asset:inspect-upload',
    UPLOAD: 'grok-asset:upload',
    UPLOAD_MD: 'grok-asset:upload-md',
    DELETE: 'grok-asset:delete',
    IS_GIT_AVAILABLE: 'grok-asset:is-git-available',
    LIST_OFFICIAL_SKILLS: 'grok-asset:list-official-skills',
    IMPORT_OFFICIAL_SKILLS: 'grok-asset:import-official-skills',
} as const;

// Grok クリーンアップ用
export const GROK_CLEANUP_CHANNELS = {
    GET_ENVIRONMENTS: 'grok-cleanup:get-environments',
    SCAN: 'grok-cleanup:scan',
    DELETE: 'grok-cleanup:delete',
    GET_OTHER_ENVIRONMENTS: 'grok-cleanup:get-other-environments',
    SCAN_OTHER: 'grok-cleanup:scan-other',
    DELETE_OTHER: 'grok-cleanup:delete-other',
} as const;

// Grok 設定（config.toml）管理用
export const GROK_CONFIG_CHANNELS = {
    GET_ENVIRONMENTS: 'grok-config:get-environments',
    READ: 'grok-config:read',
    WRITE: 'grok-config:write',
    WRITE_RAW: 'grok-config:write-raw',
} as const;

// Grok プラグイン管理用
export const GROK_PLUGIN_CHANNELS = {
    GET_ENVIRONMENTS: 'grok-plugin:get-environments',
    LIST: 'grok-plugin:list',
    CATALOG: 'grok-plugin:catalog',
    INSTALL: 'grok-plugin:install',
    INSTALL_FROM_SOURCE: 'grok-plugin:install-from-source',
    UNINSTALL: 'grok-plugin:uninstall',
    SET_ENABLED: 'grok-plugin:set-enabled',
    ADD_MARKETPLACE: 'grok-plugin:add-marketplace',
    REMOVE_MARKETPLACE: 'grok-plugin:remove-marketplace',
} as const;

// ============================================================
// プラグイン管理
// ============================================================

// ヘッドレス実行する CLI コマンド名
export const GROK_CLI_COMMAND = 'grok';

// 組み込みマーケットプレイス（初回起動時に自動登録される。削除ボタンを無効化する）
export const GROK_BUILTIN_MARKETPLACES = ['xAI Official'];

// Claude 由来の外部マーケットプレイスのうち、プラグイン追加ダイアログで
// インストール元として選択を許可するもの（公式のみ）。ユーザーが Claude 用に追加した
// 外部マーケットは Grok のインストール元として提示しない。
export const GROK_SELECTABLE_EXTERNAL_MARKETPLACES = ['claude-plugins-official'];

// GUI の機能出し分け。
// - directInstall=true: `grok plugin install <git URL | owner/repo | ローカルパス>` で
//   個別リポジトリから 1 コマンドで直接インストールできる（@ref / #subdir 対応）。
// - marketplaceRemoteUrl=false: marketplace.json への直接 URL 指定は非対応。
export const GROK_PLUGIN_CAPABILITIES: PluginCapabilities = {
    directInstall: true,
    marketplaceRemoteUrl: false,
};

// ============================================================
// クリーンアップ候補
// ============================================================

// クリーンアップ候補（~/.grok 配下）。対象は履歴／キャッシュ／一時／ログ／旧バイナリのみ。
// config.toml / auth.json / settings.json / skills / agents / plugins / hooks /
// personas / roles / rules / commands / prompts（設定・資産）は対象外。
// 'bin-old-versions' は ~/.grok/bin 配下の旧バージョンバイナリ（grok-<version>）のみを
// 対象とする特別候補（現行バージョンと起動用の grok / grok.exe は除外して保護する）。
// デフォルトはすべてチェック OFF（ユーザーが明示的に選択する）。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: 'sessions', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'memory', defaultChecked: false },
    { key: 'debug', defaultChecked: false },
    { key: 'plans', defaultChecked: false },
    { key: 'docs', defaultChecked: false },
    { key: 'sandbox-events', defaultChecked: false, kind: 'file', path: 'sandbox-events.jsonl' },
    { key: 'bin-old-versions', defaultChecked: false, expandable: true, childKind: 'file', path: 'bin' },
];

// bin 旧バイナリ候補のキー（GrokCleanupManager が特別扱いする）
export const CLEANUP_BIN_OLD_KEY = 'bin-old-versions';

// 「その他のツール」クリーンアップ項目の registry（~/.grok 配下ではないもの）。
// targetPath / requiresPath はすべて HOME 相対。
export const OTHER_CLEANUP_ITEMS: OtherCleanupItem[] = [
    {
        key: 'serena-projects',
        action: 'yaml-list-clear',
        targetPath: '.serena/serena_config.yml',
        yamlKey: 'projects',
        metricKind: 'count',
        requiresPath: '.serena/serena_config.yml',
        defaultChecked: false,
        group: 'serena',
    },
    {
        key: 'serena-logs',
        action: 'dir-delete',
        targetPath: '.serena/logs',
        metricKind: 'size',
        requiresPath: '.serena/logs',
        defaultChecked: false,
        group: 'serena',
    },
];

// ============================================================
// Grok 設定（config.toml）編集レジストリ
// ============================================================

// config.toml の設定項目 registry。公式 settings リファレンス準拠。
// path はドット区切りキー（ネストは該当 [table] に書き込む）。配列・マップ・動的テーブルは
// directEdit として一覧へ表示するだけでテーブル保存から除外する。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    // === モデル ===
    {
        key: 'modelsDefault',
        path: 'models.default',
        group: 'model',
        type: 'string',
        choices: ['grok-build', 'grok-4.5', 'grok-4.20-multi-agent'],
        allowCustom: true,
    },
    {
        key: 'modelsWebSearch',
        path: 'models.web_search',
        group: 'model',
        type: 'string',
        choices: ['grok-build', 'grok-4.5', 'grok-4.20-multi-agent'],
        allowCustom: true,
    },
    {
        key: 'modelsDefaultReasoningEffort',
        path: 'models.default_reasoning_effort',
        group: 'model',
        type: 'string',
        choices: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
        allowCustom: true,
    },
    {
        key: 'modelsSessionSummary',
        path: 'models.session_summary',
        group: 'model',
        type: 'string',
        choices: ['grok-build', 'grok-4.5', 'grok-4.20-multi-agent'],
        allowCustom: true,
    },
    {
        key: 'modelsImageDescription',
        path: 'models.image_description',
        group: 'model',
        type: 'string',
        choices: ['grok-build', 'grok-4.5', 'grok-4.20-multi-agent'],
        allowCustom: true,
    },
    { key: 'modelsTemperature', path: 'models.temperature', group: 'model', type: 'number', min: 0, max: 2 },
    { key: 'modelsTopP', path: 'models.top_p', group: 'model', type: 'number', min: 0, max: 1 },
    {
        key: 'modelsMaxCompletionTokens',
        path: 'models.max_completion_tokens',
        group: 'model',
        type: 'number',
        min: 1,
        integer: true,
    },
    { key: 'modelsMaxRetries', path: 'models.max_retries', group: 'model', type: 'number', min: 0, integer: true },
    { key: 'modelsStreamToolCalls', path: 'models.stream_tool_calls', group: 'model', type: 'boolean' },
    { key: 'modelsExtraHeaders', path: 'models.extra_headers', group: 'model', type: 'directEdit' },
    { key: 'modelsAllowedModels', path: 'models.allowed_models', group: 'model', type: 'directEdit' },
    { key: 'modelsHiddenModels', path: 'models.hidden_models', group: 'model', type: 'directEdit' },
    { key: 'modelsDisabledModels', path: 'models.disabled_models', group: 'model', type: 'directEdit' },
    { key: 'customModels', path: 'model.<id>', group: 'model', type: 'directEdit' },

    // === セキュリティ・動作 ===
    // sandbox.profile はカスタムプロファイル名も指定できる。
    {
        key: 'sandboxProfile',
        path: 'sandbox.profile',
        group: 'security',
        type: 'string',
        choices: ['off', 'workspace', 'devbox', 'read-only', 'strict'],
        allowCustom: true,
        defaultValue: 'off',
    },
    {
        key: 'sandboxAutoAllowBash',
        path: 'sandbox.auto_allow_bash',
        group: 'security',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'toolsRespectGitignore',
        path: 'tools.respect_gitignore',
        group: 'security',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'toolsetFileToolset',
        path: 'toolset.file_toolset',
        group: 'security',
        type: 'string',
        choices: ['standard', 'hashline'],
        defaultValue: 'standard',
    },
    {
        key: 'toolsetBashTimeoutSecs',
        path: 'toolset.bash.timeout_secs',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'toolsetBashOutputByteLimit',
        path: 'toolset.bash.output_byte_limit',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'toolsetBashMaxTimeoutSecs',
        path: 'toolset.bash.max_timeout_secs',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'toolsetBashAutoBackground',
        path: 'toolset.bash.auto_background_on_timeout',
        group: 'security',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'toolsetWebFetchProxyEndpoint',
        path: 'toolset.web_fetch.proxy_endpoint',
        group: 'security',
        type: 'string',
    },
    {
        key: 'sessionAutoCompactThreshold',
        path: 'session.auto_compact_threshold_percent',
        group: 'security',
        type: 'number',
        min: 0,
        max: 100,
    },
    { key: 'sessionLoadEnvrc', path: 'session.load_envrc', group: 'security', type: 'boolean', defaultOn: true },
    { key: 'memoryEnabled', path: 'memory.enabled', group: 'security', type: 'boolean', defaultOn: false },
    { key: 'subagentsEnabled', path: 'subagents.enabled', group: 'security', type: 'boolean', defaultOn: false },
    {
        key: 'toolsetWebFetchAllowedDomains',
        path: 'toolset.web_fetch.allowed_domains',
        group: 'security',
        type: 'directEdit',
    },
    { key: 'mcpServers', path: 'mcp_servers.<name>', group: 'security', type: 'directEdit' },
    { key: 'permission', path: 'permission', group: 'security', type: 'directEdit' },
    { key: 'subagentsToggle', path: 'subagents.toggle', group: 'security', type: 'directEdit' },
    { key: 'subagentsModels', path: 'subagents.models', group: 'security', type: 'directEdit' },

    // === 表示・CLI ===
    { key: 'cliAutoUpdate', path: 'cli.auto_update', group: 'cli', type: 'boolean', defaultOn: true },
    { key: 'cliChannel', path: 'cli.channel', group: 'cli', type: 'string', choices: ['stable', 'alpha'] },
    { key: 'cliShowTips', path: 'cli.show_tips', group: 'cli', type: 'boolean', defaultOn: true },
    {
        key: 'hintsNewSessionWorktreeMode',
        path: 'hints.new_session_worktree_mode',
        group: 'cli',
        type: 'string',
        choices: ['ask', 'always', 'never'],
        defaultValue: 'never',
    },
    {
        key: 'hintsForkWorktreeMode',
        path: 'hints.fork_worktree_mode',
        group: 'cli',
        type: 'string',
        choices: ['ask', 'always', 'never'],
        defaultValue: 'ask',
    },
    { key: 'uiCompactMode', path: 'ui.compact_mode', group: 'cli', type: 'boolean' },
    {
        key: 'uiScreenMode',
        path: 'ui.screen_mode',
        group: 'cli',
        type: 'string',
        choices: ['fullscreen', 'minimal'],
    },
    { key: 'uiShowTimestamps', path: 'ui.show_timestamps', group: 'cli', type: 'boolean', defaultOn: true },
    { key: 'uiShowTimeline', path: 'ui.show_timeline', group: 'cli', type: 'boolean' },
    { key: 'uiSimpleMode', path: 'ui.simple_mode', group: 'cli', type: 'boolean', defaultOn: true },
    {
        key: 'uiTheme',
        path: 'ui.theme',
        group: 'cli',
        type: 'string',
        choices: ['auto', 'groknight', 'grokday', 'tokyonight', 'rosepine-moon', 'oscura-midnight'],
    },
    {
        key: 'uiRenderMermaid',
        path: 'ui.render_mermaid',
        group: 'cli',
        type: 'string',
        choices: ['auto', 'on', 'off'],
    },
    { key: 'uiRememberToolApprovals', path: 'ui.remember_tool_approvals', group: 'cli', type: 'boolean' },
    {
        key: 'uiShowThinkingBlocks',
        path: 'ui.show_thinking_blocks',
        group: 'cli',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'uiPromptSuggestions', path: 'ui.prompt_suggestions', group: 'cli', type: 'boolean' },
    { key: 'uiGroupToolVerbs', path: 'ui.group_tool_verbs', group: 'cli', type: 'boolean', defaultOn: true },
    {
        key: 'uiCollapsedEditBlocks',
        path: 'ui.collapsed_edit_blocks',
        group: 'cli',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'uiScrollSpeed', path: 'ui.scroll_speed', group: 'cli', type: 'number', min: 1, max: 100, integer: true },
    {
        key: 'uiScrollMode',
        path: 'ui.scroll_mode',
        group: 'cli',
        type: 'string',
        choices: ['auto', 'wheel', 'trackpad'],
    },
    { key: 'uiScrollLines', path: 'ui.scroll_lines', group: 'cli', type: 'number', min: 1, max: 10, integer: true },
    { key: 'uiInvertScroll', path: 'ui.invert_scroll', group: 'cli', type: 'boolean' },
    {
        key: 'uiKeepTextSelection',
        path: 'ui.keep_text_selection',
        group: 'cli',
        type: 'string',
        choices: ['flash', 'hold', 'word-select'],
    },

    // === 機能 ===
    { key: 'featuresWebFetch', path: 'features.web_fetch', group: 'features', type: 'boolean', defaultOn: false },
    { key: 'featuresRemoteFetch', path: 'features.remote_fetch', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresLspTools', path: 'features.lsp_tools', group: 'features', type: 'boolean', defaultOn: false },
    { key: 'featuresWriteFile', path: 'features.write_file', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresToolSearch', path: 'features.tool_search', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresImageGen', path: 'features.image_gen', group: 'features', type: 'boolean' },
    { key: 'featuresImageEdit', path: 'features.image_edit', group: 'features', type: 'boolean' },
    { key: 'featuresVideoGen', path: 'features.video_gen', group: 'features', type: 'boolean' },
    { key: 'telemetryTraceUpload', path: 'telemetry.trace_upload', group: 'features', type: 'boolean' },
    { key: 'cliUseLeader', path: 'cli.use_leader', group: 'cli', type: 'boolean' },
    { key: 'cliMinimumVersion', path: 'cli.minimum_version', group: 'cli', type: 'string' },
    {
        key: 'harnessDisableCodebaseUpload',
        path: 'harness.disable_codebase_upload',
        group: 'features',
        type: 'boolean',
    },
    { key: 'managedMcpsEnabled', path: 'managed_mcps.enabled', group: 'features', type: 'boolean' },
    { key: 'compatCursorSkills', path: 'compat.cursor.skills', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatCursorRules', path: 'compat.cursor.rules', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatCursorAgents', path: 'compat.cursor.agents', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatCursorMcps', path: 'compat.cursor.mcps', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatCursorHooks', path: 'compat.cursor.hooks', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeSkills', path: 'compat.claude.skills', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeRules', path: 'compat.claude.rules', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeAgents', path: 'compat.claude.agents', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeMcps', path: 'compat.claude.mcps', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeHooks', path: 'compat.claude.hooks', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'skillsPaths', path: 'skills.paths', group: 'features', type: 'directEdit' },
    { key: 'skillsDisabled', path: 'skills.disabled', group: 'features', type: 'directEdit' },
    { key: 'pluginsPaths', path: 'plugins.paths', group: 'features', type: 'directEdit' },
    { key: 'pluginsDisabled', path: 'plugins.disabled', group: 'features', type: 'directEdit' },
    { key: 'pluginsEnabled', path: 'plugins.enabled', group: 'features', type: 'directEdit' },
];

// グループの表示順（UI の見出し順）。
export const SETTINGS_GROUP_ORDER: string[] = ['model', 'security', 'cli', 'features'];

// ============================================================
// 公式スキルリポジトリ（xAI 公式 plugin-marketplace）
// ============================================================

// clone/pull のソース。
export const OFFICIAL_SKILLS_REPO_URL = 'https://github.com/xai-org/plugin-marketplace.git';
// 既定ブランチ。
export const OFFICIAL_SKILLS_REPO_BRANCH = 'main';
// リポジトリ内のスキル格納ディレクトリ（リポジトリルートからの相対）。
export const OFFICIAL_SKILLS_REPO_SUBDIR = 'default-skills';
// clone 先ディレクトリ名（app.getPath('userData')/repos/<dir>）。
export const OFFICIAL_SKILLS_REPO_DIRNAME = 'xai-plugin-marketplace';
