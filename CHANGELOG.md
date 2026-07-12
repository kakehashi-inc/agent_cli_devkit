# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
