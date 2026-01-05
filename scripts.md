# Scripts Reference

This document contains less frequently used scripts that have been removed from `package.json` to keep it clean.

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
# Start docs dev server
pnpm --dir docs-site start

# Build docs
pnpm --dir docs-site build

# Serve built docs
pnpm --dir docs-site serve
```

## Testing Variants

```bash
# Run tests with UI
vitest --ui

# Run tests (same as `pnpm test`)
vitest run

# Test with coverage
vitest run --coverage
```

## Rust Development

```bash
# Build release binaries
cargo build --release --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs

# Build dev binaries
cargo build --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs

# Build all platforms
cargo build --release --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs --all

# Build HTTP server only
cargo build --release --manifest-path rust/Cargo.toml -p leanspec-http

# Copy binaries
node scripts/copy-rust-binaries.mjs

# Run Rust tests
cargo test --manifest-path rust/Cargo.toml

# Watch Rust tests
cargo watch -x 'test --manifest-path rust/Cargo.toml'

# Check Rust code
cargo check --manifest-path rust/Cargo.toml

# Run clippy (linter)
cargo clippy --manifest-path rust/Cargo.toml -- -D warnings

# Format Rust code
cargo fmt --manifest-path rust/Cargo.toml

# Check Rust formatting
cargo fmt --manifest-path rust/Cargo.toml -- --check

# Clean Rust build artifacts
cargo clean --manifest-path rust/Cargo.toml
```

## Desktop Development

```bash
# Build desktop app
turbo run build:desktop --filter=@leanspec/desktop

# Or directly with Tauri
cd packages/desktop
pnpm build:desktop

# Bundle for specific platforms
cd packages/desktop
pnpm bundle:linux   # Debian package
pnpm bundle:macos   # DMG
pnpm bundle:windows # NSIS installer
```

## Quick Reference

Most common daily commands (available in `package.json`):

```bash
pnpm dev              # Start web UI + Rust HTTP server
pnpm dev:web          # Start web UI only
pnpm dev:desktop      # Start desktop app
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm typecheck        # Type check all packages
pnpm format           # Format all code
pnpm cli              # Run LeanSpec CLI
pnpm pre-release      # Full pre-release check
```
