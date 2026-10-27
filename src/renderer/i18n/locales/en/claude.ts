export default {
    claudeDesktop: {
        title: 'Claude Desktop MCP Manager',
        notFound: 'Claude Desktop configuration file not found',
        notFoundDescription: 'Please check if Claude Desktop is installed.',
        standardConfigPath: 'Standard',
        disabledConfigPath: 'Disabled',
        restart: 'Start/Restart Claude Desktop',
        restartSuccess: 'Claude Desktop restarted successfully',
        restartError: 'Failed to restart Claude Desktop',
        enabledServers: 'Enabled MCP Servers',
        disabledServers: 'Disabled MCP Servers',
        noServers: 'No MCP servers registered',
        serverName: 'Server Name',
        command: 'Command',
        args: 'Arguments',
        actions: 'Actions',
        enable: 'Enable',
        disable: 'Disable',
        dragToReorder: 'Drag to reorder',
    },
    claudeCode: {
        title: 'Claude Code MCP Manager',
        wslSection: 'WSL: {{distro}}',
        notFound: 'No ~/.claude.json found for this environment',
        configPath: 'Config',
        disabledConfigPath: 'Disabled',
        enabledServers: 'Enabled MCP Servers',
        disabledServers: 'Disabled MCP Servers',
        noServers: 'No MCP servers registered',
        serverName: 'Server Name',
        command: 'Command',
        args: 'Arguments',
        actions: 'Actions',
        enable: 'Enable',
        disable: 'Disable',
        dragToReorder: 'Drag to reorder',
    },
    cleanup: {
        title: 'Claude Code Cleanup',
        description:
            'Delete history, cache, temporary files, and logs under ~/.claude, plus the temporary items Claude Code leaves in the OS temp folder and cache. Besides reclaiming disk space, this can improve performance and clear stale state left in memory that makes Claude Code behave unexpectedly.',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: 'Delete Selected',
        cancel: 'Cancel',
        confirmTitle: 'Confirm Cleanup',
        confirmBody: 'Delete {{count}} selected item(s)? This cannot be undone.',
        reclaimable: '{{count}} item(s) selected, {{size}} reclaimable',
        noCandidates: 'No cleanup targets found',
        inUseNotice:
            'Close running Claude Code sessions before cleanup, otherwise some directories may fail to delete.',
        deleteSuccess: 'Cleanup completed',
        deleteError: 'Failed to clean up some items',
        columnName: 'Item',
        columnDescription: 'Description',
        columnFiles: 'Files',
        columnSize: 'Size',
        childOrphan: 'No conversation history (temporary items only)',
        childMayBeInUse: 'May be in use ({{count}} conversation record(s), temporary item(s), etc.)',
        approvalTitle: 'Projects That May Be in Use',
        dir: {
            projects: 'projects',
            plans: 'plans',
            fileHistory: 'file-history',
            history: 'history.jsonl',
            pasteCache: 'paste-cache',
            uploads: 'uploads',
            shellSnapshots: 'shell-snapshots',
            cache: 'cache',
            debug: 'debug',
            sessionEnv: 'session-env',
            tasks: 'tasks',
            usageData: 'usage-data',
            feedbackBundles: 'feedback-bundles',
            skillsTrash: 'skills/.trash',
            pluginsTrash: 'plugins/.trash',
            backups: 'backups',
            tempBundledSkills: 'Temp folder: bundled-skills',
            tempBashEditDiff: 'Temp folder: bash-edit-diff',
            imageCache: 'image-cache',
            todos: 'todos',
            statsig: 'statsig',
            logs: 'logs',
        },
        desc: {
            projects:
                "Per-project conversation transcripts (used to resume and rewind past sessions). Each project's memory/ folder (auto memory) and the project's temporary items (session work folders and bash-edit-diff in the OS temp folder, and MCP server logs) are deleted with it. Projects whose transcripts are gone but whose temporary items remain can also be selected. In a project with a running session, that session's transcripts, work folders, and bash-edit-diff, plus the project's memory/ folder and MCP server logs, are kept. When running sessions cannot be determined, transcripts and temporary items are not deleted.",
            plans: 'Plan files created in plan mode (records of past plans).',
            fileHistory:
                'History and diffs of files edited by Claude Code, used to restore checkpoints of past sessions.',
            history: 'History of prompts you have entered (recallable with the up arrow key and Ctrl+R).',
            pasteCache: 'Contents of large pastes (the pasted text in recalled prompts).',
            uploads: 'Files attached from the web or mobile app to Remote Control sessions.',
            shellSnapshots: 'Shell environment snapshots captured to run commands.',
            cache: 'Temporary cache of the changelog and other data.',
            debug: 'Debug logs for troubleshooting.',
            sessionEnv: 'Environment variables and data saved per session.',
            tasks: 'Task lists written by the task tools (picked up by a resumed session).',
            usageData: 'Reports written by /insights and the cached analysis data used to build them.',
            feedbackBundles: 'Feedback and bug-report archives written by /feedback that have not been sent yet.',
            skillsTrash: 'Skills removed by the claude.ai sync (they can no longer be recovered).',
            pluginsTrash: 'Plugins removed by the claude.ai sync (they can no longer be recovered).',
            backups: 'Auto-saved backups of previous ~/.claude.json files.',
            tempBundledSkills:
                'Built-in skills extracted to the OS temp folder (one per Claude Code version). Versions matching a running session are excluded.',
            tempBashEditDiff:
                'Diff records of shell-command edits in the OS temp folder that match no project conversation transcript. Records of running sessions are excluded.',
            imageCache: 'Attached images saved by older Claude Code versions (no longer written).',
            todos: 'TODO data used by older Claude Code versions (no longer written).',
            statsig: 'Feature-flag cache used by older Claude Code versions (no longer written).',
            logs: 'Logs written by older Claude Code versions (no longer written).',
        },
        other: {
            sectionTitle: 'Other tools',
            registered: '{{count}} registered',
            columnMetric: 'Status',
            label: {
                serenaProjects: 'Serena projects',
                serenaLogs: 'Serena logs',
            },
            desc: {
                serenaProjects: "Clears Serena's registered project list (keeps settings and comments).",
                serenaLogs: 'Deletes logs produced by Serena.',
            },
        },
    },
    assetManager: {
        title: 'Claude Code Agent / Skill Manager',
        description:
            'List your Claude Code agents and skills, download selected ones together as a ZIP, or upload a ZIP to import them.',
        wslSection: 'WSL: {{distro}}',
        tabAgents: 'Agents',
        tabSkills: 'Skills',
        col: {
            name: 'Name',
            description: 'Description',
            model: 'Model',
        },
        columnFiles: 'Files',
        columnLastModified: 'Last Modified',
        columnView: 'View',
        newBadge: 'NEW',
        relative: {
            today: 'Today',
            yesterday: 'Yesterday',
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
        deleteConfirmTitle: 'Delete selected items?',
        deleteConfirmBody: 'Delete {{count}} selected item(s)? This cannot be undone.',
        deleteSuccess: 'Deleted {{count}} item(s)',
        deletePartial: 'Some items could not be deleted because they were in use',
        deleteError: 'Failed to delete the selected items',
        noEntries: 'No items found',
        unavailable: 'This environment cannot be accessed for archive operations (WSL path unreachable).',
        downloadSuccess: 'Archive saved',
        downloadError: 'Failed to create the archive',
        uploadSuccess: 'Extracted {{count}} item(s)',
        uploadError: 'Failed to extract the archive',
        overwriteConfirmTitle: 'Overwrite existing items?',
        overwriteConfirmBody:
            'The following {{count}} item(s) already exist and will be deleted and replaced: {{names}}. Continue?',
        importOfficial: 'Import Official Skills',
        importOfficialTitle: 'Import Official Skills',
        importOfficialDesc:
            'These are skills from the official Anthropic repository (anthropics/skills). Select the skills to import. Existing skills with the same name will be replaced.',
        import: 'Import',
        gitRequired: 'This feature requires git to be installed',
        officialImportSuccess: 'Imported {{count}} official skill(s)',
        officialImportError: 'Failed to import official skills',
        officialListError: 'Failed to fetch official skills',
        repoUpdating: 'Updating the official repository...',
        mdNoName: 'Could not read the name from SKILL.md',
        syncedReserved:
            '"synced" is the folder Claude Code uses to sync skills from claude.ai, so a skill with this name cannot be uploaded',
        kindWarnTitle: 'This may be the wrong type',
        kindWarnContinue: 'Import anyway',
        kindWarn: {
            'agent-md-into-skill': 'This file looks like an agent (it has tools / model). Import it as a skill anyway?',
            'skill-no-skillmd':
                'This archive does not contain a SKILL.md and may not be a valid skill. Import it as a skill anyway?',
            'skillmd-into-agent': 'This file looks like a SKILL.md (a skill). Import it as an agent anyway?',
        },
        kindBlock: {
            'agent-into-skill':
                'This archive looks like an agent (.md files). It cannot be imported on the Skills tab. Use the Agents tab.',
            'skill-into-agent':
                'This archive looks like a skill (a folder containing SKILL.md). It cannot be imported on the Agents tab. Use the Skills tab.',
            'no-md': 'This archive contains no .md files and cannot be imported as an agent.',
        },
    },
    settings: {
        title: 'Claude Code Settings',
        description: 'Edit ~/.claude/settings.json items in a table, or edit the file directly.',
        wslSection: 'WSL: {{distro}}',
        colItem: 'Item',
        colValue: 'Value',
        directEdit: 'Direct Edit',
        directEditTitle: 'Edit settings.json directly',
        directEditDesc:
            'Edit the raw contents of settings.json. Saving overwrites the entire file with this content. Make sure it is valid JSON.',
        save: 'Save',
        cancel: 'Cancel',
        unset: 'Not set',
        unsetWithDefault: 'Not set (default: {{default}})',
        enabled: 'Enabled',
        disabled: 'Disabled',
        unknownValue: '{{value}} (saved value; not in current suggestions)',
        directEditValue: 'Edit the file directly',
        saveSuccess: 'Settings saved',
        saveError: 'Failed to save settings',
        readError: 'Failed to load settings',
        invalidJson: 'The JSON syntax is not valid',
        invalidExisting: 'The existing settings.json is broken and cannot be saved. Fix it via Direct Edit.',
        verifyFailed:
            'Verification of the edit result failed, so saving was aborted. The file is unchanged. Change this item via Direct Edit.',
        unavailable: 'Settings for this environment cannot be accessed.',
        group: {
            model: 'Model & Thinking',
            display: 'Display & Notifications',
            behavior: 'Behavior & Data',
            agent: 'Agents',
            permissions: 'Permissions',
            sandbox: 'Sandbox',
        },
        field: {
            model: {
                label: 'Model (model)',
                desc: 'Default model alias or full model ID. Suggestions are current examples; custom IDs are accepted.',
            },
            language: {
                label: 'Response language (language)',
                desc: 'Preferred language for responses and voice input. Any language name is accepted (e.g. japanese, english, spanish). Empty means unset.',
            },
            outputStyle: {
                label: 'Output style (outputStyle)',
                desc: 'Output style for responses. Built-in (default / Explanatory / Learning) or a custom style. Empty means unset.',
            },
            effortLevel: {
                label: 'Effort level (effortLevel)',
                desc: 'How much effort to spend thinking. Higher means better quality but more cost.',
            },
            advisorModel: {
                label: 'Advisor model (advisorModel)',
                desc: 'Model alias or full model ID used by the advisor tool.',
            },
            maxEffortLevel: {
                label: 'Effort level cap (maxEffortLevel)',
                desc: 'Highest effort level a session can use. Any higher level runs at this cap. max sets no cap.',
            },
            ultracode: {
                label: 'Start with ultracode (ultracode)',
                desc: 'Starts sessions with ultracode on, so Claude plans a dynamic workflow for each substantive task. The effort level is unchanged.',
            },
            promptCacheTtl: {
                label: 'Prompt cache lifetime (promptCacheTtl)',
                desc: 'How long the prompt cache holds the main conversation. 1h keeps the cache warm across longer breaks but bills cache writes at a higher rate.',
            },
            subagentPromptCacheTtl: {
                label: 'Subagent prompt cache lifetime (subagentPromptCacheTtl)',
                desc: 'How long the prompt cache holds requests outside the main conversation, such as subagents, workflows, and compaction.',
            },
            enforceAvailableModels: {
                label: 'Enforce allowlist for Default (enforceAvailableModels)',
                desc: 'When the Default model would resolve outside availableModels, uses the first available model in the list instead.',
            },
            alwaysThinkingEnabled: {
                label: 'Extended thinking (alwaysThinkingEnabled)',
                desc: 'Set to false to turn extended thinking off for every session. Thinking is on by default for supported models, so true has no effect.',
            },
            autoMemoryEnabled: {
                label: 'Auto memory (autoMemoryEnabled)',
                desc: 'Enables reading and writing of auto memory.',
            },
            editorMode: {
                label: 'Editor mode (editorMode)',
                desc: 'Key bindings for the input box.',
            },
            preferredNotifChannel: {
                label: 'Notifications (preferredNotifChannel)',
                desc: 'How notifications are delivered.',
            },
            spinnerTipsEnabled: {
                label: 'Spinner tips (spinnerTipsEnabled)',
                desc: 'Shows tips in the spinner while working.',
            },
            emojiCompletionEnabled: {
                label: 'Emoji completion (emojiCompletionEnabled)',
                desc: 'Shows emoji suggestions when you type ":" plus a shortcode and replaces shortcodes like :heart: with the emoji. Default: on (v2.1.217+).',
            },
            showTurnDuration: {
                label: 'Show turn duration (showTurnDuration)',
                desc: 'Shows how long each response took.',
            },
            autoScrollEnabled: {
                label: 'Auto-scroll (autoScrollEnabled)',
                desc: 'Follows new output in fullscreen rendering.',
            },
            awaySummaryEnabled: {
                label: 'Away summary (awaySummaryEnabled)',
                desc: 'Shows a recap when you return after being away.',
            },
            autoUpdatesChannel: {
                label: 'Update channel (autoUpdatesChannel)',
                desc: 'Channel for auto-updates. "latest" is the newest (default); "stable" is about a week behind and steadier.',
            },
            minimumVersion: {
                label: 'Minimum update version (minimumVersion)',
                desc: 'Keeps auto-updates and claude update from installing any version below this one (e.g. 2.1.100).',
            },
            cleanupPeriodDays: {
                label: 'Session retention days (cleanupPeriodDays)',
                desc: 'Deletes session files older than this many days (minimum 1; default 30 when unset).',
            },
            desktopSessionCleanupPeriodDays: {
                label: 'Desktop session retention days (desktopSessionCleanupPeriodDays)',
                desc: 'Age limit for transcripts of sessions used in Claude Desktop or Cowork. They are deleted once older than both this value and cleanupPeriodDays. 0 keeps them indefinitely.',
            },
            autoCompactEnabled: {
                label: 'Auto compact (autoCompactEnabled)',
                desc: 'Automatically compacts the conversation as the context limit approaches.',
            },
            idleCompaction: {
                label: 'Idle compaction (idleCompaction)',
                desc: 'Compacts a long conversation you have stepped away from shortly before its prompt cache expires. Set to false to turn it off.',
            },
            autoCompactWindow: {
                label: 'Auto compact window (autoCompactWindow)',
                desc: 'Context size in tokens (100000-1000000) at which auto compaction runs. Uses a model-tuned window when unset.',
            },
            fileCheckpointingEnabled: {
                label: 'File checkpointing (fileCheckpointingEnabled)',
                desc: 'Saves snapshots of file changes so /rewind can restore them.',
            },
            agentTeams: {
                label: 'Agent teams (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)',
                desc: 'Enables the experimental agent teams feature. ON sets "1" in env; OFF removes the entry.',
            },
            teammateMode: {
                label: 'Teammate mode (teammateMode)',
                desc: 'Display mode for teammates. in-process = inside the main terminal, auto = split when available, tmux / iterm2 = split panes. Default is in-process.',
            },
            agentPushNotifEnabled: {
                label: 'Agent notifications (agentPushNotifEnabled)',
                desc: 'Sends proactive phone notifications, such as long-task completion, while Remote Control is connected. Default: off.',
            },
            fastMode: {
                label: 'Fast mode (fastMode)',
                desc: 'Starts supported sessions in fast mode. Enabling /fast also writes this setting.',
            },
            fastModePerSessionOptIn: {
                label: 'Fast mode per session (fastModePerSessionOptIn)',
                desc: 'Stops fast mode from carrying across sessions, so each session requires explicit activation with /fast.',
            },
            switchModelsOnFlag: {
                label: 'Switch models when flagged (switchModelsOnFlag)',
                desc: 'Switches to the fallback model automatically and continues when a safety classifier flags a request. Turn off to pause and choose instead. Default: on.',
            },
            inputNeededNotifEnabled: {
                label: 'Input-needed notifications (inputNeededNotifEnabled)',
                desc: 'Sends a phone notification when a permission prompt or question needs input while Remote Control is connected. Default: off.',
            },
            agent: {
                label: 'Default agent (agent)',
                desc: 'Runs the main thread as the named subagent and applies its prompt, tool restrictions, and model.',
            },
            crossSessionInbound: {
                label: 'Messages from other sessions (crossSessionInbound)',
                desc: 'How messages from your other Claude Code sessions are handled: accept = deliver to Claude, hold = show a notice without delivering, refuse = drop. Unset decides per message.',
            },
            isolatePeerMachines: {
                label: 'Confirm cross-machine messages (isolatePeerMachines)',
                desc: "Asks for your approval before Claude's SendMessage reaches a session on another machine, even in bypassPermissions mode.",
            },
            axScreenReader: {
                label: 'Screen-reader output (axScreenReader)',
                desc: 'Uses flat text without decorative borders or animations for screen-reader-friendly output.',
            },
            prefersReducedMotion: {
                label: 'Reduce motion (prefersReducedMotion)',
                desc: 'Reduces or disables UI animations such as spinners, shimmer, and flash effects.',
            },
            promptSuggestionEnabled: {
                label: 'Prompt suggestions (promptSuggestionEnabled)',
                desc: 'Shows grayed-out predictions of your next input in the prompt box. Set to false to hide them.',
            },
            terminalTitleFromRename: {
                label: 'Session name as terminal title (terminalTitleFromRename)',
                desc: 'Shows the session name set with /rename or --name as the terminal tab title. Set to false to keep the title generated from the conversation.',
            },
            timeFormat: {
                label: 'Time format (timeFormat)',
                desc: 'Format of times shown in the interface: auto (follows the locale), 12-hour, 24-hour, 24-hour-utc, or a strftime pattern such as %H:%M.',
            },
            timeZone: {
                label: 'Display time zone (timeZone)',
                desc: 'IANA time zone name, such as UTC or Europe/Dublin, for times shown in the interface. Unset uses the system time zone.',
            },
            maxProseWidth: {
                label: 'Maximum prose width (maxProseWidth)',
                desc: 'Column limit (minimum 40) at which response paragraphs, headings, and lists wrap. Tables and code blocks keep the full terminal width.',
            },
            showThinkingSummaries: {
                label: 'Show thinking summaries (showThinkingSummaries)',
                desc: 'Makes extended-thinking summaries visible in interactive sessions. It does not change generation or billing. Default: off.',
            },
            syntaxHighlightingDisabled: {
                label: 'Disable syntax highlighting (syntaxHighlightingDisabled)',
                desc: 'Disables syntax highlighting in diffs, code blocks, and file previews.',
            },
            terminalProgressBarEnabled: {
                label: 'Terminal progress bar (terminalProgressBarEnabled)',
                desc: 'Shows a progress bar in the tab or window of supported terminals. Default: on.',
            },
            theme: {
                label: 'Color theme (theme)',
                desc: 'Selects a built-in theme or a custom:<slug> theme. Saved custom themes outside the suggestions remain supported.',
            },
            tui: {
                label: 'TUI renderer (tui)',
                desc: 'Uses the classic main-screen renderer (default) or the flicker-free alternate-screen renderer (fullscreen).',
            },
            verbose: {
                label: 'Verbose output (verbose)',
                desc: 'Shows full tool output instead of truncated summaries. Default: off.',
            },
            viewMode: {
                label: 'Startup view mode (viewMode)',
                desc: 'Selects the default, verbose, or focus transcript view when a session starts.',
            },
            wheelScrollAccelerationEnabled: {
                label: 'Wheel acceleration (wheelScrollAccelerationEnabled)',
                desc: 'Accelerates fullscreen scrolling when the mouse wheel is moved quickly. Default: on.',
            },
            autoMemoryDirectory: {
                label: 'Auto-memory directory (autoMemoryDirectory)',
                desc: 'Overrides auto-memory storage with an absolute path or a path beginning with ~/.',
            },
            askUserQuestionTimeout: {
                label: 'Question auto-continue timeout (askUserQuestionTimeout)',
                desc: 'Sets how long AskUserQuestion waits before continuing. never waits until you answer.',
            },
            dialogExpiry: {
                label: 'Remote dialog expiry (dialogExpiry)',
                desc: 'Deadline for dialogs forwarded to a remote client such as Remote Control. When it passes, the dialog is canceled and Claude Code continues with its default. never disables the deadline.',
            },
            autoContinueAtUsageLimit: {
                label: 'Continue after usage limit (autoContinueAtUsageLimit)',
                desc: 'After a claude.ai usage limit stops your session, waits in the open session and continues the task automatically after the reset.',
            },
            bashEditDiffEnabled: {
                label: 'Record Bash file changes (bashEditDiffEnabled)',
                desc: 'Records which files in a Git repository changed while a Bash command ran and shows their diff afterward. Unset records only in auto and bypassPermissions modes.',
            },
            bashOutputMaxChars: {
                label: 'Bash output limit (bashOutputMaxChars)',
                desc: 'Characters of successful command output Claude receives inline (4000-128000). Longer output is saved to a file and only a preview is sent. Default: 30000.',
            },
            defaultShell: {
                label: 'Default shell (defaultShell)',
                desc: 'Selects bash or PowerShell for ! commands entered in the input box.',
            },
            feedbackSurveyRate: {
                label: 'Feedback survey rate (feedbackSurveyRate)',
                desc: 'Sets the 0–1 probability of showing the session quality survey when eligible. Use 0 to suppress it entirely.',
            },
            feedbackDrafts: {
                label: 'Claude-drafted feedback (feedbackDrafts)',
                desc: 'Whether Claude can queue feedback drafts for review: notify = show a card when queued, quiet = queue without a card, off = no drafts.',
            },
            includeGitInstructions: {
                label: 'Include Git instructions (includeGitInstructions)',
                desc: 'Includes built-in commit and PR instructions plus a git status snapshot in the system prompt. Default: on.',
            },
            plansDirectory: {
                label: 'Plans directory (plansDirectory)',
                desc: 'Sets the plan-file directory relative to the project root. Default: ~/.claude/plans.',
            },
            respectGitignore: {
                label: 'Respect gitignore (respectGitignore)',
                desc: 'Excludes files matched by .gitignore from @ file-picker suggestions. Default: on.',
            },
            respondToBashCommands: {
                label: 'Respond after shell commands (respondToBashCommands)',
                desc: 'Lets Claude respond after an input-box ! command. When off, output is added to context without a response.',
            },
            showClearContextOnPlanAccept: {
                label: 'Clear context on plan accept (showClearContextOnPlanAccept)',
                desc: 'Shows the clear-context option on the plan acceptance screen. Default: off.',
            },
            skipWebFetchPreflight: {
                label: 'Skip WebFetch preflight (skipWebFetchPreflight)',
                desc: 'Skips the Anthropic hostname safety preflight for WebFetch. Intended for restricted-egress deployments.',
            },
            useAutoModeDuringPlan: {
                label: 'Auto mode during plan (useAutoModeDuringPlan)',
                desc: 'Applies auto-mode semantics in plan mode when auto mode is available. Default: on.',
            },
            workflowKeywordTriggerEnabled: {
                label: 'Ultracode keyword (workflowKeywordTriggerEnabled)',
                desc: 'Treats ultracode in a prompt as the dynamic-workflow trigger. Default: on.',
            },
            workflowSizeGuideline: {
                label: 'Workflow size guideline (workflowSizeGuideline)',
                desc: 'Agent count Claude aims for in dynamic workflows: unrestricted, small, medium (default), or large.',
            },
            enableWorkflows: {
                label: 'Enable workflows (enableWorkflows)',
                desc: "Turns dynamic workflows on or off for you. Unset follows your plan's default (off on the Pro plan).",
            },
            disableWorkflows: {
                label: 'Disable workflows (disableWorkflows)',
                desc: 'Disables dynamic workflows and bundled workflow commands. Default: off.',
            },
            disableBundledSkills: {
                label: 'Disable bundled skills (disableBundledSkills)',
                desc: 'Removes skills and workflows bundled with Claude Code without affecting plugin or .claude skills.',
            },
            syncClaudeAiSkills: {
                label: 'Sync claude.ai skills (syncClaudeAiSkills)',
                desc: 'Set to false to stop downloading and loading the skills enabled for your claude.ai account and move already synced skills to ~/.claude/skills/.trash.',
            },
            syncClaudeAiPlugins: {
                label: 'Sync claude.ai plugins (syncClaudeAiPlugins)',
                desc: 'Set to false to stop downloading and loading the plugins enabled for your claude.ai account and move already synced plugins to ~/.claude/plugins/.trash.',
            },
            disableAllHooks: {
                label: 'Disable all hooks (disableAllHooks)',
                desc: 'Disables every hook, any custom status line, and any custom file suggestion command.',
            },
            disableAgentView: {
                label: 'Disable agent view (disableAgentView)',
                desc: 'Disables background agents, claude agents, --bg, /background, and the on-demand supervisor.',
            },
            disableClaudeAiConnectors: {
                label: 'Disable Claude.ai connectors (disableClaudeAiConnectors)',
                desc: 'Stops automatic fetching and connection of claude.ai MCP connectors. Explicit --mcp-config servers are unaffected.',
            },
            disableRemoteControl: {
                label: 'Disable Remote Control (disableRemoteControl)',
                desc: 'Disables the Remote Control command, launch flag, automatic startup, and in-session toggle.',
            },
            remoteControlAtStartup: {
                label: 'Remote Control at startup (remoteControlAtStartup)',
                desc: 'Connects Remote Control when each interactive session starts. Unset follows the organization default.',
            },
            skillListingBudgetFraction: {
                label: 'Skill-listing context fraction (skillListingBudgetFraction)',
                desc: 'Reserves this fraction of the model context for the skill listing each turn. Must be greater than 0 and at most 1. Default: 0.01 (1%).',
            },
            skillListingMaxDescChars: {
                label: 'Maximum skill description (skillListingMaxDescChars)',
                desc: 'Caps the combined description and when_to_use text sent for each skill. Default: 1536 characters.',
            },
            apiKeyHelper: {
                label: 'API key helper command (apiKeyHelper)',
                desc: 'Runs a system-shell command to generate the value used in API-key and Bearer authorization headers.',
            },
            awsAuthRefresh: {
                label: 'AWS auth refresh command (awsAuthRefresh)',
                desc: 'Runs a custom command that updates the .aws directory when AWS authentication needs refreshing.',
            },
            awsCredentialExport: {
                label: 'AWS credential export command (awsCredentialExport)',
                desc: 'Runs a custom command that prints AWS credentials as JSON.',
            },
            gcpAuthRefresh: {
                label: 'GCP auth refresh command (gcpAuthRefresh)',
                desc: 'Runs when GCP Application Default Credentials expire or cannot be loaded.',
            },
            otelHeadersHelper: {
                label: 'OTel header helper (otelHeadersHelper)',
                desc: 'Generates dynamic OpenTelemetry headers at startup and during periodic refreshes.',
            },
            processWrapper: {
                label: 'Process wrapper (processWrapper)',
                desc: 'Corporate launcher command placed in front of the background processes Claude Code starts.',
            },
            prUrlTemplate: {
                label: 'PR URL template (prUrlTemplate)',
                desc: 'Formats PR badge links with {host}, {owner}, {repo}, {number}, and {url} substitutions.',
            },
            forceLoginMethod: {
                label: 'Restrict login method (forceLoginMethod)',
                desc: 'Limits which account type can sign in: claudeai = Claude.ai, console = Claude Console, gateway = cloud gateway.',
            },
            forceLoginGatewayUrl: {
                label: 'Login gateway URL (forceLoginGatewayUrl)',
                desc: 'Full URL, including the scheme, of the gateway the /login Cloud gateway screen connects to.',
            },
            remoteDefaultEnvironmentId: {
                label: 'Default cloud environment (remote.defaultEnvironmentId)',
                desc: 'Default cloud environment for sessions created with claude --cloud. Picking one with /remote-env writes this key.',
            },
            worktreeBaseRef: {
                label: 'Worktree base ref (worktree.baseRef)',
                desc: 'Ref new worktrees branch from: fresh = origin default branch (default), head = your current local HEAD.',
            },
            worktreeBgIsolation: {
                label: 'Background isolation (worktree.bgIsolation)',
                desc: 'Isolation mode for background sessions: worktree = block edits in the main checkout until EnterWorktree (default), none = edit the working copy directly.',
            },
            worktreeLocation: {
                label: 'SSH session worktree folder (worktree.location)',
                desc: 'Folder on the remote machine where Claude Desktop SSH sessions create worktrees (an absolute path or one starting with ~/). Unset creates them inside the project.',
            },
            enableAllProjectMcpServers: {
                label: 'Approve all project MCP servers (enableAllProjectMcpServers)',
                desc: 'Automatically approves every MCP server defined in project .mcp.json files.',
            },
            enableArtifact: {
                label: 'Enable Artifact (enableArtifact)',
                desc: 'Set to false to turn off the Artifact tool that publishes session output as a private claude.ai page. true is the same as unset.',
            },
            disableAutoMode: {
                label: 'Block auto mode (disableAutoMode)',
                desc: 'Set to disable to remove auto mode from the Shift+Tab cycle and start sessions that would begin in auto mode in default mode instead.',
            },
            disableDeepLinkRegistration: {
                label: 'Block deep-link registration (disableDeepLinkRegistration)',
                desc: 'Set to disable to stop startup registration of the claude-cli:// protocol handler.',
            },
            disableSkillShellExecution: {
                label: 'Disable skill shell execution (disableSkillShellExecution)',
                desc: 'Blocks inline shell execution in user, project, plugin, and additional-directory skills and custom commands.',
            },
            availableModels: {
                label: 'Available models (availableModels)',
                desc: 'Allowlist of models selectable for the main session, subagents, skills, and the Advisor tool.',
            },
            fallbackModel: {
                label: 'Fallback models (fallbackModel)',
                desc: 'Ordered model IDs to try when the primary model is overloaded or unavailable, up to three models.',
            },
            modelOverrides: {
                label: 'Model ID overrides (modelOverrides)',
                desc: 'Maps Anthropic model IDs to provider-specific IDs such as Amazon Bedrock inference profiles.',
            },
            modelPicker: {
                label: 'Model picker options (modelPicker)',
                desc: 'Models and labels the /model picker offers, added after the built-in lineup or replacing it.',
            },
            modelSettings: {
                label: 'Per-model settings (modelSettings)',
                desc: 'Effort level, effort cap, and auto-compact window saved for each model. Levels chosen with /effort or /model are saved here.',
            },
            footerLinksRegexes: {
                label: 'Footer link rules (footerLinksRegexes)',
                desc: 'Regex rules that turn matching output into clickable footer badges.',
            },
            spinnerTipsOverride: {
                label: 'Spinner tip overrides (spinnerTipsOverride)',
                desc: 'Defines custom working tips and whether the built-in tips are excluded.',
            },
            spinnerVerbs: {
                label: 'Spinner verbs (spinnerVerbs)',
                desc: 'Defines working-state verbs and whether they append to or replace the defaults.',
            },
            vimInsertModeRemaps: {
                label: 'Vim insert remaps (vimInsertModeRemaps)',
                desc: 'Maps two-character Vim INSERT-mode sequences to Escape.',
            },
            spellcheck: {
                label: 'Spell check (spellcheck)',
                desc: 'Underlines misspelled words in the prompt input using an installed aspell, hunspell, or ispell, with the dictionary language and color you choose.',
            },
            voice: {
                label: 'Voice input (voice)',
                desc: 'Configures voice input enablement, hold or tap mode, and automatic submission.',
            },
            attribution: {
                label: 'Attribution (attribution)',
                desc: 'Changes the commit trailer such as Co-Authored-By (commit), the pull request attribution text (pr), and the session link (sessionUrl). false hides all attribution.',
            },
            autoModeClassifyAllShell: {
                label: 'Classify all shell commands (autoMode.classifyAllShell)',
                desc: 'Routes every Bash / PowerShell command through the auto-mode classifier.',
            },
            autoMode: {
                label: 'Auto mode rules (autoMode)',
                desc: 'Defines environment conditions plus allow, soft-deny, and hard-deny rules for the auto-mode classifier.',
            },
            companyAnnouncements: {
                label: 'Company announcements (companyAnnouncements)',
                desc: 'Announcements shown at startup; multiple entries are rotated at random.',
            },
            env: {
                label: 'Environment variables (env)',
                desc: 'Environment variables applied to Claude Code sessions and the child processes they start.',
            },
            fileSuggestion: {
                label: 'File suggestion command (fileSuggestion)',
                desc: 'External command that generates @ file-completion candidates. Requires type ("command") and command.',
            },
            hooks: {
                label: 'Lifecycle hooks (hooks)',
                desc: 'Defines command, HTTP, prompt, and other hooks that run at Claude Code lifecycle events.',
            },
            permissionsDefaultMode: {
                label: 'Default permission mode (permissions.defaultMode)',
                desc: 'Permission mode at session start. default = prompt on first tool use, acceptEdits = auto-accept file edits, plan = start in plan mode, auto = start in auto mode, dontAsk = auto-deny anything that would prompt, bypassPermissions = skip all permission prompts, manual = alias for default.',
            },
            permissionsDisableBypassPermissionsMode: {
                label: 'Disable bypassPermissions (permissions.disableBypassPermissionsMode)',
                desc: 'Set "disable" to prevent the bypassPermissions mode from being used.',
            },
            permissionsBlockReadsOutsideWorkingDirectories: {
                label: 'Block reads outside working directories (permissions.blockReadsOutsideWorkingDirectories)',
                desc: 'Refuses Read, Grep, Glob, and LSP reads outside your working directories in every permission mode.',
            },
            skipDangerousModePermissionPrompt: {
                label: 'Skip bypassPermissions prompt (skipDangerousModePermissionPrompt)',
                desc: 'Skips the confirmation shown before entering bypass permissions mode via --dangerously-skip-permissions or defaultMode: bypassPermissions.',
            },
            skipAutoPermissionPrompt: {
                label: 'Skip auto mode notice (skipAutoPermissionPrompt)',
                desc: 'Skips the one-time notice describing auto mode shown when you first enter it.',
            },
            permissionsAllow: {
                label: 'Allow rules (permissions.allow)',
                desc: 'Array of permission rules that allow tool use without confirmation.',
            },
            permissionsAsk: {
                label: 'Ask rules (permissions.ask)',
                desc: 'Array of permission rules that always require confirmation before tool use.',
            },
            permissionsDeny: {
                label: 'Deny rules (permissions.deny)',
                desc: 'Array of permission rules that deny tool use. Also useful for restricting access to sensitive files.',
            },
            permissionsAdditionalDirectories: {
                label: 'Additional directories (permissions.additionalDirectories)',
                desc: 'Array of directories outside the working directory that Claude may access.',
            },
            sandboxEnabled: {
                label: 'Enable sandbox (sandbox.enabled)',
                desc: 'Runs Bash commands inside the OS sandboxing mechanism.',
            },
            sandboxFailIfUnavailable: {
                label: 'Fail if unavailable (sandbox.failIfUnavailable)',
                desc: 'Fails startup when the sandbox dependencies are not available.',
            },
            sandboxAllowUnsandboxedCommands: {
                label: 'Allow unsandboxed commands (sandbox.allowUnsandboxedCommands)',
                desc: 'Permits running commands outside the sandbox. Disable for a strict sandbox.',
            },
            sandboxAutoAllowBashIfSandboxed: {
                label: 'Auto-allow sandboxed Bash (sandbox.autoAllowBashIfSandboxed)',
                desc: 'Automatically approves Bash commands that run inside the sandbox.',
            },
            sandboxAllowAppleEvents: {
                label: 'Allow Apple Events (sandbox.allowAppleEvents)',
                desc: 'Permits sending Apple Events on macOS, letting sandboxed commands launch other applications.',
            },
            sandboxEnableWeakerNetworkIsolation: {
                label: 'Weaker network isolation (sandbox.enableWeakerNetworkIsolation)',
                desc: 'Runs network isolation in a weaker mode.',
            },
            sandboxEnableWeakerNestedSandbox: {
                label: 'Weaker nested sandbox (sandbox.enableWeakerNestedSandbox)',
                desc: 'Uses a weaker sandbox for nested environments such as Docker containers.',
            },
            sandboxFilesystemDisabled: {
                label: 'Disable filesystem isolation (sandbox.filesystem.disabled)',
                desc: 'Disables sandbox filesystem isolation so reads and writes are unrestricted. Network isolation stays in effect (v2.1.216+).',
            },
            sandboxNetworkHttpProxyPort: {
                label: 'HTTP proxy port (sandbox.network.httpProxyPort)',
                desc: 'Port number of the HTTP proxy used by sandbox network isolation.',
            },
            sandboxNetworkSocksProxyPort: {
                label: 'SOCKS proxy port (sandbox.network.socksProxyPort)',
                desc: 'Port number of the SOCKS proxy used by sandbox network isolation.',
            },
            sandboxNetworkStrictAllowlist: {
                label: 'Strict domain allowlist (sandbox.network.strictAllowlist)',
                desc: 'Denies sandboxed access to hosts outside the allowlist instead of prompting for approval. Default: off.',
            },
            sandboxNetworkAllowAllUnixSockets: {
                label: 'Allow all Unix sockets (sandbox.network.allowAllUnixSockets)',
                desc: 'Allows every Unix socket connection inside the sandbox; the only way to permit them on Linux and WSL2. Default: off.',
            },
            sandboxNetworkAllowLocalBinding: {
                label: 'Allow localhost binding (sandbox.network.allowLocalBinding)',
                desc: 'Lets sandboxed commands bind to localhost ports (macOS only). Default: off.',
            },
            sandboxCredentialsAllowPlaintextInject: {
                label: 'Allow plaintext injection (sandbox.credentials.allowPlaintextInject)',
                desc: 'Substitutes masked credential values on plain HTTP requests as well as HTTPS. Leave off outside trusted test networks. Default: off.',
            },
            sandbox: {
                label: 'Sandbox details (sandbox)',
                desc: 'Object holding the remaining structured settings: excluded commands, read/write paths, allowed domains, and credentials.',
            },
            statusLine: {
                label: 'Status line (statusLine)',
                desc: 'Command that outputs the status line content. Requires type ("command") and command; padding (extra horizontal space), refreshInterval (re-run interval in seconds), and hideVimModeIndicator (hides the Vim mode indicator) are optional.',
            },
            subagentStatusLine: {
                label: 'Subagent status line (subagentStatusLine)',
                desc: 'Command that outputs the status line shown for subagents. Requires type ("command") and command.',
            },
            skillOverrides: {
                label: 'Skill visibility overrides (skillOverrides)',
                desc: 'Maps skill names to on, name-only, user-invocable-only, or off visibility.',
            },
            sshConfigs: {
                label: 'SSH connections (sshConfigs)',
                desc: 'Defines SSH connections shown in the Desktop environment picker.',
            },
            worktreeSymlinkDirectories: {
                label: 'Worktree shared directories (worktree.symlinkDirectories)',
                desc: 'Directories symlinked from the main repository instead of copied into new worktrees.',
            },
            worktreeSparsePaths: {
                label: 'Worktree sparse paths (worktree.sparsePaths)',
                desc: 'Directories included through sparse checkout in each new worktree.',
            },
            enabledPlugins: {
                label: 'Plugin enabled states (enabledPlugins)',
                desc: 'Maps each plugin-name@marketplace-name identifier to its enabled state.',
            },
            pluginConfigs: {
                label: 'Plugin configuration (pluginConfigs)',
                desc: 'Stores per-plugin configuration using the structure defined by each plugin.',
            },
            prependPlugins: {
                label: 'Plugins run first (prependPlugins)',
                desc: 'Plugins (plugin-name@marketplace-name) whose mods run before every mod a user installs, in the listed order.',
            },
            appendPlugins: {
                label: 'Plugins run last (appendPlugins)',
                desc: 'Plugins (plugin-name@marketplace-name) whose mods run after every mod a user installs, in the listed order.',
            },
            extraKnownMarketplaces: {
                label: 'Additional marketplaces (extraKnownMarketplaces)',
                desc: 'Defines additional marketplace names and their sources for Claude Code.',
            },
            enabledMcpjsonServers: {
                label: 'Approved .mcp.json servers (enabledMcpjsonServers)',
                desc: 'MCP server names from .mcp.json files to approve.',
            },
            disabledMcpjsonServers: {
                label: 'Rejected .mcp.json servers (disabledMcpjsonServers)',
                desc: 'MCP server names from .mcp.json files to reject.',
            },
            allowedMcpServers: {
                label: 'MCP server allowlist (allowedMcpServers)',
                desc: 'Allows MCP servers by name, launch command, or URL pattern. Servers that match no entry are blocked wherever they are defined.',
            },
            deniedMcpServers: {
                label: 'MCP server denylist (deniedMcpServers)',
                desc: 'Refuses to load MCP servers that match a name, launch command, or URL pattern. Takes precedence over the allowlist.',
            },
            allowedHttpHookUrls: {
                label: 'Allowed HTTP hook URLs (allowedHttpHookUrls)',
                desc: 'Allowlist of URL patterns that HTTP hooks may target. * works as a wildcard.',
            },
            httpHookAllowedEnvVars: {
                label: 'HTTP hook env vars (httpHookAllowedEnvVars)',
                desc: 'Allowlist of environment variable names HTTP hooks may interpolate into headers.',
            },
            claudeMdExcludes: {
                label: 'CLAUDE.md excludes (claudeMdExcludes)',
                desc: 'Glob patterns or absolute paths of CLAUDE.md files to skip when loading memory.',
            },
            forceLoginOrgUUID: {
                label: 'Allowed login org (forceLoginOrgUUID)',
                desc: 'UUIDs of Anthropic organizations allowed to sign in. Accepts a single string or an array.',
            },
        },
    },
    pluginManager: {
        title: 'Claude Code Plugin Manager',
        description:
            'List, install, and uninstall Claude Code plugins and manage marketplaces. Operations use the claude command.',
    },
    nav: {
        claudeDesktop: 'Claude Desktop MCP Manager',
        claudeCode: 'Claude Code MCP Manager',
        assetManager: 'Claude Code Agent / Skill Manager',
        pluginManager: 'Claude Code Plugin Manager',
        cleanup: 'Claude Code Cleanup',
        claudeSettings: 'Claude Code Settings',
    },
    dashboard: {
        claudeDesktopDesc: 'Enable, disable, and reorder Claude Desktop MCP servers.',
        claudeCodeDesc: 'Manage Claude Code (CLI) profile MCP servers.',
        assetManagerDesc: 'Download and upload Claude Code agents and skills as ZIP archives.',
        pluginManagerDesc: 'Manage Claude Code plugins and marketplaces.',
        cleanupDesc: 'Reclaim disk space by cleaning up ~/.claude directories.',
        claudeSettingsDesc: 'Edit configuration items in ~/.claude/settings.json.',
    },
};
