---
status: complete
created: 2026-01-30
priority: medium
tags:
- ui
- hierarchy
- list-view
- board-view
- tree-view
parent: 250-structured-spec-hierarchy-management
created_at: 2026-01-30T02:35:28.245859Z
updated_at: 2026-01-30T09:53:21.444695Z
completed_at: 2026-01-30T09:53:21.444695Z
transitions:
- status: in-progress
  at: 2026-01-30T09:51:19.467070Z
- status: complete
  at: 2026-01-30T09:53:21.444695Z
---

# UI Hierarchy Visualization Enhancement

## Overview

### Problem

The current UI implementation of spec hierarchy has usability issues:

1. **List view lacks hierarchy support** - Board view can group by parent, but list view shows flat results without parent grouping
2. **Board tree-view gives too much prominence to child specs** - In practice, we mainly care about umbrella specs; child specs should be visually de-emphasized
3. **List view design differs from sidebar** - The specs nav sidebar has a tree-view design that works well; list view should adopt similar patterns

### Current State

- **Board view**: Can group by parent but tree-view makes child specs too visually prominent
- **List view**: Flat display only, no hierarchy or grouping options
- **Nav sidebar**: Has a well-designed tree-view with collapsible groups

### Impact

- Users can't quickly scan umbrella specs to understand project structure
- Navigation between board/list/sidebar feels inconsistent
- Managing large spec collections is harder than necessary

## Design

### 1. List View with Parent Grouping

Add a `groupByParent` option to list view matching the board's grouping capability:

```
📁 #221 AI Orchestration Integration (umbrella)
  └ 📁 #168 Orchestration Platform (umbrella)
      ├ #239 Session Management
      ├ #244 Session UI Enhancement
      └ #243 Realtime File Watch
  └ 📁 #94 AI Chatbot (umbrella)
      ├ #223 Chat History
      └ #227 Context Management

📁 #250 Structured Spec Hierarchy (umbrella)
  ├ #252 Hierarchy Support
  ├ #253 Relationships Editing
  └ #254 Relationship Commands
```

### 2. Board Tree-View Redesign

Focus on umbrella specs with collapsed/de-emphasized children:

**Current (problematic):**
- Child specs have same visual weight as parent (borders, prominence)
- Hard to distinguish umbrella structure at a glance

**Proposed:**
- Umbrella specs are visually prominent (icon 🌂, larger text, borders)
- Child specs are subdued (no borders, smaller text, indented with dots)
- Auto-collapse after N children with "[+X more]" toggle
- Expand/collapse all children control

### 3. List View Adopts Sidebar Tree Pattern

Align the specs list page list-view with the nav sidebar design:

| Feature           | Nav Sidebar        | List View (proposed)     |
| ----------------- | ------------------ | ------------------------ |
| Tree structure    | ✅ Collapsible      | ✅ Add collapsible groups |
| Indentation       | ✅ Visual hierarchy | ✅ Match indent style     |
| Expand/collapse   | ✅ Arrow toggles    | ✅ Add same controls      |
| Status indicators | ✅ Colored dots     | ✅ Match styling          |

## Plan

### Phase 1: List View Parent Grouping
- [x] Add `groupByParent` option to list view state
- [x] Implement tree-structure rendering for grouped specs
- [x] Add expand/collapse controls for umbrella groups
- [x] Sync view toggle with URL params

### Phase 2: Board Tree-View Redesign
- [x] Reduce visual prominence of child specs in board
- [x] Add umbrella icon (🌂) to parent specs
- [x] Implement auto-collapse for children (show first N, "[+X more]")
- [x] Add expand/collapse all toggle

### Phase 3: Consistent Tree Styling
- [x] Extract shared tree-view component from sidebar
- [x] Apply consistent styling to list view groups
- [x] Match indentation, icons, and collapse behavior
- [x] Ensure responsive behavior on mobile

## Test

- [x] List view can toggle between flat and grouped modes
- [x] Board tree-view shows umbrellas prominently
- [x] Children are visually de-emphasized in board
- [x] Expand/collapse works in both list and board
- [x] Tree styling matches sidebar design
- [x] Mobile layout works correctly

## Notes

### Related Components

- `packages/ui/src/components/specs/SpecsList.tsx` - Main list component
- `packages/ui/src/components/specs/SpecsBoard.tsx` - Board component
- Nav sidebar tree-view component (reference implementation)

### Design Principles

- **Umbrella-first**: Default views should emphasize umbrella specs
- **Progressive disclosure**: Hide child details until needed
- **Consistency**: Match patterns across board, list, and sidebar