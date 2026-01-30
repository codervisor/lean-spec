---
status: complete
created: 2026-01-30
priority: medium
tags:
- refactor
- simplification
- specs
- archiving
created_at: 2026-01-30T01:59:06.018831Z
updated_at: 2026-01-30T02:15:43.174579Z
completed_at: 2026-01-30T02:15:43.174579Z
transitions:
- status: complete
  at: 2026-01-30T02:15:43.174579Z
---

# Migrate to Status-Only Archiving

## Overview

Currently archived specs use two mechanisms:
1. **Folder location**: Moved to `specs/archived/` directory
2. **Status field**: `status: archived` in frontmatter

This creates inconsistency:
- 26 specs in `archived/` folder have `status: complete` (legacy)
- 5 specs had `status: archived` but were NOT in `archived/` folder

**Decision**: Migrate to status-only archiving where:
- All specs stay in `specs/` folder (flat structure)
- Archive status determined solely by `status: archived` frontmatter
- No file movement required to archive/unarchive

## Design

### Benefits of Status-Only
- Single source of truth (frontmatter)
- Git history preserved (no file moves)
- Links between specs never break
- Simpler codebase (no folder-based logic)
- Consistent with other status values

### Legacy Compatibility (Option D)
To ensure smooth transition for existing users:

1. **Folder fallback**: If spec is in `archived/` folder, treat as archived regardless of frontmatter status
2. **Deprecation warning**: Log warning when `archived/` folder is detected, suggesting migration
3. **Migration command**: `lean-spec migrate-archived` to:
   - Move specs from `archived/` to `specs/`
   - Set `status: archived` on all moved specs
   - Remove empty `archived/` directory
4. **Future removal**: Remove folder support in next major version

### Code Changes Required
1. **spec_loader.rs**: Keep `archived/` detection but mark as deprecated, override status to `archived` for folder-based specs
2. **spec_archiver.rs**: Simplify to only update status field (no file move)
3. **archive.rs CLI**: Update to not move directories
4. **migrate_archived.rs**: New CLI command for migration
5. **Desktop reader.rs**: Remove archived folder special handling (use core loader)

## Plan

- [x] Move all specs from `archived/` back to `specs/` (this repo)
- [x] Set `status: archived` on all formerly-archived specs (this repo)
- [x] Update `spec_loader.rs` - folder fallback with deprecation
- [x] Simplify `spec_archiver.rs` - status update only
- [x] Update CLI archive command
- [x] Add `migrate-archived` CLI command
- [x] Update desktop reader.rs
- [x] Test archive/unarchive workflow
- [x] Document deprecation in CHANGELOG

## Test

- [x] `lean-spec list` excludes archived specs by default
- [x] `lean-spec list --all` shows archived specs
- [x] `lean-spec archive <spec>` sets status to archived (no move)
- [x] `lean-spec unarchive <spec>` sets status to complete (no move)
- [x] Specs in `archived/` folder still treated as archived (deprecation warning shown)
- [x] `lean-spec migrate-archived` moves specs and sets statuses
- [x] UI board view shows archived column correctly
- [x] Existing links/dependencies still resolve

## Notes

Related: [077-archiving-strategy](specs/archived/077-archiving-strategy/README.md) documented the original folder-based approach. This spec supersedes that design decision.
