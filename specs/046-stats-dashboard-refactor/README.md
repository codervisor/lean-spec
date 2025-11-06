---
status: complete
created: '2025-11-04'
tags:
  - ux
  - refactor
  - v0.2.0
priority: high
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-06T21:35:00Z'
transitions:
  - status: in-progress
    at: '2025-11-04T13:09:35.107Z'
  - status: complete
    at: '2025-11-04T13:10:54.267Z'
completed_at: '2025-11-04T13:10:54.267Z'
completed: '2025-11-04'
---

# Stats & Dashboard Reorganization

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-04 · **Tags**: ux, refactor, v0.2.0

**Split into sub-specs for Context Economy**

## Overview

Simplify and consolidate analytics/dashboard commands to create focused, PM-friendly overview tools.

### The Problem

Current command structure doesn't align with user needs:
1. "Analytics" is too verbose - "Stats" is more concise
2. Stats shows too much by default - Users need quick glance
3. Smart insights are siloed - Should be unified  
4. Board lacks context - Should show health metrics
5. Dashboard is redundant - Overlaps with stats + board

### Solution

**Command Changes:**
```bash
# Before
lspec analytics    # Too verbose
lspec dashboard    # Separate command  
lspec board        # Kanban only

# After (v0.2.0)
lspec stats             # Essential metrics (default)
lspec stats --full      # Full analytics
lspec board             # Kanban + health summary
lspec board --simple    # Kanban only

# REMOVED:
lspec analytics    # → use `lspec stats`
lspec dashboard    # → use `lspec board`
```

## Key Changes

### 1. Rename analytics → stats
- Shorter, more intuitive name
- Matches common CLI patterns
- Less intimidating for PMs

### 2. Simplify default stats output
- Focus on actionable insights
- Health score at a glance
- "Needs Attention" highlights issues
- Prompt for `--full` if users want more

### 3. Enhance board with health summary
- Add health box at top of board
- Show totals, completion %, alerts
- Include velocity snapshot
- Keep kanban columns below

### 4. Remove dashboard command
- Functionality merged into enhanced board
- Reduces command sprawl
- Simpler mental model

## Sub-Specs

Detailed information split for Context Economy:

- **[DESIGN.md](./DESIGN.md)** - Full command redesign, architecture, health algorithms

## Status

✅ **COMPLETE** - All changes shipped in v0.2.0

### Breaking Changes

**v0.2.0 removes**:
- `lspec analytics` → use `lspec stats`
- `lspec dashboard` → use `lspec board`

Migration path documented in CHANGELOG.

### What Shipped

**Phase 1: Rename analytics → stats** ✅
- Merged analytics.ts into stats.ts
- Removed analytics command
- Updated all documentation

**Phase 2: Simplify stats output** ✅
- Default shows essential metrics only
- `--full` flag for detailed view
- Smart insights integrated

**Phase 3: Enhance board** ✅
- Health summary box at top
- Velocity snapshot included
- `--simple` flag for original view

**Phase 4: Remove dashboard** ✅
- Command deleted
- Functionality available via board

## Impact

**Before:**
- 4 overlapping commands (analytics, dashboard, stats, board)
- Confusion about which to use
- Too much detail by default

**After:**
- 2 focused commands (stats, board)
- Clear use cases
- PM-friendly defaults
- Power users get `--full` flags

This reorganization improved command clarity and reduced cognitive overhead for v0.2.0 launch.
