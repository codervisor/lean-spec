# Implementation Notes

> Part of spec: [045-unified-dashboard](README.md)

## Phase 1: Timestamp Tracking

Foundation for velocity metrics.

### Tasks
- [ ] Update `SpecFrontmatter` interface with timestamp fields
- [ ] Create `enrichWithTimestamps()` helper
- [ ] Update `create.ts` to set initial timestamps
- [ ] Update `update.ts` to maintain timestamps

## Phase 2: Velocity Calculations

Implement the core velocity metrics.

### Components
- `utils/velocity.ts` - Velocity analysis utilities
- Cycle time calculations
- Stage duration tracking
- Throughput metrics

## Phase 3: Dashboard UI

Create the unified dashboard view.

### Sections
1. Project Health
2. Needs Attention
3. Recent Activity
4. In Progress
5. Velocity Summary
