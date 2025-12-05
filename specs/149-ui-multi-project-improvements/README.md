---
status: in-progress
created: '2025-12-05'
tags:
  - ui
  - multi-project
  - bug-fix
  - ux
  - metadata-editing
priority: high
created_at: '2025-12-05T05:13:59.838Z'
depends_on:
  - 142-multi-project-mode-fixes
  - 134-ui-metadata-editing
updated_at: '2025-12-05T05:15:20.655Z'
transitions:
  - status: in-progress
    at: '2025-12-05T05:15:20.655Z'
---

# UI Multi-Project Mode Improvements and Bug Fixes

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-05 · **Tags**: ui, multi-project, bug-fix, ux, metadata-editing

## Overview

Bug fixes and UX improvements for the UI package related to multi-project specs mode and metadata editing. Addresses navigation, URL handling, visual polish, and manage projects page overhaul.

## Issues

### 1. Navigation: Return to Specs List on Project Switch
**Location**: Spec detail page  
**Problem**: When switching projects while viewing a spec detail, user stays on detail page (which may not exist in new project)  
**Solution**: Detect project switch and redirect to `/[project]/specs` list

### 2. URL Auto-Redirect for Single-Project Mode
**Problem**: If user navigates to single-project URL format (`/specs/...`) while in multi-project mode, no redirect happens  
**Solution**: Auto-detect mode mismatch and redirect to appropriate URL format (`/[project]/specs/...`)

### 3. Duplicate Icons in Status/Priority Editors
**Location**: Spec detail page header area - StatusEditor and PriorityEditor components  
**Problem**: Status and priority selectors show duplicate icons (one from trigger, one from SelectValue content)  
**Root Cause**: SelectItem children include icon + label, but SelectValue displays the full ItemText content; combined with explicit icon in trigger = 2 icons  
**Solution**: ✅ Fixed - Use explicit label text in SelectValue children instead of letting it inherit from ItemText

### 4. Board Drag & Drop Error
**Location**: Spec board (Kanban view)  
**Problem**: Drag and drop fails with error "Spec not found"  
**Root Cause**: Multi-project source returns specs with different identifiers than expected  
**Solution**: Fix spec lookup to handle multi-project spec identifiers correctly

### 5. Tag Autocomplete with Deduplication
**Location**: Metadata editing - tags input  
**Problem**: No autocomplete when adding tags; duplicates can be added  
**Solution**: 
- Add autocomplete from existing project tags
- Prevent duplicate tag additions
- Show existing tags as suggestions

### 6. Dependencies Page Empty DAG
**Location**: Dependencies visualization page  
**Problem**: DAG diagram shows empty when switching to dependencies view  
**Root Cause**: Multi-project source not properly returning dependency data  
**Solution**: Fix dependency graph data loading for multi-project mode

### 7. Project Switcher Flash
**Location**: Project switcher dropdown  
**Problem**: Brief flash/flicker when switching projects  
**Root Cause**: Loading state not handled smoothly  
**Solution**: Add skeleton/loading state or debounce rendering

### 8. Manage Projects Page UX Overhaul
**Location**: `/projects` page  
**Problems**:
- Manual path validation is clunky
- No padding/spacing (poor visual layout)
- No project detail popup on click
- Missing project info (spec count, description, etc.)
- Main sidebar still visible (should be hidden for settings pages)

**Solutions**:
- Auto-validate paths on input/blur
- Add proper padding and card layouts
- Add project detail modal with:
  - Project name and path
  - Description (from leanspec.config.yaml or package.json)
  - Total specs count by status
  - Last updated timestamp
- Hide main sidebar on manage projects page

## Plan

### Phase 1: Navigation & URL Fixes (Issues 1, 2)
- [x] Add project change detection in spec detail page
- [x] Implement redirect to specs list on project switch
- [x] Add URL format detection and auto-redirect logic
- [x] Handle edge cases (invalid URLs, missing projects)

### Phase 2: Visual Polish (Issues 3, 7)
- [x] Fix duplicate icons in StatusEditor and PriorityEditor
- [x] Add loading skeleton to project switcher
- [x] Smooth out project switching transitions

### Phase 3: Board & Metadata Fixes (Issues 4, 5)
- [x] Debug and fix spec lookup in drag-drop handler
- [x] Implement tag autocomplete component
- [x] Add deduplication logic for tags
- [x] Update `TagsInput` component with suggestions

### Phase 4: Dependencies Fix (Issue 6)
- [x] Debug dependency data flow in multi-project source
- [x] Ensure DAG receives proper data structure
- [x] Test with projects containing dependencies

### Phase 5: Manage Projects Overhaul (Issue 8)
- [x] Add auto-validation for project paths
- [x] Redesign layout with proper spacing and cards
- [x] Implement project detail modal component
- [x] Fetch and display project metadata (spec count, description)
- [x] Add layout variant that hides sidebar

## Test

- [x] Switch projects on spec detail page → redirects to specs list
- [x] Navigate to single-project URL in multi-project mode → auto-redirects
- [x] Spec detail header shows single icon per status/priority (no duplicates)
- [x] Drag and drop specs on board works without errors
- [x] Tag input shows autocomplete suggestions
- [x] Adding duplicate tag is prevented
- [x] Dependencies page shows correct DAG diagram
- [x] Project switcher has no flash during transitions
- [x] Manage projects page has proper layout and padding
- [x] Clicking project shows detail modal with stats
- [x] Sidebar is hidden on manage projects page

## Notes

- Multi-project mode was recently added; these are polish/bug-fix issues discovered during usage
- Dependencies on specs 142 and 134 for context on prior multi-project and metadata work
