---
status: in-progress
created: '2026-01-06'
priority: medium
tags:
  - ui-vite
  - refactoring
  - architecture
  - tech-debt
  - api
depends_on:
  - 193-frontend-ui-parity
  - 198-ui-vite-remaining-issues
created_at: '2026-01-06T15:10:01.548099Z'
updated_at: '2026-01-06T15:25:16.946Z'
transitions:
  - status: in-progress
    at: '2026-01-06T15:25:16.946Z'
---

# UI-Vite Backend Adapter Migration

> **Status**: ⏳ In progress · **Priority**: Medium · **Created**: 2026-01-06 · **Tags**: ui-vite, refactoring, architecture, tech-debt, api

## Overview

**Problem**: @leanspec/ui-vite has **duplicate API implementations** - `api.ts` (actively used) and `backend-adapter.ts` (created but unused). This creates maintenance burden, code duplication, and missed opportunity for desktop/Tauri support.

**Current State**:
- All components import from `api.ts` directly (18 files)
- `backend-adapter.ts` exists with `HttpBackendAdapter` + `TauriBackendAdapter` abstraction
- Both files have ~200 lines of duplicate HTTP methods
- Bug fixes must be applied twice (e.g., recent PATCH `/api/specs/:spec/metadata` endpoint fix)

**Goal**: Consolidate on `backend-adapter.ts` as the single API abstraction layer, delete duplicate code from `api.ts`, and enable future Tauri desktop support.

**Why Now**: Just fixed a bug (405 Method Not Allowed) that required updating both files. This tech debt will cause more issues as the API evolves.

## Design

### Architecture Decision

**Keep**: `backend-adapter.ts` (abstracts HTTP vs Tauri)  
**Delete**: Duplicate methods in `api.ts` (keep only adapters/utilities)

**Rationale**:
1. `backend-adapter.ts` already has Tauri support infrastructure (needed for desktop app)
2. Interface-based design enables testing and mocking
3. Cleaner separation of concerns (adapter pattern)
4. Future-proof for multi-platform distribution

### Current File Structure

**api.ts** (~380 lines):
```typescript
// ✅ Keep these utilities
- adaptSpec(), adaptSpecDetail(), adaptStats()
- adaptProject(), normalizeProjectsResponse()
- extractSpecNumber(), estimateTokenCount()
- Type exports

// ❌ Delete these (duplicate of backend-adapter)
- api.getSpecs()
- api.getSpec()  
- api.updateSpec()
- api.getProjects()
- ... 15+ more methods (~200 lines of duplication)
```

**backend-adapter.ts** (~241 lines):
```typescript
// ✅ Keep entire file
- BackendAdapter interface
- HttpBackendAdapter class
- TauriBackendAdapter class
- getBackend() factory
```

### Migration Strategy

**Phase 1: Extend Backend Adapter**

Add missing methods to `backend-adapter.ts` that exist in `api.ts`:
- `createProject()`
- `updateProject()`
- `deleteProject()`
- `validateProject()`
- `getContextFiles()`
- `getContextFile()`
- `listDirectory()`
- `searchSpecs()`

**Phase 2: Update api.ts**

Remove duplicate implementations and re-export from backend adapter:

```typescript
// api.ts (after refactor)
import { getBackend } from './backend-adapter';
export { getBackend } from './backend-adapter';

// Keep utilities
export { 
  adaptSpec, 
  adaptSpecDetail, 
  adaptStats,
  adaptProject,
  normalizeProjectsResponse,
  extractSpecNumber,
  estimateTokenCount,
  // ... other utilities
};

// Delegate to backend adapter (zero breaking changes)
export const api = getBackend();
```

**Phase 3: Verification**

Test all 18 importing files still work with **zero breaking changes**.

## Plan

- [x] Identify duplication - Mapped all duplicate methods
- [ ] Port missing methods to `BackendAdapter` interface
- [ ] Implement missing methods in `HttpBackendAdapter`
- [ ] Add stub implementations in `TauriBackendAdapter` (for future)
- [ ] Update `api.ts` to remove duplicates and re-export backend adapter
- [ ] Run type checks (`pnpm -C packages/ui-vite typecheck`)
- [ ] Test all pages manually (dashboard, specs, stats, dependencies, projects, settings)
- [ ] Update unit tests if needed (`api.test.ts`)
- [ ] Document the pattern with JSDoc comments
- [ ] Verify production build works (`pnpm -C packages/ui-vite build`)

## Test

**Type Safety**:
- [ ] `pnpm -C packages/ui-vite typecheck` passes with no errors
- [ ] No missing exports or broken imports in any component

**Runtime Verification** (test with `pnpm -C packages/ui-vite dev`):
- [ ] Dashboard page loads and displays specs
- [ ] Spec detail page fetches and renders content
- [ ] Status/priority updates work (PATCH `/api/specs/:spec/metadata`)
- [ ] Projects page lists all projects
- [ ] Stats page displays metrics and charts
- [ ] Search functionality works
- [ ] Dependencies graph renders correctly
- [ ] Context files page works
- [ ] Settings page loads

**Unit Tests**:
- [ ] `pnpm -C packages/ui-vite test` passes all tests
- [ ] Mock/stub patterns in `api.test.ts` still work
- [ ] No test failures related to API imports

**Build Verification**:
- [ ] `pnpm -C packages/ui-vite build` succeeds
- [ ] Production bundle size doesn't increase significantly

## Notes

### Files That Import api.ts (18 total)

**Pages** (6 files):
- `src/pages/StatsPage.tsx`
- `src/pages/SpecsPage.tsx`
- `src/pages/ProjectsPage.tsx`
- `src/pages/DependenciesPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/DashboardPage.tsx`

**Components** (6 files):
- `src/components/SpecsNavSidebar.tsx`
- `src/components/QuickSearch.tsx`
- `src/components/metadata-editors/StatusEditor.tsx`
- `src/components/metadata-editors/TagsEditor.tsx`
- `src/components/metadata-editors/PriorityEditor.tsx`
- `src/components/projects/DirectoryPicker.tsx`

**Tests** (1 file):
- `src/lib/api.test.ts`

**Type-only imports** (5 files):
- `src/components/specs/ListView.tsx`
- `src/components/specs/BoardView.tsx`
- `src/components/dashboard/SpecListItem.tsx`
- `src/components/spec-detail/EditableMetadata.tsx`
- `src/components/dashboard/DashboardClient.tsx`

All should continue working with re-export pattern (zero breaking changes).

### Backend Adapter Methods

**Already implemented in `backend-adapter.ts`**:
- ✅ `getProjects()`
- ✅ `switchProject()`
- ✅ `getSpecs()`
- ✅ `getSpec()`
- ✅ `updateSpec()`
- ✅ `getStats()`
- ✅ `getProjectStats()`
- ✅ `getDependencies()`

**Need to add to backend-adapter** (8 methods):
- ❌ `createProject(path, options)`
- ❌ `updateProject(projectId, updates)`
- ❌ `deleteProject(projectId)`
- ❌ `validateProject(projectId)`
- ❌ `getContextFiles()`
- ❌ `getContextFile(path)`
- ❌ `listDirectory(path)`
- ❌ `searchSpecs(query, filters)`

### Why backend-adapter.ts Was Created

From git history (commit ec949bd): 
> "Backend adapter pattern for web (HTTP) vs desktop (Tauri IPC) - This allows the same UI code to work in both browser and Tauri contexts"

The abstraction was designed for **dual-environment support**:
- **Web**: Uses `HttpBackendAdapter` with `fetch()` calls to Rust HTTP server
- **Desktop**: Uses `TauriBackendAdapter` with Tauri IPC commands (future)

However, the migration was **never completed** - components continued importing from `api.ts` directly.

### Related Specs

**Depends on**:
- 193-frontend-ui-parity (need stable API before refactoring)
- 198-ui-vite-remaining-issues (fix existing bugs first)

**Enables**:
- 202-ui-vite-type-system-consolidation (eliminate adapter overhead)
- Future Tauri desktop integration
- Easier testing and mocking
- Single source of truth for API methods

**Part of**: UI-Vite tech debt cleanup and architectural improvements
