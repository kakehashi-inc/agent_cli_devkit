# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.5.4] - 2026-07-13

### Changed

- Merged Claude Developer Tool and Codex Developer Tool into a single application: Agent CLI DevKit. All features of both tools are now available in one app, with the dashboard and title-bar navigation grouped by agent.
- The title bar now shows one button per agent group. Clicking a group expands its feature icons; opening another group collapses the previous one.
- Settings editing (settings.json / config.toml) moved from a tab inside each Agent / Skill manager to its own dedicated page per agent.
- Dashboard cards are more compact: smaller icons placed to the left of the text, reducing vertical space so more features fit on screen.
- Settings editors updated to the latest official options: corrected Claude Code teammate mode choices, added Claude Code auto-compact and file checkpointing settings, added the new "indexed" web search mode for Codex, allowed custom Codex model providers, and made Grok reasoning effort a proper selection.

### Added

- Grok group: manage Grok CLI (Grok Build) alongside Claude and Codex — MCP server management, agent / skill management with official xAI skill import and settings editing, and cleanup that also reclaims old executable versions left behind by updates.

### Fixed

- Codex official skill import showed an empty list because the official openai/skills repository moved its catalog to a new location. The importer now finds the official skills again.
