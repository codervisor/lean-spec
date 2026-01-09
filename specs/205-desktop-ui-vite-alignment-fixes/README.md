---
status: planned
created: 2026-01-09
priority: high
tags:
- desktop
- ui
- bug-fix
- ui-vite
created_at: 2026-01-09T01:44:39.910858250Z
updated_at: 2026-01-09T01:44:39.910858250Z
---

## Overview

Following spec 204's integration of @leanspec/ui-vite into @leanspec/desktop, there are critical rendering issues where desktop looks significantly different from the web version:

**Problems Identified:**
1. **Missing MainSidebar** - The main navigation sidebar from ui-vite is not rendering in desktop
2. **Missing Assets** - Logo files, icons, and other public assets are not available
3. **Layout Conflicts** - DesktopLayout wrapper interferes with ui-vite's Layout component
4. **Different Styling** - CSS modules with custom gradients override ui-vite's Tailwind theme

### Root Cause

Desktop wraps ui-vite's Layout inside DesktopLayout, which:
- Applies conflicting styles (radial gradient background)
- Uses CSS modules instead of Tailwind
- May be preventing Layout's MainSidebar from rendering properly
- Doesn't provide access to ui-vite's public assets

This is **not** a browser compatibility issue - both use the same React + Vite stack. It's an architectural layering problem.

## Design

### Fix Strategy

**Option 1: Minimal Layout Nesting** (Recommended)
- Keep DesktopLayout minimal - only title bar
- Let ui-vite Layout handle everything else
- Remove conflicting CSS from DesktopLayout
- Ensure MainSidebar renders correctly

**Option 2: Asset Copying**
- Copy ui-vite/public/* to desktop/public/
- Symlink or build script to keep in sync
- More maintenance overhead

**Option 3: Shared Assets Package**
- Extract assets to @leanspec/assets
- Both packages depend on it
- Cleanest long-term solution

### Recommended Approach

1. **Fix DesktopLayout styles** - Remove background overrides, minimal wrapper
2. **Add public assets directory** - Copy essential assets from ui-vite
3. **Verify Layout rendering** - Ensure MainSidebar, Navigation render correctly
4. **Visual parity check** - Compare desktop vs web side-by-side

## Plan

### Phase 1: Investigate Layout Rendering
- [ ] Debug why MainSidebar isn't showing in desktop
- [ ] Check if DesktopLayout's styles are hiding it
- [ ] Verify Layout component is being imported correctly
- [ ] Check browser console for errors

### Phase 2: Fix DesktopLayout Wrapper
- [ ] Update `desktop-layout.module.css` to remove background overrides
- [ ] Make DesktopLayout a minimal container (header + content only)
- [ ] Ensure it doesn't interfere with ui-vite's flex layout
- [ ] Test that MainSidebar becomes visible

### Phase 3: Add Public Assets
- [ ] Create `packages/desktop/public/` directory
- [ ] Copy logos from ui-vite/public/
- [ ] Copy icons (github-mark, etc.)
- [ ] Update `index.html` to reference favicon
- [ ] Add build script to keep assets in sync (optional)

### Phase 4: Style Alignment
- [ ] Remove custom CSS modules where ui-vite provides equivalent
- [ ] Ensure desktop uses same Tailwind config as ui-vite
- [ ] Verify dark theme works correctly
- [ ] Check responsive behavior

### Phase 5: Visual Verification
- [ ] Run desktop and web side-by-side
- [ ] Compare all pages (Dashboard, Specs, Detail, Stats, Dependencies)
- [ ] Verify Navigation and MainSidebar are identical
- [ ] Check project switching works in both
- [ ] Test theme toggle in both

## Test

### Visual Parity Checks
- [ ] Desktop shows MainSidebar (same as web)
- [ ] Desktop shows Navigation bar (same as web)
- [ ] Logo and icons display correctly in desktop
- [ ] Dark theme matches between desktop and web
- [ ] Layout is responsive (try resizing window)

### Functional Tests
- [ ] All pages render correctly
- [ ] Navigation between pages works
- [ ] Sidebar navigation works
- [ ] Project switcher works
- [ ] Search works
- [ ] Theme toggle works

### No Regressions
- [ ] Desktop-specific features still work (title bar, window controls)
- [ ] Projects manager modal still works
- [ ] Tauri commands still work
- [ ] Build succeeds: `pnpm build:desktop`
- [ ] Bundle size doesn't significantly increase

## Notes

### Key Files to Modify

**Desktop Package:**
- `packages/desktop/src/components/DesktopLayout.tsx` - Simplify wrapper
- `packages/desktop/src/components/desktop-layout.module.css` - Remove overrides
- `packages/desktop/src/App.tsx` - Verify Layout import and usage
- `packages/desktop/index.html` - Add favicon/icon references
- `packages/desktop/public/` - New directory for assets

**Reference Files (ui-vite):**
- `packages/ui-vite/src/components/Layout.tsx` - The correct Layout implementation
- `packages/ui-vite/public/` - Assets to copy

### Debugging Steps

1. **Check if Layout is rendering:**
   ```tsx
   console.log('Layout rendering', { mobileSidebarOpen, currentProject });
   ```

2. **Check MainSidebar:**
   ```tsx
   console.log('MainSidebar props', { mobileOpen, onMobileClose });
   ```

3. **Inspect DOM:**
   - Open DevTools
   - Look for MainSidebar elements
   - Check if they're hidden (display:none, visibility:hidden)
   - Check z-index and positioning

4. **CSS Conflicts:**
   - Check if `.desktop` class is overriding Tailwind
   - Look for `overflow:hidden` preventing scrolling
   - Check flexbox layout is working

### Related Specs

- 204-desktop-ui-vite-integration - Original integration work
- 193-frontend-ui-parity - Goal to match Next.js and Vite UI
- 203-ui-vite-layout-router-alignment - Layout structure work