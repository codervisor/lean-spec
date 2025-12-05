---
status: complete
created: '2025-12-05'
tags:
  - cli
  - backfill
  - migration
priority: medium
created_at: '2025-12-05T01:15:49.898Z'
updated_at: '2025-12-05T01:25:42.283Z'
transitions:
  - status: in-progress
    at: '2025-12-05T01:25:35.845Z'
  - status: complete
    at: '2025-12-05T01:25:42.283Z'
completed_at: '2025-12-05T01:25:42.283Z'
completed: '2025-12-05'
---

# Backfill Command Robustness

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-12-05 · **Tags**: cli, backfill, migration

## What

Make `lean-spec backfill` robust enough to handle specs migrated from various formats, including files with:
- Missing or incomplete YAML frontmatter
- Legacy inline metadata (e.g., `**Status**: Complete`)
- No frontmatter at all (plain markdown)
- Malformed frontmatter that fails to parse

## Why

The `backfill` command is designed to help users migrate specs from other systems or recover timestamp data from git history. Currently it crashes with `Cannot read properties of undefined (reading 'charAt')` when processing specs without valid `status` or `created` fields.

Users migrating from:
- Plain markdown documents
- Other spec systems (ADR, RFC, etc.)
- Legacy LeanSpec formats with inline metadata

...should be able to run `backfill` to bootstrap proper frontmatter, not have it crash.

## Design

### Current Behavior (Problematic)

1. `backfill` loads specs via `loadAllSpecs()` which filters out files without valid frontmatter
2. But if a spec passes initial loading with partial frontmatter, `updateFrontmatter()` → `updateVisualMetadata()` crashes on missing `status`
3. Quick fix added: skip specs missing `status`/`created` in backfill

### Proposed Enhancement

**Option A: Auto-infer missing fields** (Recommended)
- If `status` missing: infer from git history or default to `planned`
- If `created` missing: use first git commit date
- Add `--bootstrap` flag to explicitly create missing frontmatter

**Option B: Separate bootstrap command**
- New `lean-spec bootstrap` command for adding frontmatter to plain files
- `backfill` only updates existing frontmatter

### Implementation Approach

Enhance backfill to:
1. Detect files with missing/partial frontmatter
2. Offer to bootstrap required fields from git history
3. Handle various legacy formats gracefully

## Plan

- [x] Add `--bootstrap` flag to backfill command
- [x] Implement `inferStatusFromGit()` - detect if spec ever had status changes
- [x] Implement `inferCreatedFromGit()` - use first commit date as fallback
- [x] Add frontmatter creation for files without any frontmatter
- [x] Support legacy inline metadata parsing (`**Status**: ...`)
- [ ] Add `--format` option to detect source format (adr, rfc, plain) *(deferred)*

## Test

- [x] Backfill plain markdown file → creates valid frontmatter
- [x] Backfill file with only `status` → adds `created` from git
- [x] Backfill file with only `created` → adds `status: planned`
- [x] Backfill legacy inline format → converts to YAML frontmatter
- [x] Backfill with `--dry-run` shows what would be added
- [x] No crashes on any malformed input

## Implementation Summary

### New Files
- `packages/cli/src/utils/bootstrap-helpers.ts` - Bootstrap utilities:
  - `loadSpecsForBootstrap()` - Load specs without requiring valid frontmatter
  - `inferStatusFromContent()` - Parse status from inline metadata patterns
  - `inferStatusFromGit()` - Get last known status from git history
  - `inferCreatedFromContent()` - Parse created date from various formats
  - `inferCreatedFromGit()` - Use first commit date as fallback

### Modified Files
- `packages/cli/src/commands/backfill.ts`:
  - Added `--bootstrap` flag
  - New `bootstrapSpec()` function for creating frontmatter
  - Updated summary to show bootstrapped count
  - Hint to use `--bootstrap` when specs are skipped

- `packages/cli/src/frontmatter.ts`:
  - Guard in `updateVisualMetadata()` for missing status/created

### Supported Input Formats
1. **Plain markdown** - No frontmatter at all
2. **LeanSpec inline** - `**Status**: Complete`, `**Created**: 2025-01-15`
3. **Simple format** - `Status: Complete`, `Created: 2025-01-15`
4. **ADR format** - `## Status\n\nAccepted`
5. **Partial frontmatter** - Missing status or created fields

### Status Mapping
ADR/RFC statuses are mapped to LeanSpec statuses:
- `accepted`, `approved`, `done` → `complete`
- `proposed`, `pending`, `draft` → `planned`
- `superseded`, `deprecated`, `rejected` → `archived`
- `wip`, `working`, `active` → `in-progress`

## Notes

### Quick Fix Already Applied

The immediate crash was fixed by adding guards in:
- `frontmatter.ts`: `updateVisualMetadata()` returns early if `status`/`created` missing
- `backfill.ts`: Skip specs without required frontmatter with clear message

This spec addresses the broader goal of making backfill a proper migration tool.

### Related

- Spec 047: Git backfill timestamps (original feature)
- Spec 048: Spec complexity analysis
