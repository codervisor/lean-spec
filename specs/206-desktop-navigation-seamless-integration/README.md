---
status: planned
created: 2026-01-09
priority: high
tags:
- desktop
- ui-vite
- architecture
- navigation
depends_on:
- 204-desktop-ui-vite-integration
- 205-desktop-ui-vite-alignment-fixes
- 203-ui-vite-layout-router-alignment
created_at: 2026-01-09T02:30:05.005888347Z
updated_at: 2026-01-09T02:30:11.065346404Z
---

## Overview

The desktop app currently has two critical UX issues:

1. **Non-native title bar positioning** - Window controls (minimize, maximize, close) are in a separate title bar above the Navigation component, creating visual inconsistency between desktop and web
2. **Cannot navigate to projects page** - Users cannot switch projects or access the projects management page from within the app

### Current Architecture Problem

Desktop currently wraps ui-vite's `Layout` with `DesktopLayout` and injects a separate `TitleBar` component:

```tsx
<DesktopLayout header={<TitleBar />}>
  <Layout />
</DesktopLayout>
```

This creates:
- Duplicated navigation chrome (title bar + Navigation component)
- Visual inconsistency with web version
- Tight coupling between desktop shell and ui-vite components

### Desired State

Window controls should appear **inside** the Navigation component (right beside GitHub link), making desktop and web UI visually identical. Projects navigation should be accessible from MainSidebar or Navigation.

## Design

### Solution 1: Navigation Slot Props (Recommended)

Extend ui-vite's `Navigation` component to accept slot props for injecting custom content:

```tsx
// packages/ui-vite/src/components/Navigation.tsx
interface NavigationProps {
  onToggleSidebar?: () => void;
  onShowShortcuts?: () => void;
  rightSlot?: React.ReactNode;  // NEW: Allow external injection
}

export function Navigation({ rightSlot, ...props }: NavigationProps) {
  return (
    <header data-tauri-drag-region={isDesktop()}>
      <div>
        {/* Left: Logo, Breadcrumb */}
        {/* Center/Right: Search, Theme, etc */}
        {rightSlot}  {/* Desktop can inject window controls here */}
      </div>
    </header>
  );
}
```

Desktop usage:

```tsx
// packages/desktop/src/App.tsx
<Layout
  navigationRightSlot={<WindowControls />}
/>
```

**Pros:**
- Clean separation of concerns
- ui-vite remains reusable (web doesn't use rightSlot)
- No conditional logic in ui-vite for desktop detection
- Easy to test independently

**Cons:**
- Requires Layout to pass props through to Navigation

### Solution 2: Render Props Pattern

```tsx
interface NavigationProps {
  renderRight?: () => React.ReactNode;
}
```

Similar to Solution 1 but more explicit about render behavior.

### Solution 3: Context-Based Injection

```tsx
// packages/ui-vite/src/contexts/NavigationContext.tsx
interface NavigationConfig {
  rightContent?: React.ReactNode;
}

const NavigationContext = createContext<NavigationConfig>({});

// Desktop sets this at app root
<NavigationProvider config={{ rightContent: <WindowControls /> }}>
  <Layout />
</NavigationProvider>
```

**Pros:**
- No prop drilling
- Clean at usage site

**Cons:**
- More complex for simple use case
- Harder to debug

### Projects Navigation Fix

Desktop already has a `/projects` route (handled by the desktop shell) that shows the `ProjectsManager` screen.

The real issue is that ui-vite’s `ProjectSwitcher` currently uses `window.location.assign(...)` and `window.location.pathname` for navigation. That works with `createBrowserRouter` (web), but **breaks under the desktop app’s hash router** (`createHashRouter`), because the actual route lives in `location.hash`, not `window.location.pathname`.

**Fix:** switch `ProjectSwitcher` (and create-project flows) to use React Router navigation (`useNavigate()` + `useLocation()`), so “Manage Projects” can navigate to `/projects` reliably in both web and desktop.

Optional enhancement: also add a small “Projects” button in `Navigation` if we want global discoverability, but it’s not strictly required once `ProjectSwitcher → Manage Projects` works.

## Plan

### Phase 1: Navigation Slot Props Architecture
- [ ] Add `rightSlot` prop to Navigation component in ui-vite
- [ ] Update Layout component to accept and forward `navigationRightSlot` prop
- [ ] Add TypeScript types for slot props
- [ ] Ensure data-tauri-drag-region works correctly with slots

### Phase 2: Desktop Window Controls Integration
- [ ] Create WindowControls component in desktop package (extract from TitleBar.tsx)
- [ ] Update desktop App.tsx to pass WindowControls via navigationRightSlot
- [ ] Remove separate TitleBar component usage from DesktopLayout
- [ ] Simplify DesktopLayout to minimal wrapper (no header prop)

### Phase 3: Projects Navigation
- [ ] Add Projects link to MainSidebar navigation items
- [ ] Update routing to handle /projects path
- [ ] Ensure ProjectSwitcher in sidebar still works
- [ ] Test project switching flows (sidebar switcher + projects page)

### Phase 4: Visual Parity
- [ ] Verify window controls appear beside GitHub link
- [ ] Ensure drag region works correctly
- [ ] Test dark/light theme for window controls
- [ ] Compare desktop and web side-by-side for consistency

## Test

### Navigation Slot Props
- [ ] Web version renders correctly without rightSlot (no errors)
- [ ] Desktop version shows window controls in Navigation
- [ ] Window controls appear in correct position (after GitHub link)
- [ ] TypeScript types work correctly for slots

### Window Controls Functionality
- [ ] Minimize button minimizes window
- [ ] Maximize/restore button toggles window state
- [ ] Close button closes application
- [ ] Controls update state correctly (maximize icon changes)
- [ ] Hover states work correctly

### Projects Navigation
- [ ] Projects link appears in sidebar
- [ ] Clicking Projects navigates to projects page
- [ ] Projects page shows all projects
- [ ] Can switch project from projects page
- [ ] Can switch project from sidebar ProjectSwitcher
- [ ] Navigation works in both directions (project → projects → project)

### Visual Consistency
- [ ] Desktop navigation height matches web (56px / h-14)
- [ ] Window controls align with other navigation items
- [ ] Drag region works (can move window by dragging navigation bar)
- [ ] No visual glitches or layout shifts
- [ ] Dark theme works correctly for window controls

### No Regressions
- [ ] Web version unaffected by slot prop changes
- [ ] All existing navigation features work
- [ ] Mobile sidebar still functions
- [ ] Breadcrumb navigation still works
- [ ] Quick search still works
- [ ] Theme toggle still works

## Notes

### Key Files

**ui-vite Package:**
- `packages/ui-vite/src/components/Navigation.tsx` - Add rightSlot prop
- `packages/ui-vite/src/components/Layout.tsx` - Forward navigationRightSlot
- `packages/ui-vite/src/components/MainSidebar.tsx` - Add Projects navigation

**Desktop Package:**
- `packages/desktop/src/components/WindowControls.tsx` - Extract from TitleBar
- `packages/desktop/src/components/DesktopLayout.tsx` - Simplify (remove header)
- `packages/desktop/src/App.tsx` - Pass WindowControls via slot prop
- `packages/desktop/src/components/TitleBar.tsx` - May be removed entirely

### Design Decisions

**Why Slot Props over Conditional Rendering?**

We could check `isDesktop()` inside Navigation and render WindowControls conditionally, but:
1. Creates tight coupling between ui-vite and desktop
2. Requires ui-vite to depend on @tauri-apps packages
3. Makes testing harder (need to mock Tauri)
4. Violates separation of concerns

Slot props keep ui-vite clean and reusable.

**Why not use Context?**

Context is overkill for this simple use case. Slot props are:
- More explicit
- Easier to understand
- Better TypeScript support
- No performance overhead from context updates

**Alternative: Compound Components**

Could use compound component pattern:

```tsx
<Navigation>
  <Navigation.Left>...</Navigation.Left>
  <Navigation.Right>...</Navigation.Right>
</Navigation>
```

But this requires larger refactor and more complexity than needed.

### Related Specs

- 204-desktop-ui-vite-integration - Original desktop/ui-vite integration
- 205-desktop-ui-vite-alignment-fixes - Previous alignment attempt
- 203-ui-vite-layout-router-alignment - Layout structure work
- 167-desktop-projects-management-page - Projects management UI