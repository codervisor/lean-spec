---
status: planned
created: '2025-12-08'
tags:
  - ui
  - ux
  - visualization
  - dependencies
  - enhancement
priority: medium
created_at: '2025-12-08T07:13:26.806Z'
depends_on:
  - 137-ui-dependencies-page
  - 138-ui-dependencies-dual-view
updated_at: '2025-12-08T07:13:26.868Z'
---

# Dependencies Page Focus Mode & Layered View

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-12-08 · **Tags**: ui, ux, visualization, dependencies, enhancement

## Overview

Enhance the dependencies page with three major improvements:
1. **Focus Mode** - Clean display showing only the highlighted spec and its direct upstream/downstream dependencies
2. **Layered Hierarchical View** - Organized layout with clear visual grouping by dependency depth
3. **Style Alignment** - Consistent visual design between dependencies page and spec detail dialog

**Problem**: The current dependencies page shows the entire graph with dimming for non-connected specs, which can be visually cluttered. Additionally, there are inconsistencies between the dependencies page and the spec detail dialog. Users need:
- A cleaner "focus mode" to see only relevant specs when highlighting a node
- Better visual hierarchy to understand dependency layers and work order
- Clearer organization than the current flat DAG layout
- Consistent styling, colors, labels, and terminology across both dependency views

**Solution**: Add view controls to toggle between full graph and focused view, with improved hierarchical layering and unified design system across both dependency visualizations.

## Context

### Current Behavior

When a spec is selected/highlighted in the dependencies graph:
- Connected specs remain visible but get styled with `connectionDepth`
- Unconnected specs are "dimmed" with `isDimmed: true`
- All specs remain in the graph (no actual filtering)

**Code location**: [dependencies-client.tsx](../../packages/ui/src/components/dependencies/dependencies-client.tsx#L242-L254)

```typescript
if (focusedNodeId) {
  connectionDepth = connectionDepths?.get(node.id);
  isDimmed = connectionDepth === undefined;
}
```

### Problems

1. **Visual Clutter**: Dimmed nodes are still present, cluttering the view
2. **No True Focus**: Users can't get a clean "only show what matters" view
3. **Flat Layout**: Current dagre layout doesn't emphasize hierarchical layers
4. **Cognitive Load**: Hard to see dependency depth at a glance

### User Scenarios

**Scenario 1: Understanding Dependencies**
> "I want to see what spec #082 depends on and what depends on it, without all the other noise"

**Scenario 2: Work Order Planning**
> "Show me the layers of specs I need to complete in order, with clear visual grouping"

**Scenario 3: Impact Analysis**
> "If I change spec #045, I want to see exactly which specs are affected"

## Design

### 1. Focus Mode Toggle

Add a toggle button that appears when a spec is selected:

```
┌────────────────────────────────────────────────────────────┐
│ [Graph View] [Focus Mode]  ← Toggle (only active w/ selection) │
│                                                            │
│  Selected: #082 unified-dashboard              [×] Clear  │
└────────────────────────────────────────────────────────────┘
```

**Behavior:**
- **Graph View** (default): Shows all specs (current behavior with dimming)
- **Focus Mode**: Shows ONLY:
  - The focused spec
  - Direct upstream dependencies (specs it depends on)
  - Direct downstream dependencies (specs that depend on it)
  - Removes all dimmed nodes from the graph entirely

**Visual Design:**
- Toggle button group (similar to status filters)
- Only enabled when `focusedNodeId !== null`
- Auto-switches to Graph View when focus is cleared

### 2. Layered Hierarchical Layout

Improve the visual organization to emphasize dependency layers:

```
Layer 0 (Focused):
┌─────────────────┐
│   #082-dash     │
│   [FOCUSED]     │
└─────────────────┘

Layer 1 (Direct Upstream - depends on):
┌──────────┐    ┌──────────┐
│ #045-api │    │ #035-ui  │
└──────────┘    └──────────┘
     ↓               ↓
     └───────┬───────┘
             ↓

Layer 1 (Direct Downstream - blocks):
             ↑
     ┌───────┴───────┐
     ↑               ↑
┌──────────┐    ┌──────────┐
│ #097-viz │    │ #099-cli │
└──────────┘    └──────────┘
```

**Layout Strategy:**

1. **Vertical Layering**: Group specs by dependency depth
   - Upstream deps above focused node
   - Focused node in center
   - Downstream deps below focused node

2. **Visual Grouping**: Add subtle backgrounds or dividers between layers
   - Light background panel per layer
   - Layer labels: "Direct Dependencies", "This Spec", "Blocks These"

3. **Improved Spacing**: Increase vertical spacing between layers for clarity

4. **Horizontal Alignment**: Center-align specs within each layer

### Implementation Details

#### Focus Mode Implementation

**Changes to `dependencies-client.tsx`:**

```typescript
// Add view mode state
const [viewMode, setViewMode] = React.useState<'graph' | 'focus'>('graph');

// Modify graph building logic
const graph = React.useMemo(() => {
  // ... existing filter logic ...
  
  let visibleNodes = criticalPathNodes;
  
  // NEW: Focus mode filtering
  if (viewMode === 'focus' && focusedNodeId) {
    const focusedConnections = new Set<string>([focusedNodeId]);
    
    // Add direct upstream (specs the focused node depends on)
    dependsOnEdges
      .filter((e) => e.source === focusedNodeId)
      .forEach((e) => focusedConnections.add(e.target));
    
    // Add direct downstream (specs that depend on focused node)
    dependsOnEdges
      .filter((e) => e.target === focusedNodeId)
      .forEach((e) => focusedConnections.add(e.source));
    
    visibleNodes = visibleNodes.filter((n) => focusedConnections.has(n.id));
  } else if (!showStandalone) {
    // Existing standalone filter logic
    // ...
  }
  
  // ... rest of graph building ...
}, [data, dependsOnEdges, statusFilter, focusedNodeId, viewMode, /* ... */]);
```

#### Layered Layout Enhancement

**Changes to `utils.ts` (layoutGraph function):**

```typescript
export function layoutGraph(
  nodes: Node<SpecNodeData>[],
  edges: Edge[],
  isCompact: boolean,
  showStandalone: boolean,
  viewMode?: 'graph' | 'focus',
  focusedNodeId?: string | null
): { nodes: Node<SpecNodeData>[]; edges: Edge[] } {
  // Use enhanced layering for focus mode
  if (viewMode === 'focus' && focusedNodeId) {
    return layeredLayout(nodes, edges, focusedNodeId, isCompact);
  }
  
  // Existing dagre layout for graph mode
  return dagreLayout(nodes, edges, isCompact);
}

function layeredLayout(
  nodes: Node<SpecNodeData>[],
  edges: Edge[],
  focusedNodeId: string,
  isCompact: boolean
): { nodes: Node<SpecNodeData>[]; edges: Edge[] } {
  const NODE_WIDTH = isCompact ? 160 : 180;
  const NODE_HEIGHT = isCompact ? 60 : 70;
  const HORIZONTAL_GAP = isCompact ? 30 : 40;
  const LAYER_GAP = 150; // Increased vertical spacing
  
  // Categorize nodes
  const focusedNode = nodes.find((n) => n.id === focusedNodeId);
  const upstreamIds = new Set(
    edges.filter((e) => e.source === focusedNodeId).map((e) => e.target)
  );
  const downstreamIds = new Set(
    edges.filter((e) => e.target === focusedNodeId).map((e) => e.source)
  );
  
  const upstream = nodes.filter((n) => upstreamIds.has(n.id));
  const downstream = nodes.filter((n) => downstreamIds.has(n.id));
  
  // Layout layers
  const centerX = 400; // Canvas center
  
  // Layer 0: Focused node (center)
  if (focusedNode) {
    focusedNode.position = { x: centerX - NODE_WIDTH / 2, y: LAYER_GAP };
  }
  
  // Layer -1: Upstream (above)
  const upstreamY = 0;
  layoutHorizontalRow(upstream, centerX, upstreamY, NODE_WIDTH, HORIZONTAL_GAP);
  
  // Layer +1: Downstream (below)
  const downstreamY = LAYER_GAP * 2;
  layoutHorizontalRow(downstream, centerX, downstreamY, NODE_WIDTH, HORIZONTAL_GAP);
  
  return { nodes, edges };
}

function layoutHorizontalRow(
  nodes: Node<SpecNodeData>[],
  centerX: number,
  y: number,
  nodeWidth: number,
  gap: number
) {
  const totalWidth = nodes.length * nodeWidth + (nodes.length - 1) * gap;
  let startX = centerX - totalWidth / 2;
  
  nodes.forEach((node, i) => {
    node.position = { x: startX + i * (nodeWidth + gap), y };
  });
}
```

#### UI Changes

**View Mode Toggle:**

```tsx
{/* Add after spec selector */}
{focusedNodeId && (
  <div className="flex gap-1 rounded-md border border-border bg-background p-0.5">
    <button
      onClick={() => setViewMode('graph')}
      className={cn(
        'rounded px-2 py-1 text-xs font-medium transition-colors',
        viewMode === 'graph'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      Graph View
    </button>
    <button
      onClick={() => setViewMode('focus')}
      className={cn(
        'rounded px-2 py-1 text-xs font-medium transition-colors',
        viewMode === 'focus'
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      Focus Mode
    </button>
  </div>
)}
```

**Layer Labels (Optional Enhancement):**

Add visual layer indicators in focus mode:

```tsx
{viewMode === 'focus' && focusedNodeId && (
  <div className="absolute inset-0 pointer-events-none">
    {/* Layer backgrounds */}
    <div className="absolute left-0 right-0 h-24 bg-blue-50/30 dark:bg-blue-950/10"
         style={{ top: '0px' }}>
      <span className="absolute left-2 top-1 text-[9px] font-medium text-blue-600 dark:text-blue-400">
        UPSTREAM DEPENDENCIES
      </span>
    </div>
    <div className="absolute left-0 right-0 h-24 bg-amber-50/30 dark:bg-amber-950/10"
         style={{ top: '150px' }}>
      <span className="absolute left-2 top-1 text-[9px] font-medium text-amber-600 dark:text-amber-400">
        FOCUSED SPEC
      </span>
    </div>
    <div className="absolute left-0 right-0 h-24 bg-green-50/30 dark:bg-green-950/10"
         style={{ top: '300px' }}>
      <span className="absolute left-2 top-1 text-[9px] font-medium text-green-600 dark:text-green-400">
        DOWNSTREAM (BLOCKS THESE)
      </span>
    </div>
  </div>
)}
```

## Plan

### Phase 1: Style Alignment (Foundation)
- [ ] Audit style differences between dependencies page and spec detail dialog
- [ ] Create shared constants file for colors, labels, and terminology
- [ ] Align node styling (card design, borders, backgrounds)
- [ ] Align edge styling (colors, stroke width, arrow markers)
- [ ] Align labels and badges ("Depends On" vs "Required By")
- [ ] Unify legend and UI controls styling
- [ ] Update both components to use shared constants

### Phase 2: Focus Mode
- [ ] Add `viewMode` state to `dependencies-client.tsx`
- [ ] Implement focus mode filtering logic
- [ ] Create view mode toggle UI component
- [ ] Handle edge cases (no upstream/downstream deps)

### Phase 3: Layered Layout
- [ ] Extract dagre layout to separate function
- [ ] Implement layered layout function for focus mode
- [ ] Update `layoutGraph` to support view mode parameter
- [ ] Add layer labels/backgrounds (optional enhancement)

### Phase 4: Polish & Testing
- [ ] Update legend to reflect focus mode behavior
- [ ] Test with various project sizes and structures
- [ ] Verify style consistency across both views
- [ ] Performance testing

## Test

### Style Alignment
- [ ] Node card design matches between dependencies page and spec detail dialog
- [ ] Edge colors consistent (amber for depends_on, red for required_by if used)
- [ ] Edge stroke width and arrow markers identical
- [ ] Labels use same terminology ("Depends On", "Required By")
- [ ] Legend format and text consistent across both views
- [ ] Badge styling matches (uppercase, same colors, same sizes)
- [ ] Background and border colors aligned
- [ ] Typography (font sizes, weights, spacing) consistent
- [ ] Hover states behave identically
- [ ] Dark mode styling consistent

### Focus Mode
- [ ] Toggle only appears when a spec is selected
- [ ] Focus mode shows only focused spec + direct deps
- [ ] All dimmed nodes are removed from graph in focus mode
- [ ] Switching back to graph view restores full graph
- [ ] Focus mode auto-switches to graph when selection cleared
- [ ] Empty state shown if focused spec has no dependencies

### Layered Layout
- [ ] Upstream specs render above focused node
- [ ] Focused node renders in center layer
- [ ] Downstream specs render below focused node
- [ ] Specs horizontally centered within each layer
- [ ] Vertical spacing between layers is clear
- [ ] Edges correctly connect between layers
- [ ] Layout scales well with 1-10 specs per layer

### Interactions
- [ ] View mode persists when changing focused spec
- [ ] Zoom/pan controls work in both modes
- [ ] Fit-to-view adjusts to visible nodes in focus mode
- [ ] Node click/selection works same in both modes
- [ ] Sidebar shows correct upstream/downstream in focus mode

### Edge Cases
- [ ] Focused spec with no dependencies shows just the spec
- [ ] Focused spec with only upstream (no downstream) layouts correctly
- [ ] Focused spec with only downstream (no upstream) layouts correctly
- [ ] Large number of direct deps (10+) doesn't overflow
- [ ] Status filters work correctly with focus mode

## Notes

### Design Decisions

**Why "Focus Mode" vs "Filter to Connected"?**
- "Focus" better communicates the user intent (zoom in on one spec)
- Aligns with common UX patterns (Gmail focused inbox, Slack focus mode)
- Shorter, clearer label

**Why Direct Deps Only in Focus Mode?**
- Simplest, cleanest view
- Matches most common use case ("what does this immediately depend on?")
- Transitive deps can be explored by clicking through nodes
- Could add "Extended Focus" later if needed

**Why Layered Layout for Focus Mode?**
- Emphasizes the hierarchy and work order
- Makes upstream/downstream distinction crystal clear
- Reduces horizontal sprawl (easier to view on smaller screens)
- Better use of vertical space

### Future Enhancements

1. **Extended Focus Mode**: Show transitive deps up to N levels
2. **Critical Path Highlighting**: Highlight longest dependency chain
3. **Layer Collapsing**: Collapse/expand layers to reduce clutter
4. **Save View Preferences**: Remember user's preferred view mode
5. **Keyboard Shortcuts**: `F` for focus mode, `G` for graph view

### Alternative Approaches Considered

**Option 1: Dimming Slider**
- Add slider to control opacity of non-connected nodes
- **Rejected**: More complex UI, doesn't solve clutter

**Option 2: Hide Unconnected Toggle**
- Simple checkbox "Hide unconnected specs"
- **Rejected**: Less discoverable, doesn't improve layout

**Option 3: Radial Layout for Focus**
- Focused spec in center, deps in a circle around it
- **Rejected**: Harder to show direction/hierarchy

### Implementation Complexity

**Low Complexity:**
- Focus mode filtering (straightforward Set operations)
- View mode toggle UI (standard button group)

**Medium Complexity:**
- Layered layout algorithm (need to calculate layer positions)
- Layer label overlay (absolute positioning, z-index management)

**High Complexity:**
- Dynamic layer height (if we want backgrounds to fit content)
- Animated transitions between layouts (would be nice but not MVP)

### Performance Considerations

- Focus mode improves performance (fewer nodes to render)
- Layered layout is O(n) where n = visible nodes
- No performance concerns for typical project sizes (< 100 specs)

## Style Alignment Details

### Current Inconsistencies

**Dependencies Page** (`dependencies-client.tsx`):
- Edge color: `#f59e0b` (amber-400) for depends_on edges
- Labels: "Depends On" in legend
- Node badges: Status-based (WIP, PLN, COM, ARC)
- Compact vs full node size toggle
- Sidebar with depth-based grouping

**Spec Detail Dialog** (`spec-dependency-graph.tsx`):
- Edge colors: `#f59e0b` (amber) for precedence, `#ef4444` (red) for required-by
- Labels: "Depends On" and "Required By" with detailed subtitles
- Node badges: "Depends On", "Required By", "Current Spec"
- Fixed node size (280x110)
- No sidebar, only legend

### Shared Constants Structure

Create `packages/ui/src/components/dependencies/shared-constants.ts`:

```typescript
// Color Palette
export const DEPENDS_ON_COLOR = '#f59e0b';  // amber-400
export const REQUIRED_BY_COLOR = '#ef4444'; // red-400
export const CURRENT_SPEC_COLOR = '#3b82f6'; // blue-500

// Typography & Labels
export const LABELS = {
  dependsOn: {
    short: 'Depends On',
    long: 'Dependencies',
    description: 'Must complete first',
    arrowDirection: '→',
  },
  requiredBy: {
    short: 'Required By',
    long: 'Blocks These',
    description: 'Blocked by this spec',
    arrowDirection: '←',
  },
  currentSpec: {
    badge: 'Current Spec',
    description: 'This spec',
  },
} as const;

// Node Styling
export const NODE_STYLES = {
  compact: {
    width: 160,
    height: 60,
  },
  full: {
    width: 180,
    height: 70,
  },
  dialog: {
    width: 280,
    height: 110,
  },
} as const;

// Tone Classes (shared between both views)
export const toneBgColors: Record<string, string> = {
  planned: '#3b82f6',    // blue
  'in-progress': '#f59e0b', // amber
  complete: '#10b981',   // green
  archived: '#6b7280',   // gray
  precedence: '#f59e0b', // amber (for spec detail dialog)
  current: '#3b82f6',    // blue (for spec detail dialog)
  'required-by': '#ef4444', // red (for spec detail dialog)
};

// Edge Styling
export const EDGE_STYLES = {
  dependsOn: {
    color: DEPENDS_ON_COLOR,
    strokeWidth: 2.5,
    markerSize: { width: 18, height: 18 },
  },
  requiredBy: {
    color: REQUIRED_BY_COLOR,
    strokeWidth: 2.5,
    markerSize: { width: 18, height: 18 },
  },
} as const;
```

### Style Unification Plan

**1. Node Card Design**

Align both to use consistent styling:
```tsx
// Unified node card (adapt both components)
<div className={cn(
  'flex flex-col gap-1.5 rounded-xl border-2 px-4 py-3',
  'shadow-md transition-colors',
  toneBorderClasses[tone],
  interactive && 'cursor-pointer hover:border-primary/70 hover:shadow-lg'
)}>
  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
    {badge}
  </span>
  <span className="text-sm font-semibold leading-snug">{label}</span>
  {subtitle && (
    <span className="text-xs text-muted-foreground/80">{subtitle}</span>
  )}
</div>
```

**2. Edge Styling**

Use consistent edge appearance:
```typescript
// Dependencies page should match spec detail dialog
{
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: EDGE_STYLES.dependsOn.color,
    width: EDGE_STYLES.dependsOn.markerSize.width,
    height: EDGE_STYLES.dependsOn.markerSize.height,
  },
  style: {
    stroke: EDGE_STYLES.dependsOn.color,
    strokeWidth: EDGE_STYLES.dependsOn.strokeWidth,
  },
}
```

**3. Legend Alignment**

Unify legend text and icons:
```tsx
// Shared legend component
<div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
  <span className="inline-flex items-center gap-2">
    <span className="inline-block h-0.5 w-6 rounded" 
          style={{ backgroundColor: DEPENDS_ON_COLOR }} />
    {LABELS.dependsOn.short} {LABELS.dependsOn.arrowDirection} {LABELS.dependsOn.description}
  </span>
  <span className="inline-flex items-center gap-2">
    <span className="inline-block h-0.5 w-6 rounded" 
          style={{ backgroundColor: REQUIRED_BY_COLOR }} />
    {LABELS.requiredBy.short} {LABELS.requiredBy.arrowDirection} {LABELS.requiredBy.description}
  </span>
</div>
```

**4. Terminology Consistency**

| Concept | Unified Term | Usage |
|---------|--------------|-------|
| Upstream dependencies | "Depends On" | What this spec needs |
| Downstream dependents | "Required By" | What needs this spec |
| Direction arrows | → and ← | Show relationship direction |
| Status badge | 3-letter codes | WIP, PLN, COM, ARC |

### Migration Strategy

1. **Create shared constants file** - Single source of truth for all styling
2. **Update dependencies page first** - Align to spec detail dialog design
3. **Extract shared components** - Create reusable `DependencyNode`, `DependencyEdge`, `DependencyLegend`
4. **Update spec detail dialog** - Use shared components
5. **Document design system** - Add to Storybook or component docs

### Benefits of Alignment

- **User familiarity**: Same visualization feels familiar in both contexts
- **Maintainability**: Changes to styling happen in one place
- **Component reuse**: Extract shared logic into reusable components
- **Consistency**: Professional, cohesive user experience
