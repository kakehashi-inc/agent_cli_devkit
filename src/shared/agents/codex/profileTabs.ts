import type { AgentProfileSpec } from '../profile/types';

// hooks で有効なイベント。
const HOOK_EVENTS = [
    'Interrupt',
    'PermissionRequest',
    'PostCompact',
    'PostModelRequest',
    'PostToolUse',
    'PreCompact',
    'PreModelRequest',
    'PreToolUse',
    'SessionEnd',
    'SessionStart',
    'Stop',
    'SubagentStart',
    'SubagentStop',
    'UserPromptSubmit',
];

// matcher が効くイベント。https://learn.chatgpt.com/docs/hooks の matcher の表による。
const MATCHER_EVENTS = [
    'PermissionRequest',
    'PostCompact',
    'PostToolUse',
    'PreCompact',
    'PreToolUse',
    'SessionEnd',
    'SessionStart',
    'SubagentStart',
    'SubagentStop',
];

// tui.status_line の項目 ID。
const STATUS_LINE_ITEMS = [
    'model',
    'model-with-reasoning',
    'reasoning',
    'current-dir',
    'project-name',
    'hostname',
    'git-branch',
    'pull-request-number',
    'branch-changes',
    'run-state',
    'permissions',
    'approval-mode',
    'context-remaining',
    'context-used',
    'five-hour-limit',
    'weekly-limit',
    'codex-version',
    'context-window-size',
    'used-tokens',
    'total-input-tokens',
    'total-output-tokens',
    'thread-credits',
    'estimated-thread-cost',
    'thread-id',
    'fast-mode',
    'daybreak',
    'raw-output',
    'thread-name',
    'thread-title',
    'workspace-headline',
    'task-progress',
    'profile',
    'provider',
];

// tui.terminal_title の項目 ID。
const TERMINAL_TITLE_ITEMS = [
    'app-name',
    'project-name',
    'current-dir',
    'activity',
    'run-state',
    'thread-name',
    'thread-title',
    'git-branch',
    'context-remaining',
    'context-used',
    'five-hour-limit',
    'weekly-limit',
    'codex-version',
    'used-tokens',
    'total-input-tokens',
    'total-output-tokens',
    'thread-credits',
    'estimated-thread-cost',
    'thread-id',
    'fast-mode',
    'daybreak',
    'model',
    'model-with-reasoning',
    'reasoning',
    'task-progress',
];

// 読み込まれない深さのファイルを一覧に出す深さ。
const NOT_LOADED_SCAN_DEPTH = 4;

// Codex のプロファイル設定の定義。renderer へ IPC で渡す純データ。
export const CODEX_PROFILE_SPEC: AgentProfileSpec = {
    agentId: 'codex',
    docs: {
        settings: { format: 'toml', rel: '.codex/config.toml' },
        hooksJson: { format: 'json', rel: '.codex/hooks.json' },
        environments: { format: 'toml', rel: '.codex/environments.toml' },
    },
    settingsDoc: 'settings',
    settingsTabs: [
        { id: 'settings', sections: [] },
        {
            id: 'hooks',
            sections: [
                {
                    id: 'hooks-overview',
                    kind: 'hookOverview',
                    savedNoteKey: 'codex.profile.hooks.savedNote',
                    parser: 'claudeStyle',
                    sources: [
                        {
                            doc: 'hooksJson',
                            path: ['hooks'],
                            entryValidator: 'codex-hook-entry-json',
                            fileValidator: 'codex-hooks-json',
                        },
                        {
                            doc: 'settings',
                            path: ['hooks'],
                            excludePaths: [['hooks', 'state']],
                            entryValidator: 'codex-hooks',
                        },
                    ],
                    knownEvents: HOOK_EVENTS,
                    matcherEvents: MATCHER_EVENTS,
                    hookState: { doc: 'settings', path: ['hooks', 'state'] },
                },
            ],
        },
        {
            id: 'statusLine',
            sections: [
                {
                    id: 'status-lists',
                    kind: 'orderedLists',
                    doc: 'settings',
                    lists: [
                        {
                            key: 'statusLine',
                            path: ['tui', 'status_line'],
                            labelKey: 'codex.settings.field.tuiStatusLine.label',
                            emptyMeans: 'emptyArray',
                            suggestions: STATUS_LINE_ITEMS,
                        },
                        {
                            key: 'terminalTitle',
                            path: ['tui', 'terminal_title'],
                            labelKey: 'codex.settings.field.tuiTerminalTitle.label',
                            emptyMeans: 'emptyArray',
                            suggestions: TERMINAL_TITLE_ITEMS,
                        },
                    ],
                },
            ],
        },
        {
            id: 'externalCommands',
            sections: [
                {
                    id: 'external-notify',
                    kind: 'orderedLists',
                    titleKey: 'codex.settings.field.notify.label',
                    doc: 'settings',
                    lists: [
                        {
                            key: 'notify',
                            path: ['notify'],
                            emptyMeans: 'unset',
                        },
                    ],
                },
                {
                    id: 'external-model-providers',
                    kind: 'scopedEditor',
                    titleKey: 'codex.settings.field.modelProviders.label',
                    editorTitleKey: 'codex.settings.field.modelProviders.label',
                    doc: 'settings',
                    path: ['model_providers'],
                    mode: 'table',
                    sensitive: true,
                    emptyTemplate: '[model_providers.example]\nname = ""\nbase_url = ""\n',
                },
                {
                    id: 'external-file-handlers',
                    kind: 'scopedEditor',
                    titleKey: 'codex.settings.field.desktopCustomFileHandlers.label',
                    editorTitleKey: 'codex.settings.field.desktopCustomFileHandlers.label',
                    doc: 'settings',
                    path: ['desktop', 'custom_file_handlers'],
                    mode: 'table',
                    emptyTemplate: '[desktop.custom_file_handlers.example]\ncommand = ""\nargs = []\n',
                },
                {
                    id: 'external-environments',
                    kind: 'scopedEditor',
                    titleKey: 'codex.profile.externalCommands.environmentsTitle',
                    editorTitleKey: 'codex.profile.externalCommands.environmentsTitle',
                    doc: 'environments',
                    path: null,
                    mode: 'table',
                },
            ],
        },
        {
            id: 'permissions',
            sections: [
                {
                    id: 'permissions-rules',
                    kind: 'fileCollection',
                    titleKey: 'codex.profile.permissions.rulesTitle',
                    collection: {
                        id: 'rules',
                        rootRel: '.codex/rules',
                        extensions: ['.rules'],
                        createExtension: '.rules',
                        maxDepth: 0,
                        scanExtraDepth: NOT_LOADED_SCAN_DEPTH,
                        frontmatter: 'none',
                        allowCreate: true,
                        deleteWarningKeys: { 'default.rules': 'codex-default-rules-delete' },
                        exactExtensionCase: true,
                        linksNotLoaded: true,
                    },
                },
                {
                    id: 'permissions-profiles',
                    kind: 'scopedEditor',
                    titleKey: 'codex.settings.field.permissionsProfiles.label',
                    editorTitleKey: 'codex.settings.field.permissionsProfiles.label',
                    doc: 'settings',
                    path: ['permissions'],
                    mode: 'table',
                    emptyTemplate: '[permissions.example]\n',
                },
            ],
        },
        {
            id: 'instructions',
            sections: [
                {
                    id: 'instructions-files',
                    kind: 'fixedFileSet',
                    files: [
                        { key: 'override', rel: '.codex/AGENTS.override.md' },
                        { key: 'agents', rel: '.codex/AGENTS.md' },
                    ],
                    effective: 'firstNonEmpty',
                    aggregateByIdentity: true,
                },
            ],
        },
    ],
    assetTabs: [],
};
