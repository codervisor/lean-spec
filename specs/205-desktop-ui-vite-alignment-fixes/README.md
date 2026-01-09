---
status: complete
created: 2026-01-09
priority: high
tags:
- desktop
- ui
- bug-fix
- ui-vite
depends_on:
- 204-desktop-ui-vite-integration
- 203-ui-vite-layout-router-alignment
- 193-frontend-ui-parity
created_at: 2026-01-09T01:44:39.910858250Z
updated_at: 2026-01-09T02:21:59.977272274Z
completed_at: 2026-01-09T02:21:59.977272274Z
transitions:
- status: in-progress
  at: 2026-01-09T02:17:59.872027977Z
- status: complete
  at: 2026-01-09T02:21:59.977272274Z
---

## Overview

Following spec 204's integration of @leanspec/ui-vite into @leanspec/desktop, there are critical rendering issues where desktop looks significantly different from the web version:

**Problems Identified:**
1. **Missing MainSidebar** - The main navigation sidebar from ui-vite is not rendering in desktop
2. **Missing Assets** - Logo files, icons, and other public assets are not available
3. **Layout Conflicts** - DesktopLayout wrapper interferes with ui-vite's Layout component
4. **Different Styling** - CSS modules with custom gradients override ui-vite's Tailwind theme

### Root Cause

Desktop is layering custom global + wrapper styles on top of ui-vite, and desktop does not currently ship ui-vite's public assets.

What we know from the current code:

- Desktop applies global overrides in `packages/desktop/src/styles.css`:
   - `html, body` and `#root` are `overflow: hidden`, which prevents the scroll behavior ui-vite expects.
   - hard-coded background + font are applied at `:root`/`html, body`, overriding Tailwind theme tokens.
- Desktop wraps ui-vite's `Layout` with `DesktopLayout` (`packages/desktop/src/components/DesktopLayout.tsx`), and `desktop-layout.module.css` adds:
   - a radial gradient background
   - `overflow: hidden` on both wrapper + content
- ui-vite `Navigation` expects assets at absolute paths like `/logo-with-bg.svg` and `/github-mark.svg`, but desktop does not have a `public/` directory populated with these assets.

Open questions to validate during implementation:

- Is the `MainSidebar` actually not rendering, or is it being clipped/covered due to desktop overflow/z-index/layout constraints?
- Are there any runtime errors preventing layout state from initializing?

This is **not** a browser compatibility issue (both are React + Vite). It's primarily a layering + asset packaging issue.

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
- [x] Confirm whether `MainSidebar` is present in the DOM (DevTools Elements) and whether it is `display:none` / offscreen / clipped
- [x] Check whether any ancestor `overflow: hidden` is clipping the sidebar or main content
- [x] Check z-index stacking (desktop title bar vs ui-vite navigation vs sidebar)
- [x] Verify there are no runtime errors (DevTools Console)
- [x] Verify missing assets are 404-ing (DevTools Network)

**Commands to reproduce:**

- From repo root: `pnpm dev:desktop`
- Optional web compare: `pnpm dev:web`

### Phase 2: Fix DesktopLayout Wrapper
- [x] Update `packages/desktop/src/components/desktop-layout.module.css` to remove background overrides and avoid `overflow: hidden` unless strictly required
- [x] Keep `DesktopLayout` as a minimal shell (title bar + content), and let ui-vite `Layout` own the page layout
- [x] Ensure desktop does not block scrolling (ui-vite pages should scroll naturally)
- [x] Verify `MainSidebar` is visible at desktop window size and navigation works

**Note:** position: sticky can behave unexpectedly when an ancestor creates an overflow context; prefer not to introduce overflow contexts above ui-vite layout.

### Phase 3: Add Public Assets
- [x] Create `packages/desktop/public/` directory
- [x] Copy required assets from `packages/ui-vite/public/`:
   - [x] `favicon.ico`
   - [x] `logo-with-bg.svg`
   - [x] `logo-dark-bg.svg`
   - [x] `github-mark.svg`
   - [x] `github-mark-white.svg`
- [x] Update `packages/desktop/index.html` to include favicon (`<link rel="icon" href="/favicon.ico" />`)
- [x] Optional: add a `pnpm` script to sync assets from ui-vite to desktop to avoid drift

### Phase 4: Style Alignment
- [x] Remove or minimize desktop-only global styling overrides in `packages/desktop/src/styles.css` that conflict with Tailwind theme tokens
- [x] Ensure dark/light theme parity (no hard-coded background/foreground overrides)
- [x] Verify responsive behavior still matches ui-vite (sidebar collapse + mobile sidebar overlay)

### Phase 5: Visual Verification
- [x] Run desktop and web side-by-side
- [x] Compare all pages (Dashboard, Specs, Detail, Stats, Dependencies)
- [x] Verify Navigation and MainSidebar are identical
- [x] Check project switching works in both
- [x] Test theme toggle in both

## Test

### Visual Parity Checks
- [x] Desktop shows MainSidebar (same breakpoint behavior as web)
- [x] Desktop shows Navigation bar (same as web)
- [x] Logo and icons display correctly in desktop (no broken images / no 404s)
- [x] Dark theme matches between desktop and web
- [x] Layout is responsive (try resizing window)

### Functional Tests
- [x] All pages render correctly
- [x] Navigation between pages works
- [x] Sidebar navigation works
- [x] Project switcher works
- [x] Search works
- [x] Theme toggle works

### No Regressions
- [x] Desktop-specific features still work (title bar, window controls)
- [x] Projects manager modal still works
- [x] Tauri commands still work
- [x] Build succeeds: `pnpm build:desktop`
- [x] Bundle size doesn't significantly increase

## Notes

### Key Files to Modify

**Desktop Package:**
- `packages/desktop/src/components/DesktopLayout.tsx` - Simplify wrapper
- `packages/desktop/src/components/desktop-layout.module.css` - Remove overrides
- `packages/desktop/src/styles.css` - Remove conflicting global styles / overflow lock
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