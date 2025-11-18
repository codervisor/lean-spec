---
status: planned
created: '2025-11-18'
tags: [ui, architecture, simplification]
priority: high
created_at: '2025-11-18T06:55:41.560Z'
---

# UI Standalone Consolidation

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-18

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: Current `@leanspec/ui` tries to package `@leanspec/web`'s Next.js standalone build, which creates symlink and node_modules distribution failures. When users run `lean-spec ui` via `pnpm dlx @leanspec/ui`, the published package can't resolve `next` dependency because:
- Standalone build uses pnpm symlinks that break when packaged
- Symlink rewriting logic is complex and error-prone
- Materializing symlinks hits broken symlink targets
- The two-package separation adds unnecessary indirection

**Solution**: Merge `@leanspec/web` directly into `@leanspec/ui` as a single publishable Next.js app package.

## Design

### Architecture Changes

**Before**:
```
@leanspec/web (workspace-only)
  └─> Next.js app with standalone output
@leanspec/ui (published)
  └─> CLI wrapper + copies @leanspec/web standalone build
```

**After**:
```
@leanspec/ui (published)
  └─> Next.js app + CLI entry point
```

### Implementation Strategy

1. **Move all `@leanspec/web` source to `@leanspec/ui`**:
   - `packages/ui/src/` ← all web app source
   - `packages/ui/public/` ← static assets
   - `packages/ui/next.config.ts`, etc.

2. **Update `@leanspec/ui/package.json`**:
   - Add Next.js dependencies
   - Keep existing CLI bin entry
   - Add Next.js build script
   - Set `output: "standalone"` in Next config

3. **Simplify CLI launcher** (`packages/ui/bin/ui.js`):
   - Production: Just run `node dist/standalone/server.js`
   - No complex copying or symlink rewriting
   - Dependencies bundled by Next.js standalone output

4. **Update monorepo references**:
   - Remove `@leanspec/web` from workspace
   - Update `lean-spec ui --dev` to use local `@leanspec/ui`
   - Update build pipelines

### Dev vs Prod Modes

**Dev mode** (monorepo): `lean-spec ui --dev`
- Runs `next dev` directly in `packages/ui`
- No standalone build needed

**Prod mode** (published): `npx @leanspec/ui` or `lean-spec ui`
- Runs pre-built standalone server
- All dependencies bundled by Next.js

## Plan

- [ ] Create `packages/ui/src/app/` and move all web app source
- [ ] Move `next.config.ts`, `tailwind.config.ts`, etc. to `packages/ui/`
- [ ] Update `packages/ui/package.json` with Next.js deps
- [ ] Simplify `packages/ui/bin/ui.js` launcher
- [ ] Remove `packages/ui/scripts/prepare-dist.mjs` complexity
- [ ] Update `packages/cli/src/commands/ui.ts` for new structure
- [ ] Update monorepo build scripts
- [ ] Archive/remove `packages/web/`
- [ ] Test `pnpm dlx @leanspec/ui` flow
- [ ] Update documentation

## Test

- [ ] `lean-spec ui --dev` works in monorepo
- [ ] `pnpm pack` produces valid tarball
- [ ] `pnpm dlx file:./tarball` successfully launches UI
- [ ] Published `@leanspec/ui` resolves all dependencies
- [ ] No "Cannot find module 'next'" errors
- [ ] Ctrl+C/Ctrl+D stop the UI cleanly (from earlier fix)
- [ ] UI connects to filesystem specs correctly

## Notes

**Rationale**: The two-package split was premature optimization. Next.js standalone output is designed to be self-contained and portable. Trying to repackage it breaks that model. By making `@leanspec/ui` the Next.js app itself, we leverage Next.js's built-in bundling and eliminate all symlink/node_modules issues.

**Breaking Changes**: None for users. The `lean-spec ui` command and `npx @leanspec/ui` usage remain identical. Only internal package structure changes.
