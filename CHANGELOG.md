# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[0.1.4]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.4
[0.1.3]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.3
[0.1.2]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.2
[0.1.1]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.1
[0.1.0]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.0
