---
status: complete
created: '2025-12-04'
tags:
  - ui
  - ux
  - multi-project
  - enhancement
priority: high
created_at: '2025-12-04T09:05:27.204Z'
depends_on:
  - 109-local-project-switching
  - 112-project-management-ui
updated_at: '2025-12-04T09:15:41.211Z'
transitions:
  - status: in-progress
    at: '2025-12-04T09:12:33.518Z'
  - status: complete
    at: '2025-12-04T09:15:41.211Z'
completed_at: '2025-12-04T09:15:41.211Z'
completed: '2025-12-04'
---

# Multi-Project Management UI Improvements

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-12-04 · **Tags**: ui, ux, multi-project, enhancement

## Overview

The current multi-project management implementation is incomplete. While specs 109 and 112 laid the foundation, there are significant UX gaps that make project management difficult:

1. **No sidebar navigation to /projects page** - Users must manually type the URL
2. **No "Manage Projects" link in project switcher** - Only "Create Project" option exists
3. **Project switcher hidden in single-project mode** - No way to switch to multi-project mode from UI
4. **Missing project actions** - Edit project name, change color, re-validate path
5. **No keyboard shortcuts** - Cmd+K for quick switcher not implemented (deferred from 109)

The `/projects` page exists with basic functionality (list, search, favorite, remove) but is effectively inaccessible without knowing the URL.

## Design

### Navigation Hierarchy Analysis

The sidebar shows project-scoped views (Home, Specs, Dependencies, Stats, Context). Adding a "Projects" link at this level is **conceptually wrong** because `/projects` is a meta-level view for managing projects, not a view within a project.

**Solution:** Integrate project management into the ProjectSwitcher dropdown, which is already the entry point for project-related actions.

### 1. "Manage Projects" in ProjectSwitcher Dropdown ✅

Add to the project switcher dropdown (below "Create Project"):

```tsx
<CommandItem onSelect={() => router.push('/projects')}>
  <Settings className="mr-2 h-4 w-4" />
  Manage Projects
</CommandItem>
```

This keeps project management grouped with project selection, consistent with VS Code, Notion, Linear, etc.

### 2. Enhanced Project Actions on /projects Page

Add missing actions to project cards:
- **Edit name** - Inline editing or dialog
- **Change color** - Color picker popover
- **Re-validate** - Check if project path still exists

### 3. Keyboard Shortcuts (Deferred from Spec 109)

- `Cmd/Ctrl + K` → Quick project switcher (fuzzy search modal)

## Plan

### Phase 1: Navigation & Discoverability ✅
- [x] Add "Manage Projects" option to project switcher dropdown

### Phase 2: Project Actions ✅
- [x] Add inline edit for project name
- [x] Add color picker for project color
- [x] Add "Re-validate" action to check project path
- [x] Show validation status (valid/invalid/missing)

### Phase 3: Quick Switcher (Lower Priority)
- [ ] Implement Cmd+K quick project switcher modal
- [ ] Add fuzzy search across all projects
- [ ] Show recent projects first

## Test

- [x] Can navigate to /projects from project switcher dropdown
- [x] Can edit project name from /projects page
- [x] Can change project color from /projects page
- [ ] Cmd+K opens quick project switcher (if implemented)
- [x] Invalid projects show warning indicator

## Notes

### Design Decision
Initially considered adding a "Projects" sidebar link, but this was rejected because:
- Sidebar links (Home, Specs, Dependencies, etc.) are **project-scoped views**
- `/projects` is a **meta-level view** for managing projects themselves
- Mixing these levels creates conceptual confusion

The ProjectSwitcher is already the project management entry point, so "Manage Projects" belongs there.
