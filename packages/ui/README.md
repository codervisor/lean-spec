# @leanspec/ui

Primary Vite-based Single Page Application for LeanSpec spec management (web + desktop).

## Overview

This is a lightweight, fast SPA built with Vite that replaces the previous Next.js implementation. It provides a modern UI for viewing and managing LeanSpec specifications.

## Architecture

- **Build Tool**: Vite 7 (fast HMR, optimized builds)
- **Framework**: React 19 + TypeScript 5
- **Routing**: React Router 7 (client-side)
- **Components**: `@leanspec/ui-components` (shared library)
- **Styling**: Tailwind CSS 3
- **Backend**: Connects to Rust HTTP server at `http://localhost:3333`

## Features

- **Specs Page**: Browse all specifications with filtering
- **Spec Detail**: View individual spec content and metadata
- **Stats Page**: Project statistics and metrics
- **Dependencies Page**: Dependency graph visualization
- **Responsive**: Works on desktop and mobile
- **Dark Mode**: Automatic dark mode support

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (runs on http://localhost:5173)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Configuration

The API base URL can be configured via environment variable:

```bash
# .env.local
VITE_API_URL=http://localhost:3333
```

Default is `http://localhost:3333` which matches the Rust HTTP server.

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

## Migration from Next.js

This SPA replaces the previous Next.js implementation with:
- ✅ ~99% smaller bundle (sub-MB Vite assets vs 129MB+ Next.js)
- ✅ Faster dev HMR and builds
- ✅ Simpler architecture (no SSR overhead)
- ✅ Same features and functionality
- ✅ Better performance

## License

MIT
