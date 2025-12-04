---
status: planned
created: '2025-12-04'
tags:
  - ui
  - ux
  - feature
  - visualization
  - dependencies
priority: medium
created_at: '2025-12-04T04:11:31.522Z'
related:
  - 097-dag-visualization-library
  - 119-ui-diagram-rendering
updated_at: '2025-12-04T04:11:31.603Z'
---

# UI Dependencies Page - Project-Wide Dependency Visualization

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-12-04 · **Tags**: ui, ux, feature, visualization, dependencies

## Overview

Add a dedicated `/dependencies` page in the UI package to visualize the complete dependency graph of ALL specs in a project. While the existing spec detail page shows dependencies for a single spec, this new page provides a bird's-eye view of the entire project's dependency structure.

**Problem**: Users can only see dependencies one spec at a time in the spec detail modal. There's no way to:
- See the complete project dependency graph at a glance
- Identify dependency bottlenecks (specs blocking many others)
- Find orphan specs with no connections
- Understand the overall project structure and work order

**Solution**: A dedicated page at `/dependencies` that renders all specs and their relationships using ReactFlow (already used in spec-dependency-graph.tsx).

## Design

### Page Location

- **Route**: `/dependencies` (new page alongside `/specs`, `/stats`)
- **Navigation**: Add "Dependencies" link to sidebar/nav alongside existing pages

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Dependencies                                    [Filter ▾]  │
│ Visualize spec relationships across your project            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌─────┐      ┌─────┐      ┌─────┐                      │
│     │ 001 │ ───→ │ 005 │ ───→ │ 012 │                      │
│     └─────┘      └─────┘      └─────┘                      │
│                      │            │                         │
│                      ↓            ↓                         │
│                  ┌─────┐      ┌─────┐                      │
│                  │ 008 │ ···· │ 015 │ (related)            │
│                  └─────┘      └─────┘                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Legend: ─── Depends On | ─ ─ Related | [N specs] [M edges]  │
└─────────────────────────────────────────────────────────────┘
```

### Features

1. **Full Graph Visualization**
   - Render all specs as nodes (reuse `SpecNode` component styling)
   - Show `dependsOn` edges (solid arrows)
   - Show `related` edges (dashed lines)
   - Use dagre layout for automatic positioning

2. **Interactive Navigation**
   - Click node → navigate to spec detail page
   - Zoom/pan with mouse/trackpad
   - Fit-to-view button

3. **Filtering Options**
   - By status: planned, in-progress, complete
   - By priority: critical, high, medium, low
   - By tag (multi-select)
   - Show/hide related edges (simpler view)
   - Search by spec name/number

4. **Visual Indicators**
   - Color-code by status (amber=planned, blue=in-progress, green=complete)
   - Highlight bottleneck specs (many incoming/outgoing edges)
   - Show orphan specs (no connections) in separate cluster

### API Requirements

New endpoint: `GET /api/dependencies`

```typescript
interface ProjectDependencyGraph {
  nodes: Array<{
    id: string;           // spec folder name
    name: string;         // display name
    number: number;       // sequence number
    status: string;
    priority: string;
    tags: string[];
  }>;
  edges: Array<{
    source: string;       // spec id
    target: string;       // spec id
    type: 'dependsOn' | 'related';
  }>;
}
```

### Component Structure

```
app/dependencies/
  page.tsx              # Server component, fetch initial data
  dependencies-client.tsx  # Client component with ReactFlow

components/
  project-dependency-graph.tsx  # Main graph component (new)
  # Reuse existing: SpecNode from spec-dependency-graph.tsx
```

## Plan

- [ ] Create API endpoint `/api/dependencies` to return full project graph
- [ ] Create `ProjectDependencyGraph` component (adapt from `SpecDependencyGraph`)
- [ ] Create `/dependencies` page with server/client components
- [ ] Add navigation link to sidebar
- [ ] Implement filtering UI (status, priority, tags)
- [ ] Add legend and stats display
- [ ] Test with various project sizes

## Test

- [ ] Page loads and renders all specs as nodes
- [ ] `dependsOn` edges render with correct direction (solid arrows)
- [ ] `related` edges render as dashed lines
- [ ] Clicking a node navigates to `/specs/{number}`
- [ ] Zoom/pan controls work
- [ ] Filtering by status correctly shows/hides nodes
- [ ] Empty state shown when project has no specs
- [ ] Performance acceptable with 50+ specs

## Notes

### Reuse Strategy

The existing `spec-dependency-graph.tsx` provides excellent building blocks:
- `SpecNode` component and `toneClasses` for styling
- Edge styling patterns (solid for dependsOn, dashed for related)
- dagre configuration for auto-layout
- ReactFlow integration patterns

Key difference: This page shows ALL specs, not just one spec's relationships.

### Performance Considerations

- For large projects (100+ specs), consider:
  - Virtualization or clustering
  - Lazy loading nodes outside viewport
  - Simplified node rendering (less detail)
- Initial implementation targets <50 specs, optimize later if needed

### Alternative Approaches Considered

1. **Mermaid diagram**: Static, no interactivity, limited layout control
2. **D3.js**: Too low-level, more code for same result
3. **Cytoscape.js**: Powerful but adds another dependency

**Decision**: Extend existing ReactFlow usage for consistency and bundle size.
