# LeanSpec Packages

This directory contains the LeanSpec monorepo packages.

## Structure

```
packages/
├── cli/        - lean-spec: CLI wrapper for Rust binary
├── mcp/        - @leanspec/mcp: MCP server wrapper
├── desktop/    - @leanspec/desktop: Tauri desktop app
└── ui/         - @leanspec/ui: Standalone UI bundle + launcher
```

## Architecture (Post Rust Migration)

**As of spec 181**, the core functionality has migrated to Rust:

```
┌─────────────────┐
│   Desktop App   │
│ @leanspec/desktop│  ──► Rust backend (leanspec-core)
└─────────────────┘

┌─────────────────┐
│   UI App        │
│  @leanspec/ui   │  ──► Next.js (inlined utilities)
└─────────────────┘

┌─────────────────┐
│   CLI           │
│   lean-spec     │  ──► Rust binary (leanspec-cli)
└─────────────────┘

┌─────────────────┐
│   MCP Server    │
│ @leanspec/mcp   │  ──► Rust binary (leanspec-mcp)
└─────────────────┘
```

**Key changes:**
- `@leanspec/core` TypeScript package has been deprecated and deleted
- CLI is now a thin wrapper that invokes the Rust binary
- MCP server runs the Rust MCP binary
- UI inlines minimal utilities (frontmatter, atomic file ops)
- Desktop uses Tauri with Rust backend

## lean-spec (CLI)

**JavaScript wrapper for Rust CLI binary.**

The CLI package provides:
- Platform detection and binary resolution
- Fallback to locally built Rust binaries for development
- Templates for `lean-spec init`

### Usage

```bash
# Install globally
npm install -g lean-spec

# Or run via npx
npx lean-spec list
npx lean-spec create my-feature
```

### Development

```bash
# Build Rust binaries first
cd rust && cargo build --release

# Copy binaries to packages
node scripts/copy-rust-binaries.mjs

# Test CLI
node bin/lean-spec.js --version
```

## @leanspec/mcp

**MCP server integration wrapper.**

Simple passthrough wrapper that delegates to the Rust MCP binary. Makes MCP setup more discoverable with a dedicated package name.

### Usage

```bash
# Use with Claude Desktop, Cline, Zed, etc.
npx -y @leanspec/mcp
```

See [MCP Integration docs](https://lean-spec.dev/docs/guide/usage/ai-assisted/mcp-integration) for setup instructions.

## @leanspec/ui

**Published UI bundle and launcher.**

Contains the Next.js application and exposes a CLI (`npx @leanspec/ui`). Used automatically by `lean-spec ui` outside the monorepo.

The UI package inlines minimal utilities (formerly from `@leanspec/core`):
- `createUpdatedFrontmatter` - Update spec metadata
- `atomicWriteFile` - Safe file writing

### Development

```bash
pnpm --filter @leanspec/ui build    # build Next.js app and prepare artifacts
node packages/ui/bin/ui.js --dry-run
```

## @leanspec/desktop

**Tauri desktop application.**

Cross-platform desktop app using:
- Rust backend (Tauri commands for spec operations)
- React/Vite frontend
- Shared UI components with web app

### Development

```bash
pnpm --filter @leanspec/desktop dev:desktop
```

## Building

Build all packages:
```bash
pnpm build
```

Build specific package:
```bash
pnpm --filter @leanspec/ui build
pnpm --filter @leanspec/desktop build
```

## Testing

Run all tests:
```bash
pnpm test
```

Run tests for specific package:
```bash
pnpm --filter @leanspec/ui test
```

## Publishing

Published packages:
- `lean-spec` - CLI (wrapper + Rust binary via optional dependencies)
- `@leanspec/mcp` - MCP server wrapper
- `@leanspec/ui` - Web UI bundle

Platform-specific binary packages (published separately):
- `lean-spec-darwin-arm64`
- `lean-spec-darwin-x64`
- `lean-spec-linux-arm64`
- `lean-spec-linux-x64`
- `lean-spec-windows-x64`

## Migration Notes

**Spec 181 (TypeScript Deprecation)**:
- Deleted `@leanspec/core` TypeScript package
- CLI now invokes Rust binary directly
- UI inlines 2 utility functions (~50 lines)
- Single source of truth in Rust
