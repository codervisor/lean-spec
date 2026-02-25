---
status: in-progress
created: 2026-02-24
priority: high
tags:
- sessions
- acp
- protocol
- runners
- architecture
- research
created_at: 2026-02-24T15:32:02.930828Z
updated_at: 2026-02-25T09:13:23.337704Z
transitions:
- status: in-progress
  at: 2026-02-25T09:03:50.233143Z
---
# ACP Sessions Integration: Standardized Agent Communication

## Overview

[Agent Client Protocol (ACP)](https://agentclientprotocol.com/) is an emerging open standard for communication between code editors (clients) and AI coding agents — analogous to how LSP standardized language server integration.

**Key insight**: Nearly all runners LeanSpec supports (Claude Code, GitHub Copilot, Gemini CLI, Cline, OpenCode, Kiro CLI, Kimi CLI, Goose) already implement ACP. The current LeanSpec sessions architecture treats runners as dumb CLI subprocesses with env-var injection. ACP enables LeanSpec to become a proper **ACP Client**, unlocking bidirectional, structured, streaming communication with every ACP-compatible agent.

**Rust crate**: `agent-client-protocol` v0.9.4 is available on crates.io.

## Current Architecture vs ACP

### Current Approach
```
LeanSpec HTTP Server → spawn subprocess(runner, env=[LEANSPEC_SPEC_IDS, ...]) → watch stdout/stderr logs
```
- LeanSpec injects spec context via env vars
- Session state tracked only in LeanSpec's own DB
- No bidirectional communication once process is running
- No structured output (tool calls, diffs, plans)
- No cancellation or session resumption
- Runner terminates = session ends

### ACP-Enabled Approach
```
LeanSpec HTTP Server (ACP Client) ←→ JSON-RPC over stdio/HTTP ←→ Agent Runner (ACP Agent)
```
- LeanSpec calls `session/new` with `cwd` + MCP servers list
- LeanSpec injects spec context via `session/prompt` as structured `ContentBlock`s (text + resource links)
- Agent streams updates via `session/update` notifications (message chunks, tool calls, diffs, plans)
- Agent requests tool permissions via `session/request_permission` → LeanSpec presents to user/UI
- LeanSpec can call `session/cancel` to stop a turn
- Sessions can be loaded/resumed via `session/load` (if agent supports `loadSession` capability)
- Mode switching via `session/set_config_option` (model selector, ask/code mode)

## ACP Protocol Overview

### Agent Methods (LeanSpec calls these)

| Method | Purpose |
|--------|---------|
| `initialize` | Negotiate protocol version, exchange capabilities |
| `session/new` | Create new conversation session → returns `sessionId` |
| `session/load` | Resume a previous session (if `loadSession` capability) |
| `session/prompt` | Send user message (with spec context as ContentBlocks) |
| `session/cancel` | Cancel an ongoing prompt turn |
| `session/set_config_option` | Change model, mode, etc. |
| `session/set_mode` | Switch agent mode (ask/code/architect) |

### Client Methods (Agent calls these, LeanSpec must implement)

| Method | Purpose |
|--------|---------|
| `session/update` | Receive streaming updates (chunks, tool calls, diffs, plans) |
| `session/request_permission` | Agent asks user to approve a tool call |
| `fs/read_text_file` | Agent reads a file (optional capability) |
| `fs/write_text_file` | Agent writes a file (optional capability) |
| `terminal/create` | Agent spawns a terminal command |
| `terminal/output` | Agent reads terminal output |
| `terminal/wait_for_exit` | Agent waits for command to finish |
| `terminal/release` | Agent releases terminal resources |

### Session Update Types (streamed via `session/update`)
- `agent_message_chunk` — streaming LLM output
- `user_message_chunk` — echo of user message
- `agent_thought_chunk` — internal reasoning
- `tool_call` / `tool_call_update` — tool execution with status, diffs, locations
- `plan` — agent's execution plan (PlanEntry[])
- `current_mode_update` — mode change notification
- `config_option_update` — config change notification

## Integration Design

### LeanSpec as ACP Client

The `leanspec-http` server (or `leanspec-core`) would implement an ACP client:

```rust
// Conceptual: replace subprocess spawn with ACP connection
pub struct AcpRunnerSession {
    session_id: AcpSessionId,      // ACP's sessionId
    leanspec_session_id: String,   // Our DB session ID
    transport: AcpTransport,       // stdio or HTTP
}

pub enum AcpTransport {
    Stdio(ChildProcess),           // local runner as subprocess
    Http { url: String },          // remote/cloud agent
}
```

### Session Lifecycle Mapping

| LeanSpec Session State | ACP Operations |
|------------------------|----------------|
| `create_session()` | Prepare, but don't connect yet |
| `start_session()` | Spawn subprocess → `initialize` → `session/new` |
| Sending prompt | `session/prompt` with spec context as ContentBlocks |
| Streaming logs | Receive `session/update` notifications |
| Stop turn | `session/cancel` |
| `stop_session()` | Close ACP connection, kill subprocess |
| Session resume | `session/load` (if supported) |

### Spec Context as ACP Content

Instead of env vars, spec content is passed as structured ACP `ContentBlock`s:

```json
{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_abc",
    "prompt": [
      {
        "type": "text",
        "text": "Implement the feature described in the attached specs."
      },
      {
        "type": "resource_link",
        "uri": "file:///project/specs/028-cli-ui-modernization/README.md",
        "name": "028-cli-ui-modernization",
        "mimeType": "text/markdown"
      }
    ]
  }
}
```

### MCP Integration for LeanSpec Tools

LeanSpec can expose its own tools (spec read/write, board view) to ACP agents via MCP:
- Run `leanspec-mcp` as a stdio MCP server
- Pass it in `session/new.mcpServers` so the agent connects automatically
- Agent can then call `lean-spec` tools natively within its reasoning loop

```json
{
  "method": "session/new",
  "params": {
    "cwd": "/project",
    "mcpServers": [
      {
        "name": "leanspec",
        "command": "/path/to/leanspec-mcp",
        "args": ["--project", "/project"],
        "env": []
      }
    ]
  }
}
```

### Permission Flow

ACP agents request user confirmation before sensitive tool calls:

```
Agent → session/request_permission (toolCall details, options: [allow_once, allow_always, reject])
LeanSpec → forward to UI via WebSocket session/update event
User → selects option in UI
LeanSpec → respond to agent with selected outcome
```

This is structured permission UX vs current "agent does whatever, logs appear later."

## ACP-Compatible Runners

All these runners are already listed in LeanSpec's runner registry and support ACP:

| Runner | ACP Support |
|--------|------------|
| Claude Code | ✅ via Zed's SDK adapter |
| GitHub Copilot | ✅ (public preview since Jan 2026) |
| Cline | ✅ |
| OpenCode | ✅ |
| Gemini CLI | ✅ |
| Kiro CLI | ✅ |
| Kimi CLI | ✅ |
| Goose | ✅ |
| Codex CLI | ✅ via Zed adapter |

This means ACP integration immediately benefits the entire runner ecosystem.

## Non-Goals

- Does not replace the existing `SessionDatabase` persistence model
- Does not change the spec authoring / CLI workflow
- Does not require all runners to support ACP (non-ACP runners continue via subprocess)
- Does not implement ACP's full terminal/fs capabilities in Phase 1

## Technical Notes

- **Rust crate**: `agent-client-protocol = "0.9.4"` — provides types, JSON-RPC handling, client/agent traits
- **Transport**: All ACP agents MUST support stdio; HTTP/WebSocket for remote agents
- **Backward compat**: Non-ACP runners continue via existing subprocess spawning — ACP is opt-in per runner
- **Capability negotiation**: `initialize` response tells us what the agent supports (loadSession, modes, MCP transports)
- **Protocol version**: Currently version `1` (uint16); only bumped for breaking changes

## Plan

### Phase 1: Research & Prototype
- [x] Add `agent-client-protocol` crate to `leanspec-core` Cargo.toml
- [ ] Prototype ACP client connection with Claude Code (`claude --acp` or similar)
- [ ] Map existing `Session` struct fields to ACP protocol concepts
- [ ] Determine which runners support ACP and how to invoke them in ACP mode
- [ ] Document discovery: how to detect if a runner supports ACP vs raw CLI

### Phase 2: Core ACP Client
- [x] Implement `AcpClient` in `leanspec-core` (stdio transport only)
- [x] `initialize` → capability negotiation
- [x] `session/new` → returns ACP session ID
- [x] `session/prompt` → accepts spec context as ContentBlocks
- [x] Handle `session/update` notifications → forward to LeanSpec session event stream
- [x] `session/cancel` → map to session stop

### Phase 3: Enhanced Session State
- [x] Store ACP session ID alongside LeanSpec session ID in DB
- [x] Surface tool calls & diffs in session log stream (not just raw text)
- [x] Surface agent execution plan (`plan` update) in UI
- [x] Permission request flow: agent → LeanSpec → UI → back to agent

### Phase 4: MCP Integration
- [x] Pass `leanspec-mcp` as MCP server in `session/new`
- [ ] Agent can directly read/update specs during session execution- [ ] Test with Claude Code, Gemini CLI, OpenCode

### Phase 5: Session Resume
- [ ] Store ACP session ID so sessions can be resumed with `session/load`
- [x] Only for runners with `loadSession` capability
- [x] UI: "Resume" button on completed/interrupted sessions

## Acceptance Criteria

- [ ] LeanSpec can create and drive an ACP session with at least one ACP-compatible runner
- [ ] Spec context is passed as structured ContentBlocks (not just env vars)
- [ ] Tool calls and diffs are captured and visible in session logs
- [ ] Agent plan is surfaced in the UI
- [ ] Non-ACP runners continue working unchanged via subprocess