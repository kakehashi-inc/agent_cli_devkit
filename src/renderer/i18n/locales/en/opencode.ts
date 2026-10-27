export default {
    nav: {
        mcp: 'OpenCode MCP Management',
        assets: 'OpenCode Agent / Skill Management',
        plugins: 'OpenCode Plugin Manager',
        settings: 'OpenCode Settings',
        cleanup: 'OpenCode Cleanup',
    },
    noEnvironment:
        'OpenCode 2 was not found. Check that OpenCode 2 is available on this computer, then press Refresh. If it is not found right after installing, you may need to restart the app.',
    dashboard: {
        mcpDesc: 'Enable/disable/reorder the MCP servers (mcp.servers) in the global OpenCode configuration.',
        assetsDesc: 'Manage OpenCode agents and skills under its own global config directory.',
        pluginsDesc:
            'Manage npm and Git package plugins and local TypeScript or JavaScript plugins (files and folders).',
        settingsDesc: 'Edit the global OpenCode configuration while preserving JSONC comments.',
        cleanupDesc:
            'Remove selected OpenCode caches, logs, tool output, shell output, snapshots, referenced repositories, input history, and session history.',
    },
    mcp: {
        title: 'OpenCode MCP Management',
        wslSection: 'WSL: {{distro}}',
        notFound:
            'Neither ~/.config/opencode/opencode.json nor opencode.jsonc was found. opencode.json will be created when settings are changed.',
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
        title: 'OpenCode Agent / Skill Management',
        descriptionText:
            'List your OpenCode custom agents and skills, download selected ones together as a ZIP, or upload a ZIP/md file to import them. Only OpenCode-owned global paths are managed: ~/.config/opencode/agents/*.md and ~/.config/opencode/skills/<name>/SKILL.md. Compatibility directories (~/.claude and ~/.agents) are excluded.',
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
        uploadError: 'Import failed',
        overwriteTitle: 'Overwrite items with the same name?',
        overwriteBody:
            'The following {{count}} item(s) already exist and will be deleted and replaced: {{names}}. Continue?',
    },
    plugins: {
        title: 'OpenCode Plugin Manager',
        description:
            'Manage package (npm and Git) and local path entries in the plugins array of opencode.json / opencode.jsonc, and .ts / .js files and plugin folders directly under ~/.config/opencode/plugins. Enable and disable directives (-ID, *, built-in IDs) are not listed and are kept as they are. Terminal UI plugins (the plugins in cli.json) are shown for reference only.',
        sourceHelp:
            'Installs an npm package (optionally with an @ version, tag, or range) or a Git package specifier (such as github:owner/repo#branch) with opencode plugin add and adds it to the plugins setting (terminal UI packages are added to cli.json). An absolute path to a local .ts / .js file or plugin folder (one containing package.json or an index, server, or tui .ts / .js file) is copied into the plugins folder.',
        tuiNote: 'Terminal UI only (cli.json). It cannot be enabled, disabled, or removed here.',
        disabledFileInvalid:
            'Disabled plugins cannot be shown because the file that keeps them (~/.config/opencode/opencode-disabled-plugins.json) is malformed. Until you fix or delete this file, plugins in the plugins setting cannot be enabled, disabled, or removed, and packages cannot be installed.',
    },
    settings: {
        title: 'OpenCode Settings',
        description:
            'Edit scalar values in ~/.config/opencode/opencode.json or opencode.jsonc (opencode.jsonc, whose values OpenCode prefers, when both exist). Arrays, maps, objects, and union values other than the model are direct-edit only; JSONC comments outside changed values are preserved. Terminal UI settings (cli.json) and background service settings (service.json) are out of scope.',
        wslSection: 'WSL: {{distro}}',
        item: 'Item',
        value: 'Value',
        directEdit: 'Direct edit',
        directTitle: 'Edit the OpenCode config file directly',
        directDesc: 'Saving replaces the file contents. JSONC comments and trailing commas are accepted.',
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
        invalidJson: 'The JSON/JSONC syntax is invalid',
        invalidExisting: 'The existing JSON/JSONC is invalid. Fix it with direct edit first.',
        verifyFailed:
            'Verification of the edit result failed, so saving was aborted. The file is unchanged. Change this item via direct edit.',
        unavailable: 'These settings cannot be accessed.',
        notice: {
            modelObjectForm:
                'Set in object form. The value above shows the same content in string notation (providerID/model#variant). It is overwritten in string form only when you change the value and save.',
            modelUnsupported:
                'Contains keys other than providerID, model, and variant, or unexpected values, so it cannot be edited in the table (editing would lose them).',
            jsonAlsoExists:
                'Both opencode.json and opencode.jsonc exist. OpenCode loads both and the opencode.jsonc value wins for any setting defined in both, so this screen and direct editing show and change opencode.jsonc. Settings that exist only in opencode.json still take effect in OpenCode but are not shown in this table.',
        },
        group: {
            model: 'Models & Agents',
            behavior: 'Behavior',
            permissions: 'Permissions & Policies',
            mcp: 'MCP',
            media: 'Media',
            toolOutput: 'Tool output',
            compaction: 'Compaction',
            extensions: 'Extensions',
            experimental: 'Experimental',
        },
        field: {
            model: {
                label: 'Model (model)',
                desc: 'Default model used when no session or agent model is selected. Enter it as provider/model, and append #variant to choose a variant (for example, anthropic/claude-sonnet-4-5#high). The file can also hold an object with providerID, model, and variant.',
            },
            defaultAgent: {
                label: 'Default agent (default_agent)',
                desc: 'Primary agent used when a session has not selected one. If it does not exist, is hidden, or cannot run as primary, build is used.',
            },
            agents: {
                label: 'Agents (agents)',
                desc: 'Overrides for built-in agents and custom agent definitions (model, system prompt, mode, permissions, and more).',
            },
            providers: {
                label: 'Providers (providers)',
                desc: 'Provider settings and added or overridden models (request settings, headers, and variants).',
            },
            shell: {
                label: 'Shell (shell)',
                desc: 'Default shell used by the terminal and the shell tool.',
            },
            update: {
                label: 'Updates (update)',
                desc: 'How updates are handled: disable skips update checks, notify shows available updates before installing, and auto installs them automatically (a running server is not restarted). Only the global configuration applies.',
            },
            snapshots: {
                label: 'Snapshots (snapshots)',
                desc: 'Records file snapshots used to undo and revert changes.',
            },
            worktreeDirectory: {
                label: 'Worktree directory (worktree.directory)',
                desc: "Parent directory for new worktrees. Relative paths resolve from the project's original checkout. When unset, worktrees are created under the OpenCode data directory.",
            },
            websearch: {
                label: 'Web search (websearch)',
                desc: 'Web search provider selection (provider; random picks one automatically). Set false to remove the web search tool.',
            },
            warming: {
                label: 'Warming (warming)',
                desc: 'Keeps recently active sessions warm with periodic transient requests. Set true for the default timing, or an object with prompt, interval, and duration. Disabled by default.',
            },
            formatter: {
                label: 'Formatter (formatter)',
                desc: 'Formats files changed by the write, edit, and patch tools. Set true to enable available built-in formatters, or an object to configure each formatter.',
            },
            watcherIgnore: {
                label: 'Watcher ignore (watcher.ignore)',
                desc: 'File and directory patterns excluded from file change watching.',
            },
            permissions: {
                label: 'Permission rules (permissions)',
                desc: 'Ordered rules (action, resource, effect) that allow, deny, or ask before an agent uses a tool. The last matching rule applies.',
            },
            policies: {
                label: 'Policies (policies)',
                desc: 'Ordered policies that allow or deny use of providers, tools, and integrations.',
            },
            mcpTimeoutStartup: {
                label: 'Startup timeout (mcp.timeout.startup)',
                desc: 'Time in milliseconds to wait for an MCP server to connect and initialize. A per-server timeout overrides it.',
            },
            mcpTimeoutCatalog: {
                label: 'Catalog timeout (mcp.timeout.catalog)',
                desc: 'Time in milliseconds to wait for listing tools, prompts, and resources. A per-server timeout overrides it.',
            },
            mcpTimeoutExecution: {
                label: 'Execution timeout (mcp.timeout.execution)',
                desc: 'Time in milliseconds to wait for tool calls, prompt retrieval, and resource reads. A per-server timeout overrides it.',
            },
            mcpServers: {
                label: 'MCP servers (mcp.servers)',
                desc: 'Change them in MCP Management or by direct edit.',
            },
            mediaImageAutoResize: {
                label: 'Image auto resize (media.image.auto_resize)',
                desc: 'Resizes images that exceed a limit. When disabled, such images are rejected.',
            },
            mediaImageMaxWidth: {
                label: 'Image max width (media.image.max_width)',
                desc: 'Maximum width in pixels of images sent to a model.',
            },
            mediaImageMaxHeight: {
                label: 'Image max height (media.image.max_height)',
                desc: 'Maximum height in pixels of images sent to a model.',
            },
            mediaImageMaxBase64Bytes: {
                label: 'Image Base64 limit (media.image.max_base64_bytes)',
                desc: 'Maximum size in bytes of a Base64-encoded image.',
            },
            toolOutputMaxLines: {
                label: 'Tool output max lines (tool_output.max_lines)',
                desc: 'Maximum number of lines kept from a tool result. Longer output is truncated and saved to a file.',
            },
            toolOutputMaxBytes: {
                label: 'Tool output max bytes (tool_output.max_bytes)',
                desc: 'Maximum number of bytes kept from a tool result. Longer output is truncated and saved to a file.',
            },
            compactionAuto: {
                label: 'Auto compaction (compaction.auto)',
                desc: 'Compacts the conversation automatically near the context limit. Manual compaction always works.',
            },
            compactionKeepTokens: {
                label: 'Kept tokens (compaction.keep.tokens)',
                desc: 'Approximate number of recent conversation tokens kept beside the summary.',
            },
            compactionBuffer: {
                label: 'Buffer tokens (compaction.buffer)',
                desc: "Tokens kept free below the model's limit. Larger values start automatic compaction earlier. When unset, 10% of the limit is used.",
            },
            skills: {
                label: 'Additional skill sources (skills)',
                desc: 'Extra directories and HTTP catalog URLs to search for skills.',
            },
            commands: {
                label: 'Commands (commands)',
                desc: 'Named slash commands defined as prompt templates.',
            },
            references: {
                label: 'References (references)',
                desc: 'Local directories or Git repositories that conversations can reference by name.',
            },
            plugins: {
                label: 'Plugins (plugins)',
                desc: 'Change them in the Plugin Manager or by direct edit.',
            },
            experimentalPortableShellScanner: {
                label: 'Portable shell scanner (experimental.portable_shell_scanner)',
                desc: 'Uses the experimental portable parser for shell command permission checks.',
            },
            experimentalSubagentDepth: {
                label: 'Subagent depth (experimental.subagent_depth)',
                desc: 'Maximum subagent nesting depth. With the default of 1, subagents cannot launch further subagents.',
            },
        },
    },
    cleanup: {
        title: 'OpenCode Cleanup',
        description:
            'Delete selected data only from OpenCode official XDG directories. The database file itself (it holds credentials, saved permissions, and accounts), configuration, agents, skills, plugins, worktrees, and service configuration and registration are excluded.',
        wslSection: 'WSL: {{distro}}',
        inUseNotice:
            'Close OpenCode and its background service (stop it with opencode service stop) before cleanup. Files in use may be skipped.',
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
            cache: {
                label: '~/.cache/opencode',
                desc: 'Tools such as ripgrep, installed package plugins, the remote skill cache, and executable links kept for updates. Downloaded again when needed; package plugins are reinstalled automatically at the next startup.',
            },
            logs: { label: 'log', desc: 'OpenCode logs, CPU profiles, and heap snapshots.' },
            'tool-output': {
                label: 'tool-output',
                desc: 'Full output of truncated tool results. OpenCode also removes entries older than 7 days.',
            },
            'shell-output': {
                label: 'shell',
                desc: 'Output of commands run by the shell tool, per project. OpenCode also removes entries older than 7 days.',
            },
            snapshot: {
                label: 'snapshot',
                desc: 'File snapshots used to undo and revert changes, selectable by project. After deletion, past changes can no longer be reverted.',
            },
            repos: {
                label: 'repos',
                desc: 'Clones of Git repositories registered as references, selectable by host. Downloaded again the next time they are referenced.',
            },
            'prompt-history': { label: 'prompt-history.jsonl', desc: 'Prompt input history of the terminal UI.' },
            frecency: {
                label: 'frecency.jsonl',
                desc: 'Usage history the terminal UI uses to order file suggestions.',
            },
            sessions: {
                label: 'sessions',
                desc: 'OpenCode session history (conversations). Where the session database exists, the session list is loaded with the OpenCode CLI when this screen opens, and this row appears only when there are sessions. You can select sessions individually or all of them. Deleted with the OpenCode CLI (opencode session delete), which also removes sub-sessions. Sign-in information, saved permissions, and account information in the database are kept. Sessions that were updated, or whose sub-sessions were updated, within the last 5 minutes, and sessions whose update time is unknown, may be in use and are deleted only if you check them in the confirmation.',
            },
        },
    },
};
