# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.10] - 2025-12-05

### Added
- **Inline metadata editing in Web UI** ([spec 134](https://web.lean-spec.dev/specs/134)) - Edit spec metadata directly in the browser
  - Status dropdown with color-coded badges (planned, in-progress, complete, archived)
  - Priority selector (low, medium, high, critical)
  - Tags editor with add/remove functionality and autocomplete suggestions
  - Inline dependency editor with add/remove support
  - Optimistic updates with automatic rollback on error
  - Works in both filesystem and multi-project modes
- **MCP config auto-setup during init** ([spec 145](https://web.lean-spec.dev/specs/145)) - Automatic MCP configuration
  - `lean-spec init` now offers to configure MCP for detected AI tools
  - Supports Claude Code (`.mcp.json`), VS Code (`.vscode/mcp.json`), Cursor (`.cursor/mcp.json`)
  - Generates correct MCP config entries with proper absolute paths
  - Zero manual configuration needed after init for workspace-local tools
- **Backfill command bootstrap mode** ([spec 144](https://web.lean-spec.dev/specs/144)) - Robust migration support
  - New `--bootstrap` flag creates frontmatter for specs without any
  - Auto-infers `status` and `created` from git history
  - Supports legacy formats (ADR, RFC, inline metadata like `**Status**: Complete`)
  - Maps ADR statuses: accepted→complete, proposed→planned, superseded→archived
- **Multi-project management UI improvements** ([spec 141](https://web.lean-spec.dev/specs/141)) - Enhanced project management
  - "Manage Projects" option in project switcher dropdown for quick access
  - Inline project name editing on /projects page
  - Color picker for project customization
  - Project path validation with status indicators (valid/invalid/missing)

### Changed
- **Multi-project mode improvements** ([spec 142](https://web.lean-spec.dev/specs/142), [spec 149](https://web.lean-spec.dev/specs/149)) - Critical UX fixes
  - All navigation links now use project-scoped URLs (`/projects/[id]/specs`)
  - Added SSR for multi-project dependencies, stats, and context pages
  - Projects page has dedicated layout without sidebar (cleaner management UX)
  - Fixed path overflow in Add Project dialog with proper truncation
  - Auto-redirect to specs list when switching projects from spec detail page
  - URL format detection with auto-redirect between single/multi-project modes
  - Dependency graph now works in multi-project mode (new API endpoint)
- **Lightweight specs for list views** - Performance optimization
  - Spec list API no longer returns full `contentMd` (can be 1MB+ total)
  - Reduces initial page load size by ~90% for projects with many specs
- **Frontmatter validation improvements** - Enhanced date parsing and validation
  - Multi-project filesystem source validates frontmatter on load
  - Better handling of malformed or missing dates

### Fixed
- **Dependencies page fails on custom ports** - `lean-spec ui --port 3002` now works
  - Pages now call data functions directly instead of fetching from hardcoded localhost:3000
  - Multi-project dependencies correctly parse `depends_on` from frontmatter
- **Spec detail dependencies not available in multi-project mode** - "View Dependencies" button now works
  - Added relationship extraction from spec content for multi-project mode
  - New `/api/projects/[id]/specs/[spec]/dependency-graph` API endpoint
- **MCP `deps` tool fails to find spec by sequence number** - Now correctly resolves spec paths
- **Duplicate icons in Status/Priority editors** - Fixed SelectValue to display explicit labels
- **Dependencies page light theme contrast** - Updated node styling for light/dark mode compatibility
  - Fixed unreadable nodes and edges in light theme
  - Consistent color palette across both themes
- **Command references updated** - Fixed `lspec` → `lean-spec` in documentation and code
- **Project switcher navigation** - Uses `window.location.assign` for better state management

## [0.2.9] - 2025-12-04

### Added
- **Project-wide dependency visualization** ([spec 137](https://web.lean-spec.dev/specs/137)) - New `/dependencies` page in Web UI
  - Bird's-eye view of entire project's dependency structure using DAG layout
  - Interactive ReactFlow graph with zoom/pan controls
  - Click nodes to navigate directly to spec details
  - Filter by status, priority, and tags
  - Color-coded nodes by status (amber=planned, blue=in-progress, green=complete)
  - Spec selector dropdown to focus on specific spec's dependency chain
  - Critical path highlighting for transitive dependencies
  - Sidebar showing focused spec details and connections
- **Enhanced context file viewer** - Improved file browsing in Web UI
  - New `ContextFileDetail` component for better file inspection
  - Dynamic file icons and colors based on file type (markdown, yaml, json, etc.)

### Changed
- **Simplified spec relationships** ([spec 139](https://web.lean-spec.dev/specs/139)) - Removed `related` field, keeping only `depends_on`
  - **Breaking**: `related` field is deprecated and will be ignored
  - Cleaner DAG-only visualization (no more cluttered network graphs)
  - Simpler mental model: every edge means "blocking dependency"
  - Tags + search now recommended for discovery instead of explicit `related` links
  - Better AI agent guidance with single relationship type
  - Removed `--related` flag from `lean-spec link` and `lean-spec unlink` commands
- **Turbo updated** to v2.6.2

### Fixed
- **Chinese/Unicode spec name support** ([spec 135](https://web.lean-spec.dev/specs/135)) - Fixed sequence number detection for non-ASCII spec names
  - Specs with Chinese characters (e.g., `001-测试`) now correctly detected
  - Japanese, Korean, and other Unicode scripts supported
- **Spec frontmatter validation** - Fixed YAML parsing errors from orphaned array items in some specs
- **Docs-site integration** - Converted from submodule to direct inclusion for simpler maintenance

## [0.2.8] - 2025-11-28

### Added
- **Safe re-initialization workflow** ([spec 127](https://web.lean-spec.dev/specs/127)) - Improved `lean-spec init` for existing projects
  - New `-f, --force` flag to force re-initialization (resets config, preserves specs)
  - Interactive strategy selection when project is already initialized:
    - **Upgrade configuration** (recommended) - Merges config with latest defaults, preserves all user content
    - **Reset configuration** - Fresh config from template, keeps `specs/` directory
    - **Full reset** - Removes everything with confirmation prompt
    - **Cancel** - Exit without changes
  - Safe defaults: `-y` flag defaults to upgrade (safest), `-f` flag resets config only
  - Shows spec count when re-initializing to inform user's decision
  - Confirmation required for destructive "full reset" option
  - Auto-creates AGENTS.md if missing during init
- **MCP `link` and `unlink` tools** ([spec 129](https://web.lean-spec.dev/specs/129)) - Manage spec relationships directly from AI agents
  - `link` tool: Add `depends_on` or `related` relationships between specs
  - `unlink` tool: Remove relationships with type filtering and `--all` support
  - Enables AI agents to maintain spec dependencies without CLI commands
  - Bidirectional link updates for `related` relationships
- **Project context visibility in Web UI** ([spec 131](https://web.lean-spec.dev/specs/131)) - View project files from the web interface
  - New `/context` page showing AGENTS.md, README.md, and project configuration
  - File viewer with syntax highlighting and search functionality
  - Quick links to open files in VS Code editor
  - Accordion-based file browser for easy navigation
- **Focus mode in spec detail view** - Distraction-free reading experience
  - Toggle button to hide sidebar and expand content area
  - Cleaner layout for reviewing spec content
- **Directory-based template support** ([spec 128](https://web.lean-spec.dev/specs/128)) - Enhanced template handling
  - Templates can now be organized in subdirectories
  - Improved `lean-spec templates` listing with better organization
  - Support for custom template directories

### Changed
- **Testing infrastructure overhaul** ([spec 130](https://web.lean-spec.dev/specs/130)) - Comprehensive test strategy documentation
  - New regression test template for consistent test patterns
  - Spec lifecycle tests for create/update/archive workflows
  - E2E test improvements for AGENTS.md handling

### Fixed
- **Tutorial URLs** - Corrected links in examples and specifications
- **Analytics tracking** - Use `ENABLE_ANALYTICS` env var for Vercel Analytics
- **README improvements** - Fixed link formatting and removed unnecessary attributes

## [0.2.7] - 2025-11-26

### Added
- **AI tool auto-detection** ([spec 126](https://web.lean-spec.dev/specs/126)) - Smart defaults for `lean-spec init`
  - Auto-detect installed AI CLI tools (Aider, Claude, Codex, Copilot, Cursor, Droid, Gemini, OpenCode, Windsurf)
  - Detection via CLI commands, config directories, and environment variables
  - Shows detected tools with reasons before AI tools prompt
  - Pre-selects detected tools in checkbox for better UX
  - Fallback to `copilot` only (AGENTS.md) when nothing detected
- **MCP-first agent experience** ([spec 121](https://web.lean-spec.dev/specs/121)) - Enhanced AI agent workflow with better SDD compliance
  - Multi-tool symlink support: `lean-spec init` now creates tool-specific symlinks (CLAUDE.md, GEMINI.md → AGENTS.md)
  - New `--agent-tools` flag for non-interactive mode (`--agent-tools all`, `--agent-tools claude,gemini`, `--agent-tools none`)
  - MCP-first AGENTS.md rewrite emphasizing MCP tools as primary method over CLI
  - New MCP prompt: `checkpoint` - Periodic SDD compliance reminder for long sessions
  - New MCP prompt: `create-spec` - Guided spec creation workflow with dependency linking
  - Stale spec warnings in board output
  - SDD Workflow Checkpoints section in AGENTS.md
- **Dependency alignment validation** ([spec 122](https://web.lean-spec.dev/specs/122)) - Automated detection of content/frontmatter misalignment
  - New `--check-deps` flag for `lean-spec validate` command
  - `DependencyAlignmentValidator` scans spec content for references to other specs
  - Detects patterns like "spec 045", "depends on", "related to", "builds on", etc.
  - Outputs actionable fix commands (e.g., `lean-spec link <spec> --related 045`)
  - MCP `validate` tool now supports `checkDeps` option
  - Added Core Rule #8 in AGENTS.md: "ALWAYS link spec dependencies"
- **Advanced search capabilities** ([spec 124](https://web.lean-spec.dev/specs/124)) - Enhanced search for power users
  - Cross-field term matching: queries now find specs where terms appear across any fields
  - Boolean operators support: `AND`, `OR`, `NOT` for complex queries
  - Field-specific search: `status:in-progress`, `tag:api`, `priority:high`, `assignee:name`
  - Date range filters: `created:>2025-11-01`, `created:2025-11-01..2025-11-15`
  - Fuzzy matching with `~` suffix for typo tolerance
  - Combined query syntax: `tag:api status:planned created:>2025-11`
  - Search syntax help in `lean-spec search --help`
  - Query guidance for AI agents in AGENTS.md and MCP tool descriptions
- **Native diagram rendering in Web UI** ([spec 119](https://web.lean-spec.dev/specs/119)) - Mermaid diagram support in spec detail view
  - Client-side Mermaid rendering for flowcharts, sequence diagrams, class diagrams, etc.
  - Dark mode theme support with automatic theme switching
  - Error handling with fallback to code block display
  - Lazy loading for optimal bundle size (only loads when diagrams present)
- **Parallel spec implementation workflow** ([spec 118](https://web.lean-spec.dev/specs/118)) - Documentation for concurrent spec development
  - Git worktrees pattern for working on multiple specs simultaneously
  - Patterns for solo developers, teams, and experimental work
  - Best practices for worktree naming, branch strategy, and cleanup
  - Added to AGENTS.md FAQ section
- **AI coding agent integration** ([spec 123](https://web.lean-spec.dev/specs/123)) - Enhanced workflow for remote coding agents
  - Support for GitHub Copilot Coding Agent, OpenAI Codex Cloud, and similar tools
  - Guidance for spec-driven task delegation to cloud agents
  - Best practices for parallel development with remote agents
- **Onboarding project context clarity** ([spec 125](https://web.lean-spec.dev/specs/125)) - Improved first-use experience
  - Clearer guidance on workspace context for AI agents
  - Enhanced AGENTS.md with project-specific context sections

### Changed
- **AGENTS.md restructured for MCP-first approach**
  - MCP tools listed before CLI commands
  - Added "How to Manage Specs" section with MCP vs CLI comparison table
  - Added "SDD Workflow Checkpoints" with before/during/after task reminders
  - Added "Common Mistakes to Avoid" section with clear ❌/✅ examples
- **Quality Standards updated** - Added `--check-deps` validation to required checks before completing work

### Fixed
- All existing specs now have aligned dependencies (19+ specs fixed after running `validate --check-deps`)

## [0.2.6] - 2025-11-25

### Added
- **Example projects scaffold** ([spec 114](https://web.lean-spec.dev/specs/114)) - Quick-start tutorial projects with `lean-spec init --example`
  - Three complete example projects: dark-theme, dashboard-widgets, api-refactor
  - Instant setup with dependencies and realistic starter code
  - `lean-spec examples` command to list available examples
  - Interactive selection mode for scaffolding
  - Automatic LeanSpec initialization in scaffolded projects
- **Chinese translation quality guidelines** ([spec 115](https://web.lean-spec.dev/specs/115)) - Professional localization standards
  - Comprehensive translation guidelines in `docs-site/AGENTS.md`
  - Translation glossary with 40+ technical terms
  - Natural Chinese expression patterns for technical content
  - Quality checklist for translation validation
- **JSON output support** - Added `--json` flag to CLI commands for programmatic use
  - `lean-spec list --json` - Machine-readable spec listing
  - `lean-spec board --json` - Kanban board data export
  - `lean-spec search --json` - Structured search results
  - `lean-spec check --json` - Validation results in JSON
  - `lean-spec files --json` - File listing in structured format
  - `lean-spec timeline --json` - Timeline data export
  - `lean-spec backfill --json` - Backfill results in JSON
  - `lean-spec gantt --json` - Gantt chart data export

### Changed
- **Template system simplification** ([spec 117](https://web.lean-spec.dev/specs/117)) - Removed template engine for direct maintenance
  - Eliminated Handlebars build layer and 15+ component files
  - Consolidated to 2 templates: `standard` (default) and `detailed` (sub-specs demo)
  - Shared AGENTS.md across templates for consistency
  - Faster iteration without build step (edit → test directly)
  - Improved AI workflow with stronger CLI command emphasis

### Fixed
- **Example project initialization** ([spec 116](https://web.lean-spec.dev/specs/116)) - Fixed missing LeanSpec files in scaffolded examples
  - `lean-spec init --example` now properly initializes LeanSpec (AGENTS.md, .lean-spec/, specs/)
  - All LeanSpec CLI commands now work in scaffolded example projects
  - Tutorial workflows function correctly out of the box

### Technical
- Removed Handlebars dependency from CLI package
- Simplified template directory structure
- Enhanced tutorial documentation with example project references
- Improved Chinese documentation quality across docs-site

## [0.2.5] - 2025-11-18

### Added
- **`@leanspec/mcp` standalone package** ([spec 102](https://web.lean-spec.dev/specs/102)) - Dedicated npm package for MCP server integration
  - Simpler onboarding: Use `npx @leanspec/mcp` directly in IDE configs
  - Better discoverability: Package name clearly indicates MCP functionality
  - Zero-config setup: Just copy-paste config snippet for Claude Desktop, Cline, or Zed
  - Automatic dependency management: npx handles installation of both `@leanspec/mcp` and `lean-spec`
  - Pure passthrough design: Delegates to `lean-spec mcp` with no additional logic
- **Enhanced dependency commands** ([spec 99](https://web.lean-spec.dev/specs/99)) - Improved CLI and MCP tools for managing spec relationships
  - Better dependency graph visualization
  - Enhanced `link` and `unlink` commands for managing `depends_on` and `related` fields
  - Improved error handling and validation for circular dependencies
- **GitHub Action for automated publishing** ([spec 16](https://web.lean-spec.dev/specs/16) - partial implementation) - CI/CD workflow for dev releases
  - Automated `@leanspec/mcp` publishing on npm with version suffix
  - Pre-release checks and validations
  - Package preparation scripts for handling workspace dependencies

### Changed
- **UI Package Consolidation** ([spec 103](https://web.lean-spec.dev/specs/103)) - Merged `@leanspec/web` into `@leanspec/ui` for simpler architecture
  - Single publishable Next.js app package instead of separate web + wrapper packages
  - Eliminated complex symlink handling and node_modules distribution issues
  - Simplified CLI launcher with direct Next.js standalone server execution
  - Cleaner monorepo structure with one less package to maintain
  - No breaking changes to user-facing `lean-spec ui` command
- **Package Publishing Workflow** - Enhanced automation for npm releases
  - New `prepare-publish` script handles workspace protocol replacement
  - New `restore-packages` script reverts changes after publishing
  - Updated CI workflow for streamlined version synchronization

### Fixed
- **`@leanspec/ui` packaging issue** ([spec 104](https://web.lean-spec.dev/specs/104)) - Fixed "Cannot find module 'next'" error in published package
  - Root cause: npm pack doesn't follow symlinks by default, so `node_modules/` symlinks in standalone build weren't resolved
  - Solution: Include actual pnpm store location (`.next/standalone/node_modules/.pnpm/`) in published files
  - Package now correctly bundles all Next.js dependencies (~18.3 MB compressed, 65 MB unpacked)
  - Users can now successfully run `lean-spec ui` via published npm package
- **UI command signal handling** - Improved process cleanup and graceful shutdown
  - Better handling of Ctrl+C and Ctrl+D to stop the UI server
  - Proper signal forwarding to child processes
- **Documentation updates** - Enhanced READMEs for MCP, UI, and CLI packages
  - Clearer setup instructions for MCP server integration
  - Updated `lean-spec ui` documentation with new package structure
  - Added examples for different IDE configurations

### Technical
- All packages bumped to version 0.2.5
- Enhanced build scripts for better monorepo management
- Improved workspace configuration with `.code-workspace` file
- Updated Vitest configuration to use UI package source path

## [0.2.4] - 2025-11-17

### Fixed
- **CLI `lean-spec ui` pnpm flow** ([spec 87](https://web.lean-spec.dev/specs/87)) - Removed `pnpm dlx --prefer-offline` forcing offline cache, so the UI command now fetches `@leanspec/ui` on demand and no longer fails when the package is missing locally.
- **Web filesystem relationship parsing** - UI development mode now respects the `SPECS_DIR` environment variable, so relationships and sub-spec counts resolve correctly when serving specs from an external workspace (fixes ENOENT errors when pointing the UI at another repo).
- **Web sidebar scroll position drift** ([spec 101](https://web.lean-spec.dev/specs/101)) - Eliminated scroll position jumping during navigation
  - Fixed React 19 `useSyncExternalStore` infinite loop by stabilizing server snapshot references
  - Isolated scroll persistence to prevent global store re-renders on every scroll event
  - Implemented component-local scroll management with `useIsomorphicLayoutEffect` for flicker-free restoration
  - Added guarded auto-anchoring that centers active spec on page refresh without disrupting user scrolling
  - Validated smooth scrolling for 100+ spec lists with no drift during rapid navigation or filtering
- **Web spec detail page sub-specs display** - Fixed missing sub-specs tabs and count indicator
  - Sub-specs tabs now correctly display when available
  - Sidebar shows sub-spec count (e.g., "+3") for specs with additional markdown files
  - Added `getSpecsWithSubSpecCount()` function for efficient sub-spec counting
  - Enhanced `SidebarSpec` type to include `subSpecsCount` field
- **`@leanspec/ui` package build** - Fixed static asset bundling for npm distribution
  - Changed from symlinks to copying static assets into standalone build
  - Ensures Next.js static files and public assets are included in published package
  - Fixed 404 errors for `/_next/static/*` and `/public/*` assets
  - Cross-platform compatible (Windows, macOS, Linux)

## [0.2.3] - 2025-11-17

### Added
- **`lean-spec ui` command** ([spec 87](https://web.lean-spec.dev/specs/87)) - Launch web interface directly from CLI
  - Monorepo mode: Auto-detects and runs local web package
  - Package manager auto-detection (pnpm/yarn/npm)
  - Port validation and configuration
  - Auto-opens browser with graceful shutdown
  - Support for both filesystem and database-backed modes
- **Web App Performance Optimizations** ([spec 83](https://web.lean-spec.dev/specs/83)) - Dramatically improved navigation speed
  - Hybrid rendering: Server-side initial load, client-side navigation
  - Navigation latency reduced from 600ms-1.2s to <100ms
  - API routes with aggressive caching and prefetching
  - Optimistic UI for instant feedback
  - Sidebar state persistence and loading shells
- **Enhanced Spec Detail UI** - Improved user experience
  - Dependency visualization with bidirectional relationships
  - Timeline view for spec history
  - Loading skeletons for better perceived performance
  - Responsive layout improvements
- **Documentation Migration** - Migrated docs-site to separate repository as submodule
  - Cleaner monorepo structure
  - Independent documentation deployment
  - Beginner-first reorganization

### Changed
- **Web App Navigation**: Switched from full server-side rendering to hybrid architecture
- **Command Interfaces**: Enhanced validation logic across CLI commands
- **Template System**: Refactored agent templates for improved status tracking
- **Mobile UX**: Enhanced sticky header behavior and mobile button styling
- **Responsive Design**: Improved mobile navigation for dashboard and specs pages

### Fixed
- i18n hook caching and loading states
- Current spec highlighting in navigation sidebar
- Mobile navigation responsiveness
- Various UI/UX refinements for web app

### Technical
- Migrated to Node.js >=20 requirement across all packages
- Added Vercel configuration for deployment
- Improved filesystem source caching
- Enhanced CSS modules TypeScript support

## [0.2.2] - 2025-11-13

### Added
- **Template Engine for AGENTS.md** ([spec 73](https://web.lean-spec.dev/specs/73)) - Dynamic template system for maintaining AGENTS.md with mechanical transformations
- **Intelligent Search Engine** ([spec 75](https://web.lean-spec.dev/specs/75)) - Relevance-ranked search with TF-IDF scoring and content-based ranking
- **Programmatic Spec Management** ([spec 59](https://web.lean-spec.dev/specs/59), Phase 1-2) - `analyze`, `split`, `compact` commands for automated spec restructuring
- **Programmatic Spec Relationships** ([spec 76](https://web.lean-spec.dev/specs/76)) - CLI and MCP tools for managing `depends_on` and `related` fields
- **Sub-spec Template System** ([spec 78](https://web.lean-spec.dev/specs/78)) - Documentation for creating and managing multi-file spec structures
- **Archiving Strategy** ([spec 77](https://web.lean-spec.dev/specs/77)) - Documentation for proper spec archival workflows

### Changed
- Search commands now use intelligent ranking algorithm prioritizing title/frontmatter matches
- MCP search tool upgraded with relevance scoring and better result filtering
- AGENTS.md validation enforces template system consistency

### Fixed
- **Critical npm publishing bug**: `workspace:*` dependency in published package causing installation failures
  - Root cause: pnpm workspace protocol leaked into published tarball
  - Fix required: Use pnpm's `--no-workspace` flag or proper bundling configuration

### In Progress
- [Spec 59](https://web.lean-spec.dev/specs/59) (Programmatic Management) - Phases 1-2 complete, remaining phases in progress
- [Spec 72](https://web.lean-spec.dev/specs/72) (AI Agent First-Use Workflow) - Planning stage
- [Spec 74](https://web.lean-spec.dev/specs/74) (Content at Creation) - Specification stage

## [0.2.1] - 2025-11-13

### Added
- Token counting commands (`lean-spec tokens`) for LLM context management
- Token-based validation thresholds replacing line-count metrics
- Chinese (zh-Hans) translations for documentation site
- UI/UX enhancements for LeanSpec Web including dark theme improvements

### Fixed
- Migration tests now use correct fixture paths
- CI workflow improvements and error handling
- Dark theme typography and status color consistency
- Validator error handling for better user experience

### Changed
- Complexity validation now uses token-based thresholds ([spec 71](https://web.lean-spec.dev/specs/71))
- Web package downgraded to Tailwind v3 for better compatibility
- Enhanced spec detail pages with timeline and metadata display

## [0.2.0] - 2025-11-10

**🎉 Official Public Release - Production Ready**

This is the official v0.2.0 release, treating v0.1.x as alpha versions. LeanSpec is now production-ready for teams and solo developers.

### Highlights

**First Principles Foundation:**
- Operationalized five first principles with validation tooling
- Context Economy enforced: Specs under 300 lines, warnings at 400+
- Signal-to-Noise validation: Every line must inform decisions
- Complete philosophy documentation guiding methodology

**Quality & Validation:**
- Comprehensive `lean-spec validate` with complexity analysis
- Lint-style output format matching ESLint/TypeScript conventions
- Sub-spec validation and relationship checking
- Dogfooding complete: All specs follow our own principles

**Documentation Excellence:**
- 100% accurate documentation site (verified)
- AI-assisted spec writing guide
- Clear WHY vs HOW separation in docs
- Comprehensive migration guides from ADRs/RFCs
- First principles deeply documented

**Developer Experience:**
- Unified dashboard (board + stats + health metrics)
- Pattern-aware list grouping with visual clarity
- Improved init flow with pattern selection
- MCP server stability improvements
- Better error handling throughout

### Added

**New Commands:**
- `lean-spec migrate` - Migrate from existing tools (ADRs, RFCs, design docs)
- `lean-spec archive` - Archive completed specs with metadata updates
- `lean-spec backfill` - Backfill timestamps from git history
- `lean-spec validate` - Comprehensive spec validation

**Core Features:**
- First principles validation (Context Economy, Signal-to-Noise, etc.)
- Complexity analysis for specs and sub-specs
- Bidirectional `related` and directional `depends_on` relationships
- Sub-spec file support with validation
- Pattern-based folder organization

### Changed

**Breaking Changes:**
- `lean-spec validate` output format now matches lint tools (ESLint-style)
- Default validation mode is quiet success (use `--verbose` for all details)

**User Experience:**
- Unified dashboard combining board + stats + health summary
- Pattern-aware list with visual icons and better grouping
- Enhanced init flow with template/pattern selection
- Clearer stats dashboard with actionable insights

### Fixed
- MCP server error handling and stability
- Documentation accuracy across all pages
- Test suite: 402/402 passing (100%)
- TypeScript/lint: Zero errors
- Frontmatter parsing edge cases

### Philosophy & Methodology

This release operationalizes LeanSpec's five first principles:

1. **Context Economy** - Fit in working memory (<300 lines target, 400 max)
2. **Signal-to-Noise Maximization** - Every word informs decisions
3. **Intent Over Implementation** - Capture why, not just how
4. **Bridge the Gap** - Both human and AI understand
5. **Progressive Disclosure** - Add complexity only when pain is felt

**Practice What We Preach:**
- All specs validated against principles
- Large specs split using sub-spec pattern
- Documentation follows progressive disclosure
- Validation tooling prevents principle violations

### Migration Notes

**From v0.1.x:**
- Run `lean-spec validate` to check your specs
- Review any specs >400 lines and consider splitting
- Update to new validate output format (ESLint-style)
- No breaking changes to commands or file formats

**From other tools:**
- Use `lean-spec migrate` for ADRs, RFCs, design docs
- See documentation for detailed migration guides
- AI-assisted migration available (Claude, Copilot)

### Acknowledgments

Built with dogfooding: 63 specs written, 28 archived, all following our own principles.

## [0.1.5] - 2025-11-10

### Fixed
- MCP server version now also read dynamically from package.json
- Complete version consistency across CLI and MCP server

## [0.1.4] - 2025-11-10

### Fixed
- Version now read dynamically from package.json instead of hardcoded in CLI
- Ensures version consistency across the package

## [0.1.3] - 2025-11-10

### Added

**New Commands:**
- `lean-spec migrate` - Migrate from existing tools (ADRs, RFCs, design docs) with AI assistance
- `lean-spec archive` - Archive completed specs with automatic frontmatter updates
- `lean-spec backfill` - Backfill timestamps and metadata from git history

**Documentation Enhancements:**
- Complete documentation site overhaul with improved information architecture
- AI-assisted spec writing guide with philosophy and best practices
- Migration guides for teams coming from ADRs, RFCs, and other tools
- First principles documentation (Context Economy, Signal-to-Noise, etc.)
- Comprehensive core concepts guide with practical examples

**Quality & Validation:**
- Enhanced `lean-spec validate` with complexity analysis
- Spec relationship clarity with bidirectional `related` and directional `depends_on`
- Improved frontmatter handling and metadata management

### Changed

**User Experience:**
- Unified dashboard combining board view with project health metrics
- Pattern-aware list grouping with visual icons and better organization
- Improved init flow with pattern selection
- Enhanced stats dashboard with actionable insights
- Better MCP error handling and stability

**Documentation:**
- Restructured docs with clearer navigation and information flow
- Updated README with AI-first positioning
- Comprehensive examples and use cases
- Improved CLI command documentation

### Fixed
- MCP server stability issues with frontmatter parsing
- TypeScript type errors in migrate command
- Documentation accuracy issues across all guides
- Frontmatter handling edge cases

### Philosophy

This UAT release operationalizes LeanSpec's five first principles:
1. **Context Economy** - Specs fit in working memory (<400 lines)
2. **Signal-to-Noise** - Every word informs decisions
3. **Intent Over Implementation** - Capture why, not just how
4. **Bridge the Gap** - Both human and AI understand
5. **Progressive Disclosure** - Add complexity only when needed

**Notable Completed Specs in this Release:**
- [063](https://web.lean-spec.dev/specs/63): Migration from existing tools
- [062](https://web.lean-spec.dev/specs/62): Documentation information architecture v2
- [061](https://web.lean-spec.dev/specs/61): AI-assisted spec writing
- [060](https://web.lean-spec.dev/specs/60): Core concepts coherence
- [058](https://web.lean-spec.dev/specs/58): Docs overview polish
- [057](https://web.lean-spec.dev/specs/57): Docs validation comprehensive
- [056](https://web.lean-spec.dev/specs/56): Docs site accuracy audit
- [055](https://web.lean-spec.dev/specs/55): README redesign (AI-first)
- [054](https://web.lean-spec.dev/specs/54): Validate output (lint-style)
- [052](https://web.lean-spec.dev/specs/52): Branding assets
- [051](https://web.lean-spec.dev/specs/51): First principles documentation
- [049](https://web.lean-spec.dev/specs/49): LeanSpec first principles foundation
- [048](https://web.lean-spec.dev/specs/48): Spec complexity analysis
- [047](https://web.lean-spec.dev/specs/47): Git backfill timestamps
- [046](https://web.lean-spec.dev/specs/46): Stats dashboard refactor
- [045](https://web.lean-spec.dev/specs/45): Unified dashboard
- [044](https://web.lean-spec.dev/specs/44): Spec relationships clarity

**Testing:**
- All 261 tests passing (100% pass rate)
- Zero critical bugs
- MCP server stable
- Documentation site builds cleanly

**Ready for:** UAT testing before official 0.2.0 launch

## [0.1.2] - 2025-11-10

### Changed

**BREAKING: Command and directory naming migration**
- **Command name**: `lspec` → `lean-spec` (full name for clarity and consistency)
- **Config directory**: `.lspec/` → `.lean-spec/` (matches package and command name)
- **Binary**: Only `lean-spec` command available (removed `lspec` alias)

**Benefits:**
- ✅ Consistency: Package name, command, and config directory all use `lean-spec`
- ✅ Clarity: `npx lean-spec` works immediately (matches npm package name)
- ✅ Simplicity: Single command to remember, no abbreviations

**Migration Guide for Existing Users:**

1. **Uninstall old version:**
   ```bash
   npm uninstall -g lean-spec
   ```

2. **Install new version:**
   ```bash
   npm install -g lean-spec
   ```

3. **Update existing projects:**
   ```bash
   # Rename config directory
   mv .lspec .lean-spec
   ```

4. **Update commands:**
   - Old: `lspec init` → New: `lean-spec init`
   - Old: `lspec board` → New: `lean-spec board`
   - Old: `npx lspec` → New: `npx lean-spec`

**All documentation, examples, and specs updated to reflect new naming.**

## [0.1.1] - 2025-11-07

### Changed

**BREAKING: `lspec validate` output format redesigned** ([spec 54](https://web.lean-spec.dev/specs/54))
- Output now follows mainstream lint tool conventions (ESLint, TypeScript, Prettier)
- File-centric grouping: All issues for a spec are shown together
- Quiet success by default: Only specs with issues are shown, passing specs are summarized
- ESLint-style format: Aligned columns with `severity  message  rule-name`
- Relative paths shown instead of absolute paths
- Exit codes remain unchanged: 0 for success/warnings, 1 for errors

### Added

**`lspec validate` new flags:**
- `--verbose`: Show all passing specs (restores detailed output)
- `--quiet`: Suppress warnings, only show errors
- `--format json`: Output results as JSON for CI integration
- `--rule <name>`: Filter issues by specific rule (e.g., `max-lines`, `frontmatter`)

**Migration Guide:**
- If you prefer the old verbose output, use `lspec validate --verbose`
- The new default shows only specs with issues for better signal-to-noise ratio
- Exit codes are unchanged, so CI pipelines should work without modification
- JSON format is available for custom parsing: `lspec validate --format json`

### Fixed
- Fixed potential crash in validate formatter when spec name is missing

## [0.1.0] - 2025-11-02

### Added

**Core Features:**
- CLI tool with comprehensive command set (`init`, `create`, `list`, `search`, `update`, `archive`, `files`, `templates`)
- Project initialization with three built-in templates (minimal, standard, enterprise)
- Spec creation with automatic directory structure and frontmatter
- Frontmatter support with status tracking, tags, priority, and custom fields
- Full-text search across specs using fuzzy matching
- Dependency tracking between specs

**Visualization & Organization:**
- `lspec board` - Kanban-style board view with status columns
- `lspec stats` - Work distribution and completion analytics
- `lspec timeline` - Chronological view of spec creation
- `lspec gantt` - Gantt chart visualization (requires mermaid-cli)
- `lspec deps` - Dependency graph visualization

**Developer Experience:**
- Interactive prompts for all commands
- Colorized terminal output
- Spinner animations for long operations
- Table-based displays for list views
- React-based UI components (Ink)

**Template System:**
- Custom template support
- Template marketplace (`lspec templates marketplace`)
- Template variables for dynamic content
- Three built-in templates with different complexity levels

**Testing & Quality:**
- 62 passing tests with comprehensive coverage
- Integration tests for all commands
- TypeScript with strict mode
- Prettier configuration

### Documentation
- Complete README with examples and API reference
- AGENTS.md for AI agent integration
- CONTRIBUTING.md for contributors
- Individual spec READMEs for all 13 completed specs

### Technical
- Built with TypeScript and tsup for fast builds
- Commander.js for CLI argument parsing
- Inquirer for interactive prompts
- Chalk and Ora for beautiful terminal UI
- Gray-matter for frontmatter parsing
- Dayjs for date handling

[0.2.10]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.10
[0.2.9]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.9
[0.2.8]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.8
[0.2.7]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.7
[0.2.6]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.6
[0.2.5]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.5
[0.2.4]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.4
[0.2.3]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.3
[0.2.2]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.2
[0.1.5]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.5
[0.1.4]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.4
[0.1.3]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.3
[0.1.2]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.2
[0.1.1]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.1
[0.1.0]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.0
