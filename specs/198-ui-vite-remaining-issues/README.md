---
status: in-progress
created: 2025-12-26
priority: high
tags:
- ui
- vite
- bug
- ux
depends_on:
- 193-frontend-ui-parity
created_at: 2025-12-26T06:32:10.135558Z
updated_at: 2025-12-26T06:33:23.302928Z
transitions:
- status: in-progress
  at: 2025-12-26T06:33:23.302928Z
---

## Overview

After implementing initial UI parity between Next.js and Vite apps in spec 193, several critical issues remain that prevent full feature parity and usability. These issues affect navigation, routing, project management, and layout consistency.

## Issues

### 1. Home Always Highlighted in Main Sidebar

**Problem:** The home/dashboard menu item remains highlighted regardless of the current route.

**Impact:** Poor UX, users cannot tell which page they're on.

**Root Cause:** Likely `isActive` logic in `MainSidebar.tsx` not accounting for project-prefixed routes or checking only for exact `/` match.

### 2. Spec Detail & Dependencies Page Errors

**Problem:** Both pages throw errors after routing changes to `/projects/:projectId` structure.

**Likely Issues:**
- API calls not handling project context correctly
- Route params not being extracted properly
- Missing `projectId` in URL patterns or components

**Files Affected:**
- `packages/ui-vite/src/pages/SpecDetailPage.tsx`
- `packages/ui-vite/src/pages/DependenciesPage.tsx`

### 3. Missing /projects Route (Manage Projects Page)

**Problem:** No route defined for `/projects` to list/manage projects.

**Expected Behavior:** Should show a project management page similar to Next.js UI's project switcher/management interface.

**Current State:** Route doesn't exist, likely 404s.

### 4. Missing Paddings for Specs Pages

**Problem:** Specs list and board views lack proper padding/spacing.

**Expected:** Consistent padding matching the Next.js UI (likely p-4 sm:p-6 or similar).

**Files Affected:**
- `packages/ui-vite/src/pages/SpecsPage.tsx`
- Layout container for specs content

### 5. Project Switcher Not Functional

**Problem:** Cannot switch between projects using the project switcher component.

**Likely Issues:**
- Project context not updating route
- Navigation not triggering on project selection
- State/route sync issue between `ProjectContext` and router

**Files Affected:**
- Project switcher component (need to locate)
- `packages/ui-vite/src/contexts/ProjectContext.tsx`

### 6. "Path Does Not Exist" Error in Create Project Dialog

**Problem:** Error appears when creating a new project.

**Likely Causes:**
- Path validation logic too strict
- API endpoint mismatch
- Frontend not handling relative vs absolute paths correctly

**Files Affected:**
- Create project dialog/form component
- API client validation

### 7. Missing Sorting Options Alignment

**Problem:** Specs list sorting doesn't match `@leanspec/ui` functionality.

**Expected:** Same sort options as Next.js:
- ID (desc/asc)
- Updated (desc)
- Title (asc)

**Current State:** Either missing or not visible/functional.

**Files Affected:**
- `packages/ui-vite/src/pages/SpecsPage.tsx`
- `packages/ui-vite/src/components/specs/SpecsFilters.tsx`

## Plan

- [x] Fix sidebar active state detection for project-prefixed routes (MainSidebar strips project prefixes so active highlighting follows nested routes)
- [x] Debug and fix spec detail page routing/API errors (SpecDetailPage waits for project context and uses project-aware base paths)
- [x] Debug and fix dependencies page routing/API errors (DependenciesPage uses project params, basePath navigation, and guards on project readiness)
- [x] Add `/projects` route and implement project management page (router now exposes `/projects` with ProjectsPage for management)
- [x] Add proper padding to specs list and board views (SpecsPage uses padded container with max width)
- [x] Fix project switcher navigation and context sync (ProjectSwitcher calls switchProject then redirects to preserved subpath; ProjectContext refreshes projects and persists selection)
- [x] Debug and fix "Path does not exist" error in create project (CreateProjectDialog supports picker/manual modes with DirectoryPicker and clearer errors)
- [x] Implement full sorting options matching Next.js UI (SpecsPage + SpecsFilters expose id asc/desc, updated desc, title asc)

## Implementation Notes

- Sidebar links normalize paths and remove `/projects/:id` prefixes before comparing, preventing the home item from staying highlighted on nested routes.
- Spec detail and dependencies pages gate data loading on project context readiness and use project-aware base paths for navigation.
- Router now includes `/projects` mapped to ProjectsPage, providing management UI consistent with the project switcher entry.
- SpecsPage container adds `p-4 sm:p-6` spacing with a centered max width for both list and board layouts.
- Project switcher preserves the current subpath when changing projects and falls back to `/specs` for detail routes to avoid broken paths.
- Create project flow accepts picker or manual input; DirectoryPicker queries the filesystem and the dialog surfaces validation errors without blocking.
- Specs sorting options now mirror the Next.js UI and propagate through SpecsFilters.

## Test

- [ ] Sidebar correctly highlights active page on all routes
- [ ] Spec detail page loads without errors for any spec
- [ ] Dependencies page renders graph without errors
- [ ] `/projects` route shows project management interface
- [ ] Specs pages have consistent padding in list and board views
- [ ] Can switch between projects via project switcher
- [ ] Can create new project without path validation errors
- [ ] All sorting options work and match Next.js behavior

Test run: `pnpm -C packages/ui-vite test` (fails in `src/lib/api.test.ts` because the mocked fetch response lacks `.text()`).

## Notes

These issues are blocking full UI-Vite parity and need to be resolved before considering spec 193 complete. Most are straightforward fixes once the root causes are identified.

Priority order:
1. Critical errors (spec detail, dependencies, create project)
2. Navigation/routing (sidebar, project switcher)
3. Polish (padding, sorting)
