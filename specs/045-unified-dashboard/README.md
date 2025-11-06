---
status: in-progress
created: '2025-11-04'
tags:
  - ux
  - visualization
  - analytics
  - launch
  - v0.2.0
priority: high
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-06T20:59:00Z'
completed_at: '2025-11-04T10:21:40.759Z'
completed: '2025-11-04'
transitions:
  - status: complete
    at: '2025-11-04T10:21:40.759Z'
  - status: in-progress
    at: '2025-11-06T06:55:31.151Z'
---

# Unified Analytics & Dashboard

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-04 · **Tags**: ux, visualization, analytics, launch, v0.2.0

**Split into sub-specs for Context Economy** - See detailed sections below

## Overview

Consolidate analytics/visualization commands and create a comprehensive dashboard view for LeanSpec.

### What We're Building

1. **Merge `stats` + `timeline`** → Unified analytics command with velocity tracking
2. **Create `dashboard` command** → Comprehensive project health overview
3. **Add velocity metrics** → Measure SDD effectiveness (cycle time, throughput, WIP)

### Why Now?

- v0.2.0 launch requires polished, cohesive UX
- Analytics commands overlap in purpose (both show trends/metrics)
- Need single entry point for "show me project health"
- **Velocity is critical metric for SDD adoption** - proves if specs help or hinder

### Current vs Desired State

**Current:**
```bash
lspec list       # Browse/filter specs
lspec board      # Kanban view  
lspec deps       # Dependency graph
lspec gantt      # Timeline planning
lspec stats      # Numbers + bar charts
lspec timeline   # Historical trends (redundant!)
```

**Desired:**
```bash
# PM Commands (unchanged)
lspec list       # Browse/filter specs
lspec board      # Kanban view
lspec deps       # Dependency graph  
lspec gantt      # Timeline planning

# Analytics (unified with velocity)
lspec stats              # Current metrics (default)
lspec stats --timeline   # Add timeline section
lspec stats --velocity   # NEW: Cycle time analysis
lspec stats --all        # Everything combined

# Dashboard (new)
lspec            # Default: comprehensive overview
lspec dashboard  # Explicit command
```

## Key Features

### 1. Timestamp Tracking (Foundation)
Add precise timestamps alongside existing dates to enable velocity metrics:
- `created_at`, `updated_at`, `completed_at` (ISO 8601)
- Optional `transitions` array for stage duration tracking
- Backward compatible (infer from dates if missing)

### 2. Velocity Metrics
Track what matters for SDD effectiveness:
- **Cycle Time**: Created → Completed (avg, median, P50-P95)
- **Stage Duration**: Time in each status (identify bottlenecks)
- **Throughput**: Specs/week (trending up/down?)
- **WIP Limits**: Concurrent active specs (manage context switching)

### 3. Enhanced Stats Command
Merge timeline functionality into stats:
- `lspec stats` → Current behavior (backward compatible)
- `lspec stats --timeline` → Add 14-day activity section
- `lspec stats --velocity` → Show cycle time analysis
- `lspec stats --all` → Everything combined

### 4. Dashboard Command
Single glanceable view of project health:
- **Project Health**: Totals by status/priority
- **Needs Attention**: Smart insights (overdue, critical, long-running)
- **Recent Activity**: 14-day sparkline with velocity summary
- **In Progress**: Top 5 active specs with age
- **Quick Stats**: Top tags, assignees

## Quick Reference

### Command Comparison

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `lspec` | Quick overview | Daily standup, "what's happening?" |
| `lspec list` | Browse/search specs | Find specific spec, apply filters |
| `lspec board` | Kanban workflow | Sprint planning, status changes |
| `lspec stats` | Deep analytics | Metrics review, velocity analysis |

### Dashboard Output Example

```
╔══════════════════════════════════════════════════════════╗
║  LeanSpec Dashboard · lean-spec                          ║
╚══════════════════════════════════════════════════════════╝

📊 Project Health
  Total: 42 specs · 15 in-progress · 20 complete · 5 planned

⚠️  Needs Attention
  • 2 specs overdue (spec-001, spec-003)
  • 3 critical priority specs still planned

📈 Recent Activity (Last 14 Days)
  Created:   8 specs  ████████░░░░░░
  Completed: 4 specs  ████░░░░░░░░░░
  
⏳ In Progress (5)
  🔴 spec-042-mcp-error-handling  #bug #critical  (3d)
  🟠 spec-045-unified-dashboard   #ux #launch     (2d)
  
🚀 Velocity: 5.2d avg cycle time, 2.8 specs/week ↑, WIP: 5
```

## Sub-Specs

Detailed information split for Context Economy (<400 lines per file):

- **[DESIGN.md](./DESIGN.md)** - Architecture, timestamp tracking, command structure
- **[RATIONALE.md](./RATIONALE.md)** - Why velocity matters, design decisions, alternatives
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Step-by-step implementation plan with phases
- **[TESTING.md](./TESTING.md)** - Comprehensive test strategy and success criteria

## Success Criteria

**User Experience:**
- New user runs `lspec`, immediately understands project state
- < 5 seconds to identify what needs attention
- No breaking changes for existing users

**Technical:**
- < 300ms render time for 100 specs
- Backward compatible (`lspec stats` unchanged)
- Single `loadAllSpecs()` call in dashboard

**Business:**
- Better demo-ability for v0.2.0 launch
- Proves SDD effectiveness with velocity data
- Reduces "how do I see X?" support questions

## Dependencies

None - standalone feature for v0.2.0

## Notes

### Why This Matters

**v0.2.0 needs polished UX:**
- Dashboard makes great first impression
- Velocity metrics prove SDD value objectively
- Consolidated commands reduce confusion

**Velocity is SDD's feedback loop:**
- Proves whether specs accelerate or slow development
- Identifies workflow bottlenecks
- Tracks team learning curve
- Makes SDD adoption measurable

### Migration Path

`lspec timeline` will be deprecated in favor of `lspec stats --history`:
- v0.2.0: Add deprecation warning
- v0.3.0: Keep both working
- v0.4.0: Remove timeline command

Existing users see no breaking changes in v0.2.0.

### Future Enhancements (Post v0.2.0)

- Interactive dashboard with arrow key navigation
- Custom dashboard layouts via config
- HTML/PDF report export
- Real-time updates with `--watch` mode
