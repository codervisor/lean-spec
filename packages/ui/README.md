# @leanspec/ui

Primary Vite-based Single Page Application for LeanSpec spec management (web + desktop).

## Overview

This is a lightweight, fast SPA built with Vite. It provides a modern UI for viewing and managing LeanSpec specifications.

**Unified Server Architecture**: The UI is served by the Rust HTTP server on port 3000. When you run `npx @leanspec/ui`, it starts a single process that serves both the static UI files and the API endpoints. This provides:
- Single port (default: 3000)
- Same-origin API requests (no CORS needed)
- Better performance (no Node.js HTTP server overhead)
- Simpler deployment

## Usage

```bash
# Start the unified HTTP server
npx @leanspec/ui

# Custom port and host
npx @leanspec/ui --port 3001 --host 0.0.0.0

# Auto-add project
npx @leanspec/ui --project /path/to/specs

# Read-only mode
npx @leanspec/ui --readonly

# All CLI arguments are passed to the Rust HTTP server
npx @leanspec/ui --help
```

Visit `http://localhost:3000` to access the UI.

## Architecture

- **Build Tool**: Vite 7 (fast HMR, optimized builds)
- **Framework**: React 19 + TypeScript 5
- **Routing**: React Router 7 (client-side)
- **Components**: `@leanspec/ui-components` (shared library)
- **Styling**: Tailwind CSS 3
- **Backend**: Same-origin API served by the Rust HTTP server at `http://localhost:3000`

## Features

- **Specs Page**: Browse all specifications with filtering
- **Spec Detail**: View individual spec content and metadata
- **Stats Page**: Project statistics and metrics
- **Dependencies Page**: Dependency graph visualization
- **Responsive**: Works on desktop and mobile
- **Dark Mode**: Automatic dark mode support

## Development

### Development with HMR (Recommended)

For fast UI development with Hot Module Replacement:

```bash
# Terminal 1: Start Rust HTTP server (API on port 3000)
cd rust/leanspec-http
cargo run

# Terminal 2: Start Vite dev server (UI on port 5173)
cd packages/ui
pnpm dev
```

Access the UI at `http://localhost:5173`. Vite's proxy automatically forwards API requests to port 3000.

### Production-like Development

To test the unified server locally:

```bash
# Build UI
pnpm build

# Start unified server (serves UI + API on port 3000)
cd ../../rust/leanspec-http
cargo run
```

Access at `http://localhost:3000`.

### Other Commands

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Preview production build (Vite preview server)
pnpm preview
```

## Configuration

The API base URL can be configured via environment variable:

```bash
# .env.local
VITE_API_URL=http://localhost:3000
```

Default is same-origin (`/api`) which matches the unified HTTP server.

## Build Output

Production builds are output to `dist/`:
- Small bundle size (~300KB gzipped)
- Optimized assets with code splitting
- Static files ready for deployment

## Deployment

The built static files can be:
1. Served by the Rust HTTP server
2. Deployed to any static hosting (Vercel, Netlify, etc.)
3. Bundled in the Tauri desktop app

## License

MIT
