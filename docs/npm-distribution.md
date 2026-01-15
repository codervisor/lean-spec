# npm Distribution for Rust Binaries

This document describes how LeanSpec distributes Rust CLI and MCP binaries via npm.

## Overview

LeanSpec uses the **optional dependencies pattern** (used by `esbuild`, `swc`, `@tauri-apps/cli`) to distribute platform-specific Rust binaries:

```
Main Package (lean-spec)
├── bin/lean-spec.js (wrapper script)
└── optionalDependencies:
    ├── lean-spec-darwin-x64
    ├── lean-spec-darwin-arm64
    ├── lean-spec-linux-x64
    ├── lean-spec-linux-arm64
    └── lean-spec-windows-x64
```

## How It Works

1. User runs `npm install -g lean-spec`
2. npm detects platform and installs matching optional dependency
3. Wrapper script (`bin/lean-spec.js`) detects platform and spawns Rust binary
4. Other platform packages are ignored (saves bandwidth)

## Package Structure

### Main Packages

- **`lean-spec`** - CLI main package with wrapper script
- **`@leanspec/mcp`** - MCP server main package with wrapper script

### Platform Packages (CLI)

| Package                      | Platform            |
| ---------------------------- | ------------------- |
| `@leanspec/cli-darwin-x64`   | macOS Intel         |
| `@leanspec/cli-darwin-arm64` | macOS Apple Silicon |
| `@leanspec/cli-linux-x64`    | Linux x86_64        |
| `@leanspec/cli-linux-arm64`  | Linux ARM64         |
| `@leanspec/cli-windows-x64`  | Windows x64         |

### Platform Packages (MCP)

| Package                      | Platform            |
| ---------------------------- | ------------------- |
| `@leanspec/mcp-darwin-x64`   | macOS Intel         |
| `@leanspec/mcp-darwin-arm64` | macOS Apple Silicon |
| `@leanspec/mcp-linux-x64`    | Linux x86_64        |
| `@leanspec/mcp-linux-arm64`  | Linux ARM64         |
| `@leanspec/mcp-windows-x64`  | Windows x64         |

## Directory Structure

```
packages/
├── cli/
│   ├── package.json          # Main package
│   ├── bin/
│   │   ├── lean-spec.js      # Current TypeScript wrapper
│   │   └── lean-spec-rust.js # Rust binary wrapper
│   └── binaries/
│       ├── darwin-x64/
│       │   ├── package.json
│       │   └── lean-spec     # Rust binary
│       ├── darwin-arm64/
│       ├── linux-x64/
│       ├── linux-arm64/
│       └── windows-x64/
└── mcp/
    ├── package.json          # Main MCP package
    ├── bin/
    │   ├── leanspec-mcp.js       # Current wrapper
    │   └── leanspec-mcp-rust.js  # Rust binary wrapper
    └── binaries/
        └── (same structure)
```

## Publishing Workflow

### Prerequisites

1. Rust binaries built for all platforms (via CI)
2. Versions synced across all packages
3. Logged in to npm (`npm login`)

### Step 1: Sync Versions

```bash
pnpm sync-versions
```

This updates:
- All workspace package versions
- All platform package versions

### Step 2: Generate Platform Manifests

```bash
pnpm tsx scripts/generate-platform-manifests.ts
```

This creates `package.json` and `postinstall.js` for all platform packages. The postinstall script sets executable permissions on Unix binaries (npm strips file permissions during packaging).

### Step 3: Publish Platform Packages

```bash
pnpm publish:platforms [--dry-run]
```

This publishes all platform-specific binary packages. Platform packages **must** be published before main packages.

### Step 4: Publish Main Packages

```bash
pnpm publish:main [--dry-run]
```

This publishes `lean-spec` and `@leanspec/mcp` main packages.

## Version Synchronization

All packages use the same version (from root `package.json`):

```json
{
  "lean-spec": "0.3.0",
  "@leanspec/cli-darwin-x64": "0.3.0",
  "@leanspec/cli-darwin-arm64": "0.3.0",
  ...
}
```

Use `pnpm sync-versions` to synchronize all package versions.

## Wrapper Scripts

### CLI Wrapper (`packages/cli/bin/lean-spec-rust.js`)

```javascript
#!/usr/bin/env node
// Platform detection
const PLATFORM_MAP = {
  darwin: { x64: 'darwin-x64', arm64: 'darwin-arm64' },
  linux: { x64: 'linux-x64', arm64: 'linux-arm64' },
  win32: { x64: 'windows-x64' }
};

// Resolve binary from platform package
const packageName = `@leanspec/cli-${platformKey}`;
const binaryPath = require.resolve(`${packageName}/lean-spec`);

// Spawn binary with all args
spawn(binaryPath, process.argv.slice(2), { stdio: 'inherit' });
```

### MCP Wrapper (`packages/mcp/bin/leanspec-mcp-rust.js`)

Same pattern as CLI wrapper, but for MCP binary (`leanspec-mcp`).

## Troubleshooting

### Binary permissions error (EACCES)

```
Error: spawn EACCES
```

This means the binary doesn't have execute permissions. This should be automatically fixed by the postinstall script, but if it persists:

```bash
# Manual fix
chmod +x /path/to/node_modules/@leanspec/cli-darwin-arm64/lean-spec
```

**Root cause:** npm strips file permissions when creating tarballs. The `postinstall.js` script (included in platform packages) runs `chmod 0o755` on the binary after installation.

### Binary not found

```
Binary not found for darwin-arm64
Expected package: @leanspec/cli-darwin-arm64

To install:
  npm install -g lean-spec

If you installed globally, try:
  npm uninstall -g lean-spec && npm install -g lean-spec
```

### Unsupported platform

```
Unsupported platform: freebsd-x64
Supported: macOS (x64/arm64), Linux (x64/arm64), Windows (x64)
```

### Installation fails

1. Check npm/node versions meet requirements (`node >= 18`)
2. Try clearing npm cache: `npm cache clean --force`
3. Try reinstalling: `npm uninstall -g lean-spec && npm install -g lean-spec`

## Migration from TypeScript

The current TypeScript CLI remains the default. When Rust binaries are ready:

1. Switch wrapper from `lean-spec.js` to `lean-spec-rust.js`
2. Add optionalDependencies to `packages/cli/package.json`
3. Publish platform packages first, then main package

## References

- [esbuild npm distribution](https://github.com/evanw/esbuild/tree/master/npm)
- [@swc/core](https://github.com/swc-project/swc/tree/main/npm)
- [npm optionalDependencies](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#optionaldependencies)
