---
status: complete
created: 2026-02-02
priority: medium
tags:
- ui
- ux
- inline-editing
parent: 132-ui-edit-capabilities
created_at: 2026-02-02T02:59:56.503120875Z
updated_at: 2026-02-02T08:14:34.246722004Z
---
# Inline Metadata Editing for Specs List Page

## Context
The specs list page (both list and board views) currently displays spec metadata (status, priority) as read-only badges. Users must navigate to the spec detail page to edit these values. This creates unnecessary friction for quick status updates during spec triage or sprint planning.

**Current behavior:**
- `StatusBadge` and `PriorityBadge` components are display-only
- Editing requires navigating to spec detail → edit mode
- Board view uses drag-and-drop for status changes, but no priority editing

**Files involved:**
- [packages/ui/src/components/specs/ListView.tsx](packages/ui/src/components/specs/ListView.tsx) - List view spec items
- [packages/ui/src/components/specs/BoardView.tsx](packages/ui/src/components/specs/BoardView.tsx) - Kanban board view
- [packages/ui/src/components/StatusBadge.tsx](packages/ui/src/components/StatusBadge.tsx) - Status display
- [packages/ui/src/components/PriorityBadge.tsx](packages/ui/src/components/PriorityBadge.tsx) - Priority display

## Requirements

### Functional
1. **Clickable Status/Priority Badges**: Transform badges into interactive elements that open a dropdown/popover for editing
2. **Dropdown Selector**: Show available status/priority options in a dropdown when badge is clicked
3. **Immediate Update**: Apply changes immediately via API call (optimistic update pattern)
4. **Event Propagation**: Prevent click from navigating to spec detail page when editing inline
5. **Visual Feedback**: Show loading state during update, success/error feedback
6. **Keyboard Navigation**: Support arrow keys for dropdown selection, Enter to confirm, Escape to cancel

### UX Requirements
- Dropdown should appear near the clicked badge (popover positioning)
- Clear visual indication that badges are interactive (hover cursor, subtle hover effect)
- Consistent behavior between list view and board view
- Mobile-friendly touch targets

## Implementation Approach

### Option A: Editable Badge Variants (Recommended)
Create editable variants of existing badge components:
- `StatusBadge` gets an `editable` prop → when true, renders as dropdown trigger
- `PriorityBadge` gets same treatment
- Uses shadcn/ui `Popover` + `Select` or `RadioGroup` for selection UI

### Option B: Separate Inline Edit Components
Create dedicated `InlineStatusEditor` and `InlinePriorityEditor` components that wrap the existing badges.

**Recommendation**: Option A is more DRY and maintains component API consistency.

## Checklist
- [ ] Add `editable` prop to StatusBadge component
- [ ] Add `editable` prop to PriorityBadge component  
- [ ] Implement popover-based dropdown for status selection
- [ ] Implement popover-based dropdown for priority selection
- [ ] Add `onStatusChange` and `onPriorityChange` callbacks
- [ ] Integrate editable badges in ListView
- [ ] Integrate editable badges in BoardView
- [ ] Handle event propagation (stopPropagation on click)
- [ ] Add loading/error states
- [ ] Add keyboard navigation support
- [ ] Update tests for new functionality
