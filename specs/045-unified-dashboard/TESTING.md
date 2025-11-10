# Testing Strategy: Unified Dashboard

## Part 0: Timestamp Tracking Tests

### Timestamp Generation
- [ ] New spec gets `created_at` set automatically
- [ ] `updated_at` updates on any frontmatter change
- [ ] Status change to complete sets `completed_at`
- [ ] Transitions array tracks status changes (if enabled)

### Migration & Compatibility
- [ ] Existing specs without timestamps still work
- [ ] Timestamps inferred from dates (midnight UTC)
- [ ] Date fields still required (backward compat)
- [ ] Graceful degradation when timestamps missing

### Edge Cases
- [ ] Spec created and completed same day (timestamps differ)
- [ ] Manual timestamp editing preserved
- [ ] Timezone handling consistent (UTC)

## Part 1: Enhanced Stats Command Tests

### Backward Compatibility
- [ ] `lean-spec stats` outputs same format as before (no breaking changes)
- [ ] `lean-spec stats --json` matches existing JSON schema
- [ ] All existing filter options work (--tag, --assignee, --priority)

### New Timeline Integration
- [ ] `lean-spec stats --timeline` adds timeline section after stats
- [ ] `lean-spec stats --history` shows full historical view
- [ ] `lean-spec stats --velocity` shows cycle time analysis
- [ ] `lean-spec stats --all` combines everything
- [ ] Timeline data matches previous `lean-spec timeline` output

### Velocity Calculations
- [ ] Cycle time accurate (created_at → completed_at)
- [ ] Stage durations sum correctly
- [ ] Throughput matches manual count
- [ ] WIP calculation correct for any date
- [ ] Percentiles (P50, P90, P95) accurate
- [ ] Trend indicators (↑↓→) correct

### Velocity Display
- [ ] Shows average, median cycle time
- [ ] Compares to configured targets
- [ ] Stage durations visualized with bars
- [ ] Throughput trends visible (last 4 weeks)
- [ ] WIP stays within healthy range
- [ ] Graceful when no completed specs yet

### Edge Cases
- [ ] Empty project shows helpful message
- [ ] Project with no dates (no created/completed fields)
- [ ] Filtered results still show timeline
- [ ] Very large date ranges don't break layout

## Part 2: Dashboard Command Tests

### Project States

#### Empty Project
- [ ] Shows "No specs found" with init hint
- [ ] No sections rendered (clean state)
- [ ] Suggests `lean-spec init` to get started

#### Small Project (< 10 specs)
- [ ] All in-progress specs visible
- [ ] Summary shows accurate counts
- [ ] No truncation needed
- [ ] All sections proportional

#### Medium Project (10-50 specs)
- [ ] Top 5 in-progress shown by default
- [ ] `--expand-active` shows all
- [ ] Top tags displayed (limit 5)
- [ ] Timeline shows 14 days

#### Large Project (100+ specs)
- [ ] Summary remains concise
- [ ] Smart prioritization in "Needs Attention"
- [ ] Performance < 300ms
- [ ] No visual clutter

### Smart Insights Tests

#### Overdue Detection
- [ ] Specs with `due < today` and `status != complete` flagged
- [ ] Shows count in "Needs Attention"
- [ ] Lists spec names (limit 3, then "and N more")

#### Critical Priority
- [ ] Critical specs still planned highlighted
- [ ] Critical in-progress shown prominently
- [ ] Warning if critical overdue

#### Long-Running Detection
- [ ] In-progress > 14 days flagged with ⚠️
- [ ] Age shown next to spec name (e.g., "8d")
- [ ] Helps identify potential bottlenecks

#### User Assignment
- [ ] `--assignee alice` focuses on Alice's work
- [ ] Git config detection works (if configured)
- [ ] Shows user's active work first

#### Velocity Bottlenecks
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

#### Command Flow
- [ ] `lean-spec` defaults to dashboard
- [ ] `lean-spec dashboard` explicitly shows dashboard
- [ ] Dashboard → `lean-spec list` → dashboard (workflow)
- [ ] Dashboard respects .lspec/config.json

#### Cross-Command Consistency
- [ ] Dashboard counts match `lean-spec list` counts
- [ ] Dashboard stats match `lean-spec stats` output
- [ ] Dashboard activity matches `lean-spec stats --timeline`

### Visual Tests

#### Layout
- [ ] Sections align properly
- [ ] Box drawing characters render correctly
- [ ] Colors don't obscure information
- [ ] Terminal width respected (no wrapping)

#### Accessibility
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
- [ ] `lean-spec stats` backward compatible
- [ ] JSON output schemas unchanged (where applicable)
- [ ] All existing tests still pass

## Success Criteria

### User Experience
- [ ] New user runs `lean-spec`, immediately understands project state
- [ ] < 5 seconds to identify what needs attention
- [ ] Existing users don't notice breaking changes
- [ ] Smooth migration from timeline to stats --history

### Technical
- [ ] < 300ms render time for 100 specs
- [ ] Single `loadAllSpecs()` call in dashboard
- [ ] < 300 lines new code (reuse existing)
- [ ] No regressions in existing commands

### Business
- [ ] Better demo-ability for v0.2.0 launch
- [ ] Competitive with OpenSpec UX quality
- [ ] Reduces support questions about "how to see X"
- [ ] Positive beta tester feedback
