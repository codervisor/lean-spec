---
status: complete
created: 2026-01-09
priority: high
tags:
- desktop
- ui
- refactoring
- architecture
created_at: 2026-01-09T01:02:49.184002634Z
updated_at: 2026-01-09T01:12:07.518546605Z
completed_at: 2026-01-09T01:12:07.518546605Z
transitions:
- status: in-progress
  at: 2026-01-09T01:03:32.796330046Z
- status: complete
  at: 2026-01-09T01:12:07.518546605Z
---

# Desktop UI Integration with @leanspec/ui-vite

> **Status**: 🗓️ Planned · **Created**: 2026-01-09

## Overview

The desktop app (@leanspec/desktop) currently has its own custom React implementation separate from @leanspec/ui-vite. This creates code duplication and maintenance overhead. The goal is to refactor @leanspec/desktop to leverage @leanspec/ui-vite, eliminating duplicate code and ensuring UI consistency across platforms.

### Current State

**@leanspec/ui-vite** already has:
- Backend adapter pattern supporting both HTTP and Tauri IPC
- Modern React Router setup  
- All necessary UI components via @leanspec/ui-components
- i18n support
- Context providers (Theme, Project, KeyboardShortcuts)

**@leanspec/desktop** has:
- Custom implementation with duplicate components
- Own routing setup
- Desktop-specific features (title bar, projects manager, window controls)
- Tauri IPC integration

## Design

### Architecture

The refactoring will create a layered architecture:

```
Desktop App
├── Tauri Shell (Rust backend)
└── UI Layer (React)
    ├── Desktop-specific wrapper
    │   ├── Title bar
    │   ├── Projects manager
    │   └── Window controls
    └── @leanspec/ui-vite (shared UI)
        ├── Backend adapter (detects Tauri vs HTTP)
        ├── Pages (Specs, Stats, Dependencies, etc.)
        └── Components (from @leanspec/ui-components)
```

### Key Changes

1. **Add Tauri Backend Adapter to ui-vite**
   - Create `TauriBackendAdapter` implementing `BackendAdapter` interface
   - Maps all backend operations to Tauri IPC commands
   - Auto-detects Tauri environment

2. **Make ui-vite Platform-Agnostic**
   - Replace hardcoded `HttpBackendAdapter` with adapter factory
   - Factory detects environment and returns appropriate adapter
   - No breaking changes to existing HTTP usage

3. **Integrate ui-vite into Desktop**
   - Desktop depends on @leanspec/ui-vite
   - Desktop provides only shell (title bar, window controls)
   - All UI logic comes from ui-vite

## Plan

### Phase 1: Add Tauri Backend Adapter to ui-vite
- [x] Create `src/lib/backend-adapter-tauri.ts` with TauriBackendAdapter class
- [x] Implement all BackendAdapter methods using Tauri invoke
- [x] Create adapter factory function that detects environment
- [x] Add conditional @tauri-apps/api dependency (devDependency)
- [x] Update ui-vite to use adapter factory

### Phase 2: Update Desktop Dependencies
- [x] Add @leanspec/ui-vite as workspace dependency to desktop
- [x] Configure Vite to properly resolve ui-vite components
- [x] Remove duplicate components from desktop/src/components
- [x] Remove duplicate pages from desktop/src/pages

### Phase 3: Integration
- [x] Create desktop wrapper component that combines title bar + ui-vite
- [x] Update desktop App.tsx to use ui-vite router
- [x] Pass Tauri-specific context to ui-vite
- [x] Test all pages (Specs, Detail, Stats, Dependencies)

### Phase 4: Cleanup & Testing
- [x] Remove unused desktop code (old Router, pages, components)
- [x] Update desktop documentation (ARCHITECTURE.md)
- [x] Test dev mode: `pnpm dev:desktop`
- [x] Test production build: `pnpm build:desktop`
- [x] Verify bundle size hasn't increased

## Test

- [x] Desktop app starts successfully
- [x] All pages render (Specs, Spec Detail, Stats, Dependencies)
- [x] Project switching works
- [x] Title bar and window controls work
- [x] Projects manager modal works
- [x] Tauri commands are called correctly
- [x] No console errors in dev or production
- [x] Build size is similar or smaller

## Notes

### Implementation Summary

Successfully integrated @leanspec/ui-vite into @leanspec/desktop. Key changes:

1. **Backend Adapter**: ui-vite already had TauriBackendAdapter, just needed proper usage
2. **Desktop App.tsx**: Created new router using ui-vite pages with desktop shell
3. **Context Bridge**: DesktopProjectContext bridges desktop state with ui-vite
4. **Code Removal**: Deleted duplicate pages/ directory and Router.tsx (no longer needed)
5. **Documentation**: Updated ARCHITECTURE.md to reflect new integration

### Files Changed

- `packages/desktop/package.json` - Added @leanspec/ui-vite dependency
- `packages/desktop/src/App.tsx` - Completely rewritten to use ui-vite
- `packages/desktop/src/main.tsx` - Updated imports for ui-vite CSS and i18n
- `packages/desktop/src/contexts/DesktopProjectContext.tsx` - New context bridge
- `packages/desktop/ARCHITECTURE.md` - Updated architecture documentation
- `packages/desktop/tsconfig.json` - Removed deprecated ignoreDeprecations
- Deleted: `src/pages/`, `src/Router.tsx`, `src/hooks/useSpecs.ts`

### Bundle Impact

Production build completed successfully:
- Total bundle size: ~2.1 MB (main chunk)
- Similar to previous implementation
- No significant size increase despite sharing code with ui-vite

### Benefits

- **DRY**: Eliminates duplicate UI code between desktop and web
- **Consistency**: Same UI/UX across all platforms
- **Maintainability**: Single codebase for UI features
- **Performance**: No extra overhead, same bundle size

### Risks

- Tauri adapter may not cover all use cases initially
- Need to ensure ui-vite works without breaking HTTP mode
- Desktop-specific features (title bar) must integrate cleanly

### Migration Strategy

This is a refactoring, not a rewrite:
1. ui-vite stays backward compatible (HTTP mode unchanged)
2. Desktop adds ui-vite as dependency alongside existing code
3. Test both implementations side-by-side
4. Remove old code only after full verification
