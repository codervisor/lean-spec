---
status: complete
created: '2025-11-20'
tags:
  - ui
  - ux
  - lessons-learned
priority: medium
created_at: '2025-11-20T02:27:35.059Z'
completed_at: '2025-11-20T02:30:00.000Z'
updated_at: '2025-11-20T02:29:11.195Z'
completed: '2025-11-20'
---

# UI/UX Refinements - Spec Detail & List Views

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-20 · **Tags**: ui, ux, lessons-learned

**Project**: lean-spec  
**Team**: Core Development

## Overview

This spec documents the refinements made to the Spec Detail page and Specs List/Board views to improve navigation, readability, and layout flexibility. The changes focus on Table of Contents (TOC) accessibility, precise anchor navigation, and enhanced list management controls.

### Key Improvements
1.  **Responsive TOC Layout**: Replaced the floating button with a persistent sidebar on large screens.
2.  **Precise Anchor Navigation**: Fixed offset issues caused by sticky headers.
3.  **Visual Polish**: Implemented auto-hiding scrollbars to reduce visual clutter.
4.  **Specs List Enhancements**: Added "Wide Mode" toggle and improved filter layout.

## Current State

### 1. Hybrid TOC Layout (Spec Detail)
- **Desktop (≥1280px)**: A sticky right sidebar displays the TOC. This utilizes the available screen real estate and allows users to scan the document structure without clicking a button.
- **Mobile/Tablet (<1280px)**: Retains the floating action button (FAB) to open the TOC in a dialog, preserving screen space for content.

### 2. Dynamic Scroll Padding (Spec Detail)
- **Problem**: Sticky headers obscured section titles when navigating to anchors.
- **Solution**: Implemented dynamic `scroll-padding-top` calculation in `SpecDetailClient`.
  - Calculates the exact height of the sticky header (navbar + spec header).
  - Applies this value to `document.documentElement.style.scrollPaddingTop`.
  - Updates on window resize and content changes.
  - **Fine-tuning**: Adjusted the offset (Header Height - 12px) to align the text baseline perfectly, accounting for heading margins.

### 3. Auto-Hiding Scrollbars
- **Problem**: The TOC sidebar introduced a second vertical scrollbar next to the main page scrollbar, creating visual noise.
- **Solution**: Created a `.scrollbar-auto-hide` utility class.
  - The scrollbar is invisible by default.
  - A thin, subtle thumb appears only on hover.
  - Applied to the TOC sidebar container.

### 4. Specs List & Board Enhancements
- **Wide Mode Toggle**: Added a maximize/minimize button to toggle the container width between `max-w-7xl` and `w-full`. This is particularly useful for the Kanban board view with many columns.
- **Improved Header Layout**:
  - Reorganized filters and search into a scrollable row for better mobile responsiveness.
  - Updated View Switcher (List/Board) to a segmented control style.
- **View Persistence**: View mode preference (List vs Board) is now persisted in `localStorage` and synchronized with the URL.

## Lessons Learned

### Sticky Headers & Anchor Navigation
- **`scroll-padding-top` vs `scroll-margin-top`**: 
  - `scroll-margin-top` on individual headings is brittle when header heights change (e.g., wrapping tags).
  - `scroll-padding-top` on the `<html>` element is superior as it can be dynamically updated via JavaScript to match the exact current header height.
- **Navigation Method**: 
  - `element.scrollIntoView({ behavior: 'smooth', block: 'start' })` respects `scroll-padding-top` automatically.
  - Manual `window.scrollTo` calculations are error-prone and should be avoided when native APIs suffice.

### Visual Refinements
- **Scrollbar UX**: "Double scrollbars" are a common UI smell in sidebars. Auto-hiding them is a clean pattern that maintains functionality without clutter.
- **Offset Tuning**: Mathematical exactness (Header Height + Padding) doesn't always equal visual correctness. Small adjustments (e.g., `-12px`) are often needed to account for line-heights and margins.

## Implementation Details

### Files Modified
- `packages/ui/src/components/spec-detail-client.tsx`: Layout changes, scroll padding logic.
- `packages/ui/src/components/table-of-contents.tsx`: Refactored to support both Sidebar and Dialog modes.
- `packages/ui/src/app/globals.css`: Added `.scrollbar-auto-hide` utility.
- `packages/ui/src/app/specs/specs-client.tsx`: Added Wide Mode, updated header layout, view persistence.

### Code Snippet: Dynamic Scroll Padding
```typescript
// Handle scroll padding for sticky header
React.useEffect(() => {
  const updateScrollPadding = () => {
    const navbarHeight = 56;
    let offset = navbarHeight;

    if (window.innerWidth >= 1024 && headerRef.current) {
      offset += headerRef.current.offsetHeight;
      // Reduce offset slightly to avoid visual gap due to heading margins
      offset -= 12;
    }

    document.documentElement.style.scrollPaddingTop = `${offset}px`;
  };
  // ... observers and event listeners
}, [spec, tags]);
```

## Plan

- [x] Refactor `TableOfContents` to support sidebar mode
- [x] Update `SpecDetailClient` layout for desktop sidebar
- [x] Implement dynamic `scroll-padding-top` logic
- [x] Add auto-hiding scrollbar styles
- [x] Implement Wide Mode in `SpecsClient`
- [x] Refine Specs List header layout
- [x] Verify navigation precision

## Test

- [x] **Desktop View**: TOC appears as sidebar.
- [x] **Mobile View**: TOC appears as floating button.
- [x] **Anchor Click**: Page scrolls smoothly to section.
- [x] **Alignment**: Section title is not obscured by header and has correct visual spacing.
- [x] **Scrollbar**: Sidebar scrollbar is hidden until hovered.
- [x] **Wide Mode**: Toggling expands the container to full width.
- [x] **View Persistence**: Refreshing the page remembers the last selected view (List/Board).
