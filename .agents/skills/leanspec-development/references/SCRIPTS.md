# Scripts Reference

Less frequently used commands. Most daily commands are in root `package.json`.

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
# Build debug binaries (default for development)
cargo build --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs --debug

# Build release binaries (for publishing)
cargo build --release --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs

# Build all platforms (requires cross-compilation)
cargo build --release --manifest-path rust/Cargo.toml
node scripts/copy-rust-binaries.mjs --all

# Build HTTP server only
cargo build --manifest-path rust/Cargo.toml -p leanspec-http

# Copy binaries
node scripts/copy-rust-binaries.mjs --debug  # from debug
node scripts/copy-rust-binaries.mjs          # from release

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
