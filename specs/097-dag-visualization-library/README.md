---
status: planned
created: '2025-11-17'
tags:
  - web
  - ux
  - dependencies
  - technical-debt
priority: high
created_at: '2025-11-17T08:02:23.227Z'
---

# Replace Manual DAG with Visualization Library

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: The current spec dependencies DAG visualization (`/packages/web/src/components/spec-relationships.tsx`) uses manual SVG coordinate calculations with CSS absolute positioning. This is:

- **Fragile**: SVG viewBox coordinates don't align with CSS percentages, causing node overlap issues
- **Not responsive**: Breaks on different screen sizes and aspect ratios
- **Hard to maintain**: Requires manual tweaking of coordinates, bezier curves, and aspect ratios
- **Limited**: Can't handle complex layouts (many nodes, cycles, different graph structures)

**Why Now**: During troubleshooting for spec #066, we discovered the DAG nodes are overlapping because of coordinate system mismatches between SVG paths and CSS-positioned nodes. Instead of continuing to manually fix these issues, we should use a proper graph visualization library.

**Impact**: Better UX for understanding spec relationships, easier maintenance, more robust across different viewport sizes.

## Current Implementation Issues

**Code Location**: `/packages/web/src/components/spec-relationships.tsx`

**Problems Found**:
1. Mixed coordinate systems (SVG viewBox vs CSS %)
2. Manual bezier curve calculations for edges
3. Fixed column layout (COLUMN_X constants) doesn't adapt
4. `preserveAspectRatio="none"` causes distortion
5. Node positioning uses `calc(${xPercent}% - ${NODE_WIDTH / 2}px)` which breaks with aspect ratio changes

**Current Approach**:
- 3-column layout: Precedence (left) → Current (center) → Related (right)
- Nodes positioned with CSS absolute + calc()
- SVG paths drawn manually with fixed control points
- Container height calculated from node count

## Design

### Recommended Library: Reactflow

**Why Reactflow**:
- ✅ **React-native**: Built for React, excellent TypeScript support
- ✅ **Declarative**: Define nodes/edges, library handles layout
- ✅ **Auto-layout**: Built-in dagre/elk layout algorithms
- ✅ **Responsive**: Handles viewport changes automatically
- ✅ **Interactive**: Pan, zoom, node dragging out of the box
- ✅ **Customizable**: Custom node styles, edge types
- ✅ **Well-maintained**: 20K+ GitHub stars, active development
- ✅ **Small bundle**: ~50KB gzipped (reasonable for feature richness)

**Alternatives Considered**:
- **D3.js**: Too low-level, requires manual layout management
- **Cytoscape.js**: Powerful but heavier, steeper learning curve
- **vis.js**: Unmaintained, no React integration
- **mermaid.js**: Static rendering, not interactive

### Implementation Approach

**Display Pattern**: Modal/Dialog (REQUIRED)
- Dependencies graph opens in a dialog/modal, not inline expansion
- Timeline also moves to modal (consistent pattern for spec metadata)
- Triggered by "Show Dependencies" and "Show Timeline" buttons
- Allows full screen space for complex graphs
- Better mobile experience (full screen modal vs cramped accordion)

**Replace Current Components**:
```tsx
// Current: Accordion expansion
<Accordion>
  <SpecRelationships relationships={...} />
</Accordion>

// New: Dialog with Reactflow
<Dialog>
  <SpecDependencyGraph relationships={...} />
</Dialog>
```

**Node Types**:
- **Current Spec**: Center node (non-interactive, highlighted)
- **Precedence/Depends-On**: Left column (amber styling, solid edges)
- **Related**: Right column (blue styling, dashed edges)

**Layout Strategy**:
- Use Reactflow's `dagre` layout algorithm
- Constrain to 3-column structure (precedence | current | related)
- Vertical spacing based on node count
- Automatically handle edge routing
- Dialog provides ample space for complex graphs

**Styling**:
- Match current design (rounded boxes, color scheme)
- Maintain distinction between precedence (amber) and related (blue)
- Full screen or large modal (80-90% viewport)
- Responsive: full screen on mobile, modal on desktop

### Migration Plan

**Phase 1: Modal Infrastructure** (0.5 days)
- Update UI to use shadcn/ui Dialog component (already in project)
- Convert "Show Dependencies" button to open dialog instead of accordion
- Convert "Show Timeline" button to dialog (consistent pattern)
- Ensure mobile full-screen behavior

**Phase 2: Reactflow Implementation** (1-2 days)
- Install `reactflow` dependency
- Create new `<SpecDependencyGraph>` component
- Implement dagre layout with 3-column structure
- Style nodes and edges to match design
- Mount inside Dialog component

**Phase 3: Testing & Refinement** (1 day)
- Test with various spec configurations:
  - No dependencies (button disabled/hidden)
  - Only precedence
  - Only related
  - Both (like spec #066 with 5 related)
  - Many dependencies (10+)
- Test dialog behavior (open/close, escape key, click outside)
- Ensure responsive behavior (mobile full screen, desktop modal)
- Verify performance

**Phase 4: Cleanup** (0.5 days)
- Remove old `<SpecRelationships>` component
- Remove accordion/collapsible pattern for dependencies
- Remove unused SVG calculation code
- Update timeline to use same modal pattern

**Total: 3-4 days**

## Plan

- [ ] Update "Show Dependencies" button to open Dialog component
- [ ] Update "Show Timeline" button to open Dialog component (consistent UX)
- [ ] Install `reactflow` package (`npm install reactflow`)
- [ ] Create `/packages/web/src/components/spec-dependency-graph.tsx`
- [ ] Implement basic 3-column layout with dagre algorithm
- [ ] Style nodes to match current design (amber/blue, rounded)
- [ ] Add edge styling (solid for precedence, dashed for related)
- [ ] Mount graph inside Dialog component
- [ ] Test with spec #066 (5 related, 0 precedence) in modal
- [ ] Test with spec with precedence dependencies in modal
- [ ] Test dialog behavior (escape key, click outside, mobile full screen)
- [ ] Test responsive behavior (mobile, tablet, desktop)
- [ ] Move timeline display to same modal pattern
- [ ] Replace accordion pattern in `spec-detail-client.tsx`
- [ ] Remove old `<SpecRelationships>` component
- [ ] Remove unused SVG calculation code
- [ ] Update any tests that reference the old components

## Test

**Functional Tests**:
- [ ] Spec with no dependencies → button disabled or hidden
- [ ] Click "Show Dependencies" → opens dialog with graph
- [ ] Spec with only `dependsOn` → shows precedence column + current in modal
- [ ] Spec with only `related` → shows current + related column in modal
- [ ] Spec #066 (5 related) → all nodes visible in modal, no overlap
- [ ] Spec with 10+ dependencies → layout handles gracefully in modal
- [ ] Click node in graph → navigates to spec detail page
- [ ] Press Escape or click outside → closes dialog
- [ ] "Show Timeline" → opens timeline in dialog (consistent pattern)

**Visual Tests**:
- [ ] Modal is appropriately sized (80-90% viewport on desktop)
- [ ] Mobile: dialog is full screen
- [ ] Nodes don't overlap at any viewport size
- [ ] Edges connect to correct nodes
- [ ] Color coding matches design (amber=precedence, blue=related)
- [ ] Layout is centered and balanced within modal
- [ ] Zoom/pan controls visible and functional (Reactflow default)

**Performance Tests**:
- [ ] Dialog opens quickly (<100ms)
- [ ] Graph renders quickly (<100ms for typical graphs)
- [ ] No layout shift after dialog opens
- [ ] Bundle size increase acceptable (<100KB)

## Notes

### Why Not Fix the Current Implementation?

**Considered**: Adjusting the aspect ratio, fixing coordinate calculations, using foreignObject for nodes.

**Rejected**: This is technical debt that will continue to cause issues:
- Every new screen size requires tweaking
- Edge cases (many nodes, mobile) will break
- Manual coordinate math is error-prone
- No zoom/pan/interaction without extensive work

**Better**: Use a library designed for this problem. Pay 50KB bundle cost for proper graph rendering, maintainability, and future features.

### Timeline and Dependencies in Modals (REQUIRED)

**User Requirement**: Both timeline and dependencies MUST use modal/dialog pattern, not inline accordions.

**Rationale**:
- **More space**: Complex graphs and timelines need room to breathe
- **Better mobile UX**: Full screen modal vs cramped inline expansion
- **Consistent pattern**: All spec metadata (dependencies, timeline, transitions) in dialogs
- **Focus**: Modal isolates the view, easier to explore relationships
- **Performance**: Lazy load graph only when user opens dialog

**Implementation**:
- Use shadcn/ui Dialog component (already in project)
- "Show Dependencies" button → opens dependency graph modal
- "Show Timeline" button → opens timeline modal
- Mobile: Full screen modals
- Desktop: Large modals (80-90% viewport)
- Reactflow provides zoom/pan inside modal automatically

**Not Optional**: This is a core UX requirement, not a future enhancement. The modal pattern is part of the initial implementation.

### Related Issues

**Spec #066**: Original troubleshooting that led to this spec
**Spec #082**: Web architecture - may want to coordinate if doing broader refactor
