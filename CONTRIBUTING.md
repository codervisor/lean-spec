# Contributing to LeanSpec

Thanks for your interest in contributing! LeanSpec is about keeping things lean, so our contribution process is too.

## Quick Start

1. Fork the repo
2. Create a branch: `git checkout -b my-feature`
3. Make your changes
4. Run tests: `pnpm test:run`
5. Commit with clear message: `git commit -m "Add feature X"`
6. Push and open a PR

> Note: The documentation site lives in the `codervisor/lean-spec-docs` repository and is mounted here as the `docs-site/` submodule. Run `git submodule update --init --recursive` after cloning if you plan to work on docs.

## Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages (uses Turborepo with caching)
pnpm build

# Development
pnpm dev          # Start web dev server
pnpm dev:cli      # Start CLI in watch mode

# Testing & Validation
pnpm test         # Run tests (with caching)
pnpm typecheck    # Type check all packages (with caching)
```

## Version Management

All packages in the monorepo should maintain synchronized versions for consistency:

- `lean-spec` (CLI package)
- `@leanspec/core` (shared core library)
- `@leanspec/ui` (web UI package)
- `@leanspec/mcp` (MCP server wrapper)

**Before Publishing:**
1. Update version in all `package.json` files (root and all packages)
2. Update cross-package dependencies (e.g., `@leanspec/mcp` depends on `lean-spec`)
3. Run `pnpm build` to verify all packages build successfully
4. Run `node bin/lean-spec.js validate` to check specs
5. Test package installation locally using `npm pack`

**Example version bump:**
```bash
# Bump all packages from 0.2.4 to 0.2.5
# Update: package.json, packages/cli/package.json, packages/core/package.json,
#         packages/ui/package.json, packages/mcp/package.json
# Also update: packages/mcp/package.json dependency on lean-spec
```

### Docs Site Submodule

The docs are maintained in [codervisor/lean-spec-docs](https://github.com/codervisor/lean-spec-docs) and pulled in via the `docs-site/` git submodule. Typical workflow:

```bash
git submodule update --init --recursive  # first time or when the submodule is missing
cd docs-site
pnpm install                            # install docs dependencies once inside the submodule
pnpm start                              # develop docs locally
git commit -am "docs: ..." && git push  # push changes from inside the submodule

cd ..
git add docs-site                       # stage updated submodule pointer in this repo
git commit -m "chore: bump docs-site"
```

### Monorepo with Turborepo

This project uses [Turborepo](https://turbo.build/) to manage the monorepo with pnpm workspaces:

- **Parallel execution** - Independent packages build simultaneously
- **Smart caching** - Only rebuilds what changed (126ms vs 19s!)
- **Task dependencies** - Dependencies built first automatically

**Packages:**
- `packages/cli` - Main CLI tool (published as `lean-spec`)
- `packages/core` - Core spec parsing/validation library (internal)
- `packages/web` - Live specs showcase (Next.js app)
- `docs-site/` - Git submodule pointing to `codervisor/lean-spec-docs` (Docusaurus)

**Key files:**
- `turbo.json` - Task pipeline configuration
- `pnpm-workspace.yaml` - Workspace definitions
- `package.json` - Root scripts that invoke Turbo

**Build specific package:**
```bash
turbo run build --filter=lean-spec
turbo run build --filter=@leanspec/core
```

## Testing

All code changes should include tests. We have comprehensive test coverage:

- Unit tests for individual functions
- Integration tests for workflows
- Test helpers for common patterns

See existing test files for patterns.

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

Keep changes aligned with LeanSpec first principles (see [specs/049-leanspec-first-principles](specs/049-leanspec-first-principles)):

1. **Context Economy** - Specs must fit in working memory (<400 lines)
2. **Signal-to-Noise Maximization** - Every word informs decisions
3. **Intent Over Implementation** - Capture why, not just how
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add complexity when pain is felt

When in doubt: **Clarity over documentation, Essential over exhaustive, Speed over perfection**

## Areas for Contribution

### High Priority (v0.3.0)
- Programmatic spec management tools (spec 059)
- VS Code extension (spec 017)
- GitHub Action for CI integration (spec 016)
- Copilot Chat integration (spec 034)
- Live specs showcase on docs site (spec 035)

### Currently Implemented ✅
- Core CLI commands (create, list, update, archive, search, deps)
- YAML frontmatter with validation and custom fields
- Template system with minimal/standard/enterprise presets
- Visualization tools (board, stats, timeline, gantt)
- Spec validation with complexity analysis
- MCP server for AI agent integration
- Git-based timestamp backfilling
- Comprehensive test suite with high coverage
- First principles documentation
- Relationship tracking (depends_on, related)

### Future Ideas (v0.4.0+)
- PM system integrations (GitHub Issues, Jira, Azure DevOps) - spec 036
- Spec coverage reports
- Additional language-specific templates
- Export to other formats (PDF, HTML dashboards)
- Automated spec compaction and transformation

## Questions?

Open an issue or discussion. We're here to help!
