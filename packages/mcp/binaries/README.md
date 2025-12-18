# MCP Platform Binaries

This directory contains platform-specific npm packages for the LeanSpec MCP server Rust binaries.

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

- `@leanspec/mcp-darwin-x64`
- `@leanspec/mcp-darwin-arm64`
- `@leanspec/mcp-linux-x64`
- `@leanspec/mcp-linux-arm64`
- `@leanspec/mcp-windows-x64`

The main `@leanspec/mcp` package lists these as optional dependencies. When a user installs `@leanspec/mcp`, npm automatically selects and installs only the package matching their platform.

## Building Binaries

Binaries are built in CI using GitHub Actions (see spec 173). To build locally:

```bash
# Build for current platform
cargo build --release --manifest-path rust/Cargo.toml

# Copy binary to appropriate directory
cp rust/target/release/leanspec-mcp packages/mcp/binaries/$(uname -s | tr A-Z a-z)-$(uname -m)/
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
