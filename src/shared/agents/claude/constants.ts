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
// 共通 WslDetector.getDistrosWithTest() に渡す。
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

// クリーンアップ候補ディレクトリ（~/.claude 配下、表示順・projects 先頭）。
// 対象は履歴／キャッシュ／一時／ログのみ。plugins/skills（インストール資産）や
// daemon/ide（稼働中ランタイム状態）、jobs/teams（設定）は対象外。
// backups は復旧用セーフティネットのためデフォルト未チェック。
// デフォルトはすべてチェック OFF（ユーザーが明示的に選択する）。
export const CLEANUP_CANDIDATES: CleanupCandidateSpec[] = [
    { key: 'projects', defaultChecked: false, expandable: true, childKind: 'dir' },
    { key: 'plans', defaultChecked: false, expandable: true, childKind: 'file' },
    { key: 'file-history', defaultChecked: false },
    { key: 'history', defaultChecked: false, kind: 'file', path: 'history.jsonl' },
    { key: 'shell-snapshots', defaultChecked: false },
    { key: 'cache', defaultChecked: false },
    { key: 'debug', defaultChecked: false },
    { key: 'sessions', defaultChecked: false },
    { key: 'session-env', defaultChecked: false },
    { key: 'tasks', defaultChecked: false },
    { key: 'backups', defaultChecked: false },
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
// group ごとにまとめて宣言する。SETTINGS_GROUP_ORDER の順で UI に見出し付きで表示される。
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
            'claude-fable-5',
            'claude-fable-5[1m]',
            'claude-sonnet-5',
            'claude-sonnet-5[1m]',
            'claude-opus-4-8',
            'claude-opus-4-8[1m]',
            'claude-haiku-4-5',
        ],
        allowCustom: true,
    },
    {
        key: 'advisorModel',
        path: 'advisorModel',
        group: 'model',
        type: 'string',
        choices: ['opus', 'sonnet', 'fable', 'claude-fable-5', 'claude-sonnet-5', 'claude-opus-4-8'],
        allowCustom: true,
    },
    {
        key: 'effortLevel',
        path: 'effortLevel',
        group: 'model',
        type: 'string',
        choices: ['low', 'medium', 'high', 'xhigh'],
    },
    { key: 'alwaysThinkingEnabled', path: 'alwaysThinkingEnabled', group: 'model', type: 'boolean' },
    // language は任意の言語名を受け付ける自由文字列（japanese / english / spanish ...）。choices で限定しない。
    { key: 'language', path: 'language', group: 'model', type: 'string' },
    // outputStyle は組み込み（default / Explanatory / Learning）に加えカスタムも可。自由入力とする。
    { key: 'outputStyle', path: 'outputStyle', group: 'model', type: 'string' },
    { key: 'fastMode', path: 'fastMode', group: 'model', type: 'boolean' },
    { key: 'fastModePerSessionOptIn', path: 'fastModePerSessionOptIn', group: 'model', type: 'boolean' },
    { key: 'availableModels', path: 'availableModels', group: 'model', type: 'directEdit' },
    { key: 'fallbackModel', path: 'fallbackModel', group: 'model', type: 'directEdit' },
    { key: 'modelOverrides', path: 'modelOverrides', group: 'model', type: 'directEdit' },

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
    { key: 'showTurnDuration', path: 'showTurnDuration', group: 'display', type: 'boolean', defaultOn: true },
    { key: 'autoScrollEnabled', path: 'autoScrollEnabled', group: 'display', type: 'boolean', defaultOn: true },
    { key: 'awaySummaryEnabled', path: 'awaySummaryEnabled', group: 'display', type: 'boolean', defaultOn: true },
    { key: 'axScreenReader', path: 'axScreenReader', group: 'display', type: 'boolean' },
    { key: 'prefersReducedMotion', path: 'prefersReducedMotion', group: 'display', type: 'boolean' },
    {
        key: 'showThinkingSummaries',
        path: 'showThinkingSummaries',
        group: 'display',
        type: 'boolean',
        defaultOn: false,
    },
    { key: 'syntaxHighlightingDisabled', path: 'syntaxHighlightingDisabled', group: 'display', type: 'boolean' },
    {
        key: 'terminalProgressBarEnabled',
        path: 'terminalProgressBarEnabled',
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
    { key: 'vimInsertModeRemaps', path: 'vimInsertModeRemaps', group: 'display', type: 'directEdit' },
    { key: 'voice', path: 'voice', group: 'display', type: 'directEdit' },

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
    { key: 'cleanupPeriodDays', path: 'cleanupPeriodDays', group: 'behavior', type: 'number', min: 1, integer: true },
    { key: 'autoCompactEnabled', path: 'autoCompactEnabled', group: 'behavior', type: 'boolean', defaultOn: true },
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
        key: 'defaultShell',
        path: 'defaultShell',
        group: 'behavior',
        type: 'string',
        choices: ['bash', 'powershell'],
    },
    { key: 'feedbackSurveyRate', path: 'feedbackSurveyRate', group: 'behavior', type: 'number', min: 0, max: 1 },
    {
        key: 'includeGitInstructions',
        path: 'includeGitInstructions',
        group: 'behavior',
        type: 'boolean',
        defaultOn: true,
    },
    { key: 'minimumVersion', path: 'minimumVersion', group: 'behavior', type: 'string' },
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
    { key: 'disableWorkflows', path: 'disableWorkflows', group: 'behavior', type: 'boolean', defaultOn: false },
    { key: 'disableBundledSkills', path: 'disableBundledSkills', group: 'behavior', type: 'boolean' },
    { key: 'disableAllHooks', path: 'disableAllHooks', group: 'behavior', type: 'boolean' },
    { key: 'disableAgentView', path: 'disableAgentView', group: 'behavior', type: 'boolean' },
    { key: 'disableArtifact', path: 'disableArtifact', group: 'behavior', type: 'boolean' },
    { key: 'disableClaudeAiConnectors', path: 'disableClaudeAiConnectors', group: 'behavior', type: 'boolean' },
    { key: 'disableRemoteControl', path: 'disableRemoteControl', group: 'behavior', type: 'boolean' },
    { key: 'remoteControlAtStartup', path: 'remoteControlAtStartup', group: 'behavior', type: 'boolean' },
    { key: 'apiKeyHelper', path: 'apiKeyHelper', group: 'behavior', type: 'string' },
    { key: 'awsAuthRefresh', path: 'awsAuthRefresh', group: 'behavior', type: 'string' },
    { key: 'awsCredentialExport', path: 'awsCredentialExport', group: 'behavior', type: 'string' },
    { key: 'gcpAuthRefresh', path: 'gcpAuthRefresh', group: 'behavior', type: 'string' },
    { key: 'otelHeadersHelper', path: 'otelHeadersHelper', group: 'behavior', type: 'string' },
    { key: 'prUrlTemplate', path: 'prUrlTemplate', group: 'behavior', type: 'string' },
    {
        key: 'enableAllProjectMcpServers',
        path: 'enableAllProjectMcpServers',
        group: 'behavior',
        type: 'boolean',
    },
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
    {
        key: 'skillListingBudgetFraction',
        path: 'skillListingBudgetFraction',
        group: 'behavior',
        type: 'number',
        min: 0,
        max: 1,
    },
    {
        key: 'skillListingMaxDescChars',
        path: 'skillListingMaxDescChars',
        group: 'behavior',
        type: 'number',
        min: 1,
        integer: true,
    },
    { key: 'attribution', path: 'attribution', group: 'behavior', type: 'directEdit' },
    { key: 'autoMode', path: 'autoMode', group: 'behavior', type: 'directEdit' },
    { key: 'companyAnnouncements', path: 'companyAnnouncements', group: 'behavior', type: 'directEdit' },
    { key: 'env', path: 'env', group: 'behavior', type: 'directEdit' },
    { key: 'fileSuggestion', path: 'fileSuggestion', group: 'behavior', type: 'directEdit' },
    { key: 'hooks', path: 'hooks', group: 'behavior', type: 'directEdit' },
    { key: 'permissions', path: 'permissions', group: 'behavior', type: 'directEdit' },
    { key: 'sandbox', path: 'sandbox', group: 'behavior', type: 'directEdit' },
    { key: 'skillOverrides', path: 'skillOverrides', group: 'behavior', type: 'directEdit' },
    { key: 'sshConfigs', path: 'sshConfigs', group: 'behavior', type: 'directEdit' },
    { key: 'worktreeSymlinkDirectories', path: 'worktree.symlinkDirectories', group: 'behavior', type: 'directEdit' },
    { key: 'worktreeSparsePaths', path: 'worktree.sparsePaths', group: 'behavior', type: 'directEdit' },
    { key: 'enabledPlugins', path: 'enabledPlugins', group: 'behavior', type: 'directEdit' },
    { key: 'pluginConfigs', path: 'pluginConfigs', group: 'behavior', type: 'directEdit' },
    { key: 'extraKnownMarketplaces', path: 'extraKnownMarketplaces', group: 'behavior', type: 'directEdit' },
];

// グループの表示順（UI の見出し順）。
export const SETTINGS_GROUP_ORDER: string[] = ['model', 'agent', 'display', 'behavior'];

// ============================================================
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
