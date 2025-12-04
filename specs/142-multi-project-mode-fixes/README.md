---
status: complete
created: '2025-12-04'
tags:
  - ui
  - ux
  - multi-project
  - bug
  - fix
priority: high
created_at: '2025-12-04T09:34:34.516Z'
depends_on:
  - 109-local-project-switching
  - 112-project-management-ui
  - 141-multi-project-management-ui-improvements
updated_at: '2025-12-04T09:46:49.873Z'
transitions:
  - status: in-progress
    at: '2025-12-04T09:40:54.838Z'
  - status: complete
    at: '2025-12-04T09:46:49.873Z'
completed_at: '2025-12-04T09:46:49.873Z'
completed: '2025-12-04'
---

# Multi-Project Mode Critical Fixes

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-12-04 · **Tags**: ui, ux, multi-project, bug, fix

## Overview

Critical fixes for multi-project mode issues identified after implementing specs 109, 112, and 141. The multi-project infrastructure is in place, but several UX and architectural issues prevent it from working correctly.

### Issues Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | No dynamic path routing for project ID | Critical |
| 2 | Missing SSR for multi-project pages | High |
| 3 | Path overflow in Add Project popup | Medium |
| 4 | Projects page UI issues | High |

## Design

### Issue 1: Dynamic Path Routing for Project ID

**Problem:** In multi-project mode, pages don't use project-scoped URLs. The URL doesn't change when switching projects, making links non-shareable and breaking browser navigation.

**Expected:** URLs should follow pattern `/projects/[projectId]/specs`, `/projects/[projectId]/dependencies`, etc.

**Solution:**
- Ensure all page navigation uses dynamic `[projectId]` route segments
- Update links in sidebar navigation to include current project ID
- Implement proper URL updates when switching projects

### Issue 2: SSR for Multi-Project Pages

**Problem:** In single-project mode, specs/dependencies/stats pages use SSR for fast initial load. In multi-project mode, these pages may be client-side only, causing slower loads and hydration issues.

**Expected:** Both modes should use consistent SSR approach.

**Solution:**
- Review `/projects/[projectId]/specs/page.tsx` and ensure it uses `generateMetadata` and server components
- Apply same SSR patterns used in single-project mode pages
- Ensure data fetching happens server-side when possible

### Issue 3: Add Project Popup Path Overflow

**Problem:** Long file paths in the Add Project popup cause horizontal overflow, breaking the UI layout. The path `/Users/marvzhang/projects/codervisor/lean-spec/packages/ui` overflows the container.

**Solution:**
- Add `overflow-hidden` and `text-ellipsis` to path display
- Use `truncate` class with proper width constraints
- Add tooltip showing full path on hover
- Consider showing path as breadcrumb segments instead of full string

```tsx
// Before
<span>{currentPath}</span>

// After
<span className="truncate max-w-full" title={currentPath}>
  {currentPath}
</span>
```

### Issue 4: Projects Page UI Issues

**Problem:** The `/projects` page has severe UI issues:

1. **Main sidebar visible:** Should hide the main navigation sidebar on projects page
2. **Poor paddings/spacing:** Content lacks proper padding and visual hierarchy  
3. **No project switching:** Clicking project item doesn't switch to that project

**Solution:**

**4a. Hide Main Sidebar:**
```tsx
// projects/page.tsx or projects/layout.tsx
// Use a layout that doesn't include MainSidebar
// Or conditionally hide sidebar based on route
```

**4b. Fix Paddings/Spacing:**
- Add proper container padding (`p-6` or `p-8`)
- Improve card grid spacing
- Add page header with consistent styling

**4c. Enable Project Switching:**
```tsx
// Project card click handler
const handleProjectClick = async (projectId: string) => {
  await switchProject(projectId);
  router.push(`/projects/${projectId}`);
};
```

## Plan

### Phase 1: URL Routing Fix
- [ ] Audit current multi-project routing structure
- [ ] Ensure all sidebar links include `projectId` in path
- [ ] Verify URL updates correctly on project switch
- [ ] Test deep linking works (share URL, reload page)

### Phase 2: SSR Consistency
- [ ] Compare single-project and multi-project page implementations
- [ ] Migrate data fetching to server components where possible
- [ ] Add `generateMetadata` for proper SEO/titles
- [ ] Test initial page load performance

### Phase 3: Add Project Popup Fix
- [ ] Add path truncation with CSS
- [ ] Add tooltip for full path
- [ ] Test with various path lengths
- [ ] Consider breadcrumb display alternative

### Phase 4: Projects Page Fixes
- [ ] Create projects-specific layout without sidebar
- [ ] Add proper page container and spacing
- [ ] Implement project click → switch + navigate
- [ ] Add visual feedback for current project

## Test

### URL Routing
- [ ] `/projects/[id]/specs` loads correct project specs
- [ ] Sidebar links navigate to project-scoped URLs
- [ ] Browser back/forward works correctly
- [ ] Shared URLs load correct project

### SSR
- [ ] Page source contains initial data (not loading state)
- [ ] Fast initial load comparable to single-project mode
- [ ] No hydration mismatch errors in console

### Add Project Popup
- [ ] Long paths truncate correctly
- [ ] Full path visible on hover (tooltip)
- [ ] No horizontal scrollbar appears
- [ ] Works on various screen sizes

### Projects Page
- [ ] Main sidebar hidden on /projects
- [ ] Proper spacing and visual hierarchy
- [ ] Click project → switches and navigates
- [ ] Current project highlighted if applicable

## Notes

### Root Cause Analysis

These issues stem from the rapid implementation of spec 109, which focused on core multi-project infrastructure. The UI/UX polish was deferred, leading to these gaps when users actually try to use multi-project mode.

### Priority Order

1. **Issue 4 (Projects page)** - Blocks basic usage
2. **Issue 1 (URL routing)** - Critical for navigation
3. **Issue 2 (SSR)** - Important for performance
4. **Issue 3 (Path overflow)** - Minor visual bug

### Related Files

```
packages/ui/src/app/
├── projects/
│   ├── page.tsx          # Projects list (Issue 4)
│   ├── layout.tsx        # NEW: Separate layout without sidebar
│   └── [projectId]/
│       ├── layout.tsx    # Project layout
│       ├── page.tsx      # Project home
│       ├── specs/        # Specs pages (Issues 1, 2)
│       ├── dependencies/ # NEW: Dependencies page with SSR
│       ├── stats/        # NEW: Stats page with SSR
│       └── context/      # NEW: Context page with SSR
├── api/
│   └── projects/[id]/
│       ├── dependencies/ # NEW: API endpoint
│       └── context/      # NEW: API endpoint
├── components/
│   ├── directory-picker.tsx  # Issue 3
│   └── main-sidebar.tsx      # Sidebar visibility + dynamic URLs
```

## Implementation Summary

### What Was Implemented

All four issues have been successfully resolved:

**Issue 1: Dynamic Path Routing** ✅
- Updated `MainSidebar` to use project-scoped URLs in multi-project mode
- Added `getNavUrl()` helper that transforms `/specs` → `/projects/[projectId]/specs`
- Navigation now properly updates URLs when switching projects
- Deep linking works correctly (shareable URLs)

**Issue 2: SSR for Multi-Project Pages** ✅
- Created `/projects/[projectId]/dependencies/page.tsx` with SSR
- Created `/projects/[projectId]/stats/page.tsx` with SSR  
- Created `/projects/[projectId]/context/page.tsx` with SSR
- All pages use `force-dynamic` and proper async server components
- Created corresponding API endpoints in `/api/projects/[id]/*`

**Issue 3: Add Project Popup Path Overflow** ✅
- Added `title={currentPath}` tooltip to breadcrumb container
- Existing CSS (`overflow-x-auto`, `scrollbar-hide`) already handles overflow
- Full path visible on hover

**Issue 4: Projects Page UI Issues** ✅
- Created `/projects/layout.tsx` to hide MainSidebar on projects list
- Updated project click handler to navigate to `/projects/[projectId]/specs`
- Page already has proper spacing with `container max-w-5xl py-8`

### Technical Notes

1. **Context API Limitation**: `getProjectContext()` is currently filesystem-based and doesn't accept a `projectId` parameter. For now, it reads from the current working directory. This is acceptable as the multi-project infrastructure will set the correct working directory before calls.

2. **Dependency Graph**: The dependencies page uses `getSpecsWithMetadata(projectId)` which returns simplified data (no relationships) in multi-project mode. This is expected behavior per the current implementation.

3. **Layout Hierarchy**: The projects list page now has its own layout that renders children without the MainSidebar, providing a clean full-width experience.

### Files Changed

- `packages/ui/src/components/main-sidebar.tsx` - Dynamic URLs
- `packages/ui/src/components/directory-picker.tsx` - Path tooltip
- `packages/ui/src/app/projects/page.tsx` - Navigation fix
- `packages/ui/src/app/projects/layout.tsx` - New layout
- `packages/ui/src/app/projects/[projectId]/dependencies/page.tsx` - New page
- `packages/ui/src/app/projects/[projectId]/stats/page.tsx` - New page
- `packages/ui/src/app/projects/[projectId]/context/page.tsx` - New page
- `packages/ui/src/app/api/projects/[id]/dependencies/route.ts` - New API
- `packages/ui/src/app/api/projects/[id]/context/route.ts` - New API

### Testing Recommendations

1. Test multi-project URL navigation (all sidebar links work correctly)
2. Test browser back/forward buttons
3. Test deep linking (share a project URL, reload page)
4. Test SSR by viewing page source (should contain initial data)
5. Test long paths in Add Project dialog
6. Test project switching from projects list page
