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
            'Delete history, cache, temporary files, and logs under ~/.claude. Besides reclaiming disk space, this can improve performance and clear stale state left in memory that makes Claude Code behave unexpectedly.',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: 'Delete Selected',
        cancel: 'Cancel',
        confirmTitle: 'Confirm Cleanup',
        confirmBody: 'Delete {{count}} selected item(s)? This cannot be undone.',
        reclaimable: '{{count}} item(s) selected, {{size}} reclaimable',
        noCandidates: 'No cleanup targets found',
        inUseWarning:
            'Close running Claude Code sessions before cleanup, otherwise some directories may fail to delete.',
        deleteSuccess: 'Cleanup completed',
        deletePartial: 'Some items were skipped because files were in use',
        deleteError: 'Failed to clean up some items',
        columnName: 'Directory',
        columnDescription: 'Description',
        columnFiles: 'Files',
        columnSize: 'Size',
        dir: {
            projects: 'projects',
            plans: 'plans',
            fileHistory: 'file-history',
            history: 'history.jsonl',
            shellSnapshots: 'shell-snapshots',
            cache: 'cache',
            debug: 'debug',
            sessions: 'sessions',
            sessionEnv: 'session-env',
            tasks: 'tasks',
            backups: 'backups',
        },
        desc: {
            projects: 'Per-project conversation history and memory (records of past sessions).',
            plans: 'Plan files created in plan mode (records of past plans).',
            fileHistory: 'History and diffs of files edited by Claude Code, kept for undo.',
            history: 'History of prompts you have entered (recallable with the up arrow key).',
            shellSnapshots: 'Shell environment snapshots captured to run commands.',
            cache: 'Temporary cache of the changelog and other data.',
            debug: 'Debug logs for troubleshooting.',
            sessions: 'State files for running and past sessions.',
            sessionEnv: 'Environment variables and data saved per session.',
            tasks: 'State and temporary files for background tasks.',
            backups: 'Auto-saved backups of previous ~/.claude.json files.',
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
        unavailable: 'Settings for this environment cannot be accessed.',
        group: {
            model: 'Model & Thinking',
            display: 'Display & Notifications',
            behavior: 'Behavior & Data',
            agent: 'Agents',
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
            alwaysThinkingEnabled: {
                label: 'Always extended thinking (alwaysThinkingEnabled)',
                desc: 'Enables extended thinking by default for all sessions.',
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
            cleanupPeriodDays: {
                label: 'Session retention days (cleanupPeriodDays)',
                desc: 'Deletes session files older than this many days (minimum 1; default 30 when unset).',
            },
            autoCompactEnabled: {
                label: 'Auto compact (autoCompactEnabled)',
                desc: 'Automatically compacts the conversation as the context limit approaches.',
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
            inputNeededNotifEnabled: {
                label: 'Input-needed notifications (inputNeededNotifEnabled)',
                desc: 'Sends a phone notification when a permission prompt or question needs input while Remote Control is connected. Default: off.',
            },
            agent: {
                label: 'Default agent (agent)',
                desc: 'Runs the main thread as the named subagent and applies its prompt, tool restrictions, and model.',
            },
            axScreenReader: {
                label: 'Screen-reader output (axScreenReader)',
                desc: 'Uses flat text without decorative borders or animations for screen-reader-friendly output.',
            },
            prefersReducedMotion: {
                label: 'Reduce motion (prefersReducedMotion)',
                desc: 'Reduces or disables UI animations such as spinners, shimmer, and flash effects.',
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
            defaultShell: {
                label: 'Default shell (defaultShell)',
                desc: 'Selects bash or PowerShell for ! commands entered in the input box.',
            },
            feedbackSurveyRate: {
                label: 'Feedback survey rate (feedbackSurveyRate)',
                desc: 'Sets the 0–1 probability of showing the session quality survey when eligible. Use 0 to suppress it entirely.',
            },
            includeGitInstructions: {
                label: 'Include Git instructions (includeGitInstructions)',
                desc: 'Includes built-in commit and PR instructions plus a git status snapshot in the system prompt. Default: on.',
            },
            minimumVersion: {
                label: 'Minimum update version (minimumVersion)',
                desc: 'Prevents auto-update and claude update from installing an older version. It does not block startup.',
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
            disableWorkflows: {
                label: 'Disable workflows (disableWorkflows)',
                desc: 'Disables dynamic workflows and bundled workflow commands. Default: off.',
            },
            disableBundledSkills: {
                label: 'Disable bundled skills (disableBundledSkills)',
                desc: 'Removes skills and workflows bundled with Claude Code without affecting plugin or .claude skills.',
            },
            disableAllHooks: {
                label: 'Disable all hooks (disableAllHooks)',
                desc: 'Disables every hook and any custom status line.',
            },
            disableAgentView: {
                label: 'Disable agent view (disableAgentView)',
                desc: 'Disables background agents, claude agents, --bg, /background, and the on-demand supervisor.',
            },
            disableArtifact: {
                label: 'Disable Artifact (disableArtifact)',
                desc: 'Forcibly disables the Artifact tool that publishes session output as a private claude.ai page.',
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
                desc: 'Reserves this fraction of the model context for the skill listing each turn. Default: 0.01 (1%).',
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
            prUrlTemplate: {
                label: 'PR URL template (prUrlTemplate)',
                desc: 'Formats PR badge links with {host}, {owner}, {repo}, {number}, and {url} substitutions.',
            },
            enableAllProjectMcpServers: {
                label: 'Approve all project MCP servers (enableAllProjectMcpServers)',
                desc: 'Automatically approves every MCP server defined in project .mcp.json files.',
            },
            enableArtifact: {
                label: 'Enable Artifact (enableArtifact)',
                desc: 'Explicitly enables or disables the Artifact tool for this user. Managed disableArtifact takes precedence.',
            },
            disableAutoMode: {
                label: 'Block auto mode (disableAutoMode)',
                desc: 'Set to disable to remove auto mode from selection and reject --permission-mode auto.',
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
            voice: {
                label: 'Voice input (voice)',
                desc: 'Configures voice input enablement, hold or tap mode, and automatic submission.',
            },
            attribution: {
                label: 'Attribution (attribution)',
                desc: 'Configures attribution separately for Git commits, pull requests, and session URLs.',
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
                desc: 'Configures the command and type used to generate @ file-completion candidates.',
            },
            hooks: {
                label: 'Lifecycle hooks (hooks)',
                desc: 'Defines command, HTTP, prompt, and other hooks that run at Claude Code lifecycle events.',
            },
            permissions: {
                label: 'Permission rules (permissions)',
                desc: 'Groups tool allow, ask, and deny rules, additional directories, and the default permission mode.',
            },
            sandbox: {
                label: 'Sandbox details (sandbox)',
                desc: 'Configures Bash sandbox enablement, excluded commands, and readable or writable paths.',
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
            extraKnownMarketplaces: {
                label: 'Additional marketplaces (extraKnownMarketplaces)',
                desc: 'Defines additional marketplace names and their sources for Claude Code.',
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
