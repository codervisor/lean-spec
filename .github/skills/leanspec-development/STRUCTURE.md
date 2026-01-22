# Project Structure

Understanding LeanSpec's monorepo architecture, package organization, and key files.

## Workspace Layout

```
lean-spec/
├── packages/           # Published npm packages
│   ├── cli/           # lean-spec CLI (wrapper)
│   ├── mcp/           # @leanspec/mcp (MCP server)
│   ├── ui/            # @leanspec/ui (Web interface)
│   ├── ui-components/ # Shared UI components (internal)
│   ├── desktop/       # Tauri desktop app (not published)
│   ├── chat-server/   # Chat server (experimental)
│   └── http-server/   # HTTP server (experimental)
│
├── rust/              # Rust implementations
│   ├── leanspec-cli/  # Rust CLI binary
│   ├── leanspec-mcp/  # Rust MCP server
│   ├── leanspec-core/ # Shared Rust core
│   ├── leanspec-http/ # HTTP server
│   └── leanspec-sync-bridge/
│
├── docs-site/         # Docusaurus (separate repo via git subtree)
├── specs/             # Project specifications
├── tests/             # E2E tests
└── scripts/           # Build and release scripts
```

## Key Configuration Files

### Root Level

| File                  | Purpose                               |
| --------------------- | ------------------------------------- |
| `package.json`        | Root workspace, scripts, dependencies |
| `pnpm-workspace.yaml` | Defines workspace packages            |
| `turbo.json`          | Turborepo task pipeline and caching   |
| `tsconfig.json`       | Shared TypeScript config              |
| `vitest.config.ts`    | Test configuration                    |
| `Makefile`            | Rust build shortcuts                  |

### Rust

| File                | Purpose                  |
| ------------------- | ------------------------ |
| `rust/Cargo.toml`   | Rust workspace manifest  |
| `rust/*/Cargo.toml` | Individual crate configs |

### Package Structure

Each package in `packages/` typically has:
```
packages/my-package/
├── package.json       # Package metadata
├── src/              # Source code
├── dist/             # Build output
├── tsconfig.json     # Package-specific TS config
└── vitest.config.ts  # Package-specific test config
```

## Turborepo Benefits

**Smart Caching**: Only rebuilds what changed (19s → 126ms improvement)

```bash
# First build: ~19s
pnpm build

# Second build with no changes: ~126ms (cache hit!)
pnpm build

# Change one file: Only rebuilds affected packages
```

**Parallel Execution**: Independent packages build simultaneously

**Task Dependencies**: Dependencies build first automatically

## Package Dependencies

### Internal Dependencies

Packages use `workspace:*` protocol during development:

```json
{
  "dependencies": {
    "@leanspec/ui-components": "workspace:*"
  }
}
```

**During publishing**, this gets replaced with actual version numbers.

### Platform Packages

CLI and MCP use optional dependencies for platform-specific binaries:

```json
{
  "optionalDependencies": {
    "@leanspec/cli-darwin-arm64": "0.3.0",
    "@leanspec/cli-darwin-x64": "0.3.0",
    "@leanspec/cli-linux-x64": "0.3.0",
    "@leanspec/cli-windows-x64": "0.3.0"
  }
}
```

## Common Workflows

### Building

```bash
pnpm build                              # Build all packages
turbo run build --filter=lean-spec      # Build specific package
turbo run build --force                 # Ignore cache
```

### Testing

```bash
pnpm test                               # All tests (watch mode)
pnpm test:run                           # CI mode
turbo run test --filter=@leanspec/ui    # Specific package
```

### Development

```bash
pnpm dev           # All dev servers (parallel)
pnpm dev:web       # Web UI only
pnpm dev:cli       # CLI in watch mode
pnpm dev:desktop   # Desktop app
```

## Version Management

**All packages share the same version** from root `package.json`.

```bash
# Sync all versions
pnpm sync-versions

# Check alignment (dry run)
pnpm sync-versions --dry-run
```

**Script updates:**
- All `packages/*/package.json` versions
- Cross-package dependency versions
- Rust crate versions in `Cargo.toml` files

## Documentation Site

`docs-site/` is maintained in a separate repo, merged via git subtree:

```bash
# Pull latest docs (maintainers only)
git subtree pull --prefix=docs-site \
  https://github.com/codervisor/lean-spec-docs.git \
  main --squash

# For development, work directly in docs-site/
cd docs-site
pnpm start
```

## Build Outputs

### TypeScript Packages

Built to `dist/`:
```
packages/ui/
├── src/           # Source
└── dist/          # Built output
    ├── index.js   # Bundled code
    └── index.d.ts # Type definitions
```

### Rust Binaries

Built to `rust/target/`:
```
rust/target/
├── debug/         # Development builds
└── release/       # Production builds
    ├── leanspec   # CLI binary
    └── leanspec-mcp
```

**After building**, binaries are copied to packages:
```bash
pnpm rust:build    # Build Rust
pnpm rust:copy     # Copy to packages/cli/binaries/
```

## Turborepo Cache

Located in `.turbo/` (gitignored):

```bash
# Clear cache
rm -rf .turbo

# Or use turbo command
turbo run build --force
```

## Environment Setup

### Required
- **Node.js 18+**
- **pnpm 8+**

### Optional (for Rust development)
- **Rust 1.70+**
- **cargo**

### Quick Start

```bash
pnpm install   # Install all dependencies
pnpm build     # Build everything
pnpm test:run  # Verify setup
```

## Troubleshooting

### Build Issues

```bash
# Nuclear reset
rm -rf .turbo node_modules packages/*/node_modules
pnpm install
pnpm build
```

### Rust Issues

```bash
cd rust
cargo clean
cargo build
```

### Workspace Issues

```bash
# Reinstall workspace
pnpm install --force

# Verify workspace structure
pnpm list
```

## Adding New Package

1. Create directory in `packages/`
2. Add `package.json`:
```json
{
  "name": "@leanspec/my-package",
  "version": "0.3.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  }
}
```
3. Run `pnpm install` to link workspace
4. Package auto-discovered by pnpm workspace

---

**Philosophy**: Monorepo for developer experience, independent packages for distribution.
