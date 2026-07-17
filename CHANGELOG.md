# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.8] - 2026-07-18

### Added

- Added an Agy group that manages Agy CLI (Antigravity CLI) development environments. Data from the separate Agy product and Antigravity IDE is excluded.
- Added an OpenCode group that manages OpenCode development environments. Only OpenCode-owned global locations are managed.
- Added an App Settings screen for theme (light/dark) and language (Japanese/English). Edits take effect only when Save is pressed and are persisted for the next launch; until first saved, the OS theme and language are inherited as before.

### Changed

- The dashboard now shows each agent group as an exclusive accordion (opening one closes the others), and the last expanded group is restored on the next launch.
- The burger menu is now grouped by agent as a two-level cascading menu whose submenus open on hover, the per-feature tool buttons in the title bar are slightly smaller, and theme/language switching moved from the title bar to the App Settings screen.
- All MCP management screens now use a unified table layout: column widths are derived from the window width with the arguments column widest, long values wrap instead of being truncated, and the enable/disable toggle sits right after the server name.

## [0.5.7] - 2026-07-17

### Added

- Agent and skill lists for Claude, Codex, and Grok can now be filtered by name or description, with space-separated terms matched as an order-independent AND search.
- Agent and skill names now include a shortcut that reveals the corresponding file or opens its directory in the operating system's default file manager, including WSL items through Windows Explorer.

## [0.5.6] - 2026-07-16

### Changed

- Refreshed the Claude, Codex, and Grok settings editors against current CLI references: added newly supported scalar and structured settings, updated model/reasoning/provider suggestions while retaining custom-value support, and gave every field a readable title with its exact key and a specific description. Structured settings now identify direct-file editing in their own value rows instead of using a global notice.
- Improved unset handling across all settings editors: documented defaults are shown where confirmed, fields without a fixed default remain simply unset, text and number inputs no longer use unset placeholders, and clearing a saved input removes its configuration key.

### Fixed

- Saved values outside the current suggestions remain visible and preserved, while saving another field no longer removes untouched structured or future settings; invalid existing TOML is also rejected before changes are written.

## [0.5.5] - 2026-07-13

### Added

- Plugin Manager for every agent group (Claude / Codex / Grok): manage plugins and marketplaces from the GUI — install, uninstall, and enable/disable plugins, from marketplace catalogs or individual repositories — on both the host OS and WSL.

## [0.5.4] - 2026-07-13

### Changed

- Merged Claude Developer Tool and Codex Developer Tool into a single application: Agent CLI DevKit. All features of both tools are now available in one app, with the dashboard and title-bar navigation grouped by agent.
- The title bar now shows one button per agent group. Clicking a group expands its feature icons; opening another group collapses the previous one.
- Dashboard cards are more compact: smaller icons placed to the left of the text, so more features fit on screen.
- Settings editing (settings.json / config.toml) moved from a tab inside each Agent / Skill manager to its own dedicated page per agent.
- The direct-edit dialog for settings files no longer shows nested scrollbars; the dialog has a fixed height and only the text editor scrolls.
- Settings editors updated to the latest official options for each CLI.
- Default file names for downloaded agent / skill archives now include the CLI name (e.g. claude_skills.zip).
- The Grok agents tab rejects ZIP archives that contain files inside subdirectories, because Grok only recognizes agent definitions placed directly in its agents folder.

### Added

- Grok group: manage Grok CLI (Grok Build) alongside Claude and Codex — MCP server management, agent / skill management with official xAI skill import and settings editing, and cleanup that also reclaims old executable versions left behind by updates.
- "Full" view in Agent / Skill lists: each row now offers both "Header" (frontmatter only) and "Full" (entire file content) views.

### Fixed

- Codex official skill import showed an empty list because the official openai/skills repository moved its catalog to a new location. The importer now finds the official skills again.
