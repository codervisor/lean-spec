# Implementation Plan

> Part of [046-stats-dashboard-refactor](./README.md)

## Phase 1: Enhance Stats Command (Week 1)

### Step 1.1: Enhance stats command
- [ ] Merge all `analytics.ts` logic into `stats.ts`
- [ ] Add default simplified output
- [ ] Add `--full` flag (shows everything from old analytics)
- [ ] Add `--velocity`, `--timeline` flags (focus modes)
- [ ] Keep all existing analytics functionality

### Step 1.2: Add smart insights
- [ ] Create `utils/insights.ts` with insight generation
- [ ] Integrate insights into default stats output
- [ ] Add "Needs Attention" section
- [ ] Test with various project states

### Step 1.3: Remove analytics command
- [ ] Delete `src/commands/analytics.ts` file
- [ ] Remove from `src/commands/index.ts` exports
- [ ] Remove from CLI registration in `cli.ts`
- [ ] Update CHANGELOG with breaking change note

### Step 1.4: Update documentation
- [ ] Update README (remove analytics, show stats)
- [ ] Update AGENTS.md (use stats, not analytics)
- [ ] Update help text
- [ ] Add migration note to CHANGELOG
- [ ] Update help text
- [ ] Mark `analytics` as deprecated in help

## Phase 2: Enhance Board (Week 1-2)

### Step 2.1: Add health calculations
- [ ] Create `utils/health.ts` with health score logic
- [ ] Implement simple completion calculation
- [ ] Add critical issue detection
- [ ] Add warning detection (long-running WIP)

### Step 2.2: Update board command
- [ ] Add health summary box at top
- [ ] Include velocity snapshot
- [ ] Add `--simple` flag (original view)
- [ ] Add `--health-only` flag (just summary)
- [ ] Ensure health box doesn't break existing layout

### Step 2.3: Test board enhancements
- [ ] Test with various project sizes
- [ ] Verify health box renders correctly
- [ ] Test with empty projects
- [ ] Test with all-complete projects

## Phase 3: Remove Dashboard (Week 2)

### Step 3.1: Delete dashboard command
- [ ] Delete `src/commands/dashboard.ts` file
- [ ] Remove from `src/commands/index.ts` exports
- [ ] Remove from CLI registration in `cli.ts`
- [ ] Update CHANGELOG with breaking change note

### Step 3.2: Update documentation
- [ ] Remove dashboard from README
- [ ] Update AGENTS.md (AI should use board, not dashboard)
- [ ] Update help text
- [ ] Add migration guide to CHANGELOG

### Step 3.3: Verify removal
- [ ] Ensure no references to dashboard remain
- [ ] Update any tests that used dashboard
- [ ] Clean up any dashboard-related utilities

### Step 3.4: Plan removal
- [ ] Schedule for v0.3.0
- [ ] Add to CHANGELOG
- [ ] Communicate in release notes

## Phase 4: Testing (Week 2)

### Unit tests
- [ ] Test health score calculation (various priority mixes)
- [ ] Test insight generation (all severity levels)
- [ ] Test stats output modes (default, --full, --velocity)
- [ ] Test board with/without health summary

### Integration tests
- [ ] Test command deprecation warnings
- [ ] Test backward compatibility (analytics still works)
- [ ] Test filter options work with new commands
- [ ] Test JSON output formats

### Visual regression
- [ ] Compare new stats output (readable, not overwhelming)
- [ ] Verify board health box layout
- [ ] Test with various terminal widths
- [ ] Test Unicode rendering

### Documentation
- [ ] Update README with new command examples
- [ ] Add stats/board screenshots
- [ ] Document all flags (--full, --simple, etc.)
- [ ] Update AGENTS.md for AI usage

### Migration guide
- [ ] Add BREAKING CHANGES section to CHANGELOG
- [ ] Document analytics → stats migration
- [ ] Document dashboard → board migration
- [ ] Provide command mapping table

### Release
- [ ] Update CHANGELOG with breaking changes
- [ ] Tag as v0.2.0
- [ ] Announce breaking changes clearly
- [ ] Note: Pre-1.0, breaking changes acceptable

## Implementation Details

### Health Score Calculation

Location: `src/utils/health.ts`

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

### Smart Insights Algorithm

Location: `src/utils/insights.ts`

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

### File Structure Changes

**New structure:**
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

## Timeline

- **Week 1**: Phase 1 (Stats enhancement) + Phase 2 (Board enhancement)
- **Week 2**: Phase 3 (Dashboard removal) + Phase 4 (Testing + Release)

Total: 2 weeks to v0.2.0 release
