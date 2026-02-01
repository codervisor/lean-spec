---
status: planned
created: 2026-01-16
priority: low
tags:
- ui
- ux
- feature
- archiving
depends_on:
- 216-restore-unarchive-command
created_at: 2026-01-16T07:24:58.756100Z
updated_at: 2026-02-01T15:39:34.312057Z
---
# UI Archived Spec Visibility

## Overview

Currently, @leanspec/ui does not display archived specs in the navigation sidebar, and there's no way to view archived specs in the UI. This creates visibility gaps:

- Users cannot review archived specs without using CLI
- Historical context is lost in the UI
- No way to navigate to or discover archived work

**Solution:** Enable viewing archived specs in the detail page while keeping them hidden from the navigation sidebar to maintain focus on active work.

## Design

### Architectural Decisions

1. **Sidebar Behavior:** Keep archived specs hidden from nav sidebar
   - Maintains clean, focused navigation
   - Reduces cognitive load for active work
   - Aligns with "archive" semantic meaning

2. **Detail Page Access:** Allow viewing archived spec content
   - Users can access via direct URL or search results
   - Full spec content and metadata displayed with archived badge
   - Prevents 404 errors when navigating to archived specs

3. **Search Integration:** Include archived specs in search
   - Add filter option to include/exclude archived specs
   - Default: exclude archived from search results
   - Visual indicator for archived status in results

### UI Components

**Archived Spec Badge:**
- Display prominently in spec detail header
- Visual style: muted/secondary color scheme
- Text: "Archived" or "Archived on [date]"

**Filter Controls:**
- Search page: "Include archived" checkbox
- Board view: Optional "Show archived" toggle
- Persist filter preference in local storage

### Backend Requirements

- Ensure HTTP API returns archived specs for detail view
- Add `includeArchived` parameter to search/list endpoints
- Validate archived specs can be fetched individually

## Plan

- [ ] Backend API audit for archived spec support
  - [ ] Verify detail endpoint returns archived specs
  - [ ] Add `includeArchived` param to search endpoint
  - [ ] Test API responses for archived specs

- [ ] UI Components implementation
  - [ ] Create `ArchivedBadge` component
  - [ ] Add filter controls to search interface
  - [ ] Update spec detail page to handle archived status

- [ ] Navigation logic updates
  - [ ] Ensure sidebar excludes archived specs
  - [ ] Allow direct URL access to archived specs
  - [ ] Update routing to support archived detail views

- [ ] Search integration
  - [ ] Add archived filter to search UI
  - [ ] Store filter preference in localStorage
  - [ ] Display archived indicator in search results

- [ ] User feedback & polish
  - [ ] Add tooltip explaining archived status
  - [ ] Consider "unarchive" action in detail page (if 216 is implemented)
  - [ ] Update empty states and error messages

## Test

- [ ] Archived spec can be viewed via direct URL
- [ ] Archived specs hidden from sidebar navigation
- [ ] Search filter correctly includes/excludes archived specs
- [ ] Archived badge displays correctly in detail view
- [ ] Filter preference persists across sessions
- [ ] No 404 errors when accessing archived specs
- [ ] Visual indicators clear and consistent

## Notes

### Dependencies

- Related to spec [216-restore-unarchive-command](specs/216-restore-unarchive-command/spec.md)
- If unarchive command exists, consider adding UI action

### Design Considerations

- **Why not show in sidebar?** Archived specs are historical context, not active work. Showing them would clutter navigation and dilute focus.
- **Alternative approach:** Could add separate "Archived" section in sidebar (collapsed by default), but this adds UI complexity.
- **Future enhancement:** Full archive browsing page with timeline/history view.

### Implementation Notes

- Check if current backend already supports archived spec fetching
- Verify Rust HTTP server and Next.js backend both handle this consistently
- Consider performance impact of including archived in search