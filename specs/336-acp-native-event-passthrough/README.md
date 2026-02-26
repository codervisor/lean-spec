---
status: complete
created: 2026-02-26
priority: high
tags:
- acp
- sessions
- architecture
- protocol
- backend
- refactor
parent: 330-acp-sessions-integration
created_at: 2026-02-26T13:34:40.236975Z
updated_at: 2026-02-26T13:52:28.594461Z
completed_at: 2026-02-26T13:52:28.594461Z
transitions:
- status: complete
  at: 2026-02-26T13:52:28.594461Z
---

# ACP Sessions: Native Event Passthrough (Remove Double Translation)

## Problem

ACP JSON-RPC data is currently translated **twice** before it reaches the UI:

**Layer 1 — Backend** (`map_acp_payload_to_logs` in `leanspec-core/src/sessions/manager.rs`):
- Receives raw ACP: `{ method: "session/update", params: { update: { sessionUpdate: "agent_message_chunk", content: { text: "…" }, done: false } } }`
- Translates to internal format, serializes into `SessionLog.message`: `{ "type": "acp_message", "role": "agent", "content": "…", "done": false }`
- Renames ACP standard fields: `sessionUpdate`→`type`, `toolCallId`→`id`, `rawInput`→`args`, `title`→`tool`
- Flattens nested structures (e.g. `content[0].content.text` → flat string `content`)
- Normalizes status values: `completed`→`done`, `in_progress`→`running`
- Discards ACP data not fitting the internal schema

**Layer 2 — Frontend** (`extractJsonRpcEvent` in `packages/ui/src/lib/session-stream.ts`):
- Duplicates the same translation logic as a fallback for when raw JSON-RPC appears in `SessionLog.message` strings
- Maintains dual field-name knowledge (`toolCallId`/`id`, `rawInput`/`args`, `title`/`tool`, etc.)

### Consequences

- **Information loss**: ACP's rich `ContentBlock` arrays are collapsed to plain strings; completion details, locations, diffs in `tool_call` results are dropped
- **Coupling**: Both backend and frontend must stay in sync with ACP field aliases — any protocol evolution requires updating two places
- **Redundant `extractJsonRpcEvent`**: By the time the frontend receives streamed events, the backend has already translated them; the frontend fallback only triggers for unparsed log lines
- **Custom schema drift**: The internal `acp_*` schema diverges from the actual ACP spec, making it harder to use the `agent-client-protocol` Rust crate properly

## Proposal

Store and stream raw ACP `session/update` params as-is. Move **all** ACP→UI translation to a single layer at the frontend boundary.

### Backend Changes

Remove `map_acp_payload_to_logs` translation and replace with a pass-through that stores the raw ACP `params` object directly in `SessionLog.message` with a `__acp_method` marker for detection. No DB schema change needed.

```rust
fn store_acp_payload_as_log(session_id: &str, payload: Value, timestamp: DateTime<Utc>) -> Option<Vec<SessionLog>> {
    let method = payload.get("method").and_then(|v| v.as_str())?;
    if !matches!(method, "session/update" | "session/request_permission") {
        return None;
    }
    let message = json!({
        "__acp_method": method,
        "params": payload.get("params")
    });
    Some(vec![SessionLog {
        id: 0,
        session_id: session_id.to_string(),
        timestamp,
        level: LogLevel::Info,
        message: message.to_string(),
    }])
}
```

Update `stream_payload_from_log` to detect `__acp_method` payloads and pass them through directly (adding only a `timestamp`). Old translated `acp_*` logs are no longer supported.

### Frontend Changes

Consolidate `extractJsonRpcEvent` and ACP alias handling into a single `mapAcpRawToStreamEvent` function in `session-stream.ts`. `parseStreamEventPayload` and `parseSessionLog` detect the `__acp_method` marker and route through this single path. Remove the legacy `parseRawEvent` path for `acp_*` events.

```typescript
function mapAcpRawToStreamEvent(method: string, params: unknown, fallbackTimestamp?: string): SessionStreamEvent | null {
  // All field alias resolution lives here and only here
}

export function parseStreamEventPayload(payload: unknown): SessionStreamEvent | null {
  if (isRecord(payload) && typeof payload.__acp_method === 'string') {
    return mapAcpRawToStreamEvent(payload.__acp_method, payload.params, ...);
  }
  return parseRawEvent(payload); // non-ACP (subprocess) log events only
}
```

## Plan

- [x] Add `store_acp_payload_as_log` in `manager.rs` — stores raw ACP params with `__acp_method` marker
- [x] Replace `map_acp_payload_to_logs` call sites with new function for ACP sessions
- [x] Update `stream_payload_from_log` in `leanspec-http` to detect and pass through `__acp_method` payloads
- [x] Consolidate `extractJsonRpcEvent` + ACP alias handling into single `mapAcpRawToStreamEvent` in `session-stream.ts`
- [x] Update `parseStreamEventPayload` and `parseSessionLog` to handle `__acp_method` marker
- [x] Remove legacy `acp_*` handling from `parseRawEvent` / frontend
- [x] Extend `SessionStreamEvent` to carry richer ACP data where available (structured `result`, full `ContentBlock[]`)
- [x] Remove duplicated field alias mapping from backend
- [x] Add tests covering new raw ACP passthrough

## Acceptance Criteria

- [x] ACP `session/update` payloads are stored in DB without field renaming or flattening
- [x] Frontend translates ACP → `SessionStreamEvent` in a single code path (`mapAcpRawToStreamEvent`)
- [x] No field alias mapping (`toolCallId`/`id`, `rawInput`/`args`, `title`/`tool`) exists in backend code
- [x] Non-ACP (subprocess) sessions are unaffected
- [x] ACP tool call `result` can carry structured data (not just a flattened string)