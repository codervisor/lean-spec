---
status: planned
created: '2025-11-17'
tags: []
priority: high
created_at: '2025-11-17T14:22:14.161Z'
---

# Fix Sidebar Scroll Position Drift

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-17

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

### Investigation Needed
- Profile actual re-render causes using React DevTools
- Test if removing scroll persistence entirely improves stability
- Consider if react-window should manage its own scroll state without external interference
- Evaluate whether selector-based store subscriptions actually prevent re-renders in practice

### Potential Approaches
1. **Remove scroll management entirely** - Let browser handle natural scroll position
2. **Fix store subscription model** - Implement proper selector pattern that truly prevents re-renders
3. **Separate scroll state** - Move scroll position out of global store into component-local state
4. **Use react-window imperatively** - Access scroll position via ref instead of tracking in state

### Current Optimizations Applied
- Wrapped List in React.memo
- Memoized RowComponent with useCallback
- Memoized cachedSpecs
- Added selector-based store hooks (useSpecsSidebarSpecs, useSpecsSidebarActiveSpec)
- Separate listener sets per state slice

## Plan

- [ ] Add detailed logging to track re-render causes (component, store, props changes)
- [ ] Profile with React DevTools to identify actual render triggers
- [ ] Test removing all scroll management code to establish baseline behavior
- [ ] Implement proper selector pattern with verified render prevention
- [ ] Test with large spec lists (100+ items) to verify performance
- [ ] Document final solution and architecture decision

## Test

- [ ] Navigate between specs - scroll position should remain stable
- [ ] Filter specs while scrolled - list should not jump
- [ ] Open/close mobile sidebar - no scroll position loss
- [ ] Rapid navigation (click multiple specs quickly) - no drift or jumping
- [ ] Large spec lists (100+) - smooth scrolling without lag
- [ ] Browser refresh - reasonable scroll restoration behavior

## Notes

**Attempted Fixes (Session 1)**:
- Removed scroll restoration on navigation
- Removed scroll tracking callbacks
- Wrapped List in memo
- Memoized cachedSpecs to prevent reference changes
- Implemented selector-based store subscriptions

**Key Learning**: The issue persisted despite multiple optimizations, suggesting the problem is architectural rather than a simple memoization issue. The store design fundamentally causes re-renders when any state changes, even with selector hooks.

**Next Session**: Start fresh with profiling tools before attempting more fixes. Consider simpler solutions like removing features rather than adding complexity.
