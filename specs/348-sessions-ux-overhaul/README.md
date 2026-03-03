---
status: in-progress
created: 2026-03-03
priority: high
tags:
- ui
- sessions
- ux
- frontend
- navigation
created_at: 2026-03-03T02:01:58.130385Z
updated_at: 2026-03-03T03:03:53.238492Z
transitions:
- status: in-progress
  at: 2026-03-03T03:03:53.238492Z
---
# Sessions UX Overhaul: Simplified Navigation & Interaction

## Overview

### Problem

The current sessions UX suffers from fragmentation and over-complexity that makes it hard to use:

1. **Too many access paths**: Sessions are reachable via (a) nav sidebar → Sessions page, (b) spec detail header "Sessions N" button → drawer, (c) persistent bottom-right "New Session" button → inline form. Three different surfaces with different interaction models.

2. **Disjointed navigation**: The Sessions page (`/sessions`) is a standalone flat list that requires navigating away from spec context. Session detail pages (`/sessions/:id`) are another full page navigation away.

3. **Session-to-spec relationship is unclear**: The sessions list page shows sessions flat. Users must manually filter to understand which sessions belong to which spec.

4. **Bottom-right "New Session" form is bare**: The persistent New Session button opens a minimal bottom panel with raw fields (Spec ID text input, instructions textarea, runner/mode dropdowns). It feels disconnected from spec context and doesn't leverage the prompt-first pattern from spec 337.

5. **Log/detail view is heavyweight**: Checking session logs requires navigating to a separate detail page — full context switch.

6. **Status visibility is poor**: No at-a-glance session status on specs in the sidebar list.

### Key Constraint: Sessions Are Not Always 1:1 With Specs

Sessions don't map cleanly to a single spec:
- **Multi-spec sessions**: One session implementing multiple specs together
- **Spec-less sessions**: General coding, refactoring, exploration — no spec at all
- **Exploratory sessions**: Research/prototyping that pre-dates any spec

Any solution must treat specs as *optional context* attached to sessions, not the sole organizing principle.

### Design Principle

**Sessions are first-class workflows; specs are optional context.** The primary surface must work equally well with zero, one, or many specs attached.

## Current Layout Reference

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] [Breadcrumbs]    [⌘K Search] [Layout] [Lang] [Theme] [Chat]│ ← Top bar
├────────┬──────────┬───────────────────────────────┬─────────────────┤
│ Nav    │ Specs    │ Spec Detail Header:           │ AI Chat         │
│ Links  │ Sidebar  │ [Status▾] [Priority▾] [Tags] │ Panel           │
│        │          │ [Timeline][Rels][Sessions][Foc]│                 │
│ Home   │ Search   ├───────────────────────────────│ Search/History  │
│ Specs  │ #30 ...  │ Spec markdown content         │ Prompt input    │
│ Session│ #29 ...  │ ...                           │ @spec refs      │
│ Files  │ #28 ...  │                               │ Runner selector │
│ Deps   │ #27 ...  │                               │                 │
│ Stats  │ ...      │                               │                 │
│ ...    │          │                               │ [New Session]   │
│[Collap]│          │                               │ bottom-right btn│
└────────┴──────────┴───────────────────────────────┴─────────────────┘
```

**Key observations from the actual UI:**
- Spec detail has 4 columns: nav sidebar | specs nav | spec content | AI chat
- Header action buttons: View Timeline, Relationships, Sessions (count), Focus
- "New Session" is a persistent bottom-right floating button, not in the header
- Session creation opens a bottom panel overlay with: Spec ID input, instructions, runner, mode
- Sessions page is a simple full-page list with filters (status, runner, mode, spec, started date)
- No session status indicators visible on specs in the sidebar

## Proposed Solutions

### Option A: Sessions Hub — Redesigned Sessions Page

Redesign the sessions page as a smart dashboard grouped by time, not a flat list:

**Changes:**
- Sessions page (`/sessions`) becomes a chronological dashboard: Active → Today → Yesterday → Older
- Each session card shows attached spec(s) as linked chips — zero, one, or many
- Inline log expansion — click `[Logs ▾]` to expand logs without navigating to `/sessions/:id`
- Spec-less sessions are first-class, shown without spec chips
- "Sessions" button in spec detail header pre-filters the hub to `spec:#30`
- Bottom-right "New Session" button uses the prompt-first pattern (spec 337), with optional spec attachment

**Layout:**
```
┌────────┬──────────────────────────────────────────────┬──────────────┐
│ Nav    │ Sessions                    [+ New] [🔍]     │ AI Chat      │
│        │ ──────────────────────────────────────────── │              │
│ Home   │ ── Active ─────────────────────────────────  │              │
│ Specs  │ ┌─ 🟢 Running · Claude · 3m ──────────────┐ │              │
│ Session│ │ "Implement new session layout..."        │ │              │
│ Files  │ │ #30 #29           ████░░░░  60%          │ │              │
│ ...    │ │                    [Logs ▾] [⏸] [⏹]     │ │              │
│        │ └──────────────────────────────────────────┘ │              │
│        │ ┌─ ⏳ Pending · Copilot ───────────────────┐ │              │
│        │ │ "Refactor auth module" (no specs)        │ │              │
│        │ │                    [▶ Start] [✕]         │ │              │
│        │ └──────────────────────────────────────────┘ │              │
│        │                                              │              │
│        │ ── Today ──────────────────────────────────  │              │
│        │ ✅ Claude · 12m · $0.45 · "Wire events" #29 │              │
│        │ ✅ Codex · 5m · "General refactor"           │              │
│        │ ❌ Claude · 2m · "DB migration" #28  [Retry] │              │
│        │                                              │              │
│        │ ── Yesterday ───────────── [View All →]      │              │
│        │ ✅ ✅ ✅ (3 sessions)                         │              │
└────────┴──────────────────────────────────────────────┴──────────────┘
```

**Pros:** Works for all session types (0/1/N specs), single surface, preserves current nav structure
**Cons:** Still navigates away from spec detail

---

### Option B: Hub + Spec Quick Panel

Option A's hub as home base, plus a compact inline panel on spec detail pages:

**Changes:**
- Sessions Hub from Option A
- Spec detail header's "Sessions N" button toggles a collapsible panel below the header (not a drawer)
- Panel shows max 3-5 sessions, compact cards with status and last log line
- "See all in hub →" link to navigate to hub pre-filtered
- Start session directly from the panel

**Spec Detail with Panel Open:**
```
┌────────┬──────────┬───────────────────────────────┬──────────────┐
│ Nav    │ Specs    │ #30 Log Lifecycle Hygiene      │ AI Chat      │
│        │ Sidebar  │ [Status▾] [Priority▾] [Tags]  │              │
│        │          │ [Timeline][Rels][Sessions▲][Foc│              │
│        │          ├───────────────────────────────-│              │
│        │ #30 ...  │ ┌─ Sessions (2) ── [+ New] ─┐ │              │
│        │ #29 ...  │ │ 🟢 Claude · 3m · 60%      │ │              │
│        │ #28 ...  │ │ ✅ Copilot · 8m · $0.35    │ │              │
│        │          │ │        [See all in hub →]  │ │              │
│        │          │ └────────────────────────────┘ │              │
│        │          ├───────────────────────────────-│              │
│        │          │ ## Overview                    │              │
│        │          │ spec content...                │              │
└────────┴──────────┴───────────────────────────────┴──────────────┘
```

**Pros:** Quick session access from spec context, hub handles all edge cases
**Cons:** Two surfaces to maintain (though panel is minimal)

---

### Option C: Persistent Bottom Bar

Global active session bar at the bottom of the app, visible on every page:

**Changes:**
- Replace the floating "New Session" button with a thin status bar
- Shows active/pending session count, total cost, expandable
- Click to expand into a panel showing all active sessions with compact logs
- Sessions Hub still exists for history/management
- Works regardless of which page you're on

**Bottom Bar (collapsed) — always visible:**
```
┌────────┬────────────────────────────────────────┬──────────────┐
│ Nav    │ (any page content)                     │ AI Chat      │
│        │                                        │              │
│        │                                        │              │
├────────┴────────────────────────────────────────┴──────────────┤
│ 🟢 2 running  ⏳ 1 pending  ·  $1.27 today    [+ New] [▲]    │
└───────────────────────────────────────────────────────────────-┘
```

**Bottom Bar (expanded):**
```
┌────────┬────────────────────────────────────────┬──────────────┐
│ Nav    │ (page content, vertically compressed)  │ AI Chat      │
├────────┴────────────────────────────────────────┴──────────────┤
│ Active Sessions                              [Hub →] [▼]      │
│ 🟢 Claude · 3m · #30 #29 · "Implement..." · [⏹]              │
│ 🟢 Copilot · 1m · #28 · "Wire events" · [⏹]                  │
│ ⏳ Claude · queued · "Refactor auth" · [▶]                     │
│ ── Logs: Claude session ──────────────── [Switch ▾]            │
│ 14:32:17  Updating imports in index.ts                         │
│ 14:32:18  Running tests...                                     │
│ ▋                                                              │
└────────────────────────────────────────────────────────────────-┘
```

**Pros:** Always visible, no navigation, works on any page, replaces the awkward bottom-right floating button
**Cons:** Takes vertical space, may feel cluttered

## Recommendation

**All three options complement each other** and can be implemented incrementally:

1. **Phase 1 — Option A (Hub)**: Redesign the sessions page as a smart dashboard. This is the foundation — it fixes the flat list problem and makes spec-less/multi-spec sessions first-class.

2. **Phase 2 — Option C (Bottom Bar)**: Replace the floating "New Session" button with a persistent status bar. This gives always-visible session awareness without navigation.

3. **Phase 3 — Option B (Spec Quick Panel)**: Add the inline panel to spec detail. This is a refinement that only makes sense once the hub and bar exist.

## Shared UX Improvements (All Phases)

### 1. One-Click Session Launch
Replace current bottom-right form with prompt-first creation:
- Auto-selects runner (last used or configured default)
- Pre-fills prompt from spec content (if in spec context)
- Supports attaching 0, 1, or multiple specs
- No dialog unless user wants to customize

### 2. Session Status in Specs Sidebar
Add real-time session indicators to spec rows in the left specs nav:
```
#30 Log Lifecycle   17h ago  🟢    ← Green dot = running session
#29 Docker Mode     17h ago  ✅    ← Check = completed recently
#28 Runtime Pull    17h ago        ← No indicator = no session
```

### 3. Inline Log Expansion
Every session card, everywhere, supports `[Logs ▾]` to expand logs inline — no page navigation to `/sessions/:id` needed.

### 4. Live Notifications
Toast when session completes, fails, or needs HITL attention.

### 5. Keyboard Shortcuts
- `Cmd+Shift+S` — Start new session (from current spec context if applicable)
- `Cmd+Shift+L` — Toggle bottom bar / session logs
- `Escape` — Close expanded panels

## Non-Goals

- No changes to session backend/API (purely frontend UX)
- No changes to ACP protocol or log format
- No session comparison or diff features
- No session templates/presets

## Dependencies

- Spec 249 (Unified Sessions UX with Right Drawer) — this spec supersedes it
- Spec 337 (Session Creation UX) — prompt-first pattern reused
- Spec 332 (ACP Sessions UI) — conversation view reused

## Plan

- [x] Review and finalize phased approach
- [x] Phase 1: Redesign sessions page as chronological hub with inline logs
- [x] Phase 1: Add spec chip tags on session cards (0/1/N specs)
- [x] Phase 1: Pre-filter hub from spec detail "Sessions" button
- [x] Phase 2: Replace floating button with persistent bottom status bar
- [x] Phase 2: Implement expandable bottom panel with active sessions + logs
- [ ] Phase 3: Add collapsible sessions panel to spec detail page
- [ ] Add session status indicators to specs nav sidebar
- [ ] Upgrade session creation to prompt-first with multi-spec support
- [ ] Add keyboard shortcuts
- [ ] Add session notifications
- [ ] Update translations (en + zh-CN)

## Test

- [ ] Hub shows all sessions correctly (no-spec, single-spec, multi-spec)
- [ ] Chronological grouping (Active, Today, Yesterday, Older) works
- [ ] Spec filter from spec detail → hub navigation works
- [ ] Inline log expansion works with live streaming
- [ ] Bottom bar shows correct counts and costs
- [ ] Bottom bar expand/collapse works on all pages
- [ ] Spec quick panel toggles correctly from header button
- [ ] One-click launch starts session with correct defaults
- [ ] Multi-spec attachment works in session creation
- [ ] Session status indicators update in real-time on specs sidebar
- [ ] Keyboard shortcuts work as documented
- [ ] No regression in ACP conversation view
- [ ] Mobile layout works correctly