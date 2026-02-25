---
status: planned
created: 2026-02-25
priority: critical
tags:
- ai
- chat
- tools
- mcp
- architecture
- ecosystem
depends_on:
- 316-ai-provider-abstraction
- 322-tool-call-ux-redesign
parent: 168-leanspec-orchestration-platform
created_at: 2026-02-25T07:04:22.410258Z
updated_at: 2026-02-25T07:04:44.595012Z
---

# Agentic AI Chat: Copilot-Grade Tool Ecosystem

## Overview

LeanSpec's AI chat today ships 10 hardcoded spec-management tools (list, view, create, update, search, validate, tokens, board, stats, relationships) plus a `run_subagent` dispatcher. This is a solid foundation — but it's a **closed system**. Users can't extend it, external agents can't leverage it without LeanSpec's own UI, and the chat lacks the workspace-aware, multi-tool agentic experience that VS Code Copilot and Cursor provide.

**The goal**: Transform LeanSpec's AI chat from a "spec chatbot with built-in tools" into a **Copilot-grade agentic environment** — one where the AI can read files, run commands, search code, manage specs, and orchestrate sessions — all in one conversation. Simultaneously, ensure every capability is accessible through **three independent channels**: the chat UI, the MCP server, and the HTTP API — so users who prefer their own AI tools (Claude Code, Copilot, Cursor, etc.) can still access all of LeanSpec's power.

### Why Now

1. **The chat is already good** — native Rust streaming, multi-provider support, session persistence, tool-calling loop — but the tool surface is too narrow for real development work.
2. **MCP adoption is accelerating** — every major AI coding tool supports MCP. Our MCP server exposes 10 spec tools but none of the broader capabilities (file read, search, sessions, runners).
3. **ACP is planned** (spec 330) — but ACP governs *session-level* communication with external runners. This spec governs the *chat-level* tool ecosystem that makes LeanSpec's own AI chat competitive.
4. **Provider abstraction is planned** (spec 316) — which unblocks adding more models. But models without tools are just text generators.

### Current State

```
┌─────────────────────────────────────────────────────────────┐
│                    TODAY: Closed Tool System                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AI Chat (10 tools)     MCP Server (10 tools)    CLI        │
│  ┌──────────────┐       ┌──────────────┐     ┌──────────┐  │
│  │ list,view,   │       │ list,view,   │     │ list,view│  │
│  │ create,update│       │ create,update│     │ create.. │  │
│  │ search,board │       │ search,board │     │          │  │
│  │ validate,... │       │ validate,... │     │          │  │
│  │ run_subagent │       │              │     │          │  │
│  └──────┬───────┘       └──────┬───────┘     └────┬─────┘  │
│         │ HTTP proxy           │ filesystem        │ binary │
│  ┌──────▼──────────────────────▼──────────────────▼──────┐  │
│  │                  leanspec-core (Rust)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ❌ No file read/write/search                               │
│  ❌ No terminal/command execution                            │
│  ❌ No external MCP server consumption                       │
│  ❌ No custom/user-defined tools                             │
│  ❌ MCP server lacks session/runner/chat tools               │
│  ❌ Can't extend without recompiling Rust                    │
└─────────────────────────────────────────────────────────────┘
```

### Target State

```
┌──────────────────────────────────────────────────────────────────────────┐
│                  TARGET: Open, Extensible Tool Ecosystem                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LeanSpec AI Chat         MCP Server (Full)        HTTP API (Full)       │
│  ┌─────────────────┐      ┌─────────────────┐      ┌────────────────┐   │
│  │ Spec tools (10) │      │ Spec tools (10) │      │ /api/specs     │   │
│  │ Workspace tools  │      │ Session tools   │      │ /api/sessions  │   │
│  │  • file_read     │      │ Runner tools    │      │ /api/runners   │   │
│  │  • file_search   │      │ Chat tools      │      │ /api/chat      │   │
│  │  • grep          │      │                 │      │ /api/files     │   │
│  │ Session tools    │      │                 │      │ /api/models    │   │
│  │  • run_session   │      │                 │      │                │   │
│  │  • session_status│      │                 │      │                │   │
│  │ External MCP ◄───┼──────┤ MCP Client      │      │                │   │
│  │  (consume tools  │      │ (aggregate)     │      │                │   │
│  │   from user's    │      │                 │      │                │   │
│  │   MCP servers)   │      │                 │      │                │   │
│  └────────┬────────┘      └────────┬────────┘      └───────┬────────┘   │
│           │                         │                        │            │
│  ┌────────▼─────────────────────────▼────────────────────────▼────────┐   │
│  │                      Unified Tool Registry (Rust)                  │   │
│  │  Built-in tools + External MCP tools + User config tools           │   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ✅ Read/search any file in the project                                  │
│  ✅ External MCP tool aggregation in chat                                │
│  ✅ MCP server exposes sessions, runners, chat management                │
│  ✅ Every capability accessible via MCP OR HTTP OR Chat                   │
│  ✅ Users can bring their own AI — just use MCP or HTTP                   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Non-Goals

- **Replacing VS Code / Cursor** — LeanSpec chat won't have code editing, LSP, or debugging. It's a *spec-driven orchestration chat*, not an IDE.
- **Full terminal execution in chat** — Running arbitrary user commands introduces security risks. Phase 1 focuses on read-only workspace tools and managed session dispatch. Terminal execution can follow in a later spec.
- **Building our own LLM** — We consume providers (OpenAI, Anthropic, etc.) via the provider abstraction (spec 316).
- **Duplicating ACP** — Spec 330 handles bidirectional runner communication. This spec focuses on the tool ecosystem *within* the chat agent itself.

## Design

### Principle: Three Channels, One Capability Set

Every LeanSpec capability should be accessible through **all three channels**:

| Channel | User | Transport | Use Case |
|---------|------|-----------|----------|
| **AI Chat** | Humans via LeanSpec UI | HTTP SSE | Conversational spec management + implementation |
| **MCP Server** | External AI tools (Claude Code, Copilot, etc.) | JSON-RPC stdio | Agent-to-LeanSpec integration |
| **HTTP API** | Scripts, CI/CD, custom integrations | REST/JSON | Programmatic access |

**Rule**: If a capability exists in one channel but not the others, that's a bug.

### Tool Categories

#### Category 1: Spec Management (Existing — Unify)

Already implemented in all three channels but with **schema divergence**. The TS chat-server had 14 tools (finer granularity: `edit_spec_section`, `append_to_section`, `update_checklist_item`, `edit_subspec`). The Rust implementations consolidated to 10 (the `update` tool handles sections, checklists, and content via parameters).

**Action**: Ensure MCP and Chat use identical tool schemas. The HTTP API already supports all operations.

#### Category 2: Workspace Tools (New — Chat + MCP)

The biggest gap. Today, the AI chat cannot read the user's project files. When implementing a spec, the AI can't look at existing code, search for patterns, or understand the codebase. VS Code Copilot and Cursor can do all of this.

| Tool | Description | Rationale |
|------|-------------|-----------|
| `file_read` | Read file contents (with line range) | Essential for understanding existing code before making spec decisions |
| `file_search` | Glob-based file discovery | Find relevant files by name/pattern |
| `grep` | Text/regex search across project files | Find code patterns, usages, definitions |
| `directory_list` | List directory contents | Navigate project structure |

**Security boundary**: All operations scoped to the project directory. No path traversal. No write operations in Phase 1 (specs are written through the spec tools; code is written through sessions/runners).

**Implementation**: These map directly to the existing HTTP API:
- `file_read` → `GET /api/projects/{id}/files/{path}` (already exists)
- `file_search` → `GET /api/projects/{id}/files?search=...` (already exists)
- `grep` → New endpoint, or expand file search with regex support
- `directory_list` → `GET /api/projects/{id}/files` with directory mode (already exists)

#### Category 3: Session and Runner Tools (New — Chat + MCP)

Allow the AI chat to manage coding sessions and dispatch work to runners, and expose these capabilities via MCP so external tools can orchestrate sessions too.

| Tool | Description | Channel |
|------|-------------|---------|
| `run_session` | Create and start an AI coding session for a spec | Chat + MCP |
| `session_status` | Check status of running/completed sessions | Chat + MCP |
| `list_sessions` | List sessions with filtering | Chat + MCP |
| `list_runners` | List available AI runners | Chat + MCP |
| `detect_runners` | Auto-detect installed runners | Chat + MCP |

**Note**: `run_subagent` (current tool) becomes a simpler alias for `run_session` with sensible defaults. The richer session tools give the AI (and external MCP consumers) full lifecycle control.

#### Category 4: External MCP Aggregation (New — Chat)

This is the key differentiator for making LeanSpec chat competitive. Users configure external MCP servers (e.g., a database MCP, a GitHub MCP, a custom internal tool) and those tools become available to the chat AI alongside LeanSpec's built-in tools.

```
[User's MCP Config] → LeanSpec aggregates → AI sees unified tool list
                                          ├── LeanSpec built-in tools
                                          ├── GitHub MCP tools
                                          ├── Database MCP tools
                                          └── Custom MCP tools
```

**Configuration** (in `.lean-spec/config.json` or project config):

```json
{
  "mcpServers": [
    {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
    },
    {
      "name": "postgres",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": { "DATABASE_URL": "${DATABASE_URL}" }
    }
  ]
}
```

**How it works**:
1. On chat session start, LeanSpec spawns configured MCP servers as child processes
2. Calls `tools/list` on each to discover available tools
3. Merges external tools into the `ToolRegistry` (prefixed: `github__create_issue`, `postgres__query`)
4. AI sees one unified tool list — doesn't know which tools are built-in vs external
5. On tool call, LeanSpec routes: built-in → local execution, external → forward to MCP server

**Lifecycle**: MCP server processes are managed per-chat-session (started on first use, stopped on session end or timeout).

### Architecture: Unified Tool Registry

The current `ToolRegistry` is a simple `Vec<ChatCompletionTools>` + `HashMap<String, ToolExecutor>`. The new design:

```rust
pub struct ToolRegistry {
    // Built-in tools (spec mgmt, workspace, sessions)
    builtin_tools: Vec<ToolDefinition>,
    builtin_executors: HashMap<String, ToolExecutor>,
    
    // External MCP tools (aggregated from user's MCP servers) 
    mcp_clients: HashMap<String, McpClient>,       // server_name → client
    mcp_tools: HashMap<String, McpToolRef>,         // prefixed_name → (server, original_name)
    
    // Combined schema for AI consumption
    cached_tool_schemas: Vec<ChatCompletionTools>,
}

impl ToolRegistry {
    /// Execute a tool — routes to builtin or MCP automatically
    pub async fn execute(&self, name: &str, input: Value) -> Result<String> {
        if let Some(executor) = self.builtin_executors.get(name) {
            executor(input)
        } else if let Some(mcp_ref) = self.mcp_tools.get(name) {
            self.mcp_clients[&mcp_ref.server]
                .call_tool(&mcp_ref.tool_name, input).await
        } else {
            Err(format!("Unknown tool: {name}"))
        }
    }
}
```

### MCP Server Expansion

The current MCP server (`leanspec-mcp`) exposes only 10 spec tools. Expand to include:

| New MCP Tool | Maps To |
|-------------|---------|
| `list_sessions` | Session management API |
| `create_session` | Create a session for a spec + runner |
| `session_status` | Get session status, logs |
| `list_runners` | List registered runners |
| `detect_runners` | Auto-detect installed runners |
| `file_read` | Read project file |
| `file_search` | Search project files |

This means external AI tools (Claude Code with LeanSpec MCP, Copilot in VS Code, etc.) can fully manage specs AND sessions AND read project context — without using LeanSpec's own chat UI at all.

### System Prompt Evolution

Current system prompt: "You are a LeanSpec Assistant. You manage specs using tools."

New system prompt (conceptual):

```
You are the LeanSpec AI assistant — an agentic development partner that helps users 
manage specs, understand their codebase, and orchestrate AI coding sessions.

You have access to:
- **Spec tools**: Create, update, search, and manage development specs
- **Workspace tools**: Read files, search code, explore project structure
- **Session tools**: Start AI coding sessions, check status, manage runners
- **External tools**: [dynamically listed from MCP aggregation]

When a user asks to implement a spec:
1. Read the spec to understand requirements
2. Search the codebase for relevant existing code
3. Propose an approach
4. Dispatch to a runner session if the user agrees

Follow SDD principles: context economy, progressive disclosure, verify against reality.
```

## Plan

### Phase 1: Workspace Tools + Unified Schema
- [ ] Add `file_read`, `file_search`, `grep`, `directory_list` tools to the AI chat tool registry in `leanspec-core`
- [ ] Ensure new tools use the same `make_tool<I>` pattern with `schemars` for schema generation
- [ ] Add corresponding HTTP endpoints for grep (or expand file search)
- [ ] Align chat and MCP tool schemas — ensure identical parameter names, types, and descriptions
- [ ] Update system prompt to reflect expanded tool surface
- [ ] Update UI `tool-result-registry.tsx` with rendering for workspace tool results (file content, search results)

### Phase 2: Session and Runner Tools in Chat
- [ ] Add `run_session`, `session_status`, `list_sessions`, `list_runners`, `detect_runners` to chat tool registry
- [ ] Replace `run_subagent` with `run_session` (keep `run_subagent` as alias for backward compat)
- [ ] Add tool result UI components for session status (progress, logs summary)

### Phase 3: MCP Server Expansion
- [ ] Add session/runner tools to `leanspec-mcp` — `list_sessions`, `create_session`, `session_status`, `list_runners`, `detect_runners`
- [ ] Add workspace tools to `leanspec-mcp` — `file_read`, `file_search`
- [ ] Update MCP server `tools/list` response with full tool surface
- [ ] Test with Claude Code, VS Code Copilot, and Cursor as MCP consumers

### Phase 4: External MCP Aggregation
- [ ] Implement MCP client in Rust (stdio transport) — connect to external MCP servers
- [ ] Add `mcpServers` configuration to project config schema
- [ ] Implement tool discovery: spawn MCP server → `tools/list` → merge into registry
- [ ] Implement tool routing: dispatch calls to correct MCP server by prefix
- [ ] Lifecycle management: start/stop MCP servers per chat session
- [ ] UI: Show external tool sources in tool result display (badge: "via GitHub MCP")

### Phase 5: Polish and Documentation
- [ ] Document the three-channel architecture in docs-site
- [ ] Add MCP server setup guide for popular AI tools (Claude Code, Copilot, Cursor)
- [ ] Add `mcpServers` configuration examples in project templates
- [ ] Performance: lazy-load MCP servers on first tool call (not on chat session start)

## Test

- [ ] Unit: workspace tools respect project directory boundary (no path traversal)
- [ ] Unit: MCP client correctly discovers and routes external tools
- [ ] Integration: AI chat can read a file, search for patterns, and reference them in spec creation
- [ ] Integration: MCP server consumers (Claude Code) can manage sessions via LeanSpec MCP
- [ ] Integration: External MCP tools appear in chat and execute correctly
- [ ] E2E: User asks "implement spec 042" → AI reads spec → searches codebase → proposes plan → dispatches session

## Notes

### Relationship to Other Specs

- **Spec 316 (Provider Abstraction)**: Provides the model layer; this spec provides the tool layer. Together they make the chat fully capable.
- **Spec 330 (ACP Sessions)**: ACP governs bidirectional communication *with* runners during a session. This spec governs the tools available *to the chat AI* — including the ability to start/manage those sessions.
- **Spec 168 (Orchestration Platform)**: This spec is a child — it implements the "tools and ecosystem" pillar of the orchestration vision.
- **Spec 322 (Tool Call UX)**: Already complete — provides the UI patterns for rendering tool results. New tools should follow the same patterns.

### Why Not Just Use MCP for Everything?

MCP is great for tool *exposure* to external agents. But for LeanSpec's own AI chat, we need:
1. **Tighter integration** — built-in tools execute in-process, not via stdio
2. **Streaming** — tool results can stream (e.g., large file reads) vs MCP's request-response
3. **Context** — built-in tools have access to the full project context, session state, etc.
4. **Performance** — no JSON-RPC overhead for every tool call

The answer is both: built-in tools for the chat, MCP for external consumption, and MCP aggregation to *consume* external tools.

### Security Considerations

- **Workspace tools**: Read-only, scoped to project directory. Path traversal protection (canonicalize + prefix check).
- **External MCP**: User explicitly configures which servers to connect. LeanSpec doesn't auto-discover or connect to unknown servers.
- **Session dispatch**: AI can propose sessions but requires user confirmation in the UI before starting (existing permission flow).
- **API keys**: External MCP server env vars support `${ENV_VAR}` interpolation — keys are never stored in config, only references.
