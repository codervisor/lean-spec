````skill
---
name: leanspec-development
description: Development workflows and contribution guidelines for LeanSpec. Use when contributing code or setting up development environment.
compatibility: Requires pnpm, Node.js 18+, and Rust toolchain
metadata:
  author: LeanSpec
  version: 0.2.0
  homepage: https://leanspec.dev
---

# LeanSpec Development Skill

Guides AI agents through LeanSpec development: setup, testing, building, and contributing code.

## When to Use

Activate when:
- Setting up development environment
- Writing or running tests
- Building or debugging packages
- Contributing code changes
- Understanding monorepo structure
- Running validation checks

## Core Principles

1. **Use pnpm** - Never npm or yarn
2. **DRY** - Extract shared logic, avoid duplication
3. **Test What Matters** - Business logic and data integrity, not presentation
4. **Leverage Turborepo** - Caching speeds builds from 19s → 126ms
5. **Maintain i18n** - Update both en and zh-CN translations
6. **Follow Rust Quality** - All code must pass `cargo clippy -- -D warnings`

## Essential Commands

### Setup & Build
```bash
pnpm install        # Install all dependencies
pnpm build          # Build all packages (cached)
pnpm rust:build     # Build Rust binaries
pnpm rust:copy      # Copy binaries to packages
```

### Development
```bash
pnpm dev            # Web UI + Rust server
pnpm dev:cli        # CLI in watch mode
pnpm dev:desktop    # Desktop app
pnpm dev:web        # Web UI only
```

### Testing
```bash
pnpm test           # All tests (watch mode)
pnpm test:run       # All tests (CI mode)
pnpm rust:test      # Rust tests only

# Specific test types
pnpm test:run -- --testPathPattern="e2e"     # E2E only
pnpm test:run -- --testPathPattern="unit"    # Unit only
```

### Quality & Validation
```bash
pnpm typecheck      # TypeScript type checking
pnpm lint:rust      # Rust clippy checks
pnpm format         # Format code (TS + Rust)
pnpm pre-release    # Full validation suite
```

### Monorepo
```bash
# Build specific package
turbo run build --filter=lean-spec
turbo run build --filter=@leanspec/ui

# Version sync
pnpm sync-versions --dry-run    # Check alignment
pnpm sync-versions              # Sync all versions
```

## Testing Strategy

### What to Test

✅ **Test**: Algorithms, parsers, validators, file operations, data transformations  
❌ **Don't test**: CSS classes, icons, trivial getters, third-party libraries

### Test Types

| Type | When | Location | Example |
|------|------|----------|---------|
| **Unit** | Pure functions, validators | `*.test.ts` | Parser logic, validation rules |
| **Integration** | Cross-package workflows | `integration.test.ts` | MCP tool chains |
| **E2E** | User-facing CLI workflows | `__e2e__/*.e2e.test.ts` | `create → update → link` |
| **Regression** | Bug fixes (must fail first) | Relevant `__e2e__` file | REGRESSION #123 |

### Regression Test Template

```typescript
it('REGRESSION #123: should handle edge case', async () => {
  // 1. Setup - create conditions that trigger bug
  // 2. Execute - run the command that failed
  // 3. Assert - verify fix resolves the issue
  // 4. This test MUST fail without the fix
});
```

## Common Workflows

### Adding a Feature
1. Search/create spec: `lean-spec create my-feature`
2. Mark in-progress: `lean-spec update <spec> --status in-progress`
3. Implement with tests
4. Validate: `pnpm pre-release`
5. Mark complete: `lean-spec update <spec> --status complete`

### Fixing a Bug
1. Write regression test (must fail)
2. Fix the bug (test now passes)
3. Add test to E2E suite
4. Validate: `pnpm test:run`

### Adding i18n Strings
Update **both** locales:
- `packages/ui/src/locales/[en|zh-CN]/common.json`
- `packages/mcp/src/locales/[en|zh-CN]/common.json`
- `docs-site/i18n/zh-Hans/` (for docs)

### UI Component Development
**MANDATORY**: All components must support light AND dark themes.

```typescript
// ❌ Don't
text-blue-300
bg-blue-950/60

// ✅ Do
text-blue-700 dark:text-blue-300
bg-blue-100 dark:bg-blue-950/60
```

## Pre-PR Checklist

```bash
# Run all checks
pnpm pre-release
```

This runs:
- ✅ `pnpm sync-versions` - Version alignment
- ✅ `pnpm typecheck` - TypeScript types
- ✅ `pnpm test:run` - All tests
- ✅ `pnpm build` - Build all packages
- ✅ `pnpm validate` - Spec validation (warnings only)
- ✅ Rust clippy - Code quality

Manual checks:
- [ ] i18n updated (if UI/MCP changes)
- [ ] Regression test added (if bug fix)
- [ ] Light/dark theme tested (if UI changes)
- [ ] Related specs updated

## Monorepo Structure

```
packages/
├── cli/              # lean-spec (Rust wrapper)
├── mcp/              # @leanspec/mcp (MCP server)
├── ui/               # @leanspec/ui (Web bundle)
├── ui-components/    # Shared components (internal)
└── desktop/          # Tauri app (not published)

rust/
├── leanspec-cli/     # Rust CLI
├── leanspec-mcp/     # Rust MCP server
├── leanspec-core/    # Shared core
└── ...

docs-site/            # Docusaurus (git subtree)
```

**Key Files**:
- `turbo.json` - Task pipeline
- `pnpm-workspace.yaml` - Workspace config
- Root `package.json` - Single source of truth for versions

## Reference Documentation

For deep dives:
- [references/SETUP.md](./references/SETUP.md) - Environment setup and dependencies
- [references/CONTRIBUTING.md](./references/CONTRIBUTING.md) - Contribution workflow and testing
- [references/MONOREPO.md](./references/MONOREPO.md) - Turborepo and version management
- [references/RULES.md](./references/RULES.md) - Mandatory rules and patterns
- [references/RUST-QUALITY.md](./references/RUST-QUALITY.md) - Rust quality standards

## Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf .turbo node_modules packages/*/node_modules
pnpm install
pnpm build
```

### Test Failures
```bash
# Run specific test with verbose output
pnpm test:run -- --testPathPattern="spec-name" --verbose

# Check for stale snapshots
pnpm test:run -- -u
```

### Rust Clippy Errors
```bash
# Run clippy manually
make rust-clippy

# Format Rust code
make rust-fmt
```

## Compatibility

- Node.js 18+
- pnpm 8+
- Rust 1.70+ (for binary development)
- Turborepo (pre-configured)
- All major IDEs (VS Code, Cursor, Windsurf)

````