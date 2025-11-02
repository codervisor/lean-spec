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

All code changes should include tests. We have:
- Unit tests for individual functions
- Integration tests for workflows
- Test helpers for common patterns

See [docs/TESTING.md](../docs/TESTING.md) for details.

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
- Additional CLI commands (better search, dependencies, etc.)
- Template improvements
- Test coverage for advanced features
- Documentation improvements

### Future Ideas
- VS Code extension
- GitHub Action for CI integration
- More templates (Python, Go, etc.)
- Spec validation tools

## Questions?

Open an issue or discussion. We're here to help!
