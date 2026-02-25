---
status: planned
created: 2026-02-25
priority: high
tags:
- ui
- sessions
- acp
- ux
- logs
- permissions
parent: 330-acp-sessions-integration
created_at: 2026-02-25T07:01:21.422865Z
updated_at: 2026-02-25T07:01:32.639511Z
---

# ACP Sessions: UI Log Display & Interaction Compatibility

## Overview

Spec 330 introduces ACP (Agent Client Protocol) sessions, which fundamentally change the data flowing from runners to LeanSpec. The current UI was built for **unstructured plain-text logs** (raw stdout/stderr lines). ACP sessions produce **structured, typed updates** — tool calls, diffs, plans, permission requests, agent thoughts, and streaming message chunks.

This spec ensures the UI and UX are consistent and fully compatible with ACP session data, covering both how logs are displayed and how users interact with ACP-powered sessions.

### Current State

**Log Display:**
- Logs rendered as flat monospaced text: `[timestamp] LEVEL message`
- No distinction between agent reasoning, tool calls, file changes, or plain output
- WebSocket streams `{ type: "log", level, message }` — level is only stdout/stderr/info/debug/warning/error
- No structured content — everything is a string `message`

**Interaction:**
- Controls: Start, Pause, Resume, Stop, Restart, Export, Archive
- No permission prompt UI — agents run unattended
- No way to cancel a specific turn (only stop entire session)
- No session resume capability (restart creates a new session)
- No mode switching during a running session

## Design

### 1. Structured Log Entries

**Wire Format Changes (WebSocket)** — Extend with ACP-typed events alongside legacy log lines:

```jsonc
// Legacy (unchanged for non-ACP runners)
{ "type": "log", "timestamp": "…", "level": "stdout", "message": "…" }

// ACP message chunk (streaming)
{ "type": "acp_message", "role": "agent"|"user", "content": "…", "done": false }

// ACP thought
{ "type": "acp_thought", "content": "…", "done": false }

// ACP tool call
{ "type": "acp_tool_call", "id": "tc_123", "tool": "edit_file", "args": {}, "status": "running"|"completed"|"failed", "result": null }

// ACP plan
{ "type": "acp_plan", "entries": [{ "id": "…", "title": "…", "status": "pending"|"running"|"done" }] }

// ACP permission request
{ "type": "acp_permission_request", "id": "pr_456", "tool": "run_command", "args": {}, "options": ["allow_once", "allow_always", "reject"] }

// ACP mode update
{ "type": "acp_mode_update", "mode": "code"|"ask"|"architect" }
```

**TypeScript Types:**

```typescript
type SessionStreamEvent = 
  | { type: 'log'; timestamp: string; level: string; message: string }
  | { type: 'acp_message'; role: 'agent' | 'user'; content: string; done: boolean }
  | { type: 'acp_thought'; content: string; done: boolean }
  | { type: 'acp_tool_call'; id: string; tool: string; args: Record<string, unknown>; status: 'running' | 'completed' | 'failed'; result?: string | null }
  | { type: 'acp_plan'; entries: Array<{ id: string; title: string; status: 'pending' | 'running' | 'done' }> }
  | { type: 'acp_permission_request'; id: string; tool: string; args: Record<string, unknown>; options: string[] }
  | { type: 'acp_mode_update'; mode: string }
  | { type: 'complete'; status: string; duration_ms: number };
```

### 2. Log Display — Conversation View vs Flat View

Detect session type via a new `session.protocol` field (`"acp" | "subprocess"`):

- **`subprocess`** → current flat log view (unchanged)
- **`acp`** → conversation-style view with:
  - **Agent messages** — streaming markdown blocks
  - **User messages** — visually distinct blocks
  - **Thought blocks** — collapsible "Thinking…" sections, dimmed
  - **Tool call cards** — tool name, args (collapsed), status badge (spinner/check/x), result (expandable), duration
  - **Plan panel** — optional section showing plan entries with progress checkmarks

Level filter extended for ACP: filter by Messages, Thoughts, Tool Calls, Plan updates.

### 3. Permission Request Flow

The biggest UX change. ACP agents send `session/request_permission` for sensitive tool calls.

**UI Flow:**
1. Server forwards permission request via WebSocket as `acp_permission_request`
2. UI shows **inline permission card** in conversation stream:
   - Tool name + arguments displayed clearly
   - Three buttons: **Allow Once**, **Allow Always**, **Reject**
   - Visual urgency indicator (session blocked until user responds)
3. User clicks → UI sends response via new REST endpoint
4. Server relays decision to ACP agent

**REST Endpoint:**
```
POST /api/sessions/{id}/permission/{requestId}
Body: { "decision": "allow_once" | "allow_always" | "reject" }
```

Session displays "Waiting for approval" sub-status badge while blocked.

### 4. New Session Interaction Controls

| Control | When | Action |
|---|---|---|
| **Cancel Turn** | Agent generating | `session/cancel` — stops turn, keeps session |
| **Send Message** | After agent turn completes | `session/prompt` — follow-up message |
| **Switch Mode** | Session active | `session/set_mode` — ask/code/architect |
| **Resume Session** | Completed + runner supports `loadSession` | `session/load` |

**Prompt Input:** Message input bar at bottom of session detail page (ACP sessions only) for conversational follow-ups.

### 5. Session Card & List Updates

- **Protocol badge** — "ACP" vs "CLI"
- **Active tool call indicator** — tool name + spinner on card
- **Permission pending** — prominent indicator when awaiting approval
- **Plan progress** — optional progress bar (completed/total plan entries)
- **Resume button** — for completed ACP sessions with `loadSession` support

### 6. Drawer Panel Updates

`session-logs-panel.tsx` also needs:
- Render ACP structured events (messages + tool calls at minimum)
- Permission request action buttons
- "Send Message" input for ACP sessions
- Protocol indicator in header

## Non-Goals

- Full terminal emulator (ANSI escape handling)
- Complex inline file diff rendering (link to files instead)
- Audio/video ACP content blocks
- ACP `fs/` and `terminal/` capabilities in the UI

## Backward Compatibility

- Non-ACP sessions render identically to today
- WebSocket format is additive; `type: "log"` unchanged
- Session list, filters, sorting work for both types
- Export handles both types (ACP as structured JSON or flattened text)

## Plan

- [ ] Define `SessionStreamEvent` union type and add `protocol` field to Session
- [ ] Build `AcpMessageBlock` component (streaming markdown)
- [ ] Build `AcpThoughtBlock` component (collapsible)
- [ ] Build `AcpToolCallCard` component (status, args, result)
- [ ] Build `AcpPlanPanel` component (entries with progress)
- [ ] Build `AcpPermissionCard` component (approve/reject buttons)
- [ ] Add permission response REST endpoint
- [ ] Update `SessionDetailPage` — protocol-aware view rendering
- [ ] Add message input bar + Cancel Turn + mode switcher for ACP sessions
- [ ] Update `SessionLogsPanel` drawer for ACP events
- [ ] Update `SessionCard` with protocol badge and status indicators
- [ ] Add "Resume" button for `loadSession`-capable runners

## Acceptance Criteria

- [ ] ACP sessions display agent messages as streaming markdown
- [ ] Tool calls show structured cards with name, status, expandable details
- [ ] Agent thoughts shown in collapsible blocks
- [ ] Permission requests appear inline with actionable approve/reject buttons
- [ ] Users can send follow-up messages during an ACP session
- [ ] Users can cancel a turn without ending the session
- [ ] Non-ACP sessions continue to render as flat log output
- [ ] Session cards show protocol type and active indicators
- [ ] Drawer panel supports ACP structured events