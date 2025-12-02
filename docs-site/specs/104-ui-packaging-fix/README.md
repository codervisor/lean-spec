---
status: complete
created: '2025-11-18'
tags:
  - packaging
  - bug-fix
priority: high
created_at: '2025-11-18T09:26:38.346Z'
updated_at: '2025-11-18T09:28:17.735Z'
transitions:
  - status: in-progress
    at: '2025-11-18T09:27:10.441Z'
  - status: complete
    at: '2025-11-18T09:28:17.735Z'
completed_at: '2025-11-18T09:28:17.735Z'
completed: '2025-11-18'
---

# Fix @leanspec/ui standalone packaging issue

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-18 · **Tags**: packaging, bug-fix

**Project**: lean-spec  
**Team**: Core Development

## Overview

The published `@leanspec/ui@0.2.4` package fails to run with error `Cannot find module 'next'`. This occurs because Next.js standalone build creates symlinks in `node_modules/`, but npm pack doesn't follow symlinks by default, resulting in missing dependencies in the published package.

**Root Cause**: The `files` field in `package.json` included `.next/standalone/node_modules/` which only contains symlinks pointing to `.next/standalone/node_modules/.pnpm/`. When npm packs the tarball, these symlinks aren't resolved.

**Impact**: Users running `lean-spec ui` via the published npm package cannot start the UI server.

## Design

**Solution**: Update the `files` field in `packages/ui/package.json` to include the actual pnpm store location:

```json
"files": [
  "bin/",
  ".next/standalone/packages/",
  ".next/standalone/node_modules/.pnpm/",  // Changed from .next/standalone/node_modules/
  ".next/static/",
  "public/",
  "README.md",
  "LICENSE"
]
```

This ensures actual dependency files (not just symlinks) are included in the published package.

**Version Alignment**: All packages bumped to `0.2.5`:
- `@leanspec/ui`: 0.2.4 → 0.2.5
- `@leanspec/core`: 0.2.4 → 0.2.5  
- `lean-spec`: 0.2.4 → 0.2.5
- `@leanspec/mcp`: Already at 0.2.5

## Plan

- [x] Update `packages/ui/package.json` files field
- [x] Bump all package versions to 0.2.5
- [x] Update cross-package dependencies
- [ ] Build and test locally
- [ ] Publish updated packages

## Test

**Verification Steps**:
1. Build the UI package: `pnpm --filter @leanspec/ui build`
2. Pack locally: `npm pack --dry-run` and verify `next` module is included
3. Test installation in separate directory:
   ```bash
   cd /tmp/test-leanspec-ui
   npm install @leanspec/ui@0.2.5
   npx leanspec-ui --specs /path/to/specs
   ```
4. Verify UI starts without "Cannot find module 'next'" error

## Notes

**Package Size**: With this change, the published package is ~18.3 MB compressed (65 MB unpacked), which is reasonable for a Next.js standalone app.

**Future Improvement**: Consider documenting version alignment strategy in CONTRIBUTING.md or creating a release script to ensure versions stay in sync.
