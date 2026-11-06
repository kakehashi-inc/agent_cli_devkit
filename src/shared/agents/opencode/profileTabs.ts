import type { AgentProfileSpec, ProfileConditionalNotice } from '../profile/types';

// 深さの制限がない一覧で、画面に出す深さの上限。
const LIST_DEPTH_LIMIT = 16;

// opencode.json と opencode.jsonc が両方あるときの注記。
const BOTH_CONFIG_FILES_NOTICE: ProfileConditionalNotice = {
    key: 'opencode.profile.bothConfigFiles',
    when: {
        kind: 'filesExist',
        rels: ['.config/opencode/opencode.json', '.config/opencode/opencode.jsonc'],
    },
};

// OpenCode のプロファイル設定の定義。renderer へ IPC で渡す純データ。設定ファイルは実行時に候補から決める。
export const OPENCODE_PROFILE_SPEC: AgentProfileSpec = {
    agentId: 'opencode',
    docs: { settings: { format: 'jsonc', resolver: 'opencode-settings' } },
    settingsDoc: 'settings',
    settingsTabs: [
        { id: 'settings', sections: [] },
        {
            id: 'externalCommands',
            sections: [
                {
                    id: 'external-formatter',
                    kind: 'scopedEditor',
                    titleKey: 'opencode.settings.field.formatter.label',
                    editorTitleKey: 'opencode.settings.field.formatter.label',
                    doc: 'settings',
                    path: ['formatter'],
                    mode: 'value',
                    conditionalNotices: [BOTH_CONFIG_FILES_NOTICE],
                    emptyTemplate: '{\n  "example": {\n    "command": ["", "$FILE"],\n    "extensions": []\n  }\n}\n',
                },
                {
                    id: 'external-shell',
                    kind: 'commandFields',
                    titleKey: 'opencode.settings.field.shell.label',
                    doc: 'settings',
                    fields: [
                        {
                            key: 'shell',
                            path: ['shell'],
                        },
                    ],
                },
            ],
        },
        {
            id: 'permissions',
            sections: [
                {
                    id: 'permissions-rules',
                    kind: 'scopedEditor',
                    titleKey: 'opencode.settings.field.permissions.label',
                    editorTitleKey: 'opencode.settings.field.permissions.label',
                    doc: 'settings',
                    path: ['permissions'],
                    mode: 'value',
                    conditionalNotices: [
                        BOTH_CONFIG_FILES_NOTICE,
                        {
                            key: 'opencode.profile.permissions.legacyKey',
                            when: { kind: 'docPath', doc: 'settings', path: ['permission'] },
                        },
                    ],
                    emptyTemplate: '[\n  { "action": "shell", "resource": "*", "effect": "ask" }\n]\n',
                },
                {
                    id: 'permissions-policies',
                    kind: 'scopedEditor',
                    titleKey: 'opencode.settings.field.policies.label',
                    editorTitleKey: 'opencode.settings.field.policies.label',
                    doc: 'settings',
                    path: ['policies'],
                    mode: 'value',
                    emptyTemplate: '[\n  { "action": "tool.use", "resource": "*", "effect": "deny" }\n]\n',
                },
            ],
        },
        {
            id: 'instructions',
            sections: [
                {
                    id: 'instructions-files',
                    kind: 'fixedFileSet',
                    titleKey: 'opencode.profile.instructions.filesTitle',
                    files: [{ key: 'agents', rel: '.config/opencode/AGENTS.md' }],
                    aggregateByIdentity: true,
                },
                {
                    id: 'instructions-list',
                    kind: 'orderedLists',
                    titleKey: 'opencode.settings.field.instructions.label',
                    doc: 'settings',
                    conditionalNotices: [BOTH_CONFIG_FILES_NOTICE],
                    lists: [
                        {
                            key: 'instructions',
                            path: ['instructions'],
                            emptyMeans: 'unset',
                        },
                    ],
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
                    titleKey: 'opencode.profile.commands.title',
                    collection: {
                        id: 'commands',
                        rootRel: '.config/opencode/commands',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: LIST_DEPTH_LIMIT,
                        scanExtraDepth: 0,
                        frontmatter: 'yaml',
                        allowCreate: true,
                        validator: 'opencode-command',
                        invalidFrontmatterNotLoaded: true,
                        nameRule: 'slash-path',
                    },
                },
                {
                    id: 'commands-legacy-files',
                    kind: 'fileCollection',
                    titleKey: 'opencode.profile.commands.legacyTitle',
                    collection: {
                        id: 'command',
                        rootRel: '.config/opencode/command',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: LIST_DEPTH_LIMIT,
                        scanExtraDepth: 0,
                        frontmatter: 'yaml',
                        allowCreate: false,
                        validator: 'opencode-command',
                        invalidFrontmatterNotLoaded: true,
                        nameRule: 'slash-path',
                        shadowedBy: ['commands'],
                    },
                },
                {
                    id: 'commands-config',
                    kind: 'scopedEditor',
                    titleKey: 'opencode.profile.commands.configTitle',
                    editorTitleKey: 'opencode.settings.field.commands.label',
                    doc: 'settings',
                    path: ['commands'],
                    mode: 'value',
                    conditionalNotices: [
                        BOTH_CONFIG_FILES_NOTICE,
                        {
                            key: 'opencode.profile.commands.shadowedKeys',
                            when: {
                                kind: 'keysShadowedByCollections',
                                doc: 'settings',
                                path: ['commands'],
                                collections: ['commands', 'command'],
                            },
                        },
                    ],
                    emptyTemplate: '{\n  "example": {\n    "template": ""\n  }\n}\n',
                },
            ],
        },
    ],
};
