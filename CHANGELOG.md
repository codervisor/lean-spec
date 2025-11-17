# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
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
- **`lean-spec ui` command** (spec 087) - Launch web interface directly from CLI
  - Monorepo mode: Auto-detects and runs local web package
  - Package manager auto-detection (pnpm/yarn/npm)
  - Port validation and configuration
  - Auto-opens browser with graceful shutdown
  - Support for both filesystem and database-backed modes
- **Web App Performance Optimizations** (spec 083) - Dramatically improved navigation speed
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
- **Template Engine for AGENTS.md** (spec 073) - Dynamic template system for maintaining AGENTS.md with mechanical transformations
- **Intelligent Search Engine** (spec 075) - Relevance-ranked search with TF-IDF scoring and content-based ranking
- **Programmatic Spec Management** (spec 059, Phase 1-2) - `analyze`, `split`, `compact` commands for automated spec restructuring
- **Programmatic Spec Relationships** (spec 076) - CLI and MCP tools for managing `depends_on` and `related` fields
- **Sub-spec Template System** (spec 078) - Documentation for creating and managing multi-file spec structures
- **Archiving Strategy** (spec 077) - Documentation for proper spec archival workflows

### Changed
- Search commands now use intelligent ranking algorithm prioritizing title/frontmatter matches
- MCP search tool upgraded with relevance scoring and better result filtering
- AGENTS.md validation enforces template system consistency

### Fixed
- **Critical npm publishing bug**: `workspace:*` dependency in published package causing installation failures
  - Root cause: pnpm workspace protocol leaked into published tarball
  - Fix required: Use pnpm's `--no-workspace` flag or proper bundling configuration

### In Progress
- Spec 059 (Programmatic Management) - Phases 1-2 complete, remaining phases in progress
- Spec 072 (AI Agent First-Use Workflow) - Planning stage
- Spec 074 (Content at Creation) - Specification stage

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
- Complexity validation now uses token-based thresholds (spec 071)
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
- 063: Migration from existing tools
- 062: Documentation information architecture v2
- 061: AI-assisted spec writing
- 060: Core concepts coherence
- 058: Docs overview polish
- 057: Docs validation comprehensive
- 056: Docs site accuracy audit
- 055: README redesign (AI-first)
- 054: Validate output (lint-style)
- 052: Branding assets
- 051: First principles documentation
- 049: LeanSpec first principles foundation
- 048: Spec complexity analysis
- 047: Git backfill timestamps
- 046: Stats dashboard refactor
- 045: Unified dashboard
- 044: Spec relationships clarity

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

**BREAKING: `lspec validate` output format redesigned** (spec 054)
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

[0.2.3]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.3
[0.2.2]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.2
[0.1.5]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.5
[0.1.4]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.4
[0.1.3]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.3
[0.1.2]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.2
[0.1.1]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.1
[0.1.0]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.0
