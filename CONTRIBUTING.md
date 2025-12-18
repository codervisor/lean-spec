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

All packages in the monorepo maintain synchronized versions automatically. The root `package.json` serves as the single source of truth.

**Packages:**
- `lean-spec` (CLI package - wrapper for Rust binary)
- `@leanspec/ui` (web UI package)
- `@leanspec/mcp` (MCP server wrapper)
- `@leanspec/desktop` (Tauri desktop app)

### Automated Version Sync

The `pnpm sync-versions` script automatically synchronizes all package versions with the root:

```bash
# Check current version alignment (dry run)
pnpm sync-versions --dry-run

# Sync all package versions to match root package.json
pnpm sync-versions
```

The script:
- Reads the version from root `package.json`
- Updates all workspace packages to match
- Reports what changed
- Runs automatically as part of `pre-release`

### Release Process

**Before Publishing:**
1. Update version in **root `package.json` only**
2. Run `pnpm sync-versions` (or it runs automatically with `pre-release`)
3. Update cross-package dependencies if needed (e.g., `@leanspec/mcp` → `lean-spec`)
4. Run `pnpm build` to verify all packages build successfully
5. Run `pnpm pre-release` to run full validation suite
   - Includes: sync-versions, typecheck, tests, build, and validate with `--warnings-only`
   - The validate step treats all issues as warnings (won't fail on complexity/token issues)
   - For stricter validation before committing spec changes, run `node bin/lean-spec.js validate` without flags
6. Test package installation locally using `npm pack`

**Version Bump Example:**
```bash
# 1. Update root version
npm version patch  # or minor/major

# 2. Sync all packages (automatic in pre-release)
pnpm sync-versions

# 3. Verify
pnpm build
pnpm test:run

# 4. Commit and publish
git add .
git commit -m "chore: release v0.2.6"
git push
```

**Why root as source of truth?**
- Single place to update version
- Prevents version drift
- Automated sync in CI/CD
- Simpler release process

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
- `packages/cli` - CLI wrapper for Rust binary (published as `lean-spec`)
- `packages/mcp` - MCP server wrapper (published as `@leanspec/mcp`)
- `packages/ui` - Web UI bundle (published as `@leanspec/ui`)
- `packages/desktop` - Tauri desktop app (not published to npm)
- `docs-site/` - Git submodule pointing to `codervisor/lean-spec-docs` (Docusaurus)

**Key files:**
- `turbo.json` - Task pipeline configuration
- `pnpm-workspace.yaml` - Workspace definitions
- `package.json` - Root scripts that invoke Turbo

**Build specific package:**
```bash
turbo run build --filter=lean-spec
turbo run build --filter=@leanspec/ui
```

**Rust Development:**
```bash
# Build Rust binaries
pnpm rust:build

# Run Rust tests
pnpm rust:test

# Copy binaries to packages
pnpm rust:copy
```

## Testing

All code changes should include tests. We have a comprehensive testing strategy:

### Test Pyramid

```
         /\
        /E2E\        ← CLI scenarios, real filesystem
       /──────\
      /Integration\   ← Cross-package, MCP tools
     /──────────────\
    /    Unit Tests   \  ← Pure function logic
   /────────────────────\
```

### When to Write Which Test Type

| Test Type | Use When | Location |
|-----------|----------|----------|
| **Unit** | Testing pure functions, validators, parsers | `*.test.ts` alongside source |
| **Integration** | Testing workflows with mocked deps | `integration.test.ts`, `list-integration.test.ts` |
| **E2E** | Testing user-facing CLI workflows | `__e2e__/*.e2e.test.ts` |
| **Regression** | Fixing a bug (must fail before, pass after) | Add to relevant `__e2e__` file |

### E2E Tests

End-to-end tests live in `packages/cli/src/__e2e__/` and test real CLI commands against actual filesystems:

- `init.e2e.test.ts` - Initialization scenarios
- `spec-lifecycle.e2e.test.ts` - Create → update → link → archive workflows
- `mcp-tools.e2e.test.ts` - MCP server tool integration

E2E tests use helpers from `e2e-helpers.ts` to:
- Create isolated temp directories
- Execute real CLI commands
- Verify filesystem state

### Regression Tests

When fixing a bug, **always add a regression test**:

1. Name it: `REGRESSION #ISSUE: brief description`
2. The test must **fail without your fix**
3. The test must **pass with your fix**
4. Add to the relevant `__e2e__` test file

See `__e2e__/regression-template.e2e.test.ts` for the full template.

### Running Tests

```bash
# Run all tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run only E2E tests
pnpm test:run -- --testPathPattern="e2e"

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui
```

### Test Helpers

- `packages/cli/src/test-helpers.ts` - Unit/integration test setup
- `packages/cli/src/__e2e__/e2e-helpers.ts` - E2E test utilities

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
