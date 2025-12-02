# Implementation Plan: Unified Dashboard

## Part 0: Timestamp Tracking (Week 1)

Foundation for velocity metrics:

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

## Part 1: Unified Analytics (Week 1-2)

### Part A: Merge timeline into stats
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

### Part B: Velocity Calculations
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

### Part C: Testing
- [ ] Test `lean-spec stats` (default behavior unchanged)
- [ ] Test `lean-spec stats --timeline` (integrated view)
- [ ] Test `lean-spec stats --history` (full timeline)
- [ ] Test `lean-spec stats --velocity` (cycle time analysis)
- [ ] Test `lean-spec stats --all` (comprehensive)
- [ ] Test velocity calculations with mock data
- [ ] Test graceful degradation (specs without timestamps)
- [ ] Verify backward compatibility

## Part 2: Dashboard Command (Week 2)

### Part A: Core dashboard implementation
- [ ] Create `src/commands/dashboard.ts`
- [ ] Implement Summary section (project health)
- [ ] Implement Needs Attention section (smart insights)
- [ ] Implement Recent Activity section (14-day sparkline + velocity)
- [ ] Implement In Progress section (top active specs with age)
- [ ] Implement Quick Stats section (tags, assignees)
- [ ] Implement Velocity Summary section (cycle time, throughput, WIP)
- [ ] Add helpful footer with command hints

### Part B: CLI integration
- [ ] Make `lean-spec` (no args) default to dashboard
- [ ] Add explicit `lean-spec dashboard` command
- [ ] Support all filter options (--tag, --status, etc.)
- [ ] Add display options (--compact, --expand-active)
- [ ] Add JSON output mode (--json)

### Part C: Smart insights
- [ ] Detect overdue specs (due < today, status != complete)
- [ ] Highlight critical priority specs
- [ ] Show user's assigned work (from git config or --assignee)
- [ ] Flag long-running in-progress specs (> 14 days)
- [ ] Identify velocity bottlenecks (slow stages)
- [ ] Suggest next actions based on state

## Phase 3: Testing & Polish (Week 2-3)

### Unit tests
- [ ] Dashboard section rendering
- [ ] Smart insights logic
- [ ] Filter application
- [ ] JSON output structure

### Integration tests
- [ ] Empty project (show helpful init message)
- [ ] Small project (< 10 specs)
- [ ] Medium project (10-50 specs)
- [ ] Large project (100+ specs)
- [ ] With all filter combinations
- [ ] With display options

### Visual regression
- [ ] Compare dashboard output across sizes
- [ ] Verify Unicode characters render correctly
- [ ] Test color output (with/without color support)
- [ ] Test terminal width handling

## Phase 4: Documentation (Week 3)

### README updates
- [ ] Feature dashboard as primary command
- [ ] Add dashboard screenshot/GIF
- [ ] Update command reference table
- [ ] Show dashboard → drill-down workflow

### AGENTS.md updates
- [ ] Update AI instructions to use dashboard first
- [ ] Document `lean-spec stats --timeline` pattern
- [ ] Update command examples

### Help text
- [ ] Update `lean-spec --help` to show dashboard first
- [ ] Add examples to `lean-spec dashboard --help`
- [ ] Update `lean-spec stats --help` with new flags

## Phase 5: Migration & Deprecation (v0.3.0)

### Add deprecation warnings
- [ ] `lean-spec timeline` → "Use 'lean-spec stats --history' instead"
- [ ] Show migration hints in output
- [ ] Update CHANGELOG with deprecation notice

### Remove in v0.4.0
- [ ] Delete `src/commands/timeline.ts`
- [ ] Remove from CLI registration
- [ ] Archive any timeline-specific tests
