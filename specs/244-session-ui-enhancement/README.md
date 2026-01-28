---
status: planned
created: 2026-01-28
priority: high
tags:
- ui
- sessions
- frontend
- monitoring
- enhancement
depends_on:
- 239-ai-coding-session-management
created_at: 2026-01-28T08:07:42.931963Z
updated_at: 2026-01-28T08:07:47.771879Z
---

# Session UI Enhancement - List, Detail, and Spec Integration

## Overview

### Problem

The current session management UI is limited to a small panel within the spec detail view. Users cannot:
- Browse all sessions across specs in a dedicated list view
- View detailed session information with real-time log streaming
- Easily navigate from a spec to its related sessions

### Solution

Build three complementary UI enhancements:
1. **Sessions List Page** - A dedicated page showing all sessions with filtering and sorting
2. **Session Detail Page** - Full-page view with live log streaming and comprehensive session information
3. **Spec Detail Integration** - "View Sessions" action button in spec header for quick navigation

## Design

### Sessions List Page

Create a new route `/sessions` with a list view similar to the specs list page.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
║ Sessions (42)                     [Filter ▼] [Sort ▼] [+]   ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║ ┌───────────────────────────────────────────────────────┐  ║
║ │ 🟢 Running    Claude    Spec 171    2m ago    [View]  │  ║
║ │    Mode: Ralph | Tokens: 45K | Duration: 2m 15s       │  ║
║ └───────────────────────────────────────────────────────┘  ║
║                                                             ║
║ ┌───────────────────────────────────────────────────────┐  ║
║ │ ✅ Completed  Copilot   Spec 168    1h ago    [View]  │  ║
║ │    Mode: Guided | Duration: 15m 32s | Exit: 0         │  ║
║ └───────────────────────────────────────────────────────┘  ║
║                                                             ║
║ ┌───────────────────────────────────────────────────────┐  ║
║ │ ❌ Failed     Claude    Spec 221    3h ago    [View]  │  ║
║ │    Mode: Autonomous | Duration: 8m | Exit: 1          │  ║
║ └───────────────────────────────────────────────────────┘  ║
║                                                             ║
╚═════════════════════════════════════════════════════════════╝
```

**Features:**
- Status indicators (🟢 running, ✅ completed, ❌ failed, ⏸️ paused, ⚪ pending)
- Filter by: status, tool, mode, spec
- Sort by: started_at, duration, status
- Pagination or infinite scroll
- Search by spec ID or session ID
- Quick actions: View, Stop (for running), Retry (for failed)

### Session Detail Page

Create a new route `/sessions/:id` with comprehensive session information and live log streaming.

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
║ ← Back to Sessions                                         ║
║                                                             ║
║ Session #a1b2c3d4                           [Pause] [Stop]  ║
║ Spec: 171-ralph-mode | Tool: Claude | Mode: Ralph         ║
║ Started: 2026-01-28 14:32:15 | Duration: 12m 34s          ║
╠═════════════════════════════════════════════════════════════╣
║                                                             ║
║ 📊 Progress & Stats                                         ║
║ ┌───────────────────────────────────────────────────────┐  ║
║ │ Status: 🟢 Running (Iteration 4/10)                    │  ║
║ │ Tokens: 127,432 | Cost: ~$0.85                         │  ║
║ │ [████████████░░░░░░░░] 40%                            │  ║
║ └───────────────────────────────────────────────────────┘  ║
║                                                             ║
║ 📝 Live Logs                                  [Export] [⚙] ║
║ ┌───────────────────────────────────────────────────────┐  ║
║ │ 14:32:15 [INFO] Session started                        │  ║
║ │ 14:32:16 [INFO] Loading spec from specs/171...        │  ║
║ │ 14:32:17 [INFO] Analyzing requirements...              │  ║
║ │ 14:32:18 [STDOUT] Generating code for task 1...       │  ║
║ │ 14:32:20 [STDOUT] Created file: src/manager.ts        │  ║
║ │ 14:32:21 [INFO] Running tests...                       │  ║
║ │ 14:32:25 [STDOUT] ✓ All tests passed                  │  ║
║ │ 14:32:26 [INFO] Iteration 1 complete                   │  ║
║ │ 14:32:27 [INFO] Starting iteration 2...               │  ║
║ │ ▋                                                      │  ║
║ └───────────────────────────────────────────────────────┘  ║
╚═════════════════════════════════════════════════════════════╝
```

**Features:**
- Real-time log streaming via WebSocket
- Log level filtering (stdout, stderr, debug, info, error)
- Search within logs
- Auto-scroll toggle
- Export logs to file
- Copy session ID
- View linked spec (click to navigate)
- Session controls (pause, resume, stop, restart)
- Token usage and cost estimation

**Note on Session Events:** AI coding tools (Claude, Copilot, etc.) output unstructured text via stdout only. We cannot reliably extract structured events. The log viewer is the primary interface - any "events" would need to be parsed from logs, which is fragile. We focus on raw log display instead.

### Spec Detail Integration

Add a "View Sessions" action button to the spec detail page header.

**Current header:**
```
┌─────────────────────────────────────────────────────────────┐
║ Spec 171: Ralph Mode                    [View Deps] [Edit]  ║
╚═════════════════════════════════════════════════════════════╝
```

**Enhanced header:**
```
┌─────────────────────────────────────────────────────────────┐
║ Spec 171: Ralph Mode    [3 Sessions] [View Deps] [Edit]     ║
╚═════════════════════════════════════════════════════════════╝
```

**Features:**
- Badge showing count of sessions for this spec
- Clicking opens sessions list filtered to this spec
- Dropdown menu option: "View Sessions" in actions menu
- Quick "New Session" button that creates session for this spec

## Plan

### Phase 1: Sessions List Page

- [ ] Create `/sessions` route and page component
- [ ] Implement session list UI with status indicators
- [ ] Add filtering by status, tool, mode, spec
- [ ] Add sorting (started_at, duration, status)
- [ ] Add pagination/infinite scroll
- [ ] Add search functionality
- [ ] Add quick action buttons (view, stop, retry)
- [ ] Add to navigation menu

### Phase 2: Session Detail Page

- [ ] Create `/sessions/:id` route and page component
- [ ] Build session info header with controls
- [ ] Implement log viewer component with WebSocket
- [ ] Add log filtering by level
- [ ] Add log search functionality
- [ ] Add auto-scroll toggle
- [ ] Add export logs feature
- [ ] Display token usage and cost

### Phase 3: Spec Detail Integration

- [ ] Add session count badge to spec header
- [ ] Add "View Sessions" action button
- [ ] Add "New Session" quick action
- [ ] Link sessions list with spec filter pre-applied
- [ ] Update session panel to link to detail page

### Phase 4: Navigation & Polish

- [ ] Add sessions link to main navigation
- [ ] Ensure mobile responsiveness
- [ ] Add loading states
- [ ] Add empty states
- [ ] Add error handling

## Test

- [ ] Sessions list loads and displays correctly
- [ ] Filtering and sorting work as expected
- [ ] Session detail page shows real-time logs
- [ ] WebSocket connection is stable
- [ ] Navigation from spec to sessions works
- [ ] Mobile layout is usable
- [ ] Export logs creates valid file

## Notes

### API Requirements

Existing endpoints should be sufficient:
- `GET /api/sessions` - List sessions (with filters)
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/:id/logs` - Get session logs
- `WS /api/sessions/:id/stream` - Real-time log stream

### WebSocket Integration

The session detail page should:
1. Connect to WebSocket on mount
2. Subscribe to log stream for session ID
3. Append new logs as they arrive
4. Handle reconnection on disconnect
5. Clean up on unmount

### Dependencies

- Spec 239 (Session Management Infrastructure) - provides backend APIs
- Spec 168 (Orchestration Platform) - UI foundation and routing

### Future Enhancements

- Session comparison view (compare two sessions side-by-side)
- Session replay (replay logs at original speed)
- Session analytics dashboard
- Export session as video/gif
- Share session link
- Session templates based on successful sessions