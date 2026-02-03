---
status: in-progress
created: 2026-02-03
priority: high
depends_on:
- 284-state-management-library-evaluation
created_at: 2026-02-03T02:16:51.634107934Z
updated_at: 2026-02-03T02:35:29.759403522Z
transitions:
- status: in-progress
  at: 2026-02-03T02:35:29.759403522Z
---

# State Management Migration

Migrate LeanSpec UI from React Context to Zustand (client state) and TanStack Query (server state).

## Background

Following evaluation in [284-state-management-library-evaluation](../284-state-management-library-evaluation), this spec implements the full migration.

**Libraries already installed:**
- `zustand@5.0.11`
- `@tanstack/react-query@5.90.20`

**PoC files created:**
- `src/stores/theme.ts` - Zustand theme store
- `src/hooks/useSpecsQuery.ts` - TanStack Query specs hooks
- `src/lib/query-client.ts` - Query client config

## Implementation Plan

### Phase 1: Zustand Stores (Client State)

- [x] **1.1** Finalize `useThemeStore` and update consumers
  - Remove `ThemeContext.tsx`, `theme.ts`, `useTheme.ts`
  - Update consumers:
    - `components/ThemeToggle.tsx` (useTheme → useThemeStore)
    - `components/MermaidDiagram.tsx` (useTheme → useThemeStore)
  - Update `contexts/index.ts` exports
  - Update test: `contexts/ThemeContext.test.tsx` → `stores/theme.test.ts`
  
- [x] **1.2** Create `useLayoutStore` 
  - Migrate `LayoutContext.tsx` → `src/stores/layout.ts`
  - State: `{ isWideMode, isSidebarOpen, toggleWideMode, toggleSidebar }`
  - Update consumers (10 files):
    - `components/Layout.tsx`
    - `components/WideModeToggle.tsx`
    - `pages/MachinesPage.tsx`
    - `pages/ProjectsPage.tsx`
    - `pages/SpecsPage.tsx`
    - `pages/SessionsPage.tsx`
    - `pages/SessionDetailPage.tsx`
    - `pages/StatsPage.tsx`
    - `pages/SpecDetailPage.tsx`
    - `pages/DependenciesPage.tsx`

- [x] **1.3** Create `useMachineStore`
  - Migrate `MachineContext.tsx` → `src/stores/machine.ts`
  - State: `{ machines, currentMachine, machineModeEnabled, isMachineAvailable, ... }`
  - Keep API calls in store actions (Zustand supports async)
  - **Note**: ProjectContext depends on MachineContext → migrate first
  - Update consumers:
    - `pages/MachinesPage.tsx`
    - `pages/ProjectsPage.tsx`
    - `pages/SpecsPage.tsx`
    - `pages/SpecDetailPage.tsx`
    - `contexts/ProjectContext.tsx` (temporarily until Phase 2.3)
    - `contexts/SpecsContext.tsx` (temporarily until Phase 2.2)

### Phase 2: TanStack Query (Server State)

- [x] **2.1** Add `QueryClientProvider` to App
  - Wrap app in `QueryClientProvider`
  - Use config from `src/lib/query-client.ts`
  - Add `@tanstack/react-query-devtools` (dev only)

- [x] **2.2** Migrate `SpecsContext` → query hooks
  - Existing PoC: `src/hooks/useSpecsQuery.ts`
  - Add SSE integration hook: `useSpecsSSE()`
    ```ts
    function useSpecsSSE() {
      const invalidate = useInvalidateSpecs();
      useSpecSync({ enabled: true, url: '...', onChange: invalidate });
    }
    ```
  - Update consumers (5 files):
    - `pages/DashboardPage.tsx` (refreshTrigger → useSpecsList)
    - `pages/SpecsPage.tsx` (refreshTrigger → useSpecsList)
    - `pages/StatsPage.tsx` (refreshTrigger → useProjectStats)
    - `pages/SpecDetailPage.tsx` (refreshTrigger → useSpecDetail)
    - Mount `useSpecsSSE()` in `App.tsx` or `Layout.tsx`

- [x] **2.3** Migrate `ProjectContext` → query hooks
  - Create `src/hooks/useProjectQuery.ts`:
    - `useProjects()` - fetch project list
    - `useCurrentProject()` - derive from list + localStorage
    - `useProjectMutations()` - add/update/delete/switch
  - State to preserve: localStorage `leanspec-current-project`
  - Update consumers (12+ files):
    - `components/Navigation.tsx`
    - `components/ProjectSwitcher.tsx`
    - `components/QuickSearch.tsx`
    - `components/GlobalChatWidget.tsx`
    - `pages/ContextPage.tsx`
    - `pages/DashboardPage.tsx`
    - `pages/ChatPage.tsx`
    - `pages/SettingsPage.tsx`
    - `pages/SessionsPage.tsx`
    - `pages/SessionDetailPage.tsx`
    - `pages/StatsPage.tsx`
    - `pages/SpecsPage.tsx`
    - `pages/SpecDetailPage.tsx`
    - `pages/DependenciesPage.tsx`
    - `pages/ProjectsPage.tsx`
  - **Note**: ChatContext uses useProject → update after migration

- [x] **2.4** Migrate `SessionsContext` → query hooks
  - Create `src/hooks/useSessionsQuery.ts`:
    - `useSessions()` - fetch session list
    - `useSession(id)` - fetch single session
    - `useSessionMutations()` - create/start/stop/pause/resume
  - Create `src/stores/sessions-ui.ts` (Zustand):
    - UI state only: `{ isDrawerOpen, activeSessionId, specFilter }`
  - WebSocket integration:
    ```ts
    ws.onmessage = (event) => {
      const { type, session } = JSON.parse(event.data);
      if (type === 'session.updated') {
        queryClient.setQueryData(['sessions', session.id], session);
        queryClient.invalidateQueries(['sessions', 'list']);
      }
    };
    ```
  - Update consumers:
    - `components/sessions/SessionsDrawer.tsx`
    - `components/sessions/SessionCard.tsx`
    - `components/sessions/SessionLogsPanel.tsx`
    - `pages/SpecDetailPage.tsx`

### Phase 3: Cleanup

- [x] **3.1** Remove old context files
  - Delete: `ThemeContext.tsx`, `theme.ts`, `useTheme.ts`
  - Delete: `LayoutContext.tsx`
  - Delete: `MachineContext.tsx`
  - Delete: `SpecsContext.tsx`
  - Delete: `ProjectContext.tsx`
  - Delete: `SessionsContext.tsx`
  - Update `contexts/index.ts`:
    ```ts
    // Keep only:
    export { ChatProvider, useChat } from './ChatContext';
    export { KeyboardShortcutsProvider, useKeyboardShortcuts } from './KeyboardShortcutsContext';
    ```
  
- [x] **3.2** Simplify provider tree in `App.tsx`
  - Before: `MachineProvider > ProjectProvider > SessionsProvider > SpecsProvider > LayoutProvider > ThemeProvider > ...`
  - After: `QueryClientProvider > ChatProvider > ...`
  - Zustand stores require no providers

- [x] **3.3** Update tests
  - Install: `pnpm add -D @tanstack/react-query`
  - Theme test: Mock Zustand with `zustand/testing`
  - Query tests: Use `QueryClientProvider` wrapper with fresh client
  - Integration tests: Consider MSW for API mocking

## File Changes Summary

| Action | File | Reason |
|--------|------|--------|
| Create | `src/stores/layout.ts` | Zustand layout store |
| Create | `src/stores/machine.ts` | Zustand machine store |
| Create | `src/stores/sessions-ui.ts` | Zustand sessions UI state |
| Create | `src/hooks/useProjectQuery.ts` | TanStack Query projects |
| Create | `src/hooks/useSessionsQuery.ts` | TanStack Query sessions |
| Create | `src/hooks/useSpecsSSE.ts` | SSE integration for specs |
| Modify | `src/App.tsx` | Simplify provider tree |
| Modify | `src/lib/query-client.ts` | Add devtools |
| Modify | `src/contexts/index.ts` | Update exports |
| Modify | 20+ consumer files | Update hook imports |
| Delete | `src/contexts/ThemeContext.tsx` | Replaced by Zustand |
| Delete | `src/contexts/theme.ts` | Replaced by Zustand |
| Delete | `src/contexts/useTheme.ts` | Replaced by Zustand |
| Delete | `src/contexts/LayoutContext.tsx` | Replaced by Zustand |
| Delete | `src/contexts/MachineContext.tsx` | Replaced by Zustand |
| Delete | `src/contexts/SpecsContext.tsx` | Replaced by TanStack Query |
| Delete | `src/contexts/ProjectContext.tsx` | Replaced by TanStack Query |
| Delete | `src/contexts/SessionsContext.tsx` | Replaced by TanStack Query |
| Keep | `src/contexts/ChatContext.tsx` | AI SDK integration |
| Keep | `src/contexts/KeyboardShortcutsContext.tsx` | Event-based, minimal state |

## Migration Order (Critical Path)

Dependencies between contexts require specific ordering:

```
1. useMachineStore (no deps)
   ↓
2. useLayoutStore (no deps)  
   ↓
3. useThemeStore (no deps, already has PoC)
   ↓
4. QueryClientProvider (infrastructure)
   ↓
5. useProjectQuery (depends on useMachineStore)
   ↓
6. useSpecsQuery (depends on useMachineStore via polling)
   ↓
7. useSessionsQuery (depends on useProjectQuery)
   ↓
8. Update ChatContext (depends on useProjectQuery)
   ↓
9. Cleanup old files
```

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing consumers | Keep old context + new hooks during transition; deprecation warnings |
| SSE/WebSocket race conditions | Use `queryClient.cancelQueries()` before `setQueryData()` |
| localStorage sync issues | Test multi-tab behavior; consider `zustand/middleware` persist |
| ChatContext depends on useProject | Update ChatContext last; use shim if needed |
| Tauri compatibility | Test desktop app after each phase |
| Test failures | Run `pnpm test` after each context migration |

## Testing Strategy

1. **Unit tests per store/hook**:
   - Zustand: Use `zustand/testing` or direct store calls
   - TanStack Query: Use `renderHook` with `QueryClientProvider`

2. **Integration tests**:
   - Verify SSE triggers cache invalidation
   - Verify WebSocket updates cache correctly
   - Verify localStorage persistence

3. **Manual testing checklist**:
   - [ ] Theme toggle persists across reload
   - [ ] Project switch updates all views
   - [ ] Spec list refreshes on SSE event
   - [ ] Session drawer state preserved
   - [ ] Desktop app functions correctly

## Success Criteria

- [ ] All existing functionality preserved
- [ ] No regression in tests
- [ ] Fewer providers in component tree
- [ ] Request deduplication verified (DevTools)
- [ ] Bundle size within +20KB gzipped

## Notes

- Migrate incrementally: one context at a time
- Keep old context alongside new hooks during transition
- Use `@tanstack/react-query-devtools` for debugging
- Consider `zustand/middleware` for persist/devtools later
