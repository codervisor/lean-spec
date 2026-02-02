---
status: planned
priority: medium
created: 2026-02-02
created_at: 2026-02-02T04:02:50.048842986Z
updated_at: 2026-02-02T04:02:50.048842986Z
---

# Desktop Thin Wrapper Refactoring

## Context

The @leanspec/desktop package currently has UI components and logic that duplicate or overlap with @leanspec/ui. While the desktop app does import from @leanspec/ui, it maintains its own:

- **Layout components**: `DesktopLayout.tsx`, `DesktopMenu.tsx`
- **Project management UI**: `ProjectsManager.tsx`, `ProjectCard.tsx`, `ProjectsTable.tsx`
- **Window controls**: `WindowControls.tsx` (legitimately desktop-native)
- **Hooks**: `useProjects.ts`, `useProjectsManager.ts`
- **Contexts**: `DesktopProjectContext.tsx`
- **CSS modules**: Multiple `.module.css` files duplicating styles

This creates maintenance overhead and risks UI/UX inconsistencies between desktop and web.

## Goal

Refactor @leanspec/desktop to be a **thin wrapper** around @leanspec/ui, keeping only desktop-native functionality in the desktop package while maximizing code reuse.

### What Should Stay in Desktop (Tauri-native)

1. **Window management**: `WindowControls.tsx`, window state, minimize/maximize/close
2. **Tauri IPC layer**: `lib/ipc.ts`, Tauri command invocations
3. **System tray integration**: Tray menu, notifications
4. **Native file dialogs**: Project folder picker via Tauri dialog API
5. **App lifecycle**: Tauri app setup, auto-updates, shortcuts
6. **Desktop-specific context bridging**: Minimal glue to connect Tauri state with UI contexts
7. **Menu Bar**: Native menu bar integration

### What Should Move to @leanspec/ui

1. **Project management UI**: `ProjectsManager`, `ProjectCard`, `ProjectsTable` → use shared `ProjectsPage` from ui
2. **Layout logic**: Most of `DesktopLayout` → use `Layout` from ui directly
3. **Project context logic**: Merge `DesktopProjectContext` with ui's `ProjectContext`
4. **Shared hooks**: Generalize project management hooks for both desktop and web

## Approach

### Phase 1: Audit Component Overlap

- [ ] Map all desktop components to their ui equivalents
- [ ] Identify which desktop components are truly native vs. duplicated UI
- [ ] Document the data flow: Tauri commands → desktop hooks → ui contexts

### Phase 2: Consolidate Project Management

- [ ] Refactor `ProjectsPage` in ui to support both HTTP and Tauri backends via backend adapter
- [ ] Remove `ProjectsManager.tsx`, `ProjectCard.tsx`, `ProjectsTable.tsx` from desktop
- [ ] Use ui's `ProjectsPage` directly in desktop

### Phase 3: Simplify Desktop Layout

- [ ] Reduce `DesktopLayout.tsx` to only window chrome handling
- [ ] Move all non-native layout logic to ui's `Layout` component
- [ ] Keep `WindowControls.tsx` as the only desktop-specific navigation slot

### Phase 4: Unify Context Providers

- [ ] Extend ui's `ProjectContext` to accept optional Tauri backend adapter
- [ ] Simplify or remove `DesktopProjectContext` - only bridge Tauri state if needed
- [ ] Ensure `MachineProvider` in ui handles desktop detection automatically

### Phase 5: Clean Up

- [ ] Remove unused CSS modules from desktop
- [ ] Remove unused desktop components
- [ ] Update imports in `App.tsx` to use more from ui
- [ ] Update `ARCHITECTURE.md` to reflect new thin-wrapper approach

## Success Criteria

1. Desktop package src/components/ contains only: `WindowControls.tsx`, `DesktopMenu.tsx` (if needed for native menu)
2. Desktop package shares 95%+ of UI code with web
3. Adding a new UI feature in @leanspec/ui automatically works in desktop
4. Bundle size remains similar or smaller
5. No visual or functional regression in desktop app

## Out of Scope

- Rust backend changes (keep existing Tauri commands)
- New features (this is purely refactoring)
- i18n changes

## References

- [Desktop ARCHITECTURE.md](../../packages/desktop/ARCHITECTURE.md)
- [Spec 204: Desktop UI Vite Integration](../204-desktop-ui-vite-integration/)
- [Spec 184: UI Packages Consolidation](../184-ui-packages-consolidation/)
- [Spec 260: UI Component Dedup](../260-ui-component-dedup/)