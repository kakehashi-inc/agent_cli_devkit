import type { AgentProfileSpec } from '../profile/types';

// hooks で有効なイベント。
const HOOK_EVENTS = [
    'SessionStart',
    'Setup',
    'UserPromptSubmit',
    'UserPromptExpansion',
    'PreToolUse',
    'PermissionRequest',
    'PermissionDenied',
    'PostToolUse',
    'PostToolUseFailure',
    'PostToolBatch',
    'Notification',
    'MessageDisplay',
    'SubagentStart',
    'SubagentStop',
    'TaskCreated',
    'TaskCompleted',
    'Stop',
    'StopFailure',
    'TeammateIdle',
    'InstructionsLoaded',
    'ConfigChange',
    'CwdChanged',
    'DirectoryAdded',
    'FileChanged',
    'WorktreeCreate',
    'WorktreeRemove',
    'PreCompact',
    'PostCompact',
    'PreModelSwitch',
    'PostModelSwitch',
    'Elicitation',
    'ElicitationResult',
    'SessionEnd',
];

// matcher が効くイベント。https://code.claude.com/docs/en/hooks の Matcher patterns の表による。
const MATCHER_EVENTS = [
    'PreToolUse',
    'PostToolUse',
    'PostToolUseFailure',
    'PermissionRequest',
    'PermissionDenied',
    'SessionStart',
    'Setup',
    'SessionEnd',
    'Notification',
    'SubagentStart',
    'SubagentStop',
    'PreCompact',
    'PostCompact',
    'PreModelSwitch',
    'PostModelSwitch',
    'ConfigChange',
    'DirectoryAdded',
    'FileChanged',
    'StopFailure',
    'InstructionsLoaded',
    'UserPromptExpansion',
    'Elicitation',
    'ElicitationResult',
];

// 組み込みの出力スタイルの名前。
const BUILTIN_OUTPUT_STYLES = ['default', 'Proactive', 'Concise', 'Explanatory', 'Learning'];

// 深さの制限がない一覧で、画面に出す深さの上限。
const LIST_DEPTH_LIMIT = 16;

// 読み込まれない深さのファイルを一覧に出す深さ。
const NOT_LOADED_SCAN_DEPTH = 4;

const COMMAND_TEMPLATE = '{\n  "type": "command",\n  "command": ""\n}\n';

// Claude のプロファイル設定の定義。renderer へ IPC で渡す純データ。
export const CLAUDE_PROFILE_SPEC: AgentProfileSpec = {
    agentId: 'claude',
    docs: { settings: { format: 'json', rel: '.claude/settings.json' } },
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
                    sources: [{ doc: 'settings', path: ['hooks'] }],
                    knownEvents: HOOK_EVENTS,
                    matcherEvents: MATCHER_EVENTS,
                },
            ],
        },
        {
            id: 'statusLine',
            sections: [
                {
                    id: 'status-line',
                    kind: 'scopedEditor',
                    titleKey: 'claude.profile.statusLine.mainTitle',
                    editorTitleKey: 'claude.settings.field.statusLine.label',
                    doc: 'settings',
                    path: ['statusLine'],
                    mode: 'value',
                    emptyTemplate: COMMAND_TEMPLATE,
                },
                {
                    id: 'subagent-status-line',
                    kind: 'scopedEditor',
                    titleKey: 'claude.profile.statusLine.subagentTitle',
                    editorTitleKey: 'claude.settings.field.subagentStatusLine.label',
                    doc: 'settings',
                    path: ['subagentStatusLine'],
                    mode: 'value',
                    emptyTemplate: COMMAND_TEMPLATE,
                },
            ],
        },
        {
            id: 'externalCommands',
            sections: [
                {
                    id: 'external-helpers',
                    kind: 'commandFields',
                    titleKey: 'claude.profile.externalCommands.helpersTitle',
                    doc: 'settings',
                    fields: [
                        {
                            key: 'apiKeyHelper',
                            path: ['apiKeyHelper'],
                            labelKey: 'claude.settings.field.apiKeyHelper.label',
                        },
                        {
                            key: 'awsAuthRefresh',
                            path: ['awsAuthRefresh'],
                            labelKey: 'claude.settings.field.awsAuthRefresh.label',
                        },
                        {
                            key: 'awsCredentialExport',
                            path: ['awsCredentialExport'],
                            labelKey: 'claude.settings.field.awsCredentialExport.label',
                        },
                        {
                            key: 'gcpAuthRefresh',
                            path: ['gcpAuthRefresh'],
                            labelKey: 'claude.settings.field.gcpAuthRefresh.label',
                        },
                        {
                            key: 'otelHeadersHelper',
                            path: ['otelHeadersHelper'],
                            labelKey: 'claude.settings.field.otelHeadersHelper.label',
                        },
                        {
                            key: 'processWrapper',
                            path: ['processWrapper'],
                            labelKey: 'claude.settings.field.processWrapper.label',
                        },
                    ],
                },
                {
                    id: 'external-file-suggestion',
                    kind: 'scopedEditor',
                    titleKey: 'claude.settings.field.fileSuggestion.label',
                    editorTitleKey: 'claude.settings.field.fileSuggestion.label',
                    doc: 'settings',
                    path: ['fileSuggestion'],
                    mode: 'value',
                    emptyTemplate: COMMAND_TEMPLATE,
                },
                {
                    id: 'external-ripgrep',
                    kind: 'scopedEditor',
                    titleKey: 'claude.profile.externalCommands.ripgrepTitle',
                    editorTitleKey: 'claude.profile.externalCommands.ripgrepTitle',
                    doc: 'settings',
                    path: ['sandbox', 'ripgrep'],
                    mode: 'value',
                    emptyTemplate: '{\n  "command": "",\n  "args": []\n}\n',
                },
                {
                    id: 'external-ssh-host-commands',
                    kind: 'scopedEditor',
                    titleKey: 'claude.settings.field.sshHostCommands.label',
                    editorTitleKey: 'claude.settings.field.sshHostCommands.label',
                    doc: 'settings',
                    path: ['sshHostCommands'],
                    mode: 'value',
                    emptyTemplate: '[\n  { "id": "", "name": "", "command": "" }\n]\n',
                },
            ],
        },
        {
            id: 'permissions',
            sections: [
                {
                    id: 'permissions-lists',
                    kind: 'orderedLists',
                    doc: 'settings',
                    lists: [
                        {
                            key: 'allow',
                            path: ['permissions', 'allow'],
                            labelKey: 'claude.settings.field.permissionsAllow.label',
                            emptyMeans: 'unset',
                        },
                        {
                            key: 'ask',
                            path: ['permissions', 'ask'],
                            labelKey: 'claude.settings.field.permissionsAsk.label',
                            emptyMeans: 'unset',
                        },
                        {
                            key: 'deny',
                            path: ['permissions', 'deny'],
                            labelKey: 'claude.settings.field.permissionsDeny.label',
                            emptyMeans: 'unset',
                        },
                    ],
                },
            ],
        },
        {
            id: 'instructions',
            sections: [
                {
                    id: 'instructions-files',
                    kind: 'fixedFileSet',
                    files: [{ key: 'claude', rel: '.claude/CLAUDE.md' }],
                    aggregateByIdentity: true,
                },
            ],
        },
        {
            id: 'outputStyles',
            sections: [
                {
                    id: 'output-styles',
                    kind: 'fileCollection',
                    displayNameNote: {
                        names: BUILTIN_OUTPUT_STYLES,
                        noteKey: 'claude.profile.outputStyles.overridesBuiltin',
                    },
                    collection: {
                        id: 'output-styles',
                        rootRel: '.claude/output-styles',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: LIST_DEPTH_LIMIT,
                        scanExtraDepth: 0,
                        frontmatter: 'yaml',
                        allowCreate: true,
                        exactExtensionCase: true,
                        nameRule: 'frontmatter-name',
                    },
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
                        rootRel: '.claude/rules',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: LIST_DEPTH_LIMIT,
                        scanExtraDepth: 0,
                        frontmatter: 'yaml',
                        allowCreate: true,
                        exactExtensionCase: true,
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
                    collection: {
                        id: 'workflows',
                        rootRel: '.claude/workflows',
                        extensions: ['.js'],
                        createExtension: '.js',
                        maxDepth: 0,
                        scanExtraDepth: NOT_LOADED_SCAN_DEPTH,
                        frontmatter: 'none',
                        allowCreate: true,
                        validator: 'claude-workflow',
                        exactExtensionCase: true,
                        notLoadedExtensions: ['.mjs', '.cjs', '.ts'],
                        nameRule: 'claude-workflow',
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
                        rootRel: '.claude/commands',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: LIST_DEPTH_LIMIT,
                        scanExtraDepth: 0,
                        frontmatter: 'yaml',
                        allowCreate: true,
                        validator: 'claude-reserved-name',
                        exactExtensionCase: true,
                        exclusiveFolderFile: 'skill.md',
                        nameRule: 'claude-command',
                    },
                },
            ],
        },
    ],
};
