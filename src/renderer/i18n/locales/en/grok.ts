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
            'Delete history, memory, logs, plans, and old executable versions under ~/.grok. Frees disk space and improves responsiveness. Config files, credentials, agents, skills, plugins, and hooks are excluded.',
        wslSection: 'WSL: {{distro}}',
        deleteSelected: 'Delete selected',
        cancel: 'Cancel',
        confirmTitle: 'Confirm cleanup',
        confirmBody: 'Delete the {{count}} selected item(s). This cannot be undone. Continue?',
        reclaimable: '{{count}} selected, reclaimable {{size}}',
        noCandidates: 'No cleanup targets found',
        inUseWarning:
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
            memory: 'memory',
            debug: 'debug',
            plans: 'plans',
            docs: 'docs',
            sandboxEvents: 'sandbox-events.jsonl',
            binOldVersions: 'bin (old versions)',
        },
        desc: {
            sessions: 'Recorded past sessions (conversation logs). Expand to delete individually.',
            memory: 'Cross-session memory data.',
            debug: 'Debug logs.',
            plans: 'Plan files created in plan mode.',
            docs: 'Cache of the built-in user guide (regenerated when needed).',
            sandboxEvents: 'Sandbox event log.',
            binOldVersions:
                'Old executable versions left behind by updates (about 130 MB each). The current version and launcher files are protected.',
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
        importOfficial: 'Import official skills',
        importOfficialTitle: 'Import official skills',
        importOfficialDesc:
            'Skills from the official xAI repository (xai-org/plugin-marketplace). Select the skills to import. Existing skills with the same name will be replaced.',
        import: 'Import',
        gitRequired: 'This feature requires git to be installed',
        officialImportSuccess: 'Imported {{count}} official skill(s)',
        officialImportError: 'Failed to import official skills',
        officialListError: 'Failed to fetch official skills',
        repoUpdating: 'Updating the official repository...',
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
            cli: 'Display & CLI',
            features: 'Features',
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
                desc: 'Enables memory across sessions.',
            },
            subagentsEnabled: {
                label: 'Subagents (subagents.enabled)',
                desc: 'Master switch for the subagents feature.',
            },
            cliAutoUpdate: {
                label: 'Auto update (cli.auto_update)',
                desc: 'Enables CLI update checks.',
            },
            cliChannel: {
                label: 'Release channel (cli.channel)',
                desc: 'Release channel. "stable" is steadier; "alpha" is early access.',
            },
            cliShowTips: {
                label: 'Startup tips (cli.show_tips)',
                desc: 'Shows tips at startup.',
            },
            hintsNewSessionWorktreeMode: {
                label: '/new worktree hint (hints.new_session_worktree_mode)',
                desc: 'Whether /new suggests using a git worktree.',
            },
            hintsForkWorktreeMode: {
                label: '/fork worktree hint (hints.fork_worktree_mode)',
                desc: 'Whether /fork suggests using a git worktree.',
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
            featuresToolSearch: {
                label: 'MCP tool search (features.tool_search)',
                desc: 'Enables searching (on-demand loading) of MCP tools.',
            },
            modelsImageDescription: {
                label: 'Image description model (models.image_description)',
                desc: 'Model ID used to describe images. Current suggestions and custom model IDs are accepted.',
            },
            modelsMaxRetries: {
                label: 'Inference retries (models.max_retries)',
                desc: 'Global maximum retry count when model inference fails.',
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
            uiCompactMode: {
                label: 'Compact display (ui.compact_mode)',
                desc: 'Reduces TUI padding and decoration to fit more content in short terminals; enabled automatically at 20 rows or fewer.',
            },
            uiScreenMode: {
                label: 'Screen mode (ui.screen_mode)',
                desc: 'fullscreen uses the standard full-screen TUI; minimal leaves finalized output in native terminal scrollback.',
            },
            uiShowTimestamps: {
                label: 'Show timestamps (ui.show_timestamps)',
                desc: 'Shows timestamps on conversation and tool events. Default: on.',
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
            uiGroupToolVerbs: {
                label: 'Group tool actions (ui.group_tool_verbs)',
                desc: 'Groups consecutive similar tool operations into a single action display. Default: on.',
            },
            uiCollapsedEditBlocks: {
                label: 'Collapse edit blocks (ui.collapsed_edit_blocks)',
                desc: 'Shows file edit results collapsed by default. Default: off.',
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
            featuresRemoteFetch: {
                label: 'Remote settings fetch (features.remote_fetch)',
                desc: 'Fetches model catalogs and remote settings from xAI backends. When off, only bundled model information is used. Default: on.',
            },
            featuresImageGen: {
                label: 'Image generation (features.image_gen)',
                desc: 'Enables the Grok Build image-generation tool.',
            },
            featuresImageEdit: {
                label: 'Image editing (features.image_edit)',
                desc: 'Enables the Grok Build image-editing tool.',
            },
            featuresVideoGen: {
                label: 'Video generation (features.video_gen)',
                desc: 'Enables the Grok Build video-generation tool.',
            },
            telemetryTraceUpload: {
                label: 'Trace upload (telemetry.trace_upload)',
                desc: 'Allows diagnostic session traces to be uploaded to xAI.',
            },
            cliUseLeader: {
                label: 'Use leader process (cli.use_leader)',
                desc: 'Uses the leader process that coordinates multiple Grok Build sessions.',
            },
            cliMinimumVersion: {
                label: 'Minimum CLI version (cli.minimum_version)',
                desc: 'Sets the minimum Grok Build CLI version required by managed or remote configuration.',
            },
            harnessDisableCodebaseUpload: {
                label: 'Disable codebase upload (harness.disable_codebase_upload)',
                desc: 'Blocks codebase upload by Grok Build hosting features.',
            },
            managedMcpsEnabled: {
                label: 'Enable managed MCPs (managed_mcps.enabled)',
                desc: 'Enables managed MCP servers distributed through organization or remote settings.',
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
