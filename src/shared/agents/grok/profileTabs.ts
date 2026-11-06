import type { AgentProfileSpec, FileCollectionSpec, ProfileOtherForm } from '../profile/types';

// 読み込まれない深さのファイルを一覧に出す深さ。
const NOT_LOADED_SCAN_DEPTH = 4;

// 同じ [permission] で併記すると、どちらが効くかを断定できない書き方。
const RULES_FORM: ProfileOtherForm = {
    paths: [['permission', 'rules']],
    blockedKey: 'grok.profile.permissions.listsBlocked',
    bothKey: 'grok.profile.permissions.bothForms',
};
const LISTS_FORM: ProfileOtherForm = {
    paths: [
        ['permission', 'allow'],
        ['permission', 'ask'],
        ['permission', 'deny'],
    ],
    blockedKey: 'grok.profile.permissions.rulesBlocked',
    bothKey: 'grok.profile.permissions.bothForms',
};

// 追加できるイベント。https://docs.x.ai/build/features/hooks と grok-build の xai-grok-hooks/src/event.rs による。
const HOOK_EVENTS = [
    'SessionStart',
    'UserPromptSubmit',
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'PermissionDenied',
    'Stop',
    'StopFailure',
    'StopCancelled',
    'Notification',
    'SubagentStart',
    'SubagentStop',
    'PreCompact',
    'PostCompact',
    'SessionEnd',
];

// matcher が効くイベント。grok-build の xai-grok-hooks/src/event.rs の MatcherPolicy が Tested のもの。
const MATCHER_EVENTS = [
    'SessionStart',
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'PermissionDenied',
    'StopFailure',
    'StopCancelled',
    'Notification',
    'SubagentStart',
    'SubagentStop',
    'PreCompact',
    'PostCompact',
    'SessionEnd',
];

// CLI が読む hook のファイルの一覧。
const HOOK_FILES: FileCollectionSpec = {
    id: 'hooks',
    rootRel: '.grok/hooks',
    extensions: ['.json'],
    createExtension: '.json',
    maxDepth: 0,
    scanExtraDepth: NOT_LOADED_SCAN_DEPTH,
    frontmatter: 'none',
    allowCreate: true,
    validator: 'grok-hooks',
    exactExtensionCase: true,
    dotNamesNotLoaded: true,
};

// Grok のプロファイル設定の定義。renderer へ IPC で渡す純データ。
export const GROK_PROFILE_SPEC: AgentProfileSpec = {
    agentId: 'grok',
    docs: {
        settings: { format: 'toml', rel: '.grok/config.toml' },
        lsp: { format: 'json', rel: '.grok/lsp.json' },
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
                    parser: 'claudeStyle',
                    sources: [
                        { collection: HOOK_FILES, path: ['hooks'], naming: 'global', entryValidator: 'grok-hooks' },
                        { doc: 'settings', path: ['hooks'], naming: 'user', entryValidator: 'grok-hooks' },
                        { registry: '.grok/hooks-paths', path: ['hooks'] },
                    ],
                    knownEvents: HOOK_EVENTS,
                    matcherEvents: MATCHER_EVENTS,
                    hookNaming: { scheme: 'grok', disableListRel: '.grok/disabled-hooks' },
                },
                {
                    id: 'hooks-files',
                    kind: 'fileCollection',
                    titleKey: 'grok.profile.hooks.filesTitle',
                    collection: HOOK_FILES,
                },
            ],
        },
        {
            id: 'statusLine',
            sections: [
                {
                    id: 'status-line',
                    kind: 'scopedEditor',
                    editorTitleKey: 'grok.profile.statusLine.title',
                    doc: 'settings',
                    path: ['ui', 'status_line'],
                    mode: 'table',
                    emptyTemplate: '[ui.status_line]\ntype = "builtin"\nitems = ["cwd", "model", "context"]\n',
                },
            ],
        },
        {
            id: 'externalCommands',
            sections: [
                {
                    id: 'external-commands',
                    kind: 'commandFields',
                    titleKey: 'grok.profile.externalCommands.commandsTitle',
                    doc: 'settings',
                    conditionalNotices: [
                        {
                            key: 'grok.profile.externalCommands.authAliasNotice',
                            when: {
                                kind: 'docPath',
                                doc: 'settings',
                                path: ['grok_com_config', 'auth_provider_command'],
                            },
                        },
                    ],
                    fields: [
                        {
                            key: 'authProviderCommand',
                            path: ['auth', 'auth_provider_command'],
                            labelKey: 'grok.profile.externalCommands.authCommandLabel',
                        },
                        {
                            key: 'feedbackUserCommand',
                            path: ['feedback', 'user', 'command'],
                            labelKey: 'grok.settings.field.feedbackUserCommand.label',
                        },
                    ],
                },
                {
                    id: 'external-auth-provider',
                    kind: 'scopedEditor',
                    titleKey: 'grok.profile.externalCommands.authProviderTitle',
                    editorTitleKey: 'grok.profile.externalCommands.authProviderTitle',
                    doc: 'settings',
                    path: ['auth_provider'],
                    mode: 'table',
                    sensitive: true,
                    emptyTemplate: '[auth_provider.example]\ncommand = ""\n',
                },
                {
                    id: 'external-notifications',
                    kind: 'scopedEditor',
                    titleKey: 'grok.settings.field.uiNotifications.label',
                    editorTitleKey: 'grok.settings.field.uiNotifications.label',
                    doc: 'settings',
                    path: ['ui', 'notifications'],
                    mode: 'table',
                    emptyTemplate: '[[ui.notifications.hooks]]\ncommand = ""\n',
                },
                {
                    id: 'external-lsp',
                    kind: 'scopedEditor',
                    titleKey: 'grok.profile.externalCommands.lspTitle',
                    editorTitleKey: 'grok.profile.externalCommands.lspTitle',
                    doc: 'lsp',
                    path: null,
                    mode: 'table',
                    validator: 'grok-lsp-json',
                    emptyTemplate: '{\n  "example": {\n    "command": "",\n    "args": []\n  }\n}\n',
                },
            ],
        },
        {
            id: 'permissions',
            sections: [
                {
                    id: 'permissions-lists',
                    kind: 'orderedLists',
                    titleKey: 'grok.profile.permissions.listsTitle',
                    doc: 'settings',
                    otherForm: RULES_FORM,
                    lists: [
                        {
                            key: 'allow',
                            path: ['permission', 'allow'],
                            labelKey: 'grok.profile.permissions.allow',
                            emptyMeans: 'unset',
                        },
                        {
                            key: 'ask',
                            path: ['permission', 'ask'],
                            labelKey: 'grok.profile.permissions.ask',
                            emptyMeans: 'unset',
                        },
                        {
                            key: 'deny',
                            path: ['permission', 'deny'],
                            labelKey: 'grok.profile.permissions.deny',
                            emptyMeans: 'unset',
                        },
                    ],
                },
                {
                    id: 'permissions-rules',
                    kind: 'scopedEditor',
                    titleKey: 'grok.profile.permissions.rulesTitle',
                    editorTitleKey: 'grok.profile.permissions.rulesTitle',
                    doc: 'settings',
                    path: ['permission', 'rules'],
                    mode: 'table',
                    otherForm: LISTS_FORM,
                    emptyTemplate: '[[permission.rules]]\naction = "ask"\ntool = "bash"\npattern = ""\n',
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
                        { key: 'agents', rel: '.grok/AGENTS.md' },
                        { key: 'claude', rel: '.grok/CLAUDE.md' },
                        { key: 'claudeLocal', rel: '.grok/CLAUDE.local.md' },
                        { key: 'agent', rel: '.grok/AGENT.md' },
                    ],
                    effective: 'all',
                    aggregateByIdentity: true,
                },
            ],
        },
        {
            id: 'rules',
            sections: [
                {
                    id: 'rules-files',
                    kind: 'fileCollection',
                    collection: {
                        id: 'rules',
                        rootRel: '.grok/rules',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: 0,
                        scanExtraDepth: NOT_LOADED_SCAN_DEPTH,
                        frontmatter: 'none',
                        allowCreate: true,
                    },
                },
            ],
        },
        {
            id: 'workflows',
            sections: [
                {
                    id: 'workflows-files',
                    kind: 'fileCollection',
                    notLoadedNoteKey: 'grok.profile.workflows.notGuaranteed',
                    collection: {
                        id: 'workflows',
                        rootRel: '.grok/workflows',
                        extensions: ['.js', '.rhai'],
                        createExtension: '.js',
                        maxDepth: 0,
                        scanExtraDepth: NOT_LOADED_SCAN_DEPTH,
                        frontmatter: 'none',
                        allowCreate: true,
                        validator: 'grok-workflow',
                        exactExtensionCase: true,
                        nameRule: 'grok-workflow',
                    },
                },
            ],
        },
    ],
    assetTabs: [
        {
            id: 'commands',
            sections: [
                {
                    id: 'commands-files',
                    kind: 'fileCollection',
                    collection: {
                        id: 'commands',
                        rootRel: '.grok/commands',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: 0,
                        scanExtraDepth: NOT_LOADED_SCAN_DEPTH,
                        frontmatter: 'yaml',
                        allowCreate: true,
                        validator: 'grok-command',
                        exactExtensionCase: true,
                        nameRule: 'grok-command',
                    },
                },
            ],
        },
    ],
};
