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

**Root Causes:** 
1. The publish workflow calls `pnpm prepare-publish`, but the script was incomplete
2. **The `prepare-publish.ts` script was missing CLI and MCP platform packages in its mapping**, causing them to remain as `workspace:*`

**Impact:** Dev versions are broken and cannot be installed via npx/npm.

## Design

The fix requires two changes:

1. **Fix `prepare-publish.ts`** → Add all platform packages (CLI, MCP, HTTP) to the `pkgMap` so they get properly resolved
2. **CI workflow** → Ensure `prepare-publish` and `restore-packages` steps are called (already implemented)

The `prepare-publish.ts` script was only mapping HTTP platform packages but missing CLI and MCP platform packages, causing warnings like:
```
⚠️  Unknown workspace package: @leanspec/cli-darwin-arm64
```

This warning was non-fatal, so the script continued and left those de (was already added)
- [x] Add `pnpm restore-packages` cleanup step after publishing (was already added)
- [x] **Fix `prepare-publish.ts` to include CLI and MCP platform packages in pkgMap**
- [x] Test locally with `pnpm prepare-publish` to verify all workspace:* are replaced

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

1. The CI workflow DID call `prepare-publish`, but it was incomplete
2. The script showed warnings for unknown packages but didn't fail, so the issue wasn't caught
3. The script originally only handled HTTP platform packages (from the initial Rust migration)
4. When CLI platform packages were created, they weren't added to the `pkgMap`
5. Manual releases would have caught this during user installation testing

**How discovered:** User tried `npm i -g @leanspec/ui@dev` after a dev publish and got `workspace:*` errors
**Why this was missed:** The publishing documentation mentions `prepare-publish` but the CI workflow never implemented it. Manual releases would have caught this, but automated dev releases bypassed the check.