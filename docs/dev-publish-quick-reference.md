# Dev Version Publishing - Quick Reference

Quick commands for publishing development versions of lean-spec with Rust implementation.

## TL;DR

```bash
gh workflow run publish.yml --field dev=true    # Publish dev version (all platforms)

# Dry run (build/validate only)
gh workflow run publish.yml --field dev=true --field dry_run=true
```

## What Gets Published

### Platform Packages (Rust Binaries)
- `lean-spec-darwin-arm64` - macOS Apple Silicon CLI binary
- `lean-spec-darwin-x64` - macOS Intel CLI binary  
- `lean-spec-linux-x64` - Linux x64 CLI binary
- `lean-spec-linux-arm64` - Linux ARM64 CLI binary
- `lean-spec-windows-x64` - Windows x64 CLI binary
- `@leanspec/mcp-darwin-arm64` - macOS Apple Silicon MCP binary
- `@leanspec/mcp-darwin-x64` - macOS Intel MCP binary
- `@leanspec/mcp-linux-x64` - Linux x64 MCP binary
- `@leanspec/mcp-linux-arm64` - Linux ARM64 MCP binary
- `@leanspec/mcp-windows-x64` - Windows x64 MCP binary

### Main Packages (JavaScript Wrappers)
- `lean-spec` - CLI main package (detects platform, spawns binary)
- `@leanspec/mcp` - MCP main package (detects platform, spawns binary)
- `@leanspec/ui` - UI package

## Version Format

Dev versions use a workflow-run-id prerelease format:
```
0.2.10-dev.123456789
│      │   └─ GitHub Actions run id
│      └─ dev tag
└─ Base version
```

## Publishing Order (CRITICAL)

1. **Platform packages FIRST** ← Main packages reference these
2. Main packages SECOND

The workflow and scripts handle this automatically.

## Testing Dev Version

**From CI (cross-platform):**
```bash
# Install using dev tag (all platforms work)
npm install -g lean-spec@dev
```

**From local publish (single platform):**
```bash
# Install using dev tag (all platforms work)
npm install -g lean-spec@dev

# Verify
lean-spec --version

# Uninstall
npm uninstall -g lean-spec
```
### "Binary not found"
**Cause**: Rust binary not built or copied correctly  
**Fix**: Run `pnpm rust:build` before publishing

### "workspace:* in published package"
**Cause**: Forgot to run `pnpm prepare-publish`  
**Fix**: Only affects full releases, not dev versions (we don't use workspace:* in rust packages)

## Debugging

```bash
# Check if platform package exists
npm view lean-spec-darwin-arm64 versions --json

# Check current dev tag version
npm view lean-spec dist-tags

# Check what depends on platform packages
npm view lean-spec optionalDependencies
```

## See Also

- [Full Publishing Guide](agents/PUBLISHING.md) - Complete release process
- [npm Distribution](npm-distribution.md) - Architecture details
