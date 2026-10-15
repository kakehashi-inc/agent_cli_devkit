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
            'Delete history, memory, logs, diagnostic data, caches, and old executable versions under ~/.grok, plus Grok temporary files left in the OS temp folder (%TEMP% or /tmp). Frees disk space and improves responsiveness. Config files, credentials, agents, skills, plugins, hooks, bundled assets, and session worktrees are excluded.',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: 'Delete selected',
        cancel: 'Cancel',
        confirmTitle: 'Confirm cleanup',
        confirmBody: 'Delete the {{count}} selected item(s). This cannot be undone. Continue?',
        reclaimable: '{{count}} selected, reclaimable {{size}}',
        noCandidates: 'No cleanup targets found',
        inUseNotice:
            'If a Grok session is running, some directories may fail to delete. Please close sessions before deleting.',
        deleteSuccess: 'Cleanup completed',
        deletePartial: 'Some files were in use and were skipped',
        deleteError: 'Failed to delete some items',
        columnName: 'Item',
        columnDescription: 'Description',
        columnFiles: 'Files',
        columnSize: 'Size',
        dir: {
            sessions: 'sessions',
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
                'Recorded past sessions (conversation logs and plans). Expand to delete per project. Tool approvals saved for each project are deleted too.',
            sandboxEvents: 'Sandbox event log.',
            logs: 'Diagnostic logs such as the unified log and MCP server stderr output.',
            debug: 'Debug logs (written when GROK_DEBUG_LOG is set).',
            leaderLog: 'Log of the leader process.',
            leaderLogRotated: 'Previous leader process log, rotated out at its size limit.',
            memtrace: 'Process memory usage records (diagnostics).',
            crash: 'Crash reports from abnormal terminations.',
            traceExports: 'Trace bundles written by grok trace export.',
            marketplaceCache: 'Git cache of plugin marketplaces (fetched again when needed).',
            docs: 'Cache of the built-in user guide (regenerated at launch).',
            memory: 'Cross-session memory data. Deleting it loses the accumulated memory.',
            memoryV2: 'Memory v2 data (topics and observations). Deleting it loses the accumulated memory.',
            plans: 'Plan files created by older versions (current versions store plans inside each session).',
            binOldVersions:
                'Old executable versions left behind by updates and executables moved aside during updates (*.old), about 130 MB each. The current version and launcher files are protected.',
            tempGoalScratch:
                'Goal mode verification work folders in the OS temp folder. They are matched against the goal state saved in each session: folders of goals that finished (complete or budget limit reached) or that have no matching goal are deleted once not modified for 1 hour or more, and all others once not modified for 7 days or more. Newer items that may still be in use are never deleted.',
            tempSnapshotIndex:
                'Temporary Git indexes (including .lock files) used to snapshot worktrees, in the OS temp folder. Only those created and last modified 24 hours or more ago are deleted. Newer items that may still be in use are never deleted.',
            tempVideoFrames:
                'Temporary folders for extracting frames from attached videos, in the OS temp folder. Only those created and last modified 24 hours or more ago are deleted. Newer items that may still be in use are never deleted.',
            tempEditorFiles:
                'Temporary files for editing prompts in an external editor and viewing transcripts, in the OS temp folder. Only files not modified for 7 days or more are deleted. Newer items that may still be in use are never deleted.',
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
                serenaProjects: 'Clears the list of projects registered in Serena (settings and comments are kept).',
                serenaLogs: 'Deletes logs produced by Serena.',
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
        deleteSuccess: 'Deleted {{count}} item(s)',
        deletePartial: 'Some items could not be deleted because they are in use',
        deleteError: 'Failed to delete the selected items',
        noEntries: 'No data available',
        unavailable: 'This environment cannot be accessed for archive operations (the WSL path is unreachable).',
        downloadSuccess: 'Archive saved',
        downloadError: 'Failed to create the archive',
        uploadSuccess: 'Imported {{count}} item(s)',
        uploadError: 'Failed to extract the archive',
        overwriteConfirmTitle: 'Overwrite items with the same name?',
        overwriteConfirmBody:
            'The following {{count}} item(s) already exist and will be deleted and replaced: {{names}}. Continue?',
        mdNoName: 'Could not read the name from SKILL.md',
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
    settings: {
        title: 'Grok Settings',
        description: 'Edit ~/.grok/config.toml items in a table, or edit the file directly.',
        wslSection: 'WSL: {{distro}}',
        colItem: 'Item',
        colValue: 'Value',
        directEdit: 'Direct edit',
        directEditTitle: 'Edit config.toml directly',
        directEditDesc:
            'Edit the contents of config.toml directly. Saving overwrites the entire file with this content. Make sure it is valid TOML.',
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
                desc: 'Model ID used for new sessions. Current suggestions and custom model IDs are accepted.',
            },
            modelsWebSearch: {
                label: 'Web search model (models.web_search)',
                desc: 'Model used by the web_search tool. Leave blank to unset.',
            },
            modelsDefaultReasoningEffort: {
                label: 'Reasoning effort (models.default_reasoning_effort)',
                desc: 'Reasoning effort for the default model, including none through xhigh when supported.',
            },
            modelsSessionSummary: {
                label: 'Session summary model (models.session_summary)',
                desc: 'Model used for session summaries. Leave blank to unset.',
            },
            modelsTemperature: {
                label: 'temperature (models.temperature)',
                desc: 'Global sampling default for all models (0-2). Leave blank to unset.',
            },
            modelsTopP: {
                label: 'top_p (models.top_p)',
                desc: 'Global sampling default for all models (0-1). Leave blank to unset.',
            },
            modelsMaxCompletionTokens: {
                label: 'Max completion tokens (models.max_completion_tokens)',
                desc: 'Global maximum completion tokens. Leave blank to unset.',
            },
            sandboxProfile: {
                label: 'Sandbox (sandbox.profile)',
                desc: 'Filesystem sandbox profile (off / workspace / devbox / read-only / strict / custom name).',
            },
            sandboxAutoAllowBash: {
                label: 'Auto-allow bash (sandbox.auto_allow_bash)',
                desc: 'Skips bash permission prompts while the sandbox is enabled.',
            },
            toolsRespectGitignore: {
                label: 'Respect gitignore (tools.respect_gitignore)',
                desc: 'File exploration tools respect .gitignore files.',
            },
            sessionAutoCompactThreshold: {
                label: 'Auto-compact threshold (session.auto_compact_threshold_percent)',
                desc: 'Automatically compacts the session when context usage exceeds this percentage (0-100, default 85).',
            },
            sessionLoadEnvrc: {
                label: 'Load .envrc (session.load_envrc)',
                desc: 'Injects environment variables from .envrc at session start.',
            },
            memoryEnabled: {
                label: 'Cross-session memory (memory.enabled)',
                desc: 'Enables memory across sessions. memory_v2.enabled takes precedence when set. Default: off.',
            },
            subagentsEnabled: {
                label: 'Subagents (subagents.enabled)',
                desc: 'Master switch for the subagents (task tool) feature. Default: on.',
            },
            cliAutoUpdate: {
                label: 'Auto update (cli.auto_update)',
                desc: 'Enables CLI update checks.',
            },
            cliChannel: {
                label: 'Release channel (cli.channel)',
                desc: 'Release channel. "stable" is steadier, "alpha" is early access, and "enterprise" is for organizations. Other names follow the stable update rules.',
            },
            cliShowTips: {
                label: 'Startup tips (cli.show_tips)',
                desc: 'Shows tips at startup.',
            },
            cliMinimumVersion: {
                label: 'Update floor version (cli.minimum_version)',
                desc: 'Keeps the updater from downgrading below this version. It never blocks startup.',
            },
            cliMaximumVersion: {
                label: 'Update ceiling version (cli.maximum_version)',
                desc: 'Keeps the updater from installing above this version.',
            },
            cliRequiredMinimumVersion: {
                label: 'Required floor version (cli.required_minimum_version)',
                desc: 'Refuses to start below this version. grok update and grok --version keep working.',
            },
            cliRequiredMaximumVersion: {
                label: 'Required ceiling version (cli.required_maximum_version)',
                desc: 'Refuses to start above this version. grok update and grok --version keep working.',
            },
            hintsNewSessionWorktreeMode: {
                label: '/new worktree hint (hints.new_session_worktree_mode)',
                desc: 'Whether /new suggests using a git worktree.',
            },
            hintsForkWorktreeMode: {
                label: '/fork worktree hint (hints.fork_worktree_mode)',
                desc: 'Whether /fork suggests using a git worktree.',
            },
            hintsMemoryModalFullscreen: {
                label: 'Memory modal fullscreen (hints.memory_modal_fullscreen)',
                desc: 'Remembers the fullscreen state of the memory modal.',
            },
            featuresWebFetch: {
                label: 'web_fetch (features.web_fetch)',
                desc: 'Enables the web_fetch tool.',
            },
            featuresLspTools: {
                label: 'LSP tools (features.lsp_tools)',
                desc: 'Exposes LSP-based code tools to the model.',
            },
            featuresWriteFile: {
                label: 'write tool (features.write_file)',
                desc: 'Enables the file write tool.',
            },
            modelsImageDescription: {
                label: 'Image description model (models.image_description)',
                desc: 'Model ID used to describe images. Current suggestions and custom model IDs are accepted.',
            },
            modelsMaxRetries: {
                label: 'Inference retries (models.max_retries)',
                desc: 'Global maximum retry count when model inference fails.',
            },
            modelsInferenceIdleTimeoutSecs: {
                label: 'Inference idle timeout (models.inference_idle_timeout_secs)',
                desc: 'Global default idle timeout, in seconds, for model inference. Default: 600.',
            },
            modelsStreamToolCalls: {
                label: 'Stream tool calls (models.stream_tool_calls)',
                desc: 'Requests streamed tool-call output. Disable it for BYOK endpoints that do not support this request shape.',
            },
            toolsetFileToolset: {
                label: 'File editing scheme (toolset.file_toolset)',
                desc: 'Uses standard file editing or the hashline line-hash editing scheme. Default: standard.',
            },
            toolsetBashTimeoutSecs: {
                label: 'Bash timeout (toolset.bash.timeout_secs)',
                desc: 'Default foreground bash command timeout in seconds. Default: 120.',
            },
            toolsetBashOutputByteLimit: {
                label: 'Bash output limit (toolset.bash.output_byte_limit)',
                desc: 'Maximum bytes captured from bash command output. Default: 20000.',
            },
            toolsetBashMaxTimeoutSecs: {
                label: 'Maximum bash timeout (toolset.bash.max_timeout_secs)',
                desc: 'Upper limit in seconds for model-requested foreground bash timeouts. Default: 36000.',
            },
            toolsetBashAutoBackground: {
                label: 'Background on timeout (toolset.bash.auto_background_on_timeout)',
                desc: 'Moves a timed-out bash command into the background instead of stopping it. Default: on.',
            },
            toolsetWebFetchProxyEndpoint: {
                label: 'WebFetch proxy (toolset.web_fetch.proxy_endpoint)',
                desc: 'Proxy URL used for outbound web_fetch traffic.',
            },
            toolsetAskUserQuestionTimeoutEnabled: {
                label: 'Question timeout (toolset.ask_user_question.timeout_enabled)',
                desc: 'Applies a timeout to user questions. Default: on.',
            },
            toolsetAskUserQuestionTimeoutSecs: {
                label: 'Question timeout seconds (toolset.ask_user_question.timeout_secs)',
                desc: 'Seconds to wait for an answer to a question. Default: 1800.',
            },
            toolsetWebFetchAllowLocal: {
                label: 'Allow local fetch (toolset.web_fetch.allow_local)',
                desc: 'Allows web_fetch to reach loopback/local hosts (off by default as SSRF protection).',
            },
            uiCompactMode: {
                label: 'Compact display (ui.compact_mode)',
                desc: 'Reduces TUI padding and decoration to fit more content in short terminals; enabled automatically at 20 rows or fewer.',
            },
            uiScreenMode: {
                label: 'Screen mode (ui.screen_mode)',
                desc: 'fullscreen uses the standard full-screen TUI; minimal leaves finalized output in native terminal scrollback.',
            },
            uiShowTimeline: {
                label: 'Show timeline (ui.show_timeline)',
                desc: 'Shows session progress as a chronological timeline.',
            },
            uiSimpleMode: {
                label: 'Simple input mode (ui.simple_mode)',
                desc: 'Uses simplified input behavior without Vim input mode. Default: on.',
            },
            uiTheme: {
                label: 'TUI theme (ui.theme)',
                desc: 'Selects auto or a built-in Grok Build color theme. Saved themes outside the suggestions remain supported.',
            },
            uiRenderMermaid: {
                label: 'Render Mermaid (ui.render_mermaid)',
                desc: 'Selects automatic, always-on, or off for rendering Mermaid diagrams in the terminal.',
            },
            uiRememberToolApprovals: {
                label: 'Remember tool approvals (ui.remember_tool_approvals)',
                desc: 'Remembers approved tool actions during the session to reduce repeated confirmation prompts.',
            },
            uiShowThinkingBlocks: {
                label: 'Show thinking blocks (ui.show_thinking_blocks)',
                desc: 'Shows model reasoning/thinking blocks in the TUI, matching GROK_SHOW_THINKING_BLOCKS.',
            },
            uiPromptSuggestions: {
                label: 'Prompt suggestions (ui.prompt_suggestions)',
                desc: 'Shows contextual prompt suggestions in the input box.',
            },
            uiScrollSpeed: {
                label: 'Scroll speed (ui.scroll_speed)',
                desc: 'Adjusts TUI scrolling speed from 1 through 100.',
            },
            uiScrollMode: {
                label: 'Scroll input mode (ui.scroll_mode)',
                desc: 'Automatically detects the device or fixes behavior for a mouse wheel or trackpad.',
            },
            uiScrollLines: {
                label: 'Lines per scroll (ui.scroll_lines)',
                desc: 'Sets the number of lines moved per wheel event from 1 through 10.',
            },
            uiInvertScroll: {
                label: 'Invert scrolling (ui.invert_scroll)',
                desc: 'Reverses TUI scroll direction for mouse or trackpad input.',
            },
            uiKeepTextSelection: {
                label: 'Keep text selection (ui.keep_text_selection)',
                desc: 'Uses flash, hold, or word-selection behavior for selected text. Saved custom values remain supported.',
            },
            uiMaxThoughtsWidth: {
                label: 'Max thoughts width (ui.max_thoughts_width)',
                desc: 'Maximum column width for the thinking/reasoning display (40–500). Default: 120.',
            },
            uiForkSecondaryModel: {
                label: 'Fork secondary model (ui.fork_secondary_model)',
                desc: 'Model used for the secondary agent when forking.',
            },
            uiYolo: {
                label: 'YOLO mode (ui.yolo)',
                desc: 'Auto-approves everything (YOLO mode). Equivalent to permission_mode=always-approve. Default: off.',
            },
            uiPermissionMode: {
                label: 'Permission mode (ui.permission_mode)',
                desc: 'Permission mode used when running tools. Default: ask.',
            },
            uiDefaultSelectedPermission: {
                label: 'Default selected permission (ui.default_selected_permission)',
                desc: 'The row initially selected in the first approval prompt.',
            },
            uiPageFlipOnSend: {
                label: 'Page flip on send (ui.page_flip_on_send)',
                desc: 'Snaps your post to the top of the screen on send. Default: on.',
            },
            uiAutoDarkTheme: {
                label: 'OS dark theme (ui.auto_dark_theme)',
                desc: 'Theme used when theme=auto and the OS is in dark mode. Default: groknight.',
            },
            uiAutoLightTheme: {
                label: 'OS light theme (ui.auto_light_theme)',
                desc: 'Theme used when theme=auto and the OS is in light mode. Default: grokday.',
            },
            uiVimMode: {
                label: 'Vim mode (ui.vim_mode)',
                desc: 'Enables vim-style keys in the scrollback. Default: off.',
            },
            uiHunkTrackerMode: {
                label: 'Hunk tracker mode (ui.hunk_tracker_mode)',
                desc: "Scope of file-change hunk tracking: agent_only tracks only the agent's edits, all_dirty tracks every uncommitted change, and off disables tracking. Default: off.",
            },
            uiVoiceCaptureMode: {
                label: 'Voice capture mode (ui.voice_capture_mode)',
                desc: 'Voice input capture style (toggle or hold). Default: hold.',
            },
            uiVoiceKeybindEnabled: {
                label: 'Voice shortcut (ui.voice_keybind_enabled)',
                desc: 'Enables the Ctrl+Space / F8 voice dictation shortcut. /voice still works when off. Default: on.',
            },
            uiVoiceSttLanguage: {
                label: 'Voice input language (ui.voice_stt_language)',
                desc: 'Speech-to-text language code (auto is allowed). Default: en.',
            },
            uiMouseReportingToggle: {
                label: 'Mouse reporting toggle (ui.mouse_reporting_toggle)',
                desc: 'Enables toggling mouse reporting with Ctrl+R.',
            },
            uiCancelSubagentsOnTurnCancel: {
                label: 'Subagents on turn cancel (ui.cancel_subagents_on_turn_cancel)',
                desc: 'Whether subagents stop or continue when a turn is cancelled. Default: ask.',
            },
            uiCursorBlink: {
                label: 'Cursor blink (ui.cursor_blink)',
                desc: 'Controls cursor blink at startup (no settings-screen entry; config only).',
            },
            uiCombineQueuedPrompts: {
                label: 'Combine queued prompts (ui.combine_queued_prompts)',
                desc: 'Combines consecutively queued posts into a single turn. Default: off.',
            },
            uiContextualHints: {
                label: 'Contextual hints (ui.contextual_hints)',
                desc: 'Table to opt out of individual hints. Edit the file directly.',
            },
            uiDisplayRefresh: {
                label: 'Display refresh (ui.display_refresh)',
                desc: 'Display refresh probing and auto-cadence settings. Edit the file directly.',
            },
            uiNotifications: {
                label: 'Terminal notifications (ui.notifications)',
                desc: 'Terminal notification method, condition, events, hooks, and more. Edit the file directly.',
            },
            featuresRemoteFetch: {
                label: 'Remote settings fetch (features.remote_fetch)',
                desc: 'Fetches model catalogs and remote settings from xAI backends. When off, only bundled model information is used. Default: on.',
            },
            featuresImageGen: {
                label: 'Image generation (features.image_gen)',
                desc: 'Enables the Grok Build image-generation tool.',
            },
            featuresVideoGen: {
                label: 'Video generation (features.video_gen)',
                desc: 'Enables the Grok Build video-generation tool.',
            },
            featuresTelemetry: {
                label: 'Telemetry (features.telemetry)',
                desc: 'Product-analytics telemetry mode. Besides on and off, session_metrics sends only session metrics.',
                choice: {
                    enabled: 'Enabled (true)',
                    sessionMetrics: 'Session metrics only (session_metrics)',
                    disabled: 'Disabled (false)',
                    off: 'Off (off)',
                },
            },
            featuresFeedback: {
                label: 'Feedback (features.feedback)',
                desc: 'Enables the feedback feature. Default: on.',
            },
            featuresCodebaseIndexing: {
                label: 'Codebase indexing (features.codebase_indexing)',
                desc: 'Builds the code-graph index. true indexes Git repositories; an array of include / exclude globs narrows the scope.',
            },
            featuresTwoPassCompaction: {
                label: 'Two-pass compaction (features.two_pass_compaction)',
                desc: 'Summarizes the earlier part of a long conversation in the background before compaction. Default: on.',
            },
            workflowsEnabled: {
                label: 'Workflows (workflows.enabled)',
                desc: 'Enables background workflows (the workflow tool, etc.). Default: on.',
            },
            telemetryTraceUpload: {
                label: 'Trace upload (telemetry.trace_upload)',
                desc: 'Allows diagnostic session traces to be uploaded to xAI.',
            },
            telemetryMixpanelEnabled: {
                label: 'Mixpanel analytics (telemetry.mixpanel_enabled)',
                desc: 'Enables product analytics sent to Mixpanel.',
            },
            telemetryEventsUrl: {
                label: 'Event collector URL (telemetry.events_url)',
                desc: 'Destination for telemetry events when sending them to your own collector. Uses the built-in endpoint when unset.',
            },
            telemetryEventsApiKey: {
                label: 'Event collector token (telemetry.events_api_key)',
                desc: 'Token used when your own collector requires authentication.',
            },
            telemetryOtelEnabled: {
                label: 'External OTEL stream (telemetry.otel_enabled)',
                desc: 'Enables the external OpenTelemetry stream that ships usage data to your own OTLP collector.',
            },
            telemetryOtelEndpoint: {
                label: 'OTLP endpoint (telemetry.otel_endpoint)',
                desc: 'Base endpoint URL for the external OpenTelemetry stream.',
            },
            telemetryOtelProtocol: {
                label: 'OTLP protocol (telemetry.otel_protocol)',
                desc: 'Transport protocol for the external OpenTelemetry stream.',
            },
            telemetryOtelMetricsExporter: {
                label: 'OTEL metrics exporter (telemetry.otel_metrics_exporter)',
                desc: 'Where metrics go: otlp sends to the collector, console prints them, none disables them.',
            },
            telemetryOtelLogsExporter: {
                label: 'OTEL logs exporter (telemetry.otel_logs_exporter)',
                desc: 'Where logs go: otlp sends to the collector, console prints them, none disables them.',
            },
            telemetryOtelLogUserPrompts: {
                label: 'Include prompt text (telemetry.otel_log_user_prompts)',
                desc: 'Includes the text of user prompts in the external OpenTelemetry stream.',
            },
            telemetryOtelLogToolDetails: {
                label: 'Include tool details (telemetry.otel_log_tool_details)',
                desc: 'Includes tool-call details in the external OpenTelemetry stream.',
            },
            cliUseLeader: {
                label: 'Use leader process (cli.use_leader)',
                desc: 'Uses the leader process that coordinates multiple Grok Build sessions.',
            },
            compatCursorSkills: {
                label: 'Discover Cursor skills (compat.cursor.skills)',
                desc: 'Scans Cursor skill directories so Grok Build can use those skills. Default: on.',
            },
            compatCursorRules: {
                label: 'Discover Cursor rules (compat.cursor.rules)',
                desc: 'Scans .cursor/rules and loads the rules as Grok Build instructions. Default: on.',
            },
            compatCursorAgents: {
                label: 'Discover Cursor agents (compat.cursor.agents)',
                desc: 'Scans Cursor agent definitions so Grok Build can use those agents. Default: on.',
            },
            compatCursorMcps: {
                label: 'Discover Cursor MCPs (compat.cursor.mcps)',
                desc: 'Scans Cursor mcp.json configuration and imports its MCP servers. Default: on.',
            },
            compatCursorHooks: {
                label: 'Discover Cursor hooks (compat.cursor.hooks)',
                desc: 'Scans Cursor hook configuration and loads compatible hooks. Default: on.',
            },
            compatClaudeSkills: {
                label: 'Discover Claude skills (compat.claude.skills)',
                desc: 'Scans Claude Code skill directories so Grok Build can use those skills. Default: on.',
            },
            compatClaudeRules: {
                label: 'Discover Claude rules (compat.claude.rules)',
                desc: 'Scans Claude-compatible rules and loads them as Grok Build instructions. Default: on.',
            },
            compatClaudeAgents: {
                label: 'Discover Claude agents (compat.claude.agents)',
                desc: 'Scans Claude agent definitions plus CLAUDE.md and CLAUDE.local.md. Default: on.',
            },
            compatClaudeMcps: {
                label: 'Discover Claude MCPs (compat.claude.mcps)',
                desc: 'Scans Claude Code MCP configuration and imports its servers. Default: on.',
            },
            compatClaudeHooks: {
                label: 'Discover Claude hooks (compat.claude.hooks)',
                desc: 'Scans Claude Code hook configuration and loads compatible hooks. Default: on.',
            },
            modelsExtraHeaders: {
                label: 'Shared model headers (models.extra_headers)',
                desc: 'HTTP headers added to every model request; per-model values take precedence.',
            },
            modelsAllowedModels: {
                label: 'Model allowlist (models.allowed_models)',
                desc: 'Glob patterns restricting models selectable in the picker, as the default, or with -m.',
            },
            modelsHiddenModels: {
                label: 'Hidden models (models.hidden_models)',
                desc: 'Model IDs hidden from the picker but still usable with -m.',
            },
            modelsDisabledModels: {
                label: 'Disabled models (models.disabled_models)',
                desc: 'Model IDs removed from the catalog entirely; this takes precedence over hidden models.',
            },
            customModels: {
                label: 'Custom model definitions (model.<id>)',
                desc: 'Defines API connection, authentication, sampling, context, and retry settings for BYOK models.',
            },
            toolsetWebFetchAllowedDomains: {
                label: 'Web fetch allowed domains (toolset.web_fetch.allowed_domains)',
                desc: 'String array overriding the domains that web_fetch may access.',
            },
            mcpServers: {
                label: 'MCP server definitions (mcp_servers.<name>)',
                desc: 'Defines stdio or HTTP connections, environment variables, headers, and timeouts for MCP servers.',
            },
            permission: {
                label: 'Permission rules (permission)',
                desc: 'Defines tool allow, deny, and ask arrays plus detailed action, tool, and pattern rules.',
            },
            subagentsToggle: {
                label: 'Per-subagent states (subagents.toggle)',
                desc: 'Maps each subagent type to its enabled state.',
            },
            subagentsModels: {
                label: 'Subagent models (subagents.models)',
                desc: 'Maps each subagent type to the model ID it uses.',
            },
            skillsPaths: {
                label: 'Additional skill paths (skills.paths)',
                desc: 'Additional skill directories scanned by Grok Build.',
            },
            skillsDisabled: {
                label: 'Disabled skills (skills.disabled)',
                desc: 'Skill names that are discovered but not activated.',
            },
            skillsIgnore: {
                label: 'Scan-ignore paths (skills.ignore)',
                desc: 'Paths excluded from skill discovery.',
            },
            pluginsPaths: {
                label: 'Additional plugin paths (plugins.paths)',
                desc: 'Additional plugin directories scanned by Grok Build.',
            },
            pluginsDisabled: {
                label: 'Disabled plugins (plugins.disabled)',
                desc: 'Plugin names that are discovered but not activated.',
            },
            pluginsEnabled: {
                label: 'Enabled plugins (plugins.enabled)',
                desc: 'Plugin names explicitly enabled, including project plugins that may default to off.',
            },
            modelsPromptSuggestion: {
                label: 'Prompt suggestion model (models.prompt_suggestion)',
                desc: 'Model ID used to generate next-prompt suggestions (ghost text). When unset, the remote setting and then the session model are used.',
            },
            modelsAgentType: {
                label: 'Default agent type (models.agent_type)',
                desc: 'Agent definition type used for models that do not set their own agent_type.',
            },
            modelsRateLimitRetryThreshold: {
                label: 'Rate-limit attempt ceiling (models.rate_limit_retry_threshold)',
                desc: 'Global ceiling on total attempts for rate-limited requests, capped by max_retries. When set, the separate subagent 429 wait loop is not used.',
            },
            modelsSubagentRateLimitMaxAttempts: {
                label: 'Subagent 429 wait attempts (models.subagent_rate_limit_max_attempts)',
                desc: 'Maximum times a subagent waits and retries on a 429 response when rate_limit_retry_threshold is unset (0-32; 0 disables waiting). Default: 8.',
            },
            modelProviders: {
                label: 'Custom provider definitions (model_providers.<name>)',
                desc: 'Defines named model providers referenced by model_provider in [model.<id>].',
            },
            agentName: {
                label: 'Agent definition name (agent.name)',
                desc: 'Name of the built-in or discovered agent definition the session runs.',
            },
            agentDefinition: {
                label: 'Agent definition file (agent.definition)',
                desc: 'Path to an agent definition Markdown file with YAML frontmatter; the session runs with that definition.',
            },
            agentSystemPromptLabel: {
                label: 'System prompt identity (agent.system_prompt_label)',
                desc: 'Global identity label used in the system prompt. A per-model label takes precedence.',
            },
            promptSuggestionsMaxOutputTokens: {
                label: 'Suggestion output tokens (prompt_suggestions.max_output_tokens)',
                desc: 'Visible output tokens for generating prompt suggestions (16-256).',
            },
            promptSuggestionsTemperature: {
                label: 'Suggestion temperature (prompt_suggestions.temperature)',
                desc: 'Sampling temperature for generating prompt suggestions.',
            },
            promptSuggestionsReasoningEffort: {
                label: 'Suggestion reasoning effort (prompt_suggestions.reasoning_effort)',
                desc: 'Reasoning effort for generating prompt suggestions. none or unset disables reasoning.',
            },
            longReasoningReminderEnabled: {
                label: 'Long-reasoning reminder (long_reasoning_reminder.enabled)',
                desc: 'Injects a mid-turn reminder to reason briefly after a model call with long hidden reasoning. Default: off.',
            },
            longReasoningReminderTokens: {
                label: 'Long-reasoning threshold (long_reasoning_reminder.tokens)',
                desc: 'Reasoning tokens in one model call that count as long (100-200000). Default: 1000.',
            },
            longReasoningReminderDelay: {
                label: 'Reminder delay (long_reasoning_reminder.delay)',
                desc: 'Model calls to wait after the long call before injecting the reminder (0-10). Default: 1.',
            },
            toolsetBashLoginShellCapture: {
                label: 'Capture login shell environment (toolset.bash.login_shell_capture)',
                desc: "Runs bash with the login shell's environment. When off, aliases and functions from .bashrc / .zshrc, and possibly their PATH and exports, are not applied.",
            },
            toolsetImageGenBaseUrl: {
                label: 'Image generation endpoint (toolset.image_gen.base_url)',
                desc: 'Image API URL used by image_gen / image_edit with a custom model endpoint. When unset, these tools stay off.',
            },
            toolsetImageGenEnvKey: {
                label: 'Image generation credential variables (toolset.image_gen.env_key)',
                desc: 'Environment variable name(s) (string or array) holding the bearer token for toolset.image_gen.base_url. The first one that is set wins.',
            },
            toolsetVideoGenBaseUrl: {
                label: 'Video generation endpoint (toolset.video_gen.base_url)',
                desc: 'Video API URL used by the video tools with a custom model endpoint. When unset, the video tools stay off.',
            },
            toolsetVideoGenEnvKey: {
                label: 'Video generation credential variables (toolset.video_gen.env_key)',
                desc: 'Environment variable name(s) (string or array) holding the bearer token for toolset.video_gen.base_url. The first one that is set wins.',
            },
            toolsMediaGenMaxParallelImageGenCalls: {
                label: 'Parallel image generation calls (tools.media_gen.max_parallel_image_gen_calls)',
                desc: 'Maximum image_gen / image_edit calls run in parallel in one model step.',
            },
            toolsMediaGenMaxParallelVideoGenCalls: {
                label: 'Parallel video generation calls (tools.media_gen.max_parallel_video_gen_calls)',
                desc: 'Maximum video_gen calls run in parallel in one model step.',
            },
            disableWebSearch: {
                label: 'Remove web search tool (disable_web_search)',
                desc: 'Removes the web_search tool from the tools available to the model.',
            },
            storageCleanupTtlDays: {
                label: 'Session cleanup days (storage.cleanup_ttl_days)',
                desc: 'Deletes session folders idle for this many days and prunes older media and terminal logs from live sessions. Unset or 0 disables cleanup.',
            },
            autoModeEnabled: {
                label: 'Auto permission mode (auto_mode.enabled)',
                desc: 'Makes the Auto permission mode, which decides tool approvals automatically, available.',
            },
            defaultAutoMode: {
                label: 'Start in Auto mode (default_auto_mode)',
                desc: 'Starts new sessions in Auto permission mode when no per-session override is set.',
            },
            doomLoopRecoveryEnabled: {
                label: 'Tool-call loop recovery (doom_loop_recovery.enabled)',
                desc: 'Resamples when the model repeats the same tool call in a loop. When off, no recovery is attempted.',
            },
            pathNotFoundHints: {
                label: 'Path-not-found hints (path_not_found_hints)',
                desc: 'Adds working-directory reminders and similar-name suggestions to path-not-found errors.',
            },
            harnessDisableWorkspaceTeleport: {
                label: 'Stop per-turn snapshots (harness.disable_workspace_teleport)',
                desc: 'Stops taking a workspace snapshot on every turn.',
            },
            subagentsLimitBehavior: {
                label: 'Behavior at concurrency cap (subagents.limit_behavior)',
                desc: 'Whether to queue (queue) or fail (fail) when the concurrent subagent cap is reached.',
            },
            subagentsMaxConcurrent: {
                label: 'Concurrent subagents (subagents.max_concurrent)',
                desc: 'Maximum number of subagents running at the same time.',
            },
            subagentsMaxDepth: {
                label: 'Subagent nesting depth (subagents.max_depth)',
                desc: 'Maximum depth to which subagents can start further subagents (1 or more).',
            },
            mcpMaxOutputBytes: {
                label: 'MCP output size cap (mcp.max_output_bytes)',
                desc: 'Limits MCP tool output to this many bytes.',
            },
            shellEnvPolicyInherit: {
                label: 'Inherited environment (shell_environment_policy.inherit)',
                desc: 'Which parent environment variables tool subprocesses inherit: all keeps everything, core keeps a minimal set such as PATH and HOME, and none starts empty. Default: all.',
            },
            shellEnvPolicyIgnoreDefaultExcludes: {
                label: 'Ignore default excludes (shell_environment_policy.ignore_default_excludes)',
                desc: 'Skips the built-in rule that drops variables whose names contain KEY / SECRET / TOKEN from subprocesses. Default: off.',
            },
            shellEnvPolicyExclude: {
                label: 'Excluded variables (shell_environment_policy.exclude)',
                desc: 'Array of environment variable name patterns removed from tool subprocesses.',
            },
            shellEnvPolicyIncludeOnly: {
                label: 'Allowed variables (shell_environment_policy.include_only)',
                desc: 'When set, tool subprocesses receive only the environment variables matching these patterns.',
            },
            shellEnvPolicySet: {
                label: 'Forced variables (shell_environment_policy.set)',
                desc: 'Map of environment variable values set for tool subprocesses.',
            },
            toolsetWebSearchAllowedDomains: {
                label: 'Web search allowed domains (toolset.web_search.allowed_domains)',
                desc: 'Array of domains included in web_search results.',
            },
            toolsetWebSearchExcludedDomains: {
                label: 'Web search excluded domains (toolset.web_search.excluded_domains)',
                desc: 'Array of domains excluded from web_search results.',
            },
            disabledMcpServers: {
                label: 'Disabled MCP servers (disabled_mcp_servers)',
                desc: 'Array of MCP server names to skip while keeping their [mcp_servers] definitions.',
            },
            disabledMcpTools: {
                label: 'Disabled MCP tools (disabled_mcp_tools)',
                desc: 'Map of MCP server names to the tool names that must not be used.',
            },
            hooks: {
                label: 'Hook definitions (hooks.<event>)',
                desc: 'Defines matchers and commands to run for lifecycle events such as PreToolUse or Stop.',
            },
            memoryV2Enabled: {
                label: 'Memory v2 (memory_v2.enabled)',
                desc: 'Turns memory (v2) on or off. When set, it takes precedence over memory.enabled. Default: off.',
            },
            memoryV2CompactIndexEnabled: {
                label: 'Compact memory index (memory_v2.compact_index_enabled)',
                desc: 'Injects a titles-only memory index into the system prompt so more topics fit.',
            },
            memoryV2BatchDreamEnabled: {
                label: 'Batch Dream (memory_v2.batch_dream_enabled)',
                desc: 'Runs memory consolidation (Dream) as batch Dream, folding notes into topics in batches with the full topic catalog.',
            },
            memoryV2BatchDreamMaxRunSecs: {
                label: 'Batch Dream max run time (memory_v2.batch_dream_max_run_secs)',
                desc: 'Caps one batch Dream run in seconds (60-3600). Unfinished notes stay for the next run.',
            },
            memoryV2BatchDreamMaxCallsPerBatch: {
                label: 'Model calls per batch (memory_v2.batch_dream_max_calls_per_batch)',
                desc: 'Caps model calls in one batch Dream batch (2-16).',
            },
            memoryV2BatchDreamMaxBatchNoteBytes: {
                label: 'Note bytes per batch (memory_v2.batch_dream_max_batch_note_bytes)',
                desc: 'Caps note bytes handled in one batch Dream batch (16384-262144).',
            },
            memoryV2ArchivedRetentionDays: {
                label: 'Archive retention days (memory_v2.archived_retention_days)',
                desc: 'Days to keep archived memory observation files. Default: 30.',
            },
            memoryV2JobRetentionDays: {
                label: 'Capture job retention days (memory_v2.job_retention_days)',
                desc: 'Days to keep finished memory capture-job metadata. Default: 14.',
            },
            memoryV2DailyTokenCap: {
                label: 'Daily memory token cap (memory_v2.daily_token_cap)',
                desc: 'Model tokens memory processing may spend in a rolling 24 hours (1000000 or more). Capture pauses when exceeded.',
            },
            cliNpmRegistry: {
                label: 'npm registry (cli.npm_registry)',
                desc: 'npm registry URL used by the auto-updater.',
            },
            cliWorktreeType: {
                label: 'Worktree creation mode (cli.worktree_type)',
                desc: 'How worktrees are created (linked / standalone / git). Spellings such as grove / copy are treated as the worktree Grove setting.',
            },
            cliSessionPickerGrouped: {
                label: 'Group sessions by repository (cli.session_picker_grouped)',
                desc: 'Groups sessions by repository in the session picker and CLI listings.',
            },
            cliSessionRegistry: {
                label: 'Join session registry (cli.session_registry)',
                desc: 'Participates in the cross-process session registry.',
            },
            cliGrove: {
                label: 'Enable Grove everywhere (cli.grove)',
                desc: 'Uses Grove for both grok clone and session (-w) worktrees. Takes a boolean or a Grove type name.',
            },
            cliGroveWorktree: {
                label: 'Worktree Grove (cli.grove_worktree)',
                desc: 'Whether session (-w) worktrees use Grove or a copy, given as a boolean or a Grove type name.',
            },
            dashboardEnabled: {
                label: 'Agent dashboard (dashboard.enabled)',
                desc: 'Shows the agent dashboard.',
            },
            dashboardGrouping: {
                label: 'Dashboard grouping (dashboard.grouping)',
                desc: 'Whether dashboard rows are grouped by state (state) or directory (directory).',
            },
            uiTimestamps: {
                label: 'Timestamps (ui.timestamps)',
                desc: "Which rows show the clock time: off shows none, minimal shows only your prompts and each turn's duration line, and on shows every message.",
            },
            uiToolCallDensity: {
                label: 'Tool call density (ui.tool_call_density)',
                desc: 'How much of each tool call the transcript shows: detailed shows edit diffs and shell output, and the compact levels fold more into summary rows.',
            },
            uiConfirmBeforeRewind: {
                label: 'Confirm before rewind (ui.confirm_before_rewind)',
                desc: 'Asks before rewinding conversation history. Default: on.',
            },
            uiDashboardPreview: {
                label: 'Dashboard preview (ui.dashboard_preview)',
                desc: "Shows the selected session's preview and reply panel on the dashboard. Default: on.",
            },
            uiFollowUpBehavior: {
                label: 'Mid-turn follow-ups (ui.follow_up_behavior)',
                desc: 'Whether follow-ups sent during a turn are queued (queue) or injected at the next safe point (steer). Default: queue.',
            },
            uiStatusLineType: {
                label: 'Status line (ui.status_line.type)',
                desc: 'Shows a status-line row above the shortcuts bar. command shows the output of ui.status_line.command. Default: disabled.',
            },
            uiStatusLineCommand: {
                label: 'Status line command (ui.status_line.command)',
                desc: 'Script whose output is shown in the status line.',
            },
            voiceLanguage: {
                label: 'Voice input language (voice.language)',
                desc: 'Speech-to-text language code or auto. ui.voice_stt_language takes precedence when set.',
            },
            voiceApiBase: {
                label: 'Voice input API (voice.api_base)',
                desc: 'HTTPS API root for speech-to-text. When unset, the xAI API base URL is used.',
            },
            voiceSampleRate: {
                label: 'Voice sample rate (voice.sample_rate)',
                desc: 'Capture sample rate for voice input in Hz.',
            },
            worktreeAutoGc: {
                label: 'Worktree auto cleanup (worktree.auto_gc)',
                desc: 'Defines when session worktrees are cleaned up automatically.',
            },
            versionOverrides: {
                label: 'Per-version settings (version_overrides)',
                desc: 'Defines setting patches applied for specific CLI versions.',
            },
            featuresAskUserQuestion: {
                label: 'Question tool (features.ask_user_question)',
                desc: 'Lets the model ask you questions with the ask_user_question tool. Default: on.',
            },
            featuresBackendTools: {
                label: 'Server-side search (features.backend_tools)',
                desc: 'Runs web_search and x_search on the server side. Default: on.',
            },
            featuresImageGenModelOverride: {
                label: 'Image generation model (features.image_gen_model_override)',
                desc: 'Imagine model ID used by image_gen. When unset, the remotely configured default is used.',
            },
            featuresImageEditModelOverride: {
                label: 'Image editing model (features.image_edit_model_override)',
                desc: 'Imagine model ID used by image_edit.',
            },
            featuresVoiceMode: {
                label: 'Voice input (features.voice_mode)',
                desc: 'Enables voice dictation (speech to text). Default: on.',
            },
            featuresFeedbackTraceCard: {
                label: 'Trace consent on feedback (features.feedback_trace_card)',
                desc: 'Asks for consent to upload a trace after /feedback. Default: off.',
            },
            featuresCompactionMode: {
                label: 'Compaction mode (features.compaction_mode)',
                desc: 'Conversation compaction strategy (summary / transcript / segments).',
            },
            featuresCompactionDetail: {
                label: 'Compaction detail (features.compaction_detail)',
                desc: 'How much verbatim content segments compaction keeps (none / minimal / balanced / verbose).',
            },
            featuresCompactionToolChoice: {
                label: 'Compaction tool choice (features.compaction_tool_choice)',
                desc: 'Tool-choice hint used for the compaction model call.',
            },
            featuresCompactionVerbatimInput: {
                label: 'Summarize verbatim input (features.compaction_verbatim_input)',
                desc: 'Summarizes the verbatim conversation rather than a shortened copy. Default: on.',
            },
            featuresSessionRecap: {
                label: 'Session recap (features.session_recap)',
                desc: 'Enables /recap and the automatic recap when you return. Default: on.',
            },
            featuresSessionSearch: {
                label: 'Session search (features.session_search)',
                desc: 'Enables the SQLite session-search index. Default: on.',
            },
            featuresTurnSummary: {
                label: 'Turn summary (features.turn_summary)',
                desc: 'Shows a per-turn summary on the agent dashboard. Default: on.',
            },
            featuresTitleRefresh: {
                label: 'Title refresh (features.title_refresh)',
                desc: 'Refreshes the session title automatically early in the session.',
            },
            featuresCancelRewind: {
                label: 'Restore prompt on cancel (features.cancel_rewind)',
                desc: "Pressing Ctrl+C before a turn's first activity restores the prompt. Default: on.",
            },
            featuresAutoWake: {
                label: 'Auto wake (features.auto_wake)',
                desc: 'Continues the conversation as soon as a background task or subagent finishes. Default: on.',
            },
            featuresActiveAgentMessages: {
                label: 'Messages to running agents (features.active_agent_messages)',
                desc: 'Lets the model send follow-up instructions to a running descendant agent. Default: off.',
            },
            featuresSubagentBundle: {
                label: 'Skill bundle loading (features.subagent_bundle)',
                desc: "Loads the daemon route's built-in skills from the versioned skill bundle. Read at launch. Default: on.",
            },
            featuresSubagentModelInheritance: {
                label: 'Subagent model inheritance (features.subagent_model_inheritance)',
                desc: "Hides the subagent model argument when every model you can pick is an xAI model, so subagents inherit the parent's model. Read when a session starts. Default: off.",
            },
            featuresSubagentWorktreeSnapshot: {
                label: 'Save subagent work (features.subagent_worktree_snapshot)',
                desc: "Saves a finished subagent's working copy into the repository as a git ref and restores it on resume. Default: off.",
            },
            featuresWorkflowConversion: {
                label: 'Workflow conversion (features.workflow_conversion)',
                desc: 'On the daemon route, running a legacy .rhai workflow by name asks the model to convert it to a JavaScript module and then runs it. Default: on.',
            },
            featuresSupportPermission: {
                label: 'Permission requests (features.support_permission)',
                desc: 'Allows the agent to ask permission for tool executions.',
            },
            featuresRememberMode: {
                label: 'Remember permission mode (features.remember_mode)',
                desc: 'Remembers the last permission mode across sessions. Default: off.',
            },
            featuresNonGitWarning: {
                label: 'Non-Git warning (features.non_git_warning)',
                desc: 'Shows a blocking warning when Grok starts outside a Git repository.',
            },
            featuresMcpAutoRestart: {
                label: 'MCP auto restart (features.mcp_auto_restart)',
                desc: 'Restarts stdio MCP servers automatically after a transport failure. Default: on.',
            },
            featuresMcpLivenessWatchers: {
                label: 'MCP liveness watchers (features.mcp_liveness_watchers)',
                desc: 'Polls MCP transports and reports server status changes.',
            },
            featuresMcpPushServerStatus: {
                label: 'MCP status push (features.mcp_push_server_status)',
                desc: 'The TUI subscribes to MCP server status change notifications.',
            },
            featuresMcpRecursiveConfigWatch: {
                label: 'Project MCP config watch (features.mcp_recursive_config_watch)',
                desc: 'Watches the working directory and its .grok directory for MCP config edits (subdirectories are not watched).',
            },
            featuresDock: {
                label: 'Panel dock (features.dock)',
                desc: 'Shows a consolidated panel of subagents, tasks, watchers, and queued prompts above the prompt. Default: off.',
            },
            featuresTerminalTheme: {
                label: 'terminal theme (features.terminal_theme)',
                desc: "Makes the terminal color theme, which uses your terminal's own colors, selectable. Default: off.",
            },
            featuresFileAcceleration: {
                label: 'File accelerator (features.file_acceleration)',
                desc: "Hands local sessions' file systems to an installed file accelerator. Default: off.",
            },
            fileAccelerationRoutes: {
                label: 'File accelerator routes (file_acceleration.routes)',
                desc: 'Route override passed unchanged to the installed file accelerator.',
            },
            featuresCampaigns: {
                label: 'Apply campaigns (features.campaigns)',
                desc: 'Applies remotely published campaign setting patches.',
            },
            goalEnabled: {
                label: '/goal (goal.enabled)',
                desc: 'Enables the /goal command. Default: on.',
            },
            relayEnabled: {
                label: 'Session relay sync (relay.enabled)',
                desc: 'Enables session relay synchronization.',
            },
            compatCodexSkills: {
                label: 'Detect Codex skills (compat.codex.skills)',
                desc: 'Scans Codex skill directories and makes them available in Grok Build. Default: on.',
            },
            compatCodexHooks: {
                label: 'Detect Codex hooks (compat.codex.hooks)',
                desc: 'Scans Codex hook settings and loads them as compatible hooks. Default: on.',
            },
            marketplaceRequireSha: {
                label: 'Require pinned commit SHA (marketplace.require_sha)',
                desc: 'Requires remote plugin installs and updates to pin a full commit SHA. If another setting or the environment turns it on, this setting cannot turn it off.',
            },
            marketplaceSources: {
                label: 'Marketplace sources (marketplace.sources)',
                desc: 'Git repositories or local directories registered as plugin marketplaces.',
            },
            pathsExtraRuleDirs: {
                label: 'Extra rule directories (paths.extra_rule_dirs)',
                desc: 'Array of rule directories (each containing *.md files) loaded after the home rules.',
            },
            cursorWorkerAutoStart: {
                label: 'Start Cursor worker (cursor_worker.auto_start)',
                desc: 'Registers the leader as a Cursor private worker at startup so Cursor Cloud Agents can run on this machine. Default: off.',
            },
            cursorWorkerName: {
                label: 'Cursor worker name (cursor_worker.name)',
                desc: 'Worker name shown in Cursor. When unset, the machine hostname is used.',
            },
            cursorWorkerWorkerDirs: {
                label: 'Cursor worker directories (cursor_worker.worker_dirs)',
                desc: 'Absolute paths of repository directories offered to Cursor Cloud Agents. The first one is registered as the working directory.',
            },
            cursorWorkerMaxAgents: {
                label: 'Cursor worker concurrency (cursor_worker.max_agents)',
                desc: 'Maximum Cloud Agents accepted at once; requests beyond it fail instead of waiting. Unset means no cap.',
            },
            cursorWorkerAnyRepo: {
                label: 'Accept any repository (cursor_worker.any_repo)',
                desc: 'Also registers an entry point that clones whatever repository a Cloud Agent brings. Default: off.',
            },
            cursorWorkerHubUrl: {
                label: 'Computer Hub URL (cursor_worker.hub_url)',
                desc: "Computer Hub base URL used to obtain the Cursor session. When unset, it is derived from the leader's hub URL.",
            },
            cursorWorkerRewriteShellOutput: {
                label: 'Rewrite shell output paths (cursor_worker.rewrite_shell_output)',
                desc: 'Rewrites worktree and snapshot paths in shell output back to the registered directory. Default: on.',
            },
            telemetryOtelLogsEndpoint: {
                label: 'OTLP logs endpoint (telemetry.otel_logs_endpoint)',
                desc: 'OTLP endpoint that receives logs (used verbatim).',
            },
            telemetryOtelMetricsEndpoint: {
                label: 'OTLP metrics endpoint (telemetry.otel_metrics_endpoint)',
                desc: 'OTLP endpoint that receives metrics (used verbatim).',
            },
            telemetryOtelLogsProtocol: {
                label: 'OTLP logs protocol (telemetry.otel_logs_protocol)',
                desc: 'OTLP transport protocol used for logs.',
            },
            telemetryOtelMetricsProtocol: {
                label: 'OTLP metrics protocol (telemetry.otel_metrics_protocol)',
                desc: 'OTLP transport protocol used for metrics.',
            },
            telemetryOtelTimeout: {
                label: 'OTLP export timeout (telemetry.otel_timeout)',
                desc: 'Export timeout for external OpenTelemetry in milliseconds.',
            },
            telemetryOtelMetricExportInterval: {
                label: 'Metric export interval (telemetry.otel_metric_export_interval)',
                desc: 'Interval between metric exports in milliseconds.',
            },
            telemetryOtelMetricsIncludeSessionId: {
                label: 'Session ID on metrics (telemetry.otel_metrics_include_session_id)',
                desc: 'Attaches the session ID attribute to metrics.',
            },
            telemetryOtelLogAssistantResponses: {
                label: 'Send response text (telemetry.otel_log_assistant_responses)',
                desc: 'Includes assistant response text in external OpenTelemetry data. When unset, it follows the prompt text setting.',
            },
            telemetryOtelLogToolContent: {
                label: 'Send tool input and output (telemetry.otel_log_tool_content)',
                desc: 'Includes tool inputs, outputs, full commands, and error messages in external OpenTelemetry data. Default: off.',
            },
            telemetryOtelCertificate: {
                label: 'OTLP CA certificate (telemetry.otel_certificate)',
                desc: 'Path to extra CA certificates (PEM) used to verify the collector.',
            },
            telemetryOtelLogsCertificate: {
                label: 'OTLP logs CA certificate (telemetry.otel_logs_certificate)',
                desc: 'Path to the CA certificate (PEM) used to verify the logs endpoint.',
            },
            telemetryOtelMetricsCertificate: {
                label: 'OTLP metrics CA certificate (telemetry.otel_metrics_certificate)',
                desc: 'Path to the CA certificate (PEM) used to verify the metrics endpoint.',
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
                desc: 'Path to the mTLS client certificate (PEM) used for logs.',
            },
            telemetryOtelLogsClientKey: {
                label: 'OTLP logs client key (telemetry.otel_logs_client_key)',
                desc: 'Path to the mTLS client private key (PEM) used for logs.',
            },
            telemetryOtelMetricsClientCertificate: {
                label: 'OTLP metrics client certificate (telemetry.otel_metrics_client_certificate)',
                desc: 'Path to the mTLS client certificate (PEM) used for metrics.',
            },
            telemetryOtelMetricsClientKey: {
                label: 'OTLP metrics client key (telemetry.otel_metrics_client_key)',
                desc: 'Path to the mTLS client private key (PEM) used for metrics.',
            },
            diagnosticsCrashHandler: {
                label: 'Crash reports (diagnostics.crash_handler)',
                desc: 'Writes a crash report under ~/.grok/crash when Grok terminates abnormally.',
            },
            harnessWaitForUploads: {
                label: 'Wait for trace uploads (harness.wait_for_uploads)',
                desc: 'Waits for turn-end trace uploads to finish before returning the prompt response. Default: off.',
            },
            feedbackUserCommand: {
                label: 'Feedback author command (feedback.user.command)',
                desc: 'Shell command that prints the name and email as JSON for feedback submissions.',
            },
            feedbackUserEmail: {
                label: 'Feedback author email (feedback.user.email)',
                desc: 'Array of sources for the feedback author email (git_email or a literal value).',
            },
            feedbackUserName: {
                label: 'Feedback author name (feedback.user.name)',
                desc: 'Array of sources for the feedback author name (os_user or a literal value).',
            },
        },
    },
    pluginManager: {
        title: 'Grok Plugin Manager',
        description:
            'List, install, and uninstall Grok plugins and manage marketplaces. Operations use the grok command.',
    },
    nav: {
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
