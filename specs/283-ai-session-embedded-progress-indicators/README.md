---
status: planned
created: 2026-02-02
priority: high
tags:
- ui
- sessions
- realtime
- board
- frontend
- websocket
depends_on:
- 244-session-ui-enhancement
- 239-ai-coding-session-management
parent: 168-leanspec-orchestration-platform
created_at: 2026-02-02T07:12:43.270365638Z
updated_at: 2026-02-02T07:13:02.270422607Z
---

# AI Session Embedded Progress Indicators

## Overview

### Problem

Currently, users must navigate to dedicated session pages to see AI implementation progress. This creates a disconnect between specs and their active AI work:
- Board view shows static status without implementation activity
- Spec cards in list view lack real-time session indicators
- Sidebar navigation doesn't show which specs have active sessions
- Users constantly switch between spec views and session views

### Solution

Embed AI session activity indicators directly into existing spec UI components:
1. **Board Cards** - Animated activity indicator + session summary
2. **Spec List Cards** - Compact session status chip with live activity
3. **Sidebar Spec Items** - Pulsing indicator for active sessions
4. **Spec Detail Header** - Inline session panel with live logs preview

### Technical Constraints

AI tools (Claude, Copilot, Cursor, etc.) stream unstructured text via stdout/stderr. We **cannot** reliably extract:
- Progress percentage (no structured progress reporting)
- Token counts (tools don't expose this)
- Cost estimates (depends on unavailable token counts)
- Subtask completion (would require fragile log parsing)

**Available data from current implementation:**
- Session status: pending, running, paused, completed, failed, cancelled
- Tool name, mode, spec_id
- Timestamps: started_at, ended_at, duration_ms
- Real-time log streaming (stdout/stderr lines)
- Session lifecycle events

## Design

### Board Card Session Indicator

Add an embedded session status area to kanban cards:

```
┌─────────────────────────────────┐
│ 171 Ralph Mode Implementation   │
│ Priority: High  🏷️ rust, claude  │
├─────────────────────────────────┤
│ 🟢 Claude • autonomous (12m)    │
│ └─ "Running test suite..."      │
└─────────────────────────────────┘
```

**Features:**
- Animated pulse indicator when session is running
- Tool + mode + duration display
- Latest activity snippet (last stdout line, truncated)
- Click to expand session mini-panel or navigate to detail
- Multiple sessions: show count badge (+2 more)

### Spec List Card Indicator

Add inline session chip to list view cards:

```
┌────────────────────────────────────────────────────────────┐
│ ● 171 Ralph Mode Implementation      🟢 Claude (12m) [+1] │
│   Priority: high | Size: medium                            │
└────────────────────────────────────────────────────────────┘
```

**Features:**
- Session status chip (tool + duration)
- Status color: 🟢 running, 🔵 paused, ✅ completed, ❌ failed
- Hover shows last activity + mode
- Click chip to open session drawer/panel

### Sidebar Spec Item Indicator

Add visual indicator to sidebar navigation:

```
Specs
├── 📄 169 UI Backend       ⚪
├── 📄 170 Migration Eval   ⚪
├── 📄 171 Ralph Mode       🟢 ●●
├── 📄 172 Rust Dist        ⚪
└── 📄 173 CI Pipeline      🔵 ●
```

**Features:**
- Pulsing dot for running sessions
- Completed indicator (✓) for recent completions (last 5min fade)
- Session count dots (●● = 2 active sessions)
- Status colors: 🟢 running, 🔵 paused, 🔴 failed

### Spec Detail Header Integration

Enhance the spec detail header with collapsible live session panel:

```
┌─────────────────────────────────────────────────────────────┐
║ 171: Ralph Mode Implementation                              ║
╠═════════════════════════════════════════════════════════════╣
║ 🟢 Active Session                           [Pause] [Stop]  ║
║ ┌─────────────────────────────────────────────────────────┐ ║
║ │ Claude | autonomous | 12m 34s                           │ ║
║ │ > Analyzing requirements...                             │ ║
║ │ > Created file: src/session-manager.ts                  │ ║
║ │ > Running test suite...                      [Expand ▼] │ ║
║ └─────────────────────────────────────────────────────────┘ ║
║                                                             ║
║ [Overview] [Tasks] [Dependencies] [Sessions (2)]           ║
╠═════════════════════════════════════════════════════════════╣
```

**Features:**
- Collapsible live session panel (auto-opens if session running)
- Last 3-5 log lines streaming in real-time
- Quick session controls (pause, resume, stop)
- Expand to full session detail page

## Technical Approach

### WebSocket Session Aggregation

Create a shared session subscription hook that efficiently aggregates session data:

```typescript
// Subscribe to session updates for visible specs
const useSessionPresence = (specIds: string[]) => {
  // Returns Map<specId, SessionSummary[]>
  // Updates in real-time via WebSocket
}
```

### Session Summary Model

Based on available data from existing implementation:

```typescript
interface EmbeddedSessionSummary {
  id: string
  specId: string | null
  tool: string  // 'claude' | 'copilot' | 'cursor' | 'opencode'
  mode: 'guided' | 'autonomous' | 'ralph'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  startedAt: string  // ISO timestamp
  endedAt: string | null
  durationMs: number | null
  lastActivity?: string  // Last log line (truncated)
}
```

### Efficient Updates

- Batch session status updates (debounce 500ms)
- Only subscribe to sessions for visible specs (viewport intersection)
- Lightweight summary endpoint (not full logs)
- Unsubscribe on component unmount
- Single WebSocket connection per page, multiplexed

### New Backend Endpoint

Add aggregated session presence endpoint:

```
GET /api/sessions/presence?spec_ids=171,172,173
```

Returns lightweight session summaries for multiple specs in one request, with optional last log line.

## Plan

### Phase 1: Core Infrastructure

- [ ] Create `useSessionPresence` React hook
- [ ] Add `/api/sessions/presence` aggregation endpoint
- [ ] Build `EmbeddedSessionSummary` data model
- [ ] Create shared `SessionIndicator` base component

### Phase 2: Board View Integration

- [ ] Add `SessionIndicator` to `BoardCard`
- [ ] Implement animated pulse CSS for running status
- [ ] Show tool + mode + duration
- [ ] Display truncated last activity line
- [ ] Handle multiple sessions (show count)

### Phase 3: List View Integration

- [ ] Add `SessionChip` to `SpecListCard`
- [ ] Implement hover tooltip for session details
- [ ] Add click handler to open session drawer
- [ ] Ensure responsive layout

### Phase 4: Sidebar Integration

- [ ] Add indicator dots to `SidebarSpecItem`
- [ ] Implement session count display
- [ ] Add status color indicators
- [ ] Recent completion fade effect

### Phase 5: Detail Header Integration

- [ ] Create `CollapsibleSessionPanel` component
- [ ] Implement live log streaming preview (last 3-5 lines)
- [ ] Add session quick controls
- [ ] Smooth expand/collapse animation

### Phase 6: Polish & Performance

- [ ] Optimize WebSocket message batching
- [ ] Add viewport-based subscription (IntersectionObserver)
- [ ] Implement loading skeletons
- [ ] Add accessibility labels (ARIA)
- [ ] Mobile responsive adjustments

## Test

- [ ] Board cards show session indicator when running
- [ ] List cards display session chip correctly
- [ ] Sidebar shows pulsing dots for active sessions
- [ ] Detail header streams live logs
- [ ] Session controls (pause/stop) work from embedded UI
- [ ] WebSocket reconnects gracefully on disconnect
- [ ] No memory leaks on unmount
- [ ] Performance: <16ms frame time with 20+ visible sessions
- [ ] Mobile layouts remain usable

## Notes

### What We CAN'T Show (and why)

| Feature | Why Not Available |
|---------|-------------------|
| Progress % | AI tools don't report structured progress |
| Token count | Not exposed via stdout; would need tool integration |
| Cost estimate | Depends on token count |
| Subtask progress | Would require fragile log parsing |

These could be added in the future if AI tools provide structured progress APIs.

### Dependencies

- Spec 244 (Session UI Enhancement) - existing session infrastructure
- Spec 239 (AI Coding Session Management) - backend session APIs

### Future Enhancements (if tool APIs improve)

- Token usage display (when tools expose it)
- Progress percentage (when tools report it)
- Audio/visual notification for session completion
- Session activity heatmap on board
