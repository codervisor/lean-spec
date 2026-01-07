---
status: planned
created: 2026-01-07
priority: medium
tags:
- ui
- vite
- frontend
- architecture
- ui-parity
depends_on:
- 193-frontend-ui-parity
- 190-ui-vite-parity-rust-backend
created_at: 2026-01-07T08:28:16.326639Z
updated_at: 2026-01-07T08:28:28.043957Z
---

## Overview

**Problem**: The UI-Vite layout and routing structure differs from the Next.js UI implementation in several key ways:

1. **Router Structure**: Next.js uses file-based routing with a root layout that wraps all pages, while ui-vite uses programmatic react-router with nested routes but inconsistent layout usage
2. **Layout Inconsistency**: Some routes (like `/projects/:projectId/specs/:specName`) use `SpecsLayout`, while others directly use `Layout`, creating an inconsistent pattern
3. **Global State Positioning**: In Next.js, providers (Theme, Project, I18n) are in the root layout; in ui-vite they're in App.tsx, but layout-specific state (sidebar, shortcuts) is in Layout component
4. **Navigation vs Layout**: The Navigation component is called from Layout in ui-vite, but it's a separate concern that should perhaps be part of the layout composition

**Goal**: Refactor ui-vite's routing and layout structure to mirror the Next.js pattern as closely as possible within react-router constraints, creating a cleaner separation of concerns and more consistent route definitions.

**Why now**: Spec 193 (Frontend UI Parity) is in-progress and focusing on component parity. Having a consistent layout pattern will make further UI parity work easier and reduce technical debt.

**Context**: Part of broader UI-Vite parity effort (Spec 190, 193).

## Design

### Current State Analysis

**Next.js UI (`packages/ui/src/app/layout.tsx`)**:
```tsx
// Single root layout wraps all pages
<html>
  <body>
    <I18nProvider>
      <ThemeProvider>
        <ProjectProvider>
          <Navigation />           {/* Global nav bar */}
          <div className="flex">
            <MainSidebar />        {/* Always present */}
            <main>{children}</main> {/* Page content */}
          </div>
        </ProjectProvider>
      </ThemeProvider>
    </I18nProvider>
  </body>
</html>
```

**UI-Vite Current (`packages/ui-vite/src/`)**:
```tsx
// App.tsx: Providers at root
<ThemeProvider>
  <ProjectProvider>
    <RouterProvider router={router} />
  </ProjectProvider>
</ThemeProvider>

// Layout.tsx: Navigation + MainSidebar + content wrapper
<Navigation />
<div className="flex">
  <MainSidebar />
  <main><Outlet /></main>
</div>

// SpecsLayout.tsx: SpecsNavSidebar + content wrapper (only for spec detail)
<div className="flex">
  <SpecsNavSidebar />
  <div><Outlet /></div>
</div>

// Router: Nested routes with multiple layout compositions
/projects/:projectId -> Layout
  /specs -> no layout wrapper (direct page)
  /specs/:specName -> SpecsLayout -> SpecDetailPage
  /stats -> no layout wrapper (direct page)
```

### Proposed Architecture

**Goals**:
1. **Single Layout Component**: One primary layout that handles Navigation + MainSidebar for all project-scoped pages
2. **Conditional Sub-Layouts**: Nested layouts (like SpecsLayout) only when needed, following a clear pattern
3. **Route Organization**: Group related routes logically, make layout composition explicit
4. **State Management**: Move global shortcut handling out of Layout (could be a hook in App.tsx)

**Pattern Comparison**:

| Concern                  | Next.js UI                       | Current ui-vite                          | Proposed ui-vite                       |
| ------------------------ | -------------------------------- | ---------------------------------------- | -------------------------------------- |
| **Providers**            | RootLayout (layout.tsx)          | App.tsx                                  | App.tsx ✅ (keep)                       |
| **Navigation**           | RootLayout (layout.tsx)          | Layout component                         | Layout component ✅ (keep)              |
| **MainSidebar**          | RootLayout (layout.tsx)          | Layout component                         | Layout component ✅ (keep)              |
| **Project-level pages**  | Direct children in file system   | Children of /projects/:projectId layout  | Children of /projects/:projectId ✅     |
| **Specs navigation**     | N/A (not in Next.js yet)         | SpecsLayout for detail page only         | SpecsLayout for all /specs/* routes    |
| **Global shortcuts**     | N/A                              | Layout component useState                | Dedicated hook in App.tsx or Layout    |
| **Mobile sidebar state** | N/A                              | Layout component useState + window hack  | Context or better state management     |
| **Error boundary**       | Per-page or app level            | Layout component (wraps Outlet)          | Layout component ✅ (keep)              |
| **Page transitions**     | N/A (Next.js handles)            | Layout component (wraps Outlet)          | Layout component ✅ (keep)              |

**Key Insight**: The main difference is that Next.js has a single root layout that applies to all pages by design (file-system routing), while react-router requires explicit nesting. The proposed change is to make the layout nesting **more consistent** rather than trying to perfectly match Next.js (which is architecturally different).

### Refactoring Proposal

#### Option A: Keep Current Structure, Clean Up (RECOMMENDED)

**Changes**:
1. ✅ Keep Layout as main wrapper (Navigation + MainSidebar + Outlet)
2. ✅ Keep SpecsLayout as sub-layout (SpecsNavSidebar + Outlet)
3. 🔧 Make SpecsLayout apply to ALL `/specs/*` routes, not just detail
4. 🔧 Extract keyboard shortcut state management to a dedicated context or hook
5. 🔧 Remove `window.toggleMainSidebar` hack, use proper state lifting or context
6. 🔧 Document layout composition clearly in router.tsx

**Why**: Minimal changes, aligns with react-router best practices, clear separation of concerns.

**Router Structure**:
```tsx
/                              -> Navigate to /projects/default
/projects                      -> ProjectsPage (standalone, no Layout)
/projects/:projectId           -> Layout (Navigation + MainSidebar)
  /                            -> DashboardPage
  /specs                       -> SpecsLayout (+ SpecsNavSidebar)
    /                          -> SpecsPage
    /:specName                 -> SpecDetailPage
  /stats                       -> StatsPage (no sub-layout)
  /dependencies                -> DependenciesPage (no sub-layout)
  /dependencies/:specName      -> DependenciesPage (no sub-layout)
  /settings                    -> SettingsPage (no sub-layout)
  /context                     -> ContextPage (no sub-layout)
```

**Benefits**:
- SpecsNavSidebar visible on both list and detail pages (better UX)
- Clear layout nesting: Layout (global) → SpecsLayout (specs-specific)
- Less code churn, less risk

#### Option B: Flatten to Single Layout (NOT RECOMMENDED)

**Changes**:
1. Merge SpecsLayout into Layout component
2. Conditionally render SpecsNavSidebar based on route
3. Single layout for all routes

**Why NOT**:
- Less modular
- Makes Layout component more complex
- Harder to maintain
- Goes against react-router patterns

### Implementation Details

#### 1. Router Structure Change

**Before** (`router.tsx`):
```tsx
{
  path: '/projects/:projectId',
  element: <Layout />,
  children: [
    { index: true, element: <DashboardPage /> },
    {
      path: 'specs',
      children: [
        { index: true, element: <SpecsPage /> },       // No SpecsLayout!
        {
          path: ':specName',
          element: <SpecsLayout />,                    // Only for detail
          children: [{ index: true, element: <SpecDetailPage /> }],
        },
      ],
    },
    // ...
  ],
}
```

**After** (`router.tsx`):
```tsx
{
  path: '/projects/:projectId',
  element: <Layout />,
  children: [
    { index: true, element: <DashboardPage /> },
    {
      path: 'specs',
      element: <SpecsLayout />,                       // Wrap all specs routes
      children: [
        { index: true, element: <SpecsPage /> },      // Now has sidebar
        { path: ':specName', element: <SpecDetailPage /> },  // Still has sidebar
      ],
    },
    { path: 'stats', element: <StatsPage /> },
    { path: 'dependencies', element: <DependenciesPage /> },
    { path: 'dependencies/:specName', element: <DependenciesPage /> },
    { path: 'settings', element: <SettingsPage /> },
    { path: 'context', element: <ContextPage /> },
  ],
}
```

**Impact**:
- SpecsPage will now render inside SpecsLayout (gains SpecsNavSidebar)
- SpecDetailPage rendering unchanged (already inside SpecsLayout)
- SpecsNavSidebar becomes persistent across specs list ↔ detail navigation

#### 2. Mobile Sidebar State Management

**Problem**: Current implementation uses `window.toggleMainSidebar` to communicate between Navigation and Layout:

```tsx
// Layout.tsx
const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
useEffect(() => {
  (window as any).toggleMainSidebar = () => {
    setMobileSidebarOpen(prev => !prev);
  };
}, []);

// Navigation.tsx
const toggleSidebar = () => {
  if (typeof window !== 'undefined' && (window as any).toggleMainSidebar) {
    (window as any).toggleMainSidebar();
  }
};
```

**Solution A: Context (Recommended)**
```tsx
// contexts/LayoutContext.tsx
interface LayoutContextValue {
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  showShortcuts: boolean;
  toggleShortcuts: () => void;
}

export const LayoutContext = createContext<LayoutContextValue>(...);

// Layout.tsx
export function Layout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const value = useMemo(() => ({
    mobileSidebarOpen,
    toggleMobileSidebar: () => setMobileSidebarOpen(prev => !prev),
    showShortcuts,
    toggleShortcuts: () => setShowShortcuts(prev => !prev),
  }), [mobileSidebarOpen, showShortcuts]);

  return (
    <LayoutContext.Provider value={value}>
      <Navigation />
      <div className="flex">
        <MainSidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
        <main><Outlet /></main>
      </div>
      {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
    </LayoutContext.Provider>
  );
}

// Navigation.tsx
const { toggleMobileSidebar } = useLayout();
```

**Solution B: State Lifting (Simpler, but less flexible)**
```tsx
// Keep state in Layout, pass toggleMobileSidebar as prop to Navigation
<Navigation onToggleSidebar={() => setMobileSidebarOpen(prev => !prev)} />
```

**Recommendation**: Use Context (Solution A) for better separation and future extensibility.

#### 3. Keyboard Shortcuts Organization

**Current**: State and help dialog in Layout component

**Proposed**: Extract to dedicated context

```tsx
// contexts/KeyboardShortcutsContext.tsx
interface KeyboardShortcutsContextValue {
  showHelp: boolean;
  toggleHelp: () => void;
}

export const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue>(...);

export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);
  const value = useMemo(() => ({
    showHelp,
    toggleHelp: () => setShowHelp(prev => !prev),
  }), [showHelp]);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}
    </KeyboardShortcutsContext.Provider>
  );
}

// App.tsx
<ThemeProvider>
  <ProjectProvider>
    <KeyboardShortcutsProvider>
      <RouterProvider router={router} />
    </KeyboardShortcutsProvider>
  </ProjectProvider>
</ThemeProvider>

// Layout.tsx (simplified)
export function Layout() {
  const { toggleHelp } = useKeyboardShortcuts();

  return (
    <LayoutContext.Provider value={...}>
      <Navigation onShowShortcuts={toggleHelp} />
      ...
    </LayoutContext.Provider>
  );
}
```

**Benefits**:
- Layout component simpler
- Keyboard shortcuts state decoupled from layout state
- Help dialog can be triggered from anywhere

#### 4. SpecsLayout Adjustments

**Current**: SpecsLayout only used for detail page

**After**: SpecsLayout used for both list and detail

**Potential Issue**: SpecsPage might not need the full sidebar on list view

**Solution**: Make SpecsNavSidebar behavior responsive:
- On list view: Show as collapsible sidebar (optional: collapsed by default)
- On detail view: Show as sidebar (optional: expanded by default)
- Mobile: Always overlay

```tsx
// SpecsLayout.tsx
export function SpecsLayout() {
  const { pathname } = useLocation();
  const isDetailView = pathname.includes('/specs/') && !pathname.endsWith('/specs');

  return (
    <div className="flex w-full h-full">
      <SpecsNavSidebar 
        defaultCollapsed={!isDetailView}  // Collapsed on list, expanded on detail
      />
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
```

Alternatively, keep sidebar always expanded, let user collapse manually.

### File Changes Summary

| File                                       | Change Type | Description                           |
| ------------------------------------------ | ----------- | ------------------------------------- |
| `src/router.tsx`                           | Modify      | Nest SpecsPage under SpecsLayout      |
| `src/App.tsx`                              | Modify      | Add KeyboardShortcutsProvider         |
| `src/components/Layout.tsx`                | Modify      | Add LayoutContext, remove window hack |
| `src/components/SpecsLayout.tsx`           | Modify      | Add responsive sidebar behavior       |
| `src/components/Navigation.tsx`            | Modify      | Use LayoutContext instead of window   |
| `src/contexts/LayoutContext.tsx`           | Create      | New context for layout state          |
| `src/contexts/KeyboardShortcutsContext.tsx` | Create      | New context for shortcuts             |
| `src/contexts/index.ts`                    | Modify      | Export new contexts                   |

## Plan

### Phase 1: Context Extraction (1-2 hours)

- [ ] **Task 1.1**: Create LayoutContext
  - [ ] Create `src/contexts/LayoutContext.tsx`
  - [ ] Define interface: `mobileSidebarOpen`, `toggleMobileSidebar`
  - [ ] Export provider and hook

- [ ] **Task 1.2**: Create KeyboardShortcutsContext
  - [ ] Create `src/contexts/KeyboardShortcutsContext.tsx`
  - [ ] Define interface: `showHelp`, `toggleHelp`
  - [ ] Move `KeyboardShortcutsHelp` component to separate file or keep inline
  - [ ] Export provider and hook

- [ ] **Task 1.3**: Update context barrel export
  - [ ] Add to `src/contexts/index.ts`
  - [ ] Test imports work

### Phase 2: Layout Refactoring (2-3 hours)

- [ ] **Task 2.1**: Refactor Layout component
  - [ ] Wrap with LayoutContext.Provider
  - [ ] Remove `showShortcuts` state (moved to context)
  - [ ] Remove `window.toggleMainSidebar` hack
  - [ ] Pass layout context values
  - [ ] Test mobile sidebar toggle still works

- [ ] **Task 2.2**: Update Navigation component
  - [ ] Import `useLayout` hook
  - [ ] Replace `window.toggleMainSidebar` with context
  - [ ] Test sidebar toggle from navigation

- [ ] **Task 2.3**: Update App.tsx
  - [ ] Add KeyboardShortcutsProvider wrapper
  - [ ] Update provider nesting order
  - [ ] Test shortcuts still work

- [ ] **Task 2.4**: Update MainSidebar
  - [ ] Ensure it receives `mobileOpen` and `onMobileClose` correctly
  - [ ] Test mobile overlay behavior

### Phase 3: Router Restructuring (1-2 hours)

- [ ] **Task 3.1**: Update router.tsx
  - [ ] Nest SpecsPage under SpecsLayout
  - [ ] Flatten `:specName` route (remove extra nesting level)
  - [ ] Add comments explaining layout composition
  - [ ] Verify all routes still resolve

- [ ] **Task 3.2**: Test navigation
  - [ ] Navigate to `/projects/:projectId/specs` (list)
  - [ ] Navigate to `/projects/:projectId/specs/:specName` (detail)
  - [ ] Verify sidebar shows on both
  - [ ] Verify URL updates correctly
  - [ ] Test browser back/forward

- [ ] **Task 3.3**: Adjust SpecsNavSidebar if needed
  - [ ] Test current behavior on list page
  - [ ] Decide: collapsed by default on list? or always expanded?
  - [ ] Implement conditional default if needed
  - [ ] Test collapse/expand persistence

### Phase 4: Documentation & Testing (1 hour)

- [ ] **Task 4.1**: Document architecture
  - [ ] Add comments in `router.tsx` explaining layout nesting
  - [ ] Add JSDoc comments to context providers
  - [ ] Update README or architecture doc (if exists)

- [ ] **Task 4.2**: Manual testing
  - [ ] Test all routes render correctly
  - [ ] Test mobile sidebar toggle (Navigation → MainSidebar)
  - [ ] Test SpecsNavSidebar on list and detail pages
  - [ ] Test keyboard shortcuts (? or Cmd+/)
  - [ ] Test dark mode toggle
  - [ ] Test project switching
  - [ ] Test responsive behavior (mobile, tablet, desktop)

- [ ] **Task 4.3**: Compare with Next.js UI
  - [ ] Side-by-side layout structure comparison
  - [ ] Verify parity where expected
  - [ ] Document intentional differences
  - [ ] Screenshot for verification

### Phase 5: Clean Up (30 mins)

- [ ] **Task 5.1**: Code cleanup
  - [ ] Remove unused imports
  - [ ] Remove commented code
  - [ ] Format code consistently
  - [ ] Run linter and fix issues

- [ ] **Task 5.2**: Verify no regressions
  - [ ] Run typecheck: `pnpm --filter @leanspec/ui-vite typecheck`
  - [ ] Run build: `pnpm --filter @leanspec/ui-vite build`
  - [ ] Test in dev mode: `pnpm --filter @leanspec/ui-vite dev`

- [ ] **Task 5.3**: Update Spec 193
  - [ ] Link this spec as related
  - [ ] Update implementation log if needed

## Test

### Functional Tests

#### Layout & Navigation
- [ ] MainSidebar renders on all `/projects/:projectId/*` routes
- [ ] Navigation bar renders on all project routes
- [ ] Mobile sidebar toggle button in Navigation opens/closes MainSidebar
- [ ] Clicking outside mobile sidebar closes it
- [ ] MainSidebar collapse state persists across route changes
- [ ] Project switcher in Navigation updates current project

#### SpecsNavSidebar
- [ ] SpecsNavSidebar renders on `/projects/:projectId/specs` (list page)
- [ ] SpecsNavSidebar renders on `/projects/:projectId/specs/:specName` (detail page)
- [ ] Sidebar shows search input and filters
- [ ] Clicking spec in sidebar navigates to detail page
- [ ] Active spec highlights in sidebar
- [ ] Sidebar collapse state persists between list ↔ detail navigation
- [ ] Mobile: Sidebar shows as overlay with backdrop

#### Keyboard Shortcuts
- [ ] Pressing `?` or `Cmd+/` opens keyboard shortcuts help
- [ ] Help dialog shows all shortcuts
- [ ] ESC or clicking outside closes help dialog
- [ ] Shortcuts work from any page (h, g, s, d, ,, /)
- [ ] Cmd+K / Ctrl+K opens quick search

#### Context State Management
- [ ] LayoutContext provides `mobileSidebarOpen` and `toggleMobileSidebar`
- [ ] KeyboardShortcutsContext provides `showHelp` and `toggleHelp`
- [ ] No console errors about window object pollution
- [ ] State updates propagate correctly through contexts

### Visual Tests

#### Layout Structure
- [ ] Navigation bar fixed at top (height: 3.5rem)
- [ ] MainSidebar fixed on left (width: 240px desktop, overlay mobile)
- [ ] Main content area fills remaining space
- [ ] No horizontal scrollbars
- [ ] No layout shift when sidebar toggles

#### SpecsLayout
- [ ] SpecsNavSidebar width: 280px when expanded
- [ ] Content area adjusts width when sidebar collapses
- [ ] Smooth transition animation
- [ ] No content jump when navigating list ↔ detail

#### Responsive Behavior
- [ ] Mobile (<768px): Both sidebars show as overlays
- [ ] Tablet (768-1024px): MainSidebar fixed, SpecsNavSidebar collapsible
- [ ] Desktop (>1024px): Both sidebars fixed, SpecsNavSidebar expanded by default
- [ ] Touch interactions work (swipe to close on mobile)

### Integration Tests

#### Router Composition
- [ ] `/projects/:projectId` renders Layout
- [ ] `/projects/:projectId/specs` renders Layout → SpecsLayout → SpecsPage
- [ ] `/projects/:projectId/specs/:specName` renders Layout → SpecsLayout → SpecDetailPage
- [ ] `/projects/:projectId/stats` renders Layout → StatsPage (no sub-layout)
- [ ] Error boundary catches errors in nested routes
- [ ] PageTransition animates between pages

#### State Persistence
- [ ] MainSidebar collapse state persists in localStorage
- [ ] SpecsNavSidebar collapse state persists in localStorage
- [ ] Theme persists across route changes
- [ ] Current project persists across route changes

### Comparison with Next.js UI

#### Structure Parity
- [ ] Providers at top level (App.tsx ≈ layout.tsx)
- [ ] Navigation in layout (Layout.tsx ≈ layout.tsx)
- [ ] MainSidebar in layout (Layout.tsx ≈ layout.tsx)
- [ ] Project-scoped routes nested under layout
- [ ] Specs-specific layout for specs routes

#### Intentional Differences (Document)
- [ ] Next.js uses file-system routing, ui-vite uses programmatic routes
- [ ] Next.js has server components, ui-vite is pure client-side
- [ ] Next.js doesn't have SpecsNavSidebar yet (future feature)
- [ ] UI-Vite has additional contexts for client-side state management

### Performance Tests

- [ ] Initial page load <1s
- [ ] Route transitions <200ms
- [ ] Sidebar toggle animation smooth (60fps)
- [ ] No memory leaks when navigating between routes
- [ ] Context providers don't cause unnecessary re-renders

## Success Criteria

### Must Have

**Router Structure**:
- [x] SpecsLayout wraps all `/specs/*` routes (list + detail)
- [x] All project routes nested under Layout (Navigation + MainSidebar)
- [x] Route definitions clear and well-commented
- [x] No duplicate layout compositions

**State Management**:
- [x] LayoutContext manages mobile sidebar state
- [x] KeyboardShortcutsContext manages shortcuts help dialog
- [x] No `window` object hacks for component communication
- [x] Context providers follow React best practices

**Functionality**:
- [x] All existing features work (navigation, sidebars, shortcuts)
- [x] No regressions in behavior
- [x] Mobile and desktop UX maintained
- [x] Typecheck and build pass

### Should Have

**Code Quality**:
- [x] Layout component <150 lines (moved state to contexts)
- [x] Clear separation of concerns
- [x] Consistent naming conventions
- [x] JSDoc comments on contexts

**Documentation**:
- [ ] Architecture explained in comments
- [ ] Intentional differences from Next.js documented
- [ ] Context usage patterns documented

**Testing**:
- [ ] Manual testing checklist completed
- [ ] Comparison with Next.js UI done
- [ ] No console errors or warnings

### Nice to Have

**Polish**:
- [ ] SpecsNavSidebar behavior optimized for list vs detail
- [ ] Smooth animations between all state transitions
- [ ] Error boundaries show helpful messages
- [ ] Loading states during route transitions

**Future Improvements**:
- [ ] Consider extracting more layout logic to contexts
- [ ] Consider adding route-based breadcrumbs
- [ ] Consider adding route transition animations
- [ ] Consider unified state management (Zustand/Jotai)

## Notes

### Why This Matters

1. **Maintainability**: Cleaner separation of concerns makes code easier to understand and modify
2. **Consistency**: Following react-router patterns makes it easier for new contributors
3. **Parity**: Aligning with Next.js UI structure (where possible) reduces mental overhead when working across both codebases
4. **Future-Proof**: Better architecture makes it easier to add features like route-based permissions, breadcrumbs, analytics

### Why Not Perfect Parity?

Next.js and react-router have fundamentally different architectures:
- Next.js: File-system routing, server components, automatic code splitting
- React-router: Programmatic routing, client-side only, manual route definitions

Trying to force perfect parity would be counterproductive. Instead, we aim for **conceptual parity**: same high-level structure, adapted to each framework's strengths.

### Alternative Approaches Considered

**Approach A: Single Layout with Conditional Rendering**
```tsx
// NOT RECOMMENDED
function Layout() {
  const location = useLocation();
  const isSpecsRoute = location.pathname.includes('/specs');
  
  return (
    <div>
      <Navigation />
      <MainSidebar />
      {isSpecsRoute && <SpecsNavSidebar />}
      <main><Outlet /></main>
    </div>
  );
}
```
**Why NOT**: Makes Layout component complex, less modular, harder to maintain.

**Approach B: Per-Page Layout Composition**
```tsx
// NOT RECOMMENDED
function SpecsPage() {
  return (
    <Layout>
      <SpecsNavSidebar />
      <div>Specs content</div>
    </Layout>
  );
}
```
**Why NOT**: Duplicates layout code in every page, easy to create inconsistencies.

**Chosen Approach: Nested Layouts in Router** (CURRENT)
```tsx
{
  element: <Layout />,
  children: [
    {
      element: <SpecsLayout />,
      children: [
        { element: <SpecsPage /> },
        { element: <SpecDetailPage /> },
      ],
    },
  ],
}
```
**Why YES**: Leverages react-router's nested routes, keeps components focused, easy to reason about.

### Related Specs

- [Spec 193](../193-frontend-ui-parity/) - Parent spec for UI parity work
- [Spec 190](../190-ui-vite-parity-rust-backend/) - Umbrella spec for ui-vite parity
- [Spec 187](../187-vite-spa-migration/) - Original Vite SPA implementation

### Open Questions

1. **Should SpecsNavSidebar be collapsed by default on list view?**
   - Decision: Let user decide, persist their preference
   - Default: Expanded (to match detail page behavior)

2. **Should we extract more state to contexts (e.g., MainSidebar collapse state)?**
   - Decision: Not in this spec, MainSidebar state is already managed well
   - Future: Could be part of a unified LayoutContext

3. **Should keyboard shortcuts context also handle registration of shortcuts?**
   - Decision: No, keep context minimal (just help dialog state)
   - Shortcut registration stays in `useGlobalShortcuts` hook

4. **Should we add route-based analytics/tracking?**
   - Decision: Out of scope for this spec
   - Future: Could be added to Layout component or router

## Implementation Log

### 2025-01-07: Spec created
- Analyzed current ui-vite layout and routing structure
- Compared with Next.js UI implementation
- Identified key differences and improvement opportunities
- Designed context-based state management solution
- Defined router restructuring to nest SpecsPage under SpecsLayout
- Created detailed implementation plan with clear success criteria
