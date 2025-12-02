---
status: complete
created: '2025-11-17'
tags: []
priority: high
created_at: '2025-11-17T14:22:14.161Z'
updated_at: '2025-11-17T14:54:01.282Z'
completed_at: '2025-11-17T14:54:01.282Z'
completed: '2025-11-17'
transitions:
  - status: complete
    at: '2025-11-17T14:54:01.282Z'
---

# Fix Sidebar Scroll Position Drift

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

## Overview

The specs navigation sidebar in the web package experiences scroll position drift when navigating between specs. The list jumps or loses its scroll position during navigation, causing poor UX especially with large spec lists.

**Root Cause**: Multiple performance optimization attempts revealed the issue stems from:
1. Store design causing unnecessary re-renders - `updateSidebarScrollTop` spreads state, triggering all subscribers even when only `scrollTop` changes
2. Component subscribing to entire store state rather than specific slices
3. `cachedSpecs` creating new references on every render before memoization
4. Complex interaction between react-window's internal scroll management and external state updates

**Why Now**: This affects daily workflow navigation and has resisted multiple quick fixes. Needs proper investigation and testing.

## Design

### Investigation Completed
- Verified React 19 `useSyncExternalStore` requirements: unstable server snapshot references were causing infinite loops
- Determined global store broadcasts on every scroll write were the primary source of drift
- Confirmed `react-window` retains internal scroll state reliably when left to manage DOM scroll positions
- Observed that auto-anchoring logic was running too late, producing flicker during hydration

### Final Approach
1. **Selector-driven store reads** – keep existing selector hooks but ensure server snapshots are stable constants
2. **Isolate scroll persistence** – keep global persistence value, but stop emitting change events when the value updates
3. **Component-local scroll management** – mirror scrollTop in refs, throttle writes with `requestAnimationFrame`, and restore via `useIsomorphicLayoutEffect`
4. **Controlled auto-anchoring** – only scroll the virtual list on the first render (when no stored offset exists) and guard future attempts with refs

### Current Optimizations Applied
- Wrapped List in React.memo
- Memoized RowComponent with useCallback
- Memoized cachedSpecs
- Added selector-based store hooks (useSpecsSidebarSpecs, useSpecsSidebarActiveSpec)
- Separate listener sets per state slice

## Plan

- [ ] Add detailed logging to track re-render causes (component, store, props changes)
- [x] Profile with React DevTools to identify actual render triggers
- [x] Test removing all scroll management code to establish baseline behavior (browser-managed scroll proved stable)
- [x] Implement proper selector pattern with verified render prevention
- [x] Test with large spec lists (100+ items) to verify performance
- [x] Document final solution and architecture decision

### Implementation Summary

- Updated `useSyncExternalStore` server snapshot for specs to return a memoized empty array, eliminating React 19 infinite-loop warnings.
- Prevented `updateSidebarScrollTop` from emitting global store changes so unrelated subscribers no longer re-render on scroll.
- Added scroll persistence effect in `SpecsNavSidebar` that restores the cached offset via `useIsomorphicLayoutEffect` and throttled listeners.
- Introduced guarded auto-anchoring that only runs on the initial render when no stored offset exists, ensuring refreshed pages center the active spec without affecting later interactions.
- Added retry logic for auto-anchoring to wait until the virtualized list ref is ready, removing flicker.

### Validation

- Navigating between specs preserves scroll position without jumps.
- Filtering, collapsing, and mobile toggles retain the current offset.
- Rapid spec changes and scrolling back to the top no longer trigger downward drift.
- Browser refresh loads with the active spec centered when no previous scroll position was saved.
- Large spec lists (>100 entries) scroll smoothly with no lag or unexpected reflows.

## Test

- [x] Navigate between specs - scroll position should remain stable
- [x] Filter specs while scrolled - list should not jump
- [x] Open/close mobile sidebar - no scroll position loss
- [x] Rapid navigation (click multiple specs quickly) - no drift or jumping
- [x] Large spec lists (100+) - smooth scrolling without lag
- [x] Browser refresh - reasonable scroll restoration behavior

## Notes

**Attempted Fixes (Session 1)**:
- Removed scroll restoration on navigation
- Removed scroll tracking callbacks
- Wrapped List in memo
- Memoized cachedSpecs to prevent reference changes
- Implemented selector-based store subscriptions

**Key Learning**: The issue persisted despite multiple optimizations, suggesting the problem is architectural rather than a simple memoization issue. The store design fundamentally causes re-renders when any state changes, even with selector hooks.

**Next Steps**: Monitor for regressions when introducing future sidebar features (e.g., grouping, pinning). Add logging only if new drift reports appear.
