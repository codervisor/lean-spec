# LeanSpec Packages

This directory contains the LeanSpec monorepo packages.

## Structure

```
packages/
├── cli/               - lean-spec: CLI wrapper for Rust binary
├── mcp/               - @leanspec/mcp: MCP server wrapper
├── desktop/           - @leanspec/desktop: Tauri desktop app
├── ui/                - @leanspec/ui: Primary Vite SPA (web + desktop)
├── ui-legacy-nextjs/  - Archived Next.js UI (not built/published)
└── ui-components/     - Shared component library
```

## Architecture (Vite + Rust)

```
┌─────────────────┐              ┌────────────────────────┐
│   Desktop App   │──────► IPC ─►│ Rust backend (Tauri)   │
│ @leanspec/desktop│             └────────────────────────┘
│                 │
│   UI Shell      │──────► SPA ─►│ @leanspec/ui (Vite)    │
└─────────────────┘              └────────────────────────┘

┌─────────────────┐              ┌────────────────────────┐
│   Web App       │──────► HTTP ►│ Rust HTTP server       │
│  @leanspec/ui   │              │ @leanspec/http-server  │
└─────────────────┘              └────────────────────────┘

┌─────────────────┐
│   CLI / MCP     │──────► Rust binaries (leanspec-cli/mcp)
└─────────────────┘
```

- Single UI codebase (@leanspec/ui) for web and desktop
- Rust provides backend for both HTTP server and Tauri commands
- Archived Next.js implementation remains in `ui-legacy-nextjs` for reference only

## lean-spec (CLI)

**JavaScript wrapper for Rust CLI binary.**

Provides platform detection, binary resolution, and templates for `lean-spec init`.

### Usage

```bash
npm install -g lean-spec
npx lean-spec list
npx lean-spec create my-feature
```

### Development

```bash
cd rust && cargo build --release
node scripts/copy-rust-binaries.mjs
node bin/lean-spec.js --version
```

## @leanspec/mcp

**MCP server integration wrapper.**

Delegates to the Rust MCP binary and makes MCP setup discoverable.

```bash
npx -y @leanspec/mcp
```

See [MCP Integration docs](https://lean-spec.dev/docs/guide/usage/ai-assisted/mcp-integration).

## @leanspec/ui (Vite SPA)

Primary UI used by both web and desktop:
- Vite 7 + React 19 + TypeScript 5
- Shared components from `@leanspec/ui-components`
- Served by Rust HTTP server or bundled in Tauri

### Development

```bash
pnpm --filter @leanspec/ui dev       # Vite dev server
pnpm --filter @leanspec/ui build     # build SPA assets
pnpm --filter @leanspec/ui preview   # preview production build
```

## @leanspec/ui-legacy-nextjs (Archived)

Legacy Next.js implementation kept for rollback/reference:
- Marked `private` and excluded from workspace builds
- Not published to npm
- See `packages/ui-legacy-nextjs/ARCHIVED.md` for details

## @leanspec/desktop

Tauri desktop application using the Vite SPA:
- Rust backend commands for spec operations
- React/Vite frontend reusing `@leanspec/ui`
- Shared components via `@leanspec/ui-components`

```bash
pnpm --filter @leanspec/desktop dev:desktop
pnpm --filter @leanspec/desktop build:desktop
```

## Building

```bash
pnpm build
```

Build specific package:

```bash
pnpm --filter @leanspec/ui build
pnpm --filter @leanspec/desktop build
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
- `lean-spec` - CLI (wrapper + Rust binary via optional dependencies)
- `@leanspec/mcp` - MCP server wrapper
- `@leanspec/ui` - Vite SPA bundle

Platform-specific binary packages (published separately):
- `lean-spec-darwin-arm64`
- `lean-spec-darwin-x64`
- `lean-spec-linux-arm64`
- `lean-spec-linux-x64`
- `lean-spec-windows-x64`

## Migration Notes

- Vite SPA replaces the former Next.js UI
- Archived Next.js code lives in `packages/ui-legacy-nextjs`
- Rust remains the single source of truth for backend logic
