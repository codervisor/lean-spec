---
status: complete
created: '2025-12-04'
tags:
  - ui
  - ux
  - feature
  - visualization
  - dependencies
  - network-graph
priority: medium
created_at: '2025-12-04T05:59:26.398Z'
updated_at: '2025-12-04T06:46:39.615Z'
transitions:
  - status: in-progress
    at: '2025-12-04T06:03:54.801Z'
  - status: complete
    at: '2025-12-04T06:09:28.543Z'
completed_at: '2025-12-04T06:09:28.543Z'
completed: '2025-12-04'
depends_on:
  - 137-ui-dependencies-page
  - 097-dag-visualization-library
---

# UI Dependencies Page: Dual View (DAG + Network)

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-12-04 · **Tags**: ui, ux, feature, visualization, dependencies, network-graph

## Overview

**Problem**: The current `/dependencies` page only shows the DAG view (`depends_on` relationships), filtering out `related` edges entirely. This gives an incomplete picture:

1. **`depends_on`** (DAG) = Blocking/directional dependencies - "Spec A must complete before Spec B"
2. **`related`** (Network) = Soft/associative connections - "Spec A and Spec B are related work"

Users need both views to comprehensively understand spec relationships:
- DAG view: Work order, blocking chains, critical path
- Network view: Clusters of related work, thematic groupings, collaboration opportunities

**Solution**: Add a view toggle to switch between:
1. **DAG View** (current): Hierarchical layout showing `depends_on` only
2. **Network View** (new): Force-directed graph showing **both** `depends_on` and `related`

## Design

### View Toggle UI

```
┌─────────────────────────────────────────────────────────────┐
│ Dependencies                         [DAG ▾ | Network]      │
├─────────────────────────────────────────────────────────────┤
```

**Tab-style toggle**
- Two buttons: `DAG` | `Network`
- Clear visual distinction of active view
- Positioned in header area

### Network View Layout

Force-directed graph using ReactFlow with `d3-force` simulation:

```
            ┌─────┐
            │ 045 │
           /       \
    ┌─────┐ - - - - ┌─────┐
    │ 082 │─────────│ 097 │
    └─────┘         └─────┘
        \    ┌─────┐    /
         - -│ 066 │- -
            └─────┘
```

**Edge Styling**:
- **Solid amber arrows** → `depends_on` (directional, blocking)
- **Dashed blue lines** → `related` (bidirectional, soft)

**Node Clustering**: Specs with many `related` edges naturally cluster together in force layout.

### Technical Approach

**Option A: d3-force with ReactFlow** (Recommended)
- Use ReactFlow for rendering (already integrated)
- Add `d3-force` for force simulation layout
- `forceLink()` for edges, `forceCenter()` for centering
- `forceManyBody()` with negative charge for node repulsion
- ~10KB additional (d3-force only)

**Option B: Separate library (vis.js, sigma.js)**
- More purpose-built for network graphs
- Adds significant bundle size
- Breaks consistency with existing ReactFlow usage

### State & Filtering

```typescript
type ViewMode = 'dag' | 'network';

// Edge visibility per view
const edgeVisibility = {
  dag: { dependsOn: true, related: false },
  network: { dependsOn: true, related: true },
};

// Layout algorithm per view
const layoutAlgorithm = {
  dag: 'dagre',        // Hierarchical left-to-right
  network: 'd3-force', // Force-directed clustering
};
```

### Component Structure

```
app/dependencies/
  page.tsx
  dependencies-client.tsx    # Add viewMode state + toggle
  view-toggle.tsx            # New: DAG/Network/Combined buttons
  layouts/
    dagre-layout.ts          # Existing (extracted from utils.ts)
    force-layout.ts          # New: d3-force simulation
  utils.ts                   # Update layoutGraph() to support viewMode
  constants.ts               # Add RELATED_COLOR
  types.ts                   # Add ViewMode type
```

## Plan

- [ ] Add ViewMode type and RELATED_COLOR constant
- [ ] Create view toggle component (DAG | Network | Combined)
- [ ] Implement force-directed layout using d3-force
- [ ] Update layoutGraph() to accept viewMode parameter
- [ ] Add related edges to graph when viewMode !== 'dag'
- [ ] Style related edges (dashed blue lines, no arrows)
- [ ] Update sidebar to show related connections for focused node
- [ ] Update legend to show both edge types when visible
- [ ] Test with various project sizes and relationship patterns

## Test

- [ ] DAG view works same as before (no regression)
- [ ] Network view shows both `depends_on` and `related` edges
- [ ] View toggle switches between layouts correctly
- [ ] Force layout clusters related specs together
- [ ] Edge styling clearly distinguishes relationship types
- [ ] Sidebar shows accurate related connections for focused node
- [ ] Performance acceptable with 50+ specs in network view
- [ ] Legend updates to reflect visible edge types

## Notes

### Current Implementation Gap

In [dependencies-client.tsx](../../packages/ui/src/app/dependencies/dependencies-client.tsx#L36):

```typescript
// Only use dependsOn edges for the graph (not related)
const dependsOnEdges = React.useMemo(
  () => data.edges.filter((e) => e.type === 'dependsOn'),
  [data.edges]
);
```

The `related` edges are fetched but filtered out. The API already returns both types.

### Why Force-Directed for Related?

`related` relationships are:
- **Bidirectional**: A ↔ B (not A → B)
- **Non-hierarchical**: No work order implied
- **Clustering-oriented**: Specs with shared topics group naturally

Dagre (hierarchical) layout doesn't serve these well. Force-directed:
- Naturally clusters connected components
- Shows bidirectional relationships clearly
- Reveals thematic groupings in the project

### Related Edge Visibility in Current DAG

The current DAG doesn't show `related` because:
1. They'd clutter the hierarchical view
2. No clear direction for positioning
3. Cross-level connections break visual hierarchy

The Network view addresses this with force-directed layout that naturally handles bidirectional relationships.

### d3-force Integration

```typescript
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

function forceLayout(nodes, edges, width, height) {
  const simulation = forceSimulation(nodes)
    .force('link', forceLink(edges).id(d => d.id).distance(150))
    .force('charge', forceManyBody().strength(-400))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide().radius(80));
  
  // Run simulation
  simulation.tick(300);
  simulation.stop();
  
  return nodes.map(n => ({ ...n, position: { x: n.x, y: n.y } }));
}
```

### Performance Considerations

Force simulation is CPU-intensive:
- Limit iterations (300 ticks typical)
- Run once on data change, not continuously
- Consider web worker for large graphs (100+ nodes)
- Cache layout results when filters don't change
