---
status: planned
created: 2026-01-29
priority: medium
tags:
- ui
- hierarchy
- umbrella
- components
- frontend
depends_on:
- 250-structured-spec-hierarchy-management
parent: 250-structured-spec-hierarchy-management
created_at: 2026-01-29T09:10:46.895660085Z
updated_at: 2026-01-29T09:10:46.895660085Z
---

# LeanSpec UI - Hierarchy Management Support (Spec 250 UI Components)

> **Status**: planned · **Priority**: medium · **Created**: 2026-01-29

## Overview

Spec 250 introduces structured hierarchy management for LeanSpec, including parent-child relationships between specs. The `@leanspec/ui` package needs corresponding UI components to visualize and interact with these hierarchical relationships in the web interface.

Without these components:
- Users cannot visualize spec hierarchy in the UI
- No way to see parent-child relationships in spec cards
- Board view cannot group specs by parent umbrella
- Missing visual indicators for umbrella specs

## Design

### UI Components Needed

**1. Hierarchy Tree Component**
- Visual tree view for spec parent-child relationships
- Expandable/collapsible nodes
- Shows spec status badges inline
- Depth-based indentation

**2. Spec Card Enhancement**
- Parent indicator on spec cards
- "Children" count badge
- Umbrella icon (🌂) for umbrella specs
- Breadcrumb navigation showing parent chain

**3. Board View Grouping**
- Group specs by parent umbrella
- Nested structure showing hierarchy
- Visual indentation for child specs
- Filter by parent umbrella

**4. Spec Detail View Updates**
- Parent spec section with link
- Children list section
- Hierarchy path breadcrumb
- "View in hierarchy" action

**5. Specs Nav Sidebar Tree-View**
- Replace or augment flat spec list with hierarchical tree
- Expandable/collapsible umbrella specs
- Visual tree connectors showing parent-child relationships
- Indentation levels for nested specs
- Quick expand/collapse all toggle
- Filter/search within tree structure
- Current spec highlighting in tree context
- Drag-and-drop support for re-parenting (future)

### Technical Approach

- Extend existing SpecCard component
- Create new HierarchyTree component
- Update Board view to support grouping
- Add parent/children data to spec queries

## Plan

- [ ] Create `HierarchyTree` component with tree visualization
- [ ] Update `SpecCard` to show parent and children indicators
- [ ] Add umbrella icon indicator for umbrella specs
- [ ] Update Board view with "group by parent" option
- [ ] Update Spec detail view with parent/children sections
- [ ] Add hierarchy breadcrumb navigation
- [ ] Update GraphQL queries to fetch parent/children data
- [ ] Add TypeScript types for parent-child relationships
- [ ] Style updates for visual hierarchy indicators
- [ ] Implement Specs Nav Sidebar with tree-view mode

## Test

- [ ] Hierarchy tree renders correctly with nested specs
- [ ] Spec cards show parent link when applicable
- [ ] Umbrella specs display umbrella icon
- [ ] Board grouping by parent works as expected
- [ ] Spec detail shows parent and children sections
- [ ] Breadcrumb navigation works across hierarchy levels
- [ ] Specs nav sidebar tree-view displays hierarchy correctly
- [ ] Expand/collapse works for umbrella specs in sidebar

## Notes

### Related Work

- **250-structured-spec-hierarchy-management** - Core backend/MCP implementation
- Requires updated GraphQL schema with parent/children fields
- Umbrella detection is automatic based on having children
