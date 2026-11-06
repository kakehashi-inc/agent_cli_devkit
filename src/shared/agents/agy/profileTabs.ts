import type { AgentProfileSpec } from '../profile/types';

// hooks で有効なイベント。
const HOOK_EVENTS = ['SessionStart', 'PreToolUse', 'PostToolUse', 'PreInvocation', 'PostInvocation', 'Stop'];

// matcher が効き、グループの形で書くイベント。https://antigravity.google/docs/hooks の CLI の節による。ほかのイベントはハンドラを直接並べる。
const MATCHER_EVENTS = ['PreToolUse', 'PostToolUse'];

// editor の候補。
const EDITOR_SUGGESTIONS = ['auto', 'vim', 'emacs'];

// 読み込まれない深さのファイルを一覧に出す深さ。
const NOT_LOADED_SCAN_DEPTH = 4;

const SHARED_NOTICE = 'agy.profile.sharedNotice';

// Agy のプロファイル設定の定義。renderer へ IPC で渡す純データ。
export const AGY_PROFILE_SPEC: AgentProfileSpec = {
    agentId: 'agy',
    docs: {
        settings: { format: 'jsonc', rel: '.gemini/antigravity-cli/settings.json' },
        hooks: { format: 'json', rel: '.gemini/config/hooks.json' },
        rulesManifest: { format: 'json', rel: '.gemini/config/rules.json' },
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
                    parser: 'agyNamed',
                    sources: [{ doc: 'hooks', path: null }],
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
                    editorTitleKey: 'agy.settings.field.statusLine.label',
                    doc: 'settings',
                    path: ['statusLine'],
                    mode: 'value',
                    emptyTemplate: '{\n  "type": "command",\n  "command": "",\n  "enabled": true\n}\n',
                },
            ],
        },
        {
            id: 'externalCommands',
            sections: [
                {
                    id: 'external-title',
                    kind: 'scopedEditor',
                    titleKey: 'agy.settings.field.title.label',
                    editorTitleKey: 'agy.settings.field.title.label',
                    doc: 'settings',
                    path: ['title'],
                    mode: 'value',
                    emptyTemplate: '{\n  "type": "command",\n  "command": "",\n  "enabled": true\n}\n',
                },
                {
                    id: 'external-editor',
                    kind: 'commandFields',
                    titleKey: 'agy.settings.field.editor.label',
                    doc: 'settings',
                    fields: [
                        {
                            key: 'editor',
                            path: ['editor'],
                            suggestions: EDITOR_SUGGESTIONS,
                        },
                    ],
                },
                {
                    id: 'external-sidecars',
                    kind: 'fileCollection',
                    titleKey: 'agy.profile.externalCommands.sidecarsTitle',
                    collection: {
                        id: 'sidecars',
                        rootRel: '.gemini/config/sidecars',
                        extensions: ['.json'],
                        createExtension: '.json',
                        maxDepth: 1,
                        scanExtraDepth: 0,
                        frontmatter: 'none',
                        allowCreate: true,
                        validator: 'json-strict',
                        fixedFileName: 'sidecar.json',
                        nameRule: 'folder-name',
                    },
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
                            labelKey: 'agy.profile.permissions.allow',
                            itemValidator: 'agy-permission-rule',
                            emptyMeans: 'unset',
                        },
                        {
                            key: 'ask',
                            path: ['permissions', 'ask'],
                            labelKey: 'agy.profile.permissions.ask',
                            itemValidator: 'agy-permission-rule',
                            emptyMeans: 'unset',
                        },
                        {
                            key: 'deny',
                            path: ['permissions', 'deny'],
                            labelKey: 'agy.profile.permissions.deny',
                            itemValidator: 'agy-permission-rule',
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
                    files: [
                        { key: 'geminiAgents', rel: '.gemini/AGENTS.md' },
                        { key: 'geminiGemini', rel: '.gemini/GEMINI.md' },
                        { key: 'configAgents', rel: '.gemini/config/AGENTS.md' },
                        { key: 'configGemini', rel: '.gemini/config/GEMINI.md' },
                    ],
                    effective: 'all',
                    aggregateByIdentity: true,
                    sharedWarningKey: SHARED_NOTICE,
                },
            ],
        },
        {
            id: 'rules',
            sections: [
                {
                    id: 'rules-files',
                    kind: 'fileCollection',
                    titleKey: 'agy.profile.rules.filesTitle',
                    collection: {
                        id: 'rules',
                        rootRel: '.gemini/config/rules',
                        extensions: ['.md'],
                        createExtension: '.md',
                        maxDepth: 0,
                        scanExtraDepth: NOT_LOADED_SCAN_DEPTH,
                        frontmatter: 'yaml',
                        allowCreate: true,
                        validator: 'agy-rule-frontmatter',
                    },
                },
                {
                    id: 'rules-manifest',
                    kind: 'scopedEditor',
                    titleKey: 'agy.profile.rules.manifestTitle',
                    editorTitleKey: 'agy.profile.rules.manifestTitle',
                    doc: 'rulesManifest',
                    path: null,
                    mode: 'table',
                    validator: 'json-strict',
                    emptyTemplate: '{\n  "entries": []\n}\n',
                },
            ],
        },
    ],
    assetTabs: [],
};
