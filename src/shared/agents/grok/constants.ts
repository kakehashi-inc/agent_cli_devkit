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
    REVEAL_ENTRY: 'grok-asset:reveal-entry',
    DOWNLOAD: 'grok-asset:download',
    INSPECT_UPLOAD: 'grok-asset:inspect-upload',
    UPLOAD: 'grok-asset:upload',
    UPLOAD_MD: 'grok-asset:upload-md',
    DELETE: 'grok-asset:delete',
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

// マーケットプレイスの Git キャッシュ（~/.grok/marketplace-cache/<hash>/。Grok が必要時に再取得する）
export const GROK_MARKETPLACE_CACHE_REL = `${GROK_DIR}/marketplace-cache`;

// マーケットプレイスのインデックス（カタログ）ファイル。Grok が読む優先順に並べる。
export const GROK_MARKETPLACE_INDEX_FILES = [
    '.grok-plugin/marketplace.json',
    '.grok-plugin/plugin.json',
    '.claude-plugin/marketplace.json',
    '.claude-plugin/plugin.json',
];

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
    catalog: true,
    marketplaceManagement: true,
    packageSource: false,
};

// ============================================================
// クリーンアップ候補
// ============================================================

// クリーンアップ候補（~/.grok 配下と OS の一時フォルダ）。
// 対象は履歴／メモリ／ログ／診断データ／キャッシュ／旧バイナリ／一時ファイルのみ。
// 次は設定・資産・実行中の作業領域のため対象外:
// config.toml / config-disabled-mcp.toml / auth.json / settings.json / agents / skills / hooks /
// rules / personas / roles / commands / workflows / plugins / installed-plugins / plugin-data /
// bundled（Grok が管理する同梱資産）/ worktrees / worktree_pool / worktrees.db（セッションの
// git ワークツリー）/ downloads（Linux・macOS では bin/grok の実体を置く）/ upload_queue /
// 各種状態ファイル（version.json / agent_id / active_sessions.json / *.lock など）。
// 'bin-old-versions' は ~/.grok/bin 配下の旧バージョンバイナリ（grok-<version>）と、Windows の
// 更新時に退避された実行ファイル（grok.exe.old など *.old）だけを対象とする特別候補
// （現行バージョンと起動用の grok / grok.exe は除外して保護する）。
// 'temp-*' は OS の一時フォルダ直下に Grok が作る一時ファイル・フォルダの特別候補（GROK_TEMP_CLEANUP_KEYS）。
// デフォルトはすべてチェック OFF（ユーザーが明示的に選択する）。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: 'sessions', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'sandbox-events', defaultChecked: false, kind: 'file', path: 'sessions/sandbox-events.jsonl' },
    { key: 'logs', defaultChecked: false },
    { key: 'debug', defaultChecked: false },
    { key: 'leader-log', defaultChecked: false, kind: 'file', path: 'leader.log' },
    { key: 'leader-log-rotated', defaultChecked: false, kind: 'file', path: 'leader.log.1' },
    { key: 'memtrace', defaultChecked: false },
    { key: 'crash', defaultChecked: false },
    { key: 'trace-exports', defaultChecked: false },
    { key: 'marketplace-cache', defaultChecked: false },
    { key: 'docs', defaultChecked: false },
    { key: 'memory', defaultChecked: false },
    { key: 'memory-v2', defaultChecked: false },
    { key: 'plans', defaultChecked: false },
    { key: 'bin-old-versions', defaultChecked: false, expandable: true, childKind: 'file', path: 'bin' },
    { key: 'temp-goal-scratch', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'temp-snapshot-index', defaultChecked: false, expandable: true, childKind: 'file' },
    { key: 'temp-video-frames', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'temp-editor-files', defaultChecked: false, expandable: true, childKind: 'file' },
];

// bin 旧バイナリ候補のキー。子要素は grok-<version> 形式のうち最新以外のファイルで、候補のサイズ・件数は
// その合計とする。
export const CLEANUP_BIN_OLD_KEY = 'bin-old-versions';

// OS の一時フォルダ（Windows は %TEMP%、Linux・WSL は /tmp と $TMPDIR）直下の、名前が完全に一致する
// 実行ユーザー所有の Grok 一時物だけを扱う特別候補のキー（子要素は候補ごとのリゾルバで特定する）。
// - temp-goal-scratch: ゴールモードの作業フォルダ grok-goal-<12 桁 hex>。セッションに保存されたゴールの状態
//   （sessions/*/*/goal/state.json の verifier_id と status）と照合し、完了・予算上限で終了したゴールと
//   対応するゴールが無いものは 1 時間以上、それ以外は 7 日以上更新されていないもの。
// - temp-snapshot-index: スナップショット用の一時 Git インデックス grok-snapshot-index-<pid>-<ns>-<seq>
//   （.lock を含む）のうち、名前の作成時刻と更新日時がともに 24 時間以上前のもの。
// - temp-video-frames: 動画フレーム抽出用フォルダ grok-video-<pid>-<ns> のうち、同じく 24 時間以上前のもの。
// - temp-editor-files: 外部エディタ・トランスクリプト表示用の grok-prompt-<uuid>.md /
//   grok-transcript-<uuid>.md|.ansi のうち、7 日以上更新されていないもの。
export const GROK_TEMP_CLEANUP_KEYS = {
    GOAL_SCRATCH: 'temp-goal-scratch',
    SNAPSHOT_INDEX: 'temp-snapshot-index',
    VIDEO_FRAMES: 'temp-video-frames',
    EDITOR_FILES: 'temp-editor-files',
} as const;

// ゴールの状態ファイル（GROK_HOME の sessions/<作業フォルダ>/<セッション>/ 配下）
export const GROK_GOAL_STATE_SUFFIX = ['goal', 'state.json'];

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

// モデル ID の候補（同梱カタログの ID。リモートカタログやカスタムモデルの ID も入力できる）。
const MODEL_CHOICES = ['grok-4.6', 'grok-4.5', 'grok-build'];
// 組み込みカラーテーマ（ui.theme / ui.auto_*_theme の候補）。
const THEME_CHOICES = ['groknight', 'grokday', 'tokyonight', 'rosepine-moon', 'oscura-midnight', 'terminal'];
// 外部 OpenTelemetry の送信プロトコル / 出力先。
const OTEL_PROTOCOL_CHOICES = ['http/protobuf', 'grpc'];
const OTEL_EXPORTER_CHOICES = ['otlp', 'console', 'none'];

// config.toml の設定項目 registry。公式の設定リファレンス（docs.x.ai/build/settings/reference と
// CLI 同梱の 26-config-reference.md）と公式ソースに準拠する。
// path はドット区切りキー（ネストは該当 [table] に書き込む）。配列・マップ・動的テーブル・型混在値は
// directEdit として一覧へ表示するだけでテーブル保存から除外する。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    // === モデル ===
    {
        key: 'modelsDefault',
        path: 'models.default',
        group: 'model',
        type: 'string',
        choices: MODEL_CHOICES,
        allowCustom: true,
    },
    {
        key: 'modelsWebSearch',
        path: 'models.web_search',
        group: 'model',
        type: 'string',
        choices: MODEL_CHOICES,
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
        choices: MODEL_CHOICES,
        allowCustom: true,
    },
    {
        key: 'modelsImageDescription',
        path: 'models.image_description',
        group: 'model',
        type: 'string',
        choices: MODEL_CHOICES,
        allowCustom: true,
    },
    {
        key: 'modelsPromptSuggestion',
        path: 'models.prompt_suggestion',
        group: 'model',
        type: 'string',
        choices: MODEL_CHOICES,
        allowCustom: true,
    },
    { key: 'modelsAgentType', path: 'models.agent_type', group: 'model', type: 'string' },
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
    {
        key: 'modelsRateLimitRetryThreshold',
        path: 'models.rate_limit_retry_threshold',
        group: 'model',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'modelsSubagentRateLimitMaxAttempts',
        path: 'models.subagent_rate_limit_max_attempts',
        group: 'model',
        type: 'number',
        min: 0,
        max: 32,
        integer: true,
        defaultValue: 8,
    },
    {
        key: 'modelsInferenceIdleTimeoutSecs',
        path: 'models.inference_idle_timeout_secs',
        group: 'model',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 600,
    },
    { key: 'modelsStreamToolCalls', path: 'models.stream_tool_calls', group: 'model', type: 'boolean' },
    { key: 'agentName', path: 'agent.name', group: 'model', type: 'string' },
    { key: 'agentDefinition', path: 'agent.definition', group: 'model', type: 'string' },
    { key: 'agentSystemPromptLabel', path: 'agent.system_prompt_label', group: 'model', type: 'string' },
    {
        key: 'promptSuggestionsMaxOutputTokens',
        path: 'prompt_suggestions.max_output_tokens',
        group: 'model',
        type: 'number',
        min: 16,
        max: 256,
        integer: true,
    },
    {
        key: 'promptSuggestionsTemperature',
        path: 'prompt_suggestions.temperature',
        group: 'model',
        type: 'number',
        min: 0,
    },
    {
        key: 'promptSuggestionsReasoningEffort',
        path: 'prompt_suggestions.reasoning_effort',
        group: 'model',
        type: 'string',
        choices: ['none', 'minimal', 'low', 'medium', 'high'],
    },
    {
        key: 'longReasoningReminderEnabled',
        path: 'long_reasoning_reminder.enabled',
        group: 'model',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'longReasoningReminderTokens',
        path: 'long_reasoning_reminder.tokens',
        group: 'model',
        type: 'number',
        min: 100,
        max: 200000,
        integer: true,
        defaultValue: 1000,
    },
    {
        key: 'longReasoningReminderDelay',
        path: 'long_reasoning_reminder.delay',
        group: 'model',
        type: 'number',
        min: 0,
        max: 10,
        integer: true,
        defaultValue: 1,
    },
    { key: 'modelsExtraHeaders', path: 'models.extra_headers', group: 'model', type: 'directEdit' },
    { key: 'modelsAllowedModels', path: 'models.allowed_models', group: 'model', type: 'directEdit' },
    { key: 'modelsHiddenModels', path: 'models.hidden_models', group: 'model', type: 'directEdit' },
    { key: 'modelsDisabledModels', path: 'models.disabled_models', group: 'model', type: 'directEdit' },
    { key: 'customModels', path: 'model.<id>', group: 'model', type: 'directEdit' },
    { key: 'modelProviders', path: 'model_providers.<name>', group: 'model', type: 'directEdit' },

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
    // 同梱の設定リファレンスの表には無いが、同梱ガイド 05-configuration に記載があり本体が読むキー。
    {
        key: 'toolsetBashAutoBackground',
        path: 'toolset.bash.auto_background_on_timeout',
        group: 'security',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'toolsetBashLoginShellCapture',
        path: 'toolset.bash.login_shell_capture',
        group: 'security',
        type: 'boolean',
    },
    {
        key: 'toolsetWebFetchProxyEndpoint',
        path: 'toolset.web_fetch.proxy_endpoint',
        group: 'security',
        type: 'string',
    },
    // 同梱の設定リファレンスの表には無いが、同梱ガイド 05-configuration に記載があり本体が読むキー。
    {
        key: 'toolsetWebFetchAllowLocal',
        path: 'toolset.web_fetch.allow_local',
        group: 'security',
        type: 'boolean',
        defaultOn: false,
    },
    // 同梱の設定リファレンスの表には無いが、同梱ガイド 05-configuration に記載があり本体が読むキー。
    {
        key: 'toolsetAskUserQuestionTimeoutEnabled',
        path: 'toolset.ask_user_question.timeout_enabled',
        group: 'security',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'toolsetAskUserQuestionTimeoutSecs',
        path: 'toolset.ask_user_question.timeout_secs',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 1800,
    },
    { key: 'toolsetImageGenBaseUrl', path: 'toolset.image_gen.base_url', group: 'security', type: 'string' },
    { key: 'toolsetVideoGenBaseUrl', path: 'toolset.video_gen.base_url', group: 'security', type: 'string' },
    {
        key: 'toolsMediaGenMaxParallelImageGenCalls',
        path: 'tools.media_gen.max_parallel_image_gen_calls',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'toolsMediaGenMaxParallelVideoGenCalls',
        path: 'tools.media_gen.max_parallel_video_gen_calls',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
    },
    { key: 'disableWebSearch', path: 'disable_web_search', group: 'security', type: 'boolean' },
    {
        key: 'sessionAutoCompactThreshold',
        path: 'session.auto_compact_threshold_percent',
        group: 'security',
        type: 'number',
        min: 0,
        max: 100,
    },
    { key: 'sessionLoadEnvrc', path: 'session.load_envrc', group: 'security', type: 'boolean', defaultOn: true },
    {
        key: 'storageCleanupTtlDays',
        path: 'storage.cleanup_ttl_days',
        group: 'security',
        type: 'number',
        min: 0,
        integer: true,
    },
    { key: 'autoModeEnabled', path: 'auto_mode.enabled', group: 'security', type: 'boolean' },
    { key: 'defaultAutoMode', path: 'default_auto_mode', group: 'security', type: 'boolean' },
    { key: 'doomLoopRecoveryEnabled', path: 'doom_loop_recovery.enabled', group: 'security', type: 'boolean' },
    { key: 'pathNotFoundHints', path: 'path_not_found_hints', group: 'security', type: 'boolean' },
    {
        key: 'harnessDisableWorkspaceTeleport',
        path: 'harness.disable_workspace_teleport',
        group: 'security',
        type: 'boolean',
    },
    { key: 'subagentsEnabled', path: 'subagents.enabled', group: 'security', type: 'boolean', defaultOn: true },
    {
        key: 'subagentsLimitBehavior',
        path: 'subagents.limit_behavior',
        group: 'security',
        type: 'string',
        choices: ['queue', 'fail'],
    },
    {
        key: 'subagentsMaxConcurrent',
        path: 'subagents.max_concurrent',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
    },
    { key: 'subagentsMaxDepth', path: 'subagents.max_depth', group: 'security', type: 'number', min: 1, integer: true },
    {
        key: 'mcpMaxOutputBytes',
        path: 'mcp.max_output_bytes',
        group: 'security',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'shellEnvPolicyInherit',
        path: 'shell_environment_policy.inherit',
        group: 'security',
        type: 'string',
        choices: ['all', 'core', 'none'],
        defaultValue: 'all',
    },
    {
        key: 'shellEnvPolicyIgnoreDefaultExcludes',
        path: 'shell_environment_policy.ignore_default_excludes',
        group: 'security',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'toolsetWebFetchAllowedDomains',
        path: 'toolset.web_fetch.allowed_domains',
        group: 'security',
        type: 'directEdit',
    },
    {
        key: 'toolsetWebSearchAllowedDomains',
        path: 'toolset.web_search.allowed_domains',
        group: 'security',
        type: 'directEdit',
    },
    {
        key: 'toolsetWebSearchExcludedDomains',
        path: 'toolset.web_search.excluded_domains',
        group: 'security',
        type: 'directEdit',
    },
    { key: 'toolsetImageGenEnvKey', path: 'toolset.image_gen.env_key', group: 'security', type: 'directEdit' },
    { key: 'toolsetVideoGenEnvKey', path: 'toolset.video_gen.env_key', group: 'security', type: 'directEdit' },
    { key: 'mcpServers', path: 'mcp_servers.<name>', group: 'security', type: 'directEdit' },
    { key: 'disabledMcpServers', path: 'disabled_mcp_servers', group: 'security', type: 'directEdit' },
    { key: 'disabledMcpTools', path: 'disabled_mcp_tools', group: 'security', type: 'directEdit' },
    { key: 'permission', path: 'permission', group: 'security', type: 'directEdit' },
    { key: 'hooks', path: 'hooks.<event>', group: 'security', type: 'directEdit' },
    {
        key: 'shellEnvPolicyExclude',
        path: 'shell_environment_policy.exclude',
        group: 'security',
        type: 'directEdit',
    },
    {
        key: 'shellEnvPolicyIncludeOnly',
        path: 'shell_environment_policy.include_only',
        group: 'security',
        type: 'directEdit',
    },
    { key: 'shellEnvPolicySet', path: 'shell_environment_policy.set', group: 'security', type: 'directEdit' },
    { key: 'subagentsToggle', path: 'subagents.toggle', group: 'security', type: 'directEdit' },
    { key: 'subagentsModels', path: 'subagents.models', group: 'security', type: 'directEdit' },

    // === メモリ ===
    { key: 'memoryEnabled', path: 'memory.enabled', group: 'memory', type: 'boolean', defaultOn: false },
    { key: 'memoryV2Enabled', path: 'memory_v2.enabled', group: 'memory', type: 'boolean', defaultOn: false },
    {
        key: 'memoryV2CompactIndexEnabled',
        path: 'memory_v2.compact_index_enabled',
        group: 'memory',
        type: 'boolean',
    },
    {
        key: 'memoryV2BatchDreamEnabled',
        path: 'memory_v2.batch_dream_enabled',
        group: 'memory',
        type: 'boolean',
    },
    {
        key: 'memoryV2BatchDreamMaxRunSecs',
        path: 'memory_v2.batch_dream_max_run_secs',
        group: 'memory',
        type: 'number',
        min: 60,
        max: 3600,
        integer: true,
    },
    {
        key: 'memoryV2BatchDreamMaxCallsPerBatch',
        path: 'memory_v2.batch_dream_max_calls_per_batch',
        group: 'memory',
        type: 'number',
        min: 2,
        max: 16,
        integer: true,
    },
    {
        key: 'memoryV2BatchDreamMaxBatchNoteBytes',
        path: 'memory_v2.batch_dream_max_batch_note_bytes',
        group: 'memory',
        type: 'number',
        min: 16384,
        max: 262144,
        integer: true,
    },
    {
        key: 'memoryV2ArchivedRetentionDays',
        path: 'memory_v2.archived_retention_days',
        group: 'memory',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 30,
    },
    {
        key: 'memoryV2JobRetentionDays',
        path: 'memory_v2.job_retention_days',
        group: 'memory',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 14,
    },
    {
        key: 'memoryV2DailyTokenCap',
        path: 'memory_v2.daily_token_cap',
        group: 'memory',
        type: 'number',
        min: 1000000,
        integer: true,
    },

    // === 表示・CLI ===
    { key: 'cliAutoUpdate', path: 'cli.auto_update', group: 'cli', type: 'boolean', defaultOn: true },
    {
        key: 'cliChannel',
        path: 'cli.channel',
        group: 'cli',
        type: 'string',
        choices: ['stable', 'alpha', 'enterprise'],
        allowCustom: true,
    },
    { key: 'cliShowTips', path: 'cli.show_tips', group: 'cli', type: 'boolean', defaultOn: true },
    { key: 'cliUseLeader', path: 'cli.use_leader', group: 'cli', type: 'boolean' },
    { key: 'cliNpmRegistry', path: 'cli.npm_registry', group: 'cli', type: 'string' },
    { key: 'cliMinimumVersion', path: 'cli.minimum_version', group: 'cli', type: 'string' },
    { key: 'cliMaximumVersion', path: 'cli.maximum_version', group: 'cli', type: 'string' },
    { key: 'cliRequiredMinimumVersion', path: 'cli.required_minimum_version', group: 'cli', type: 'string' },
    { key: 'cliRequiredMaximumVersion', path: 'cli.required_maximum_version', group: 'cli', type: 'string' },
    // cli.worktree_type は Grove 用の綴り（grove / copy など）も受け付ける。
    {
        key: 'cliWorktreeType',
        path: 'cli.worktree_type',
        group: 'cli',
        type: 'string',
        choices: ['linked', 'standalone', 'git'],
        allowCustom: true,
    },
    { key: 'cliSessionPickerGrouped', path: 'cli.session_picker_grouped', group: 'cli', type: 'boolean' },
    { key: 'cliSessionRegistry', path: 'cli.session_registry', group: 'cli', type: 'boolean' },
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
    // 同梱の設定リファレンスの表には無いが、同梱ガイド 05-configuration に記載があり本体が読むキー。
    {
        key: 'hintsMemoryModalFullscreen',
        path: 'hints.memory_modal_fullscreen',
        group: 'cli',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'dashboardEnabled', path: 'dashboard.enabled', group: 'cli', type: 'boolean' },
    {
        key: 'dashboardGrouping',
        path: 'dashboard.grouping',
        group: 'cli',
        type: 'string',
        choices: ['state', 'directory'],
    },
    { key: 'uiCompactMode', path: 'ui.compact_mode', group: 'cli', type: 'boolean' },
    {
        key: 'uiScreenMode',
        path: 'ui.screen_mode',
        group: 'cli',
        type: 'string',
        choices: ['fullscreen', 'minimal'],
    },
    {
        key: 'uiTimestamps',
        path: 'ui.timestamps',
        group: 'cli',
        type: 'string',
        choices: ['off', 'minimal', 'on'],
    },
    { key: 'uiShowTimeline', path: 'ui.show_timeline', group: 'cli', type: 'boolean' },
    {
        key: 'uiToolCallDensity',
        path: 'ui.tool_call_density',
        group: 'cli',
        type: 'string',
        choices: ['detailed', 'compact-shells', 'compact-ungrouped', 'compact-grouped', 'compact-all-grouped'],
    },
    { key: 'uiSimpleMode', path: 'ui.simple_mode', group: 'cli', type: 'boolean', defaultOn: true },
    {
        key: 'uiTheme',
        path: 'ui.theme',
        group: 'cli',
        type: 'string',
        choices: ['auto', ...THEME_CHOICES],
    },
    {
        key: 'uiAutoDarkTheme',
        path: 'ui.auto_dark_theme',
        group: 'cli',
        type: 'string',
        choices: THEME_CHOICES,
        allowCustom: true,
        defaultValue: 'groknight',
    },
    {
        key: 'uiAutoLightTheme',
        path: 'ui.auto_light_theme',
        group: 'cli',
        type: 'string',
        choices: THEME_CHOICES,
        allowCustom: true,
        defaultValue: 'grokday',
    },
    {
        key: 'uiRenderMermaid',
        path: 'ui.render_mermaid',
        group: 'cli',
        type: 'string',
        choices: ['auto', 'on', 'off'],
    },
    { key: 'uiRememberToolApprovals', path: 'ui.remember_tool_approvals', group: 'cli', type: 'boolean' },
    { key: 'uiShowThinkingBlocks', path: 'ui.show_thinking_blocks', group: 'cli', type: 'boolean' },
    { key: 'uiPromptSuggestions', path: 'ui.prompt_suggestions', group: 'cli', type: 'boolean' },
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
        choices: ['flash', 'hold', 'word_select'],
    },
    {
        key: 'uiMaxThoughtsWidth',
        path: 'ui.max_thoughts_width',
        group: 'cli',
        type: 'number',
        min: 40,
        max: 500,
        integer: true,
        defaultValue: 120,
    },
    { key: 'uiForkSecondaryModel', path: 'ui.fork_secondary_model', group: 'cli', type: 'string' },
    { key: 'uiYolo', path: 'ui.yolo', group: 'cli', type: 'boolean', defaultOn: false },
    {
        key: 'uiPermissionMode',
        path: 'ui.permission_mode',
        group: 'cli',
        type: 'string',
        choices: ['default', 'ask', 'auto', 'always-approve'],
        defaultValue: 'ask',
    },
    {
        key: 'uiDefaultSelectedPermission',
        path: 'ui.default_selected_permission',
        group: 'cli',
        type: 'string',
        choices: ['always_allow_all_sessions', 'allow_command_always', 'allow_once', 'reject'],
        defaultValue: 'always_allow_all_sessions',
    },
    { key: 'uiPageFlipOnSend', path: 'ui.page_flip_on_send', group: 'cli', type: 'boolean', defaultOn: true },
    {
        key: 'uiConfirmBeforeRewind',
        path: 'ui.confirm_before_rewind',
        group: 'cli',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'uiDashboardPreview', path: 'ui.dashboard_preview', group: 'cli', type: 'boolean', defaultOn: true },
    {
        key: 'uiFollowUpBehavior',
        path: 'ui.follow_up_behavior',
        group: 'cli',
        type: 'string',
        choices: ['queue', 'steer'],
        defaultValue: 'queue',
    },
    { key: 'uiVimMode', path: 'ui.vim_mode', group: 'cli', type: 'boolean', defaultOn: false },
    {
        key: 'uiHunkTrackerMode',
        path: 'ui.hunk_tracker_mode',
        group: 'cli',
        type: 'string',
        choices: ['agent_only', 'all_dirty', 'off'],
        defaultValue: 'off',
    },
    {
        key: 'uiVoiceCaptureMode',
        path: 'ui.voice_capture_mode',
        group: 'cli',
        type: 'string',
        choices: ['toggle', 'hold'],
        defaultValue: 'hold',
    },
    { key: 'uiVoiceKeybindEnabled', path: 'ui.voice_keybind_enabled', group: 'cli', type: 'boolean', defaultOn: true },
    { key: 'uiVoiceSttLanguage', path: 'ui.voice_stt_language', group: 'cli', type: 'string', defaultValue: 'en' },
    { key: 'uiMouseReportingToggle', path: 'ui.mouse_reporting_toggle', group: 'cli', type: 'boolean' },
    {
        key: 'uiCancelSubagentsOnTurnCancel',
        path: 'ui.cancel_subagents_on_turn_cancel',
        group: 'cli',
        type: 'string',
        choices: ['ask', 'always_stop', 'always_continue'],
        defaultValue: 'ask',
    },
    { key: 'uiCursorBlink', path: 'ui.cursor_blink', group: 'cli', type: 'boolean' },
    {
        key: 'uiCombineQueuedPrompts',
        path: 'ui.combine_queued_prompts',
        group: 'cli',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'uiStatusLineType',
        path: 'ui.status_line.type',
        group: 'cli',
        type: 'string',
        choices: ['disabled', 'command'],
        defaultValue: 'disabled',
    },
    { key: 'uiStatusLineCommand', path: 'ui.status_line.command', group: 'cli', type: 'string' },
    { key: 'voiceLanguage', path: 'voice.language', group: 'cli', type: 'string' },
    { key: 'voiceApiBase', path: 'voice.api_base', group: 'cli', type: 'string' },
    { key: 'voiceSampleRate', path: 'voice.sample_rate', group: 'cli', type: 'number', min: 1, integer: true },
    { key: 'uiContextualHints', path: 'ui.contextual_hints', group: 'cli', type: 'directEdit' },
    { key: 'uiDisplayRefresh', path: 'ui.display_refresh', group: 'cli', type: 'directEdit' },
    // 同梱の設定リファレンスの表には無いが、同梱ガイド 05-configuration に記載があり本体が読むキー。
    { key: 'uiNotifications', path: 'ui.notifications', group: 'cli', type: 'directEdit' },
    { key: 'cliGrove', path: 'cli.grove', group: 'cli', type: 'directEdit' },
    { key: 'cliGroveWorktree', path: 'cli.grove_worktree', group: 'cli', type: 'directEdit' },
    { key: 'worktreeAutoGc', path: 'worktree.auto_gc', group: 'cli', type: 'directEdit' },
    { key: 'versionOverrides', path: 'version_overrides', group: 'cli', type: 'directEdit' },

    // === 機能 ===
    { key: 'featuresWebFetch', path: 'features.web_fetch', group: 'features', type: 'boolean', defaultOn: false },
    { key: 'featuresRemoteFetch', path: 'features.remote_fetch', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'featuresLspTools', path: 'features.lsp_tools', group: 'features', type: 'boolean', defaultOn: false },
    { key: 'featuresWriteFile', path: 'features.write_file', group: 'features', type: 'boolean', defaultOn: true },
    {
        key: 'featuresAskUserQuestion',
        path: 'features.ask_user_question',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresBackendTools',
        path: 'features.backend_tools',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'featuresImageGen', path: 'features.image_gen', group: 'features', type: 'boolean' },
    {
        key: 'featuresImageGenModelOverride',
        path: 'features.image_gen_model_override',
        group: 'features',
        type: 'string',
    },
    {
        key: 'featuresImageEditModelOverride',
        path: 'features.image_edit_model_override',
        group: 'features',
        type: 'string',
    },
    { key: 'featuresVideoGen', path: 'features.video_gen', group: 'features', type: 'boolean' },
    { key: 'featuresVoiceMode', path: 'features.voice_mode', group: 'features', type: 'boolean', defaultOn: true },
    // features.telemetry は真偽値と文字列（session_metrics / off）の両方を受け付ける。
    {
        key: 'featuresTelemetry',
        path: 'features.telemetry',
        group: 'features',
        type: 'enum',
        enumChoices: [
            { value: true, labelKey: 'enabled' },
            { value: 'session_metrics', labelKey: 'sessionMetrics' },
            { value: false, labelKey: 'disabled' },
            { value: 'off', labelKey: 'off' },
        ],
    },
    { key: 'featuresFeedback', path: 'features.feedback', group: 'features', type: 'boolean', defaultOn: true },
    {
        key: 'featuresFeedbackTraceCard',
        path: 'features.feedback_trace_card',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'featuresTwoPassCompaction',
        path: 'features.two_pass_compaction',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresCompactionMode',
        path: 'features.compaction_mode',
        group: 'features',
        type: 'string',
        choices: ['summary', 'transcript', 'segments'],
    },
    {
        key: 'featuresCompactionDetail',
        path: 'features.compaction_detail',
        group: 'features',
        type: 'string',
        choices: ['none', 'minimal', 'balanced', 'verbose'],
    },
    {
        key: 'featuresCompactionToolChoice',
        path: 'features.compaction_tool_choice',
        group: 'features',
        type: 'string',
    },
    {
        key: 'featuresCompactionVerbatimInput',
        path: 'features.compaction_verbatim_input',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresSessionRecap',
        path: 'features.session_recap',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresSessionSearch',
        path: 'features.session_search',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresTurnSummary',
        path: 'features.turn_summary',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'featuresTitleRefresh', path: 'features.title_refresh', group: 'features', type: 'boolean' },
    {
        key: 'featuresCancelRewind',
        path: 'features.cancel_rewind',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'featuresAutoWake', path: 'features.auto_wake', group: 'features', type: 'boolean', defaultOn: true },
    {
        key: 'featuresActiveAgentMessages',
        path: 'features.active_agent_messages',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'featuresSubagentBundle',
        path: 'features.subagent_bundle',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresSubagentModelInheritance',
        path: 'features.subagent_model_inheritance',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'featuresSubagentWorktreeSnapshot',
        path: 'features.subagent_worktree_snapshot',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'featuresWorkflowConversion',
        path: 'features.workflow_conversion',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresSupportPermission',
        path: 'features.support_permission',
        group: 'features',
        type: 'boolean',
    },
    {
        key: 'featuresRememberMode',
        path: 'features.remember_mode',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'featuresNonGitWarning', path: 'features.non_git_warning', group: 'features', type: 'boolean' },
    {
        key: 'featuresMcpAutoRestart',
        path: 'features.mcp_auto_restart',
        group: 'features',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'featuresMcpLivenessWatchers',
        path: 'features.mcp_liveness_watchers',
        group: 'features',
        type: 'boolean',
    },
    {
        key: 'featuresMcpPushServerStatus',
        path: 'features.mcp_push_server_status',
        group: 'features',
        type: 'boolean',
    },
    {
        key: 'featuresMcpRecursiveConfigWatch',
        path: 'features.mcp_recursive_config_watch',
        group: 'features',
        type: 'boolean',
    },
    { key: 'featuresDock', path: 'features.dock', group: 'features', type: 'boolean', defaultOn: false },
    {
        key: 'featuresTerminalTheme',
        path: 'features.terminal_theme',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'featuresFileAcceleration',
        path: 'features.file_acceleration',
        group: 'features',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'fileAccelerationRoutes', path: 'file_acceleration.routes', group: 'features', type: 'string' },
    { key: 'featuresCampaigns', path: 'features.campaigns', group: 'features', type: 'boolean' },
    { key: 'workflowsEnabled', path: 'workflows.enabled', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'goalEnabled', path: 'goal.enabled', group: 'features', type: 'boolean', defaultOn: true },
    { key: 'relayEnabled', path: 'relay.enabled', group: 'features', type: 'boolean' },
    // features.codebase_indexing は真偽値と glob 配列の両方を受け付ける。
    {
        key: 'featuresCodebaseIndexing',
        path: 'features.codebase_indexing',
        group: 'features',
        type: 'directEdit',
    },

    // === 拡張・互換 ===
    { key: 'compatCursorSkills', path: 'compat.cursor.skills', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatCursorRules', path: 'compat.cursor.rules', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatCursorAgents', path: 'compat.cursor.agents', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatCursorMcps', path: 'compat.cursor.mcps', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatCursorHooks', path: 'compat.cursor.hooks', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeSkills', path: 'compat.claude.skills', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeRules', path: 'compat.claude.rules', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeAgents', path: 'compat.claude.agents', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeMcps', path: 'compat.claude.mcps', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatClaudeHooks', path: 'compat.claude.hooks', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatCodexSkills', path: 'compat.codex.skills', group: 'extensions', type: 'boolean', defaultOn: true },
    { key: 'compatCodexHooks', path: 'compat.codex.hooks', group: 'extensions', type: 'boolean', defaultOn: true },
    // compat.<ツール>.sessions は同梱ガイドで「読み込む処理が未実装」とされる効果の無いキーのため登録しない。
    { key: 'marketplaceRequireSha', path: 'marketplace.require_sha', group: 'extensions', type: 'boolean' },
    {
        key: 'cursorWorkerAutoStart',
        path: 'cursor_worker.auto_start',
        group: 'extensions',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'cursorWorkerName', path: 'cursor_worker.name', group: 'extensions', type: 'string' },
    {
        key: 'cursorWorkerMaxAgents',
        path: 'cursor_worker.max_agents',
        group: 'extensions',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'cursorWorkerAnyRepo',
        path: 'cursor_worker.any_repo',
        group: 'extensions',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'cursorWorkerHubUrl', path: 'cursor_worker.hub_url', group: 'extensions', type: 'string' },
    {
        key: 'cursorWorkerRewriteShellOutput',
        path: 'cursor_worker.rewrite_shell_output',
        group: 'extensions',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'skillsPaths', path: 'skills.paths', group: 'extensions', type: 'directEdit' },
    { key: 'skillsDisabled', path: 'skills.disabled', group: 'extensions', type: 'directEdit' },
    // 同梱の設定リファレンスの表には無いが、同梱ガイド 05-configuration に記載があり本体が読むキー。
    { key: 'skillsIgnore', path: 'skills.ignore', group: 'extensions', type: 'directEdit' },
    { key: 'pathsExtraRuleDirs', path: 'paths.extra_rule_dirs', group: 'extensions', type: 'directEdit' },
    { key: 'pluginsPaths', path: 'plugins.paths', group: 'extensions', type: 'directEdit' },
    { key: 'pluginsDisabled', path: 'plugins.disabled', group: 'extensions', type: 'directEdit' },
    { key: 'pluginsEnabled', path: 'plugins.enabled', group: 'extensions', type: 'directEdit' },
    { key: 'marketplaceSources', path: 'marketplace.sources', group: 'extensions', type: 'directEdit' },
    { key: 'cursorWorkerWorkerDirs', path: 'cursor_worker.worker_dirs', group: 'extensions', type: 'directEdit' },

    // === テレメトリ・診断 ===
    { key: 'telemetryTraceUpload', path: 'telemetry.trace_upload', group: 'telemetry', type: 'boolean' },
    // 次の 3 件は同梱の設定リファレンスの表には無いが、同梱ガイド 05-configuration に記載があり本体が読むキー。
    { key: 'telemetryMixpanelEnabled', path: 'telemetry.mixpanel_enabled', group: 'telemetry', type: 'boolean' },
    { key: 'telemetryEventsUrl', path: 'telemetry.events_url', group: 'telemetry', type: 'string' },
    { key: 'telemetryEventsApiKey', path: 'telemetry.events_api_key', group: 'telemetry', type: 'string' },
    { key: 'telemetryOtelEnabled', path: 'telemetry.otel_enabled', group: 'telemetry', type: 'boolean' },
    { key: 'telemetryOtelEndpoint', path: 'telemetry.otel_endpoint', group: 'telemetry', type: 'string' },
    { key: 'telemetryOtelLogsEndpoint', path: 'telemetry.otel_logs_endpoint', group: 'telemetry', type: 'string' },
    {
        key: 'telemetryOtelMetricsEndpoint',
        path: 'telemetry.otel_metrics_endpoint',
        group: 'telemetry',
        type: 'string',
    },
    {
        key: 'telemetryOtelProtocol',
        path: 'telemetry.otel_protocol',
        group: 'telemetry',
        type: 'string',
        choices: OTEL_PROTOCOL_CHOICES,
    },
    {
        key: 'telemetryOtelLogsProtocol',
        path: 'telemetry.otel_logs_protocol',
        group: 'telemetry',
        type: 'string',
        choices: OTEL_PROTOCOL_CHOICES,
    },
    {
        key: 'telemetryOtelMetricsProtocol',
        path: 'telemetry.otel_metrics_protocol',
        group: 'telemetry',
        type: 'string',
        choices: OTEL_PROTOCOL_CHOICES,
    },
    {
        key: 'telemetryOtelMetricsExporter',
        path: 'telemetry.otel_metrics_exporter',
        group: 'telemetry',
        type: 'string',
        choices: OTEL_EXPORTER_CHOICES,
    },
    {
        key: 'telemetryOtelLogsExporter',
        path: 'telemetry.otel_logs_exporter',
        group: 'telemetry',
        type: 'string',
        choices: OTEL_EXPORTER_CHOICES,
    },
    {
        key: 'telemetryOtelTimeout',
        path: 'telemetry.otel_timeout',
        group: 'telemetry',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'telemetryOtelMetricExportInterval',
        path: 'telemetry.otel_metric_export_interval',
        group: 'telemetry',
        type: 'number',
        min: 1,
        integer: true,
    },
    {
        key: 'telemetryOtelMetricsIncludeSessionId',
        path: 'telemetry.otel_metrics_include_session_id',
        group: 'telemetry',
        type: 'boolean',
    },
    {
        key: 'telemetryOtelLogUserPrompts',
        path: 'telemetry.otel_log_user_prompts',
        group: 'telemetry',
        type: 'boolean',
    },
    {
        key: 'telemetryOtelLogAssistantResponses',
        path: 'telemetry.otel_log_assistant_responses',
        group: 'telemetry',
        type: 'boolean',
    },
    {
        key: 'telemetryOtelLogToolDetails',
        path: 'telemetry.otel_log_tool_details',
        group: 'telemetry',
        type: 'boolean',
    },
    {
        key: 'telemetryOtelLogToolContent',
        path: 'telemetry.otel_log_tool_content',
        group: 'telemetry',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'telemetryOtelCertificate', path: 'telemetry.otel_certificate', group: 'telemetry', type: 'string' },
    {
        key: 'telemetryOtelLogsCertificate',
        path: 'telemetry.otel_logs_certificate',
        group: 'telemetry',
        type: 'string',
    },
    {
        key: 'telemetryOtelMetricsCertificate',
        path: 'telemetry.otel_metrics_certificate',
        group: 'telemetry',
        type: 'string',
    },
    {
        key: 'telemetryOtelClientCertificate',
        path: 'telemetry.otel_client_certificate',
        group: 'telemetry',
        type: 'string',
    },
    { key: 'telemetryOtelClientKey', path: 'telemetry.otel_client_key', group: 'telemetry', type: 'string' },
    {
        key: 'telemetryOtelLogsClientCertificate',
        path: 'telemetry.otel_logs_client_certificate',
        group: 'telemetry',
        type: 'string',
    },
    {
        key: 'telemetryOtelLogsClientKey',
        path: 'telemetry.otel_logs_client_key',
        group: 'telemetry',
        type: 'string',
    },
    {
        key: 'telemetryOtelMetricsClientCertificate',
        path: 'telemetry.otel_metrics_client_certificate',
        group: 'telemetry',
        type: 'string',
    },
    {
        key: 'telemetryOtelMetricsClientKey',
        path: 'telemetry.otel_metrics_client_key',
        group: 'telemetry',
        type: 'string',
    },
    { key: 'diagnosticsCrashHandler', path: 'diagnostics.crash_handler', group: 'telemetry', type: 'boolean' },
    {
        key: 'harnessWaitForUploads',
        path: 'harness.wait_for_uploads',
        group: 'telemetry',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'feedbackUserCommand', path: 'feedback.user.command', group: 'telemetry', type: 'string' },
    { key: 'feedbackUserEmail', path: 'feedback.user.email', group: 'telemetry', type: 'directEdit' },
    { key: 'feedbackUserName', path: 'feedback.user.name', group: 'telemetry', type: 'directEdit' },
];

// ui.timestamps の registry キーと、その on/off を写す旧キー（Grok が書き込みのたびに同期する）。
export const GROK_TIMESTAMPS_FIELD_KEY = 'uiTimestamps';
export const GROK_LEGACY_SHOW_TIMESTAMPS_PATH = 'ui.show_timestamps';
