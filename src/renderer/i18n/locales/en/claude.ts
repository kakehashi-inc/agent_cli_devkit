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
        deleteSelected: 'Delete selected',
        cancel: 'Cancel',
        confirmTitle: 'Confirm cleanup',
        confirmBody: 'Delete {{count}} selected item(s)? This cannot be undone.',
        reclaimable: '{{count}} item(s) selected, {{size}} reclaimable',
        noCandidates: 'No cleanup targets found',
        deleteSuccess: 'Cleanup completed',
        deleteError: 'Failed to clean up some items',
        columnName: 'Item',
        columnDescription: 'Description',
        columnFiles: 'Files',
        columnSize: 'Size',
        childOrphan: 'No conversation history (temporary items only)',
        childMayBeInUse: 'May be in use ({{count}} conversation record(s), temporary item(s), etc.)',
        approvalTitle: 'Projects That May Be in Use',
        confirmWarning: {
            projects: 'Deletes transcripts and temporary items.',
            projectMemory:
                'Deletes auto memory. This cannot be undone, and it may be shared with worktrees and subfolders.',
            projectRecords:
                'Deletes the trust record, local-scope MCP settings, MCP on/off choices, .mcp.json approvals, external import approvals, and statistics. The trust prompt may appear again at the next start.',
            recordsWithBackups:
                'backups is also selected. Old copies of the project records are deleted too, so there will be no way to restore them.',
        },
        dir: {
            projects: 'projects',
            projectMemory: 'Project Memory',
            projectRecords: 'Project Records',
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
                'Transcripts per workspace path (used to resume or rewind past sessions). Also deleted: work folders of that path in the OS temp folder, bash-edit-diff, and MCP server logs.',
            projectMemory: 'Auto memory per workspace path.',
            projectRecords:
                'Records per workspace path in ~/.claude.json (trust records, local scope MCP settings, stats, and more).',
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
            skillsTrash: 'Where skills removed by claude.ai sync are kept.',
            pluginsTrash: 'Where plugins removed by claude.ai sync are kept.',
            backups: 'Auto-saved backups of previous ~/.claude.json files.',
            tempBundledSkills: 'Built-in skills unpacked in the OS temp folder, per Claude Code version.',
            tempBashEditDiff:
                'Diff records of edits made by shell commands in the OS temp folder that match no project transcript.',
            imageCache: 'Attached images saved by old versions of Claude Code.',
            todos: 'TODO data used by old versions of Claude Code.',
            statsig: 'Feature flag cache used by old versions of Claude Code.',
            logs: 'Logs written by old versions of Claude Code.',
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
                serenaProjects: 'The list of projects registered in Serena.',
                serenaLogs: 'Logs written by Serena.',
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
        unavailable: 'The files of this environment cannot be reached.',
        downloadSuccess: 'Archive saved',
        downloadError: 'Failed to create the archive',
        uploadSuccess: 'Extracted {{count}} item(s)',
        uploadError: 'Failed to extract the archive',
        overwriteConfirmTitle: 'Overwrite existing items?',
        overwriteConfirmBody:
            'The following {{count}} item(s) already exist and will be deleted and replaced: {{names}}. Continue?',
        importOfficial: 'Import official skills',
        importOfficialTitle: 'Import Official Skills',
        importOfficialDesc:
            'These are skills from the official Anthropic repository (anthropics/skills). Existing skills with the same name will be replaced.',
        import: 'Import',
        gitRequired: 'This feature requires git to be installed',
        officialImportSuccess: 'Imported {{count}} official skill(s)',
        officialImportError: 'Failed to import official skills',
        officialListError: 'Failed to fetch official skills',
        repoUpdating: 'Updating the official repository...',
        mdNoName: 'Could not read the name from SKILL.md',
        syncedReserved:
            '"synced" is the folder Claude Code uses to sync skills from claude.ai, so a skill with this name cannot be uploaded',
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
        },
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
    profile: {
        tab: {
            settings: 'Settings',
            hooks: 'Hooks',
            statusLine: 'Status Line',
            externalCommands: 'External commands',
            permissions: 'Permissions',
            instructions: 'Instructions',
            outputStyles: 'Output styles',
            rules: 'Rules',
            workflows: 'Workflows',
            commands: 'Commands',
        },
        statusLine: {
            mainTitle: 'Main',
            subagentTitle: 'Subagents',
        },
        externalCommands: {
            helpersTitle: 'Authentication and telemetry commands',
            ripgrepTitle: 'Sandbox ripgrep (sandbox.ripgrep)',
        },
        outputStyles: {
            overridesBuiltin: 'Overrides a built-in style',
        },
    },
    settings: {
        title: 'Claude Code Settings',
        description:
            'Edit Claude Code settings, hooks, permissions, instruction files, and more. The main settings file is ~/.claude/settings.json.',
        wslSection: 'WSL: {{distro}}',
        colItem: 'Item',
        colValue: 'Value',
        directEdit: 'Direct edit',
        directEditTitle: 'Edit settings.json directly',
        directEditDesc: 'Saving overwrites the entire file with this content.',
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
        invalidExisting:
            'The existing settings.json cannot be read by Claude Code, so it cannot be saved. Fix it via Direct Edit.',
        parseError:
            'settings.json is not strict JSON, so Claude Code cannot read this file (comments and trailing commas are not allowed). Its values cannot be shown, but this does not mean every item is unset. Fix it via Direct Edit.',
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
                desc: 'Model alias or full model ID that new sessions start with.',
            },
            language: {
                label: 'Response language (language)',
                desc: 'Language name, such as japanese or spanish, that Claude responds in. It also sets the language of voice dictation and session titles.',
            },
            outputStyle: {
                label: 'Output style (outputStyle)',
                desc: "Name of the built-in or custom output style that sets Claude's role, tone, and output format.",
            },
            effortLevel: {
                label: 'Effort level (effortLevel)',
                desc: 'Default effort level for models without a saved level. Lower levels are faster and cheaper; higher levels reason more deeply.',
            },
            advisorModel: {
                label: 'Advisor model (advisorModel)',
                desc: 'Model that answers when Claude calls the advisor tool. Unset turns the advisor off.',
            },
            maxEffortLevel: {
                label: 'Effort level cap (maxEffortLevel)',
                desc: 'Highest effort level a session runs at; any higher level runs at this cap. max sets no cap.',
            },
            ultracode: {
                label: 'Start with ultracode (ultracode)',
                desc: 'Starts sessions with ultracode on, so Claude plans a dynamic workflow for each substantive task.',
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
                desc: 'false turns extended thinking off for every session. true changes nothing.',
            },
            autoMemoryEnabled: {
                label: 'Auto memory (autoMemoryEnabled)',
                desc: 'Enables reading and writing of auto memory.',
            },
            editorMode: {
                label: 'Editor mode (editorMode)',
                desc: 'Key bindings for the input prompt: normal = standard, vim = vim-style editing.',
            },
            preferredNotifChannel: {
                label: 'Notifications (preferredNotifChannel)',
                desc: 'How Claude Code notifies you when a task completes or a permission prompt is waiting. auto picks a method for your terminal.',
            },
            spinnerTipsEnabled: {
                label: 'Spinner tips (spinnerTipsEnabled)',
                desc: 'Shows tips in the spinner while working.',
            },
            emojiCompletionEnabled: {
                label: 'Emoji completion (emojiCompletionEnabled)',
                desc: 'Shows emoji suggestions when you type ":" plus a shortcode and replaces shortcodes like :heart: with the emoji.',
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
                desc: 'Shows a one-line session recap when you return after a few minutes away.',
            },
            autoUpdatesChannel: {
                label: 'Update channel (autoUpdatesChannel)',
                desc: 'Release channel for auto-updates: latest = the newest release, stable = a version about a week old that skips releases with major regressions.',
            },
            minimumVersion: {
                label: 'Minimum update version (minimumVersion)',
                desc: 'Keeps auto-updates and claude update from installing any version below this one (e.g. 2.1.100).',
            },
            cleanupPeriodDays: {
                label: 'Session retention days (cleanupPeriodDays)',
                desc: 'Days to keep session transcripts and other application data before deleting them. Unset means 30.',
            },
            desktopSessionCleanupPeriodDays: {
                label: 'Desktop session retention days (desktopSessionCleanupPeriodDays)',
                desc: 'Age limit in days for transcripts of sessions used in Claude Desktop or Cowork, applied once they are also older than cleanupPeriodDays. 0 sets no limit.',
            },
            autoCompactEnabled: {
                label: 'Auto compact (autoCompactEnabled)',
                desc: 'Automatically compacts the conversation as the context limit approaches.',
            },
            idleCompaction: {
                label: 'Idle compaction (idleCompaction)',
                desc: 'Compacts a long conversation you have stepped away from, shortly before its prompt cache expires.',
            },
            autoCompactWindow: {
                label: 'Auto compact window (autoCompactWindow)',
                desc: 'Context size in tokens (100000-1000000) at which auto compaction runs. Uses a model-tuned window when unset.',
            },
            fileCheckpointingEnabled: {
                label: 'File checkpointing (fileCheckpointingEnabled)',
                desc: 'Snapshots files before each edit, and /rewind restores them.',
            },
            agentTeams: {
                label: 'Agent teams (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)',
                desc: 'Enables the experimental agent teams feature.',
            },
            teammateMode: {
                label: 'Teammate mode (teammateMode)',
                desc: 'Where agent team teammates display: in-process = the main terminal pane, auto = split panes when the terminal supports them, tmux = tmux or iTerm2 split panes, iterm2 = iTerm2 native split panes.',
            },
            agentPushNotifEnabled: {
                label: 'Agent notifications (agentPushNotifEnabled)',
                desc: 'Sends a push notification to your phone when Claude decides one is worth sending.',
            },
            fastMode: {
                label: 'Fast mode (fastMode)',
                desc: 'Turns fast mode on for new sessions.',
            },
            fastModePerSessionOptIn: {
                label: 'Fast mode per session (fastModePerSessionOptIn)',
                desc: 'Stops a saved fastMode from applying at session start, so each session needs /fast.',
            },
            switchModelsOnFlag: {
                label: 'Switch models when flagged (switchModelsOnFlag)',
                desc: 'What happens when a safety classifier flags a request: true = switch to the fallback model and continue, false = pause to choose between switching and editing the prompt.',
            },
            inputNeededNotifEnabled: {
                label: 'Input-needed notifications (inputNeededNotifEnabled)',
                desc: 'Sends a push notification to your phone when a permission prompt or question is waiting for your input.',
            },
            agent: {
                label: 'Default agent (agent)',
                desc: 'Runs the main thread as the named subagent and applies its prompt, tool restrictions, and model.',
            },
            crossSessionInbound: {
                label: 'Messages from other sessions (crossSessionInbound)',
                desc: 'How messages from your other Claude Code sessions are handled: accept = deliver to Claude, hold = show a notice without delivering, refuse = drop, unset = decide per message.',
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
                desc: 'Shows grayed-out predictions of your next input in the prompt box.',
            },
            terminalTitleFromRename: {
                label: 'Session name as terminal title (terminalTitleFromRename)',
                desc: 'Shows the session name set with /rename or --name as the terminal tab title. false keeps the title generated from the conversation.',
            },
            timeFormat: {
                label: 'Time format (timeFormat)',
                desc: 'Format of times shown in the interface: auto = the built-in format, 12-hour, 24-hour, 24-hour-utc, or a strftime pattern such as %H:%M.',
            },
            timeZone: {
                label: 'Display time zone (timeZone)',
                desc: 'IANA time zone name, such as UTC or Asia/Tokyo, for times shown in the interface. Unset uses the system time zone.',
            },
            maxProseWidth: {
                label: 'Maximum prose width (maxProseWidth)',
                desc: 'Column limit (minimum 40) at which response paragraphs, headings, and lists wrap. Tables and code blocks keep the full terminal width.',
            },
            showThinkingSummaries: {
                label: 'Show thinking summaries (showThinkingSummaries)',
                desc: 'true shows full thinking summaries when you expand thinking. false shows a collapsed stub.',
            },
            syntaxHighlightingDisabled: {
                label: 'Disable syntax highlighting (syntaxHighlightingDisabled)',
                desc: 'Disables syntax highlighting in diffs, code blocks, and file previews.',
            },
            terminalProgressBarEnabled: {
                label: 'Terminal progress bar (terminalProgressBarEnabled)',
                desc: 'Shows a progress bar on the terminal tab or window while Claude works.',
            },
            theme: {
                label: 'Color theme (theme)',
                desc: 'Built-in theme, or a custom theme as custom:<slug> or custom:<plugin-name>:<slug>. auto matches the terminal background.',
            },
            tui: {
                label: 'TUI renderer (tui)',
                desc: 'Terminal renderer: default = classic main-screen renderer, fullscreen = flicker-free alternate-screen renderer, unset = Claude Code picks.',
            },
            verbose: {
                label: 'Verbose output (verbose)',
                desc: 'Shows full tool output instead of truncated summaries.',
            },
            viewMode: {
                label: 'Startup view mode (viewMode)',
                desc: 'Transcript view at session start: default = truncated tool output, verbose = full tool output, focus = last prompt, tool summary, and final response.',
            },
            wheelScrollAccelerationEnabled: {
                label: 'Wheel acceleration (wheelScrollAccelerationEnabled)',
                desc: 'Accelerates fullscreen scrolling when the mouse wheel is moved quickly.',
            },
            autoMemoryDirectory: {
                label: 'Auto-memory directory (autoMemoryDirectory)',
                desc: 'Overrides auto-memory storage with an absolute path or a path beginning with ~/.',
            },
            askUserQuestionTimeout: {
                label: 'Question auto-continue timeout (askUserQuestionTimeout)',
                desc: 'Idle time after which an unanswered AskUserQuestion continues with the options already selected. never waits until you answer.',
            },
            dialogExpiry: {
                label: 'Remote dialog expiry (dialogExpiry)',
                desc: 'Deadline for dialogs forwarded to a remote client such as Remote Control, after which the dialog is canceled and Claude Code continues with its default. never sets no deadline.',
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
                desc: 'Characters of successful command output Claude receives inline, clamped to 4000-128000. Longer output is saved to a file with a preview sent; unset means 30000.',
            },
            defaultShell: {
                label: 'Default shell (defaultShell)',
                desc: 'Shell that runs the ! commands you type in the input box.',
            },
            feedbackSurveyRate: {
                label: 'Feedback survey rate (feedbackSurveyRate)',
                desc: 'Probability from 0 to 1 that the session quality survey appears. 0 keeps it from appearing.',
            },
            feedbackDrafts: {
                label: 'Claude-drafted feedback (feedbackDrafts)',
                desc: 'Claude-drafted feedback for your review: notify = show a card when queued, quiet = queue without a card, off = no drafts.',
            },
            includeGitInstructions: {
                label: 'Include Git instructions (includeGitInstructions)',
                desc: "Includes built-in commit and PR instructions plus a git status snapshot in Claude's context.",
            },
            plansDirectory: {
                label: 'Plans directory (plansDirectory)',
                desc: 'Directory for plan files, relative to the project root. Unset uses ~/.claude/plans.',
            },
            respectGitignore: {
                label: 'Respect gitignore (respectGitignore)',
                desc: 'Excludes files matching .gitignore from @ file-picker suggestions.',
            },
            respondToBashCommands: {
                label: 'Respond after shell commands (respondToBashCommands)',
                desc: 'Has Claude reply after an input-box ! command. false adds the output to context without a reply.',
            },
            showClearContextOnPlanAccept: {
                label: 'Clear context on plan accept (showClearContextOnPlanAccept)',
                desc: 'Adds a first option to the plan approval menu that approves the plan and clears the conversation context.',
            },
            skipWebFetchPreflight: {
                label: 'Skip WebFetch preflight (skipWebFetchPreflight)',
                desc: 'Skips the WebFetch safety check that sends each requested hostname to api.anthropic.com.',
            },
            useAutoModeDuringPlan: {
                label: 'Auto mode during plan (useAutoModeDuringPlan)',
                desc: 'Has the auto mode classifier review shell commands in plan mode. false prompts for every command outside the built-in read-only set.',
            },
            workflowKeywordTriggerEnabled: {
                label: 'Ultracode keyword (workflowKeywordTriggerEnabled)',
                desc: 'Treats the word ultracode in a prompt as a dynamic workflow trigger.',
            },
            workflowSizeGuideline: {
                label: 'Workflow size guideline (workflowSizeGuideline)',
                desc: 'Agent count Claude aims for in dynamic workflows: unrestricted = no guideline, small = fewer than 5, medium = fewer than 10, large = fewer than 50.',
            },
            enableWorkflows: {
                label: 'Enable workflows (enableWorkflows)',
                desc: "Turns dynamic workflows on or off for you. Unset follows your plan's default (off on the Pro plan).",
            },
            disableWorkflows: {
                label: 'Disable workflows (disableWorkflows)',
                desc: 'Turns off dynamic workflows and the bundled workflow commands for everyone these settings reach.',
            },
            disableBundledSkills: {
                label: 'Disable bundled skills (disableBundledSkills)',
                desc: 'Removes the skills and workflows bundled with Claude Code and hides built-in commands such as /init from the model.',
            },
            syncClaudeAiSkills: {
                label: 'Sync claude.ai skills (syncClaudeAiSkills)',
                desc: 'false stops downloading and loading the skills enabled for your claude.ai account and moves already synced skills to ~/.claude/skills/.trash.',
            },
            syncClaudeAiPlugins: {
                label: 'Sync claude.ai plugins (syncClaudeAiPlugins)',
                desc: 'false stops downloading and loading the plugins enabled for your claude.ai account and moves already synced plugins to ~/.claude/plugins/.trash.',
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
                label: 'Disable claude.ai connectors (disableClaudeAiConnectors)',
                desc: 'Stops fetching and connecting the claude.ai MCP connectors.',
            },
            disableRemoteControl: {
                label: 'Disable Remote Control (disableRemoteControl)',
                desc: 'Disables the Remote Control command, launch flag, automatic startup, and in-session toggle.',
            },
            remoteControlAtStartup: {
                label: 'Remote Control at startup (remoteControlAtStartup)',
                desc: "Connects Remote Control when each interactive session starts. Unset follows your organization's default, then Claude Code's.",
            },
            skillListingBudgetFraction: {
                label: 'Skill-listing context fraction (skillListingBudgetFraction)',
                desc: 'Share of the context window reserved for the skill listing each turn, greater than 0 and at most 1. Unset means 0.01 (1%).',
            },
            skillListingMaxDescChars: {
                label: 'Maximum skill description (skillListingMaxDescChars)',
                desc: 'Characters of description and when_to_use text shown per skill in the skill listing. Unset means 1536.',
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
                desc: 'Limits which account type signs in: claudeai = claude.ai, console = Claude Console, gateway = cloud gateway.',
            },
            forceLoginGatewayUrl: {
                label: 'Login gateway URL (forceLoginGatewayUrl)',
                desc: 'Full URL, including the scheme, of the gateway the /login Cloud gateway screen connects to.',
            },
            remoteDefaultEnvironmentId: {
                label: 'Default cloud environment (remote.defaultEnvironmentId)',
                desc: 'Environment ID of the default cloud environment for cloud sessions created from the CLI, such as with claude --cloud.',
            },
            worktreeBaseRef: {
                label: 'Worktree base ref (worktree.baseRef)',
                desc: 'Ref new worktrees branch from: fresh = origin default branch, head = your current local HEAD.',
            },
            worktreeBgIsolation: {
                label: 'Background isolation (worktree.bgIsolation)',
                desc: 'Isolation of file edits in background sessions: worktree = block edits in the main checkout until EnterWorktree, none = edit the working copy directly.',
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
                desc: 'false turns off the Artifact tool that publishes session output as a private claude.ai page.',
            },
            disableAutoMode: {
                label: 'Block auto mode (disableAutoMode)',
                desc: 'disable removes auto mode from the Shift+Tab cycle and starts sessions that would begin in auto mode in default mode.',
            },
            disableDeepLinkRegistration: {
                label: 'Block deep-link registration (disableDeepLinkRegistration)',
                desc: 'disable stops Claude Code from registering the claude-cli:// protocol handler.',
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
                desc: 'Model aliases or IDs to try in order when the primary model is overloaded or unavailable, up to three.',
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
                desc: 'Effort level, effort cap, and auto-compact window saved for each model.',
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
                desc: 'External command that generates @ file-completion candidates.',
            },
            hooks: {
                label: 'Lifecycle hooks (hooks)',
                desc: 'Defines command, HTTP, prompt, and other hooks that run at Claude Code lifecycle events.',
            },
            permissionsDefaultMode: {
                label: 'Default permission mode (permissions.defaultMode)',
                desc: 'Permission mode for new sessions: default = ask except for reads, acceptEdits = also run file edits, plan = read and plan only, auto = a classifier checks actions, dontAsk = deny what would prompt, bypassPermissions = run everything, manual = same as default.',
            },
            permissionsDisableBypassPermissionsMode: {
                label: 'Disable bypassPermissions (permissions.disableBypassPermissionsMode)',
                desc: 'disable prevents anyone from entering bypassPermissions mode.',
            },
            permissionsBlockReadsOutsideWorkingDirectories: {
                label: 'Block reads outside working directories (permissions.blockReadsOutsideWorkingDirectories)',
                desc: 'Refuses Read, Grep, Glob, and LSP reads outside your working directories in every permission mode.',
            },
            permissionsBlockWritesOutsideWorkingDirectories: {
                label: 'Block writes outside working directories (permissions.blockWritesOutsideWorkingDirectories)',
                desc: "Refuses Write, Edit, and NotebookEdit paths outside your working directories in every permission mode, apart from some of Claude Code's own files.",
            },
            skipDangerousModePermissionPrompt: {
                label: 'Skip bypassPermissions prompt (skipDangerousModePermissionPrompt)',
                desc: 'Skips the confirmation shown before a session enters bypassPermissions mode.',
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
                desc: 'Array of permission rules that deny tool use.',
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
                desc: "Exits with an error at startup when the sandbox can't start, instead of running commands unsandboxed.",
            },
            sandboxAllowUnsandboxedCommands: {
                label: 'Allow unsandboxed commands (sandbox.allowUnsandboxedCommands)',
                desc: 'Lets Claude retry a blocked command outside the sandbox. false turns on strict sandbox mode.',
            },
            sandboxAutoAllowBashIfSandboxed: {
                label: 'Auto-allow sandboxed Bash (sandbox.autoAllowBashIfSandboxed)',
                desc: 'Runs sandboxed Bash commands without a permission prompt.',
            },
            sandboxAllowAppleEvents: {
                label: 'Allow Apple Events (sandbox.allowAppleEvents)',
                desc: 'On macOS, lets sandboxed commands send Apple Events. Code execution is no longer isolated.',
            },
            sandboxAllowNestedUserNamespaces: {
                label: 'Allow nested user namespaces (sandbox.allowNestedUserNamespaces)',
                desc: 'Lets sandboxed commands create user namespaces, which turns off a security boundary of the sandbox.',
            },
            sandboxEnableWeakerNetworkIsolation: {
                label: 'Weaker network isolation (sandbox.enableWeakerNetworkIsolation)',
                desc: 'Lets sandboxed commands reach the system TLS trust service, which opens a possible data exfiltration path.',
            },
            sandboxEnableWeakerNestedSandbox: {
                label: 'Weaker nested sandbox (sandbox.enableWeakerNestedSandbox)',
                desc: "Runs the Linux sandbox inside an unprivileged container by reusing the container's /proc, which exposes process information.",
            },
            sandboxFilesystemDisabled: {
                label: 'Disable filesystem isolation (sandbox.filesystem.disabled)',
                desc: 'Turns off sandbox filesystem isolation while keeping network isolation, so reads and writes are unrestricted.',
            },
            sandboxNetworkHttpProxyPort: {
                label: 'HTTP proxy port (sandbox.network.httpProxyPort)',
                desc: 'Local TCP port of your own HTTP proxy. Unset uses the proxy Claude Code runs.',
            },
            sandboxNetworkSocksProxyPort: {
                label: 'SOCKS proxy port (sandbox.network.socksProxyPort)',
                desc: 'Local TCP port of your own SOCKS5 proxy. Unset uses the proxy Claude Code runs.',
            },
            sandboxNetworkStrictAllowlist: {
                label: 'Strict domain allowlist (sandbox.network.strictAllowlist)',
                desc: 'Denies sandboxed access to hosts outside the allowlist instead of prompting for approval.',
            },
            sandboxNetworkAllowAllUnixSockets: {
                label: 'Allow all Unix sockets (sandbox.network.allowAllUnixSockets)',
                desc: 'Lets sandboxed commands connect to every Unix socket.',
            },
            sandboxNetworkAllowLocalBinding: {
                label: 'Allow localhost binding (sandbox.network.allowLocalBinding)',
                desc: 'On macOS, lets sandboxed commands listen on network ports and connect to any localhost port.',
            },
            sandboxCredentialsAllowPlaintextInject: {
                label: 'Allow plaintext injection (sandbox.credentials.allowPlaintextInject)',
                desc: 'Substitutes masked credential values on plain HTTP requests as well as TLS-terminated HTTPS.',
            },
            sandboxRipgrep: {
                label: 'Sandbox ripgrep (sandbox.ripgrep)',
                desc: 'Ripgrep binary the sandbox uses, given as a command path and optional arguments.',
            },
            sandbox: {
                label: 'Sandbox details (sandbox)',
                desc: 'Object holding the remaining structured settings: excluded commands, read/write paths, allowed domains, and credentials.',
            },
            statusLine: {
                label: 'Status line (statusLine)',
                desc: 'Command that outputs the status line content.',
            },
            subagentStatusLine: {
                label: 'Subagent status line (subagentStatusLine)',
                desc: 'Command that rewrites the subagent rows in the task display.',
            },
            skillOverrides: {
                label: 'Skill visibility overrides (skillOverrides)',
                desc: 'Maps skill names to on, name-only, user-invocable-only, or off visibility.',
            },
            sshHostCommands: {
                label: 'SSH host commands (sshHostCommands)',
                desc: 'SSH connections in the Desktop environment selector whose host comes from a command.',
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
                desc: "Non-sensitive answers given to each plugin's configuration dialog, keyed by plugin ID.",
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
                desc: 'Allowlist of URL patterns that HTTP hooks target, with * as a wildcard.',
            },
            httpHookAllowedEnvVars: {
                label: 'HTTP hook env vars (httpHookAllowedEnvVars)',
                desc: 'Allowlist of environment variable names HTTP hooks interpolate into headers.',
            },
            claudeMdExcludes: {
                label: 'CLAUDE.md excludes (claudeMdExcludes)',
                desc: 'Glob patterns or absolute paths of CLAUDE.md files to skip when loading memory.',
            },
            forceLoginOrgUUID: {
                label: 'Login organization (forceLoginOrgUUID)',
                desc: 'UUID of an Anthropic organization, or an array of them. A single UUID pre-selects that organization at login.',
            },
        },
    },
    pluginManager: {
        title: 'Claude Code Plugin Manager',
        description: 'List, install, and uninstall Claude Code plugins and manage marketplaces.',
    },
    nav: {
        group: 'Claude',
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
