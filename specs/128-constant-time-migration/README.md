---
status: planned
created: '2025-11-28'
tags:
  - cli
  - migration
  - dx
  - performance
priority: high
created_at: '2025-11-28T01:21:44.679Z'
updated_at: '2025-11-28T01:24:56.701Z'
related:
  - 047-git-backfill-timestamps
---

# Constant-Time Migration (O(1) UX)

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-28 · **Tags**: cli, migration, dx, performance

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

- [ ] Audit current migration bottlenecks (profile with 100+ specs)
- [ ] Implement batch folder restructure (`migrate --auto`)
- [ ] Add auto-detection for source formats
- [ ] Parallelize backfill across specs
- [ ] Update `validate` to batch mode
- [ ] Update docs to show single-command migration
- [ ] Remove per-spec time estimates (irrelevant if instant)

## Test

- [ ] Migration of 100 specs completes in < 30 seconds
- [ ] Migration of 500 specs completes in < 60 seconds  
- [ ] Time increase from 100 → 500 specs is < 2x (not 5x)
- [ ] Single command handles entire migration

## Success Metrics

| Spec Count | Current Time | Target Time |
|------------|--------------|-------------|
| 20 | 5-30 min | < 30 sec |
| 100 | 15-60 min | < 30 sec |
| 500 | hours | < 60 sec |

## Notes

Related: [063-migration-from-existing-tools](../063-migration-from-existing-tools) - original migration design
Related: [047-git-backfill-timestamps](../047-git-backfill-timestamps) - backfill command (already performant)
