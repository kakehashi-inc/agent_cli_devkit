# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.3] - 2026-10-16

### Added

- Agent and skill lists show each entry's model and reasoning level, plus key settings such as allowed tools and permissions, below the description.
- Cleanup can remove temporary files that agents leave outside their own folders: Claude Code project working folders and MCP logs (deleted together with the project, and projects that only have temporary files are listed too), Codex temporary files and Windows sandbox logs, Grok temporary files, and old Agy executables left behind by updates. Items that may still be in use are shown but cannot be selected.
- OpenCode session history can be deleted per session from Cleanup without touching sign-in information. The row appears only when there are sessions to delete, and sessions that were updated in the last 5 minutes, or whose subagent sessions were, are kept.
- The OpenCode model setting can be edited in the settings table.
- Uninstalling a Grok plugin lists the other plugins from the same repository that will be removed with it.
- Settings editors for every agent were updated to the latest CLI references. Added per agent: Claude +39, Codex +19, Agy +6, Grok +141, OpenCode +24.

### Changed

- The OpenCode screens support OpenCode 2 only and find it by its `opencode2` command.
- Deleting a Claude Code project in Cleanup removes it together with its memory. A project with a running session is kept as it is, including its memory; a session counts as running when Claude Code has registered it or its conversation was updated in the last 10 minutes.
- Cleanup covers newer data folders for every agent, including old Codex and Grok versions left behind by updates.
- Re-enabling an OpenCode plugin puts it back where it was in the plugin list.
- Refresh on the plugin screens and on the Agy and OpenCode screens finds newly installed CLIs and WSL distributions without restarting the app. On Windows itself, restart the app if an installer added a new folder to PATH.
- Plugin catalogs show 200 entries at a time with a button to show more, and the marketplace filter also lists built-in catalogs.

### Removed

- Removed the Grok "Import official skills" button, because xAI no longer publishes these skills separately; Grok now installs them itself.
- Removed settings that the CLIs no longer support or that are now edited as part of their parent setting. Removed per agent: Claude −14, Codex −15, Agy −0, Grok −15, OpenCode −60.

### Fixed

- Skill lists no longer show folders that are not skills, such as the "synced" folder Claude Code uses for skills synced from claude.ai and the hidden folder it keeps for skills removed by that sync. Uploading a skill named "synced" is refused so the synced skills cannot be overwritten.
- Skill and agent descriptions written over several lines or with quotes and escapes display as intended, instead of showing symbols such as ">" or "|-".
- A failed agent or skill upload no longer removes the existing entries it was replacing, and ZIP archives containing unsafe file names are refused.
- Deleting folders in Cleanup and when removing agents, skills, or plugins never follows symbolic links or junctions.
- Number settings are no longer silently rounded or clamped. Values outside the accepted range are highlighted, and saving is refused with a message that shows the accepted range.
- Settings, MCP, and plugin files that start with a UTF-8 byte order mark are read and edited instead of being treated as invalid.
- Plugin managers show the real enabled state of Agy and Grok plugins, list only your own Claude Code plugins, and disable Uninstall or the enable toggle, with an explanation, where the CLI cannot do it.
- Enabling or disabling a Codex plugin works however its entry is written in the configuration file, and leaves the file unchanged if it cannot be edited safely.
- Commands run in WSL no longer depend on the distribution's default shell and find CLIs installed with bun or an official installer even when their folder is only added to PATH in .bashrc. Every CLI command runs from your home folder, and a command that times out is stopped together with the processes it started.

## [0.6.2] - 2026-08-13

### Changed

- Downloaded agent and skill archives are now named with the kind first — skills_claude.zip instead of claude_skills.zip — so they group together by kind in a file listing. When you download exactly one agent or skill, its name is appended (for example skills_claude_my-skill.zip), making single downloads easier to tell apart.

### Fixed

- Uploading an agent or skill no longer resets its last-modified date to the day of the upload. A ZIP is now expanded with the dates recorded inside it, and a single Markdown upload keeps the date of the file you picked, so the list shows when the agent or skill was actually last edited. ZIP archives downloaded from this app record local file times, so downloading and uploading again keeps the original dates (within the 2-second precision of the ZIP format).

## [0.6.1] - 2026-08-06

### Added

- Reconciled every agent's settings registry against its official reference (Claude settings docs, Codex config reference, Antigravity CLI docs, Grok settings docs and source, OpenCode JSON schema) and added the newly documented, user-facing settings. Added per agent: Claude +16, Codex +8, Grok +15, OpenCode +1, Agy +0. Enterprise/managed-only keys were intentionally excluded.
- The Claude Code default permission mode now offers `auto` and `manual` in addition to the existing choices, so a session can be started in auto mode.
- The Codex web search mode is now a form field with its four official choices instead of being direct-edit only.

### Changed

- Settings descriptions now say only what a setting does. Notes about which configuration file a value is honored in, and reminders to edit the file directly, have been dropped, and descriptions that merely restated the value type have been rewritten to describe the setting.
- The Codex reasoning-effort choices now match the official reference.

### Removed

- Removed the duplicate Claude Code entry for disabling auto mode, plus settings that are legacy aliases or no longer exist in the official references. Removed per agent: Claude −1, Codex −1, Grok −1.

## [0.6.0] - 2026-07-23

### Added

- Reconciled every agent's settings registry against its official reference (Claude settings docs, Codex config reference, Grok source/config docs, OpenCode JSON schema, Antigravity CLI docs) and added newly documented, user-facing settings. Added per agent: Claude +5, Codex +10, Grok +42, OpenCode +3, Agy +0. Enterprise/managed-only keys were intentionally excluded.

### Removed

- Removed settings that are managed-policy-only or no longer exist in the official reference. Removed per agent: Claude −1, Codex −3, Grok −4, OpenCode −2, Agy −0.

## [0.5.9] - 2026-07-22

### Added

- Settings editors for every agent (Claude / Codex / Grok / Agy / OpenCode) can now be filtered by keyword, matching the setting key, display name, or description with space-separated terms as an order-independent AND search. Matching groups expand automatically while filtering.
- Nested scalar settings can now be edited from the settings form instead of only through direct file editing. Any setting whose object keys lead to a single string, number, or boolean value (with no arrays or open-ended maps along the way) is now a first-class form field — for example Claude's `permissions.defaultMode`, `sandbox.*`, `statusLine.*`, and `attribution.*`; Codex's `otel.*`, `memories.*`, and `apps._default.*`; and OpenCode's `server.*`, `compaction.*`, and `permission.*`.

### Fixed

- Saving settings from the form no longer discards comments, blank lines, or formatting elsewhere in the settings file. Only the changed values are rewritten, so the rest of the file — including hand-written comments — is left intact.

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
