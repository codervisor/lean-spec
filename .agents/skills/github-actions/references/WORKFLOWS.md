# GitHub Actions Workflows Reference

Detailed documentation for each workflow in the LeanSpec repository.

## CI Workflow (`ci.yml`)

### Overview

The CI workflow runs on every push to main and all pull requests. It validates that the codebase builds correctly and all tests pass.

### Trigger Events

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### Jobs

#### 1. `node` - Node.js/TypeScript Build & Test

**Runs on**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Setup pnpm with caching
4. Install dependencies (`pnpm install --frozen-lockfile --ignore-scripts`)
5. Build all packages (`pnpm build`)
6. Run typecheck (`pnpm typecheck`)
7. Run tests (`pnpm test`)
8. Upload UI build artifact

**Duration**: ~2-4 minutes

**Common Failure Points**:
- TypeScript compilation errors
- Test failures
- Missing dependencies

#### 2. `rust` - Rust Build & Test

**Runs on**: `ubuntu-latest`
**Depends on**: `node` (needs UI dist artifact)

**Steps**:
1. Checkout code
2. Install Rust stable toolchain
3. Setup cargo caching
4. Check formatting (`cargo fmt -- --check`)
5. Run clippy (`cargo clippy -- -D warnings`)
6. Download UI build artifact
7. Build binaries (`cargo build --release`)
8. Run tests (`cargo test -- --test-threads=1`)
9. Copy Rust binaries
10. Validate specs

**Duration**: ~5-8 minutes

**Common Failure Points**:
- Clippy warnings (treated as errors)
- Formatting issues
- Test failures
- Spec validation errors

---

## Publish Workflow (`publish.yml`)

### Overview

The publish workflow builds binaries for all platforms and publishes packages to npm. It supports both production releases (via GitHub Release) and development builds (via manual dispatch).

### Trigger Events

```yaml
on:
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Skip npm publish steps (build/validate only)'
        type: boolean
        default: false
      dev:
        description: 'Publish a dev prerelease version'
        type: boolean
        default: false
  release:
    types: [published]
```

### Jobs

#### 1. `build-ui` - Build UI Package

**Runs on**: `ubuntu-latest`

**Purpose**: Build the UI package first, as it's embedded into Rust binaries.

**Outputs**: `ui-dist` artifact

**Duration**: ~2 minutes

#### 2. `rust-binaries` - Build Platform Binaries

**Runs on**: Matrix of OS/target combinations
**Depends on**: `build-ui`

**Matrix**:
| OS | Target | Platform |
|----|--------|----------|
| `macos-latest` | `x86_64-apple-darwin` | `darwin-x64` |
| `macos-latest` | `aarch64-apple-darwin` | `darwin-arm64` |
| `ubuntu-latest` | `x86_64-unknown-linux-gnu` | `linux-x64` |
| `windows-latest` | `x86_64-pc-windows-msvc` | `windows-x64` |

**Builds**:
- `leanspec-cli` (lean-spec binary)
- `leanspec-mcp` (MCP server binary)
- `leanspec-http` (HTTP server binary)

**Outputs**: `binaries-{platform}` artifacts

**Duration**: ~10-15 minutes (parallel)

#### 3. `publish-platform` - Publish Platform Packages

**Runs on**: `ubuntu-latest`
**Depends on**: `rust-binaries`

**Purpose**: Publish platform-specific npm packages before main packages.

**Packages Published**:
- `@leanspec/cli-darwin-arm64`
- `@leanspec/cli-darwin-x64`
- `@leanspec/cli-linux-x64`
- `@leanspec/cli-windows-x64`
- `@leanspec/mcp-darwin-arm64`
- `@leanspec/mcp-darwin-x64`
- `@leanspec/mcp-linux-x64`
- `@leanspec/mcp-windows-x64`
- `@leanspec/http-darwin-arm64`
- `@leanspec/http-darwin-x64`
- `@leanspec/http-linux-x64`
- `@leanspec/http-windows-x64`

**Duration**: ~2-3 minutes

#### 4. `publish-main` - Publish Main Packages

**Runs on**: `ubuntu-latest`
**Depends on**: `publish-platform`

**Special Step**: Waits for platform packages to propagate on npm registry (up to 20 attempts with exponential backoff).

**Packages Published**:
- `lean-spec` (CLI main package)
- `@leanspec/mcp` (MCP server main package)
- `@leanspec/ui` (UI bundle)

**Duration**: ~5-10 minutes (including propagation wait)

### Triggering Methods

#### Production Release (Recommended)

```bash
# 1. Prepare release
npm version patch  # or minor/major
pnpm sync-versions
pnpm pre-release

# 2. Commit and push
git add .
git commit -m "chore: release vX.X.X"
git push --follow-tags

# 3. Create GitHub Release (triggers workflow automatically)
gh release create vX.X.X --title "vX.X.X" --notes "Release notes"
```

#### Development Release

```bash
# Publish with @dev tag
gh workflow run publish.yml --field dev=true

# Watch the run
RUN_ID=$(gh run list --workflow publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID
```

#### Dry Run (Validation Only)

```bash
gh workflow run publish.yml --field dev=true --field dry_run=true
```

---

## Desktop Build Workflow (`desktop-build.yml`)

### Overview

Builds the Tauri desktop application for all platforms.

### Trigger Events

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'packages/desktop/**'
      - 'packages/ui/**'
      - '.github/workflows/desktop-build.yml'
  pull_request:
    branches: [main]
    paths:
      - 'packages/desktop/**'
      - 'packages/ui/**'
      - '.github/workflows/desktop-build.yml'
```

### Jobs

#### `build` - Matrix Build

**Runs on**: Matrix of `macos-latest`, `ubuntu-latest`, `windows-latest`

**Steps**:
1. Checkout code
2. Setup pnpm, Node.js 20, Rust
3. Install dependencies
4. Install Linux dependencies (on Ubuntu)
5. Build Rust binaries
6. Copy Rust binaries
7. Download Node.js for Desktop embedding
8. Build UI package
9. Build desktop bundle (platform-specific)
10. Upload artifacts

**Outputs**: `leanspec-desktop-{os}` artifacts containing Tauri bundles

**Duration**: ~15-20 minutes per platform

---

## Copilot Setup Workflow (`copilot-setup-steps.yml`)

### Overview

Prepares the environment for GitHub Copilot coding agent. This workflow is automatically picked up by Copilot when it needs to set up the development environment.

### Trigger Events

```yaml
on:
  workflow_dispatch:
  push:
    paths:
      - .github/workflows/copilot-setup-steps.yml
  pull_request:
    paths:
      - .github/workflows/copilot-setup-steps.yml
```

### Jobs

#### `copilot-setup-steps` - Environment Setup

**Runs on**: `ubuntu-latest`

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Setup pnpm
4. Install JavaScript dependencies
5. Setup Rust toolchain
6. Install Linux system dependencies for Tauri
7. Build Rust binaries
8. Copy binaries to packages
9. Install lean-spec CLI globally
10. Verify installation

**Purpose**: Provides Copilot agent with a fully configured development environment including the lean-spec CLI available globally.
