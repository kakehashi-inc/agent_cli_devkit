export default {
    nav: {
        group: 'OpenCode',
        mcp: 'OpenCode MCP Management',
        assets: 'OpenCode Agent / Skill Management',
        plugins: 'OpenCode Plugin Manager',
        settings: 'OpenCode Settings',
        cleanup: 'OpenCode Cleanup',
    },
    noEnvironment: 'OpenCode 2 was not found. Check that OpenCode 2 is available on this computer, then press Refresh.',
    dashboard: {
        group: 'OpenCode 2',
        mcpDesc: 'Enable/disable/reorder the MCP servers (mcp.servers) in the global OpenCode configuration.',
        assetsDesc: 'Manage OpenCode agents and skills.',
        pluginsDesc:
            'Manage npm and Git package plugins and local TypeScript or JavaScript plugins (files and folders).',
        settingsDesc: 'Edit the OpenCode settings.',
        cleanupDesc:
            'Remove selected OpenCode caches, logs, tool output, shell output, snapshots, referenced repositories, input history, and session history.',
    },
    mcp: {
        title: 'OpenCode MCP Management',
        wslSection: 'WSL: {{distro}}',
        notFound: 'Neither ~/.config/opencode/opencode.json nor opencode.jsonc was found.',
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
            'List your OpenCode custom agents and skills, download selected ones together as a ZIP, or upload a ZIP/md file to import them.',
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
        noEntryFile: 'This archive has nothing to import. Each folder needs a SKILL.md.',
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
                'no-entry-file': 'Not loaded: no definition file or dot-prefixed name',
                'link-folder': 'Folder link',
                'link-loop': 'Not read: folder already listed',
                'refused-name': 'Cannot be managed: unsafe name',
            },
            statusHint: {
                'dangling-link':
                    'The link points to a path that does not exist, so the CLI does not load it. Deleting it removes only the link.',
                'no-entry-file':
                    'The CLI does not load this folder because it has no definition file or its name starts with a dot.',
                'link-folder': 'This link points to a folder. Deleting it removes only the link.',
                'link-loop':
                    'This link points to a folder that was already read, so its contents are not listed again. Deleting it removes only the link.',
                'refused-name':
                    'This name could point to a different location, so it cannot be viewed, downloaded, or deleted here. Rename it outside this app.',
            },
            overriddenBy: 'Overridden by {{origin}}',
            overriddenByHint:
                'An agent with the same name in {{origin}} is read later, and the fields it sets take priority over this file.',
        },
        origin: {
            agents: 'agents/',
            agent: 'agent/',
            mode: 'mode/ (primary)',
            modes: 'modes/ (primary)',
        },
        overwriteTitle: 'Overwrite items with the same name?',
        overwriteBody:
            'The following {{count}} item(s) already exist and will be deleted and replaced: {{names}}. Continue?',
    },
    plugins: {
        title: 'OpenCode Plugin Manager',
        description: 'List, add, and remove OpenCode plugins, and turn them on and off.',
        tuiNote: 'Terminal UI only (cli.json). It cannot be enabled, disabled, or removed here.',
        disabledFileInvalid:
            'Disabled plugins cannot be shown because the file that keeps them (~/.config/opencode/opencode-disabled-plugins.json) is malformed. Until you fix or delete this file, plugins in the plugins setting cannot be enabled, disabled, or removed, and packages cannot be installed.',
    },
    profile: {
        tab: {
            settings: 'Settings',
            externalCommands: 'External commands',
            permissions: 'Permissions',
            instructions: 'Instructions',
            commands: 'Commands',
        },
        link: {
            commands: 'Edit on the Commands tab of the Agent / Skill screen',
        },
        bothConfigFiles: 'Both opencode.json and opencode.jsonc exist, and this screen edits opencode.jsonc.',
        permissions: {
            legacyKey: 'The old key permission is still present.',
        },
        instructions: {
            filesTitle: 'Global',
        },
        commands: {
            title: 'commands folder',
            legacyTitle: 'command folder (old)',
            configTitle: 'commands in the configuration file',
            shadowedKeys: 'Hidden by files in a folder and not used: {{names}}',
        },
    },
    settings: {
        title: 'OpenCode Settings',
        description:
            'Edit OpenCode settings, permissions, instruction files, and more. The main settings file is ~/.config/opencode/opencode.json or opencode.jsonc.',
        wslSection: 'WSL: {{distro}}',
        item: 'Item',
        value: 'Value',
        directEdit: 'Direct edit',
        directTitle: 'Edit the OpenCode config file directly',
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
        invalidJson: 'The JSON/JSONC syntax is invalid',
        invalidExisting: 'The existing JSON/JSONC is invalid. Fix it with direct edit first.',
        verifyFailed:
            'Verification of the edit result failed, so saving was aborted. The file is unchanged. Change this item via direct edit.',
        unavailable: 'These settings cannot be accessed.',
        notice: {
            modelObjectForm: 'Set in object form. Changing the value and saving writes it in string form.',
            modelUnsupported:
                'Contains keys other than providerID, model, and variant, or unexpected values, so it cannot be edited in the table (editing would lose them).',
            jsonAlsoExists: 'Both opencode.json and opencode.jsonc exist. This screen edits opencode.jsonc.',
        },
        group: {
            model: 'Models & agents',
            behavior: 'Behavior',
            permissions: 'Permissions & policies',
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
                desc: 'Default model used when no session or agent model is selected, in provider/model format.',
            },
            defaultAgent: {
                label: 'Default agent (default_agent)',
                desc: 'Primary agent used when a session has not selected one.',
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
                desc: 'How updates are handled: disable skips update checks, notify shows available updates before installing, and auto installs them automatically.',
            },
            snapshots: {
                label: 'Snapshots (snapshots)',
                desc: 'Records file snapshots used to undo and revert changes.',
            },
            timezone: {
                label: 'Time zone (timezone)',
                desc: "IANA time zone for schedules, for example America/Los_Angeles. The default is the server's local zone.",
            },
            worktreeDirectory: {
                label: 'Worktree directory (worktree.directory)',
                desc: "Parent directory for new worktrees. Relative paths resolve from the project's original checkout.",
            },
            websearch: {
                label: 'Web search (websearch)',
                desc: 'Web search provider, set with provider; random picks an available one automatically. false removes the web search tool.',
            },
            warming: {
                label: 'Warming (warming)',
                desc: 'Keeps recently active sessions warm with periodic transient requests. true uses a 4-minute interval for 30 minutes, and an object sets prompt, interval, and duration.',
            },
            formatter: {
                label: 'Formatter (formatter)',
                desc: 'Formats files changed by the write, edit, and patch tools. true enables the available built-in formatters, and an object also configures each formatter.',
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
                desc: 'Ordered policies that allow or deny providers, tools, integrations, MCP servers, skills, and plugins.',
            },
            mcpTimeoutStartup: {
                label: 'Startup timeout (mcp.timeout.startup)',
                desc: 'Time in milliseconds to wait for an MCP server to connect and initialize.',
            },
            mcpTimeoutCatalog: {
                label: 'Catalog timeout (mcp.timeout.catalog)',
                desc: 'Time in milliseconds to wait for listing tools, prompts, and resources.',
            },
            mcpTimeoutExecution: {
                label: 'Execution timeout (mcp.timeout.execution)',
                desc: 'Time in milliseconds to wait for tool calls, prompt retrieval, and resource reads.',
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
                desc: 'Compacts the conversation automatically near the context limit.',
            },
            compactionKeepTokens: {
                label: 'Kept tokens (compaction.keep.tokens)',
                desc: 'Approximate number of recent conversation tokens kept beside the summary.',
            },
            compactionBuffer: {
                label: 'Context buffer (compaction.buffer)',
                desc: 'Room kept free below the context window before automatic compaction, as a percentage such as "20%" or a token count. The default is "15%", at least 16,000 tokens.',
            },
            skills: {
                label: 'Additional skill sources (skills)',
                desc: 'Extra directories and HTTP catalog URLs to search for skills.',
            },
            instructions: {
                label: 'Additional instruction files (instructions)',
                desc: 'Paths, globs, and URLs of additional instruction files to load. Paths starting with ~/ expand from the home folder.',
            },
            commands: {
                label: 'Commands (commands)',
                desc: 'Named slash commands defined as prompt templates.',
            },
            references: {
                label: 'References (references)',
                desc: 'Local directories or Git repositories available to conversations as named context.',
            },
            plugins: {
                label: 'Plugins (plugins)',
                desc: 'Change them in the Plugin Manager or by direct edit.',
            },
            experimentalSubagentDepth: {
                label: 'Subagent depth (experimental.subagent_depth)',
                desc: 'Maximum subagent nesting depth.',
            },
            experimentalTodo: {
                label: 'Todo tool (experimental.todo)',
                desc: 'Gives agents a todowrite tool for tracking multi-step work.',
            },
            experimentalBackgroundCompaction: {
                label: 'Background compaction (experimental.background_compaction)',
                desc: 'Prepares the compaction summary in the background as the conversation nears the threshold and swaps it in when compaction is due. Summaries that go unused still cost tokens.',
            },
            experimentalMediaBlob: {
                label: 'Deduplicated media storage (experimental.media_blob)',
                desc: 'Stores new session media once in a deduplicated blob table.',
            },
            experimentalSchedules: {
                label: 'Schedules (experimental.schedules)',
                desc: 'Enables experimental scheduled tasks that wake a session with a prompt.',
            },
            experimentalArtifacts: {
                label: 'Artifacts (experimental.artifacts)',
                desc: 'Enables experimental artifacts backed by pluggable providers.',
            },
            experimentalImageGenerate: {
                label: 'Image generation tool (experimental.image_generate)',
                desc: 'Settings for the experimental_image_generate tool. model sets its default model, and false turns the tool off.',
            },
            experimentalLocationIdleTimeout: {
                label: 'Location idle timeout (experimental.location_idle_timeout)',
                desc: 'Time without session activity before a project location unloads its services, as a duration such as "2 hours". false keeps it loaded, and the default is "60 minutes".',
            },
        },
    },
    cleanup: {
        title: 'OpenCode Cleanup',
        description:
            'Delete OpenCode cache, logs, tool output, shell output, snapshots, reference repositories, input history, and session history.',
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
        confirmWarning: {
            projects:
                'Deletes the sessions of the path, data that depends on them, path records, and snapshots. Statistics also go down.',
        },
        item: {
            cache: {
                label: '~/.cache/opencode',
                desc: 'Tools such as ripgrep, installed package plugins, the remote skill cache, and executable links kept for updates.',
            },
            logs: { label: 'log', desc: 'OpenCode logs, CPU profiles, and heap snapshots.' },
            'tool-output': {
                label: 'tool-output',
                desc: 'Full text of truncated tool results.',
            },
            'shell-output': {
                label: 'shell',
                desc: 'Output of commands run by the shell tool.',
            },
            snapshot: {
                label: 'snapshot',
                desc: 'File snapshots used to undo and rewind changes.',
            },
            repos: {
                label: 'repos',
                desc: 'Clones of Git repositories registered as references.',
            },
            'prompt-history': { label: 'prompt-history.jsonl', desc: 'Prompt input history of the terminal UI.' },
            frecency: {
                label: 'frecency.jsonl',
                desc: 'Usage history the terminal UI uses to order file suggestions.',
            },
            sessions: {
                label: 'sessions',
                desc: 'OpenCode session history (conversations). Also deleted: subsessions.',
            },
            projects: {
                label: 'projects',
                desc: 'Sessions per workspace path. Also deleted: data that depends on the sessions, path records, and snapshots.',
            },
        },
    },
};
