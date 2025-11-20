---
status: complete
created: '2025-11-20'
tags: []
priority: medium
created_at: '2025-11-20T08:12:59.970Z'
related:
  - 109-local-project-switching
updated_at: '2025-11-20T08:35:51.780Z'
---

# project-management-ui

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-20

**Project**: lean-spec  
**Team**: Core Development

## Overview

The current project selection and management UI has significant UX flaws. The project switcher is implemented as an expandable list within the sidebar, which is clunky and visually unappealing. There is no dedicated page for managing projects (viewing all, editing, deleting). Furthermore, the "Add Project" button in the switcher is non-functional because the handler is not connected.

## Design

1.  **Project Switcher Redesign**: Replace the expandable list with a `Popover` or `DropdownMenu` component. This will provide a cleaner look and better space utilization.
2.  **Project Management Page**: Create a new route `/projects` to list all projects. This page will allow users to:
    *   View a grid/list of projects.
    *   Create new projects.
    *   Edit/Delete existing projects.
    *   Mark projects as favorites.
3.  **Add Project Workflow**:
    *   Fix the "Add Project" button in the switcher to open a "Create Project" dialog or navigate to `/projects/new`.
    *   Ensure the `onAddProject` prop is properly passed from `MainSidebar`.
4.  **Directory Picker UX Improvements**:
    *   **Default CWD**: Set the initial directory to the user's current working directory (where `lean-spec ui` was launched), not the home directory
    *   **Allow Target Selection**: Users can navigate from CWD to select their desired project root
    *   **Intuitive Navigation**: 
        *   Clear breadcrumb navigation showing current path
        *   Prominent "Back" button that works like standard file browsers
        *   Visual hierarchy showing parent → current folder relationship
        *   Quick navigation to parent directories without complex path manipulation
    *   **Validation**: Remove confusing validation messages that don't apply to LeanSpec projects (e.g., package.json requirements)

## Plan

- [x] Create a new page `packages/ui/src/app/projects/page.tsx` for project management.
- [x] Refactor `ProjectSwitcher` to use a Popover/Dropdown.
- [x] Implement "Add Project" functionality (Dialog or Page).
- [x] Update `MainSidebar` to pass the correct handler to `ProjectSwitcher` (Handled internally in ProjectSwitcher now).
- [x] Enhance directory picker:
  - [x] Set default directory to CWD (current working directory)
  - [x] Add breadcrumb navigation for path clarity
  - [x] Improve back button UX (make it intuitive like file browsers)
  - [x] Remove confusing package.json validation message

## Test

- [x] Verify the project switcher opens as a popover/dropdown.
- [x] Verify clicking "Add Project" opens the creation UI.
- [x] Verify the `/projects` page lists all projects.
- [x] Verify creating a new project works and updates the list/switcher.
- [x] Directory picker UX improvements:
  - [x] Verify directory picker opens to current working directory by default
  - [x] Verify breadcrumb navigation displays current path correctly
  - [x] Verify back button navigates to parent directory intuitively
  - [x] Verify confusing validation messages are removed
  - [x] Verify users can navigate from CWD to target folder easily

## Notes

### Related Specs
- **109-local-project-switching**: Foundation for multi-project support and project switcher infrastructure

### Design Rationale

**Why Start at CWD Instead of Home?**
- Most users launch `lean-spec ui` from their project directory or workspace root
- Starting at CWD reduces navigation steps (often zero clicks needed)
- Aligns with developer expectations (similar to file pickers in IDEs)
- Home directory is less relevant for project selection

**Why Breadcrumb Navigation?**
- Shows full path context at a glance
- Allows quick jumps to parent directories
- Familiar pattern from file managers and web apps
- Reduces cognitive load compared to raw path strings

**Why Remove package.json Validation?**
- LeanSpec projects don't require package.json (language-agnostic)
- Confusing validation message suggests wrong requirements
- Project validity should be based on `.lean-spec/` presence
- Validation should guide users, not create false constraints

### Future Enhancements
- Add "Recent Folders" quick access in directory picker
- Support drag-and-drop folder selection
- Add project validation feedback during directory selection
- Show project health indicators (spec count, git status) in picker
