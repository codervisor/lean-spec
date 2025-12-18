# CLI Platform Binaries

This directory contains platform-specific npm packages for the LeanSpec CLI Rust binaries.

## Structure

```
binaries/
├── darwin-x64/       # macOS Intel
├── darwin-arm64/     # macOS Apple Silicon
├── linux-x64/        # Linux x86_64
├── linux-arm64/      # Linux ARM64
└── windows-x64/      # Windows x64
```

## How It Works

Each subdirectory is a separate npm package that contains only the binary for that platform:

- `lean-spec-darwin-x64`
- `lean-spec-darwin-arm64`
- `lean-spec-linux-x64`
- `lean-spec-linux-arm64`
- `lean-spec-windows-x64`

The main `lean-spec` package lists these as optional dependencies. When a user installs `lean-spec`, npm automatically selects and installs only the package matching their platform.

## Building Binaries

Binaries are built in CI using GitHub Actions (see spec 173). To build locally:

```bash
# Build for current platform
cargo build --release --manifest-path rust/Cargo.toml

# Copy binary to appropriate directory
cp rust/target/release/lean-spec packages/cli/binaries/$(uname -s | tr A-Z a-z)-$(uname -m)/
```

## Publishing

Platform packages must be published **before** the main package:

```bash
# Sync versions first
pnpm sync-versions

# Publish platform packages
pnpm publish:platforms

# Then publish main package
pnpm publish:main
```
