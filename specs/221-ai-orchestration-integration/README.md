---
status: in-progress
created: 2026-01-16
priority: critical
tags:
- orchestration
- integration
- ai-agents
- web
- chat
- sub-agents
- umbrella
depends_on:
- 239-ai-coding-session-management
- 267-ai-session-runner-configuration
- 288-runner-registry-consolidation
created_at: 2026-01-16T07:46:14.630001Z
updated_at: 2026-02-04T05:45:49.010966Z
---

# AI Multi-Agent Orchestration Platform

## Overview

**Purpose**: Coordinate AI orchestration through a chat-first, sub-agent architecture that treats our AI chat (spec 094) as the primary agent and AI runners as sub-agents.

**Problem**: We need unified access to multiple AI coding tools (Claude, Copilot, OpenCode, Gemini) without building complex PTY/TTY emulation.

**Solution**: This umbrella spec coordinates a simplified sub-agent approach:
- **Primary Agent**: Existing AI chat (spec 094) handles conversations and orchestration
- **Sub-Agents**: AI runners invoked via `runSubagent` tool - each handles its own context
- **Runner Registry**: Unified configuration for API keys, models, and settings (spec 288)

**Vision**: Make LeanSpec the simplest yet most powerful AI orchestration platform by leveraging existing chat infrastructure and treating runners as pluggable sub-agents.

## Strategic Pivot

### Why Sub-Agent Architecture (Not PTY Emulation)

The original plan involved complex PTY/VTE terminal emulation (specs 292-296). We've pivoted to a simpler approach:

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

### Key Insight

We don't need to natively interact with CLI tools. What we need is:
1. A unified chat interface (spec 094 provides this)
2. Ability to leverage multiple AI tools (sub-agent pattern)
3. Configuration reuse across tools (runner registry)

## Architecture

### Sub-Agent Based Orchestrator

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

### User Experience Flow

```
User opens Web UI Chat
  → Types: "Implement the API rate limiting feature using Claude"
  
Primary Agent (AI Chat):
  → Searches specs: "api rate limiting"
  → Finds: "095-api-rate-limiting (planned)"
  → Invokes runSubagent tool with:
      - runner: "claude"
      - task: "Implement spec 095"
      - context: workspace path, spec content
  
Sub-Agent (Claude):
  → Receives context injection
  → Handles its own context window
  → Implements the feature
  → Returns consolidated result
  
Primary Agent:
  → Receives result from sub-agent
  → Summarizes: "Claude completed the implementation..."
  → Updates spec status to in-progress
  → Shows user what was done
```

## Child Specs

### Active (Simplified Architecture)

| Spec | Purpose | Status |
|------|---------|--------|
| **291-cli-runtime-web-orchestrator** | Sub-agent orchestrator implementation | in-progress |
| **295-runtime-abstraction-session-registry** | Sub-agent session management (simplified) | planned |

### Archived (PTY Approach Deprecated)

| Spec | Reason for Archive |
|------|-------------------|
| **292-pty-process-layer** | PTY emulation no longer needed |
| **293-headless-vte-terminal** | Terminal emulation unnecessary |
| **294-hybrid-rendering-engine** | TUI rendering out of scope |
| **296-incremental-data-protocol** | Dirty rect streaming not needed |

### Restored

| Spec | Purpose |
|------|---------|
| **094-ai-chatbot-web-integration** | Restored as primary agent implementation |

## Dependencies

**Foundation (exists)**:
- ✅ **186-rust-http-server**: Backend infrastructure
- ✅ **187-vite-spa-migration**: Frontend foundation

**Core Components**:
- **094-ai-chatbot-web-integration**: Primary agent (chat interface)
- **239-ai-coding-session-management**: Session management foundation
- **267-ai-session-runner-configuration**: Runner configs
- **288-runner-registry-consolidation**: Unified runner definitions

## Implementation Roadmap

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
- [ ] Runner configuration examples
- [ ] Sub-agent development guide

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Supported runners** | 4+ at launch | Count |
| **Sub-agent latency** | <5s for simple tasks | Performance monitoring |
| **Implementation time** | 3-4 weeks | Actual vs planned |
| **User adoption** | 50% prefer web over CLI | User surveys |

## Trade-offs Accepted

- ❌ Cannot render TUI interfaces (vim, fzf, etc.) - acceptable for our use case
- ❌ No interactive CLI sessions - acceptable, results-oriented instead
- ✅ Much simpler implementation
- ✅ Faster time to value
- ✅ Easier maintenance

## Sub-Agent Pattern Benefits

1. **Context Isolation**: Each sub-agent manages its own context window
2. **Specialization**: Route tasks to the best tool (Claude for reasoning, Copilot for code generation)
3. **Failure Isolation**: Sub-agent failures don't crash primary agent
4. **Scalability**: Easy to add new runners without architecture changes

## Future Enhancements

- **Parallel sub-agents**: Run multiple AI tools simultaneously
- **Context sharing**: Share relevant context between sub-agents
- **Result caching**: Cache sub-agent results for similar queries
- **Runner recommendations**: Suggest best runner for task type

---

**Key Decision**: Focus on simplicity and time-to-value by leveraging existing chat infrastructure rather than building complex terminal emulation.