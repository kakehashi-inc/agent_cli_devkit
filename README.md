# Agent CLI DevKit

## 1. System Overview

Agent CLI DevKit is an Electron desktop tool that manages the development environments of AI agent CLIs (Claude Code / Codex CLI / Grok CLI, etc.) in a single application. It merges all features of Claude Developer Tool and Codex Developer Tool, adds support for Grok CLI (Grok Build), and presents everything in a UI grouped by agent (Claude / Codex / Grok).

### Features

**Claude group**

- **Claude Desktop MCP Manager** — Enable, disable, and reorder Claude Desktop MCP servers.
- **Claude Code MCP Manager** — Manage Claude Code (CLI) profile MCP servers (~/.claude.json). Supports both the native OS and WSL distributions.
- **Claude Code Agent / Skill Manager** — List Claude Code agents and skills, download/upload them as ZIP archives, and import official Anthropic skills.
- **Claude Code Settings** — Edit ~/.claude/settings.json items in a table, or edit the file directly.
- **Claude Code Cleanup** — Reclaim disk space by deleting history, caches, temporary files, and logs under ~/.claude.

**Codex group**

- **Codex MCP Manager** — Enable, disable, and reorder Codex (CLI) MCP servers (~/.codex/config.toml). Supports both the native OS and WSL distributions.
- **Codex Agent / Skill Manager** — Manage Codex custom agents (~/.codex/agents) and skills (~/.agents/skills), and import official OpenAI skills.
- **Codex Settings** — Edit ~/.codex/config.toml items in a table, or edit the file directly.
- **Codex Cleanup** — Reclaim disk space by deleting history, caches, temporary files, logs, and sessions under ~/.codex.

**Grok group**

- **Grok MCP Manager** — Enable, disable, and reorder Grok (CLI) MCP servers (~/.grok/config.toml). Supports both the native OS and WSL distributions.
- **Grok Agent / Skill Manager** — Manage Grok custom agents (~/.grok/agents) and skills (~/.grok/skills), and import official xAI skills.
- **Grok Settings** — Edit ~/.grok/config.toml items in a table, or edit the file directly.
- **Grok Cleanup** — Reclaim disk space by deleting history, memory, and logs under ~/.grok, plus old executable versions (about 130 MB each) left behind by updates.

The dashboard and the title-bar navigation display every feature grouped by Claude / Codex / Grok. The internal structure is also split into per-agent files, making it easy to add new agent CLIs (see `Documents/システム仕様.md` for details).

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
│   │   └── grok/            #   Grok handlers
│   ├── services/            # Services
│   │   ├── claude/          #   Claude managers
│   │   ├── codex/           #   Codex managers
│   │   ├── grok/            #   Grok managers
│   │   └── common/          #   Agent-agnostic shared implementations (WSL/git)
│   └── utils/               # Utilities
├── preload/                 # Safely bridges APIs to the renderer
│   └── agents/              #   Per-agent bridges (claude.ts / codex.ts / grok.ts)
├── renderer/                # React + MUI UI
│   ├── agents/              #   Per-agent screens (claude/ codex/ grok/) and registry
│   ├── components/          #   Shared components (TitleBar/Dashboard, etc.)
│   └── i18n/locales/        #   Locales (ja/ en/ × app/claude/codex/grok)
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
