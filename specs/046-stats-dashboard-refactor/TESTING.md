# Testing Strategy

> Part of [046-stats-dashboard-refactor](./README.md)

## Stats Command Tests

### Default output (simplified)
- [ ] Shows only essential metrics (not overwhelming)
- [ ] "Needs Attention" section highlights issues
- [ ] Velocity summary shows 3 key metrics
- [ ] Prompts user for `--full` if they want more
- [ ] Renders in < 200ms for 50 specs

### Full output
- [ ] `lspec stats --full` shows all sections
- [ ] Equivalent to old `lspec analytics` output
- [ ] Stats + Timeline + Velocity all present
- [ ] No information loss from analytics

### Focus modes
- [ ] `lspec stats --velocity` shows only velocity
- [ ] `lspec stats --timeline` shows only timeline/activity
- [ ] Filters work (--tag, --assignee)

### Smart insights
- [ ] Detects critical overdue specs
- [ ] Flags long-running WIP (> 7 days)
- [ ] Shows top 5 issues only
- [ ] Empty when no issues (positive message)

## Board Command Tests

### Health summary
- [ ] Shows at top of board output
- [ ] Includes totals, health score, alerts, velocity
- [ ] Doesn't break kanban columns layout
- [ ] Box renders correctly (Unicode characters)

### Health score accuracy
- [ ] Simple completion rate (not weighted)
- [ ] 0% when no specs complete
- [ ] 100% when all complete
- [ ] Reflects project health intuitively

### Options
- [ ] `lspec board` shows default view with health
- [ ] `lspec board --simple` shows kanban only
- [ ] `lspec board --health-only` shows health summary only
- [ ] All filter options work (--tag, --assignee, --status)

## Command Removal Tests

### Analytics command
- [ ] Command no longer exists
- [ ] `lspec analytics` shows "unknown command" error
- [ ] Error message suggests `lspec stats` instead
- [ ] Help text doesn't mention analytics

### Dashboard command
- [ ] Command no longer exists
- [ ] `lspec dashboard` shows "unknown command" error
- [ ] Error message suggests `lspec board` instead
- [ ] Help text doesn't mention dashboard

## Breaking Changes (v0.2.0)

### Expected behavior
- [ ] `lspec analytics` fails with helpful error
- [ ] `lspec dashboard` fails with helpful error
- [ ] `lspec stats` works as replacement
- [ ] `lspec board` works as replacement
- [ ] JSON output formats compatible where applicable

### Existing workflows
- [ ] All `lspec analytics` scripts still work
- [ ] JSON output format unchanged
- [ ] Filter options unchanged
- [ ] No breaking changes in v0.2.0

## Performance Tests

- [ ] `lspec stats` < 200ms for 50 specs
- [ ] `lspec stats --full` < 500ms for 100 specs
- [ ] `lspec board` < 300ms for 50 specs
- [ ] Health calculation < 50ms
- [ ] Insight generation < 50ms

## Edge Cases

- [ ] Empty project (helpful message)
- [ ] No critical issues (positive message)
- [ ] All specs complete (celebrate!)
- [ ] Very long spec names don't break layout
- [ ] Missing velocity data (graceful degradation)

## Test Coverage Requirements

### Unit Tests

**Health Score Calculation:**
```typescript
describe('calculateHealth', () => {
  it('returns 0% for no complete specs', () => {
    const specs = [
      createSpec({ status: 'planned' }),
      createSpec({ status: 'in-progress' }),
    ];
    const health = calculateHealth(specs);
    expect(health.score).toBe(0);
  });

  it('returns 100% for all complete specs', () => {
    const specs = [
      createSpec({ status: 'complete' }),
      createSpec({ status: 'complete' }),
    ];
    const health = calculateHealth(specs);
    expect(health.score).toBe(100);
  });

  it('calculates partial completion correctly', () => {
    const specs = [
      createSpec({ status: 'complete' }),
      createSpec({ status: 'in-progress' }),
      createSpec({ status: 'planned' }),
    ];
    const health = calculateHealth(specs);
    expect(health.score).toBe(33); // 1/3 complete
  });
});
```

**Smart Insights:**
```typescript
describe('generateInsights', () => {
  it('detects critical overdue specs', () => {
    const specs = [
      createSpec({ 
        priority: 'critical', 
        due: '2025-11-01', 
        status: 'in-progress' 
      }),
    ];
    const insights = generateInsights(specs);
    expect(insights[0].severity).toBe('critical');
    expect(insights[0].message).toContain('overdue');
  });

  it('detects long-running WIP', () => {
    const specs = [
      createSpec({ 
        status: 'in-progress',
        updated: '2025-10-20' // > 7 days ago
      }),
    ];
    const insights = generateInsights(specs);
    expect(insights[0].severity).toBe('warning');
    expect(insights[0].message).toContain('in-progress > 7 days');
  });

  it('limits to top 5 insights', () => {
    const specs = Array(10).fill(null).map(() => 
      createSpec({ priority: 'critical', due: '2025-11-01', status: 'planned' })
    );
    const insights = generateInsights(specs);
    expect(insights.length).toBeLessThanOrEqual(5);
  });
});
```

### Integration Tests

**Stats Command:**
```typescript
describe('stats command', () => {
  it('shows simplified output by default', async () => {
    const output = await runCommand('lspec stats');
    expect(output).toContain('📊 Spec Stats');
    expect(output).toContain('Needs Attention');
    expect(output).toContain('Use `lspec stats --full` for detailed analytics');
  });

  it('shows full output with --full flag', async () => {
    const output = await runCommand('lspec stats --full');
    expect(output).toContain('Status');
    expect(output).toContain('Priority');
    expect(output).toContain('Timeline');
    expect(output).toContain('Velocity');
  });

  it('supports filter flags', async () => {
    const output = await runCommand('lspec stats --tag=bug');
    expect(output).toContain('Filtered');
  });
});
```

**Board Command:**
```typescript
describe('board command', () => {
  it('shows health summary by default', async () => {
    const output = await runCommand('lspec board');
    expect(output).toContain('Project Health');
    expect(output).toContain('health');
    expect(output).toContain('Velocity');
  });

  it('hides health summary with --simple', async () => {
    const output = await runCommand('lspec board --simple');
    expect(output).not.toContain('Project Health');
    expect(output).toContain('📅 Planned');
  });

  it('shows only health with --health-only', async () => {
    const output = await runCommand('lspec board --health-only');
    expect(output).toContain('Project Health');
    expect(output).not.toContain('📅 Planned');
  });
});
```

## Success Criteria

### User Experience
- [ ] PMs can check project health in < 5 seconds (`lspec board`)
- [ ] Quick stats check takes < 10 seconds (`lspec stats`)
- [ ] Deep dive available when needed (`lspec stats --full`)
- [ ] Clear error messages for removed commands

### Technical
- [ ] Breaking changes clearly documented in CHANGELOG
- [ ] All tests pass
- [ ] Performance < 300ms for typical projects
- [ ] Clean codebase (no deprecated code)

### Adoption
- [ ] Beta testers prefer new commands
- [ ] Positive feedback on simplified output
- [ ] No confusion about command naming
- [ ] Documentation clear and helpful

## Visual Regression Tests

### Stats Output Comparison

**Before (analytics):**
```
Status:
  Planned: 5
  In Progress: 10
  Complete: 20

Priority:
  Critical: 2
  High: 8
  Medium: 15
  Low: 10

Tags:
  bug: 5
  feature: 10
  ... (long list)

Timeline: (14-day chart)

Velocity: (full breakdown)
```

**After (stats default):**
```
📊 Spec Stats

📈 Overview
  Total: 35 · Active: 15 · Complete: 20 · Health: 73% ✓

⚠️  Needs Attention
  • 2 critical overdue
  • 5 specs WIP > 7 days

🚀 Velocity: 5.2d avg, 2.8/wk ↑

💡 Use `lspec stats --full` for detailed analytics
```

### Board Health Box Layout

**Health Summary Box:**
```
╔══════════════════════════════════════════════════════════╗
║  Project Health                                          ║
║  42 total · 20 active · 15 complete · 73% health         ║
║  ⚠️  2 critical overdue · 5 specs WIP > 7 days           ║
║  🚀 Velocity: 5.2d avg cycle · 2.8/wk throughput         ║
╚══════════════════════════════════════════════════════════╝
```

**Verify:**
- [ ] Box characters render correctly
- [ ] Content fits within box width
- [ ] Emojis align properly
- [ ] No layout breaks on narrow terminals
- [ ] Graceful handling of long spec names

## Performance Benchmarks

| Command | Specs | Target | Measured |
|---------|-------|--------|----------|
| `lspec stats` | 50 | < 200ms | ___ms |
| `lspec stats --full` | 100 | < 500ms | ___ms |
| `lspec board` | 50 | < 300ms | ___ms |
| Health calc | 100 | < 50ms | ___ms |
| Insights gen | 100 | < 50ms | ___ms |

## Test Automation

**CI/CD Pipeline:**
1. Run unit tests on every commit
2. Run integration tests on PR
3. Run performance tests on main branch
4. Generate coverage report (target: > 80%)

**Pre-release Checklist:**
- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Visual regression tests reviewed
- [ ] Documentation updated
- [ ] Migration guide ready
- [ ] Beta testers feedback incorporated
