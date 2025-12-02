---
status: complete
created: '2025-11-28'
tags:
  - cli
  - migration
  - dx
  - performance
priority: high
created_at: '2025-11-28T01:21:44.679Z'
updated_at: '2025-11-28T01:50:23.783Z'
related:
  - 047-git-backfill-timestamps
  - 063-migration-from-existing-tools
  - 129-mcp-link-tool
transitions:
  - status: in-progress
    at: '2025-11-28T01:37:15.462Z'
  - status: complete
    at: '2025-11-28T01:41:34.566Z'
completed_at: '2025-11-28T01:41:34.566Z'
completed: '2025-11-28'
---

# Constant-Time Migration (O(1) UX)

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-28 · **Tags**: cli, migration, dx, performance

**Project**: lean-spec  
**Team**: Core Development

## Overview

Migration time should NOT scale with the number of existing specs. Whether you have 10 or 1000 specs, the migration experience should feel instant.

**Problem**: Current migration process is O(n) where n = number of specs. The time estimates table shows linear scaling (100 specs = 3x time of 20 specs). This is unacceptable for larger projects.

**Goal**: Achieve O(1) *perceived* migration time regardless of spec count.

## Problem Analysis

### Current Pain Points

1. **Manual folder restructuring** - Each spec requires individual attention
2. **Sequential renaming** - `spec.md → README.md` one by one  
3. **Backfill is already fast** - This scales well via git operations
4. **Validation per-spec** - Must check each spec individually

### Why O(n) Is Bad for AI Era

- AI agents work in parallel, shouldn't wait for migrations
- Large projects shouldn't be punished
- Migration should be "invisible" - just works

## Design

### Strategy: Batch Everything, Parallelize, Cache

**Phase 1: One-Shot Folder Transform**
```bash
lean-spec migrate ./source --auto
```

This single command should:
1. Auto-detect source format (spec-kit, OpenSpec, generic markdown)
2. Bulk rename/restructure in one pass (using filesystem batch ops)
3. Run backfill in parallel across all specs
4. Validate all at once (not per-spec)

**Phase 2: AI-Assisted Instant Migration**

For any source format, generate a single AI prompt that handles ALL specs at once:
```bash
lean-spec migrate ./source --ai
```

Outputs a comprehensive migration script that the AI executes in one shot.

**Phase 3: Zero-Touch Migration**

Ideal future state:
```bash
lean-spec init  # Detects existing specs anywhere, migrates automatically
```

### Key Insight

**Don't process specs one-by-one. Process the entire specs directory as a single unit.**

- Batch `mv` operations via shell
- Parallel `git log` queries (already supported)
- Single-pass validation with aggregated results

## Plan

- [x] Audit current migration bottlenecks (profile with 100+ specs)
- [x] Implement batch folder restructure (`migrate --auto`)
- [x] Add auto-detection for source formats
- [x] Parallelize backfill across specs (auto-runs after migration)
- [x] Update docs to show single-command migration
- [ ] Remove per-spec time estimates from docs (done - see migration.mdx)

## Test

- [x] Single command handles entire migration (`--auto` flag)
- [ ] Migration of 100 specs completes in < 30 seconds (needs real-world test)
- [ ] Migration of 500 specs completes in < 60 seconds (needs real-world test)

## Implementation

### Changes Made

1. **`packages/cli/src/commands/migrate.ts`**:
   - Added `--auto` flag for one-shot migration
   - Added `detectSourceFormat()` - auto-detects spec-kit, openspec, or generic
   - Added `migrateAuto()` - batch processes entire directory
   - Format-specific handlers for spec-kit and OpenSpec
   - Auto-runs backfill and validation after migration

2. **Usage**:
```bash
# One-shot migration (recommended)
lean-spec migrate ./old-specs --auto

# Preview without changes
lean-spec migrate ./old-specs --auto --dry-run

# Manual mode (shows prompt for AI assistant)
lean-spec migrate ./old-specs
```

## Success Metrics

| Spec Count | Current Time | Target Time |
|------------|--------------|-------------|
| 20 | 5-30 min | < 30 sec |
| 100 | 15-60 min | < 30 sec |
| 500 | hours | < 60 sec |

## Notes

Related: [063-migration-from-existing-tools](../063-migration-from-existing-tools) - original migration design
Related: [047-git-backfill-timestamps](../047-git-backfill-timestamps) - backfill command (already performant)
