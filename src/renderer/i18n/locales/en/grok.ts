export default {
    grokMcp: {
        title: 'Grok MCP Management',
        wslSection: 'WSL: {{distro}}',
        notFound: '~/.grok/config.toml was not found in this environment',
        configPath: 'Config',
        disabledConfigPath: 'Disabled',
        enabledServers: 'Enabled MCP servers',
        disabledServers: 'Disabled MCP servers',
        noServers: 'No MCP servers registered',
        serverName: 'Server name',
        command: 'Command',
        args: 'Args',
        actions: 'Actions',
        enable: 'Enable',
        disable: 'Disable',
        dragToReorder: 'Drag to reorder',
    },
    cleanup: {
        title: 'Grok Cleanup',
        description:
            'Delete history, memory, logs, diagnostic data, caches, and old executable versions under ~/.grok, plus Grok temporary files left in the OS temp folder. Besides reclaiming disk space, this can improve performance.',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: 'Delete selected',
        cancel: 'Cancel',
        confirmTitle: 'Confirm cleanup',
        confirmBody: 'Delete the {{count}} selected item(s). This cannot be undone. Continue?',
        reclaimable: '{{count}} selected, reclaimable {{size}}',
        noCandidates: 'No cleanup targets found',
        deleteSuccess: 'Cleanup completed',
        deleteError: 'Failed to delete some items',
        columnName: 'Item',
        columnDescription: 'Description',
        columnFiles: 'Files',
        columnSize: 'Size',
        memoryPathUnknown: 'Path could not be identified',
        confirmSharedTitle: 'These paths share the same memory, so it is deleted for all of them.',
        confirmRelatedTitle:
            'Subfolders have approval files too. They may take effect again once the parent path has no approvals. Choose any to delete as well.',
        confirmWarning: {
            sessions: 'Deletes the sessions of the selected paths and the tool approvals of those paths.',
            projectRecords:
                'The trust prompt may appear again in that folder. Until you answer it, your own hooks do not run in that folder.',
            projectGrants: 'The tool approval prompt may appear again.',
            projectMemory:
                'Memory cannot be restored. It may be shared with other clones and worktrees of the same repository. Old memory with the same name is also deleted.',
        },
        dir: {
            sessions: 'sessions',
            projectRecords: 'Project records',
            projectGrants: 'Project approvals',
            projectMemory: 'Project memory',
            sandboxEvents: 'sessions/sandbox-events.jsonl',
            logs: 'logs',
            debug: 'debug',
            leaderLog: 'leader.log',
            leaderLogRotated: 'leader.log.1',
            memtrace: 'memtrace',
            crash: 'crash',
            traceExports: 'trace-exports',
            marketplaceCache: 'marketplace-cache',
            docs: 'docs',
            memory: 'memory',
            memoryV2: 'memory-v2',
            plans: 'plans',
            binOldVersions: 'bin (old versions)',
            tempGoalScratch: 'Temp folder: grok-goal-*',
            tempSnapshotIndex: 'Temp folder: grok-snapshot-index-*',
            tempVideoFrames: 'Temp folder: grok-video-*',
            tempEditorFiles: 'Temp folder: grok-prompt-* / grok-transcript-*',
        },
        desc: {
            sessions:
                'Past session records (conversation logs and plans). Also deleted: tool approvals of the same path.',
            projectRecords: 'Folder trust decisions recorded in trusted_folders.toml.',
            projectGrants: 'Tool approvals saved per workspace path.',
            projectMemory: 'Memory per workspace. Also deleted: old memory with the same name.',
            sandboxEvents: 'Sandbox event log.',
            logs: 'Diagnostic logs such as the unified log and MCP server stderr output.',
            debug: 'Debug logs (written when GROK_DEBUG_LOG is set).',
            leaderLog: 'Log of the leader process.',
            leaderLogRotated: 'Previous leader process log, rotated out at its size limit.',
            memtrace: 'Process memory usage records (diagnostics).',
            crash: 'Crash reports from abnormal terminations.',
            traceExports: 'Trace bundles written by grok trace export.',
            marketplaceCache: 'Git cache of plugin marketplaces.',
            docs: 'Cache of the built-in user guide.',
            memory: 'Cross-session memory data.',
            memoryV2: 'Memory v2 data (topics and observations).',
            plans: 'Plan files created by old versions.',
            binOldVersions:
                'Old executable versions left by updates and executables moved aside during updates (*.old).',
            tempGoalScratch: 'Work folders for goal mode checks, directly in the OS temp folder.',
            tempSnapshotIndex:
                'Temporary Git indexes used to create worktree snapshots, directly in the OS temp folder.',
            tempVideoFrames:
                'Temporary folders for extracting frames from attached videos, directly in the OS temp folder.',
            tempEditorFiles:
                'Temporary files for editing prompts and viewing transcripts in an external editor, directly in the OS temp folder.',
        },
        other: {
            sectionTitle: 'Other tools',
            registered: '{{count}} registered',
            columnMetric: 'Status',
            label: {
                serenaProjects: 'Serena registered projects',
                serenaLogs: 'Serena logs',
            },
            desc: {
                serenaProjects: 'The list of projects registered in Serena.',
                serenaLogs: 'Logs written by Serena.',
            },
        },
    },
    assetManager: {
        title: 'Grok Agent / Skill Management',
        description:
            'List your Grok custom agents and skills, download selected ones together as a ZIP, or upload a ZIP/md file to import them.',
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
        deleteNestedNotice: 'Deleting a skill folder also deletes the skills nested inside it: {{names}}',
        deleteSuccess: 'Deleted {{count}} item(s)',
        deletePartial: 'Some items could not be deleted because they are in use',
        deleteError: 'Failed to delete the selected items',
        noEntries: 'No data available',
        unavailable: 'The files of this environment cannot be reached.',
        downloadSuccess: 'Archive saved',
        downloadError: 'Failed to create the archive',
        uploadSuccess: 'Imported {{count}} item(s)',
        uploadError: 'Failed to extract the archive',
        invalidArchive: 'This archive cannot be imported. It may be damaged or contain nothing to import.',
        overwriteConfirmTitle: 'Overwrite items with the same name?',
        overwriteConfirmBody:
            'The following {{count}} item(s) already exist and will be deleted and replaced: {{names}}. Continue?',
        mdNoName: 'Could not read the name from SKILL.md',
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
        kindWarnTitle: 'The type may not match',
        kindWarnContinue: 'Import anyway',
        kindWarn: {
            'agent-md-into-skill': 'This file looks like an agent (it has tools / model). Import it as a skill anyway?',
            'skill-no-skillmd':
                'This archive does not contain a SKILL.md and may not be a valid skill. Import it as a skill anyway?',
            'skillmd-into-agent': 'This file looks like a SKILL.md (a skill). Import it as an agent anyway?',
        },
        kindBlock: {
            'agent-nested-dirs':
                'This archive contains .md files inside subdirectories. Grok only recognizes agent definitions placed directly under the agents folder, so use a ZIP without nested folders.',
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
            rules: 'Rules',
            workflows: 'Workflows',
            commands: 'Commands',
        },
        statusLine: {
            title: 'Status line ([ui.status_line])',
        },
        hooks: {
            filesTitle: 'Hook files',
        },
        externalCommands: {
            commandsTitle: 'Commands',
            authCommandLabel: 'Authentication command (auth.auth_provider_command)',
            authAliasNotice: 'grok_com_config.auth_provider_command is in effect.',
            authProviderTitle: 'Authentication providers (auth_provider)',
            lspTitle: 'lsp.json',
        },
        permissions: {
            listsTitle: 'permission.allow / ask / deny',
            allow: 'Allow (allow)',
            ask: 'Ask (ask)',
            deny: 'Deny (deny)',
            rulesTitle: 'permission.rules',
            listsBlocked: 'Only rules is written.',
            rulesBlocked: 'Only allow / ask / deny are written.',
            bothForms: 'Both allow / ask / deny and rules are written.',
        },
        workflows: {
            notGuaranteed: 'Loading not guaranteed',
        },
    },
    settings: {
        title: 'Grok Settings',
        description:
            'Edit Grok settings, hooks, permissions, instruction files, and more. The main settings file is ~/.grok/config.toml.',
        wslSection: 'WSL: {{distro}}',
        colItem: 'Item',
        colValue: 'Value',
        directEdit: 'Direct edit',
        directEditTitle: 'Edit config.toml directly',
        directEditDesc: 'Saving overwrites the entire file with this content.',
        save: 'Save',
        cancel: 'Cancel',
        unset: 'Unset',
        unsetWithDefault: 'Unset (default: {{default}})',
        enabled: 'Enabled',
        disabled: 'Disabled',
        unknownValue: '{{value}} (saved value; not in current suggestions)',
        directEditValue: 'Edit the file directly',
        saveSuccess: 'Settings saved',
        saveError: 'Failed to save settings',
        readError: 'Failed to read settings',
        invalidToml: 'The TOML syntax is invalid',
        invalidExisting: 'The existing config.toml is broken and cannot be saved. Fix it via direct edit.',
        verifyFailed:
            'Verification of the edit result failed, so saving was aborted. The file is unchanged. Change this item via direct edit.',
        unavailable: 'The settings for this environment cannot be accessed.',
        group: {
            model: 'Model',
            security: 'Security & Behavior',
            memory: 'Memory',
            cli: 'Display & CLI',
            features: 'Features',
            extensions: 'Extensions & Compatibility',
            telemetry: 'Telemetry & Diagnostics',
        },
        field: {
            modelsDefault: {
                label: 'Default model (models.default)',
                desc: 'Model used for new sessions.',
            },
            modelsWebSearch: {
                label: 'Web search model (models.web_search)',
                desc: 'Model used by the web_search tool.',
            },
            modelsDefaultReasoningEffort: {
                label: 'Default reasoning effort (models.default_reasoning_effort)',
                desc: 'Reasoning effort for the default model.',
            },
            modelsSessionSummary: {
                label: 'Session summary model (models.session_summary)',
                desc: 'Model used for session titles and summaries.',
            },
            modelsImageDescription: {
                label: 'Image description model (models.image_description)',
                desc: 'Vision model that transcribes the images you supply.',
            },
            modelsPromptSuggestion: {
                label: 'Prompt suggestion model (models.prompt_suggestion)',
                desc: 'Model that generates the next-prompt ghost text.',
            },
            modelsAgentType: {
                label: 'Default agent type (models.agent_type)',
                desc: 'Agent definition type for models without their own agent_type.',
            },
            modelsTemperature: {
                label: 'Temperature (models.temperature)',
                desc: 'Default sampling temperature for all models (0-2).',
            },
            modelsTopP: {
                label: 'top_p (models.top_p)',
                desc: 'Default top_p for all models (0-1).',
            },
            modelsMaxCompletionTokens: {
                label: 'Max completion tokens (models.max_completion_tokens)',
                desc: 'Default maximum completion tokens for all models.',
            },
            modelsMaxRetries: {
                label: 'Inference retries (models.max_retries)',
                desc: 'Default number of inference retries for all models.',
            },
            modelsRateLimitRetryThreshold: {
                label: 'Rate-limit attempt ceiling (models.rate_limit_retry_threshold)',
                desc: 'Default ceiling on total attempts for rate-limited requests, capped by max_retries.',
            },
            modelsSubagentRateLimitMaxAttempts: {
                label: 'Subagent 429 wait attempts (models.subagent_rate_limit_max_attempts)',
                desc: 'Maximum subagent wait attempts on 429 responses (0-32). 0 turns the wait off.',
            },
            modelsInferenceIdleTimeoutSecs: {
                label: 'Inference idle timeout (models.inference_idle_timeout_secs)',
                desc: 'Default idle timeout for streaming inference, in seconds.',
            },
            modelsStreamToolCalls: {
                label: 'Stream tool calls (models.stream_tool_calls)',
                desc: 'Streams tool calls in requests for all models.',
            },
            agentName: {
                label: 'Agent definition name (agent.name)',
                desc: 'Built-in or discovered agent definition the session runs.',
            },
            agentDefinition: {
                label: 'Agent definition file (agent.definition)',
                desc: 'Path to an agent definition Markdown file with YAML frontmatter.',
            },
            agentSystemPromptLabel: {
                label: 'System prompt identity (agent.system_prompt_label)',
                desc: 'Identity label in the system prompt. A per-model label takes precedence.',
            },
            promptSuggestionsMaxOutputTokens: {
                label: 'Suggestion output tokens (prompt_suggestions.max_output_tokens)',
                desc: 'Visible output tokens for the prompt suggestion call (16-256).',
            },
            promptSuggestionsTemperature: {
                label: 'Suggestion temperature (prompt_suggestions.temperature)',
                desc: 'Sampling temperature for the prompt suggestion call.',
            },
            promptSuggestionsReasoningEffort: {
                label: 'Suggestion reasoning effort (prompt_suggestions.reasoning_effort)',
                desc: 'Reasoning effort for the prompt suggestion call. none turns reasoning off.',
            },
            longReasoningReminderEnabled: {
                label: 'Long-reasoning reminder (long_reasoning_reminder.enabled)',
                desc: 'Injects a mid-turn reminder to reason briefly after a model call with long hidden reasoning.',
            },
            longReasoningReminderTokens: {
                label: 'Long-reasoning threshold (long_reasoning_reminder.tokens)',
                desc: 'Reasoning tokens in one model call that count as long (100-200000).',
            },
            longReasoningReminderDelay: {
                label: 'Reminder delay (long_reasoning_reminder.delay)',
                desc: 'Model calls to wait after the long call before the reminder (0-10).',
            },
            modelsExtraHeaders: {
                label: 'Shared model headers (models.extra_headers)',
                desc: 'HTTP headers added to every model request. Per-model values take precedence.',
            },
            modelsAllowedModels: {
                label: 'Model allowlist (models.allowed_models)',
                desc: 'Glob patterns that limit the models in the picker, the default, and -m.',
            },
            modelsHiddenModels: {
                label: 'Hidden models (models.hidden_models)',
                desc: 'Model IDs hidden from the model picker.',
            },
            modelsDisabledModels: {
                label: 'Disabled models (models.disabled_models)',
                desc: 'Model IDs removed from the catalog. This takes precedence over hidden models.',
            },
            customModels: {
                label: 'Custom model definitions (model.<id>)',
                desc: 'Per-model overrides and BYOK definitions such as endpoint, credentials, and sampling.',
            },
            modelProviders: {
                label: 'Custom provider definitions (model_providers.<name>)',
                desc: 'Named providers referenced by model_provider in [model.<id>].',
            },
            sandboxProfile: {
                label: 'Sandbox profile (sandbox.profile)',
                desc: 'Filesystem sandbox profile: off, workspace, devbox, read-only, strict, or a custom name.',
            },
            sandboxAutoAllowBash: {
                label: 'Auto-allow bash (sandbox.auto_allow_bash)',
                desc: 'Skips bash permission prompts while a sandbox profile is active.',
            },
            toolsRespectGitignore: {
                label: 'Respect gitignore (tools.respect_gitignore)',
                desc: 'Makes search and read tools skip gitignored files.',
            },
            toolsDisableZdrIncompatibleTools: {
                label: 'Restrict ZDR-incompatible tools (tools.disable_zdr_incompatible_tools)',
                desc: 'Restricts tools that need xAI-hosted output, such as video, under Zero Data Retention (ZDR).',
            },
            toolsetFileToolset: {
                label: 'File editing scheme (toolset.file_toolset)',
                desc: 'File edit tool scheme: standard is regular editing and hashline uses line hashes.',
            },
            toolsetBashTimeoutSecs: {
                label: 'Bash timeout (toolset.bash.timeout_secs)',
                desc: 'Foreground bash command timeout in seconds.',
            },
            toolsetBashOutputByteLimit: {
                label: 'Bash output limit (toolset.bash.output_byte_limit)',
                desc: 'Maximum captured bash output in bytes.',
            },
            toolsetBashMaxTimeoutSecs: {
                label: 'Maximum bash timeout (toolset.bash.max_timeout_secs)',
                desc: 'Upper limit in seconds for foreground timeouts requested by the model.',
            },
            toolsetBashAutoBackground: {
                label: 'Background on timeout (toolset.bash.auto_background_on_timeout)',
                desc: 'Moves a bash command to the background when the foreground timeout fires.',
            },
            toolsetBashLoginShellCapture: {
                label: 'Capture login shell environment (toolset.bash.login_shell_capture)',
                desc: "Captures the user's login shell environment for bash.",
            },
            toolsetWebFetchProxyEndpoint: {
                label: 'Web fetch proxy (toolset.web_fetch.proxy_endpoint)',
                desc: 'Egress proxy URL for web_fetch.',
            },
            toolsetWebFetchAllowLocal: {
                label: 'Allow local fetch (toolset.web_fetch.allow_local)',
                desc: 'Adds explicit loopback hosts (localhost, 127.0.0.0/8, ::1) to web_fetch targets.',
            },
            toolsetAskUserQuestionTimeoutEnabled: {
                label: 'Question timeout (toolset.ask_user_question.timeout_enabled)',
                desc: 'Applies a timeout to ask_user_question. Off waits for answers indefinitely.',
            },
            toolsetAskUserQuestionTimeoutSecs: {
                label: 'Question timeout seconds (toolset.ask_user_question.timeout_secs)',
                desc: 'Seconds ask_user_question waits for an answer.',
            },
            toolsMediaGenMaxParallelImageGenCalls: {
                label: 'Parallel image generation calls (tools.media_gen.max_parallel_image_gen_calls)',
                desc: 'Maximum image_gen and image_edit calls in one model step.',
            },
            toolsMediaGenMaxParallelVideoGenCalls: {
                label: 'Parallel video generation calls (tools.media_gen.max_parallel_video_gen_calls)',
                desc: 'Maximum video_gen calls in one model step.',
            },
            disableWebSearch: {
                label: 'Remove web search tool (disable_web_search)',
                desc: 'Removes the web_search tool.',
            },
            sessionAutoCompactThreshold: {
                label: 'Auto-compact threshold (session.auto_compact_threshold_percent)',
                desc: 'Context usage percentage that triggers auto-compaction (0-100).',
            },
            sessionLoadEnvrc: {
                label: 'Load .envrc (session.load_envrc)',
                desc: 'Injects .envrc variables into bash.',
            },
            storageCleanupTtlDays: {
                label: 'Session cleanup days (storage.cleanup_ttl_days)',
                desc: 'Deletes session folders idle for this many days and prunes older media and terminal logs. 0 turns cleanup off.',
            },
            autoModeEnabled: {
                label: 'Auto permission mode (auto_mode.enabled)',
                desc: 'Enables the Auto permission mode, which decides tool approvals automatically.',
            },
            defaultAutoMode: {
                label: 'Start in Auto mode (default_auto_mode)',
                desc: 'Starts sessions in Auto permission mode.',
            },
            doomLoopRecoveryEnabled: {
                label: 'Tool-call loop recovery (doom_loop_recovery.enabled)',
                desc: 'Resamples when a tool-call loop is detected.',
            },
            pathNotFoundHints: {
                label: 'Path-not-found hints (path_not_found_hints)',
                desc: 'Adds working-directory reminders and similar-name suggestions to path-not-found errors.',
            },
            harnessDisableWorkspaceTeleport: {
                label: 'Stop per-turn snapshots (harness.disable_workspace_teleport)',
                desc: 'Stops the workspace snapshot taken on each turn.',
            },
            subagentsEnabled: {
                label: 'Subagents (subagents.enabled)',
                desc: 'Master switch for subagents and the task tool.',
            },
            subagentsLimitBehavior: {
                label: 'Behavior at concurrency cap (subagents.limit_behavior)',
                desc: 'Action at the concurrent subagent cap: queue waits and fail returns an error.',
            },
            subagentsMaxConcurrent: {
                label: 'Concurrent subagents (subagents.max_concurrent)',
                desc: 'Maximum subagents running at the same time.',
            },
            subagentsMaxDepth: {
                label: 'Subagent nesting depth (subagents.max_depth)',
                desc: 'Maximum nesting depth of subagents.',
            },
            subagentsSamplingLimit: {
                label: 'Subagent sampling limit (subagents.sampling_limit)',
                desc: 'Concurrent subagent sampling calls per process.',
            },
            mcpMaxOutputBytes: {
                label: 'MCP output size cap (mcp.max_output_bytes)',
                desc: 'Maximum MCP tool output size in bytes.',
            },
            shellEnvPolicyInherit: {
                label: 'Inherited environment (shell_environment_policy.inherit)',
                desc: 'Parent variables bash inherits: all keeps everything, core keeps a small set such as PATH and HOME, and none starts empty.',
            },
            shellEnvPolicyIgnoreDefaultExcludes: {
                label: 'Ignore default excludes (shell_environment_policy.ignore_default_excludes)',
                desc: 'Skips the built-in filter for names matching *KEY*, *SECRET*, and *TOKEN*.',
            },
            toolsetWebFetchAllowedDomains: {
                label: 'Web fetch allowed domains (toolset.web_fetch.allowed_domains)',
                desc: 'Domains web_fetch reaches, replacing the built-in allowlist.',
            },
            toolsetWebSearchAllowedDomains: {
                label: 'Web search allowed domains (toolset.web_search.allowed_domains)',
                desc: 'Domains web_search searches.',
            },
            toolsetWebSearchExcludedDomains: {
                label: 'Web search excluded domains (toolset.web_search.excluded_domains)',
                desc: 'Domains excluded from web_search.',
            },
            toolsZdrVideoOutputS3: {
                label: 'ZDR video output bucket (tools.zdr_video_output_s3)',
                desc: 'S3-compatible bucket and credentials that store generated videos under ZDR.',
            },
            mcpServers: {
                label: 'MCP server definitions (mcp_servers.<name>)',
                desc: 'Stdio or HTTP connection, environment variables, headers, and timeouts for each MCP server.',
            },
            disabledMcpServers: {
                label: 'Disabled MCP servers (disabled_mcp_servers)',
                desc: 'MCP server names to skip while keeping their [mcp_servers] blocks.',
            },
            disabledMcpTools: {
                label: 'Disabled MCP tools (disabled_mcp_tools)',
                desc: 'Tool names to deny, listed per MCP server.',
            },
            permission: {
                label: 'Permission rules (permission)',
                desc: 'Tool allow, ask, and deny rules plus detailed rules. Deny beats ask, and ask beats allow.',
            },
            hooks: {
                label: 'Hook definitions (hooks.<event>)',
                desc: 'Matchers and commands run for lifecycle events such as PreToolUse and Stop.',
            },
            shellEnvPolicyExclude: {
                label: 'Excluded variables (shell_environment_policy.exclude)',
                desc: 'Environment variable names dropped from bash.',
            },
            shellEnvPolicyIncludeOnly: {
                label: 'Allowed variables (shell_environment_policy.include_only)',
                desc: 'Limits the environment variables bash inherits to these names.',
            },
            shellEnvPolicySet: {
                label: 'Forced variables (shell_environment_policy.set)',
                desc: 'Environment variable values injected into bash.',
            },
            subagentsToggle: {
                label: 'Per-subagent states (subagents.toggle)',
                desc: 'Enabled state of each subagent type.',
            },
            subagentsModels: {
                label: 'Subagent models (subagents.models)',
                desc: 'Model ID used by each subagent type.',
            },
            subagentsRoles: {
                label: 'Subagent roles (subagents.roles)',
                desc: 'Custom roles with their own capability and model defaults.',
            },
            subagentsPersonas: {
                label: 'Subagent personas (subagents.personas)',
                desc: 'Custom personas that add behavioral instructions such as tone and focus.',
            },
            memoryEnabled: {
                label: 'Cross-session memory (memory.enabled)',
                desc: 'Master switch for cross-session memory.',
            },
            memoryV2Enabled: {
                label: 'Memory v2 (memory_v2.enabled)',
                desc: 'Primary switch for memory v2. On takes precedence over memory.enabled.',
            },
            memoryV2BatchDreamEnabled: {
                label: 'Batch Dream (memory_v2.batch_dream_enabled)',
                desc: 'Runs memory Dream in batches, folding notes into topics with the full topic catalog.',
            },
            memoryV2BatchDreamMaxRunSecs: {
                label: 'Batch Dream max run time (memory_v2.batch_dream_max_run_secs)',
                desc: 'Maximum seconds for one batch Dream run (60-3600).',
            },
            memoryV2BatchDreamMaxCallsPerBatch: {
                label: 'Model calls per batch (memory_v2.batch_dream_max_calls_per_batch)',
                desc: 'Maximum model calls in one batch Dream batch (2-16).',
            },
            memoryV2BatchDreamMaxBatchNoteBytes: {
                label: 'Note bytes per batch (memory_v2.batch_dream_max_batch_note_bytes)',
                desc: 'Maximum note bytes in one batch Dream batch (16384-262144).',
            },
            memoryV2ArchivedRetentionDays: {
                label: 'Archive retention days (memory_v2.archived_retention_days)',
                desc: 'Days to keep archived memory observation files.',
            },
            memoryV2JobRetentionDays: {
                label: 'Capture job retention days (memory_v2.job_retention_days)',
                desc: 'Days to keep finished memory capture-job metadata.',
            },
            cliAutoUpdate: {
                label: 'Auto update (cli.auto_update)',
                desc: 'Checks for CLI updates on launch.',
            },
            cliChannel: {
                label: 'Release channel (cli.channel)',
                desc: 'Release channel: stable, alpha, or enterprise.',
            },
            cliShowTips: {
                label: 'Startup tips (cli.show_tips)',
                desc: 'Shows tips at startup.',
            },
            cliUseLeader: {
                label: 'Use leader process (cli.use_leader)',
                desc: 'Uses the leader process for config reload and MCP watches.',
            },
            cliNpmRegistry: {
                label: 'npm registry (cli.npm_registry)',
                desc: 'npm registry used by the auto-updater.',
            },
            cliMinimumVersion: {
                label: 'Update floor version (cli.minimum_version)',
                desc: 'Lowest version the updater installs.',
            },
            cliMaximumVersion: {
                label: 'Update ceiling version (cli.maximum_version)',
                desc: 'Highest version the updater installs.',
            },
            cliRequiredMinimumVersion: {
                label: 'Required floor version (cli.required_minimum_version)',
                desc: 'Lowest version allowed to start.',
            },
            cliRequiredMaximumVersion: {
                label: 'Required ceiling version (cli.required_maximum_version)',
                desc: 'Highest version allowed to start.',
            },
            cliWorktreeType: {
                label: 'Worktree creation mode (cli.worktree_type)',
                desc: 'How worktrees are created: linked, standalone, or git.',
            },
            cliSessionPickerGrouped: {
                label: 'Group sessions by repository (cli.session_picker_grouped)',
                desc: 'Groups sessions by repository in the picker and CLI listings.',
            },
            cliSessionRegistry: {
                label: 'Join session registry (cli.session_registry)',
                desc: 'Joins the cross-process session registry.',
            },
            hintsNewSessionWorktreeMode: {
                label: '/new worktree prompt (hints.new_session_worktree_mode)',
                desc: 'Worktree handling for /new: ask shows a prompt, always creates one, and never skips it.',
            },
            hintsForkWorktreeMode: {
                label: '/fork worktree prompt (hints.fork_worktree_mode)',
                desc: 'Worktree handling for /fork: ask shows a prompt, always creates one, and never skips it.',
            },
            hintsMemoryModalFullscreen: {
                label: 'Memory modal fullscreen (hints.memory_modal_fullscreen)',
                desc: 'Remembers whether the memory modal last opened fullscreen.',
            },
            dashboardEnabled: {
                label: 'Agent dashboard (dashboard.enabled)',
                desc: 'Enables the agent dashboard.',
            },
            dashboardGrouping: {
                label: 'Dashboard grouping (dashboard.grouping)',
                desc: 'Groups dashboard rows by state or directory.',
            },
            uiCompactMode: {
                label: 'Compact mode (ui.compact_mode)',
                desc: 'Uses denser message padding.',
            },
            uiScreenMode: {
                label: 'Default screen mode (ui.screen_mode)',
                desc: 'Render mode for grok: fullscreen is the standard TUI and minimal is scrollback-native.',
            },
            uiTimestamps: {
                label: 'Timestamps (ui.timestamps)',
                desc: 'Clock time on messages: off hides it, minimal shows it on prompts and Worked for lines, and on shows it everywhere.',
            },
            uiShowTimeline: {
                label: 'Timeline sidebar (ui.show_timeline)',
                desc: 'Shows a per-turn tick rail instead of the scrollbar.',
            },
            uiToolCallDensity: {
                label: 'Tool call density (ui.tool_call_density)',
                desc: 'How much of each tool call shows: detailed shows edit diffs and shell output, and the compact levels fold more into summary rows.',
            },
            uiTheme: {
                label: 'Theme (ui.theme)',
                desc: 'Color theme name. auto follows the OS light or dark appearance.',
            },
            uiAutoDarkTheme: {
                label: 'Auto dark theme (ui.auto_dark_theme)',
                desc: 'Theme used for a dark OS appearance under the auto theme.',
            },
            uiAutoLightTheme: {
                label: 'Auto light theme (ui.auto_light_theme)',
                desc: 'Theme used for a light OS appearance under the auto theme.',
            },
            uiRenderMermaid: {
                label: 'Render Mermaid (ui.render_mermaid)',
                desc: 'How Mermaid diagrams show: auto and on add a clickable open row, and off shows the raw source.',
            },
            uiRememberToolApprovals: {
                label: 'Remember tool approvals (ui.remember_tool_approvals)',
                desc: 'Shows per-tool Always allow options on approval prompts.',
            },
            uiShowThinkingBlocks: {
                label: 'Show thinking blocks (ui.show_thinking_blocks)',
                desc: 'Shows thinking and reasoning blocks while streaming.',
            },
            uiPromptSuggestions: {
                label: 'Prompt suggestions (ui.prompt_suggestions)',
                desc: 'Shows next-prompt ghost text after each turn.',
            },
            uiScrollSpeed: {
                label: 'Scroll speed (ui.scroll_speed)',
                desc: 'Mouse and trackpad scroll speed multiplier (1-100).',
            },
            uiScrollMode: {
                label: 'Scroll input (ui.scroll_mode)',
                desc: 'Scroll input type: auto detects it, and wheel or trackpad fixes it.',
            },
            uiScrollLines: {
                label: 'Scroll lines (ui.scroll_lines)',
                desc: 'Lines per scroll tick for wheel and trackpad (1-10).',
            },
            uiInvertScroll: {
                label: 'Invert scroll (ui.invert_scroll)',
                desc: 'Reverses the vertical scroll direction.',
            },
            uiKeepTextSelection: {
                label: 'Text selection (ui.keep_text_selection)',
                desc: 'In-app selection: flash highlights briefly, hold keeps it, and word_select selects a word on double-click and a paragraph on triple-click.',
            },
            uiMaxThoughtsWidth: {
                label: 'Max thoughts width (ui.max_thoughts_width)',
                desc: 'Column width of the thoughts panel (40-500).',
            },
            uiForkSecondaryModel: {
                label: 'Fork secondary model (ui.fork_secondary_model)',
                desc: 'Model for the secondary agent when forking.',
            },
            uiYolo: {
                label: 'YOLO mode (ui.yolo)',
                desc: 'Always approves tool calls.',
            },
            uiPermissionMode: {
                label: 'Permission mode (ui.permission_mode)',
                desc: 'Default tool permission behavior: default and ask prompt, auto uses a classifier, and always-approve skips prompts.',
            },
            uiDefaultSelectedPermission: {
                label: 'Default selected permission (ui.default_selected_permission)',
                desc: 'Row preselected on the first approval prompt.',
            },
            uiPageFlipOnSend: {
                label: 'Snap prompt to top on send (ui.page_flip_on_send)',
                desc: 'Snaps the sent prompt to the top of the viewport.',
            },
            uiConfirmBeforeRewind: {
                label: 'Confirm before rewind (ui.confirm_before_rewind)',
                desc: 'Asks before rewinding conversation history.',
            },
            uiDashboardPreview: {
                label: 'Dashboard preview (ui.dashboard_preview)',
                desc: "Shows the selected session's preview and reply panel on the dashboard.",
            },
            uiFollowUpBehavior: {
                label: 'Mid-turn follow-ups (ui.follow_up_behavior)',
                desc: 'Follow-ups sent during a turn: queue waits for the turn end, and steer injects them at the next safe point.',
            },
            keysVim: {
                label: 'Vim navigation (keys.vim)',
                desc: 'Vim keys for navigating the scrollback. off turns them off and nav turns them on. /vim-mode also switches this.',
            },
            uiHunkTrackerMode: {
                label: 'Hunk tracker (ui.hunk_tracker_mode)',
                desc: 'File-change hunk tracking: agent_only tracks agent edits, all_dirty tracks every git-dirty file, and off turns tracking off.',
            },
            uiVoiceCaptureMode: {
                label: 'Voice capture (ui.voice_capture_mode)',
                desc: 'Voice capture style: hold records while held, and toggle starts and stops on each press.',
            },
            uiVoiceKeybindEnabled: {
                label: 'Voice shortcut (ui.voice_keybind_enabled)',
                desc: 'Enables the Ctrl+Space / F8 shortcut for voice dictation.',
            },
            uiVoiceSttLanguage: {
                label: 'Voice language (ui.voice_stt_language)',
                desc: 'Speech-to-text language code or auto. This takes precedence over voice.language.',
            },
            uiMouseReportingToggle: {
                label: 'Mouse reporting toggle (ui.mouse_reporting_toggle)',
                desc: 'Makes Ctrl+R in the scrollback toggle terminal mouse capture.',
            },
            uiCancelSubagentsOnTurnCancel: {
                label: 'Subagents on turn cancel (ui.cancel_subagents_on_turn_cancel)',
                desc: 'Running subagents when a turn is cancelled: ask shows a prompt, always_stop stops them, and always_continue keeps them running.',
            },
            uiCursorBlink: {
                label: 'Cursor blink (ui.cursor_blink)',
                desc: 'Block cursor style: on blinks, off is steady, and unset follows the terminal.',
            },
            uiCombineQueuedPrompts: {
                label: 'Combine queued prompts (ui.combine_queued_prompts)',
                desc: 'Merges consecutive plain follow-ups into one turn.',
            },
            uiStatusLineType: {
                label: 'Status line type (ui.status_line.type)',
                desc: 'Status line mode: builtin shows values Grok renders, command shows script output, and disabled shows nothing.',
            },
            uiStatusLineItems: {
                label: 'Status line items (ui.status_line.items)',
                desc: 'Built-in items in display order: cwd, model, context, cost, turn-timer, and session-name.',
            },
            uiStatusLineCommand: {
                label: 'Status line command (ui.status_line.command)',
                desc: 'Script path or inline shell command whose output the command mode shows.',
            },
            uiStatusLinePadding: {
                label: 'Status line padding (ui.status_line.padding)',
                desc: 'Horizontal spacing per side in characters (up to 16).',
            },
            uiStatusLineRefreshInterval: {
                label: 'Status line refresh interval (ui.status_line.refresh_interval)',
                desc: 'Seconds between timed runs of the command mode script (1-86400).',
            },
            voiceLanguage: {
                label: 'Speech-to-text language (voice.language)',
                desc: 'Preferred speech-to-text language code or auto.',
            },
            voiceApiBase: {
                label: 'Speech-to-text API (voice.api_base)',
                desc: 'HTTPS API root for speech-to-text.',
            },
            voiceSampleRate: {
                label: 'Voice sample rate (voice.sample_rate)',
                desc: 'Speech-to-text capture rate in Hz.',
            },
            uiContextualHints: {
                label: 'Contextual hints (ui.contextual_hints)',
                desc: 'Whether each tip shows, such as undo, plan_mode, and image_input.',
            },
            uiDisplayRefresh: {
                label: 'Display refresh (ui.display_refresh)',
                desc: 'Matches stream and scroll cadence to the display refresh rate.',
            },
            uiNotifications: {
                label: 'Terminal notifications (ui.notifications)',
                desc: 'Method, condition, events, and hooks for terminal notifications.',
            },
            cliGrove: {
                label: 'Enable Grove everywhere (cli.grove)',
                desc: 'Turns Grove on for both grok clone and session worktrees. The value is a boolean or a Grove type name.',
            },
            cliGroveWorktree: {
                label: 'Worktree Grove (cli.grove_worktree)',
                desc: 'How session worktrees are made, Grove or copy. The value is a boolean or a Grove type name.',
            },
            worktreeAutoGc: {
                label: 'Worktree auto cleanup (worktree.auto_gc)',
                desc: 'Automatic garbage collection policy for worktrees.',
            },
            versionOverrides: {
                label: 'Per-version settings (version_overrides)',
                desc: 'Setting patches applied per CLI version.',
            },
            featuresWebFetch: {
                label: 'web_fetch (features.web_fetch)',
                desc: 'Enables the web_fetch tool.',
            },
            featuresRemoteFetch: {
                label: 'Remote fetch (features.remote_fetch)',
                desc: 'Fetches the model catalog and assets online.',
            },
            featuresLspTools: {
                label: 'LSP tools (features.lsp_tools)',
                desc: 'Exposes the LSP code-intelligence tool to the model.',
            },
            featuresWriteFile: {
                label: 'Write tool (features.write_file)',
                desc: 'Enables the write tool.',
            },
            featuresAskUserQuestion: {
                label: 'Question tool (features.ask_user_question)',
                desc: 'Enables the ask_user_question tool, which asks you questions.',
            },
            featuresBackendTools: {
                label: 'Server-side search (features.backend_tools)',
                desc: 'Runs web_search and x_search on the server.',
            },
            featuresImageGen: {
                label: 'Image generation (features.image_gen)',
                desc: 'Enables image_gen and /imagine.',
            },
            featuresImageGenModelOverride: {
                label: 'Image generation model (features.image_gen_model_override)',
                desc: 'Imagine model ID for image_gen.',
            },
            featuresImageEditModelOverride: {
                label: 'Image editing model (features.image_edit_model_override)',
                desc: 'Imagine model ID for image_edit.',
            },
            featuresVideoGen: {
                label: 'Video generation (features.video_gen)',
                desc: 'Enables the video tools and /imagine-video.',
            },
            featuresVoiceMode: {
                label: 'Voice input (features.voice_mode)',
                desc: 'Enables voice dictation (speech to text).',
            },
            featuresTelemetry: {
                label: 'Telemetry (features.telemetry)',
                desc: 'Product analytics mode: enabled sends everything, session_metrics sends session metrics only, and disabled or off sends nothing.',
                choice: {
                    enabled: 'Enabled (true)',
                    sessionMetrics: 'Session metrics only (session_metrics)',
                    disabled: 'Disabled (false)',
                    off: 'Off (off)',
                },
            },
            featuresFeedback: {
                label: 'Feedback (features.feedback)',
                desc: 'Enables feedback popups and the /feedback command.',
            },
            featuresFeedbackTraceCard: {
                label: 'Trace consent on feedback (features.feedback_trace_card)',
                desc: 'Asks for trace-upload consent after /feedback.',
            },
            featuresTwoPassCompaction: {
                label: 'Two-pass compaction (features.two_pass_compaction)',
                desc: 'Summarizes the earlier part of a long conversation in the background before compaction.',
            },
            featuresCompactionMode: {
                label: 'Compaction mode (features.compaction_mode)',
                desc: 'Compaction strategy: summary, transcript, or segments.',
            },
            featuresCompactionDetail: {
                label: 'Compaction detail (features.compaction_detail)',
                desc: 'Verbatim detail level for segments compaction: none, minimal, balanced, or verbose.',
            },
            featuresCompactionToolChoice: {
                label: 'Compaction tool choice (features.compaction_tool_choice)',
                desc: 'Tool-choice hint used during compaction.',
            },
            featuresCompactionVerbatimInput: {
                label: 'Summarize verbatim input (features.compaction_verbatim_input)',
                desc: 'Summarizes the verbatim conversation rather than a shortened copy.',
            },
            featuresSessionRecap: {
                label: 'Session recap (features.session_recap)',
                desc: 'Enables /recap and the automatic recap when you return.',
            },
            featuresSessionSearch: {
                label: 'Session search (features.session_search)',
                desc: 'Enables the SQLite session-search index.',
            },
            featuresTurnSummary: {
                label: 'Turn summary (features.turn_summary)',
                desc: 'Shows a per-turn summary on the agent dashboard.',
            },
            featuresTitleRefresh: {
                label: 'Title refresh (features.title_refresh)',
                desc: 'Refreshes the session title automatically early in the session.',
            },
            featuresCancelRewind: {
                label: 'Restore prompt on cancel (features.cancel_rewind)',
                desc: "Restores the prompt on Ctrl+C before a turn's first activity.",
            },
            featuresAutoWake: {
                label: 'Auto wake (features.auto_wake)',
                desc: 'Continues the conversation as soon as a background task or subagent finishes.',
            },
            featuresActiveAgentMessages: {
                label: 'Messages to running agents (features.active_agent_messages)',
                desc: 'Sends model-authored follow-ups to a running descendant agent.',
            },
            featuresSubagentModelInheritance: {
                label: 'Subagent model inheritance (features.subagent_model_inheritance)',
                desc: "Hides the subagent model argument when every selectable model is from xAI, so subagents inherit the parent's model.",
            },
            featuresSubagentWorktreeSnapshot: {
                label: 'Save subagent work (features.subagent_worktree_snapshot)',
                desc: "Saves a finished subagent's working copy to the repository as a git ref and restores it on resume.",
            },
            featuresWorktreeInheritsMainApprovals: {
                label: 'Worktree approval inheritance (features.worktree_inherits_main_approvals)',
                desc: "Reuses the main checkout's saved always-allow answers in git worktrees.",
            },
            featuresSupportPermission: {
                label: 'Permission requests (features.support_permission)',
                desc: 'Makes the agent ask permission for tool executions.',
            },
            featuresRememberMode: {
                label: 'Remember permission mode (features.remember_mode)',
                desc: 'Remembers the last permission mode across sessions.',
            },
            featuresNonGitWarning: {
                label: 'Non-Git warning (features.non_git_warning)',
                desc: 'Shows a blocking warning when Grok starts outside a Git repository.',
            },
            featuresMcpAutoRestart: {
                label: 'MCP auto restart (features.mcp_auto_restart)',
                desc: 'Restarts stdio MCP servers automatically after a transport failure.',
            },
            featuresMcpLivenessWatchers: {
                label: 'MCP liveness watchers (features.mcp_liveness_watchers)',
                desc: 'Polls MCP transports and pushes server status updates.',
            },
            featuresMcpPushServerStatus: {
                label: 'MCP status push (features.mcp_push_server_status)',
                desc: 'Subscribes the TUI to MCP server status pushes.',
            },
            featuresMcpRecursiveConfigWatch: {
                label: 'Project MCP config watch (features.mcp_recursive_config_watch)',
                desc: 'Watches the working directory and its .grok folder for project MCP config edits.',
            },
            featuresDock: {
                label: 'Panel dock (features.dock)',
                desc: 'Shows a consolidated panel of subagents, tasks, watchers, and queued prompts above the prompt.',
            },
            featuresTerminalTheme: {
                label: 'Terminal theme (features.terminal_theme)',
                desc: "Reveals the terminal color theme, which uses the terminal's own colors.",
            },
            featuresFileAcceleration: {
                label: 'File accelerator (features.file_acceleration)',
                desc: "Hands local sessions' file systems to an installed file accelerator.",
            },
            fileAccelerationRoutes: {
                label: 'File accelerator routes (file_acceleration.routes)',
                desc: 'Route override passed as is to the installed file accelerator.',
            },
            featuresCampaigns: {
                label: 'Apply campaigns (features.campaigns)',
                desc: 'Applies remotely published campaign setting patches.',
            },
            featuresZdrAccessEnabled: {
                label: 'ZDR tool access (features.zdr_access_enabled)',
                desc: 'Advertises ZDR-incompatible tools to teams under Zero Data Retention (ZDR).',
            },
            workflowsEnabled: {
                label: 'Workflows (workflows.enabled)',
                desc: 'Enables background workflows such as the workflow tool and /deep-research.',
            },
            goalEnabled: {
                label: '/goal (goal.enabled)',
                desc: 'Enables the /goal command.',
            },
            relayEnabled: {
                label: 'Session relay sync (relay.enabled)',
                desc: 'Enables session relay synchronization.',
            },
            featuresCodebaseIndexing: {
                label: 'Codebase indexing (features.codebase_indexing)',
                desc: 'Code graph indexing: true indexes Git repositories, and an array of include and exclude globs sets the scope.',
            },
            compatCursorSkills: {
                label: 'Discover Cursor skills (compat.cursor.skills)',
                desc: 'Scans Cursor skill directories.',
            },
            compatCursorRules: {
                label: 'Discover Cursor rules (compat.cursor.rules)',
                desc: 'Scans .cursor/rules.',
            },
            compatCursorAgents: {
                label: 'Discover Cursor agents (compat.cursor.agents)',
                desc: 'Scans agent definitions from Cursor.',
            },
            compatCursorMcps: {
                label: 'Discover Cursor MCPs (compat.cursor.mcps)',
                desc: 'Scans Cursor mcp.json.',
            },
            compatCursorHooks: {
                label: 'Discover Cursor hooks (compat.cursor.hooks)',
                desc: 'Scans Cursor hooks.',
            },
            compatClaudeSkills: {
                label: 'Discover Claude skills (compat.claude.skills)',
                desc: 'Scans Claude skills.',
            },
            compatClaudeRules: {
                label: 'Discover Claude rules (compat.claude.rules)',
                desc: 'Scans Claude rules.',
            },
            compatClaudeAgents: {
                label: 'Discover Claude agents (compat.claude.agents)',
                desc: 'Scans CLAUDE.md and CLAUDE.local.md.',
            },
            compatClaudeMcps: {
                label: 'Discover Claude MCPs (compat.claude.mcps)',
                desc: 'Scans Claude MCP config.',
            },
            compatClaudeHooks: {
                label: 'Discover Claude hooks (compat.claude.hooks)',
                desc: 'Scans Claude hooks.',
            },
            compatCodexSkills: {
                label: 'Discover Codex skills (compat.codex.skills)',
                desc: 'Scans Codex skill directories.',
            },
            compatCodexHooks: {
                label: 'Discover Codex hooks (compat.codex.hooks)',
                desc: 'Scans Codex hooks.',
            },
            marketplaceRequireSha: {
                label: 'Require pinned commit SHA (marketplace.require_sha)',
                desc: 'Requires remote plugin installs and updates to pin a full commit SHA.',
            },
            cursorWorkerAutoStart: {
                label: 'Start Cursor worker (cursor_worker.auto_start)',
                desc: 'Registers the leader as a Cursor private worker when it starts.',
            },
            cursorWorkerName: {
                label: 'Cursor worker name (cursor_worker.name)',
                desc: 'Worker name shown in Cursor. Unset uses the hostname.',
            },
            cursorWorkerMaxAgents: {
                label: 'Cursor worker concurrency (cursor_worker.max_agents)',
                desc: 'Maximum Cloud Agents claimed at once. Unset means no cap.',
            },
            cursorWorkerAnyRepo: {
                label: 'Accept any repository (cursor_worker.any_repo)',
                desc: 'Also registers an entry point that clones the repository a Cloud Agent brings.',
            },
            cursorWorkerHubUrl: {
                label: 'Computer Hub URL (cursor_worker.hub_url)',
                desc: "Hub base URL for the worker session. Unset derives it from the leader's hub URL.",
            },
            cursorWorkerRewriteShellOutput: {
                label: 'Rewrite shell output paths (cursor_worker.rewrite_shell_output)',
                desc: 'Rewrites worktree and snapshot paths in shell output back to the registered directory.',
            },
            skillsPaths: {
                label: 'Additional skill paths (skills.paths)',
                desc: 'Additional skill directories.',
            },
            skillsDisabled: {
                label: 'Disabled skills (skills.disabled)',
                desc: 'Skill names to discover and keep inactive.',
            },
            skillsIgnore: {
                label: 'Scan-ignore paths (skills.ignore)',
                desc: 'Paths excluded from skill discovery.',
            },
            pathsExtraRuleDirs: {
                label: 'Extra rule directories (paths.extra_rule_dirs)',
                desc: 'Rule directories, each holding *.md files, loaded after the home rules.',
            },
            pluginsPaths: {
                label: 'Additional plugin paths (plugins.paths)',
                desc: 'Additional plugin directories.',
            },
            pluginsDisabled: {
                label: 'Disabled plugins (plugins.disabled)',
                desc: 'Plugin IDs to discover and leave unloaded.',
            },
            pluginsEnabled: {
                label: 'Enabled plugins (plugins.enabled)',
                desc: 'Plugin IDs to enable, including project plugins that default to off.',
            },
            marketplaceSources: {
                label: 'Marketplace sources (marketplace.sources)',
                desc: 'Git repositories or local directories registered as plugin marketplaces.',
            },
            cursorWorkerWorkerDirs: {
                label: 'Cursor worker directories (cursor_worker.worker_dirs)',
                desc: 'Absolute repository directories offered to Cloud Agents. The first one is the registered working directory.',
            },
            telemetryTraceUpload: {
                label: 'Trace upload (telemetry.trace_upload)',
                desc: 'Uploads session traces.',
            },
            telemetryMixpanelEnabled: {
                label: 'Mixpanel analytics (telemetry.mixpanel_enabled)',
                desc: 'Sends product analytics to Mixpanel.',
            },
            telemetryEventsUrl: {
                label: 'Event collector URL (telemetry.events_url)',
                desc: 'URL of your own collector for telemetry events.',
            },
            telemetryEventsApiKey: {
                label: 'Event collector token (telemetry.events_api_key)',
                desc: 'Token for your own collector.',
            },
            telemetryOtelEnabled: {
                label: 'External OTEL stream (telemetry.otel_enabled)',
                desc: 'Master switch for the external OpenTelemetry stream to your own collector.',
            },
            telemetryOtelEndpoint: {
                label: 'OTLP endpoint (telemetry.otel_endpoint)',
                desc: 'Base OTLP endpoint for the external OpenTelemetry stream.',
            },
            telemetryOtelLogsEndpoint: {
                label: 'OTLP logs endpoint (telemetry.otel_logs_endpoint)',
                desc: 'OTLP endpoint for logs, used verbatim.',
            },
            telemetryOtelMetricsEndpoint: {
                label: 'OTLP metrics endpoint (telemetry.otel_metrics_endpoint)',
                desc: 'OTLP endpoint for metrics, used verbatim.',
            },
            telemetryOtelProtocol: {
                label: 'OTLP protocol (telemetry.otel_protocol)',
                desc: 'OTLP transport: http/protobuf or grpc.',
            },
            telemetryOtelLogsProtocol: {
                label: 'OTLP logs protocol (telemetry.otel_logs_protocol)',
                desc: 'OTLP transport for logs.',
            },
            telemetryOtelMetricsProtocol: {
                label: 'OTLP metrics protocol (telemetry.otel_metrics_protocol)',
                desc: 'OTLP transport for metrics.',
            },
            telemetryOtelMetricsExporter: {
                label: 'OTEL metrics exporter (telemetry.otel_metrics_exporter)',
                desc: 'Metrics destination: otlp sends to the collector, console prints them, and none turns them off.',
            },
            telemetryOtelLogsExporter: {
                label: 'OTEL logs exporter (telemetry.otel_logs_exporter)',
                desc: 'Logs destination: otlp sends to the collector, console prints them, and none turns them off.',
            },
            telemetryOtelTimeout: {
                label: 'OTLP export timeout (telemetry.otel_timeout)',
                desc: 'Export timeout in milliseconds.',
            },
            telemetryOtelMetricExportInterval: {
                label: 'Metric export interval (telemetry.otel_metric_export_interval)',
                desc: 'Metric export interval in milliseconds.',
            },
            telemetryOtelMetricsIncludeSessionId: {
                label: 'Session ID on metrics (telemetry.otel_metrics_include_session_id)',
                desc: 'Attaches session.id to metrics.',
            },
            telemetryOtelLogUserPrompts: {
                label: 'Send prompt text (telemetry.otel_log_user_prompts)',
                desc: 'Includes prompt text in the external OpenTelemetry stream.',
            },
            telemetryOtelLogAssistantResponses: {
                label: 'Send response text (telemetry.otel_log_assistant_responses)',
                desc: 'Includes assistant response text in the external OpenTelemetry stream. Unset follows the prompt text setting.',
            },
            telemetryOtelLogToolDetails: {
                label: 'Send tool details (telemetry.otel_log_tool_details)',
                desc: 'Includes tool argument previews, paths, and verbatim names in the external OpenTelemetry stream.',
            },
            telemetryOtelLogToolContent: {
                label: 'Send tool input and output (telemetry.otel_log_tool_content)',
                desc: 'Includes tool input, tool output, full commands, and error messages in the external OpenTelemetry stream.',
            },
            telemetryOtelCertificate: {
                label: 'OTLP CA certificate (telemetry.otel_certificate)',
                desc: 'Path to extra CA certificates (PEM) that verify the collector.',
            },
            telemetryOtelLogsCertificate: {
                label: 'OTLP logs CA certificate (telemetry.otel_logs_certificate)',
                desc: 'Path to the CA certificate (PEM) that verifies the logs endpoint.',
            },
            telemetryOtelMetricsCertificate: {
                label: 'OTLP metrics CA certificate (telemetry.otel_metrics_certificate)',
                desc: 'Path to the CA certificate (PEM) that verifies the metrics endpoint.',
            },
            telemetryOtelClientCertificate: {
                label: 'OTLP client certificate (telemetry.otel_client_certificate)',
                desc: 'Path to the mTLS client certificate (PEM).',
            },
            telemetryOtelClientKey: {
                label: 'OTLP client key (telemetry.otel_client_key)',
                desc: 'Path to the mTLS client private key (PEM).',
            },
            telemetryOtelLogsClientCertificate: {
                label: 'OTLP logs client certificate (telemetry.otel_logs_client_certificate)',
                desc: 'Path to the mTLS client certificate (PEM) for logs.',
            },
            telemetryOtelLogsClientKey: {
                label: 'OTLP logs client key (telemetry.otel_logs_client_key)',
                desc: 'Path to the mTLS client private key (PEM) for logs.',
            },
            telemetryOtelMetricsClientCertificate: {
                label: 'OTLP metrics client certificate (telemetry.otel_metrics_client_certificate)',
                desc: 'Path to the mTLS client certificate (PEM) for metrics.',
            },
            telemetryOtelMetricsClientKey: {
                label: 'OTLP metrics client key (telemetry.otel_metrics_client_key)',
                desc: 'Path to the mTLS client private key (PEM) for metrics.',
            },
            diagnosticsErrorReporting: {
                label: 'Error reporting (diagnostics.error_reporting)',
                desc: 'Turns error reporting on or off. When unset, it follows the telemetry setting.',
            },
            diagnosticsCrashHandler: {
                label: 'Crash reports (diagnostics.crash_handler)',
                desc: 'Writes a panic report under $GROK_HOME/crash.',
            },
            harnessWaitForUploads: {
                label: 'Wait for trace uploads (harness.wait_for_uploads)',
                desc: 'Waits for turn-end trace uploads before returning the prompt response.',
            },
            feedbackUserCommand: {
                label: 'Feedback author command (feedback.user.command)',
                desc: 'Shell command that prints the feedback author name and email as JSON.',
            },
            feedbackUserEmail: {
                label: 'Feedback author email (feedback.user.email)',
                desc: 'Sources for the feedback author email: git_email or a literal value.',
            },
            feedbackUserName: {
                label: 'Feedback author name (feedback.user.name)',
                desc: 'Sources for the feedback author name: os_user or a literal value.',
            },
        },
    },
    pluginManager: {
        title: 'Grok Plugin Manager',
        description: 'List, install, and uninstall Grok plugins and manage marketplaces.',
        configUnreadable:
            '~/.grok/config.toml could not be read or is not valid, so the enabled state cannot be confirmed. The list shows the default state, enabled.',
    },
    nav: {
        group: 'Grok',
        grokMcp: 'Grok MCP Management',
        grokAgentSkill: 'Grok Agent / Skill Management',
        pluginManager: 'Grok Plugin Manager',
        grokCleanup: 'Grok Cleanup',
        grokSettings: 'Grok Settings',
    },
    dashboard: {
        grokMcpDesc: 'Enable/disable/reorder MCP servers for Grok (CLI).',
        grokAgentSkillDesc: 'Manage Grok agents and skills.',
        pluginManagerDesc: 'Manage Grok plugins and marketplaces.',
        grokCleanupDesc: 'Clean up ~/.grok directories and old executable versions.',
        grokSettingsDesc: 'Edit configuration items in ~/.grok/config.toml.',
    },
};
