---
status: planned
created: 2026-01-29
priority: high
tags:
- ui
- sessions
- ux
- drawer
- frontend
depends_on:
- 239-ai-coding-session-management
- 244-session-ui-enhancement
created_at: 2026-01-29T02:16:30.380254118Z
updated_at: 2026-01-29T02:16:42.518679220Z
---

# Unified Sessions UX with Right Drawer

## Overview

### Problem

The current sessions interaction in the spec detail page has multiple UX issues:

1. **Jarring navigation**: Clicking "View" button navigates away from spec context to `/sessions?spec=...`
2. **Vague wording**: "View" doesn't communicate what will happen - view sessions? logs? details?
3. **Fragmented UX**: Two separate buttons ("View" + "New Session") feel disconnected
4. **No live status**: Users can't see real-time session progress without navigating away

Users need to manage sessions **in place** while maintaining spec context.

### Solution

Replace scattered session buttons with a unified **right drawer** for session management:

1. **Single trigger button** - "Sessions (N)" in header actions, left of "Focus"
2. **Right drawer panel** - Slides in from right with full session management
3. **Inline everything** - Create, monitor, view logs without page navigation
4. **Vercel-inspired progress** - Real-time status visualization like build pipelines

## Design

### Trigger Button Location

Replace current "View" and "New Session" buttons with single "Sessions" button in SpecDetailPage header, positioned left of the "Focus" button:

**Before:**
```
[View Dependencies] [View ●3] [+ New Session] [Focus]
```

**After:**
```
[View Dependencies] [Sessions ●3] [Focus]
```

Button design:
```tsx
<Button variant="outline" size="sm" className="h-8 rounded-full">
  <Terminal className="mr-1.5 h-3.5 w-3.5" />
  Sessions
  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px]">
    {activeCount > 0 ? `●${activeCount}` : count}
  </span>
</Button>
```

### Right Drawer Layout

```
┌──────────┬──────────────────────┬─────────────────────────┐
│ Specs    │    Spec Detail       │ Sessions           [✕]  │
│ Nav      │                      ├─────────────────────────│
│ Sidebar  │                      │ [+ New Session]         │
│          │ #249 Sessions UX     ├─────────────────────────│
│ #249 🟢  │                      │ ┌─────────────────────┐ │
│ #248     │ ## Overview          │ │ 🟢 Running    2m 15s│ │
│ #247     │ ...                  │ │ Claude • Auto       │ │
│          │                      │ │ #249 Sessions UX    │ │
│          │                      │ │ ████████░░░░░  48%  │ │
│          │                      │ │ 127K • ~$0.85       │ │
│          │                      │ │ [Logs] [⏸] [⏹]    │ │
│          │                      │ └─────────────────────┘ │
│          │                      │ ┌─────────────────────┐ │
│          │                      │ │ ⏳ Pending          │ │
│          │                      │ │ Copilot • Guided    │ │
│          │                      │ │ #248 Cloud Sync     │ │
│          │                      │ │ [▶ Start] [✕]       │ │
│          │                      │ └─────────────────────┘ │
│          │                      ├─────────────────────────│
│          │                      │ ── Completed today ─────│
│          │                      │ ✓ #247 • 12m • $0.45   │
│          │                      │ ✓ #246 • 8m • $0.22    │
│          │                      ├─────────────────────────│
│          │                      │   [View All Sessions →] │
└──────────┴──────────────────────┴─────────────────────────┘
```

### Drawer Specifications

- **Width**: 360px (resizable via drag handle)
- **Animation**: Slide in from right, 200ms ease-out
- **Backdrop**: Semi-transparent overlay on mobile, none on desktop
- **Close**: Click outside, [✕] button, or Escape key
- **Persistence**: Stays open when navigating between specs
- **Context-aware**: Filters sessions by current spec (with toggle for "all")

### Session Card States

**Running Session:**
```
┌───────────────────────────────────────┐
│ 🟢 Running                    2m 15s ⟳│ ← Live timer
│ Claude • Autonomous                   │
│ #249 Sessions Sidebar UX              │ ← Clickable spec link
│ ████████████████░░░░░░░░  48%         │ ← Progress bar
│ 127K tokens • ~$0.85                  │
│ [📋 Logs] [⏸ Pause] [⏹ Stop]         │
└───────────────────────────────────────┘
```

**Pending Session:**
```
┌───────────────────────────────────────┐
│ ⏳ Pending                            │
│ Copilot • Guided                      │
│ #248 Cloud Sync                       │
│ [▶ Start] [✕ Cancel]                  │
└───────────────────────────────────────┘
```

**Failed Session:**
```
┌───────────────────────────────────────┐
│ ❌ Failed                  Exit: 1    │
│ Claude • Autonomous                   │
│ #247 API Improvements                 │
│ [📋 Logs] [🔄 Retry] [✕ Dismiss]      │
└───────────────────────────────────────┘
```

**Completed Session (compact):**
```
✓ Claude • #249 • 12m • $0.45 • 1h ago [📋]
```

### Logs Sub-panel

When clicking [📋 Logs], the drawer shows logs inline with back navigation:

```
┌─────────────────────────────────────────┐
│ Sessions                           [✕]  │
├─────────────────────────────────────────┤
│ ← Back to Sessions                      │
├─────────────────────────────────────────┤
│ 🟢 Session #a1b2c3                      │
│ Claude • Auto • #249                    │
│ 2m 15s • 127K tokens • ~$0.85           │
│ [⏸ Pause] [⏹ Stop]                     │
├─────────────────────────────────────────┤
│ 📋 Logs           [🔍] [⬇ Export] [⚙]  │
├─────────────────────────────────────────┤
│ 14:32:15 [INFO] Session started         │
│ 14:32:16 [INFO] Loading spec...         │
│ 14:32:17 [INFO] Analyzing requirements  │
│ 14:32:18 [OUT] Creating file: src/...   │
│ 14:32:19 [OUT] ✓ Tests passed           │
│ ▋                                       │ ← Live cursor
├─────────────────────────────────────────┤
│ [Auto-scroll: ON]                       │
└─────────────────────────────────────────┘
```

### New Session Form

[+ New Session] expands inline form in drawer:

```
┌─────────────────────────────────────────┐
│ New Session                             │
├─────────────────────────────────────────┤
│ Spec                                    │
│ [#249 Sessions Sidebar UX ▾]            │ ← Pre-filled from context
│                                         │
│ Tool          Mode                      │
│ [Claude ▾]    [Autonomous ▾]            │
│                                         │
│ [Cancel]            [▶ Create & Start]  │
└─────────────────────────────────────────┘
```

### Active Session Indicator in Spec List

Show session status in SpecsNavSidebar:

```
│ #249 Sessions UX       ● draft  🟢 │ ← Green pulse = running
│ #248 Cloud Sync        ● progress ⏳│ ← Yellow = pending  
│ #247 API Improvements  ✓ complete  │ ← No indicator
```

## Components

### New Components
- `SessionsDrawer` - Right drawer container with header and content
- `SessionCard` - Individual session with status, progress, actions  
- `SessionProgressBar` - Vercel-style progress visualization
- `SessionLogsPanel` - Log viewer with streaming, search, export
- `SessionCreateForm` - Inline form for creating sessions
- `SessionsContext` - React context for shared state + WebSocket

### Modified Components
- `SpecDetailPage` - Remove old session buttons, add drawer trigger left of Focus
- `SpecsNavSidebar` - Add active session indicators to spec rows
- `AppLayout` - Mount drawer at app level for persistence

## Data Flow

### WebSocket Connection
```
WebSocket /api/sessions/stream
  ├── session.created  → Add to list
  ├── session.status   → Update card state
  ├── session.progress → Update progress bar
  ├── session.tokens   → Update usage stats
  ├── session.log      → Append to logs panel
  └── session.deleted  → Remove from list
```

### State Management
```tsx
<SessionsProvider>  {/* Maintains WebSocket + state */}
  <AppLayout>
    <SpecsNavSidebar /> {/* Reads session indicators */}
    <SpecDetailPage />  {/* Has drawer trigger */}
    <SessionsDrawer />  {/* Mounted at app level */}
  </AppLayout>
</SessionsProvider>
```

## Plan

### Phase 1: Drawer Foundation
- [ ] Create `SessionsDrawer` component with slide animation
- [ ] Create `SessionsContext` with state management
- [ ] Add drawer trigger button to SpecDetailPage (left of Focus)
- [ ] Remove old "View" and "New Session" buttons

### Phase 2: Session Cards
- [ ] Create `SessionCard` component with all states
- [ ] Create `SessionProgressBar` component
- [ ] Implement start/stop/cancel actions
- [ ] Add completed sessions list

### Phase 3: Logs Panel
- [ ] Create `SessionLogsPanel` component
- [ ] Connect to WebSocket for live streaming
- [ ] Add search and export functionality
- [ ] Handle auto-scroll toggle

### Phase 4: Create Form
- [ ] Create `SessionCreateForm` inline component
- [ ] Auto-populate spec from URL context
- [ ] Integrate with session API

### Phase 5: Indicators & Polish
- [ ] Add session indicators to SpecsNavSidebar rows
- [ ] WebSocket integration for real-time updates
- [ ] Update translations
- [ ] Mobile responsiveness
- [ ] Keyboard shortcuts (Escape to close)

## Test

- [ ] Drawer opens/closes smoothly
- [ ] Sessions list shows correct data
- [ ] Real-time updates work via WebSocket
- [ ] Start/stop/cancel actions work
- [ ] Logs stream in real-time
- [ ] Create form works with pre-filled spec
- [ ] Session indicators show on correct specs
- [ ] Mobile drawer works correctly
- [ ] Drawer persists when navigating specs

## Notes

### Dependencies
- Spec 244 (Session UI Enhancement) - existing session infrastructure
- Spec 239 (AI Coding Session Management) - backend APIs

### API Requirements
No new endpoints needed. Uses existing:
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `POST /api/sessions/:id/start` - Start session
- `POST /api/sessions/:id/stop` - Stop session
- `GET /api/sessions/:id/logs` - Get logs
- `WS /api/sessions/stream` - Real-time updates

### Translation Changes

Remove:
```json
"sessions.actions.view": "View"
```

Add:
```json
"sessionsDrawer": {
  "title": "Sessions",
  "newSession": "New Session",
  "viewAll": "View All Sessions",
  "noSessions": "No sessions yet",
  "completedToday": "Completed today",
  "backToList": "Back to Sessions",
  "filterBySpec": "This spec only",
  "showAll": "Show all"
}
```

### Future Enhancements
- Drawer width persistence in localStorage
- Session pinning
- Keyboard navigation within drawer
- Session comparison view
