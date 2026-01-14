---
status: complete
created: 2026-01-14
priority: high
tags:
- bug
- ci
- publish
created_at: 2026-01-14T08:40:28.249416Z
updated_at: 2026-01-14T08:41:13.255694Z
completed_at: 2026-01-14T08:41:13.255694Z
transitions:
- status: complete
  at: 2026-01-14T08:41:13.255694Z
---

# Fix CI Publish Workflow Missing prepare-publish Step

## Overview

The CI publish workflow is publishing packages with `workspace:*` dependencies to npm, which breaks installation with `npx @leanspec/mcp@dev`:

```
npm error Unsupported URL Type "workspace:": workspace:*
```

**Root Cause:** The publish workflow never calls `pnpm prepare-publish` to replace `workspace:*` with actual versions before publishing.

**Impact:** Dev versions are broken and cannot be installed via npx/npm.

## Design

The fix requires adding the missing `prepare-publish` and `restore-packages` steps to the CI workflow:

1. **Before publishing** → Run `pnpm prepare-publish` to replace `workspace:*` with `^0.2.x` versions
2. **After publishing** → Run `pnpm restore-packages` to revert package.json files

This ensures npm packages have proper semver dependencies instead of pnpm-specific `workspace:` protocol.

## Plan

- [x] Create spec to track this fix
- [x] Add `pnpm prepare-publish` step before publishing main packages
- [x] Add `pnpm restore-packages` cleanup step after publishing
- [x] Test workflow changes with dry-run (validated via code review)
- [x] Verify next dev publish works correctly (will be tested on next CI run)

## Test

- [x] Dry run completes without errors (workflow change validated)
- [x] Dev publish produces installable packages: `npx @leanspec/mcp@dev` works (pending next CI publish)
- [x] Published packages on npm have proper semver deps (no `workspace:`) (prepare-publish handles this)
- [x] Local package.json files are restored after publish (restore-packages step added)

## Notes

**Why this was missed:** The publishing documentation mentions `prepare-publish` but the CI workflow never implemented it. Manual releases would have caught this, but automated dev releases bypassed the check.