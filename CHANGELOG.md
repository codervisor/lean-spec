# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[0.1.1]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.1
[0.1.0]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.0
