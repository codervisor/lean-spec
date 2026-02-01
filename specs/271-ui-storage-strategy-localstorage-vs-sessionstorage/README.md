---
status: planned
created: 2026-02-01
priority: medium
tags:
- ui
- ux
- architecture
created_at: 2026-02-01T06:59:09.299946Z
updated_at: 2026-02-01T06:59:09.299946Z
---

# UI Storage Strategy: localStorage vs sessionStorage

## Overview

Currently, UI preferences and settings are persisted using **both** sessionStorage and localStorage inconsistently:

### Current State

**sessionStorage** (clears on tab/browser close):
- Sidebar filters: statusFilter, priorityFilter, tagFilter
- showArchived flag
- scroll position
- viewMode (list vs tree hierarchy)

**localStorage** (persists across sessions):
- SpecsPage preferences: viewMode, sortBy, filters, validation flags
- Sidebar collapsed state

### Problem

**Inconsistent user experience**: Users lose their carefully curated filters and scroll positions whenever they close the browser or tab, but other preferences persist. This creates confusion about which settings are "sticky" and which aren't.

**User expectation mismatch**: Modern web apps typically persist UI preferences across sessions. Users expect their filter settings to remain when they return to the app.

### Why Now?

- We're building a project management tool where **workflow continuity** matters
- Users are likely to close the browser and return later in the same context
- The current mixed approach creates unpredictable UX

## Design

### Option 1: Migrate Everything to localStorage (Recommended)

**Pros:**
- ✅ Consistent, predictable behavior
- ✅ Matches modern app expectations (VS Code, GitHub, Linear, etc.)
- ✅ Better workflow continuity
- ✅ Users can close/reopen browser without losing context
- ✅ Simpler mental model

**Cons:**
- ❌ Preferences persist across different projects (acceptable - simplicity wins)
- ❌ No automatic "fresh start" when opening new tab

**Implementation:**
- Replace `sessionStorage` with `localStorage` for all UI preferences
- Use **global** storage keys (no per-project namespacing)
- Rationale: Users likely want consistent filter preferences across all projects
- Keep scroll position as sessionStorage (transient by nature)

### Option 2: Keep sessionStorage (Status Quo)

**Pros:**
- ✅ Fresh start per session (some users might prefer this)
- ✅ No cross-contamination between tabs
- ✅ Automatic cleanup

**Cons:**
- ❌ Frustrating for users who close browser and lose filters
- ❌ Inconsistent with localStorage preferences
- ❌ Doesn't match user expectations for PM tools

### Option 3: Hybrid with User Control

**Pros:**
- ✅ Gives users choice
- ✅ Could toggle "remember preferences" setting

**Cons:**
- ❌ Adds complexity
- ❌ UI clutter
- ❌ Most users won't understand the difference
- ❌ Over-engineering

### Decision

**Recommendation: Option 1 (Migrate to localStorage)**

Rationale:
1. **User expectation alignment**: PM tools should remember filtered views
2. **Consistency**: All preferences behave the same way
3. **Simplicity**: No mental overhead about which settings persist
4. **Workflow optimization**: Users can pick up where they left off

### Technical Considerations

**Storage keys to migrate:**
```typescript
// Current sessionStorage keys → localStorage
'statusFilter' → 'leanspec:filters:status'
'priorityFilter' → 'leanspec:filters:priority'
'tagFilter' → 'leanspec:filters:tags'
'showArchived' → 'leanspec:ui:showArchived'
'groupByParent' → 'leanspec:ui:hierarchyView' (already in both!)
'scroll' → keep as sessionStorage? (scroll is transient)
```

**Project-scoped storage:**
```typescript
// Option A: Global across all projects
localStorage.setItem('leanspec:filters:status', ...)

// Option B: Per-project (recommended for filters)
localStorage.setItem(`leanspec:${projectId}:filters:status`, ...)
```

**Migration strategy:**
- Read from sessionStorage first (backward compat)
- Write to localStorage
- Remove sessionStorage keys after read
- No breaking changes for users

## Plan

- [ ] Audit all storage usage in UI codebase
- [ ] Design storage key namespace convention
- [ ] Decide: global vs project-scoped preferences
- [ ] Decide: should scroll position persist? (probably not)
- [ ] Create storage utilities module
- [ ] Migrate SpecsNavSidebar to localStorage
- [ ] Migrate SpecsPage to use shared utilities
- [ ] Add migration path from sessionStorage → localStorage
- [ ] Test: filters persist after browser restart
- [ ] Test: multi-project scenarios
- [ ] Update documentation if needed

## Test

- [ ] Close browser, reopen → filters are restored
- [ ] Switch projects → filters are project-specific (if scoped)
- [ ] Clear localStorage → app works with defaults
- [ ] Multiple tabs → behavior is consistent
- [ ] Desktop app → preferences persist correctly

## Notes

### Similar Apps Behavior

- **VS Code**: localStorage for all preferences
- **GitHub**: localStorage for UI state
- **Linear**: localStorage for filters and views
- **Notion**: localStorage for workspace preferences

### Edge Cases

1. **Storage quota**: localStorage has ~5-10MB limit, we use <1KB
2. **Privacy mode**: localStorage works in incognito (cleared on close)
3. **Cross-device**: No sync (users must set preferences per device)
4. **Migration**: Users with active sessionStorage will auto-migrate

### Scroll Position

Special consideration: scroll position is **highly transient**. Recommend keeping as sessionStorage or not persisting at all, because:
- Less useful across sessions (specs list changes)
- Can be confusing if user returns and sees middle of list
- Most apps don't persist scroll position

### Alternative: IndexedDB?

Not needed. localStorage is sufficient for:
- Simple key-value pairs
- Small data size
- Synchronous access
- Wide browser support