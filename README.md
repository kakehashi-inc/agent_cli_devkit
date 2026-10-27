# Agent CLI DevKit

## 1. System Overview

Agent CLI DevKit is an Electron desktop tool that manages the development environments of AI agent CLIs (Claude Code / Codex CLI / Antigravity CLI / Grok CLI / OpenCode 2) in a single application. It presents each CLI's tools in the fixed order Claude / Codex / Agy / Grok / OpenCode.

### Features

**Claude group**

- **Claude Desktop MCP Manager** — Enable, disable, and reorder Claude Desktop MCP servers.
- **Claude Code MCP Manager** — Manage Claude Code (CLI) profile MCP servers (`~/.claude.json`). Supports both the native OS and WSL distributions.
- **Claude Code Agent / Skill Manager** — List Claude Code agents and skills, download/upload them as ZIP archives, and import official Anthropic skills.
- **Claude Code Plugin Manager** — Install, uninstall, enable, and disable plugins and manage marketplaces with `claude plugin`.
- **Claude Code Settings** — Edit `~/.claude/settings.json` items in a table, or edit the file directly.
- **Claude Code Cleanup** — Reclaim disk space by deleting history, caches, temporary files, and logs under `~/.claude`. Deleting a project also removes that project's auto memory and its leftover temporary files and MCP logs outside `~/.claude`; a project whose sessions may still be running is deleted only if you check it in the confirmation. Any files that cannot be deleted are listed at the end.

**Codex group**

- **Codex MCP Manager** — Enable, disable, and reorder Codex (CLI) MCP servers (`~/.codex/config.toml`). Supports both the native OS and WSL distributions.
- **Codex Agent / Skill Manager** — Manage Codex custom agents (`~/.codex/agents`) and skills (`~/.agents/skills`), and import official OpenAI skills.
- **Codex Plugin Manager** — Install, uninstall, enable, and disable plugins and manage marketplaces with `codex plugin`.
- **Codex Settings** — Edit `~/.codex/config.toml` items in a table, or edit the file directly.
- **Codex Cleanup** — Reclaim disk space by deleting history, caches, temporary files, logs, and sessions under `~/.codex`, plus temporary files that are no longer in use (including the Windows sandbox logs) and old Codex versions left behind by updates.

**Agy group (Antigravity CLI only)**

- **Agy CLI MCP Manager** — Manage the global MCP configuration shared with Gemini CLI at `~/.gemini/config/mcp_config.json`.
- **Agy CLI Agent / Skill Manager** — Manage shared custom agents at `~/.gemini/config/agents/<name>/agent.md` and the one Agy CLI skill location at `~/.gemini/antigravity-cli/skills/<name>/SKILL.md`. Locations owned by the separate Agy product and Antigravity IDE are excluded.
- **Agy CLI Plugin Manager** — Install (from a plugin name, GitHub URL, or local folder), uninstall, enable, and disable plugins with `agy plugin`, including plugins in the Gemini-shared `~/.gemini/config/plugins` directory.
- **Agy CLI Settings** — Edit scalar settings in `~/.gemini/antigravity-cli/settings.json`, with arrays and objects available through direct JSON editing.
- **Agy CLI Cleanup** — Selectively remove Agy CLI caches, logs, crashes, history, conversation data, agent work folders, and old executables left behind by updates without touching settings, skills, the current binary, or shared Gemini configuration.

**Grok group**

- **Grok MCP Manager** — Enable, disable, and reorder Grok (CLI) MCP servers (`~/.grok/config.toml`). Supports both the native OS and WSL distributions.
- **Grok Agent / Skill Manager** — Manage Grok custom agents (`~/.grok/agents`) and skills (`~/.grok/skills`).
- **Grok Plugin Manager** — Install, uninstall, enable, and disable plugins and manage marketplace sources with `grok plugin`.
- **Grok Settings** — Edit `~/.grok/config.toml` items in a table, or edit the file directly.
- **Grok Cleanup** — Reclaim disk space by deleting history, memory, logs, diagnostics, and caches under `~/.grok`, plus temporary files in the system temp folder that are no longer in use and old executable versions (about 130 MB each) left behind by updates.

**OpenCode group (OpenCode 2)**

The OpenCode screens are shown where `opencode --version` succeeds and reports version 2.x. All operations use the `opencode` command. The result is cached per environment and checked again when you press Refresh. On macOS and Linux, standard installation folders (including `~/.bun/bin`, `~/.opencode/bin`, `~/.local/bin`, and Homebrew) are searched even when they are absent from the app's PATH. The version check can create OpenCode logs. OpenCode also runs when you install a plugin package or list or delete session history.

- **OpenCode MCP Manager** — Enable, disable, and reorder the MCP servers (`mcp.servers`) in the global configuration file (`~/.config/opencode/opencode.json` or `opencode.jsonc`, whichever exists first) while preserving all other settings and comments.
- **OpenCode Agent / Skill Manager** — Manage `~/.config/opencode/agents/**/*.md` and `~/.config/opencode/skills/<name>/SKILL.md`. Claude-compatible and agents-compatible directories are deliberately excluded.
- **OpenCode Plugin Manager** — Install packages (npm or Git) with `opencode plugin add`, copy local .ts/.js plugins and plugin folders into `~/.config/opencode/plugins`, and enable, disable, or uninstall them. Re-enabling a plugin puts it back where it was in the `plugins` list.
- **OpenCode Settings** — Edit scalar settings and the model in a table or edit the JSONC file directly (`opencode.jsonc` when both files exist); arrays, maps, and objects are direct-edit only. TUI keybindings are outside this feature scope.
- **OpenCode Cleanup** — Selectively remove caches, logs, tool output, snapshots, prompt history, and session history from the official XDG directories while keeping configuration, assets, and credentials. Session history is deleted per session through OpenCode and is listed only when there are sessions; sessions updated in the last 5 minutes, including those with a recently updated subagent session, are deleted only if you check them in the confirmation.

Agent / Skill managers show each entry's model, reasoning level, and key settings, and apply uploads only after they have been fully extracted, so a failed upload leaves existing agents and skills unchanged. Cleanup screens show items that are in use as not selectable, ask before deleting items that may be in use, list folders even when they contain no files, and list any files that could not be deleted at the end; deletions never follow symbolic links or junctions.

The dashboard shows the Claude / Codex / Agy / Grok / OpenCode groups as an exclusive accordion (the last expanded group is restored on the next launch), and every feature is reachable from the title bar and the burger menu (a two-level cascading menu per agent). Theme (light/dark) and language (Japanese/English) are changed on the App Settings screen and take effect when you press Save (the OS settings are inherited until saved). The internal structure is split into per-agent files with shared agent-independent managers (see `Documents/システム仕様.md` for details).

### Naming / Distribution

- Project name: `agent_cli_devkit`
- Configuration directory: `~/.agent_cli_devkit`
- Executable: `agent_cli_devkit`
- Distribution file name: `agent-cli-devkit-<version>-<os>-<arch>`

## 2. Supported OS

- Windows 10/11
- macOS 10.15+
- Linux (Debian-based / RHEL-based)

Note: This project does not code-sign Windows builds. If SmartScreen shows a warning, choose "More info" → "Run anyway".

## 3. Developer Reference

### Requirements

- Node.js 22.x or later
- yarn 4
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install dependencies
yarn install

# Start in development mode
yarn dev
```

DevTools during development:

- DevTools opens automatically in detached mode
- Toggle with F12 or Ctrl+Shift+I (Cmd+Option+I on macOS)

### Build / Distribution

- Windows: `yarn dist:win`
- macOS: `yarn dist:mac`
- Linux: `yarn dist:linux`

Development uses BrowserRouter with `<http://localhost:3001>`; distribution builds use HashRouter and load `dist/renderer/index.html`.

### Releasing directly to GitHub (for auto-update)

These commands upload build artifacts and `latest*.yml` (auto-update metadata) directly to the GitHub repository configured under `publish:` in `electron-builder.yml`. Because of the `releaseType: draft` setting, every command accumulates into the **same draft release for the version** on GitHub. Once all platforms are uploaded, press "Publish release" in the GitHub UI to deliver it to users.

- Windows: `yarn release:win`
- macOS: `yarn release:mac`
- Linux: `yarn release:linux`

Before running, set a GitHub Personal Access Token (`public_repo` scope) in the `GH_TOKEN` environment variable.

```bash
export GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
```

When building each platform on separate machines, make sure `version` in `package.json` matches on all machines, then run the corresponding `release:*` on each machine.

### macOS prerequisite: environment variables for signing / notarization

To build with signing and notarization for macOS, set the following environment variables before running `yarn dist:mac`.

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="XXXXXXXXXX"
```

### Windows prerequisite: Developer Mode

To run and test unsigned local builds / distributables on Windows, enable the OS Developer Mode.

1. Settings → Privacy & security → For developers
2. Turn on "Developer Mode"
3. Restart the OS

### Project Structure (excerpt)

```text
src/
├── main/                    # Electron main: IPC / managers
│   ├── index.ts             # Startup, window creation, service initialization
│   ├── ipc/                 # IPC handlers
│   │   ├── claude/          #   Claude handlers
│   │   ├── codex/           #   Codex handlers
│   │   ├── agy/             #   Antigravity CLI handlers
│   │   ├── grok/            #   Grok handlers
│   │   └── opencode/        #   OpenCode handlers
│   ├── services/            # Services
│   │   ├── claude/          #   Claude managers
│   │   ├── codex/           #   Codex managers
│   │   ├── agy/             #   Antigravity CLI managers
│   │   ├── grok/            #   Grok managers
│   │   ├── opencode/        #   OpenCode managers
│   │   └── common/          #   Agent-agnostic shared implementations (WSL / CLI runner / cleanup / assets / JSON / git)
│   └── utils/               # Utilities
├── preload/                 # Safely bridges APIs to the renderer
│   └── agents/              #   Per-agent bridges
├── renderer/                # React + MUI UI
│   ├── agents/              #   Per-agent screens and registry
│   ├── components/          #   Shared components (TitleBar/Dashboard/AppSettings and agent-agnostic views)
│   └── i18n/locales/        #   Locales (ja/ en/ × app and every agent)
├── shared/                  # Type definitions / constants
│   └── agents/              #   Agent-common types and per-agent constants/types
└── public/                  # Icons, etc.
```

See the "agent 追加ガイド" (agent addition guide) section in `Documents/システム仕様.md` for how to add a new agent CLI.

### Technologies

- **Electron**
- **React (MUI v9)**
- **TypeScript**
- **Zustand**
- **i18next**
- **Vite**

### Creating the Windows icon

```exec
magick public/icon.png -define icon:auto-resize=256,128,96,64,48,32,24,16 public/icon.ico
```
