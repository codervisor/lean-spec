---
status: in-progress
created: 2026-01-30
priority: medium
tags:
- refactor
- simplification
- specs
- archiving
created_at: 2026-01-30T01:59:06.018831Z
updated_at: 2026-01-30T01:59:06.018831Z
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

### Code Changes Required
1. **spec_loader.rs**: Remove `archived/` folder detection logic
2. **spec_archiver.rs**: Simplify to only update status field (no file move)
3. **archive.rs CLI**: Update to not move directories
4. **Desktop reader.rs**: Remove archived folder special handling

## Plan

- [ ] Move all specs from `archived/` back to `specs/`
- [ ] Ensure all formerly-archived specs have `status: archived`
- [ ] Update `spec_loader.rs` - remove folder-based archive detection
- [ ] Simplify `spec_archiver.rs` - status update only
- [ ] Update CLI archive command
- [ ] Update desktop reader.rs
- [ ] Test archive/unarchive workflow
- [ ] Remove empty `archived/` directory

## Test

- [ ] `lean-spec list` excludes archived specs by default
- [ ] `lean-spec list --all` shows archived specs
- [ ] `lean-spec archive <spec>` sets status to archived (no move)
- [ ] `lean-spec unarchive <spec>` sets status to complete (no move)
- [ ] UI board view shows archived column correctly
- [ ] Existing links/dependencies still resolve

## Notes

Related: [077-archiving-strategy](specs/archived/077-archiving-strategy/README.md) documented the original folder-based approach. This spec supersedes that design decision.
