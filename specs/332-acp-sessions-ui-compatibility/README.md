---
status: complete
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
updated_at: 2026-02-25T08:44:09.540286Z
completed_at: 2026-02-25T08:44:09.540286Z
transitions:
- status: in-progress
  at: 2026-02-25T08:35:47.253373Z
- status: complete
  at: 2026-02-25T08:44:09.540286Z
---

# ACP Sessions: UI Log Display & Conversation View

## Overview

Spec 330 introduces ACP (Agent Client Protocol) sessions, which fundamentally change the data flowing from runners to LeanSpec. The current UI was built for **unstructured plain-text logs** (raw stdout/stderr lines). ACP sessions produce **structured, typed updates** — tool calls, diffs, plans, agent thoughts, and streaming message chunks.

This spec ensures the UI can display ACP session data in a structured conversation view, covering the base rendering of all ACP event types. HITL (Human-in-the-Loop) interactions — permission requests, conversational follow-ups, checkpoints, and message actions — are covered separately in Spec 334.

**Component Library:** Use [ai-elements](https://www.npmjs.com/package/ai-elements) (Vercel's AI component registry built on shadcn/ui) as the foundation for all ACP session UI components. This avoids building custom chat/tool/confirmation primitives from scratch and ensures a battle-tested, accessible, composable component set.

### Current State

**Log Display:**
- Logs rendered as flat monospaced text: `[timestamp] LEVEL message`
- No distinction between agent reasoning, tool calls, file changes, or plain output
- WebSocket streams `{ type: "log", level, message }` — level is only stdout/stderr/info/debug/warning/error
- No structured content — everything is a string `message`

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

// ACP permission request (rendered read-only here; interactive handling in Spec 334)
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

### 2. Log Display — ai-elements Conversation View vs Flat View

Detect session type via a new `session.protocol` field (`"acp" | "subprocess"`):

- **`subprocess`** → current flat log view (unchanged)
- **`acp`** → conversation-style view using ai-elements components

#### ai-elements Component Mapping

Install the following ai-elements components for the ACP session view:

```bash
npx ai-elements@latest add conversation message reasoning tool plan
```

| ACP Update           | ai-elements Component                                                        | Usage                                                                         |
| -------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Agent messages       | `<Message from="assistant">` + `<MessageResponse>`                           | Streaming markdown with GFM, math, code highlighting                          |
| User messages        | `<Message from="user">` + `<MessageContent>`                                 | Right-aligned user prompt blocks                                              |
| Agent thoughts       | `<Reasoning isStreaming={…}>` + `<ReasoningContent>`                         | Collapsible "Thinking…" section, auto-opens while streaming, closes when done |
| Tool calls           | `<Tool>` + `<ToolHeader>` + `<ToolContent>` + `<ToolInput>` + `<ToolOutput>` | Collapsible card with tool name, status badge, args, result                   |
| Plan                 | `<Plan isStreaming={…}>` + `<PlanHeader>` + `<PlanContent>`                  | Collapsible plan with shimmer while streaming, progress entries               |
| Conversation wrapper | `<Conversation>` + `<ConversationContent>` + `<ConversationScrollButton>`    | Auto-scroll, download, scroll-to-bottom button                                |

#### ACP Conversation View Architecture

```tsx
// SessionDetailPage.tsx — ACP mode
<Conversation>
  <ConversationContent>
    {streamEvents.map((event) => {
      switch (event.type) {
        case 'acp_message':
          return (
            <Message from={event.role === 'agent' ? 'assistant' : 'user'}>
              <MessageContent>
                <MessageResponse>{event.content}</MessageResponse>
              </MessageContent>
            </Message>
          );

        case 'acp_thought':
          return (
            <Reasoning isStreaming={!event.done}>
              <ReasoningTrigger />
              <ReasoningContent>{event.content}</ReasoningContent>
            </Reasoning>
          );

        case 'acp_tool_call':
          return (
            <Tool defaultOpen={event.status === 'running'}>
              <ToolHeader type={`tool-${event.tool}`} state={event.status} />
              <ToolContent>
                <ToolInput input={event.args} />
                <ToolOutput output={event.result} />
              </ToolContent>
            </Tool>
          );

        case 'acp_plan':
          return (
            <Plan isStreaming={planIsStreaming}>
              <PlanHeader>
                <PlanTitle>Execution Plan</PlanTitle>
              </PlanHeader>
              <PlanContent>
                {event.entries.map(entry => (
                  <PlanEntry key={entry.id} status={entry.status}>
                    {entry.title}
                  </PlanEntry>
                ))}
              </PlanContent>
            </Plan>
          );

        case 'acp_permission_request':
          // Basic read-only display; interactive approval handled in Spec 334
          return (
            <Tool defaultOpen>
              <ToolHeader type="permission-request" state="running" />
              <ToolContent>
                <ToolInput input={{ tool: event.tool, args: event.args }} />
              </ToolContent>
            </Tool>
          );
      }
    })}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

Level filter extended for ACP: filter by Messages, Thoughts, Tool Calls, Plan updates.

### 3. Session Card & List Updates

- **Protocol badge** — "ACP" vs "CLI" to distinguish session types
- **Active tool call indicator** — tool name + spinner on card
- **Plan progress** — optional progress bar (completed/total plan entries)

### 4. Drawer Panel Updates

`session-logs-panel.tsx` also needs:
- Render ACP structured events using ai-elements (messages + tool calls at minimum)
- Protocol indicator in header

## Non-Goals

- Full terminal emulator (ANSI escape handling)
- Complex inline file diff rendering (link to files instead)
- Audio/video ACP content blocks
- ACP `fs/` and `terminal/` capabilities in the UI
- Replacing the existing flat log view for non-ACP sessions
- HITL interactions (permission approval, follow-up prompts, checkpoints) — see Spec 334

## Backward Compatibility

- Non-ACP sessions render identically to today
- WebSocket format is additive; `type: "log"` unchanged
- Session list, filters, sorting work for both types
- Export handles both types (ACP as structured JSON or flattened text)

## Plan

- [x] Install ai-elements components: `conversation`, `message`, `reasoning`, `tool`, `plan`
- [x] Define `SessionStreamEvent` union type and add `protocol` field to Session
- [x] Build ACP conversation view using `<Conversation>` + `<ConversationContent>` wrapper
- [x] Map `acp_message` events to `<Message>` + `<MessageResponse>` (streaming markdown)
- [x] Map `acp_thought` events to `<Reasoning>` + `<ReasoningContent>` (collapsible)
- [x] Map `acp_tool_call` events to `<Tool>` + `<ToolHeader>` + `<ToolInput>` + `<ToolOutput>`
- [x] Map `acp_plan` events to `<Plan>` + `<PlanContent>` with progress entries
- [x] Update `SessionDetailPage` — protocol-aware view rendering (conversation vs flat)
- [x] Update `SessionLogsPanel` drawer for ACP events
- [x] Update `SessionCard` with protocol badge and status indicators
- [x] Add ACP event type level filter (Messages, Thoughts, Tool Calls, Plan)

## Acceptance Criteria

- [x] ai-elements components installed and integrated for ACP session rendering
- [x] ACP sessions display agent messages as streaming markdown via `<MessageResponse>`
- [x] Tool calls render as collapsible `<Tool>` cards with name, status, args, result
- [x] Agent thoughts shown via `<Reasoning>` — auto-open while streaming, collapse when done
- [x] Plans render via `<Plan>` with progress entries
- [x] Non-ACP sessions continue to render as flat log output (backward compatible)
- [x] Session cards show protocol type and active indicators
- [x] Drawer panel supports ACP structured events
- [x] Level filter works for ACP event types