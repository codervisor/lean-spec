---
status: in-progress
created: 2026-02-03
priority: critical
tags:
- architecture
- ai-agents
- orchestration
- terminal
- web-ui
- umbrella
depends_on:
- 239-ai-coding-session-management
- 267-ai-session-runner-configuration
- 288-runner-registry-consolidation
parent: 221-ai-orchestration-integration
created_at: 2026-02-03T13:38:41.437429Z
updated_at: 2026-02-03T15:33:23.827581Z
transitions:
- status: in-progress
  at: 2026-02-03T15:33:23.827581Z
---

# AI Chat + Sub-Agent Orchestrator

> **Consolidates**: This umbrella now includes spec 094 (AI Chatbot for Web UI) as a child spec.

## Overview

### The Strategic Vision

**Unified AI chat orchestration**: The AI chat interface (spec 094) serves as the primary agent, with AI runners (Claude, Copilot, OpenCode, etc.) invoked as sub-agents via the `runSubagent` tool. This approach eliminates the complexity of full PTY/TTY emulation while providing unified access to multiple AI coding tools.

### Key Insight

We don't need to fully emulate PTY/TTY because we don't need to natively interact with CLI tools. Instead:

1. **Primary Agent (Master Agent)**: Our existing AI chat implementation (spec 094) handles the main conversation, leveraging runner configurations (API keys, model settings, etc.)
2. **Sub-Agents**: AI runners (Claude, Copilot, OpenCode, etc.) are invoked as sub-agent sessions via `runSubagent` tool - each handles its own context management

### Why This Approach

**Problems with Full PTY Emulation**:
- ❌ Complex VTE parsing and terminal state management
- ❌ Dirty rect tracking and streaming overhead
- ❌ Significant development time (10-12 weeks estimated)
- ❌ Maintenance burden for terminal edge cases

**Benefits of Sub-Agent Architecture**:
- ✅ Leverage existing, working AI chat (spec 094)
- ✅ Runners handle their own context - we just invoke and get results
- ✅ Much simpler implementation (2-3 weeks)
- ✅ Unified configuration through runner registry
- ✅ Each AI tool can use its native strengths

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Sub-Agent Based AI Orchestrator                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │              Web Client (@leanspec/ui)                          │   │
│   │                                                                 │   │
│   │   ┌───────────────────────────────────────────────────────┐     │   │
│   │   │              AI Chat Interface                        │     │   │
│   │   │  - Existing spec 094 implementation                   │     │   │
│   │   │  - AI SDK streaming + tool calling                    │     │   │
│   │   │  - Chat history persistence                           │     │   │
│   │   └───────────────────────────────────────────────────────┘     │   │
│   │                        ↕ HTTP/SSE                               │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                     │                                   │
│   ┌─────────────────────────────────▼───────────────────────────────┐   │
│   │              Primary Agent (@leanspec/chat-server)              │   │
│   │                                                                 │   │
│   │   ┌─────────────────────────────────────────────────────────┐   │   │
│   │   │              Tool Registry                              │   │   │
│   │   │  • LeanSpec tools (CRUD, search, validate)              │   │   │
│   │   │  • runSubagent tool (invoke AI runners)                 │   │   │
│   │   │  • File system tools                                    │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │                              │                                  │   │
│   │   ┌──────────────────────────▼──────────────────────────────┐   │   │
│   │   │              Runner Config Layer                        │   │   │
│   │   │  • Load API keys from runner registry                   │   │   │
│   │   │  • Model selection per runner                           │   │   │
│   │   │  • Context/workspace configuration                      │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │                              │                                  │   │
│   │   ┌──────────────────────────▼──────────────────────────────┐   │   │
│   │   │              Sub-Agent Dispatch                         │   │   │
│   │   │                                                         │   │   │
│   │   │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │   │   │
│   │   │   │ Claude  │ │ Copilot │ │ OpenCode│ │ Gemini  │      │   │   │
│   │   │   │ Session │ │ Session │ │ Session │ │ Session │      │   │   │
│   │   │   └─────────┘ └─────────┘ └─────────┘ └─────────┘      │   │   │
│   │   │                                                         │   │   │
│   │   │   Each sub-agent: handles own context, returns result   │   │   │
│   │   └─────────────────────────────────────────────────────────┘   │   │
│   │                                                                 │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comparison

| Feature             | PTY Emulation (old plan) | Sub-Agent Architecture (new) |
| ------------------- | ------------------------ | ---------------------------- |
| Implementation time | 10-12 weeks              | 2-3 weeks                    |
| Complexity          | High (VTE, dirty rects)  | Low (tool calling)           |
| Tool support        | Any CLI with PTY         | AI runners with API support  |
| Context handling    | We manage                | Sub-agent handles            |
| Maintenance burden  | High                     | Low                          |
| Feature reuse       | Minimal                  | Leverages spec 094           |

## Design

This revised approach simplifies the umbrella scope:

### 1. Extend Native Rust AI Chat (Spec 094)

**Purpose**: The AI chat is now native Rust in `leanspec-core/src/ai_native/`. Spec 094's implementation has been migrated from Node.js to Rust (spec 264 complete).

**Current Implementation:**
- `chat.rs` - Streaming chat with OpenAI/Anthropic
- `providers.rs` - Provider selection and client creation
- `tools/mod.rs` - 13 LeanSpec tools with JsonSchema

**Enhancements Needed:**
- Add file-context injection for `run_subagent` (workspace path only today)
- Add multi-runner configuration tests
- Expand sub-agent session lifecycle (spec 295)

### 2. Sub-Agent Tool Implementation (New Spec)

**Purpose**: Implement `runSubagent` tool that invokes AI runners.

**Key Capabilities**:
- Load runner config from registry (spec 288)
- Dispatch task to selected AI runner
- Return consolidated result to primary agent
- Handle context handoff (workspace path, relevant files)

### 3. Runner Session Management (Spec 295 - Simplified)

**Purpose**: Manage sub-agent sessions without PTY complexity.

**Key Capabilities**:
- Session creation/destruction for sub-agents
- Context injection (workspace, spec context)
- Result collection and formatting
- Optional: session persistence for long tasks

## Child Specs

### Active

| Spec                               | Purpose                                          | Status      |
| ---------------------------------- | ------------------------------------------------ | ----------- |
| **094-ai-chatbot-web-integration** | Primary agent: Chat UI + `@leanspec/chat-server` | in-progress |
| **295-runtime-session-registry**   | Sub-agent session management                     | planned     |

### Archived (PTY Approach Deprecated)

| Spec                              | Reason                          |
| --------------------------------- | ------------------------------- |
| **292-pty-process-layer**         | PTY emulation no longer needed  |
| **293-headless-vte-terminal**     | Terminal emulation unnecessary  |
| **294-hybrid-rendering-engine**   | TUI rendering out of scope      |
| **296-incremental-data-protocol** | Dirty rect streaming not needed |

## Dependencies

| Spec                                    | Purpose                              |
| --------------------------------------- | ------------------------------------ |
| **239-ai-coding-session-management**    | Session management foundation        |
| **267-ai-session-runner-configuration** | Runner configs used by primary agent |
| **288-runner-registry-consolidation**   | Registry provides runner definitions |
| **186-rust-http-server**                | HTTP/WebSocket server infrastructure |
| **187-vite-spa-migration**              | UI foundation                        |

## Extends/Integrates

- **168-leanspec-orchestration-platform** → Uses this for AI execution
- **221-ai-orchestration-integration** → Parent umbrella

## Plan

### Phase 1: Activate Spec 094 (Week 1)
- [x] Set spec 094 status to in-progress (now a child of this umbrella)
- [x] Review current chat-server implementation state
- [x] Identify gaps for runner config integration
- [x] Verify archived PTY-related child specs (292, 293, 294, 296)

#### Implementation Review Findings (2026-02-04)

**Key Finding**: The Node.js `@leanspec/chat-server` was retired (spec 264 complete). AI chat is now **native Rust** in `leanspec-core/src/ai_native/`.

**Current State:**
- ✅ Native Rust AI chat with streaming (`chat.rs`)
- ✅ OpenAI and Anthropic providers (`providers.rs`)
- ✅ 14 LeanSpec tools implemented (`tools/mod.rs`)
- ✅ Multi-step conversation with tool calling
- ✅ `run_subagent` tool implemented
- ✅ Runner registry integration for sub-agents

**Existing Tools (14):**
1. `list_specs`, `search_specs`, `get_spec`
2. `update_spec_status`, `link_specs`, `unlink_specs`
3. `validate_specs`, `read_spec`, `update_spec`
4. `update_spec_section`, `toggle_checklist_item`
5. `read_subspec`, `update_subspec`
6. `run_subagent`

**Gap Analysis:**
- Need `runSubagent` tool to invoke AI runners as sub-agents
- Need to integrate `RunnerRegistry` (spec 288) with ai_native module
- Need context injection (workspace path, spec context) for sub-agents

### Phase 2: Runner Config Integration (Week 1-2)
- [x] Add `RunnerRegistry` access to `ai_native` module
- [x] Implement runner config resolution (API keys, model settings)
- [x] Add runner selection based on config
- [ ] Test with multiple runner configurations

### Phase 3: Sub-Agent Tool (Week 2)
- [x] Create `RunSubagentInput` struct with JsonSchema derive
- [x] Implement `run_subagent` tool in `tools/mod.rs`
- [x] Implement runner dispatch logic (invoke CLI runners)
- [ ] Handle context injection (workspace path, file context)
- [x] Return formatted results to primary agent

### Phase 4: Session Management (Week 3)
- [ ] Simplify spec 295 to sub-agent focus
- [ ] Implement session lifecycle (create, run, destroy)
- [ ] Add optional session persistence
- [ ] Test multi-runner scenarios

### Phase 5: Integration & Testing (Week 3)
- [ ] End-to-end test: Primary agent invoking Claude sub-agent
- [ ] End-to-end test: Switching between runners mid-conversation
- [ ] Performance testing: sub-agent latency
- [ ] User acceptance testing

### Phase 6: Documentation (Week 4)
- [ ] Update docs-site with new architecture
- [ ] Migration guide from old PTY approach (for reviewers)
- [ ] Runner configuration examples

## Test

### Integration Tests
- [ ] Primary agent loads runner configurations correctly
- [ ] `runSubagent` tool dispatches to correct runner
- [ ] Context injection (workspace path) works
- [ ] Results returned and formatted in chat

### Unit Tests
- [ ] Runner config resolution
- [ ] Sub-agent tool schema validation
- [ ] Session lifecycle management

### User Acceptance Tests
- [ ] Run task via Claude sub-agent from chat
- [ ] Switch between different runners mid-conversation
- [ ] Primary agent summarizes sub-agent results

## Success Metrics

| Metric                  | Target                  | Measurement            |
| ----------------------- | ----------------------- | ---------------------- |
| **Supported runners**   | 4+ at launch            | Count                  |
| **Sub-agent latency**   | <5s for simple tasks    | Performance monitoring |
| **Implementation time** | 3-4 weeks               | Actual vs planned      |
| **User adoption**       | 50% prefer web over CLI | User surveys           |

## Notes

### Architecture Decision: Sub-Agent vs PTY Emulation

**Key Realization**: We don't need native CLI interaction. What we need is:
1. A unified chat interface (spec 094 provides this)
2. Ability to leverage multiple AI tools (sub-agent pattern)
3. Configuration reuse across tools (runner registry)

**Trade-offs Accepted**:
- ❌ Cannot render TUI interfaces (vim, fzf, etc.) - acceptable for our use case
- ❌ No interactive CLI sessions - acceptable, results-oriented instead
- ✅ Much simpler implementation
- ✅ Faster time to value

### Sub-Agent Pattern Benefits

1. **Context Isolation**: Each sub-agent manages its own context window
2. **Specialization**: Route tasks to the best tool (Claude for reasoning, Copilot for code generation)
3. **Failure Isolation**: Sub-agent failures don't crash primary agent
4. **Scalability**: Easy to add new runners without architecture changes

### Related Prior Art

- **AI SDK Multi-step**: Already supports tool calling chains
- **LangChain Agents**: Similar primary/sub-agent patterns
- **AutoGPT**: Autonomous agent with tool dispatch

### Future Enhancements

- **Parallel sub-agents**: Run multiple AI tools simultaneously
- **Context sharing**: Share relevant context between sub-agents
- **Result caching**: Cache sub-agent results for similar queries
- **Runner recommendations**: Suggest best runner for task type

### Progress Notes

**2026-02-04**
- Verified native AI chat integration and runner registry wiring in Rust.
- Implemented `run_subagent` tool with runner dispatch and structured output.
- Tests: `cargo test -p leanspec-core --features full`.
- Pending: context injection for file context and multi-runner configuration testing.