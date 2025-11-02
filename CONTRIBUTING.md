# Contributing to LeanSpec

Thanks for your interest in contributing! LeanSpec is about keeping things lean, so our contribution process is too.

## Quick Start

1. Fork the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Run tests: `pnpm test:run`
5. Commit with clear message: `git commit -m "Add feature X"`
6. Push and open a PR

## Development Setup

```bash
# Install dependencies
pnpm install

# Run in watch mode while developing
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build
pnpm build
```

## Testing

All code changes should include tests. We have comprehensive test coverage:

- **61 tests** across 4 test files
- Unit tests for individual functions
- Integration tests for workflows
- Test helpers for common patterns

See [docs/testing.md](docs/testing.md) for details.

```bash
# Run tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui
```

## Code Style

We use:
- TypeScript for type safety
- Prettier for formatting

Run `pnpm format` before committing.

## Philosophy

Keep changes aligned with LeanSpec principles:
- **Clarity over documentation** - Make code obvious
- **Essential over exhaustive** - Focus on what matters
- **Speed over perfection** - Ship and iterate

## Areas for Contribution

### High Priority
- Test coverage for visualization commands (board, stats, timeline, etc.)
- Performance optimizations for large spec directories
- Documentation improvements
- Additional project templates

### Implemented Features
- ✅ Core CLI commands (create, list, update, archive)
- ✅ YAML frontmatter with validation
- ✅ Template system with minimal/standard/enterprise presets
- ✅ Visualization tools (board, stats, timeline, deps, search, gantt, files)
- ✅ Comprehensive test suite (61 tests)

### Future Ideas
- VS Code extension
- GitHub Action for CI integration
- More language-specific templates (Python, Go, Rust, etc.)
- Spec validation and linting tools
- Export to other formats (Markdown reports, HTML dashboards)

## Questions?

Open an issue or discussion. We're here to help!
