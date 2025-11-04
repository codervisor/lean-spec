---
status: complete
created: '2025-11-04'
tags:
  - ux
  - refactor
  - v0.2.0
priority: high
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-04T13:10:54.267Z'
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

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: The current command naming and information hierarchy doesn't align well with user needs:

1. **"Analytics" is too verbose** - "Stats" is more concise and intuitive for quick metrics
2. **Stats shows too much by default** - PMs and daily users need a quick glance, not a full report
3. **Smart insights are siloed** - Velocity + smart insights should be unified under stats
4. **Board lacks context** - The most important entry point should show key project health metrics
5. **Dashboard is redundant** - With improved stats + board, dashboard becomes unnecessary

**Why Now?**
- v0.2.0 launch needs polished, focused UX
- Feedback shows users want faster overview (current commands are too detailed)
- Board is the primary workflow entry point - should be more useful
- Consolidating commands reduces cognitive overhead

**Current State:**
```bash
lspec analytics              # Too verbose name, shows everything
lspec analytics --stats      # Subset of analytics
lspec analytics --velocity   # Subset of analytics
lspec dashboard              # Separate overview command
lspec board                  # Kanban only, no context
lspec stats                  # Old basic stats command
```

**Desired State:**
```bash
lspec stats                  # Essential metrics only (default: PM-friendly)
lspec stats --full           # Full detailed analytics (all sections)
lspec stats --velocity       # Focus on velocity metrics
lspec stats --timeline       # Focus on timeline/activity

lspec board                  # Kanban + project health summary at top
lspec board --simple         # Original kanban-only view

# Removed (v0.2.0):
lspec analytics              # REMOVED → use `lspec stats`
lspec dashboard              # REMOVED → use `lspec board`
```

## Design

### Part 1: Rename `analytics` → `stats`

**Why "stats" over "analytics"?**
- Shorter, easier to type
- More intuitive for quick metrics
- Matches common CLI patterns (`git stats`, `npm stats`)
- Less intimidating for non-technical PMs

**Implementation:**
1. Merge `src/commands/analytics.ts` logic into `src/commands/stats.ts`
2. Delete `src/commands/analytics.ts` entirely
3. Update command registration in `cli.ts`
4. Remove analytics from help text
5. Keep all analytics functionality (just rename command)

**Breaking Change (v0.2.0):**
- `lspec analytics` removed → use `lspec stats`
- Note in CHANGELOG as breaking change
- Update all documentation immediately

### Part 2: Simplify Default Stats Output

**Current Problem**: `lspec stats` shows everything (status, priority, tags, timeline, velocity)
- Too much info for quick check-ins
- Takes time to render
- Overwhelming for PMs

**New Default Output** (`lspec stats`):
```
📊 Spec Stats

📈 Overview
  Total Specs           42
  Active (Planned+WIP)  20
  Complete              15
  Health Score          73% ✓

📊 Status
  📅 Planned       ████░░░░  5
  ⏳ In Progress   ████████  15
  ✅ Complete      ██████░░  10

🎯 Priority Focus
  🔴 Critical      2 specs (1 overdue!)
  🟠 High          5 specs (3 in-progress)

⚠️  Needs Attention
  • spec-042: Critical bug overdue by 2 days
  • 5 specs in-progress > 7 days

🚀 Velocity Summary
  Avg Cycle Time   5.2 days ✓ (target: 7d)
  Throughput       2.8/week ↑
  WIP              5 specs

💡 Use `lspec stats --full` for detailed analytics
```

**Key Changes:**
- **Focus on actionable insights** - What needs attention?
- **Health score** - Simple completion rate (% complete)
- **Priority focus** - Only show priorities that matter (critical/high with issues)
- **Needs attention** - Top 3-5 actionable items
- **Velocity summary** - Key metrics only (not full breakdown)
- **Clear next action** - Prompt for `--full` if they want more

**Full Stats Output** (`lspec stats --full`):
- Everything from current analytics command
- Stats + Timeline + Velocity (all sections)
- Equivalent to current `lspec analytics` output

### Part 3: Integrate Smart Insights into Stats

**Current**: Smart insights in dashboard, velocity in analytics (separated)
**New**: Both unified in stats command

**Smart Insights Algorithm** (for "Needs Attention"):
1. **Critical overdue** - `priority=critical, due < today, status != complete`
2. **High overdue** - `priority=high, due < today, status != complete`
3. **Long-running WIP** - `status=in-progress, updated > 7 days ago`
4. **Blocked specs** - Has dependencies but can't start
5. **Critical not started** - `priority=critical, status=planned`

Show top 5 items, then "and N more need attention"

**Velocity Integration:**
- Include velocity summary in default stats
- Full velocity breakdown in `--full` or `--velocity`
- Make velocity calculations part of core stats logic

### Part 4: Enhance Board with Health Summary

**Why**: Board is the primary PM/workflow entry point - should provide context

**New Board Output:**
```
📋 Spec Kanban Board

╔══════════════════════════════════════════════════════════╗
║  Project Health                                          ║
║  42 total · 20 active · 15 complete · 73% health         ║
║  ⚠️  2 critical overdue · 5 specs WIP > 7 days           ║
║  🚀 Velocity: 5.2d avg cycle · 2.8/wk throughput         ║
╚══════════════════════════════════════════════════════════╝

📅 Planned (5)
  🔴 Critical (2)
    spec-048-critical-bug           @alice  #bug #launch
    spec-047-security-patch         @bob    #security
  🟠 High (3)
    spec-046-stats-refactor         @alice  #ux #refactor
    ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ In Progress (15)
  🔴 Critical (1)
    spec-042-error-handling         @alice  #bug  (8d ⚠️ long)
  ...
```

**Health Summary Box Shows:**
- **Totals** - Quick counts
- **Health score** - Simple % complete
- **Alerts** - Critical issues needing attention
- **Velocity snapshot** - Key metrics only

**Options:**
- `lspec board` - Default (with health summary)
- `lspec board --simple` - Original kanban-only view (no health box)
- `lspec board --health-only` - Just show health box, no kanban

**Implementation:**
- Extract health calculation to `utils/health.ts`
- Reuse velocity calculations from stats
- Keep board rendering clean (separate concerns)

### Part 5: Remove Dashboard Command

**Why Remove?**
- With enhanced board + simplified stats, dashboard is redundant
- Users can get overview from `lspec board`
- Detailed analytics from `lspec stats --full`
- Reduces command sprawl
**Migration Path:**
```
lspec dashboard              → lspec board
lspec dashboard --compact    → lspec board --health-only
lspec dashboard --json       → lspec stats --json
```

**Removal Strategy (v0.2.0):**
- Delete `src/commands/dashboard.ts` entirely
- Remove from CLI registration
- Update all documentation
- Note in CHANGELOG as breaking changekeep working
- v0.3.0: Remove command entirely

**New File Structure:**
```
src/commands/
  ├── stats.ts           # ENHANCED: Unified stats + velocity + insights
  ├── board.ts           # ENHANCED: Kanban + health summary
  └── ...                # analytics.ts and dashboard.ts DELETED

src/utils/
  ├── health.ts          # NEW: Health score calculation
  ├── velocity.ts        # KEEP: Velocity metrics (used by stats)
  ├── insights.ts        # NEW: Smart insights algorithm
  └── spec-stats.ts      # KEEP: Basic counting/grouping
```

**Health Score Calculation** (`utils/health.ts`):
```typescript
export interface HealthMetrics {
  score: number;           // 0-100
  totalSpecs: number;
  activeSpecs: number;
  completeSpecs: number;
  criticalIssues: string[];
  warnings: string[];
}

export function calculateHealth(specs: SpecInfo[]): HealthMetrics {
  // Simple: completion_rate = complete / total * 100
  
  let completeCount = 0;
  let completeWeight = 0;
  const criticalIssues: string[] = [];
  const warnings: string[] = [];
  
  for (const spec of specs) {
    const weight = priorityWeight(spec.frontmatter.priority);
    totalWeight += weight;
    
    if (spec.frontmatter.status === 'complete') {
      completeWeight += weight;
    }
    
    // Detect critical issues
    if (isCriticalOverdue(spec)) {
      criticalIssues.push(spec.path);
    }
    if (isLongRunning(spec)) {
      warnings.push(spec.path);
    }
  }
  
  return {
    score: Math.round((completeWeight / totalWeight) * 100),
    totalSpecs: specs.length,
    activeSpecs: specs.filter(s => ['planned', 'in-progress'].includes(s.frontmatter.status)).length,
    completeSpecs: specs.filter(s => s.frontmatter.status === 'complete').length,
    criticalIssues,
    warnings,
  };
}
```

**Smart Insights** (`utils/insights.ts`):
```typescript
export interface Insight {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  specs: string[];
}

export function generateInsights(specs: SpecInfo[]): Insight[] {
  const insights: Insight[] = [];
  
  // 1. Critical overdue
  const criticalOverdue = specs.filter(s => 
    s.frontmatter.priority === 'critical' &&
    s.frontmatter.due && dayjs(s.frontmatter.due).isBefore(dayjs()) &&
    s.frontmatter.status !== 'complete'
  );
  
  if (criticalOverdue.length > 0) {
    insights.push({
      severity: 'critical',
      message: `${criticalOverdue.length} critical specs overdue`,
      specs: criticalOverdue.map(s => s.path),
    });
  }
  
  // 2. Long-running WIP
  const longRunning = specs.filter(s =>
    s.frontmatter.status === 'in-progress' &&
    s.frontmatter.updated &&
    dayjs().diff(dayjs(s.frontmatter.updated), 'day') > 7
  );
  
  if (longRunning.length > 0) {
    insights.push({
      severity: 'warning',
      message: `${longRunning.length} specs in-progress > 7 days`,
      specs: longRunning.map(s => s.path),
    });
  }
  
  // 3. Critical not started
  // ... more insight rules
  
  return insights.slice(0, 5); // Top 5 only
}
```

## Plan

**Step 1.1: Enhance stats command**
- [ ] Merge all `analytics.ts` logic into `stats.ts`
- [ ] Add default simplified output
- [ ] Add `--full` flag (shows everything from old analytics)
- [ ] Add `--velocity`, `--timeline` flags (focus modes)
- [ ] Keep all existing analytics functionality

**Step 1.2: Add smart insights**
- [ ] Create `utils/insights.ts` with insight generation
- [ ] Integrate insights into default stats output
- [ ] Add "Needs Attention" section
- [ ] Test with various project states

**Step 1.3: Remove analytics command**
- [ ] Delete `src/commands/analytics.ts` file
- [ ] Remove from `src/commands/index.ts` exports
- [ ] Remove from CLI registration in `cli.ts`
- [ ] Update CHANGELOG with breaking change note

**Step 1.4: Update documentation**
- [ ] Update README (remove analytics, show stats)
- [ ] Update AGENTS.md (use stats, not analytics)
- [ ] Update help text
- [ ] Add migration note to CHANGELOGflags
- [ ] Update help text
- [ ] Mark `analytics` as deprecated in help

### Phase 2: Enhance Board (Week 1-2)

**Step 2.1: Add health calculations**
- [ ] Create `utils/health.ts` with health score logic
- [ ] Implement simple completion calculation
- [ ] Add critical issue detection
- [ ] Add warning detection (long-running WIP)

**Step 2.2: Update board command**
- [ ] Add health summary box at top
- [ ] Include velocity snapshot
- [ ] Add `--simple` flag (original view)
- [ ] Add `--health-only` flag (just summary)
- [ ] Ensure health box doesn't break existing layout

**Step 2.3: Test board enhancements**
- [ ] Test with various project sizes
### Phase 3: Remove Dashboard (Week 2)

**Step 3.1: Delete dashboard command**
- [ ] Delete `src/commands/dashboard.ts` file
- [ ] Remove from `src/commands/index.ts` exports
- [ ] Remove from CLI registration in `cli.ts`
- [ ] Update CHANGELOG with breaking change note

**Step 3.2: Update documentation**
- [ ] Remove dashboard from README
- [ ] Update AGENTS.md (AI should use board, not dashboard)
- [ ] Update help text
- [ ] Add migration guide to CHANGELOG

**Step 3.3: Verify removal**
- [ ] Ensure no references to dashboard remain
- [ ] Update any tests that used dashboard
- [ ] Clean up any dashboard-related utilities
**Step 3.3: Plan removal**
- [ ] Schedule for v0.3.0
- [ ] Add to CHANGELOG
- [ ] Communicate in release notes

### Phase 4: Testing (Week 2)

**Unit tests:**
- [ ] Test health score calculation (various priority mixes)
- [ ] Test insight generation (all severity levels)
- [ ] Test stats output modes (default, --full, --velocity)
- [ ] Test board with/without health summary

**Integration tests:**
- [ ] Test command deprecation warnings
- [ ] Test backward compatibility (analytics still works)
- [ ] Test filter options work with new commands
- [ ] Test JSON output formats

**Visual regression:**
- [ ] Compare new stats output (readable, not overwhelming)
- [ ] Verify board health box layout
**Documentation:**
- [ ] Update README with new command examples
- [ ] Add stats/board screenshots
- [ ] Document all flags (--full, --simple, etc.)
- [ ] Update AGENTS.md for AI usage

**Migration guide:**
- [ ] Add BREAKING CHANGES section to CHANGELOG
- [ ] Document analytics → stats migration
- [ ] Document dashboard → board migration
- [ ] Provide command mapping table

**Release:**
- [ ] Update CHANGELOG with breaking changes
- [ ] Tag as v0.2.0
- [ ] Announce breaking changes clearly
- [ ] Note: Pre-1.0, breaking changes acceptable
**Release:**
- [ ] Update CHANGELOG
- [ ] Tag as v0.2.0
- [ ] Announce deprecations
- [ ] Plan v0.3.0 removal timeline

## Test

### Stats Command Tests

**Default output (simplified):**
- [ ] Shows only essential metrics (not overwhelming)
- [ ] "Needs Attention" section highlights issues
- [ ] Velocity summary shows 3 key metrics
- [ ] Prompts user for `--full` if they want more
- [ ] Renders in < 200ms for 50 specs

**Full output:**
- [ ] `lspec stats --full` shows all sections
- [ ] Equivalent to old `lspec analytics` output
- [ ] Stats + Timeline + Velocity all present
- [ ] No information loss from analytics

**Focus modes:**
- [ ] `lspec stats --velocity` shows only velocity
- [ ] `lspec stats --timeline` shows only timeline/activity
- [ ] Filters work (--tag, --assignee)

**Smart insights:**
- [ ] Detects critical overdue specs
- [ ] Flags long-running WIP (> 7 days)
- [ ] Shows top 5 issues only
- [ ] Empty when no issues (positive message)

### Board Command Tests

**Health summary:**
- [ ] Shows at top of board output
- [ ] Includes totals, health score, alerts, velocity
- [ ] Doesn't break kanban columns layout
- [ ] Box renders correctly (Unicode characters)

**Health score accuracy:**
- [ ] Simple completion rate (not weighted)
- [ ] 0% when no specs complete
- [ ] 100% when all complete
- [ ] Reflects project health intuitively

**Options:**
### Command Removal Tests

**Analytics command:**
- [ ] Command no longer exists
- [ ] `lspec analytics` shows "unknown command" error
- [ ] Error message suggests `lspec stats` instead
- [ ] Help text doesn't mention analytics

**Dashboard command:**
- [ ] Command no longer exists
- [ ] `lspec dashboard` shows "unknown command" error
- [ ] Error message suggests `lspec board` instead
- [ ] Help text doesn't mention dashboard

### Breaking Changes (v0.2.0)

**Expected behavior:**
- [ ] `lspec analytics` fails with helpful error
- [ ] `lspec dashboard` fails with helpful error
- [ ] `lspec stats` works as replacement
- [ ] `lspec board` works as replacement
- [ ] JSON output formats compatible where applicable
**Existing workflows:**
- [ ] All `lspec analytics` scripts still work
- [ ] JSON output format unchanged
- [ ] Filter options unchanged
- [ ] No breaking changes in v0.2.0

### Performance Tests

- [ ] `lspec stats` < 200ms for 50 specs
- [ ] `lspec stats --full` < 500ms for 100 specs
- [ ] `lspec board` < 300ms for 50 specs
- [ ] Health calculation < 50ms
- [ ] Insight generation < 50ms

### Edge Cases

- [ ] Empty project (helpful message)
- [ ] No critical issues (positive message)
- [ ] All specs complete (celebrate!)
- [ ] Very long spec names don't break layout
- [ ] Missing velocity data (graceful degradation)

## Notes

### Why "Stats" is Better than "Analytics"

**Pros of "Stats":**
- Shorter, faster to type
- More approachable for non-technical users
- Matches common CLI patterns
- Implies quick metrics (not deep analysis)
- Less intimidating

**Cons of "Analytics":**
- Sounds heavyweight/enterprise
- Implies lengthy report (intimidating)
- Longer to type
- Less common in CLI tools

**Decision**: Use "stats" - aligns with LeanSpec's minimalist philosophy

### Health Score Formula

**Simple completion rate:**
```
completion_rate = (complete_specs / total_specs) * 100
```

**Why simple?**
- Easy to understand at a glance
- No complex weighting logic
- Clear, transparent calculation
- Follows LeanSpec minimalist philosophy

**Alternative**: Weighted by priority
- More complex calculation
- Harder to understand intuitively
- **Decision**: Use simple (clarity over sophistication)

### Default Stats Output Philosophy

**Problem with current analytics:**
- Shows everything (status, priority, tags, timeline, velocity)
- Takes 3 screens to read
- Too much for daily check-in

**New philosophy:**
- **Default = PM-friendly** - Quick glance, actionable insights
- **--full = Deep dive** - All sections, full analytics
- **Focus flags** - When you know what you want (--velocity, --timeline)

**Inspiration**: `git status` vs `git log --stat`
- `git status` - Quick, actionable, what needs attention
- `git log --stat` - Full history, detailed analysis

### Board as Primary Entry Point

**Current usage patterns:**
- `lspec list` - Browse specs
- `lspec board` - Update status, view kanban
- `lspec dashboard` - Check project health
- `lspec analytics` - Deep dive metrics

**Problem**: 3 different commands for overview (board, dashboard, analytics)

**New approach**: Make board the comprehensive entry point
- Quick health at top (old dashboard)
- Kanban workflow (existing board)
- Option to simplify (--simple flag)
### Migration Strategy

**v0.2.0**: Direct removal (breaking changes)
- `lspec stats` - Enhanced with all analytics features
- `lspec board` - Enhanced with health summary
- `lspec analytics` - **REMOVED** (use `lspec stats`)
- `lspec dashboard` - **REMOVED** (use `lspec board`)
- Breaking changes acceptable in pre-1.0

**Rationale:**
- Early stage (v0.2.0, pre-1.0)
- Clean break better than deprecation debt
- Simpler codebase, less maintenance
- Clear migration path in CHANGELOG
- Users expect changes in early versions

**v0.3.0**: Remove deprecated commands
- Delete `analytics.ts`
- Delete `dashboard.ts`
- Clean up CLI registration
- Breaking change, major version bump

### Open Questions

1. **Health score threshold**: What % is "healthy"?
   - **Proposal**: > 70% = good, 40-70% = ok, < 40% = attention needed

2. **Long-running threshold**: 7 days or 14 days?
   - **Proposal**: 7 days (more sensitive, catches issues earlier)

3. **Insights count**: Top 3 or top 5?
   - **Proposal**: Top 5 (balances detail vs. overwhelming)

4. **Board health box**: Always show or opt-in?
   - **Proposal**: Always show (users can use --simple to hide)

5. **Default stats complexity**: Too simple now?
   - **Proposal**: Start simple, can adjust based on feedback

6. **Velocity in board health**: Include or too much?
   - **Proposal**: Include (2 key metrics only: cycle time, throughput)

### Alternatives Considered

**Option A: Keep analytics, enhance stats**
- Keep both commands separate
- Make analytics the comprehensive one
- Keep stats as basic
- ❌ Rejected: Too many overlapping commands

**Option B: Merge everything into board**
- Make board the only command
- Flags for different views (--stats, --kanban, --health)
- ❌ Rejected: Overloads board concept, reduces clarity

**Option C: Remove both analytics and dashboard** (This spec's approach)
- Merge analytics → stats (enhanced)
- Remove dashboard → use enhanced board
- Direct removal (no deprecation)
- ✅ Selected: Best balance of simplicity and functionality

**Option D: Status quo (keep all 3)**
- Keep dashboard, analytics, stats separate
- Just improve each independently
- ❌ Rejected: Too much command sprawl, confusing

### Success Criteria
**User Experience:**
- [ ] PMs can check project health in < 5 seconds (`lspec board`)
- [ ] Quick stats check takes < 10 seconds (`lspec stats`)
- [ ] Deep dive available when needed (`lspec stats --full`)
- [ ] Clear error messages for removed commands

**Technical:**
- [ ] Breaking changes clearly documented in CHANGELOG
- [ ] All tests pass
- [ ] Performance < 300ms for typical projects
- [ ] Clean codebase (no deprecated code)r typical projects
- [ ] Clean deprecation path

**Adoption:**
- [ ] Beta testers prefer new commands
- [ ] Positive feedback on simplified output
- [ ] No confusion about command naming
- [ ] Documentation clear and helpful
