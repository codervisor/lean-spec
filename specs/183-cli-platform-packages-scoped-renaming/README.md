---
status: complete
created: 2025-12-18
priority: medium
tags:
- packaging
- distribution
- breaking-change
created_at: 2025-12-18T13:48:54.278021Z
updated_at: 2026-01-12T08:27:41.583704878Z
---
# Rename CLI Platform Packages to @leanspec/cli-* Scope

> **Status**: planned · **Priority**: medium · **Created**: 2025-12-18

## Overview

Currently, CLI platform binary packages use inconsistent naming:
- **Unscoped**: `lean-spec-darwin-arm64`, `lean-spec-darwin-x64`, etc.
- **Scoped**: `@leanspec/mcp-darwin-arm64`, `@leanspec/mcp-darwin-x64`, etc. (MCP)

This creates namespace pollution and inconsistency. We need unified scoped naming while keeping the main `lean-spec` CLI package name for user-friendliness.

**Goals:**
- Clean namespace under `@leanspec/` org
- Consistent with MCP pattern (`@leanspec/mcp-*`)
- Maintain simple user-facing name (`lean-spec`)
- Professional package management

## Design

### Package Renaming

```
Current                      → New
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
lean-spec-darwin-arm64       → @leanspec/cli-darwin-arm64
lean-spec-darwin-x64         → @leanspec/cli-darwin-x64
lean-spec-linux-x64          → @leanspec/cli-linux-x64
lean-spec-linux-arm64        → @leanspec/cli-linux-arm64
lean-spec-windows-x64        → @leanspec/cli-windows-x64
```

**Keep unchanged:**
- `lean-spec` (main CLI wrapper)
- `@leanspec/mcp` (MCP wrapper) 
- `@leanspec/mcp-*` (MCP platform packages)

### Directory Structure

```
packages/cli/binaries/
├── darwin-arm64/
│   ├── package.json          # name: "@leanspec/cli-darwin-arm64"
│   └── lean-spec             # binary
├── darwin-x64/
│   ├── package.json          # name: "@leanspec/cli-darwin-x64"
│   └── lean-spec
└── ...
```

### Updated Main Package Dependencies

[packages/cli/package.json](../../packages/cli/package.json):
```json
{
  "name": "lean-spec",
  "optionalDependencies": {
    "@leanspec/cli-darwin-arm64": "0.2.10",
    "@leanspec/cli-darwin-x64": "0.2.10",
    "@leanspec/cli-linux-x64": "0.2.10",
    "@leanspec/cli-linux-arm64": "0.2.10",
    "@leanspec/cli-windows-x64": "0.2.10"
  }
}
```

### Migration Strategy

**Phase 1: Publish both versions**
- Publish new `@leanspec/cli-*` packages
- Keep old `lean-spec-*` packages active
- Main package depends on both (new takes precedence)

**Phase 2: Deprecation warning**
- Add deprecation warning to old packages
- Documentation updates point to new packages

**Phase 3: Full migration** (after 3+ months)
- Remove old packages from optionalDependencies
- Official deprecation on npm

## Plan

### Phase 1: Rename and Publish New Packages

- [x] Rename platform package directories and package.json
  - [x] `darwin-arm64/package.json`: `name` → `@leanspec/cli-darwin-arm64`
  - [x] `darwin-x64/package.json`: `name` → `@leanspec/cli-darwin-x64`
  - [x] `linux-x64/package.json`: `name` → `@leanspec/cli-linux-x64`
  - [x] `linux-arm64/package.json`: `name` → `@leanspec/cli-linux-arm64`
  - [x] `windows-x64/package.json`: `name` → `@leanspec/cli-windows-x64`

- [x] Update main CLI wrapper package
  - [x] [packages/cli/package.json](../../packages/cli/package.json): Replace `optionalDependencies` with scoped names
  - [x] [packages/cli/bin/lean-spec-rust.js](../../packages/cli/bin/lean-spec-rust.js): Update binary resolution logic to use scoped names

- [x] Update CI/CD workflows
  - [x] [.github/workflows/publish-dev.yml](../../.github/workflows/publish-dev.yml): Update package echo statements and dry-run summary
  - [x] Update platform package publishing loops (already dynamic via package.json)

- [x] Update build and distribution scripts
  - [x] [scripts/copy-rust-binaries.mjs](../../scripts/copy-rust-binaries.mjs): No changes needed (uses directories, not package names)
  - [x] [scripts/sync-rust-versions.ts](../../scripts/sync-rust-versions.ts): Already handles CLI packages correctly
  - [x] [scripts/publish-platform-packages.ts](../../scripts/publish-platform-packages.ts): Already reads package.json name dynamically

- [x] Documentation updates
  - [x] Update [npm-distribution.md](../../docs/npm-distribution.md)
  - [x] [AGENTS.md](../../AGENTS.md): No package names mentioned
  - [x] README: No platform packages mentioned

### Phase 2: Validation and Testing

- [x] Test local builds
  - [x] `pnpm rust:build` successfully copies binaries
  - [x] Package versions sync correctly
  - [x] Wrapper resolves scoped package names correctly

- [ ] Test dry-run publish
  - [ ] `gh workflow run publish-dev.yml --inputs dry_run=true`
  - [ ] Verify all package names are scoped correctly

- [ ] Test actual dev publish
  - [ ] Publish dev version with new names
  - [ ] Install and verify: `npm i -g lean-spec@dev`
  - [ ] Test all platforms (if possible via CI)

### Phase 3: Deprecation (Future)

- [ ] Add deprecation notices to old packages
- [ ] Monitor adoption of new packages
- [ ] Remove old packages from dependencies after transition period

## Test

- [x] Local build produces packages with correct scoped names
- [x] `lean-spec` wrapper correctly resolves new scoped platform packages
- [ ] Dev publish workflow publishes all 5 platform packages + main wrapper
- [ ] Fresh install of `lean-spec@dev` works on macOS ARM64
- [ ] Package search shows packages under `@leanspec` org
- [x] Version sync scripts update all packages correctly

## Notes

### Implementation Completion (2025-12-18)

**Completed:**
- ✅ All 5 platform packages renamed to `@leanspec/cli-*` in package.json
- ✅ Main CLI package updated to use scoped names in optionalDependencies
- ✅ Wrapper script (lean-spec-rust.js) updated to resolve scoped package names
- ✅ CI/CD workflow (publish-dev.yml) updated with correct echo statements
- ✅ Documentation (npm-distribution.md) fully updated
- ✅ Build scripts already handle packages dynamically
- ✅ Local testing confirms wrapper resolves scoped names correctly

**Ready for:**
- Dev publish testing (`gh workflow run publish-dev.yml`)
- Production release in next version

### Why Keep `lean-spec` Unscoped?

User experience: `npm i -g lean-spec` is simpler than `npm i -g @leanspec/cli`. The main CLI should be easy to discover and install. Only internal platform dependencies need scoping.

### Breaking Change Scope

This is a **non-breaking change** for end users:
- Main package name (`lean-spec`) unchanged
- User commands unchanged
- Only internal optional dependencies change

### Publishing Order

**Critical**: Platform packages MUST be published before main wrapper, as seen in [publish-dev.yml](../../.github/workflows/publish-dev.yml):
1. Publish all 5 `@leanspec/cli-*` platform packages
2. Then publish `lean-spec` main wrapper

### Rollback Strategy

If issues arise, we can:
1. Re-publish old `lean-spec-*` names from same binaries
2. Revert optionalDependencies in main package
3. Re-publish main package pointing to old names
