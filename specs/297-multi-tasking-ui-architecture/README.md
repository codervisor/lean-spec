---
status: planned
created: 2026-02-03
priority: medium
created_at: 2026-02-03T13:59:37.114510Z
updated_at: 2026-02-03T13:59:37.114510Z
---
# Multi-Tasking UI Architecture (Umbrella)

## Overview

Comprehensive multi-tasking capabilities for LeanSpec UI and Desktop app, enabling efficient management of multiple specs, projects, and AI sessions simultaneously.

**Problem Statement:**
The current UI is fundamentally single-page/single-window:
- Can only view one spec at a time
- Cannot compare specs side-by-side
- Cannot monitor multiple AI sessions across projects
- Context switching requires navigation away from current work
- No persistent tabs for frequently accessed specs
- Power users lack keyboard-first navigation

**Why Now:**
- AI orchestration platform (spec 168) makes multi-session monitoring critical
- Desktop app (spec 148) provides native foundation for advanced multi-tasking
- Users managing 5+ projects with concurrent AI sessions need better UX
- Multi-project switching (spec 109) is complete, but true multi-tasking is missing

**Target Users:**
- Developers running multiple AI coding sessions
- Consultants/freelancers juggling multiple client projects
- Teams comparing specs for review or planning
- Power users who prefer keyboard-driven workflows

## Design

### Multi-Tasking Dimensions

```
┌─────────────────────────────────────────────────────────────────┐
│                  MULTI-TASKING DIMENSIONS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. TABBED NAVIGATION (Priority 1)                              │
│     └─ Browser-style tabs for specs, sessions, pages            │
│     └─ Persistent across sessions, keyboard shortcuts           │
│                                                                  │
│  2. SPLIT VIEW (Priority 2)                                     │
│     └─ Compare two specs/sessions side-by-side                  │
│     └─ Spec on left, session logs on right (common workflow)    │
│                                                                  │
│  3. QUICK NAVIGATION (Priority 3)                               │
│     └─ Cmd/Ctrl+K quick switcher                                │
│     └─ Fuzzy search across specs, sessions, projects            │
│                                                                  │
│  4. MULTI-SESSION DASHBOARD (Priority 4)                        │
│     └─ Monitor all running AI sessions at once                  │
│     └─ Cross-project session status view                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### UI Layout Evolution

**Current Single-View Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Project ▼]  LeanSpec                                       │
├─────────────┬───────────────────────────────────────────────┤
│  🏠 Home    │                                               │
│  📋 Specs   │     [Single Content View]                     │
│  🔗 Deps    │                                               │
│  📊 Stats   │                                               │
│  🤖 Sessions│                                               │
└─────────────┴───────────────────────────────────────────────┘
```

**Target Multi-Tasking Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│ [Project ▼]  LeanSpec                              [⌘K]    │
├─────────────────────────────────────────────────────────────┤
│ [Spec 168×] [Spec 244×] [Sessions×] [+]                    │ ← Tab Bar
├─────────────┬───────────────────────────────────────────────┤
│  🏠 Home    │ ┌─────────────────┬─────────────────────────┐ │
│  📋 Specs   │ │   Spec View     │   Session Logs          │ │ ← Optional Split
│  🔗 Deps    │ │                 │                         │ │
│  📊 Stats   │ │                 │                         │ │
│  🤖 Sessions│ └─────────────────┴─────────────────────────┘ │
└─────────────┴───────────────────────────────────────────────┘
```

### Implementation Priority

**Phase 1: Tabbed Navigation** (Child Spec)
- Foundation for all multi-tasking
- Enables opening multiple specs/pages without losing context
- Familiar browser pattern

**Phase 2: Split View** (Child Spec)
- Build on tabs - split a tab into two panes
- Primary use case: spec + session logs side-by-side
- Secondary: compare two specs

**Phase 3: Quick Switcher** (Child Spec)
- Cmd/Ctrl+K for fast navigation
- Fuzzy search across specs, sessions, projects
- Power user productivity

**Phase 4: Multi-Session Dashboard** (Child Spec)
- New page type: all running sessions across projects
- Real-time status updates
- Quick controls (pause, stop, view details)

## Plan

This is an umbrella spec. Implementation details in child specs:

### Child Specs

| Priority | Spec | Description |
|----------|------|-------------|
| 1 | 298-browser-style-tabs | Tabbed navigation system |
| 2 | 299-split-view-mode | Side-by-side spec/session viewing |
| 3 | 300-quick-switcher-cmd-k | Keyboard-driven command palette |
| 4 | 301-multi-session-dashboard | Cross-project AI session monitoring |

### Coordination

- Each child spec is independently implementable
- Tabs (298) must come first (foundation for split view)
- Quick switcher (300) and multi-session dashboard (301) can parallelize
- Split view (299) depends on tabs (298)

## Test

Testing delegated to child specs. Umbrella validation:

- [ ] All child specs complete
- [ ] Features work together cohesively
- [ ] No performance regression with tabs + split + sessions
- [ ] Desktop and web UI parity

## Notes

### Supersedes Spec 163

This spec replaces 163-multi-tasking-ui-enhancements which was archived because:
- Many features from 163 are now implemented differently (project sidebar → dropdown)
- AI orchestration context (spec 168) changes priorities
- Need clearer scope separation via child specs

### Design Principles

1. **Browser-like UX**: Tabs, keyboard shortcuts, history - familiar patterns
2. **Non-destructive**: Don't lose work when navigating
3. **Progressive disclosure**: Simple by default, power features opt-in
4. **Cross-platform**: Web and Desktop parity (within Tauri capabilities)

### Related Specs

**Dependencies:**
- 148-leanspec-desktop-app (Complete) - Desktop foundation
- 109-local-project-switching (Complete) - Multi-project context
- 168-leanspec-orchestration-platform (In Progress) - AI session context
- 244-session-ui-enhancement (Complete) - Session pages to open in tabs

**Archived/Superseded:**
- 163-multi-tasking-ui-enhancements - Archived, replaced by this umbrella
