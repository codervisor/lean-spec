---
name: leanspec-publishing
description: Publishing and release workflows for LeanSpec packages. Use when preparing releases or publishing to npm.
compatibility: Requires npm credentials and GitHub workflows access
metadata:
  author: LeanSpec
  version: 0.1.0
  homepage: https://leanspec.dev
  internal: true
---

# LeanSpec Publishing Skill

Teach agents how to publish and release LeanSpec packages to npm. This skill covers version management, publishing workflows, and distribution strategies.

## When to Use This Skill

Activate this skill when any of the following are true:
- Preparing a release (major, minor, or patch)
- Publishing development versions for testing
- Troubleshooting npm distribution issues
- Working with platform-specific binaries
- Syncing versions across monorepo packages

## Core Principles

1. **Root as Source of Truth**: All versions come from root `package.json`
2. **Platform Packages First**: Platform binaries must be published before main packages
3. **Automated Sync**: Use scripts, don't manually edit package.json files
4. **Test Before Release**: Always run `pnpm pre-release` before publishing
5. **Dev Tags for Testing**: Use `-dev` tags for testing across platforms

## Quick Commands

### Production Publishing (Recommended)

**The standard release process uses GitHub Releases to trigger automated publishing:**

```bash
# 1. Update version (root only)
npm version patch  # or minor/major

# 2. Sync all packages
pnpm sync-versions

# 3. Validate everything
pnpm pre-release

# 4. Commit and push with tags
git add .
git commit -m "chore: release vX.X.X"
git push --follow-tags

# 5. Create GitHub Release (triggers publish workflow automatically)
gh release create vX.X.X --title "vX.X.X" --notes "Release notes here"
# Or create via GitHub UI: https://github.com/codervisor/lean-spec/releases/new
```

**Alternative: Manual workflow dispatch** (not recommended for production)
```bash
# Only use if GitHub release trigger is not working
gh workflow run publish.yml
```

### Development Publishing

```bash
# Publish dev version via GitHub Actions (all platforms)
gh workflow run publish.yml --field dev=true

# Dry run (validates without publishing)
gh workflow run publish.yml --field dev=true --field dry_run=true

# Install dev version
npm install -g lean-spec@dev
```

## Version Management

All packages maintain synchronized versions automatically:

- Root `package.json` is the single source of truth
- `pnpm sync-versions` propagates to all packages
- Includes Rust crate versions via `sync-rust-versions`
- CI automatically validates version alignment

## Distribution Architecture

LeanSpec uses the **optional dependencies pattern** for Rust binaries:

```
Main Package (lean-spec)
├── bin/lean-spec.js (wrapper)
└── optionalDependencies:
    ├── @leanspec/cli-darwin-arm64
    ├── @leanspec/cli-darwin-x64
    ├── @leanspec/cli-linux-x64
    └── @leanspec/cli-windows-x64
```

**How it works**:
1. User runs `npm install -g lean-spec`
2. npm installs only the platform-specific package
3. Wrapper script detects platform and spawns Rust binary

## Publishing Order (CRITICAL)

⚠️ **Platform packages MUST be published before main packages**

1. Platform packages (e.g., `@leanspec/cli-darwin-arm64`)
2. Main packages (e.g., `lean-spec`, `@leanspec/mcp`)

The workflow and scripts handle this automatically.

## Common Tasks

### Preparing a Release

```bash
# 1. Check current state
git status
pnpm test:run

# 2. Update version
npm version [patch|minor|major]

# 3. Sync versions
pnpm sync-versions

# 4. Pre-release validation
pnpm pre-release
# Includes: sync-versions, typecheck, tests, build, validate

# 5. Commit and push with tags
git add .
git commit -m "chore: release vX.X.X"
git push --follow-tags

# 6. Create GitHub Release (triggers automated publish)
gh release create vX.X.X --title "vX.X.X" --notes "Release notes here"
# Or use GitHub UI: https://github.com/codervisor/lean-spec/releases/new
# This automatically triggers .github/workflows/publish.yml
```

### Testing Dev Versions

```bash
# Publish dev version (all platforms)
gh workflow run publish.yml --field dev=true

# Wait for workflow to complete, then test
npm install -g lean-spec@dev
lean-spec --version

# Test specific functionality
lean-spec create test-spec
lean-spec list
```

### Troubleshooting

**Binary not found error**:
```bash
# Check platform package exists
npm view @leanspec/cli-darwin-arm64 versions

# Rebuild and copy binaries
pnpm rust:build
```

**Version mismatch**:
```bash
# Sync all versions
pnpm sync-versions --dry-run  # Check first
pnpm sync-versions  # Apply
```

**Permission issues**:
```bash
# Binary lacks execute permission
chmod +x /path/to/binary
# Should be auto-fixed by postinstall script
```

## Detailed References

For comprehensive documentation, see:
- [references/NPM-DISTRIBUTION.md](./references/NPM-DISTRIBUTION.md) - Architecture details
- [references/DEV-PUBLISHING.md](./references/DEV-PUBLISHING.md) - Development workflow
- [references/SCRIPTS.md](./references/SCRIPTS.md) - All available scripts

## Package Structure

### Main Packages (Published)
- `lean-spec` - CLI main package
- `@leanspec/mcp` - MCP server main package
- `@leanspec/ui` - Web UI bundle

### Platform Packages (Published)
- `@leanspec/cli-{platform}` - CLI binaries (5 platforms)
- `@leanspec/mcp-{platform}` - MCP binaries (5 platforms)

### Internal Packages (Not Published)
- `@leanspec/desktop` - Tauri desktop app
- `@leanspec/ui-components` - Shared UI components

## CI/CD Integration

Publishing is automated via GitHub Actions with two triggers:

### Production: GitHub Release Trigger (Primary)
```yaml
# .github/workflows/publish.yml
on:
  release:
    types: [published]  # Triggers when you create a GitHub release

# This is the recommended production release method
# Creates a GitHub release → Workflow runs automatically
```

### Development: Manual Workflow Dispatch
```yaml
# .github/workflows/publish.yml
on:
  workflow_dispatch:
    inputs:
      dev: true         # Publishes with @dev tag
      dry_run: true     # Validates without publishing

# Use for testing and dev releases only
```

**Workflow Steps:**
- Builds Rust binaries for all platforms
- Syncs versions automatically
- Publishes platform packages first
- Publishes main packages second
- Supports dev tags and dry runs

## Best Practices

1. **Never manually edit package versions** - Use `npm version` and `pnpm sync-versions`
2. **Always test with dev versions first** - Use `@dev` tag before stable releases
3. **Run pre-release checks** - `pnpm pre-release` catches issues early
4. **Use GitHub Releases for production** - This is the primary trigger for publishing
5. **Manual workflow dispatch is for dev/testing only** - Not recommended for production releases
6. **Tag releases properly** - Use semantic versioning and git tags

## Setup & Activation

### Auto-activation Hints
If the tool supports auto-activation, detect:
- Tasks related to: "publish", "release", "npm", "version"
- Files being edited: `package.json`, publishing scripts
- Commands being run: `npm publish`, `pnpm publish:*`

## Compatibility Notes

- Requires npm credentials for publishing
- GitHub CLI (`gh`) recommended for workflow triggers
- Rust toolchain needed for binary builds
- Cross-platform builds require GitHub Actions runners
