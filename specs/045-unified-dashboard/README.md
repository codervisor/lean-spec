---
status: complete
created: '2025-11-04'
tags:
  - ux
  - visualization
  - analytics
  - launch
  - v0.2.0
priority: high
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-04T10:21:40.759Z'
completed_at: '2025-11-04T10:21:40.759Z'
completed: '2025-11-04'
transitions:
  - status: complete
    at: '2025-11-04T10:21:40.759Z'
---

# Unified Analytics & Dashboard

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-04 · **Tags**: ux, visualization, analytics, launch, v0.2.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

Consolidate analytics/visualization commands and create a comprehensive dashboard view for LeanSpec. This spec addresses two related UX improvements:

1. **Merge `stats` + `timeline`** into a unified analytics command with options
2. **Create dashboard command** for comprehensive project overview (OpenSpec-style)
3. **Add velocity tracking** to measure SDD effectiveness

**Why Now?**
- v0.2.0 launch requires polished, cohesive UX
- Analytics commands overlap in purpose (both show trends/metrics)
- Need single entry point for "show me project health"
- OpenSpec demonstrates superior dashboard approach
- **Velocity is critical metric for SDD adoption** - shows if specs actually help

**Why Velocity Matters for SDD:**
- Proves whether specs accelerate or slow down development
- Identifies workflow bottlenecks (long planned→in-progress, or in-progress→complete)
- Tracks team learning curve with SDD over time
- Provides data for continuous improvement
- Makes SDD adoption measurable and defensible

**Current State:**
```bash
# PM Commands (keep as-is)
lspec list       # Browse/filter specs
lspec board      # Kanban view  
lspec deps       # Dependency graph
lspec gantt      # Timeline planning

# Analytics (scattered, redundant)
lspec stats      # Numbers + bar charts
lspec timeline   # Historical trends
```

**Desired State:**
```bash
# PM Commands (unchanged)
lspec list       # Browse/filter specs
lspec board      # Kanban view
lspec deps       # Dependency graph  
lspec gantt      # Timeline planning

# Analytics (unified with velocity)
lspec analytics           # Combined stats + timeline + velocity
lspec analytics --stats   # Focus on metrics
lspec analytics --timeline # Focus on trends
lspec analytics --velocity # Focus on cycle times

# Dashboard (new - comprehensive overview)
lspec               # Default: show dashboard with velocity summary
lspec dashboard     # Explicit command
```

**Velocity Metrics to Track:**
- **Cycle Time**: Created → Completed (total time)
- **Lead Time**: Planned → In-Progress → Complete (by stage)
- **Throughput**: Specs completed per week/month
- **Work in Progress (WIP)**: Active specs at any time
- **Stage Duration**: Time in each status (planned, in-progress)

## Design

### Part 0: Timestamp Tracking (Foundation)

**Problem:** Current tracking only stores dates (YYYY-MM-DD), not timestamps
- Can't calculate precise cycle times
- Can't distinguish specs completed same day
- Loses granularity for velocity analysis

**Solution:** Add ISO 8601 timestamp fields alongside date fields

**Frontmatter Schema Update:**
```yaml
---
status: in-progress
created: '2025-11-04'           # Keep for human readability
created_at: '2025-11-04T14:30:00Z'  # NEW: Precise timestamp
updated: '2025-11-04'           # Keep for human readability  
updated_at: '2025-11-04T16:45:00Z'  # NEW: Precise timestamp
completed_at: '2025-11-05T10:15:00Z'  # NEW: When status changed to complete

# Status transition history (optional, for advanced velocity)
transitions:
  - status: planned
    at: '2025-11-04T14:30:00Z'
  - status: in-progress
    at: '2025-11-04T15:00:00Z'
  - status: complete
    at: '2025-11-05T10:15:00Z'
---
```

**Migration Strategy:**
- Add new `*_at` fields alongside existing date fields
- Auto-generate timestamps on spec creation/updates
- Existing specs: infer timestamps from dates (use midnight UTC)
- Keep date fields for backward compatibility
- Make timestamps optional (graceful degradation)

**Implementation:**
```typescript
// In frontmatter.ts
export interface SpecFrontmatter {
  // Existing date fields (keep for compatibility)
  created: string;        // YYYY-MM-DD
  updated?: string;       // YYYY-MM-DD
  completed?: string;     // YYYY-MM-DD
  
  // NEW: Precise timestamps
  created_at?: string;    // ISO 8601
  updated_at?: string;    // ISO 8601
  completed_at?: string;  // ISO 8601
  
  // NEW: Status transition history (optional)
  transitions?: Array<{
    status: SpecStatus;
    at: string;  // ISO 8601
  }>;
}

// Auto-generate timestamps on updates
export function enrichWithTimestamps(
  data: SpecFrontmatter, 
  previousData?: SpecFrontmatter
): void {
  const now = new Date().toISOString();
  
  // Set created_at if missing
  if (!data.created_at) {
    data.created_at = data.created 
      ? `${data.created}T00:00:00Z`  // Infer from date
      : now;
  }
  
  // Update updated_at on any change
  if (previousData) {
    data.updated_at = now;
  }
  
  // Set completed_at when status changes to complete
  if (data.status === 'complete' && 
      previousData?.status !== 'complete' &&
      !data.completed_at) {
    data.completed_at = now;
    data.completed = new Date().toISOString().split('T')[0];
  }
  
  // Track transition (optional)
  if (previousData && data.status !== previousData.status) {
    if (!data.transitions) data.transitions = [];
    data.transitions.push({
      status: data.status,
      at: now
    });
  }
}
```

### Part 1: Unified Analytics Command

**Command Name:** Keep `lspec stats` (backward compatible)

**Enhanced with velocity modes:**
```bash
lspec stats              # Default: current stats (unchanged)
lspec stats --timeline   # Add timeline section
lspec stats --history    # Full historical view (current timeline command)
lspec stats --velocity   # NEW: Cycle time & throughput analysis
lspec stats --all        # Everything (stats + timeline + velocity)
```

**Velocity Section Output:**
```
📊 Velocity Metrics (Last 30 Days)

Cycle Time (Created → Completed)
  Average:  5.2 days  ████████░░░░░░░░░░  (target: 7 days)
  Median:   4.0 days
  P50-P95:  2-12 days

Stage Duration
  Planned:       2.1 days  ████░░░░░░░░░░░░░░░░
  In-Progress:   3.5 days  ██████░░░░░░░░░░░░░░
  
Throughput
  Last 7 days:   3 specs  ████████████░░░░░░░░  (up from 2)
  Last 30 days: 12 specs  ████████████████████  (target: 10)
  
Work in Progress
  Current WIP:   5 specs  (recommended: < 5)
  Average WIP:   4.2 specs

Velocity Trend
  Week 1:  ████░░  2 specs
  Week 2:  ████░░  2 specs  
  Week 3:  ██████  3 specs  ↑ improving
  Week 4:  ██████  3 specs
```

**Implementation:**
- Calculate cycle time: `completed_at - created_at`
- Track stage durations from transitions array
- Show percentiles (P50, P90, P95) for cycle time distribution
- Compare to targets (configurable in .lspec/config.json)
- Show trends (last 4 weeks)

### Part 2: Comprehensive Dashboard Command

**Command:** `lspec` (no args) or `lspec dashboard`

**Purpose:** Quick project health overview combining:
- Summary metrics (from stats)
- Key activity indicators (from timeline)  
- Active work snapshot (from board)
- Smart insights (what needs attention)

**Dashboard Sections:**

```
╔══════════════════════════════════════════════════════════╗
║  LeanSpec Dashboard · lean-spec                          ║
╚══════════════════════════════════════════════════════════╝

📊 Project Health
  Total: 42 specs · 15 in-progress · 20 complete · 5 planned · 2 archived
  Priority: 🔴 2 critical · 🟠 5 high · 🟡 10 medium · 🟢 3 low

⚠️  Needs Attention
  • 2 specs overdue (spec-001, spec-003)
  • 3 critical priority specs still planned

📈 Recent Activity (Last 14 Days)
  Created:   ████████░░░░░░  8 specs
  Completed: ████░░░░░░░░░░  4 specs
  Velocity:  2.8 specs/week ↑ trending up
  
⏳ In Progress (5)
  🔴 spec-042-mcp-error-handling     @alice  #bug #critical  (3d)
  🟠 spec-045-unified-dashboard      @bob    #ux #launch     (2d)
  🟡 spec-026-init-pattern           @alice  #feature       (8d ⚠️ long)
  
🏷️  Top Tags
  launch (12) · feature (8) · bug (5) · docs (4)

🚀 Velocity Summary
  Avg Cycle Time:  5.2 days (target: 7d)
  Throughput:      2.8 specs/week ↑
  WIP:             5 specs (healthy)

─────────────────────────────────────────────────────────────
💡 Commands: lspec list | lspec board | lspec stats --velocity
```

**Smart Insights:**
- Show overdue specs first
- Highlight critical priority items
- Show specs assigned to user (if `--assignee` or git config)
- Suggest next actions

**Display Options:**
```bash
lspec                      # Full dashboard
lspec dashboard            # Explicit
lspec --compact            # Minimal (just health + attention)
lspec --expand-active      # Show all in-progress (not just top 5)
lspec --json               # JSON for tooling
```

**vs. Individual Commands:**

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `lspec` | Quick overview | Daily standup, "what's happening?" |
| `lspec list` | Browse/search specs | Find specific spec, apply filters |
| `lspec board` | Kanban workflow | Sprint planning, status changes |
| `lspec gantt` | Timeline planning | Schedule work, see deadlines |
| `lspec stats` | Deep analytics | Metrics review, team performance |

### Architecture

**File Structure:**
```
src/commands/
  ├── dashboard.ts       # NEW: Comprehensive overview
  ├── stats.ts          # ENHANCED: Merge timeline logic
  ├── list.ts           # KEEP: Detailed browsing
  ├── board.ts          # KEEP: Kanban view
  ├── gantt.ts          # KEEP: Timeline planning
  ├── deps.ts           # KEEP: Dependencies
  └── timeline.ts       # DEPRECATE → merge into stats.ts
```

**Code Reuse:**
- Extract shared visualization helpers to `utils/vis.ts`:
  - `createBar(count, max, width, char)` - reusable bar charts
  - `formatMetric(label, value, color)` - consistent metric display
  - `renderSection(title, content)` - section formatting
- Dashboard composes high-level summaries from other commands
- Stats command owns all analytics logic (including timeline)

**Performance:**
- Dashboard: Single `loadAllSpecs()` for all sections
- Smart caching between dashboard and other commands
- Lazy rendering (skip empty sections)
- Target: < 300ms for 100 specs

## Plan

### Part 0: Timestamp Tracking (Week 1)

**Foundation for velocity metrics**
- [ ] Update `SpecFrontmatter` interface with timestamp fields
  - [ ] Add `created_at?: string` (ISO 8601)
  - [ ] Add `updated_at?: string` (ISO 8601)
  - [ ] Add `completed_at?: string` (ISO 8601)
  - [ ] Add `transitions?: Array<{status, at}>` (optional)
- [ ] Create `enrichWithTimestamps()` helper
  - [ ] Auto-generate `created_at` on spec creation
  - [ ] Update `updated_at` on any frontmatter change
  - [ ] Set `completed_at` when status → complete
  - [ ] Track status transitions (optional)
- [ ] Update `create.ts` to set initial timestamps
- [ ] Update `update.ts` to maintain timestamps
- [ ] Migration: Infer timestamps from dates for existing specs
- [ ] Add tests for timestamp generation logic

### Part 1: Unified Analytics (Week 1-2)

**Part A: Merge timeline into stats**
- [ ] Create `utils/vis.ts` with shared visualization helpers
  - [ ] `createBar(count, max, width, char)` - reusable bar charts
  - [ ] `formatMetric(label, value, color)` - metric formatting
  - [ ] Date range helpers
- [ ] Enhance `stats.ts` with timeline functionality
  - [ ] Add `--timeline` flag (show timeline section after stats)
  - [ ] Add `--history` flag (full timeline focus, like current timeline)
  - [ ] Add `--velocity` flag (NEW: cycle time analysis)
  - [ ] Add `--all` flag (everything combined)
  - [ ] Keep default behavior (current stats only)
- [ ] Extract bar chart logic from both commands to `utils/vis.ts`
- [ ] Update tests for enhanced stats command
- [ ] Mark `timeline.ts` as deprecated (but keep working)

**Part B: Velocity Calculations**
- [ ] Create `utils/velocity.ts` with velocity analysis
  - [ ] `calculateCycleTime(spec)` - created_at → completed_at
  - [ ] `calculateStageDuration(spec, status)` - time in each status
  - [ ] `calculateThroughput(specs, period)` - specs per week/month
  - [ ] `calculateWIP(specs, date)` - active specs at point in time
  - [ ] `calculatePercentiles(times, [50, 90, 95])` - distribution
- [ ] Implement velocity section rendering
  - [ ] Cycle time: avg, median, P50-P95
  - [ ] Stage durations with bars
  - [ ] Throughput with trend indicators
  - [ ] WIP metrics
  - [ ] Weekly velocity trend (last 4 weeks)
- [ ] Add configurable targets in config.json
  - [ ] `velocity.target_cycle_time: 7` (days)
  - [ ] `velocity.target_throughput: 10` (specs/month)
  - [ ] `velocity.max_wip: 5` (concurrent specs)

**Part C: Testing**
- [ ] Test `lspec stats` (default behavior unchanged)
- [ ] Test `lspec stats --timeline` (integrated view)
- [ ] Test `lspec stats --history` (full timeline)
- [ ] Test `lspec stats --velocity` (cycle time analysis)
- [ ] Test `lspec stats --all` (comprehensive)
- [ ] Test velocity calculations with mock data
- [ ] Test graceful degradation (specs without timestamps)
- [ ] Verify backward compatibility

### Part 2: Dashboard Command (Week 2)

**Part A: Core dashboard implementation**
- [ ] Create `src/commands/dashboard.ts`
- [ ] Implement Summary section (project health)
- [ ] Implement Needs Attention section (smart insights)
- [ ] Implement Recent Activity section (14-day sparkline + velocity)
- [ ] Implement In Progress section (top active specs with age)
- [ ] Implement Quick Stats section (tags, assignees)
- [ ] Implement Velocity Summary section (cycle time, throughput, WIP)
- [ ] Add helpful footer with command hints

**Part B: CLI integration**
- [ ] Make `lspec` (no args) default to dashboard
- [ ] Add explicit `lspec dashboard` command
- [ ] Support all filter options (--tag, --status, etc.)
- [ ] Add display options (--compact, --expand-active)
- [ ] Add JSON output mode (--json)

**Part C: Smart insights**
- [ ] Detect overdue specs (due < today, status != complete)
- [ ] Highlight critical priority specs
- [ ] Show user's assigned work (from git config or --assignee)
- [ ] Flag long-running in-progress specs (> 14 days)
- [ ] Identify velocity bottlenecks (slow stages)
- [ ] Suggest next actions based on state

### Phase 3: Testing & Polish (Week 2-3)

**Unit tests:**
- [ ] Dashboard section rendering
- [ ] Smart insights logic
- [ ] Filter application
- [ ] JSON output structure

**Integration tests:**
- [ ] Empty project (show helpful init message)
- [ ] Small project (< 10 specs)
- [ ] Medium project (10-50 specs)
- [ ] Large project (100+ specs)
- [ ] With all filter combinations
- [ ] With display options

**Visual regression:**
- [ ] Compare dashboard output across sizes
- [ ] Verify Unicode characters render correctly
- [ ] Test color output (with/without color support)
- [ ] Test terminal width handling

### Phase 4: Documentation (Week 3)

**README updates:**
- [ ] Feature dashboard as primary command
- [ ] Add dashboard screenshot/GIF
- [ ] Update command reference table
- [ ] Show dashboard → drill-down workflow

**AGENTS.md updates:**
- [ ] Update AI instructions to use dashboard first
- [ ] Document `lspec stats --timeline` pattern
- [ ] Update command examples

**Help text:**
- [ ] Update `lspec --help` to show dashboard first
- [ ] Add examples to `lspec dashboard --help`
- [ ] Update `lspec stats --help` with new flags

### Phase 5: Migration & Deprecation (v0.3.0)

**Add deprecation warnings:**
- [ ] `lspec timeline` → "Use 'lspec stats --history' instead"
- [ ] Show migration hints in output
- [ ] Update CHANGELOG with deprecation notice

**Remove in v0.4.0:**
- [ ] Delete `src/commands/timeline.ts`
- [ ] Remove from CLI registration
- [ ] Archive any timeline-specific tests

## Test

### Part 0: Timestamp Tracking Tests

**Timestamp Generation:**
- [ ] New spec gets `created_at` set automatically
- [ ] `updated_at` updates on any frontmatter change
- [ ] Status change to complete sets `completed_at`
- [ ] Transitions array tracks status changes (if enabled)

**Migration & Compatibility:**
- [ ] Existing specs without timestamps still work
- [ ] Timestamps inferred from dates (midnight UTC)
- [ ] Date fields still required (backward compat)
- [ ] Graceful degradation when timestamps missing

**Edge Cases:**
- [ ] Spec created and completed same day (timestamps differ)
- [ ] Manual timestamp editing preserved
- [ ] Timezone handling consistent (UTC)

### Part 1: Enhanced Stats Command Tests

**Backward Compatibility:**
- [ ] `lspec stats` outputs same format as before (no breaking changes)
- [ ] `lspec stats --json` matches existing JSON schema
- [ ] All existing filter options work (--tag, --assignee, --priority)

**New Timeline Integration:**
- [ ] `lspec stats --timeline` adds timeline section after stats
- [ ] `lspec stats --history` shows full historical view
- [ ] `lspec stats --velocity` shows cycle time analysis
- [ ] `lspec stats --all` combines everything
- [ ] Timeline data matches previous `lspec timeline` output

**Velocity Calculations:**
- [ ] Cycle time accurate (created_at → completed_at)
- [ ] Stage durations sum correctly
- [ ] Throughput matches manual count
- [ ] WIP calculation correct for any date
- [ ] Percentiles (P50, P90, P95) accurate
- [ ] Trend indicators (↑↓→) correct

**Velocity Display:**
- [ ] Shows average, median cycle time
- [ ] Compares to configured targets
- [ ] Stage durations visualized with bars
- [ ] Throughput trends visible (last 4 weeks)
- [ ] WIP stays within healthy range
- [ ] Graceful when no completed specs yet

**Edge Cases:**
- [ ] Empty project shows helpful message
- [ ] Project with no dates (no created/completed fields)
- [ ] Filtered results still show timeline
- [ ] Very large date ranges don't break layout

### Part 2: Dashboard Command Tests

**Project States:**

**Empty Project:**
- [ ] Shows "No specs found" with init hint
- [ ] No sections rendered (clean state)
- [ ] Suggests `lspec init` to get started

**Small Project (< 10 specs):**
- [ ] All in-progress specs visible
- [ ] Summary shows accurate counts
- [ ] No truncation needed
- [ ] All sections proportional

**Medium Project (10-50 specs):**
- [ ] Top 5 in-progress shown by default
- [ ] `--expand-active` shows all
- [ ] Top tags displayed (limit 5)
- [ ] Timeline shows 14 days

**Large Project (100+ specs):**
- [ ] Summary remains concise
- [ ] Smart prioritization in "Needs Attention"
- [ ] Performance < 300ms
- [ ] No visual clutter

### Smart Insights Tests

**Smart Insights Tests**

**Overdue Detection:**
- [ ] Specs with `due < today` and `status != complete` flagged
- [ ] Shows count in "Needs Attention"
- [ ] Lists spec names (limit 3, then "and N more")

**Critical Priority:**
- [ ] Critical specs still planned highlighted
- [ ] Critical in-progress shown prominently
- [ ] Warning if critical overdue

**Long-Running Detection:**
- [ ] In-progress > 14 days flagged with ⚠️
- [ ] Age shown next to spec name (e.g., "8d")
- [ ] Helps identify potential bottlenecks

**User Assignment:**
- [ ] `--assignee alice` focuses on Alice's work
- [ ] Git config detection works (if configured)
- [ ] Shows user's active work first

**Velocity Bottlenecks:**
- [ ] Identifies stages with longest average duration
- [ ] Flags if WIP exceeds target
- [ ] Warns if throughput declining

### Filter Tests

- [ ] `--tag feature` filters all sections consistently
- [ ] `--status in-progress` shows only in-progress
- [ ] `--priority high` shows only high priority
- [ ] Multiple filters combine with AND logic
- [ ] Filtered counts accurate in summary

### Display Option Tests

- [ ] `--compact` shows minimal view (health + attention only)
- [ ] `--expand-active` reveals all in-progress specs
- [ ] `--json` outputs valid, comprehensive JSON
- [ ] Unknown options show helpful error

### Integration Tests

**Command Flow:**
- [ ] `lspec` defaults to dashboard
- [ ] `lspec dashboard` explicitly shows dashboard
- [ ] Dashboard → `lspec list` → dashboard (workflow)
- [ ] Dashboard respects .lspec/config.json

**Cross-Command Consistency:**
- [ ] Dashboard counts match `lspec list` counts
- [ ] Dashboard stats match `lspec stats` output
- [ ] Dashboard activity matches `lspec stats --timeline`

### Visual Tests

**Layout:**
- [ ] Sections align properly
- [ ] Box drawing characters render correctly
- [ ] Colors don't obscure information
- [ ] Terminal width respected (no wrapping)

**Accessibility:**
- [ ] Works without color (NO_COLOR env var)
- [ ] Unicode fallback for non-supporting terminals
- [ ] Screen reader compatible (semantic structure)

### Performance Tests

- [ ] 10 specs: < 100ms
- [ ] 50 specs: < 200ms
- [ ] 100 specs: < 300ms
- [ ] 500 specs: < 1s
- [ ] Single `loadAllSpecs()` call verified

### Regression Tests

- [ ] Existing commands unaffected (list, board, gantt, deps)
- [ ] `lspec stats` backward compatible
- [ ] JSON output schemas unchanged (where applicable)
- [ ] All existing tests still pass

## Notes

### Why Velocity Tracking is Critical for SDD

**The SDD Adoption Challenge:**
- Teams wonder: "Does writing specs slow us down?"
- Need data to prove SDD value, not just gut feel
- Velocity metrics provide objective measurement

**What Velocity Reveals:**

1. **Cycle Time** (Created → Completed)
   - Shorter = specs help clarify work faster
   - Longer = specs might be too detailed or not actionable
   - Target: < 7 days (configurable per team)

2. **Stage Duration** (Time in each status)
   - Long "Planned" = analysis paralysis or unclear specs
   - Long "In-Progress" = implementation blockers or scope creep
   - Helps identify process bottlenecks

3. **Throughput** (Specs completed per period)
   - Increasing = team getting better with SDD
   - Stable = sustainable pace
   - Decreasing = investigate blockers

4. **WIP Limits** (Concurrent active specs)
   - Too high (>5) = context switching overhead
   - Too low (<2) = might not be using SDD effectively
   - Kanban principle: limit WIP to improve flow

**Using Velocity to Improve:**
- Weekly review: "Why did spec-X take 12 days?"
- Identify patterns: Do certain types take longer?
- Adjust: Simplify spec templates, add more detail, etc.
- Prove ROI: "Our cycle time dropped 40% after adopting SDD"

**Timestamp vs Date Trade-offs:**

| Approach | Pros | Cons |
|----------|------|------|
| **Date only** (current) | Simple, human-readable | Imprecise, can't distinguish same-day events |
| **Timestamp** (proposed) | Precise, enables velocity metrics | More complex, harder to edit manually |
| **Hybrid** (this spec) | Best of both: human dates + precise timestamps | Requires both fields, migration needed |

**Decision: Hybrid Approach**
- Keep `created: YYYY-MM-DD` (human-readable, required)
- Add `created_at: ISO8601` (precise, auto-generated)
- Graceful degradation: velocity works with dates if timestamps missing
- Migration: infer timestamps from dates for existing specs

### Command Organization Philosophy

**PM Commands** (keep separate - distinct workflows):
- `list` - Browse/search/filter specs
- `board` - Kanban workflow (status changes)
- `deps` - Dependency visualization
- `gantt` - Timeline planning (schedule work)

**Analytics Commands** (consolidate - overlapping purpose):
- `stats` - Current metrics + historical trends
- `timeline` - Redundant with stats (merge in)

**Dashboard** (new - quick overview):
- `lspec` - Glanceable project health
- Entry point for daily use
- Directs to PM commands for detail

This organization makes sense because:
- PM commands have distinct UX patterns (kanban, graph, gantt chart)
- Analytics commands both show "numbers over time"
- Dashboard is a meta-view (doesn't replace PM commands)

### Why Merge Stats + Timeline?

**Current Redundancy:**
- Both load all specs
- Both show date-based trends
- Both have bar charts
- Both support same filters
- Both output similar visualizations

**Differences:**
- `stats` - emphasizes current state (status, priority, tags)
- `timeline` - emphasizes historical change (created/completed over time)

**Solution:** Make `stats` the comprehensive analytics command
- Default: current stats (backward compatible)
- `--timeline`: add timeline section
- `--history`: timeline-focused view

### Dashboard Design Inspiration

**OpenSpec's Approach:**
```typescript
// OpenSpec view.ts structure
- Summary (specs count, changes count, task progress)
- Active Changes (with progress bars)
- Completed Changes
- Specifications (sorted by requirement count)
- Footer (helpful hints)
```

**Our Adaptation:**
```typescript
// LeanSpec dashboard.ts structure
- Project Health (total, status, priority)
- Needs Attention (smart insights: overdue, critical)
- Recent Activity (14-day sparkline)
- In Progress (top 5 active specs)
- Quick Stats (top tags, assignees)
- Footer (command hints)
```

**Key Differences:**
- We focus on "needs attention" (actionable)
- We don't have "changes" concept (simpler)
- We emphasize priority more (critical path)
- We show assignee workload

### Smart Insights Algorithm

**"Needs Attention" section prioritizes:**

1. **Overdue & Critical** - highest urgency
   ```
   spec.frontmatter.due < today &&
   spec.frontmatter.status != 'complete' &&
   spec.frontmatter.priority == 'critical'
   ```

2. **Overdue & In-Progress** - likely blockers
   ```
   spec.frontmatter.due < today &&
   spec.frontmatter.status == 'in-progress'
   ```

3. **Critical & Planned** - not started yet
   ```
   spec.frontmatter.priority == 'critical' &&
   spec.frontmatter.status == 'planned'
   ```

4. **Long-running In-Progress** - potential stalls
   ```
   spec.frontmatter.status == 'in-progress' &&
   daysSince(spec.frontmatter.updated) > 14
   ```

Show top 3-5 items max, then "and N more need attention"

### Why `lspec` Should Default to Dashboard

**Current behavior:** `lspec` shows help
**Proposed:** `lspec` shows dashboard

**Reasoning:**
- Help still accessible via `lspec --help`
- Dashboard is most frequently needed view
- Matches modern CLI patterns (gh, git status at root)
- Better new user experience (show, don't tell)
- OpenSpec uses `openspec view` as primary command

**User flow:**
```bash
cd my-project
lspec                    # Quick overview (dashboard)
# See something interesting...
lspec list --tag bug     # Drill down
lspec board              # Change status
lspec                    # Check dashboard again
```

### Migration for Existing Users

**v0.2.0 Release Notes:**
```markdown
## New: Dashboard Command

Run `lspec` (no arguments) to see a comprehensive project overview!

The dashboard combines summary stats, recent activity, and active work
into a single glanceable view. Perfect for daily standup or checking
project health.

Individual commands (list, board, gantt, stats) remain unchanged.

## Enhanced: Stats Command

`lspec stats` now supports timeline views:
- `lspec stats --timeline` - add 14-day activity
- `lspec stats --history` - full historical view
- `lspec stats` - current stats only (unchanged)

The standalone `lspec timeline` command is deprecated and will be
removed in v0.4.0. Use `lspec stats --history` instead.
```

### Velocity Configuration (config.json)

**Add velocity targets and settings:**

```json
{
  "velocity": {
    "enabled": true,
    "targets": {
      "cycle_time_days": 7,
      "throughput_per_month": 10,
      "max_wip": 5
    },
    "alerts": {
      "long_running_days": 14,
      "overdue_critical": true
    },
    "tracking": {
      "use_timestamps": true,
      "track_transitions": true
    }
  }
}
```

**Defaults (if not configured):**
- Cycle time target: 7 days
- Max WIP: 5 concurrent specs
- Long-running threshold: 14 days
- Timestamps: auto-enabled
- Transitions: optional (off by default)

### Implementation Notes

**Shared Visualization Utilities (`utils/vis.ts`):**

```typescript
// Reusable bar chart (from stats.ts and timeline.ts)
export function createBar(
  count: number,
  maxCount: number,
  width: number,
  char: string = '━'
): string {
  const barLen = Math.round((count / maxCount) * width);
  return char.repeat(barLen);
}

// Consistent metric formatting
export function formatMetric(
  label: string,
  value: number,
  colorFn: (s: string) => string = chalk.cyan
): string {
  const labelWidth = 15;
  const valueWidth = 5;
  return `  ${label.padEnd(labelWidth)}  ${colorFn(value.toString().padStart(valueWidth))}`;
}

// Section rendering
export function renderSection(
  title: string,
  emoji: string,
  content: string[]
): void {
  console.log(chalk.bold(`${emoji} ${title}`));
  console.log('');
  content.forEach(line => console.log(line));
  console.log('');
}
```

**Velocity Utilities (`utils/velocity.ts`):**

```typescript
import dayjs from 'dayjs';

export interface VelocityMetrics {
  cycleTime: {
    average: number;
    median: number;
    p50: number;
    p90: number;
    p95: number;
  };
  stageDuration: {
    planned: number;
    inProgress: number;
  };
  throughput: {
    last7Days: number;
    last30Days: number;
    trend: 'up' | 'down' | 'stable';
  };
  wip: {
    current: number;
    average: number;
  };
}

export function calculateCycleTime(spec: SpecInfo): number | null {
  if (!spec.frontmatter.created_at || !spec.frontmatter.completed_at) {
    return null; // Fallback to date-based if no timestamps
  }
  const created = dayjs(spec.frontmatter.created_at);
  const completed = dayjs(spec.frontmatter.completed_at);
  return completed.diff(created, 'day', true); // fractional days
}

export function calculateStageDuration(
  spec: SpecInfo,
  status: SpecStatus
): number | null {
  if (!spec.frontmatter.transitions) return null;
  
  const transitions = spec.frontmatter.transitions;
  const enterIdx = transitions.findIndex(t => t.status === status);
  const exitIdx = transitions.findIndex((t, i) => i > enterIdx && t.status !== status);
  
  if (enterIdx === -1) return null;
  
  const enter = dayjs(transitions[enterIdx].at);
  const exit = exitIdx !== -1 
    ? dayjs(transitions[exitIdx].at)
    : dayjs(); // Still in this status
  
  return exit.diff(enter, 'day', true);
}

export function calculatePercentiles(
  values: number[],
  percentiles: number[]
): Record<number, number> {
  const sorted = [...values].sort((a, b) => a - b);
  const result: Record<number, number> = {};
  
  for (const p of percentiles) {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    result[p] = sorted[Math.max(0, index)];
  }
  
  return result;
}

export function calculateThroughput(
  specs: SpecInfo[],
  days: number
): number {
  const cutoff = dayjs().subtract(days, 'day');
  return specs.filter(s => 
    s.frontmatter.completed_at && 
    dayjs(s.frontmatter.completed_at).isAfter(cutoff)
  ).length;
}

export function calculateWIP(
  specs: SpecInfo[],
  date: dayjs.Dayjs = dayjs()
): number {
  return specs.filter(s => {
    const created = dayjs(s.frontmatter.created_at || s.frontmatter.created);
    if (created.isAfter(date)) return false;
    
    if (s.frontmatter.completed_at) {
      const completed = dayjs(s.frontmatter.completed_at);
      return completed.isAfter(date);
    }
    
    // Not completed yet, check if still active
    return s.frontmatter.status !== 'complete' && s.frontmatter.status !== 'archived';
  }).length;
}
```

**Dashboard JSON Schema:**

```typescript
interface DashboardOutput {
  version: string;
  timestamp: string;
  summary: {
    total: number;
    byStatus: Record<SpecStatus, number>;
    byPriority: Record<SpecPriority, number>;
  };
  attention: {
    overdue: string[];
    criticalPlanned: string[];
    longRunning: string[];
  };
  recentActivity: {
    period: string; // "14 days"
    created: number;
    completed: number;
  };
  velocity: {
    cycleTime: {
      average: number;
      median: number;
      target: number;
    };
    throughput: {
      perWeek: number;
      trend: 'up' | 'down' | 'stable';
    };
    wip: {
      current: number;
      target: number;
    };
  };
  inProgress: {
    count: number;
    specs: Array<{
      path: string;
      priority?: SpecPriority;
      assignee?: string;
      tags?: string[];
      ageInDays: number;
    }>;
  };
  topTags: Array<{ tag: string; count: number }>;
}
```

### Open Questions

1. **Timestamp format:** ISO 8601 with timezone or UTC only?
   - **Proposal:** UTC only (simplifies, matches Git convention)

2. **Transitions tracking:** Always on or opt-in?
   - **Proposal:** Opt-in via config (overhead for advanced users only)

3. **Velocity targets:** Hardcoded defaults or require config?
   - **Proposal:** Smart defaults (7d cycle, 5 WIP), overridable in config

4. **Historical specs:** Backfill timestamps or date-only?
   - **Proposal:** Infer from dates (midnight UTC), note in docs

5. **Dashboard JSON schema:** Should it be comprehensive or minimal?
   - **Proposal:** Comprehensive (include velocity for tooling integration)

6. **Smart insights:** How many to show before "and N more"?
   - **Proposal:** Top 5 items, then summarize

7. **Recent activity period:** 7 or 14 days?
   - **Proposal:** 14 days (balances detail vs. noise)

8. **In-progress age warning:** What threshold flags as "long-running"?
   - **Proposal:** 14 days (2x typical cycle time target)

9. **Velocity trend calculation:** Linear regression or simple comparison?
   - **Proposal:** Simple (last week vs. previous) for clarity

10. **User detection:** Should we auto-detect assignee from git config?
    - **Proposal:** Yes, but make it opt-in via config flag

### Alternatives Considered

**Option A: Separate analytics command**
```bash
lspec analytics           # New command
lspec analytics --stats   # Current stats
lspec analytics --timeline # Timeline view
```
- ✅ Clear namespace
- ❌ More typing
- ❌ Breaks backward compatibility

**Option B: Enhance stats (This Spec)**
```bash
lspec stats               # Current behavior (default)
lspec stats --timeline    # Add timeline
lspec stats --history     # Full timeline focus
```
- ✅ Backward compatible
- ✅ Less typing
- ✅ Intuitive progressive disclosure
- ❌ Stats name doesn't perfectly fit timeline

**Option C: Keep separate**
- ✅ No breaking changes
- ❌ Redundant code
- ❌ User confusion (which to use?)

**Decision: Option B** - Best balance of compatibility and consolidation

### Success Criteria

**User Experience:**
- [ ] New user runs `lspec`, immediately understands project state
- [ ] < 5 seconds to identify what needs attention
- [ ] Existing users don't notice breaking changes
- [ ] Smooth migration from timeline to stats --history

**Technical:**
- [ ] < 300ms render time for 100 specs
- [ ] Single `loadAllSpecs()` call in dashboard
- [ ] < 300 lines new code (reuse existing)
- [ ] No regressions in existing commands

**Business:**
- [ ] Better demo-ability for v0.2.0 launch
- [ ] Competitive with OpenSpec UX quality
- [ ] Reduces support questions about "how to see X"
- [ ] Positive beta tester feedback

### Future Enhancements (Post v0.2.0)

**Interactive Dashboard:**
- Arrow keys to navigate sections
- Press Enter to drill into list/board/gantt
- Real-time updates with `--watch`

**Custom Layouts:**
- Config file for dashboard sections
- User-defined insights (custom queries)
- Team-specific metrics

**Export Formats:**
- HTML dashboard for sharing
- PDF report generation
- Markdown summary for docs
