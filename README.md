# Agent CLI DevKit

## 1. System Overview

Agent CLI DevKit is an Electron desktop tool that manages the development environments of AI agent CLIs (Claude Code / Codex CLI / Antigravity CLI / Grok CLI / OpenCode 2) in a single application. It presents each CLI's tools in the fixed order Claude / Codex / Agy / Grok / OpenCode.

### Features

**Claude group**

- **Claude Desktop MCP Manager** — Enable, disable, and reorder Claude Desktop MCP servers.
- **Claude Code MCP Manager** — Manage Claude Code MCP servers.
- **Claude Code Agent / Skill Manager** — Manage agents, skills, and commands, download and upload them as ZIP files, and import official Anthropic skills.
- **Claude Code Plugin Manager** — Manage plugins and marketplaces.
- **Claude Code Settings** — Edit settings, hooks, status lines, external commands, permissions, instructions, output styles, rules, and workflows.
- **Claude Code Cleanup** — Delete history, caches, temporary files, logs, and per-project data.

**Codex group**

- **Codex MCP Manager** — Enable, disable, and reorder Codex MCP servers.
- **Codex Agent / Skill Manager** — Manage custom agents and skills, and import official OpenAI skills.
- **Codex Plugin Manager** — Manage plugins and marketplaces.
- **Codex Settings** — Edit settings, hooks, status lines, external commands, permissions, and instructions.
- **Codex Cleanup** — Delete history, caches, temporary files, logs, sessions, and old versions. Sessions can be selected by date or by project.

**Agy group (Antigravity CLI only)**

- **Agy CLI MCP Manager** — Enable, disable, and reorder global MCP servers.
- **Agy CLI Agent / Skill Manager** — Manage custom agents and skills.
- **Agy CLI Plugin Manager** — Install, uninstall, enable, and disable plugins.
- **Agy CLI Settings** — Edit settings, hooks, status lines, external commands, permissions, instructions, and rules.
- **Agy CLI Cleanup** — Delete caches, logs, history, conversation data, per-project data, and old executables.

**Grok group**

- **Grok MCP Manager** — Enable, disable, and reorder Grok MCP servers.
- **Grok Agent / Skill Manager** — Manage custom agents, skills, and commands.
- **Grok Plugin Manager** — Manage plugins and marketplace sources.
- **Grok Settings** — Edit settings, hooks, status lines, external commands, permissions, instructions, rules, and workflows.
- **Grok Cleanup** — Delete history, memory, logs, caches, temporary files, per-project data, and old executables.

**OpenCode group (OpenCode 2)**

- **OpenCode MCP Manager** — Enable, disable, and reorder OpenCode MCP servers.
- **OpenCode Agent / Skill Manager** — Manage custom agents, skills, and commands.
- **OpenCode Plugin Manager** — Install, uninstall, enable, and disable plugins.
- **OpenCode Settings** — Edit settings, external commands, permissions, and instructions.
- **OpenCode Cleanup** — Delete caches, logs, snapshots, prompt history, session history, and per-project data.

Every feature works on the native OS and in WSL distributions. Cleanup that uses a CLI's database in WSL needs sqlite3 (3.33 or newer) in the distribution.

See `Documents/システム仕様.md` for detailed behavior.

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
│   │   └── common/          #   Agent-agnostic shared implementations (WSL / CLI runner / cleanup / assets / profile tabs / files / JSON / TOML / SQLite / git)
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
