// ============================================================
// Claude 固有の定数・IPC チャンネル・レジストリ
// ============================================================
import { homedir } from 'os';
import { join } from 'path';
import type { CleanupCandidateSpec, OtherCleanupItem, PluginCapabilities, SettingsFieldSpec } from '../types';
import type { OSType } from '../../types';

// Claude Desktopの設定ファイルパス
const getClaudeConfigPath = (platform: OSType): string => {
    if (platform === 'win32') {
        const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
        return join(appData, 'Claude');
    } else if (platform === 'darwin') {
        return join(homedir(), 'Library', 'Application Support', 'Claude');
    } else {
        return join(homedir(), '.config', 'Claude');
    }
};

export const CLAUDE_CONFIG_PATHS: Record<OSType, string> = {
    win32: getClaudeConfigPath('win32'),
    darwin: getClaudeConfigPath('darwin'),
    linux: getClaudeConfigPath('linux'),
};

export const CLAUDE_CONFIG_FILENAME = 'claude_desktop_config.json';
export const CLAUDE_CONFIG_DISABLED_FILENAME = 'claude_desktop_config_disabled.json';

// Claude Code (CLI) の設定ファイル（ホーム直下）
export const CLAUDE_CODE_CONFIG_FILENAME = '.claude.json';
// 無効化した MCP の退避先（ホーム直下、ドットを増やさない固定名）
export const CLAUDE_CODE_DISABLED_FILENAME = '.claude-disabled-mcp.json';
// Claude Code のデータディレクトリ（ホーム直下）
export const CLAUDE_DIR = '.claude';

// WSL distro に Claude Code が導入されているかの判定コマンド（bash -lc で実行）。
export const CLAUDE_WSL_CLI_TEST = `test -f ~/${CLAUDE_CODE_CONFIG_FILENAME}`;

// ============================================================
// IPC チャンネル
// ============================================================

// Claude Desktop MCP 管理用
export const CLAUDE_DESKTOP_CHANNELS = {
    GET_INFO: 'claude-desktop:get-info',
    GET_MCP_SERVERS: 'claude-desktop:get-mcp-servers',
    ENABLE: 'claude-desktop:enable-mcp-server',
    DISABLE: 'claude-desktop:disable-mcp-server',
    REORDER: 'claude-desktop:reorder-mcp-servers',
    REORDER_DISABLED: 'claude-desktop:reorder-disabled-mcp-servers',
    RESTART: 'claude-desktop:restart',
} as const;

// Claude Code (CLI) MCP 管理用
export const CLAUDE_CODE_CHANNELS = {
    GET_ENVIRONMENTS: 'claude-code:get-environments',
    GET_MCP_SERVERS: 'claude-code:get-mcp-servers',
    ENABLE: 'claude-code:enable-mcp-server',
    DISABLE: 'claude-code:disable-mcp-server',
    REORDER: 'claude-code:reorder-mcp-servers',
    REORDER_DISABLED: 'claude-code:reorder-disabled-mcp-servers',
} as const;

// Claude Code クリーンアップ用
export const CLAUDE_CLEANUP_CHANNELS = {
    GET_ENVIRONMENTS: 'claude-cleanup:get-environments',
    SCAN: 'claude-cleanup:scan',
    DELETE: 'claude-cleanup:delete',
    GET_OTHER_ENVIRONMENTS: 'claude-cleanup:get-other-environments',
    SCAN_OTHER: 'claude-cleanup:scan-other',
    DELETE_OTHER: 'claude-cleanup:delete-other',
} as const;

// Claude Code Agent・Skill 管理用
export const CLAUDE_ASSET_CHANNELS = {
    GET_ENVIRONMENTS: 'claude-asset:get-environments',
    LIST: 'claude-asset:list',
    READ_ENTRY: 'claude-asset:read-entry',
    REVEAL_ENTRY: 'claude-asset:reveal-entry',
    DOWNLOAD: 'claude-asset:download',
    INSPECT_UPLOAD: 'claude-asset:inspect-upload',
    UPLOAD: 'claude-asset:upload',
    UPLOAD_MD: 'claude-asset:upload-md',
    DELETE: 'claude-asset:delete',
    IS_GIT_AVAILABLE: 'claude-asset:is-git-available',
    LIST_OFFICIAL_SKILLS: 'claude-asset:list-official-skills',
    IMPORT_OFFICIAL_SKILLS: 'claude-asset:import-official-skills',
} as const;

// Claude Code 設定（settings.json）管理用
export const CLAUDE_SETTINGS_CHANNELS = {
    GET_ENVIRONMENTS: 'claude-settings:get-environments',
    READ: 'claude-settings:read',
    WRITE: 'claude-settings:write',
    WRITE_RAW: 'claude-settings:write-raw',
} as const;

// Claude Code プラグイン管理用
export const CLAUDE_PLUGIN_CHANNELS = {
    GET_ENVIRONMENTS: 'claude-plugin:get-environments',
    LIST: 'claude-plugin:list',
    CATALOG: 'claude-plugin:catalog',
    INSTALL: 'claude-plugin:install',
    UNINSTALL: 'claude-plugin:uninstall',
    SET_ENABLED: 'claude-plugin:set-enabled',
    ADD_MARKETPLACE: 'claude-plugin:add-marketplace',
    REMOVE_MARKETPLACE: 'claude-plugin:remove-marketplace',
} as const;

// ============================================================
// プラグイン管理
// ============================================================

// ヘッドレス実行する CLI コマンド名
export const CLAUDE_CLI_COMMAND = 'claude';

// 組み込みマーケットプレイス（削除ボタンを無効化する）
export const CLAUDE_BUILTIN_MARKETPLACES = ['claude-plugins-official'];

// プラグイン ID（<name>@<origin>）の @ 以降のうち、マーケットプレイスではない由来を表す予約名。
// inline=--plugin-dir 等のセッション限定、skills-dir=skills/ 配下のプラグインディレクトリ、
// synced=claude.ai から同期、builtin=組み込み。いずれもインストール記録を持たないため
// `claude plugin uninstall` の対象にならない（有効/無効は enabledPlugins で切り替える）。
export const CLAUDE_NON_MARKETPLACE_PLUGIN_ORIGINS = ['inline', 'skills-dir', 'synced', 'builtin'];

// プラグイン一覧に表示するスコープ。本アプリはホームディレクトリの管理ツールのため、
// user スコープのインストールと claude.ai 同期分（synced）だけを扱う。project / local は
// 特定プロジェクトの設定に属し、managed は組織管理のため対象外とする。
export const CLAUDE_LISTED_PLUGIN_SCOPES = ['user', 'synced'];

// GUI の機能出し分け。
// - directInstall=false: 個別リポジトリは「マーケットプレイスとして追加 → プラグイン選択」の 2 段階。
// - marketplaceRemoteUrl=true: ホストされた marketplace.json への直接 URL をソースに指定できる。
export const CLAUDE_PLUGIN_CAPABILITIES: PluginCapabilities = {
    directInstall: false,
    marketplaceRemoteUrl: true,
    catalog: true,
    marketplaceManagement: true,
    packageSource: false,
};

// ============================================================
// クリーンアップ候補
// ============================================================

// ~/.claude 外の一時物を扱う特別候補のキー。
// - BUNDLED_SKILLS: 一時ルート配下 bundled-skills/<バージョン>（組み込みスキルの展開先）。
// - BASH_EDIT_DIFF: 一時ルート配下 bash-edit-diff のうち、どのプロジェクトの会話履歴にも対応しないもの。
export const CLAUDE_TEMP_CLEANUP_KEYS = {
    BUNDLED_SKILLS: 'temp-bundled-skills',
    BASH_EDIT_DIFF: 'temp-bash-edit-diff',
} as const;

// 会話履歴の候補キー。プロジェクトごとの子要素に、同じプロジェクトの一時物（OS の一時フォルダの
// セッション作業フォルダ・bash-edit-diff、MCP ログのキャッシュ）を連動させる。
export const CLAUDE_PROJECTS_CLEANUP_KEY = 'projects';

// クリーンアップ候補（~/.claude 配下と ~/.claude 外の一時物、表示順・projects 先頭）。
// 対象は公式ドキュメント（claude-directory の「Application data」）が手動削除してよいとする
// 履歴／キャッシュ／一時／ログと、OS の一時フォルダに Claude Code が残す一時物。末尾の
// image-cache / todos / statsig / logs は現行版が書き込まない旧版のディレクトリ。
// 次は対象外: 設定・認証情報（settings.json / .credentials.json）、agents / skills / commands 等の
// 利用者資産、plugins の導入物（skills/.trash・plugins/.trash の退避分のみ対象）、agent-memory、
// jobs / daemon / teams / ide（バックグラウンドセッション等の稼働状態）、sessions（稼働中
// セッションの登録。終了時に Claude Code 自身が消す）、一時ルート自体と Claude Code 自身が掃除する一時物。
// デフォルトはすべてチェック OFF（ユーザーが明示的に選択する）。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: CLAUDE_PROJECTS_CLEANUP_KEY, defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'plans', defaultChecked: false, expandable: true, childKind: 'file' },
    { key: 'file-history', defaultChecked: false },
    { key: 'history', defaultChecked: false, kind: 'file', path: 'history.jsonl' },
    { key: 'paste-cache', defaultChecked: false },
    { key: 'uploads', defaultChecked: false },
    { key: 'shell-snapshots', defaultChecked: false },
    { key: 'cache', defaultChecked: false },
    { key: 'debug', defaultChecked: false },
    { key: 'session-env', defaultChecked: false },
    { key: 'tasks', defaultChecked: false },
    { key: 'usage-data', defaultChecked: false },
    { key: 'feedback-bundles', defaultChecked: false },
    { key: 'skills-trash', defaultChecked: false, path: 'skills/.trash' },
    { key: 'plugins-trash', defaultChecked: false, path: 'plugins/.trash' },
    { key: 'backups', defaultChecked: false },
    { key: CLAUDE_TEMP_CLEANUP_KEYS.BUNDLED_SKILLS, defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: CLAUDE_TEMP_CLEANUP_KEYS.BASH_EDIT_DIFF, defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'image-cache', defaultChecked: false },
    { key: 'todos', defaultChecked: false },
    { key: 'statsig', defaultChecked: false },
    { key: 'logs', defaultChecked: false },
];

// 「その他のツール」クリーンアップ項目の registry。
// 新しい外部ツール項目はここに 1 つ定義を追加するだけで UI まで反映される。
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
// Claude Code 設定（~/.claude/settings.json）編集レジストリ
// ============================================================

// Claude Code 設定ファイル（~/.claude/settings.json）。CLAUDE_DIR 配下。
export const CLAUDE_CODE_SETTINGS_FILENAME = 'settings.json';

// settings.json の設定項目 registry。
// scalar は読み取り・テーブル編集・保存まで反映し、配列・オブジェクトは directEdit として
// 一覧へ表示するだけでテーブル保存から除外する。
// group ごとにまとめて宣言する。UI はグループが最初に現れる順に見出し付きで表示する。
// defaultOn は未設定時に Claude Code が採用する既定値（公式ドキュメント準拠）。
export const SETTINGS_FIELDS: SettingsFieldSpec[] = [
    // === モデル・思考 ===
    {
        key: 'model',
        path: 'model',
        group: 'model',
        type: 'string',
        choices: [
            'default',
            'best',
            'fable',
            'sonnet',
            'opus',
            'haiku',
            'sonnet[1m]',
            'opus[1m]',
            'opusplan',
            'claude-fable-5-1',
            'claude-fable-5',
            'claude-opus-5-5',
            'claude-sonnet-5-5',
            'claude-haiku-5-5',
        ],
        allowCustom: true,
    },
    {
        key: 'advisorModel',
        path: 'advisorModel',
        group: 'model',
        type: 'string',
        choices: ['opus', 'sonnet', 'fable', 'claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5'],
        allowCustom: true,
    },
    {
        key: 'effortLevel',
        path: 'effortLevel',
        group: 'model',
        type: 'string',
        choices: ['low', 'medium', 'high', 'xhigh'],
    },
    // max は上限なしを意味する（未設定と同じく制限しない）。
    {
        key: 'maxEffortLevel',
        path: 'maxEffortLevel',
        group: 'model',
        type: 'string',
        choices: ['low', 'medium', 'high', 'xhigh', 'max'],
    },
    { key: 'ultracode', path: 'ultracode', group: 'model', type: 'boolean', defaultOn: false },
    { key: 'alwaysThinkingEnabled', path: 'alwaysThinkingEnabled', group: 'model', type: 'boolean' },
    // language は任意の言語名を受け付ける自由文字列（japanese / english / spanish ...）。choices で限定しない。
    { key: 'language', path: 'language', group: 'model', type: 'string' },
    // outputStyle は組み込み（default / Explanatory / Learning）に加えカスタムも可。自由入力とする。
    { key: 'outputStyle', path: 'outputStyle', group: 'model', type: 'string' },
    { key: 'fastMode', path: 'fastMode', group: 'model', type: 'boolean' },
    {
        key: 'fastModePerSessionOptIn',
        path: 'fastModePerSessionOptIn',
        group: 'model',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'switchModelsOnFlag', path: 'switchModelsOnFlag', group: 'model', type: 'boolean', defaultOn: true },
    { key: 'promptCacheTtl', path: 'promptCacheTtl', group: 'model', type: 'string', choices: ['5m', '1h'] },
    {
        key: 'subagentPromptCacheTtl',
        path: 'subagentPromptCacheTtl',
        group: 'model',
        type: 'string',
        choices: ['5m', '1h'],
    },
    {
        key: 'enforceAvailableModels',
        path: 'enforceAvailableModels',
        group: 'model',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'availableModels', path: 'availableModels', group: 'model', type: 'directEdit' },
    { key: 'fallbackModel', path: 'fallbackModel', group: 'model', type: 'directEdit' },
    { key: 'modelOverrides', path: 'modelOverrides', group: 'model', type: 'directEdit' },
    { key: 'modelPicker', path: 'modelPicker', group: 'model', type: 'directEdit' },
    { key: 'modelSettings', path: 'modelSettings', group: 'model', type: 'directEdit' },

    // === エージェント ===
    // env オブジェクト内の CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS を ON/OFF するフラグ。
    // ON で "1" を設定、OFF で当該キーを削除する（env 内の他キーには触れない）。
    {
        key: 'agentTeams',
        path: 'env',
        group: 'agent',
        type: 'envFlag',
        envKey: 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
        onValue: '1',
    },
    {
        key: 'teammateMode',
        path: 'teammateMode',
        group: 'agent',
        type: 'string',
        choices: ['in-process', 'auto', 'tmux', 'iterm2'],
        defaultValue: 'in-process',
    },
    { key: 'agentPushNotifEnabled', path: 'agentPushNotifEnabled', group: 'agent', type: 'boolean', defaultOn: false },
    {
        key: 'inputNeededNotifEnabled',
        path: 'inputNeededNotifEnabled',
        group: 'agent',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'agent', path: 'agent', group: 'agent', type: 'string' },
    {
        key: 'crossSessionInbound',
        path: 'crossSessionInbound',
        group: 'agent',
        type: 'string',
        choices: ['accept', 'hold', 'refuse'],
    },
    { key: 'isolatePeerMachines', path: 'isolatePeerMachines', group: 'agent', type: 'boolean', defaultOn: false },

    // === 表示・通知 ===
    {
        key: 'editorMode',
        path: 'editorMode',
        group: 'display',
        type: 'string',
        choices: ['normal', 'vim'],
        defaultValue: 'normal',
    },
    {
        key: 'preferredNotifChannel',
        path: 'preferredNotifChannel',
        group: 'display',
        type: 'string',
        choices: ['auto', 'terminal_bell', 'iterm2', 'iterm2_with_bell', 'kitty', 'ghostty', 'notifications_disabled'],
        defaultValue: 'auto',
    },
    { key: 'spinnerTipsEnabled', path: 'spinnerTipsEnabled', group: 'display', type: 'boolean', defaultOn: true },
    {
        key: 'emojiCompletionEnabled',
        path: 'emojiCompletionEnabled',
        group: 'display',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'showTurnDuration', path: 'showTurnDuration', group: 'display', type: 'boolean', defaultOn: true },
    { key: 'autoScrollEnabled', path: 'autoScrollEnabled', group: 'display', type: 'boolean', defaultOn: true },
    { key: 'awaySummaryEnabled', path: 'awaySummaryEnabled', group: 'display', type: 'boolean', defaultOn: true },
    { key: 'axScreenReader', path: 'axScreenReader', group: 'display', type: 'boolean' },
    {
        key: 'prefersReducedMotion',
        path: 'prefersReducedMotion',
        group: 'display',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'promptSuggestionEnabled',
        path: 'promptSuggestionEnabled',
        group: 'display',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'showThinkingSummaries',
        path: 'showThinkingSummaries',
        group: 'display',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'syntaxHighlightingDisabled',
        path: 'syntaxHighlightingDisabled',
        group: 'display',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'terminalProgressBarEnabled',
        path: 'terminalProgressBarEnabled',
        group: 'display',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'terminalTitleFromRename',
        path: 'terminalTitleFromRename',
        group: 'display',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'theme',
        path: 'theme',
        group: 'display',
        type: 'string',
        choices: ['auto', 'dark', 'light', 'dark-daltonized', 'light-daltonized', 'dark-ansi', 'light-ansi'],
        allowCustom: true,
        defaultValue: 'dark',
    },
    // timeFormat はプリセットに加え strftime パターン（% を含む値）も受け付けるため自由入力を許可する。
    {
        key: 'timeFormat',
        path: 'timeFormat',
        group: 'display',
        type: 'string',
        choices: ['auto', '12-hour', '24-hour', '24-hour-utc'],
        allowCustom: true,
        defaultValue: 'auto',
    },
    // timeZone は IANA タイムゾーン名（UTC / Asia/Tokyo ...）の自由文字列。
    { key: 'timeZone', path: 'timeZone', group: 'display', type: 'string' },
    { key: 'maxProseWidth', path: 'maxProseWidth', group: 'display', type: 'number', min: 40, integer: true },
    { key: 'tui', path: 'tui', group: 'display', type: 'string', choices: ['default', 'fullscreen'] },
    { key: 'verbose', path: 'verbose', group: 'display', type: 'boolean', defaultOn: false },
    { key: 'viewMode', path: 'viewMode', group: 'display', type: 'string', choices: ['default', 'verbose', 'focus'] },
    {
        key: 'wheelScrollAccelerationEnabled',
        path: 'wheelScrollAccelerationEnabled',
        group: 'display',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'footerLinksRegexes', path: 'footerLinksRegexes', group: 'display', type: 'directEdit' },
    { key: 'spinnerTipsOverride', path: 'spinnerTipsOverride', group: 'display', type: 'directEdit' },
    { key: 'spinnerVerbs', path: 'spinnerVerbs', group: 'display', type: 'directEdit' },
    { key: 'spellcheck', path: 'spellcheck', group: 'display', type: 'directEdit' },
    { key: 'vimInsertModeRemaps', path: 'vimInsertModeRemaps', group: 'display', type: 'directEdit' },
    { key: 'voice', path: 'voice', group: 'display', type: 'directEdit' },
    // statusLine / subagentStatusLine は type="command" と command が必須のオブジェクト。配下の値を個別行に
    // 分解すると必須キーを欠いたオブジェクトを書けてしまうため、親を directEdit とする。
    { key: 'statusLine', path: 'statusLine', group: 'display', type: 'directEdit' },
    { key: 'subagentStatusLine', path: 'subagentStatusLine', group: 'display', type: 'directEdit' },

    // === 動作・データ ===
    { key: 'autoMemoryEnabled', path: 'autoMemoryEnabled', group: 'behavior', type: 'boolean', defaultOn: true },
    { key: 'autoMemoryDirectory', path: 'autoMemoryDirectory', group: 'behavior', type: 'string' },
    {
        key: 'autoUpdatesChannel',
        path: 'autoUpdatesChannel',
        group: 'behavior',
        type: 'string',
        choices: ['stable', 'latest'],
        defaultValue: 'latest',
    },
    // minimumVersion は "2.1.100" 形式のバージョン文字列。
    { key: 'minimumVersion', path: 'minimumVersion', group: 'behavior', type: 'string' },
    { key: 'cleanupPeriodDays', path: 'cleanupPeriodDays', group: 'behavior', type: 'number', min: 1, integer: true },
    {
        key: 'desktopSessionCleanupPeriodDays',
        path: 'desktopSessionCleanupPeriodDays',
        group: 'behavior',
        type: 'number',
        min: 0,
        integer: true,
        defaultValue: 0,
    },
    { key: 'autoCompactEnabled', path: 'autoCompactEnabled', group: 'behavior', type: 'boolean', defaultOn: true },
    { key: 'idleCompaction', path: 'idleCompaction', group: 'behavior', type: 'boolean', defaultOn: true },
    {
        key: 'autoCompactWindow',
        path: 'autoCompactWindow',
        group: 'behavior',
        type: 'number',
        min: 100000,
        max: 1000000,
        integer: true,
    },
    {
        key: 'fileCheckpointingEnabled',
        path: 'fileCheckpointingEnabled',
        group: 'behavior',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'askUserQuestionTimeout',
        path: 'askUserQuestionTimeout',
        group: 'behavior',
        type: 'string',
        choices: ['never', '60s', '5m', '10m'],
        defaultValue: 'never',
    },
    {
        key: 'dialogExpiry',
        path: 'dialogExpiry',
        group: 'behavior',
        type: 'string',
        choices: ['60s', '5m', '10m', 'never'],
        defaultValue: '5m',
    },
    {
        key: 'autoContinueAtUsageLimit',
        path: 'autoContinueAtUsageLimit',
        group: 'behavior',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'bashEditDiffEnabled', path: 'bashEditDiffEnabled', group: 'behavior', type: 'boolean' },
    // 4000 未満・128000 超の値は Claude Code 側でも範囲内へ丸められる。
    {
        key: 'bashOutputMaxChars',
        path: 'bashOutputMaxChars',
        group: 'behavior',
        type: 'number',
        min: 4000,
        max: 128000,
        integer: true,
    },
    {
        key: 'defaultShell',
        path: 'defaultShell',
        group: 'behavior',
        type: 'string',
        choices: ['bash', 'powershell'],
    },
    { key: 'feedbackSurveyRate', path: 'feedbackSurveyRate', group: 'behavior', type: 'number', min: 0, max: 1 },
    {
        key: 'feedbackDrafts',
        path: 'feedbackDrafts',
        group: 'behavior',
        type: 'string',
        choices: ['notify', 'quiet', 'off'],
        defaultValue: 'notify',
    },
    {
        key: 'includeGitInstructions',
        path: 'includeGitInstructions',
        group: 'behavior',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'plansDirectory', path: 'plansDirectory', group: 'behavior', type: 'string' },
    { key: 'respectGitignore', path: 'respectGitignore', group: 'behavior', type: 'boolean', defaultOn: true },
    {
        key: 'respondToBashCommands',
        path: 'respondToBashCommands',
        group: 'behavior',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'showClearContextOnPlanAccept',
        path: 'showClearContextOnPlanAccept',
        group: 'behavior',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'skipWebFetchPreflight', path: 'skipWebFetchPreflight', group: 'behavior', type: 'boolean' },
    {
        key: 'useAutoModeDuringPlan',
        path: 'useAutoModeDuringPlan',
        group: 'behavior',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'workflowKeywordTriggerEnabled',
        path: 'workflowKeywordTriggerEnabled',
        group: 'behavior',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'workflowSizeGuideline',
        path: 'workflowSizeGuideline',
        group: 'behavior',
        type: 'string',
        choices: ['unrestricted', 'small', 'medium', 'large'],
        defaultValue: 'medium',
    },
    // enableWorkflows の未設定時はプランに依存する（Pro プランのみ無効）ため既定値を宣言しない。
    { key: 'enableWorkflows', path: 'enableWorkflows', group: 'behavior', type: 'boolean' },
    { key: 'disableWorkflows', path: 'disableWorkflows', group: 'behavior', type: 'boolean', defaultOn: false },
    { key: 'disableBundledSkills', path: 'disableBundledSkills', group: 'behavior', type: 'boolean' },
    // syncClaudeAi* は false のみが意味を持つ（true は未設定と同じ）。
    { key: 'syncClaudeAiSkills', path: 'syncClaudeAiSkills', group: 'behavior', type: 'boolean' },
    { key: 'syncClaudeAiPlugins', path: 'syncClaudeAiPlugins', group: 'behavior', type: 'boolean' },
    { key: 'disableAllHooks', path: 'disableAllHooks', group: 'behavior', type: 'boolean' },
    { key: 'disableAgentView', path: 'disableAgentView', group: 'behavior', type: 'boolean' },
    {
        key: 'disableClaudeAiConnectors',
        path: 'disableClaudeAiConnectors',
        group: 'behavior',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'disableRemoteControl', path: 'disableRemoteControl', group: 'behavior', type: 'boolean', defaultOn: false },
    { key: 'remoteControlAtStartup', path: 'remoteControlAtStartup', group: 'behavior', type: 'boolean' },
    { key: 'apiKeyHelper', path: 'apiKeyHelper', group: 'behavior', type: 'string' },
    { key: 'awsAuthRefresh', path: 'awsAuthRefresh', group: 'behavior', type: 'string' },
    { key: 'awsCredentialExport', path: 'awsCredentialExport', group: 'behavior', type: 'string' },
    { key: 'gcpAuthRefresh', path: 'gcpAuthRefresh', group: 'behavior', type: 'string' },
    { key: 'otelHeadersHelper', path: 'otelHeadersHelper', group: 'behavior', type: 'string' },
    { key: 'processWrapper', path: 'processWrapper', group: 'behavior', type: 'string' },
    { key: 'prUrlTemplate', path: 'prUrlTemplate', group: 'behavior', type: 'string' },
    {
        key: 'forceLoginMethod',
        path: 'forceLoginMethod',
        group: 'behavior',
        type: 'string',
        choices: ['claudeai', 'console', 'gateway'],
    },
    { key: 'forceLoginGatewayUrl', path: 'forceLoginGatewayUrl', group: 'behavior', type: 'string' },
    { key: 'remoteDefaultEnvironmentId', path: 'remote.defaultEnvironmentId', group: 'behavior', type: 'string' },
    {
        key: 'worktreeBaseRef',
        path: 'worktree.baseRef',
        group: 'behavior',
        type: 'string',
        choices: ['fresh', 'head'],
        defaultValue: 'fresh',
    },
    {
        key: 'worktreeBgIsolation',
        path: 'worktree.bgIsolation',
        group: 'behavior',
        type: 'string',
        choices: ['worktree', 'none'],
        defaultValue: 'worktree',
    },
    { key: 'worktreeLocation', path: 'worktree.location', group: 'behavior', type: 'string' },
    {
        key: 'enableAllProjectMcpServers',
        path: 'enableAllProjectMcpServers',
        group: 'behavior',
        type: 'boolean',
    },
    // enableArtifact は false のみが意味を持つ（true は未設定と同じ）。
    { key: 'enableArtifact', path: 'enableArtifact', group: 'behavior', type: 'boolean' },
    { key: 'disableAutoMode', path: 'disableAutoMode', group: 'behavior', type: 'string', choices: ['disable'] },
    {
        key: 'disableDeepLinkRegistration',
        path: 'disableDeepLinkRegistration',
        group: 'behavior',
        type: 'string',
        choices: ['disable'],
    },
    { key: 'disableSkillShellExecution', path: 'disableSkillShellExecution', group: 'behavior', type: 'boolean' },
    // skillListingBudgetFraction は 0 より大きく 1 以下（0 は受け付けない）。
    {
        key: 'skillListingBudgetFraction',
        path: 'skillListingBudgetFraction',
        group: 'behavior',
        type: 'number',
        min: 0,
        exclusiveMin: true,
        max: 1,
        defaultValue: 0.01,
    },
    {
        key: 'skillListingMaxDescChars',
        path: 'skillListingMaxDescChars',
        group: 'behavior',
        type: 'number',
        min: 1,
        integer: true,
        defaultValue: 1536,
    },
    {
        key: 'autoModeClassifyAllShell',
        path: 'autoMode.classifyAllShell',
        group: 'behavior',
        type: 'boolean',
        defaultOn: false,
    },
    // attribution はオブジェクト（commit / pr / sessionUrl）または false を取るハイブリッド型のため、
    // 配下の値を個別行に分解せず親を directEdit とする。
    { key: 'attribution', path: 'attribution', group: 'behavior', type: 'directEdit' },
    { key: 'autoMode', path: 'autoMode', group: 'behavior', type: 'directEdit' },
    { key: 'companyAnnouncements', path: 'companyAnnouncements', group: 'behavior', type: 'directEdit' },
    { key: 'env', path: 'env', group: 'behavior', type: 'directEdit' },
    // fileSuggestion も type="command" と command が必須のオブジェクトのため、親を directEdit とする。
    { key: 'fileSuggestion', path: 'fileSuggestion', group: 'behavior', type: 'directEdit' },
    { key: 'hooks', path: 'hooks', group: 'behavior', type: 'directEdit' },
    { key: 'skillOverrides', path: 'skillOverrides', group: 'behavior', type: 'directEdit' },
    { key: 'sshConfigs', path: 'sshConfigs', group: 'behavior', type: 'directEdit' },
    { key: 'worktreeSymlinkDirectories', path: 'worktree.symlinkDirectories', group: 'behavior', type: 'directEdit' },
    { key: 'worktreeSparsePaths', path: 'worktree.sparsePaths', group: 'behavior', type: 'directEdit' },
    { key: 'enabledPlugins', path: 'enabledPlugins', group: 'behavior', type: 'directEdit' },
    { key: 'pluginConfigs', path: 'pluginConfigs', group: 'behavior', type: 'directEdit' },
    { key: 'prependPlugins', path: 'prependPlugins', group: 'behavior', type: 'directEdit' },
    { key: 'appendPlugins', path: 'appendPlugins', group: 'behavior', type: 'directEdit' },
    { key: 'extraKnownMarketplaces', path: 'extraKnownMarketplaces', group: 'behavior', type: 'directEdit' },
    { key: 'enabledMcpjsonServers', path: 'enabledMcpjsonServers', group: 'behavior', type: 'directEdit' },
    { key: 'disabledMcpjsonServers', path: 'disabledMcpjsonServers', group: 'behavior', type: 'directEdit' },
    { key: 'allowedMcpServers', path: 'allowedMcpServers', group: 'behavior', type: 'directEdit' },
    { key: 'deniedMcpServers', path: 'deniedMcpServers', group: 'behavior', type: 'directEdit' },
    { key: 'allowedHttpHookUrls', path: 'allowedHttpHookUrls', group: 'behavior', type: 'directEdit' },
    { key: 'httpHookAllowedEnvVars', path: 'httpHookAllowedEnvVars', group: 'behavior', type: 'directEdit' },
    { key: 'claudeMdExcludes', path: 'claudeMdExcludes', group: 'behavior', type: 'directEdit' },
    // forceLoginOrgUUID は文字列と配列のどちらも取りうるハイブリッド型のため directEdit とする。
    { key: 'forceLoginOrgUUID', path: 'forceLoginOrgUUID', group: 'behavior', type: 'directEdit' },

    // === 権限（permissions オブジェクト内の定義済みキーと、権限確認に関わるトップレベルキー） ===
    // scalar（defaultMode / disableBypassPermissionsMode 等）はドット区切り path でネスト編集する。
    // 配列（allow / ask / deny / additionalDirectories）は directEdit として一覧表示のみ。
    // permissions.disableAutoMode はトップレベル disableAutoMode の別名のため登録しない。
    // skipDangerousModePermissionPrompt / skipAutoPermissionPrompt はトップレベルのキー。
    {
        key: 'permissionsDefaultMode',
        path: 'permissions.defaultMode',
        group: 'permissions',
        type: 'string',
        choices: ['default', 'acceptEdits', 'plan', 'auto', 'dontAsk', 'bypassPermissions', 'manual'],
        defaultValue: 'default',
    },
    {
        key: 'permissionsDisableBypassPermissionsMode',
        path: 'permissions.disableBypassPermissionsMode',
        group: 'permissions',
        type: 'string',
        choices: ['disable'],
    },
    {
        key: 'permissionsBlockReadsOutsideWorkingDirectories',
        path: 'permissions.blockReadsOutsideWorkingDirectories',
        group: 'permissions',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'skipDangerousModePermissionPrompt',
        path: 'skipDangerousModePermissionPrompt',
        group: 'permissions',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'skipAutoPermissionPrompt',
        path: 'skipAutoPermissionPrompt',
        group: 'permissions',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'permissionsAllow', path: 'permissions.allow', group: 'permissions', type: 'directEdit' },
    { key: 'permissionsAsk', path: 'permissions.ask', group: 'permissions', type: 'directEdit' },
    { key: 'permissionsDeny', path: 'permissions.deny', group: 'permissions', type: 'directEdit' },
    {
        key: 'permissionsAdditionalDirectories',
        path: 'permissions.additionalDirectories',
        group: 'permissions',
        type: 'directEdit',
    },

    // === サンドボックス（sandbox オブジェクト内の定義済みキー） ===
    // scalar はネスト編集し、配列（excludedCommands / filesystem.allowWrite 等）や
    // credentials は sandbox 全体の directEdit で扱う。
    { key: 'sandboxEnabled', path: 'sandbox.enabled', group: 'sandbox', type: 'boolean', defaultOn: false },
    {
        key: 'sandboxFailIfUnavailable',
        path: 'sandbox.failIfUnavailable',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxAllowUnsandboxedCommands',
        path: 'sandbox.allowUnsandboxedCommands',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'sandboxAutoAllowBashIfSandboxed',
        path: 'sandbox.autoAllowBashIfSandboxed',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: true,
    },
    {
        key: 'sandboxAllowAppleEvents',
        path: 'sandbox.allowAppleEvents',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxEnableWeakerNetworkIsolation',
        path: 'sandbox.enableWeakerNetworkIsolation',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxEnableWeakerNestedSandbox',
        path: 'sandbox.enableWeakerNestedSandbox',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxFilesystemDisabled',
        path: 'sandbox.filesystem.disabled',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxNetworkHttpProxyPort',
        path: 'sandbox.network.httpProxyPort',
        group: 'sandbox',
        type: 'number',
        min: 1,
        max: 65535,
        integer: true,
    },
    {
        key: 'sandboxNetworkSocksProxyPort',
        path: 'sandbox.network.socksProxyPort',
        group: 'sandbox',
        type: 'number',
        min: 1,
        max: 65535,
        integer: true,
    },
    {
        key: 'sandboxNetworkStrictAllowlist',
        path: 'sandbox.network.strictAllowlist',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxNetworkAllowAllUnixSockets',
        path: 'sandbox.network.allowAllUnixSockets',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxNetworkAllowLocalBinding',
        path: 'sandbox.network.allowLocalBinding',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    {
        key: 'sandboxCredentialsAllowPlaintextInject',
        path: 'sandbox.credentials.allowPlaintextInject',
        group: 'sandbox',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'sandbox', path: 'sandbox', group: 'sandbox', type: 'directEdit' },
];

// ============================================================
// claude.ai のアカウントで有効なスキルを Claude Code が同期する skills/ 直下のディレクトリ。
// 構成は synced/<組織ID>_<ユーザーID>/<スキル名>/SKILL.md（同期バケット配下に各スキル）。
export const SYNCED_SKILLS_DIR = 'synced';

// 公式スキルリポジトリ（Anthropic 公式 skills）
// ============================================================

// clone/pull のソースとして使用する。
export const OFFICIAL_SKILLS_REPO_URL = 'https://github.com/anthropics/skills.git';
// 公式リポジトリの既定ブランチ。
export const OFFICIAL_SKILLS_REPO_BRANCH = 'main';
// リポジトリ内のスキル格納ディレクトリ（リポジトリルートからの相対）。
export const OFFICIAL_SKILLS_REPO_SUBDIR = 'skills';
// clone 先ディレクトリ名（app.getPath('userData')/repos/<dir>）。
export const OFFICIAL_SKILLS_REPO_DIRNAME = 'anthropics-skills';

// Claude Desktop実行ファイルパス
export const getClaudeExecutablePaths = (): string[] => {
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
        return [join(localAppData, 'AnthropicClaude', 'claude.exe')];
    } else if (process.platform === 'darwin') {
        // ユーザーレベルを優先、次にシステムレベル
        return [
            join(homedir(), 'Applications', 'Claude.app', 'Contents', 'MacOS', 'Claude'),
            '/Applications/Claude.app/Contents/MacOS/Claude',
        ];
    } else {
        return ['/usr/bin/claude', '/usr/local/bin/claude', join(homedir(), '.local', 'bin', 'claude')];
    }
};
