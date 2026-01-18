# Setup Guide

Complete environment setup for LeanSpec development.

## Prerequisites

### Required
- **Node.js 18+** - JavaScript runtime
- **pnpm 8+** - Package manager
- **Git** - Version control

### Optional (for Rust development)
- **Rust 1.70+** - For binary development
- **cargo** - Rust build tool

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/codervisor/lean-spec.git
cd lean-spec
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This installs dependencies for:
- All packages in `packages/`
- Documentation site (`docs-site/`)
- Root workspace tools

### 3. Build Project

```bash
# Build all packages (uses Turborepo caching)
pnpm build
```

First build takes ~19s. Subsequent builds: ~126ms (cached).

### 4. Verify Installation

```bash
# Run tests
pnpm test:run

# Type check
pnpm typecheck

# Verify CLI works
node bin/lean-spec.js --version
```

## Rust Setup (Optional)

Only needed if you're developing Rust binaries.

### 1. Install Rust

```bash
# Install rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify installation
rustc --version
cargo --version
```

### 2. Build Rust Binaries

```bash
# Build all Rust crates
pnpm rust:build

# Copy binaries to packages
pnpm rust:copy

# Verify
pnpm rust:test
```

### 3. Platform-Specific Builds

```bash
# Build for specific platform
cd rust
cargo build --release --target aarch64-apple-darwin

# Available targets:
# - aarch64-apple-darwin (macOS ARM64)
# - x86_64-apple-darwin (macOS x64)
# - x86_64-unknown-linux-gnu (Linux x64)
# - x86_64-pc-windows-msvc (Windows x64)
```

## IDE Setup

### VS Code

Recommended extensions:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "rust-lang.rust-analyzer",
    "tauri-apps.tauri-vscode"
  ]
}
```

Settings:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

### Cursor / Windsurf

Same as VS Code. These are VS Code forks with built-in AI features.

## Development Workflow

### Web UI Development

```bash
# Start dev server
pnpm dev:web

# Opens at http://localhost:5173
```

### CLI Development

```bash
# Watch mode for TypeScript CLI
pnpm dev:cli

# Test changes
node bin/lean-spec.js list
```

### Rust CLI Development

```bash
# Build Rust CLI
cd rust/leanspec-cli
cargo build

# Test
./target/debug/leanspec list

# Watch mode (requires cargo-watch)
cargo install cargo-watch
cargo watch -x build
```

### Desktop App Development

```bash
# Start Tauri desktop app
pnpm dev:desktop

# Build production app
pnpm build:desktop
```

## Troubleshooting

### "pnpm not found"

```bash
# Install pnpm globally
npm install -g pnpm

# Or use corepack (Node.js 16+)
corepack enable
corepack prepare pnpm@latest --activate
```

### "Rust not found"

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal
source ~/.cargo/env
```

### Build failures

```bash
# Clear all caches and reinstall
rm -rf node_modules packages/*/node_modules .turbo
pnpm install
pnpm build
```

### Turborepo cache issues

```bash
# Clear Turbo cache
rm -rf .turbo

# Force rebuild
turbo run build --force
```

### TypeScript errors after pulling

```bash
# Rebuild all packages
pnpm build

# If still failing, reinstall
rm -rf node_modules packages/*/node_modules
pnpm install
pnpm build
```

## Environment Variables

### Development

Create `.env` file in root:

```env
# Not currently needed for development
# Add here if future features require env vars
```

### Production

For deployed services (web UI, MCP server):

```env
NODE_ENV=production
```

## Git Hooks

Pre-commit and pre-push hooks are automatically installed with `pnpm install`.

### Pre-commit
- Formats Rust code (`cargo fmt`)
- Runs Rust clippy checks
- Prevents commits with Rust warnings

### Pre-push
- Runs full clippy validation
- Blocks push if quality checks fail

### Bypass (Emergency Only)

```bash
# Skip hooks (not recommended)
git commit --no-verify
git push --no-verify
```

## Next Steps

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution workflow
2. Check [MONOREPO.md](MONOREPO.md) for package structure
3. Review [RULES.md](RULES.md) for mandatory rules
4. Run `pnpm test` to verify everything works

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/codervisor/lean-spec/issues)
- **Discussions**: [GitHub Discussions](https://github.com/codervisor/lean-spec/discussions)
- **Docs**: [leanspec.dev](https://leanspec.dev)
