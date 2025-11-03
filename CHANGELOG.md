# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-11-03

### Breaking Changes

**Default Folder Structure Changed:**
- New projects now use **flat structure** with global sequence numbers by default
- Old default: `specs/20251103/001-feature/` (date-based grouping)
- New default: `specs/001-feature/` (flat with global numbering)

**Migration:**
- ✅ Existing projects continue working without changes
- ✅ Date-based structure still supported via config
- ✅ See [Migration Guide](docs/MIGRATION.md) for details

### Changed

**Templates:**
- All built-in templates (minimal, standard, enterprise) now default to flat structure
- Date-based grouping available via `pattern: "custom"` and `groupExtractor: "{YYYYMMDD}"`

**Configuration:**
- Default config now uses `pattern: "flat"` with empty `prefix`
- Results in cleaner, simpler folder organization: `specs/001-feature/`

### Added

**Documentation:**
- New [Migration Guide](docs/MIGRATION.md) with step-by-step instructions
- Updated README.md with flat structure examples
- Updated AGENTS.md with folder structure section

### Why This Change?

**Simplification for most users:**
- Flat structure is easier to navigate for solo devs and small teams
- Global sequence numbers (001, 002, 003...) are simpler to reference
- No date folders to dig through: just "spec 024" instead of "specs/20251103/024"

**Backwards compatible:**
- Existing projects maintain their structure
- All commands work with both patterns
- Easy migration path if desired

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

[0.1.0]: https://github.com/codervisor/lean-spec/releases/tag/v0.1.0
