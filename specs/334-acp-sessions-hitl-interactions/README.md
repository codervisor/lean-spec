---
status: planned
created: 2026-02-25
priority: high
tags:
- ui
- sessions
- acp
- hitl
- permissions
- ux
depends_on:
- 332-acp-sessions-ui-compatibility
parent: 330-acp-sessions-integration
created_at: 2026-02-25T08:28:42.425320Z
updated_at: 2026-02-25T08:30:25.115229Z
---

# ACP Sessions: Human-in-the-Loop Interactions

## Overview

ACP sessions introduce interactive capabilities where users can approve/reject tool calls, send follow-up messages, and manage conversation checkpoints. This spec covers all HITL (Human-in-the-Loop) interaction patterns for ACP sessions, building on the base ACP session UI established in Spec 332.

**Prerequisite:** Spec 332 must be implemented first — it provides the ACP conversation view, structured event types, and ai-elements component foundation that HITL features build on.

**Component Library:** Uses [ai-elements](https://www.npmjs.com/package/ai-elements) components: `confirmation`, `prompt-input`, `checkpoint`, and `message` (for `MessageActions`).

## Design

### 1. Permission Requests (Confirmation)

The primary HITL gate. ACP agents send `session/request_permission` for sensitive tool calls. Uses `ai-elements/confirmation`:

**UI Flow:**
1. Server receives permission request → forwards via WebSocket as `acp_permission_request`
2. UI renders an `<Confirmation>` component inline in the conversation stream:
   - `<ConfirmationRequest>` — shows tool name, arguments, and impact description
   - `<ConfirmationActions>` — three buttons: **Reject**, **Allow Once**, **Allow Always**
   - `<ConfirmationAccepted>` / `<ConfirmationRejected>` — shown after user decides
3. User clicks a button → UI sends response via REST endpoint
4. Server relays the decision to the ACP agent
5. Session unblocks and continues

**Visual State Machine:**
```
[approval-requested] → User clicks → [approval-responded]
                                     ├→ ConfirmationAccepted (green)
                                     └→ ConfirmationRejected (red)
```

**REST Endpoint:**
```
POST /api/sessions/{id}/permission/{requestId}
Body: { "decision": "allow_once" | "allow_always" | "reject" }
```

Session displays "Waiting for approval" sub-status badge while blocked (visual urgency indicator with pulsing animation similar to ai-elements shimmer).

**Conversation View Integration:**
```tsx
case 'acp_permission_request':
  return (
    <Confirmation approval={{ id: event.id }} state="approval-requested">
      <ConfirmationRequest>
        <strong>{event.tool}</strong> wants to execute with:
        <code>{JSON.stringify(event.args)}</code>
      </ConfirmationRequest>
      <ConfirmationAccepted>
        <CheckIcon /> Approved
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <XIcon /> Rejected
      </ConfirmationRejected>
      <ConfirmationActions>
        <ConfirmationAction variant="outline"
          onClick={() => respondPermission(event.id, 'reject')}>
          Reject
        </ConfirmationAction>
        <ConfirmationAction variant="outline"
          onClick={() => respondPermission(event.id, 'allow_once')}>
          Allow Once
        </ConfirmationAction>
        <ConfirmationAction variant="default"
          onClick={() => respondPermission(event.id, 'allow_always')}>
          Allow Always
        </ConfirmationAction>
      </ConfirmationActions>
    </Confirmation>
  );
```

### 2. Conversational Follow-ups (PromptInput)

Uses `ai-elements/prompt-input`. The user can steer the agent after each turn completes — not just at session creation. This is the most natural HITL pattern for ACP's conversational model.

- `<PromptInput>` at the bottom of the session detail page (ACP sessions only)
- `<PromptInputTextarea>` for multi-line input
- `<PromptInputSubmit>` with streaming-aware status (disabled while agent is generating)
- Optional: `<PromptInputSelect>` for mode switching (ask/code/architect)

When the user submits, the UI calls `POST /api/sessions/{id}/prompt` which forwards to ACP `session/prompt`.

### 3. Conversation Checkpoints (Checkpoint)

Uses `ai-elements/checkpoint`. After significant conversation milestones (e.g., a full agent turn completing, a plan being executed), the UI inserts a `<Checkpoint>` separator that allows the user to:

- Visually see where one "turn" ended and another began
- Restore the conversation to that point (for runners supporting `session/load`)
- Create manual checkpoints for long-running sessions

```tsx
{turnCompleted && (
  <Checkpoint>
    <CheckpointIcon />
    <CheckpointTrigger onClick={() => restoreToCheckpoint(turnIndex)}>
      Restore to this point
    </CheckpointTrigger>
  </Checkpoint>
)}
```

### 4. Message Actions

Use `ai-elements/message` `<MessageActions>` on the last agent message:

```tsx
<MessageActions>
  <MessageAction onClick={() => cancelTurn()} label="Stop">
    <SquareIcon className="size-3" />
  </MessageAction>
  <MessageAction onClick={() => copyMessage()} label="Copy">
    <CopyIcon className="size-3" />
  </MessageAction>
  <MessageAction onClick={() => regenerate()} label="Retry">
    <RefreshCcwIcon className="size-3" />
  </MessageAction>
</MessageActions>
```

### 5. Interaction Controls

| Control                 | When                       | Action                                       | ai-elements                                            |
| ----------------------- | -------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| **Cancel Turn**         | Agent generating           | `session/cancel` — stops turn, keeps session | `<PromptInputSubmit status="streaming">` (stop button) |
| **Send Message**        | After agent turn completes | `session/prompt` — follow-up message         | `<PromptInput>` + `<PromptInputTextarea>`              |
| **Switch Mode**         | Session active             | `session/set_mode` — ask/code/architect      | `<PromptInputSelect>` in prompt footer                 |
| **Approve/Reject Tool** | Permission requested       | Allow/reject tool execution                  | `<Confirmation>` + `<ConfirmationActions>`             |
| **Resume Session**      | Completed + `loadSession`  | `session/load` to reconnect                  | `<CheckpointTrigger>`                                  |

### 6. Drawer Panel HITL Support

`session-logs-panel.tsx` needs HITL controls in the drawer view:
- Permission request `<Confirmation>` action buttons
- `<PromptInput>` for interactive ACP sessions
- `<Checkpoint>` separators

## Non-Goals

- Auto-approval rules or policies (future spec)
- Permission request grouping/batching
- Offline/async approval workflows
- Audio/video ACP content blocks

## Plan

- [ ] Install ai-elements HITL components: `confirmation`, `prompt-input`, `checkpoint`
- [ ] Map `acp_permission_request` to `<Confirmation>` with Accept/Reject/Allow Always actions
- [ ] Add permission response REST endpoint `POST /api/sessions/{id}/permission/{requestId}`
- [ ] Add `<PromptInput>` bar for conversational follow-ups during ACP sessions
- [ ] Add prompt submission endpoint `POST /api/sessions/{id}/prompt`
- [ ] Add `<Checkpoint>` separators between agent turns
- [ ] Add `<MessageActions>` (stop, copy, retry) on agent messages
- [ ] Add mode switcher via `<PromptInputSelect>` in prompt footer
- [ ] Add "Waiting for approval" sub-status badge with pulsing animation
- [ ] Add HITL controls to `SessionLogsPanel` drawer
- [ ] Add "Resume" button using `<CheckpointTrigger>` for `loadSession`-capable runners

## Acceptance Criteria

- [ ] Permission requests render inline via `<Confirmation>` with actionable Approve/Reject/Allow Always
- [ ] Permission decisions are sent to the server and relayed to the ACP agent
- [ ] Session shows "Waiting for approval" status while blocked on permission
- [ ] Users can send follow-up messages via `<PromptInput>` during an ACP session
- [ ] Users can cancel a turn without ending the session via stop button
- [ ] Conversation checkpoints appear between agent turns via `<Checkpoint>`
- [ ] `<MessageActions>` (stop, copy, retry) available on agent messages
- [ ] Mode switching works via `<PromptInputSelect>`
- [ ] Drawer panel includes HITL controls (confirmation, prompt input)