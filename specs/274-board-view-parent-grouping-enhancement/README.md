---
status: complete
created: 2026-02-01
priority: high
tags:
- ui
- ux
- visualization
- hierarchy
created_at: 2026-02-01T12:17:19.575083Z
updated_at: 2026-02-01T15:31:51.855144Z
---
# Board View Parent Grouping Enhancement - Prioritize Umbrella Specs

## Overview

The current board view when grouped by parent (`groupByParent=true`) does not provide an intuitive visual hierarchy. The main issues:

1. **Parent cards lack prominence** - Parent/umbrella specs are not visually distinguished from child specs
2. **Child cards are too prominent** - When grouping by parent, users primarily care about umbrella specs, not individual children
3. **Visual hierarchy is flat** - The parent-child relationship is not clearly communicated through visual design

When grouping by parent, the primary focus should be on the parent/umbrella specs themselves, with child specs serving as supporting details rather than primary content.

This enhancement also needs to consider the specs list view to ensure consistent hierarchy visualization across both views.

## Design

### Core Principle

**Focus follows grouping context**: When grouping by parent, prominence should shift from individual specs to umbrella specs.

### Visual Hierarchy Changes

#### 1. Parent Card Enhancement (Currently in BoardGroup header)

The parent spec should become a **prominent card** rather than just a header:

- **Full card treatment** with all metadata:
  - Status, priority, token count, validation badges
  - Title, spec name, tags
  - Children count (clearly displayed)
  - Navigate to parent spec on click
  
- **Visual distinction**:
  - Larger size (similar to current spec cards)
  - Distinctive styling (e.g., subtle gradient, elevated shadow)
  - Prominent umbrella icon
  - Border or background treatment to distinguish from children

- **Collapsibility**:
  - Click to expand/collapse children
  - Persist expanded state per parent in session storage
  - Default: collapsed for >3 children, expanded otherwise

#### 2. Child Card De-emphasis

Child cards should be **visually subordinate**:

- **Reduced size**: Smaller padding, smaller text
- **Muted styling**:
  - Less prominent borders
  - Reduced shadow
  - Slightly muted colors
  - Simplified badge display (icon-only priority, smaller tokens)
  
- **Condensed information**:
  - No spec filename display (title only)
  - Maximum 2 tags shown
  - Smaller or icon-only badges

- **Visual nesting**:
  - Indentation or left border to show hierarchy
  - Could use a connector line like in HierarchyList

#### 3. Independent Specs Section

Specs without parents (orphans) should remain as they are currently, potentially with a clearer section header.

### Interaction Improvements

1. **Parent card click** → Navigate to parent spec detail page
2. **Parent card collapse icon** → Toggle children visibility
3. **Drag and drop**:
   - Dragging a parent moves all children with it
   - Dragging a child moves only that child
4. **Children count badge** on parent card shows total (including nested)

### Layout Considerations

```
┌─────────────────────────────────────┐
│ 🌳 Parent Spec (Full Card)           │
│ #123 • ⭐ high • 🔢 2.5k • ✅        │
│ Title of Parent Spec                 │
│ [5 children] [Collapse ▼]           │
└─────────────────────────────────────┘
  ├─ Child A (condensed)
  ├─ Child B (condensed)
  ├─ Child C (condensed)
  └─ Child D (condensed)
```

### Specs List View Alignment

The specs list view (non-board) should also benefit from hierarchy improvements:

- When grouped by parent, use similar visual hierarchy
- Parent specs should be visually distinct
- Consider accordion-style grouping for consistency

## Plan

### Phase 1: Parent Card Component Refactoring
- [ ] Extract parent card rendering from BoardGroup header
- [ ] Create new `ParentSpecCard` component with full metadata
- [ ] Add navigation to parent spec on click
- [ ] Implement collapse/expand functionality
- [ ] Add session storage persistence for expanded state

### Phase 2: Child Card Style Updates
- [ ] Update `renderCard` to accept `isChild` variant
- [ ] Apply de-emphasized styles to child cards
- [ ] Reduce information density for child cards
- [ ] Add visual nesting indicators (indentation/connector lines)

### Phase 3: Interaction Enhancements
- [ ] Implement parent drag-and-drop with children
- [ ] Add children count badge to parent card
- [ ] Add keyboard navigation support (optional)

### Phase 4: Specs List View Parity
- [ ] Review specs list view hierarchy display
- [ ] Apply consistent visual hierarchy principles
- [ ] Ensure parent prominence in list view when grouped

### Phase 5: Testing & Polish
- [ ] Test with various hierarchy depths
- [ ] Test with collapsed/expanded states
- [ ] Verify drag-and-drop behavior
- [ ] Cross-browser testing
- [ ] Accessibility audit

## Test

- [ ] Parent cards display all expected metadata (status, priority, tokens, validation)
- [ ] Parent cards are visually distinct from child cards
- [ ] Child cards are appropriately de-emphasized
- [ ] Clicking parent card navigates to parent spec detail page
- [ ] Collapse/expand functionality works correctly
- [ ] Expanded state persists across page refreshes (session storage)
- [ ] Drag-and-drop works for both parent and child cards
- [ ] Visual hierarchy is clear and intuitive
- [ ] Works correctly across all status columns
- [ ] Specs list view has consistent hierarchy visualization
- [ ] No regressions in non-parent-grouped board view
- [ ] Accessibility standards met (keyboard nav, screen readers)

## Notes

### Design Questions

1. **Parent card placement**: Should it be above children (current) or as a collapsible header?
   - Recommendation: Above children with clear visual separation

2. **Nested umbrellas**: How to handle parent specs that are also children?
   - Show umbrella icon on child cards
   - Maintain visual hierarchy based on immediate parent context

3. **Drag behavior**: Should dragging parent move all children?
   - Phase 1: No (simpler)
   - Phase 2: Optional enhancement

### Related Work

- [HierarchyList.tsx](packages/ui/src/components/specs/HierarchyList.tsx) uses similar parent-child visualization
- Consider extracting shared hierarchy visualization patterns into reusable components

### Token Budget

Target: <1500 tokens for implementation-focused spec
Current: ~1400 tokens

### Future Enhancements (Out of Scope)

- Multi-level nested hierarchy visualization (grandchildren)
- Keyboard shortcuts for collapse/expand all
- Bulk actions on parent + children
- Custom sort within parent groups
