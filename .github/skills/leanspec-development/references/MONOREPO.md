# Monorepo Structure

LeanSpec uses **Turborepo** with **pnpm workspaces** to manage its monorepo efficiently.

## Overview

- **Parallel execution** - Independent packages build simultaneously
- **Smart caching** - Only rebuilds what changed (126ms vs 19s improvement!)
- **Task dependencies** - Dependencies built first automatically

## Workspace Structure

```
packages/
├── cli/              # CLI wrapper (published as lean-spec)
│   ├── package.json
│   ├── bin/
│   │   ├── lean-spec.js      # Current TypeScript wrapper
│   │   └── lean-spec-rust.js # Rust binary wrapper
│   └── binaries/             # Platform-specific binaries
│       ├── darwin-x64/
│       ├── darwin-arm64/
│       ├── linux-x64/
│       └── windows-x64/
│
├── mcp/              # MCP server wrapper (@leanspec/mcp)
│   ├── package.json
│   ├── bin/
│   │   ├── leanspec-mcp.js       # Current wrapper
│   │   └── leanspec-mcp-rust.js  # Rust binary wrapper
│   └── binaries/             # Platform-specific binaries
│
├── ui/               # Web UI bundle (@leanspec/ui)
│   ├── package.json
│   ├── src/
│   └── vite.config.ts
│
├── ui-components/    # Shared UI components (internal)
│   ├── package.json
│   └── src/
│
├── desktop/          # Tauri desktop app (not published to npm)
│   ├── package.json
│   ├── src-tauri/
│   └── src/
│
├── chat-server/      # Chat server (experimental)
└── http-server/      # HTTP server (experimental)

rust/
├── Cargo.toml        # Workspace manifest
├── leanspec-cli/     # Rust CLI implementation
├── leanspec-mcp/     # Rust MCP server
├── leanspec-core/    # Shared Rust core
├── leanspec-http/    # HTTP server
└── leanspec-sync-bridge/  # Cloud sync bridge

docs-site/            # Documentation (Docusaurus)
├── docs/             # English docs
└── i18n/zh-Hans/     # Chinese translations
```

## Key Configuration Files

### `turbo.json`
Defines the task pipeline and caching strategy:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "cache": false
    },
    "typecheck": {
      "outputs": []
    }
  }
}
```

### `pnpm-workspace.yaml`
Defines workspace packages:

```yaml
packages:
  - 'packages/*'
  - 'docs-site'
```

### Root `package.json`
Central scripts that invoke Turbo:

```json
{
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "dev": "turbo run dev --parallel"
  }
}
```

## Package Dependencies

### Internal Dependencies

Packages can depend on each other:

```json
{
  "name": "@leanspec/ui",
  "dependencies": {
    "@leanspec/ui-components": "workspace:*"
  }
}
```

The `workspace:*` protocol ensures packages always use the local version during development.

### Platform Packages

CLI and MCP packages use optional dependencies for platform-specific binaries:

```json
{
  "name": "lean-spec",
  "optionalDependencies": {
    "@leanspec/cli-darwin-arm64": "0.3.0",
    "@leanspec/cli-darwin-x64": "0.3.0",
    "@leanspec/cli-linux-x64": "0.3.0",
    "@leanspec/cli-windows-x64": "0.3.0"
  }
}
```

## Common Commands

### Building

```bash
# Build all packages (with caching)
pnpm build

# Build specific package
turbo run build --filter=lean-spec
turbo run build --filter=@leanspec/ui

# Force rebuild (ignore cache)
turbo run build --force
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
turbo run test --filter=lean-spec

# Run tests once (CI mode)
pnpm test:run
```

### Development

```bash
# Start all dev servers (parallel)
pnpm dev

# Start specific package
pnpm dev:web      # Web UI only
pnpm dev:cli      # CLI in watch mode
pnpm dev:desktop  # Desktop app
```

### Type Checking

```bash
# Type check all packages
pnpm typecheck

# Type check specific package
turbo run typecheck --filter=@leanspec/ui
```

## Turborepo Benefits

### 1. Incremental Builds

Turborepo only rebuilds packages that changed:

```bash
# First build: ~19s (full build)
pnpm build

# Second build: ~126ms (cache hit!)
pnpm build

# Change one file in @leanspec/ui
# Next build: ~2s (only rebuilds ui and dependents)
pnpm build
```

### 2. Parallel Execution

Independent packages build simultaneously:

```
Building...
  ✓ @leanspec/ui-components (2.3s)
  ✓ @leanspec/ui (3.1s)
  ✓ lean-spec (1.8s)
  ✓ @leanspec/mcp (1.9s)

Total: 3.1s (instead of 9.1s sequential)
```

### 3. Task Dependencies

Turborepo ensures dependencies build first:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"]  // ^ means "dependencies first"
    }
  }
}
```

## Version Synchronization

All packages maintain synchronized versions:

```bash
# Update root version
npm version patch

# Sync all packages
pnpm sync-versions

# Verify alignment
pnpm sync-versions --dry-run
```

The `sync-versions` script updates:
- All `packages/*/package.json` versions
- Cross-package dependencies
- Rust crate versions (via `sync-rust-versions`)

## Adding a New Package

1. Create directory in `packages/`
2. Add `package.json` with proper name
3. Update `pnpm-workspace.yaml` if needed (usually not)
4. Run `pnpm install` to link workspace
5. Add to `turbo.json` if special pipeline needed

Example:

```bash
mkdir packages/my-package
cd packages/my-package
pnpm init

# Edit package.json
{
  "name": "@leanspec/my-package",
  "version": "0.3.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  }
}

# Link workspace
cd ../..
pnpm install
```

## Docs Site Subtree

The `docs-site/` is maintained in a separate repository and merged using git subtree:

```bash
# Pull latest docs (maintainers only)
git subtree pull --prefix=docs-site \
  https://github.com/codervisor/lean-spec-docs.git \
  main --squash

# Push docs changes (maintainers only)
git subtree push --prefix=docs-site \
  https://github.com/codervisor/lean-spec-docs.git \
  main
```

For development, just work directly in `docs-site/`:

```bash
cd docs-site
pnpm install
pnpm start
```

## Troubleshooting

### "workspace:* in published package"

**Problem**: Package published with `workspace:*` dependencies

**Solution**: 
- For releases: Run `pnpm prepare-publish` before publishing
- For dev versions: Not an issue (we don't use workspace:* in rust packages)

### Cache issues

**Problem**: Build not picking up changes

**Solution**:
```bash
# Clear Turborepo cache
rm -rf .turbo

# Force rebuild
turbo run build --force
```

### Dependency issues

**Problem**: Packages not linking properly

**Solution**:
```bash
# Reinstall everything
rm -rf node_modules packages/*/node_modules
pnpm install
```

### Type errors in dependent packages

**Problem**: Type errors after changing a package

**Solution**:
```bash
# Rebuild all packages
pnpm build

# Or build specific package and dependents
turbo run build --filter=...@leanspec/ui-components
```

## Best Practices

1. **Always use pnpm** - Never use npm or yarn
2. **Leverage caching** - Don't use `--force` unless necessary
3. **Build before test** - Turborepo handles this automatically
4. **Version sync** - Use `pnpm sync-versions` script
5. **Filter when possible** - Build/test only what you need:
   ```bash
   turbo run test --filter=lean-spec
   ```

## References

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Version Synchronization](./CONTRIBUTING.md#version-management)
