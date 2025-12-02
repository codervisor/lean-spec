# Rationale: Why Velocity Tracking Matters for SDD

## The SDD Adoption Challenge

Teams wonder: "Does writing specs slow us down?"
- Need data to prove SDD value, not just gut feel
- Velocity metrics provide objective measurement
- Makes SDD adoption measurable and defensible

## What Velocity Reveals

### 1. Cycle Time (Created → Completed)
- **Shorter** = specs help clarify work faster
- **Longer** = specs might be too detailed or not actionable
- **Target**: < 7 days (configurable per team)

### 2. Stage Duration (Time in each status)
- **Long "Planned"** = analysis paralysis or unclear specs
- **Long "In-Progress"** = implementation blockers or scope creep
- **Helps identify process bottlenecks**

### 3. Throughput (Specs completed per period)
- **Increasing** = team getting better with SDD
- **Stable** = sustainable pace
- **Decreasing** = investigate blockers

### 4. WIP Limits (Concurrent active specs)
- **Too high (>5)** = context switching overhead
- **Too low (<2)** = might not be using SDD effectively
- **Kanban principle**: limit WIP to improve flow

## Using Velocity to Improve

- **Weekly review**: "Why did spec-X take 12 days?"
- **Identify patterns**: Do certain types take longer?
- **Adjust**: Simplify spec templates, add more detail, etc.
- **Prove ROI**: "Our cycle time dropped 40% after adopting SDD"

## Why Velocity is Critical for SDD

Velocity is not just a metric—it's the feedback loop that makes SDD a learning system:

1. **Proves whether specs accelerate or slow down development**
2. **Identifies workflow bottlenecks** (long planned→in-progress, or in-progress→complete)
3. **Tracks team learning curve with SDD over time**
4. **Provides data for continuous improvement**
5. **Makes SDD adoption measurable and defensible to stakeholders**

## Timestamp vs Date Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| **Date only** (current) | Simple, human-readable | Imprecise, can't distinguish same-day events |
| **Timestamp** (proposed) | Precise, enables velocity metrics | More complex, harder to edit manually |
| **Hybrid** (this spec) | Best of both: human dates + precise timestamps | Requires both fields, migration needed |

### Decision: Hybrid Approach
- Keep `created: YYYY-MM-DD` (human-readable, required)
- Add `created_at: ISO8601` (precise, auto-generated)
- Graceful degradation: velocity works with dates if timestamps missing
- Migration: infer timestamps from dates for existing specs

## Dashboard Design Inspiration

### OpenSpec's Approach
```typescript
// OpenSpec view.ts structure
- Summary (specs count, changes count, task progress)
- Active Changes (with progress bars)
- Completed Changes
- Specifications (sorted by requirement count)
- Footer (helpful hints)
```

### Our Adaptation
```typescript
// LeanSpec dashboard.ts structure
- Project Health (total, status, priority)
- Needs Attention (smart insights: overdue, critical)
- Recent Activity (14-day sparkline)
- In Progress (top 5 active specs)
- Quick Stats (top tags, assignees)
- Footer (command hints)
```

### Key Differences
- We focus on "needs attention" (actionable)
- We don't have "changes" concept (simpler)
- We emphasize priority more (critical path)
- We show assignee workload

## Migration for Existing Users

### v0.2.0 Release Notes
```markdown
## New: Dashboard Command

Run `lean-spec` (no arguments) to see a comprehensive project overview!

The dashboard combines summary stats, recent activity, and active work
into a single glanceable view. Perfect for daily standup or checking
project health.

Individual commands (list, board, gantt, stats) remain unchanged.

## Enhanced: Stats Command

`lean-spec stats` now supports timeline views:
- `lean-spec stats --timeline` - add 14-day activity
- `lean-spec stats --history` - full historical view
- `lean-spec stats` - current stats only (unchanged)

The standalone `lean-spec timeline` command is deprecated and will be
removed in v0.4.0. Use `lean-spec stats --history` instead.
```

## Alternatives Considered

### Option A: Separate analytics command
```bash
lean-spec analytics           # New command
lean-spec analytics --stats   # Current stats
lean-spec analytics --timeline # Timeline view
```
- ✅ Clear namespace
- ❌ More typing
- ❌ Breaks backward compatibility

### Option B: Enhance stats (This Spec)
```bash
lean-spec stats               # Current behavior (default)
lean-spec stats --timeline    # Add timeline
lean-spec stats --history     # Full timeline focus
```
- ✅ Backward compatible
- ✅ Less typing
- ✅ Intuitive progressive disclosure
- ❌ Stats name doesn't perfectly fit timeline

### Option C: Keep separate
- ✅ No breaking changes
- ❌ Redundant code
- ❌ User confusion (which to use?)

### Decision: Option B
Best balance of compatibility and consolidation
