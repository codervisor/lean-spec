# Design: Stats & Dashboard Reorganization

## Command Redesign

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
- Note in CHANGELOG as breaking change

## Architecture

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

## Health Score Calculation

`utils/health.ts`:
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

## Smart Insights

`utils/insights.ts`:
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
