// ============================================================
// Codex 固有の定数・IPC チャンネル・レジストリ
// ============================================================
import type {
    AssetKind,
    CleanupCandidateSpec,
    OtherCleanupItem,
    PluginCapabilities,
    SettingsFieldSpec,
} from '../types';

// ============================================================
// Codex のパス（すべて HOME 相対、区切りは '/'）
// ============================================================

// Codex CLI のデータディレクトリ（~/.codex）
export const CODEX_DIR = '.codex';
// Codex 設定ファイル（~/.codex/config.toml）
export const CODEX_CONFIG_REL = `${CODEX_DIR}/config.toml`;
// 無効化した MCP の退避先（~/.codex/config-disabled-mcp.toml）。無効化した TOML ブロックを保持する。
export const CODEX_DISABLED_MCP_REL = `${CODEX_DIR}/config-disabled-mcp.toml`;
// カスタムエージェントのディレクトリ（~/.codex/agents、*.toml）
export const CODEX_AGENTS_REL = `${CODEX_DIR}/agents`;
// ユーザースキルのディレクトリ（~/.agents/skills、<skill>/SKILL.md）
export const AGENTS_SKILLS_REL = '.agents/skills';
// AssetKind → 親ディレクトリ（HOME 相対）
export const ASSET_PARENT_REL: Record<AssetKind, string> = {
    agents: CODEX_AGENTS_REL,
    skills: AGENTS_SKILLS_REL,
};

// WSL distro に Codex CLI が導入されているかの判定コマンド（bash -lc で実行）。
// 共通 WslDetector.getDistrosWithTest() に渡す。
export const CODEX_WSL_CLI_TEST = `test -d ~/${CODEX_DIR}`;

// ============================================================
// IPC チャンネル
// ============================================================

// Codex MCP 管理用
export const CODEX_MCP_CHANNELS = {
    GET_ENVIRONMENTS: 'codex-mcp:get-environments',
    GET_MCP_SERVERS: 'codex-mcp:get-mcp-servers',
    ENABLE: 'codex-mcp:enable-mcp-server',
    DISABLE: 'codex-mcp:disable-mcp-server',
    REORDER: 'codex-mcp:reorder-mcp-servers',
    REORDER_DISABLED: 'codex-mcp:reorder-disabled-mcp-servers',
} as const;

// Codex Agent・Skill 管理用
export const CODEX_ASSET_CHANNELS = {
    GET_ENVIRONMENTS: 'codex-asset:get-environments',
    LIST: 'codex-asset:list',
    READ_ENTRY: 'codex-asset:read-entry',
    REVEAL_ENTRY: 'codex-asset:reveal-entry',
    DOWNLOAD: 'codex-asset:download',
    INSPECT_UPLOAD: 'codex-asset:inspect-upload',
    UPLOAD: 'codex-asset:upload',
    UPLOAD_FILE: 'codex-asset:upload-file',
    DELETE: 'codex-asset:delete',
    IS_GIT_AVAILABLE: 'codex-asset:is-git-available',
    LIST_OFFICIAL_SKILLS: 'codex-asset:list-official-skills',
    IMPORT_OFFICIAL_SKILLS: 'codex-asset:import-official-skills',
} as const;

// Codex クリーンアップ用
export const CODEX_CLEANUP_CHANNELS = {
    GET_ENVIRONMENTS: 'codex-cleanup:get-environments',
    SCAN: 'codex-cleanup:scan',
    DELETE: 'codex-cleanup:delete',
    GET_OTHER_ENVIRONMENTS: 'codex-cleanup:get-other-environments',
    SCAN_OTHER: 'codex-cleanup:scan-other',
    DELETE_OTHER: 'codex-cleanup:delete-other',
} as const;

// Codex 設定（config.toml）管理用
export const CODEX_CONFIG_CHANNELS = {
    GET_ENVIRONMENTS: 'codex-config:get-environments',
    READ: 'codex-config:read',
    WRITE: 'codex-config:write',
    WRITE_RAW: 'codex-config:write-raw',
} as const;

// Codex プラグイン管理用
export const CODEX_PLUGIN_CHANNELS = {
    GET_ENVIRONMENTS: 'codex-plugin:get-environments',
    LIST: 'codex-plugin:list',
    CATALOG: 'codex-plugin:catalog',
    INSTALL: 'codex-plugin:install',
    UNINSTALL: 'codex-plugin:uninstall',
    SET_ENABLED: 'codex-plugin:set-enabled',
    ADD_MARKETPLACE: 'codex-plugin:add-marketplace',
    REMOVE_MARKETPLACE: 'codex-plugin:remove-marketplace',
} as const;

// ============================================================
// プラグイン管理
// ============================================================

// ヘッドレス実行する CLI コマンド名
export const CODEX_CLI_COMMAND = 'codex';

// OpenAI 組み込みマーケットプレイス（自動登録される。削除ボタンを無効化する）
export const CODEX_BUILTIN_MARKETPLACES = ['openai-bundled', 'openai-primary-runtime', 'openai-curated'];

// GUI の機能出し分け。
// - directInstall=false: `codex plugin add` は設定済みマーケットプレイスからのみ。
//   個別リポジトリは「マーケットプレイスとして追加 → プラグイン選択」の 2 段階。
// - marketplaceRemoteUrl=false: marketplace.json への直接 URL 指定は非対応
//   （ローカルパス / owner/repo[@ref] / Git URL のみ）。
export const CODEX_PLUGIN_CAPABILITIES: PluginCapabilities = {
    directInstall: false,
    marketplaceRemoteUrl: false,
    catalog: true,
    marketplaceManagement: true,
    packageSource: false,
};

// ============================================================
// クリーンアップ候補
// ============================================================

// クリーンアップ候補（~/.codex 配下）。対象は履歴／キャッシュ／一時／ログ／セッションのみ。
// config.toml / auth.json / agents / skills / prompts / AGENTS.md（設定・資産）や
// *.sqlite（state/logs DB。稼働中ロック・破損リスク）は対象外。
// デフォルトはすべてチェック OFF（ユーザーが明示的に選択する）。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: 'sessions', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'cache', defaultChecked: false },
    { key: 'generated-images', defaultChecked: false, path: 'generated_images' },
    { key: 'tmp', defaultChecked: false },
    { key: 'log', defaultChecked: false },
    { key: 'models-cache', defaultChecked: false, kind: 'file', path: 'models_cache.json' },
    { key: 'session-index', defaultChecked: false, kind: 'file', path: 'session_index.jsonl' },
];

// 「その他のツール」クリーンアップ項目の registry（~/.codex 配下ではないもの）。
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
// Codex 設定（config.toml）編集レジストリ
// ============================================================

// config.toml の設定項目 registry。公式 config リファレンス準拠。
// path はドット区切りキー（ネストは該当 [table] に書き込む）。配列・テーブルは directEdit として
// 一覧へ表示するだけでテーブル保存から除外する。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    // === モデル ===
    {
        key: 'model',
        path: 'model',
        group: 'model',
        type: 'string',
        choices: [
            'gpt-5.6',
            'gpt-5.6-sol',
            'gpt-5.6-terra',
            'gpt-5.6-luna',
            'gpt-5.5',
            'gpt-5.4',
            'gpt-5.4-mini',
            'gpt-5.3-codex-spark',
        ],
        allowCustom: true,
    },
    {
        key: 'reviewModel',
        path: 'review_model',
        group: 'model',
        type: 'string',
        choices: ['gpt-5.6', 'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini'],
        allowCustom: true,
    },
    // model_provider は [model_providers.<id>] で定義した任意 ID を取るため choices で限定しない。既定は openai。
    { key: 'modelProvider', path: 'model_provider', group: 'model', type: 'string' },
    {
        key: 'modelReasoningEffort',
        path: 'model_reasoning_effort',
        group: 'model',
        type: 'string',
        choices: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'],
    },
    {
        key: 'modelReasoningSummary',
        path: 'model_reasoning_summary',
        group: 'model',
        type: 'string',
        choices: ['auto', 'concise', 'detailed', 'none'],
    },
    {
        key: 'modelVerbosity',
        path: 'model_verbosity',
        group: 'model',
        type: 'string',
        choices: ['low', 'medium', 'high'],
    },
    {
        key: 'modelSupportsReasoningSummaries',
        path: 'model_supports_reasoning_summaries',
        group: 'model',
        type: 'boolean',
    },
    { key: 'modelContextWindow', path: 'model_context_window', group: 'model', type: 'number', min: 1, integer: true },
    {
        key: 'planModeReasoningEffort',
        path: 'plan_mode_reasoning_effort',
        group: 'model',
        type: 'string',
        choices: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
    },
    {
        key: 'modelAutoCompactTokenLimit',
        path: 'model_auto_compact_token_limit',
        group: 'model',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'modelAutoCompactTokenLimitScope',
        path: 'model_auto_compact_token_limit_scope',
        group: 'model',
        type: 'string',
        choices: ['total', 'body_after_prefix'],
        defaultValue: 'total',
    },
    {
        key: 'toolOutputTokenLimit',
        path: 'tool_output_token_limit',
        group: 'model',
        type: 'number',
        min: 1,
        integer: true,
    },
    { key: 'modelCatalogJson', path: 'model_catalog_json', group: 'model', type: 'string' },
    { key: 'openAiBaseUrl', path: 'openai_base_url', group: 'model', type: 'string' },
    {
        key: 'ossProvider',
        path: 'oss_provider',
        group: 'model',
        type: 'string',
        choices: ['ollama', 'lmstudio'],
    },
    {
        key: 'serviceTier',
        path: 'service_tier',
        group: 'model',
        type: 'string',
        choices: ['fast', 'flex'],
        allowCustom: true,
    },
    { key: 'modelProviders', path: 'model_providers.<id>', group: 'model', type: 'directEdit' },

    // === セキュリティ・動作 ===
    {
        key: 'approvalPolicy',
        path: 'approval_policy',
        group: 'security',
        type: 'string',
        choices: ['untrusted', 'on-request', 'never'],
        defaultValue: 'on-request',
    },
    {
        key: 'sandboxMode',
        path: 'sandbox_mode',
        group: 'security',
        type: 'string',
        choices: ['read-only', 'workspace-write', 'danger-full-access'],
        defaultValue: 'read-only',
    },
    {
        key: 'webSearch',
        path: 'web_search',
        group: 'security',
        type: 'string',
        choices: ['disabled', 'cached', 'indexed', 'live'],
    },
    {
        key: 'personality',
        path: 'personality',
        group: 'security',
        type: 'string',
        choices: ['none', 'friendly', 'pragmatic'],
    },
    { key: 'allowLoginShell', path: 'allow_login_shell', group: 'security', type: 'boolean', defaultOn: true },
    {
        key: 'approvalsReviewer',
        path: 'approvals_reviewer',
        group: 'security',
        type: 'string',
        choices: ['user', 'auto_review'],
        defaultValue: 'user',
    },
    {
        key: 'defaultPermissions',
        path: 'default_permissions',
        group: 'security',
        type: 'string',
        choices: [':read-only', ':workspace', ':danger-full-access'],
        allowCustom: true,
    },
    { key: 'sandboxNetworkAccess', path: 'sandbox_workspace_write.network_access', group: 'security', type: 'boolean' },
    {
        key: 'sandboxExcludeTmpdirEnvVar',
        path: 'sandbox_workspace_write.exclude_tmpdir_env_var',
        group: 'security',
        type: 'boolean',
    },
    {
        key: 'sandboxExcludeSlashTmp',
        path: 'sandbox_workspace_write.exclude_slash_tmp',
        group: 'security',
        type: 'boolean',
    },
    {
        key: 'historyPersistence',
        path: 'history.persistence',
        group: 'security',
        type: 'string',
        choices: ['save-all', 'none'],
        defaultValue: 'save-all',
    },
    { key: 'approvalPolicyGranular', path: 'approval_policy.granular', group: 'security', type: 'directEdit' },
    {
        key: 'sandboxWritableRoots',
        path: 'sandbox_workspace_write.writable_roots',
        group: 'security',
        type: 'directEdit',
    },
    { key: 'permissionsProfiles', path: 'permissions.<name>', group: 'security', type: 'directEdit' },

    // === 表示 ===
    {
        key: 'fileOpener',
        path: 'file_opener',
        group: 'display',
        type: 'string',
        choices: ['vscode', 'vscode-insiders', 'windsurf', 'cursor', 'none'],
        defaultValue: 'vscode',
    },
    { key: 'hideAgentReasoning', path: 'hide_agent_reasoning', group: 'display', type: 'boolean', defaultOn: false },
    {
        key: 'showRawAgentReasoning',
        path: 'show_raw_agent_reasoning',
        group: 'display',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'tuiAnimations', path: 'tui.animations', group: 'display', type: 'boolean', defaultOn: true },
    { key: 'tuiShowTooltips', path: 'tui.show_tooltips', group: 'display', type: 'boolean', defaultOn: true },
    {
        key: 'tuiNotificationMethod',
        path: 'tui.notification_method',
        group: 'display',
        type: 'string',
        choices: ['auto', 'osc9', 'bel'],
        defaultValue: 'auto',
    },
    {
        key: 'tuiNotificationCondition',
        path: 'tui.notification_condition',
        group: 'display',
        type: 'string',
        choices: ['unfocused', 'always'],
        defaultValue: 'unfocused',
    },
    {
        key: 'tuiAlternateScreen',
        path: 'tui.alternate_screen',
        group: 'display',
        type: 'string',
        choices: ['auto', 'always', 'never'],
        defaultValue: 'auto',
    },
    { key: 'notify', path: 'notify', group: 'display', type: 'directEdit' },
    { key: 'tuiNotifications', path: 'tui.notifications', group: 'display', type: 'directEdit' },
    { key: 'tuiStatusLine', path: 'tui.status_line', group: 'display', type: 'directEdit' },
    { key: 'tuiTerminalTitle', path: 'tui.terminal_title', group: 'display', type: 'directEdit' },
    { key: 'tuiKeymap', path: 'tui.keymap', group: 'display', type: 'directEdit' },
    { key: 'tuiTheme', path: 'tui.theme', group: 'display', type: 'string', allowCustom: true, choices: [] },

    // === データ ===
    { key: 'projectDocMaxBytes', path: 'project_doc_max_bytes', group: 'data', type: 'number', min: 0, integer: true },
    { key: 'historyMaxBytes', path: 'history.max_bytes', group: 'data', type: 'number', min: 0, integer: true },
    {
        key: 'checkForUpdateOnStartup',
        path: 'check_for_update_on_startup',
        group: 'data',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'disablePasteBurst', path: 'disable_paste_burst', group: 'data', type: 'boolean', defaultOn: false },
    { key: 'modelInstructionsFile', path: 'model_instructions_file', group: 'data', type: 'string' },
    { key: 'developerInstructions', path: 'developer_instructions', group: 'data', type: 'string' },
    { key: 'compactPrompt', path: 'compact_prompt', group: 'data', type: 'string' },
    {
        key: 'experimentalCompactPromptFile',
        path: 'experimental_compact_prompt_file',
        group: 'data',
        type: 'string',
    },
    { key: 'logDir', path: 'log_dir', group: 'data', type: 'string' },
    { key: 'sqliteHome', path: 'sqlite_home', group: 'data', type: 'string' },
    {
        key: 'backgroundTerminalMaxTimeout',
        path: 'background_terminal_max_timeout',
        group: 'data',
        type: 'number',
        min: 1,
        integer: true,
    },
    { key: 'analyticsEnabled', path: 'analytics.enabled', group: 'data', type: 'boolean' },
    { key: 'feedbackEnabled', path: 'feedback.enabled', group: 'data', type: 'boolean', defaultOn: true },
    {
        key: 'cliAuthCredentialsStore',
        path: 'cli_auth_credentials_store',
        group: 'data',
        type: 'string',
        choices: ['file', 'keyring', 'auto'],
        defaultValue: 'file',
    },
    { key: 'chatgptBaseUrl', path: 'chatgpt_base_url', group: 'data', type: 'string' },
    { key: 'forcedChatgptWorkspaceId', path: 'forced_chatgpt_workspace_id', group: 'data', type: 'string' },
    {
        key: 'forcedLoginMethod',
        path: 'forced_login_method',
        group: 'data',
        type: 'string',
        choices: ['chatgpt', 'api'],
    },
    {
        key: 'mcpOauthCredentialsStore',
        path: 'mcp_oauth_credentials_store',
        group: 'data',
        type: 'string',
        choices: ['auto', 'file', 'keyring'],
        defaultValue: 'auto',
    },
    {
        key: 'mcpOauthCallbackPort',
        path: 'mcp_oauth_callback_port',
        group: 'data',
        type: 'number',
        min: 1,
        max: 65535,
        integer: true,
    },
    { key: 'mcpOauthCallbackUrl', path: 'mcp_oauth_callback_url', group: 'data', type: 'string' },
    {
        key: 'windowsWslSetupAcknowledged',
        path: 'windows_wsl_setup_acknowledged',
        group: 'data',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'suppressUnstableFeaturesWarning',
        path: 'suppress_unstable_features_warning',
        group: 'data',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'shellEnvironmentInherit',
        path: 'shell_environment_policy.inherit',
        group: 'data',
        type: 'string',
        choices: ['all', 'core', 'none'],
        defaultValue: 'all',
    },
    {
        key: 'shellEnvironmentIgnoreDefaultExcludes',
        path: 'shell_environment_policy.ignore_default_excludes',
        group: 'data',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'shellEnvironmentExperimentalUseProfile',
        path: 'shell_environment_policy.experimental_use_profile',
        group: 'data',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'projectDocFallbackFilenames',
        path: 'project_doc_fallback_filenames',
        group: 'data',
        type: 'directEdit',
    },
    { key: 'projectRootMarkers', path: 'project_root_markers', group: 'data', type: 'directEdit' },
    { key: 'shellEnvironmentExclude', path: 'shell_environment_policy.exclude', group: 'data', type: 'directEdit' },
    { key: 'shellEnvironmentSet', path: 'shell_environment_policy.set', group: 'data', type: 'directEdit' },
    {
        key: 'shellEnvironmentIncludeOnly',
        path: 'shell_environment_policy.include_only',
        group: 'data',
        type: 'directEdit',
    },
    { key: 'projects', path: 'projects', group: 'data', type: 'directEdit' },

    // === サブエージェント・機能 ===
    { key: 'agentsMaxThreads', path: 'agents.max_threads', group: 'features', type: 'number', min: 1, integer: true },
    { key: 'agentsMaxDepth', path: 'agents.max_depth', group: 'features', type: 'number', min: 1, integer: true },
    {
        key: 'agentsJobMaxRuntimeSeconds',
        path: 'agents.job_max_runtime_seconds',
        group: 'features',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'agentsInterruptMessage',
        path: 'agents.interrupt_message',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'featuresGoals', path: 'features.goals', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresHooks', path: 'features.hooks', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresFastMode', path: 'features.fast_mode', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresMemories', path: 'features.memories', group: 'features', type: 'boolean', defaultOn: false },
    { key: 'memoriesGenerate', path: 'memories.generate_memories', group: 'features', type: 'boolean' },
    { key: 'memoriesUse', path: 'memories.use_memories', group: 'features', type: 'boolean' },
    {
        key: 'memoriesDisableOnExternalContext',
        path: 'memories.disable_on_external_context',
        group: 'features',
        type: 'boolean',
    },
    {
        key: 'memoriesMinRateLimitRemainingPercent',
        path: 'memories.min_rate_limit_remaining_percent',
        group: 'features',
        type: 'number',
        min: 0,
        max: 100,
    },
    { key: 'memoriesExtractModel', path: 'memories.extract_model', group: 'features', type: 'string' },
    {
        key: 'memoriesConsolidationModel',
        path: 'memories.consolidation_model',
        group: 'features',
        type: 'string',
    },
    { key: 'featuresMultiAgent', path: 'features.multi_agent', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresPersonality', path: 'features.personality', group: 'features', type: 'boolean', defaultOn: true },
    {
        key: 'featuresRemotePlugin',
        path: 'features.remote_plugin',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresShellSnapshot',
        path: 'features.shell_snapshot',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'featuresShellTool', path: 'features.shell_tool', group: 'features', type: 'boolean', defaultOn: true },
    {
        key: 'featuresUnifiedExec',
        path: 'features.unified_exec',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'featuresApps', path: 'features.apps', group: 'features', type: 'boolean', defaultOn: true },
    {
        key: 'featuresNetworkProxy',
        path: 'features.network_proxy',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'featuresEnableRequestCompression',
        path: 'features.enable_request_compression',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresSkillMcpDependencyInstall',
        path: 'features.skill_mcp_dependency_install',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresPreventIdleSleep',
        path: 'features.prevent_idle_sleep',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'agentsDefinitions', path: 'agents.<name>', group: 'features', type: 'directEdit' },
    { key: 'skillsConfig', path: 'skills.config', group: 'features', type: 'directEdit' },
    { key: 'hooks', path: 'hooks', group: 'features', type: 'directEdit' },
    { key: 'mcpServers', path: 'mcp_servers.<id>', group: 'features', type: 'directEdit' },
    { key: 'apps', path: 'apps.<id>', group: 'features', type: 'directEdit' },
    { key: 'toolSuggest', path: 'tool_suggest', group: 'features', type: 'directEdit' },
];

// グループの表示順（UI の見出し順）。
export const SETTINGS_GROUP_ORDER: string[] = ['model', 'security', 'display', 'data', 'features'];

// ============================================================
// 公式スキルリポジトリ（OpenAI 公式 skills）
// ============================================================

// clone/pull のソース。
export const OFFICIAL_SKILLS_REPO_URL = 'https://github.com/openai/skills.git';
// 既定ブランチ。
export const OFFICIAL_SKILLS_REPO_BRANCH = 'main';
// リポジトリ内のスキル格納ディレクトリ（リポジトリルートからの相対。'' はルート直下から探索）。
// openai/skills はユーザー向けカタログを skills/.curated 配下に置いている
// （skills/.system は Codex 本体同梱の内部スキルのため対象外）。
// スキャナはドット始まりディレクトリへ潜らないため、探索起点自体を .curated に向ける。
export const OFFICIAL_SKILLS_REPO_SUBDIR = 'skills/.curated';
// clone 先ディレクトリ名（app.getPath('userData')/repos/<dir>）。
export const OFFICIAL_SKILLS_REPO_DIRNAME = 'openai-skills';
