# LeanSpec Packages

This directory contains the LeanSpec monorepo packages.

## Structure

```
packages/
├── cli/               - leanspec: CLI wrapper for Rust binary
├── mcp/               - @leanspec/mcp: MCP server wrapper
└── ui/                - @leanspec/ui: Primary Vite SPA (web + desktop + shared UI library)
```

## Architecture (Vite + Rust)

```
┌─────────────────┐              ┌────────────────────────┐
│   Web App       │──────► HTTP ►│ Rust HTTP server       │
│  @leanspec/ui   │              │ @leanspec/http-server  │
└─────────────────┘              └────────────────────────┘

┌─────────────────┐
│   CLI / MCP     │──────► Rust binaries (leanspec-cli/mcp)
└─────────────────┘
```

- Rust provides backend for both HTTP server and CLI/MCP commands

## @leanspec/cli

**JavaScript wrapper for Rust CLI binary. Installs the `leanspec` command.**

Provides platform detection, binary resolution, and templates for `leanspec init`.

### Usage

```bash
npm install -g @leanspec/cli
leanspec list
leanspec create my-feature
```

### Development

```bash
cd rust && cargo build --release
node scripts/copy-rust-binaries.mjs
node packages/cli/bin/leanspec.js --version
```

## @leanspec/mcp

**MCP server integration wrapper.**

Delegates to the Rust MCP binary and makes MCP setup discoverable.

```bash
npx -y @leanspec/mcp
```

See [MCP Integration docs](https://lean-spec.dev/docs/guide/usage/ai-assisted/mcp-integration).

## @leanspec/ui (Vite SPA)

Primary web UI package:
- Vite 7 + React 19 + TypeScript 5
- Shared components exported from `@leanspec/ui`
- Served by Rust HTTP server or bundled in Tauri

### Development

```bash
pnpm --filter @leanspec/ui dev       # Vite dev server
pnpm --filter @leanspec/ui build     # build SPA assets
pnpm --filter @leanspec/ui preview   # preview production build
```

## Desktop Repository

The desktop application now lives in a dedicated repository:

- https://github.com/codervisor/lean-spec-desktop

## Building

```bash
pnpm build
```

Build specific package:

```bash
pnpm --filter @leanspec/ui build
```

## Testing

```bash
pnpm test
```

Run tests for a package:

```bash
pnpm --filter @leanspec/ui test
```

## Publishing

Published packages:
- `@leanspec/cli` - CLI (wrapper + Rust binary via optional dependencies; installs the `leanspec` command)
- `@leanspec/mcp` - MCP server wrapper
- `@leanspec/ui` - Vite SPA bundle

Platform-specific binary packages (published separately, one per family):
- `@leanspec/cli-{darwin-arm64,darwin-x64,linux-x64,windows-x64}`
- `@leanspec/mcp-{darwin-arm64,darwin-x64,linux-x64,windows-x64}`
- `@leanspec/http-{darwin-arm64,darwin-x64,linux-x64,windows-x64}`

## Migration Notes

- Vite SPA is the primary UI implementation
- Rust remains the single source of truth for backend logic
