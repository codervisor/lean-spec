---
name: leanspec-scripts
description: All pnpm and cargo commands for LeanSpec development. Use when looking up build, dev, test, or publish commands.
compatibility: Requires pnpm, Node.js 18+, and Rust toolchain
metadata:
  author: LeanSpec
  version: 0.1.0
  internal: true
---

# LeanSpec Scripts Reference

All commands for development, testing, and publishing.

## Quick Reference

Most common daily commands:

```bash
pnpm dev              # Start web UI + Rust HTTP server
pnpm dev:watch        # Same + auto-rebuild Rust on changes
pnpm dev:web          # Start web UI only
pnpm dev:desktop      # Start desktop app
pnpm build            # Build all TS packages
pnpm build:rust       # Build Rust (debug)
pnpm build:rust:release # Build Rust (release)
pnpm test             # Run tests
pnpm typecheck        # Type check all packages
pnpm format           # Format all code
pnpm cli              # Run LeanSpec CLI
pnpm pre-release      # Full pre-release check
```

## Publishing & Release

```bash
# Sync versions across packages
tsx scripts/sync-versions.ts
tsx scripts/sync-rust-versions.ts

# Prepare for publishing (backup package.json files)
tsx scripts/prepare-publish.ts

# Publish packages
tsx scripts/publish-platform-packages.ts
tsx scripts/publish-main-packages.ts

# Restore packages after publishing
tsx scripts/restore-packages.ts
```

## Documentation

```bash
pnpm docs:dev         # Start docs dev server
pnpm docs:build       # Build docs
```

## Testing

```bash
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:ui          # With UI
pnpm test:coverage    # With coverage
pnpm test:rust        # Rust tests only
```

## Rust Development

```bash
# Build
pnpm build:rust           # Debug build (default for dev)
pnpm build:rust:release   # Release build (for publishing)
pnpm check:rust           # Quick check without building

# Quality
pnpm lint:rust            # Clippy with warnings as errors
pnpm format:rust          # Format code
pnpm format:rust:check    # Check formatting

# Low-level (when you need more control)
cargo build --manifest-path rust/Cargo.toml
cargo build --release --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs --debug   # Copy from debug
node scripts/copy-rust-binaries.mjs           # Copy from release
node scripts/copy-rust-binaries.mjs --all     # All platforms
```

## Desktop Development

```bash
pnpm dev:desktop      # Start desktop app in dev mode

# Build & bundle
turbo run build:desktop --filter=@leanspec/desktop

# Or directly with Tauri
cd packages/desktop
pnpm build:desktop
pnpm bundle:linux     # Debian package
pnpm bundle:macos     # DMG
pnpm bundle:windows   # NSIS installer
```

## Validation

```bash
pnpm pre-push         # Quick check: typecheck + clippy
pnpm pre-release      # Full: build + typecheck + test + lint
```
