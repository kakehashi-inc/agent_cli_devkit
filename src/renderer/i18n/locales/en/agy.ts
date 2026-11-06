export default {
    nav: {
        group: 'Agy',
        mcp: 'Agy CLI MCP Management',
        assets: 'Agy CLI Agent / Skill Management',
        plugins: 'Agy CLI Plugin Manager',
        settings: 'Agy CLI Settings',
        cleanup: 'Agy CLI Cleanup',
    },
    noEnvironment:
        'Agy CLI was not found. Install Antigravity CLI so that the agy command is available on Windows or in WSL, then press Refresh.',
    dashboard: {
        group: 'Agy (Antigravity CLI)',
        mcpDesc: 'Enable/disable/reorder the global MCP servers used by Agy CLI.',
        assetsDesc: 'Manage Agy CLI custom agents and its global skills directory.',
        pluginsDesc: 'Manage plugins through Agy CLI and its Gemini-shared plugin directory.',
        settingsDesc: 'Edit Agy CLI settings as fields or raw JSON.',
        cleanupDesc: 'Remove selected Agy CLI caches, logs, history, and conversation data.',
    },
    mcp: {
        title: 'Agy CLI MCP Management',
        wslSection: 'WSL: {{distro}}',
        notFound: '~/.gemini/config/mcp_config.json was not found.',
        configPath: 'Config',
        disabledConfigPath: 'Disabled',
        enabledServers: 'Enabled MCP servers',
        disabledServers: 'Disabled MCP servers',
        noServers: 'No MCP servers',
        dragToReorder: 'Drag to reorder',
        serverName: 'Server name',
        command: 'Command / URL',
        args: 'Args',
        actions: 'Actions',
        enable: 'Enable',
        disable: 'Disable',
    },
    assets: {
        title: 'Agy CLI Agent / Skill Management',
        descriptionText:
            'List your Agy CLI custom agents and skills, download selected ones together as a ZIP, or upload a ZIP/md file to import them.',
        wslSection: 'WSL: {{distro}}',
        tabAgents: 'Agents',
        tabSkills: 'Skills',
        col: {
            name: 'Name',
            description: 'Description',
            model: 'Model',
        },
        columnFiles: 'Files',
        columnLastModified: 'Last modified',
        columnView: 'View',
        newBadge: 'NEW',
        relative: {
            today: 'today',
            yesterday: 'yesterday',
            daysAgo: '{{count}} days ago',
            monthAgo: '1 month ago',
            monthsAgo: '{{count}} months ago',
            yearAgo: '1 year ago',
            yearsAgo: '{{count}} years ago',
        },
        download: 'Download',
        upload: 'Upload',
        delete: 'Delete',
        viewHeader: 'Header',
        viewFull: 'Full',
        viewTitle: 'Header: {{name}}',
        viewFullTitle: 'Full: {{name}}',
        viewFullError: 'Failed to load the content',
        close: 'Close',
        cancel: 'Cancel',
        overwrite: 'Overwrite',
        deleteConfirmTitle: 'Delete the selected items?',
        deleteConfirmBody: 'Delete the {{count}} selected item(s). This cannot be undone. Continue?',
        deleteSuccess: 'Deleted {{count}} item(s)',
        deletePartial: 'Some items could not be deleted because they are in use',
        deleteError: 'Failed to delete the selected items',
        noEntries: 'No data available',
        unavailable: 'The files of this environment cannot be reached.',
        downloadSuccess: 'Archive saved',
        downloadError: 'Failed to create the archive',
        uploadSuccess: 'Imported {{count}} item(s)',
        uploadError: 'Import failed',
        mdNoName: 'Could not read the name from the file',
        invalidArchive: 'This archive cannot be imported. It may be damaged or contain nothing to import.',
        noEntryFile:
            'This archive has nothing to import. Each folder needs a SKILL.md (skills) or an agent.md (agents).',
        kindWarnTitle: 'Some folders will not be imported',
        kindWarnContinue: 'Import the rest',
        kindWarnNoEntryFile:
            'These folders have no definition file and will not be imported: {{names}}. Import the other items?',
        listTruncated: 'Folders deeper than {{depth}} levels are not listed.',
        listIncomplete: 'Some folders could not be read, so this list may be incomplete.',
        entryMark: {
            link: {
                self: 'Link',
                via: 'In a linked folder',
            },
            linkHint: {
                self: 'This is a symbolic link. Deleting removes only the link.',
                via: 'This is read through a linked folder, so it cannot be deleted here. To remove it, delete the folder link.',
            },
            status: {
                'dangling-link': 'Not loaded: link target is missing',
                'no-entry-file': 'Not loaded: no definition file',
                'link-folder': 'Folder link',
                'link-loop': 'Not read: folder already listed',
                'refused-name': 'Cannot be managed: unsafe name',
            },
            statusHint: {
                'dangling-link':
                    'The link points to a path that does not exist, so the CLI does not load it. Deleting it removes only the link.',
                'no-entry-file': 'This folder has no definition file, so the CLI does not load it.',
                'link-folder': 'This link points to a folder. Deleting it removes only the link.',
                'link-loop':
                    'This link points to a folder that was already read, so its contents are not listed again. Deleting it removes only the link.',
                'refused-name':
                    'This name could point to a different location, so it cannot be viewed, downloaded, or deleted here. Rename it outside this app.',
            },
            overriddenBy: 'Not used: {{origin}} takes priority',
            overriddenByHint: 'A skill with the same name in {{origin}} takes priority over this one.',
            sameNameIn: 'Same name in {{origin}}',
            sameNameInHint: 'A skill with the same name is also in {{origin}}.',
        },
        origin: {
            cli: '~/.gemini/antigravity-cli/skills',
            shared: '~/.gemini/skills',
            config: '~/.gemini/config/skills',
        },
        overwriteTitle: 'Overwrite items with the same name?',
        overwriteBody:
            'The following {{count}} item(s) already exist and will be deleted and replaced: {{names}}. Continue?',
    },
    plugins: {
        title: 'Agy CLI Plugin Manager',
        description: 'List, install, and uninstall Agy CLI plugins, and turn them on and off.',
        invalidNameNote:
            'The plugin name (the name in plugin.json, or the folder name if it has none) starts with "-" or contains characters that cannot be passed to the CLI, so it cannot be enabled, disabled, or removed here.',
    },
    profile: {
        tab: {
            settings: 'Settings',
            hooks: 'Hooks',
            statusLine: 'Status Line',
            externalCommands: 'External commands',
            permissions: 'Permissions',
            instructions: 'Instructions',
            rules: 'Rules',
        },
        sharedNotice: 'This file is shared with the Antigravity App and IDE.',
        externalCommands: {
            sidecarsTitle: 'Sidecars',
        },
        permissions: {
            allow: 'Allow (allow)',
            ask: 'Ask (ask)',
            deny: 'Deny (deny)',
        },
        rules: {
            filesTitle: 'Files',
            manifestTitle: 'rules.json',
        },
    },
    settings: {
        title: 'Agy CLI Settings',
        description:
            'Edit Agy CLI settings, hooks, permissions, instruction files, and more. The main settings file is ~/.gemini/antigravity-cli/settings.json.',
        wslSection: 'WSL: {{distro}}',
        item: 'Item',
        value: 'Value',
        directEdit: 'Direct edit',
        directTitle: 'Edit settings.json directly',
        directDesc: 'Saving replaces the file contents.',
        directEditValue: 'Edit the file directly',
        unknownValue: '{{value}} (saved value; not in current suggestions)',
        save: 'Save',
        cancel: 'Cancel',
        unset: 'Unset',
        unsetDefault: 'Unset (default: {{default}})',
        enabled: 'Enabled',
        disabled: 'Disabled',
        saveSuccess: 'Settings saved',
        saveError: 'Failed to save settings',
        readError: 'Failed to read settings',
        invalidJson: 'The JSON syntax is invalid',
        invalidExisting: 'The existing JSON is invalid. Fix it with direct edit first.',
        verifyFailed:
            'Verification of the edit result failed, so saving was aborted. The file is unchanged. Change this item via direct edit.',
        unavailable: 'These settings cannot be accessed.',
        group: {
            appearance: 'Appearance',
            behavior: 'Behavior',
            security: 'Security',
            data: 'Account & data',
            advanced: 'Direct edit',
        },
        field: {
            colorScheme: {
                label: 'Color scheme (colorScheme)',
                desc: "Color theme of the terminal UI. terminal uses your terminal's colors.",
            },
            altScreenMode: {
                label: 'Rendering mode (altScreenMode)',
                desc: "How much the TUI uses the terminal's alternate screen. default uses it for full-screen views only, always for the whole TUI, and never not at all.",
            },
            notifications: {
                label: 'Notifications (notifications)',
                desc: 'Rings the terminal bell and shows a desktop notification when the agent needs your approval or an answer, or finishes its turn.',
            },
            showTips: {
                label: 'Show tips (showTips)',
                desc: 'Shows usage tips while the agent is generating responses.',
            },
            showFeedbackSurvey: {
                label: 'Feedback survey (showFeedbackSurvey)',
                desc: 'Shows a brief feedback survey from time to time after a task finishes.',
            },
            verbosity: {
                label: 'Verbosity (verbosity)',
                desc: "How much of the agent's work the conversation shows. high shows every tool call and thought, medium groups related steps into summaries, and low shows only responses and collapses tool activity into a token usage summary.",
            },
            runningLightSpeed: {
                label: 'Animation speed (runningLightSpeed)',
                desc: 'Speed of the progress indicator animation. off stops the animation.',
            },
            hideActiveItems: {
                label: 'Hide active items (hideActiveItems)',
                desc: 'Hides the list of active subagents and background tasks below the prompt box.',
            },
            useTerminalCursor: {
                label: 'Use terminal cursor (useTerminalCursor)',
                desc: "Uses your terminal's own cursor shape instead of a block cursor.",
            },
            clearScrollbackOnResize: {
                label: 'Clear scrollback on redraw (clearScrollbackOnResize)',
                desc: 'Clears the terminal scrollback when the CLI redraws the conversation, such as after you resize the window. Disabled keeps earlier output.',
            },
            editor: {
                label: 'Editor (editor)',
                desc: 'External editor for opening artifacts and files and for composing prompts with Ctrl+G. auto uses $EDITOR.',
            },
            editorMode: {
                label: 'Editor mode (editorMode)',
                desc: 'Editing model of the prompt. default is flat text editing, and vim is modal editing.',
            },
            vimInsertFirst: {
                label: 'Start in Insert mode (vimInsertFirst)',
                desc: 'Starts each prompt in Vim Insert mode, where a bare Enter submits.',
            },
            copyOnSelect: {
                label: 'Copy on select (copyOnSelect)',
                desc: 'Copies the selected text to the clipboard when you release a mouse selection.',
            },
            queuedMessages: {
                label: 'Queued messages (queuedMessages)',
                desc: 'What happens to a message you send while the agent is working. queue holds it until the current turn ends, and send-immediately interrupts the agent and sends it right away.',
            },
            pickerGrouping: {
                label: 'Conversation picker grouping (pickerGrouping)',
                desc: 'How the /resume picker lists conversations: none shows one list, most recent first, and grouped groups them by workspace.',
            },
            historySize: {
                label: 'Prompt history size (historySize)',
                desc: 'Number of prompt history entries kept on disk. -1 keeps every entry, and 0 clears the history.',
            },
            disableSlashCommands: {
                label: 'Disable slash commands (disableSlashCommands)',
                desc: 'Sends headless mode (-p) prompts that start with / to the model as typed.',
            },
            toolPermission: {
                label: 'Tool permission (toolPermission)',
                desc: 'When the agent asks before using a tool. request-review asks before write, shell, web, and MCP tools, proceed-in-sandbox runs sandboxed commands without asking, always-proceed runs commands, web requests, and MCP tools without asking, and strict asks before every action, including file reads.',
            },
            agentMode: {
                label: 'Agent mode (agentMode)',
                desc: 'Execution mode the CLI starts in. Unset asks before file edits, accept-edits approves workspace file edits automatically, auto approves edits and safe commands and asks before irreversible actions, and plan researches and plans before making changes.',
            },
            artifactReviewPolicy: {
                label: 'Artifact review policy (artifactReviewPolicy)',
                desc: 'Whether the agent waits for your review when it asks for feedback on an artifact, such as an implementation plan. asks-for-review and agent-decides wait, and always-proceed continues without waiting.',
            },
            allowNonWorkspaceAccess: {
                label: 'Non-workspace access (allowNonWorkspaceAccess)',
                desc: 'Lets the agent read and edit files outside your workspace folders.',
            },
            enableTerminalSandbox: {
                label: 'Sandbox mode (enableTerminalSandbox)',
                desc: "Runs the agent's terminal commands in the terminal sandbox.",
            },
            model: {
                label: 'Model (model)',
                desc: 'Label of the model chosen with /model.',
            },
            modelProvider: {
                label: 'Model provider (modelProvider)',
                desc: 'Where model requests go. gemini sends them directly to the Gemini API with the key in the GEMINI_API_KEY environment variable, and unset uses your signed-in account.',
            },
            useG1Credits: {
                label: 'Use AI credits (useG1Credits)',
                desc: "Uses your AI credits for model requests after your plan's quota runs out.",
            },
            permissions: {
                label: 'Permissions (permissions)',
                desc: "Allow, ask, and deny rules for the agent's tools.",
            },
            statusLine: {
                label: 'Status line (statusLine)',
                desc: 'Custom script that draws the status line below the prompt box.',
            },
            title: {
                label: 'Terminal title (title)',
                desc: 'Custom script that sets the terminal window title.',
            },
            hooks: {
                label: 'Hooks (hooks)',
                desc: 'Scripts that run right before or right after agent actions.',
            },
            customModelsConfig: {
                label: 'Custom models (customModelsConfig)',
                desc: 'Custom Gemini API models added to /model.',
            },
            sandboxProxy: {
                label: 'Sandbox proxy (sandboxProxy)',
                desc: 'Sends network traffic from sandboxed terminal commands through your own HTTP proxy instead of the built-in one.',
            },
        },
    },
    cleanup: {
        title: 'Agy CLI Cleanup',
        description:
            'Delete cache, logs, crash data, history, and conversations under ~/.gemini/antigravity-cli, plus old agy executables moved aside by auto-update.',
        wslSection: 'WSL: {{distro}}',
        noCandidates: 'No cleanup targets found',
        name: 'Item',
        descriptionColumn: 'Description',
        files: 'Files',
        size: 'Size',
        deleteSelected: 'Delete selected',
        confirmTitle: 'Confirm cleanup',
        confirmBody: 'Delete {{count}} selected item(s). This cannot be undone.',
        cancel: 'Cancel',
        deleteSuccess: 'Cleanup completed',
        deleteError: 'Cleanup failed',
        item: {
            projects: {
                label: 'Projects (workspace paths)',
                desc: 'Conversations per workspace path. Also deleted: subagent conversations and related data, matching input history lines, the latest conversation record, and that folder in project definitions.',
            },
            'trusted-workspaces': {
                label: 'Trusted folders (trustedWorkspaces)',
                desc: 'Trusted folders listed in trustedWorkspaces of settings.json.',
            },
            cache: {
                label: 'cache',
                desc: 'Agy CLI cache, such as the latest conversation per workspace.',
            },
            log: { label: 'log', desc: 'Agy CLI logs, including the latest log that cli.log points to.' },
            crashes: { label: 'crashes', desc: 'Crash reports produced by Agy CLI.' },
            conversations: {
                label: 'conversations',
                desc: 'Saved conversations. Also deleted: brain, annotations, chapter_titles, voice_chats, browser_recordings, and worktrees of the conversation, its rows in the conversation summary database, and its entry in the summary cache.',
            },
            annotations: {
                label: 'annotations',
                desc: 'Annotation data left after its conversation is gone.',
            },
            'chapter-titles': {
                label: 'chapter_titles',
                desc: 'Chapter titles left after their conversation is gone.',
            },
            'voice-chats': {
                label: 'voice_chats',
                desc: 'Voice chat records left after their conversation is gone.',
            },
            'browser-recordings': {
                label: 'browser_recordings',
                desc: 'Browser recordings left after their conversation is gone.',
            },
            brain: {
                label: 'brain',
                desc: 'Outputs and work data per conversation, including transcripts.',
            },
            scratch: {
                label: 'scratch',
                desc: 'Agent work directories, including output such as generated images.',
            },
            worktrees: {
                label: 'worktrees',
                desc: 'Git worktrees that subagents work in. Also deleted: uncommitted changes.',
            },
            'conversation-summaries': {
                label: 'conversation_summaries.db',
                desc: 'Conversation summary database used by the conversation list (/resume).',
            },
            'conversation-summaries-wal': {
                label: 'conversation_summaries.db-wal',
                desc: 'Conversation summary database write-ahead log.',
            },
            'conversation-summaries-shm': {
                label: 'conversation_summaries.db-shm',
                desc: 'Conversation summary database shared-memory file.',
            },
            history: { label: 'history.jsonl', desc: 'Prompt and command input history.' },
            'update-lock': {
                label: 'updater/update.lock',
                desc: 'Lock files left by a stopped update.',
            },
            'old-binaries': {
                label: 'Old agy executables (*.old)',
                desc: 'Old versions of the executable moved aside by auto-update.',
            },
        },
    },
};
