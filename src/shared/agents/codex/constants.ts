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

// config.toml の編集対象項目（registry）。公式 config リファレンス準拠。
// path はドット区切りキー（ネストは該当 [table] に書き込む）。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    // === モデル ===
    { key: 'model', path: 'model', group: 'model', type: 'string' },
    // model_provider は [model_providers.<id>] で定義した任意 ID を取るため choices で限定しない。既定は openai。
    { key: 'modelProvider', path: 'model_provider', group: 'model', type: 'string' },
    {
        key: 'modelReasoningEffort',
        path: 'model_reasoning_effort',
        group: 'model',
        type: 'string',
        choices: ['minimal', 'low', 'medium', 'high', 'xhigh'],
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
        defaultOn: false,
    },
    { key: 'modelContextWindow', path: 'model_context_window', group: 'model', type: 'number', min: 1 },

    // === セキュリティ・動作 ===
    {
        key: 'approvalPolicy',
        path: 'approval_policy',
        group: 'security',
        type: 'string',
        choices: ['untrusted', 'on-request', 'never'],
    },
    {
        key: 'sandboxMode',
        path: 'sandbox_mode',
        group: 'security',
        type: 'string',
        choices: ['read-only', 'workspace-write', 'danger-full-access'],
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
        key: 'historyPersistence',
        path: 'history.persistence',
        group: 'security',
        type: 'string',
        choices: ['save-all', 'none'],
    },

    // === 表示 ===
    {
        key: 'fileOpener',
        path: 'file_opener',
        group: 'display',
        type: 'string',
        choices: ['vscode', 'vscode-insiders', 'windsurf', 'cursor', 'none'],
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

    // === データ ===
    { key: 'projectDocMaxBytes', path: 'project_doc_max_bytes', group: 'data', type: 'number', min: 0 },
    { key: 'analyticsEnabled', path: 'analytics.enabled', group: 'data', type: 'boolean' },
    { key: 'feedbackEnabled', path: 'feedback.enabled', group: 'data', type: 'boolean', defaultOn: true },
];

// グループの表示順（UI の見出し順）。
export const SETTINGS_GROUP_ORDER: string[] = ['model', 'security', 'display', 'data'];

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
