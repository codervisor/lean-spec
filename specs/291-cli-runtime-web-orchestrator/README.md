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

# Multi-Runtime AI CLI Web Orchestrator

## Overview

### The Strategic Vision

**Simplify AI tool orchestration by treating our existing AI chat (spec 094) as a primary agent and AI runners as sub-agents.** This approach eliminates the complexity of full PTY/TTY emulation while still providing unified access to multiple AI coding tools.

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

| Feature | PTY Emulation (old plan) | Sub-Agent Architecture (new) |
|---------|-------------------------|------------------------------|
| Implementation time | 10-12 weeks | 2-3 weeks |
| Complexity | High (VTE, dirty rects) | Low (tool calling) |
| Tool support | Any CLI with PTY | AI runners with API support |
| Context handling | We manage | Sub-agent handles |
| Maintenance burden | High | Low |
| Feature reuse | Minimal | Leverages spec 094 |

## Design

This revised approach simplifies the umbrella scope:

### 1. Unarchive and Extend Spec 094

**Purpose**: Restore the AI Chatbot Web Integration as the primary agent.

**Enhancements**:
- Integrate runner configuration loading (API keys, model settings)
- Add `runSubagent` tool for delegating to AI runners
- Extend tool registry with sub-agent dispatch

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

## Relationship to Existing Specs

### Restored (Un-archived)

- **094-ai-chatbot-web-integration** → Becomes primary agent implementation

### Child Specs (Simplified)

- **292-pty-process-layer** → **No longer needed** (archived)
- **293-headless-vte-terminal** → **No longer needed** (archived)
- **294-hybrid-rendering-engine** → **No longer needed** (archived)
- **295-runtime-abstraction-session-registry** → **Simplified** to sub-agent session management
- **296-incremental-data-protocol** → **No longer needed** (archived)

### Dependencies (Unchanged)

- **239-ai-coding-session-management** → Session management foundation
- **267-ai-session-runner-configuration** → Runner configs used by primary agent
- **288-runner-registry-consolidation** → Registry provides runner definitions

## Relationship to Existing Specs

### Supersedes (Archived)

- **094-ai-chatbot-web-integration** → Replaced by this architecture
- **223-chat-persistence-strategy** → Absorbed into session registry
- **227-ai-chat-ui-ux-modernization** → Absorbed into hybrid rendering
- **235-chat-terminology-refactoring** → No longer relevant
- **236-chat-config-api-migration** → No longer relevant

### Extends/Integrates

- **168-leanspec-orchestration-platform** → Uses this for AI execution
- **221-ai-orchestration-integration** → This becomes the execution layer
- **239-ai-coding-session-management** → Enhanced with PTY/VTE layer
- **267-ai-session-runner-configuration** → Runner configs used by PTY layer
- **287/288-runner-registry** → Registry provides runtime definitions

### Dependencies

- **186-rust-http-server** → HTTP/WebSocket server infrastructure
- **187-vite-spa-migration** → UI foundation

## Plan

### Phase 1: Restore Spec 094 (Week 1)
- [ ] Un-archive spec 094 (set status back to in-progress)
- [ ] Review current implementation state
- [ ] Identify gaps for runner config integration
- [ ] Archive obsolete PTY-related child specs (292, 293, 294, 296)

### Phase 2: Runner Config Integration (Week 1-2)
- [ ] Add runner config loader to chat-server
- [ ] Implement config resolution (API keys, model settings)
- [ ] Add model selection based on runner type
- [ ] Test with multiple runner configurations

### Phase 3: Sub-Agent Tool (Week 2)
- [ ] Create `runSubagent` tool definition with Zod schema
- [ ] Implement runner dispatch logic
- [ ] Handle context injection (workspace path, file context)
- [ ] Return formatted results to primary agent

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

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Supported runners** | 4+ at launch | Count |
| **Sub-agent latency** | <5s for simple tasks | Performance monitoring |
| **Implementation time** | 3-4 weeks | Actual vs planned |
| **User adoption** | 50% prefer web over CLI | User surveys |

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Supported runtimes** | 6+ at launch | Count |
| **Rendering latency** | <100ms | Performance monitoring |
| **TUI fidelity** | 95%+ accurate | Visual comparison tests |
| **Session recovery** | <1s restore | Performance testing |
| **User adoption** | 50% prefer web over CLI | User surveys |

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