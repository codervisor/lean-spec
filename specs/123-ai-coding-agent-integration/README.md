---
status: complete
created: '2025-11-26'
tags:
  - ai-agents
  - workflow
  - automation
  - cli
  - integration
  - parallel-development
priority: high
created_at: '2025-11-26T06:25:37.182Z'
updated_at: '2025-12-04T06:46:29.291Z'
transitions:
  - status: in-progress
    at: '2025-11-26T06:51:40.423Z'
  - status: complete
    at: '2025-11-26T06:52:56.582Z'
completed_at: '2025-11-26T06:52:56.582Z'
completed: '2025-11-26'
depends_on:
  - 118-parallel-spec-implementation
---

# AI Coding Agent Integration for Automated Spec Orchestration

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-26 · **Tags**: ai-agents, workflow, automation, cli, integration, parallel-development

> **⚠️ ARCHITECTURAL UPDATE (2025-12-10)**: See **spec 159** for architectural clarification. This spec implements LeanSpec's **dispatch interface** (the "what" and "context"), while actual agent orchestration (sessions, PTY, multi-agent coordination) should be handled by **[agent-relay](https://github.com/codervisor/agent-relay)**. Current implementation provides basic CLI dispatching; production orchestration belongs in agent-relay.

**Project**: lean-spec  
**Team**: Core Development

## Overview

Integrate AI coding agents (GitHub Copilot CLI, Claude Code, Gemini CLI, etc.) with LeanSpec to enable spec-driven development. LeanSpec provides the **dispatch interface and context management**, while agent orchestration engines like [agent-relay](https://github.com/codervisor/agent-relay) handle execution, session management, and multi-agent coordination.

**Problem**:
- Users manually orchestrate AI agents to implement specs (copy context, manage branches, update status)
- No unified interface to dispatch specs to agents
- Agent sessions are disconnected from spec lifecycle (status, dependencies, completion)

**LeanSpec's Role** (see spec 159):
1. Provide spec content and context to agents
2. Simple CLI dispatch interface (`lean-spec agent run`)
3. Track spec status updates
4. Expose specs via MCP for AI-to-AI orchestration

**agent-relay's Role** (see spec 159):
- Agent session management and persistence
- Multi-agent coordination and parallel execution
- PTY/terminal streaming
- WebSocket infrastructure
- Phase-based workflows

## Design

### LeanSpec's Dispatch Interface (Current Implementation)

**What LeanSpec Provides**:

1. **Spec Context for Agents**
   - Read spec content, dependencies, metadata
   - Token counting for context budgeting
   - MCP tools for AI-to-AI communication

2. **Simple CLI Dispatch**
   - `lean-spec agent run <spec> --agent <type>`
   - Opens agent with spec context
   - Updates spec status (planned → in-progress)
   - Basic parallel support via worktrees (spec 118)

3. **Agent Registry**
   - List available agents
   - Configure default agent
   - Detect agent availability

**What LeanSpec Does NOT Do** (see spec 159):
- ❌ Session persistence across multiple invocations
- ❌ PTY/terminal management
- ❌ Multi-agent coordination
- ❌ WebSocket infrastructure
- ❌ Phase-based workflows

**These belong in agent-relay** ([github.com/codervisor/agent-relay](https://github.com/codervisor/agent-relay))

### Supported Agent Types

**CLI-Based Agents (Local)**:
- GitHub Copilot CLI (`gh copilot`)
- Claude Code (Anthropic)
- Gemini CLI (Google)
- Aider
- Continue.dev

**Cloud-Based Agents**:
- GitHub Coding Agent (creates PRs automatically)
- Future: Other cloud coding services

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    LeanSpec (Dispatch Layer)                 │
├─────────────────────────────────────────────────────────────┤
│  • Spec storage & retrieval                                 │
│  • Context injection (spec content → agent)                 │
│  • Status tracking (planned → in-progress → complete)       │
│  • Simple CLI dispatch                                      │
│  • MCP tools for AI-to-AI communication                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ dispatches to
┌─────────────────────────────────────────────────────────────┐
│              agent-relay (Orchestration Engine)              │
├─────────────────────────────────────────────────────────────┤
│  • Session management & persistence                         │
│  • Multi-agent coordination                                 │
│  • PTY/terminal streaming                                   │
│  • WebSocket infrastructure                                 │
│  • Phase-based workflows (design → impl → test → docs)      │
│  • Runner management (distributed execution)                │
└─────────────────────────────────────────────────────────────┘
```

**Current State**: LeanSpec implements basic dispatch. For production orchestration, use agent-relay.

**Future**: `lean-spec agent run` becomes a thin wrapper that dispatches to agent-relay if available.

### Proposed Commands

```bash
# Dispatch a spec to an AI agent
lean-spec agent run <spec> [--agent <type>] [--parallel]

# Examples:
lean-spec agent run 045 --agent claude      # Use Claude Code locally
lean-spec agent run 045 --agent gh-coding   # Use GitHub Coding Agent (cloud)
lean-spec agent run 045 --agent copilot     # Use GitHub Copilot CLI
lean-spec agent run 045                     # Use default agent from config

# Run multiple specs in parallel (extends spec 118)
lean-spec agent run 045 047 048 --parallel  # Creates worktrees, dispatches agents

# Check agent status
lean-spec agent status [<spec>]

# Configure default agent
lean-spec config set default-agent claude
```

### MCP Tool Extensions

```typescript
// New MCP tools for agent orchestration
mcp_lean-spec_agent_run     // Dispatch spec to agent
mcp_lean-spec_agent_status  // Check agent progress
mcp_lean-spec_agent_list    // List available agents
```

### Workflow Integration

**Simple Dispatch (Current Implementation)**:
```bash
lean-spec agent run 045 --agent claude
# 1. Updates spec status to in-progress
# 2. Reads spec content and dependencies
# 3. Opens agent (Claude/Copilot/etc.) with spec context
# 4. Agent works in current directory
# 5. User manually updates spec status when done
```

**With agent-relay (Future/Recommended)**:
```bash
# LeanSpec provides context, agent-relay handles execution
agent-relay dispatch \
  --spec lean-spec://specs/045-dashboard \
  --agent claude \
  --runner dev-machine-01

# agent-relay:
# 1. Reads spec from LeanSpec (via MCP or filesystem)
# 2. Creates session with spec context
# 3. Spawns runner with PTY streaming
# 4. Manages multi-phase workflow (design → impl → test)
# 5. Updates LeanSpec status via MCP callbacks
# 6. Logs activity to Devlog
```

**Parallel Specs (spec 118 integration)**:
```bash
lean-spec agent run 045 047 048 --parallel --agent claude
# Basic implementation: Creates worktrees, opens separate agent sessions
# With agent-relay: Full multi-agent coordination with session persistence
```

### Configuration

```yaml
# .leanspec/config.yaml
agents:
  default: claude
  
  claude:
    type: cli
    command: claude
    context-template: |
      Implement the following spec:
      ---
      {spec_content}
      ---
      Create the implementation in this worktree.
  
  gh-coding:
    type: cloud
    provider: github
    # Uses GitHub App or PAT for API access
  
  copilot:
    type: cli
    command: gh copilot suggest
```

## Plan

- [x] Research agent APIs and CLI interfaces (Claude Code, Copilot CLI, Gemini CLI)
- [x] Design agent adapter interface (abstract common operations)
- [x] Implement CLI agent adapter (exec-based, stdin/stdout)
- [x] Implement GitHub Coding Agent adapter (API-based) - basic implementation, needs GitHub API integration
- [x] Create `lean-spec agent run` command
- [x] Integrate with worktree creation (spec 118)
- [x] Add spec status auto-update on agent events
- [x] Implement `lean-spec agent status` for monitoring
- [x] Add MCP tools for agent orchestration
- [ ] Document agent setup for each supported provider
- [ ] Create example workflows in docs

## Test

**Verification Criteria**:

- [x] Can dispatch a spec to Claude Code and have it start implementation
- [ ] Can dispatch a spec to GitHub Coding Agent and receive PR (requires GitHub API setup)
- [x] Parallel dispatch creates proper worktrees and isolated sessions
- [x] Spec status updates automatically on agent completion
- [x] Agent configuration is flexible and extensible
- [x] MCP tools work for AI-to-AI orchestration

**Integration Tests**:

- [ ] End-to-end: spec → agent → implementation → PR → status update
- [x] Parallel: 3 specs → 3 agents → 3 worktrees → all complete (via --parallel flag)
- [x] Failure handling: agent error → spec status reflects failure

## Implementation Notes

### CLI Commands Implemented

```bash
# List available agents
lean-spec agent list [--json]

# Dispatch spec(s) to AI agent
lean-spec agent run <specs...> [--agent <type>] [--parallel] [--dry-run]

# Check agent session status  
lean-spec agent status [<spec>] [--json]

# Configure default agent
lean-spec agent config <agent>
```

### Supported Agents

| Agent | Type | Command | Status |
|-------|------|---------|--------|
| claude | CLI | `claude` | ✅ Ready |
| copilot | CLI | `gh copilot` | ✅ Ready |
| aider | CLI | `aider` | ✅ Ready |
| gemini | CLI | `gemini` | ✅ Ready |
| continue | CLI | `continue` | ✅ Ready |
| gh-coding | Cloud | GitHub API | 🚧 Basic support |

### MCP Tools Added

- `agent_run` - Dispatch spec(s) to AI agent
- `agent_status` - Check agent session status
- `agent_list` - List available agents

### Files Modified/Added

- `packages/cli/src/commands/agent.ts` - Main agent command implementation
- `packages/cli/src/commands/agent.test.ts` - Unit tests
- `packages/cli/src/mcp/tools/agent.ts` - MCP tool definitions
- `packages/cli/src/mcp/tools/registry.ts` - Register new tools
- `packages/cli/src/commands/index.ts` - Export agent command
- `packages/cli/src/commands/registry.ts` - Register agent command
- `packages/cli/src/cli.ts` - Add to help text

## Notes

### Architectural Clarification (2025-12-10)

See **spec 159** for detailed separation of concerns:

**LeanSpec's Scope** (this spec):
- ✅ Spec storage, retrieval, search
- ✅ Context injection for agents
- ✅ Simple CLI dispatch to agents
- ✅ Status tracking
- ✅ MCP tools for AI-to-AI communication

**agent-relay's Scope** (separate project):
- ✅ Session persistence and management
- ✅ Multi-agent coordination
- ✅ PTY/terminal streaming
- ✅ Phase-based workflows
- ✅ Distributed runners

**Current Implementation**: Basic CLI dispatch in LeanSpec works for simple use cases. For production orchestration, complex workflows, or multi-phase implementation, use agent-relay.

**Migration Path**: `lean-spec agent run` can become a proxy to agent-relay when installed, falling back to simple dispatch otherwise.

### Open Questions
- How to handle agent authentication (API keys, OAuth)?
- Should we support custom agent prompts per spec/project?
- How to handle long-running agents (timeout, checkpoints)?
- Priority: CLI agents first (simpler) or cloud agents first (more powerful)?

**Answers**:
- CLI agents implemented first as they are simpler and more universally available
- Custom prompts supported via `contextTemplate` in agent configuration
- Sessions tracked in memory; for persistence would need database/file storage
- Cloud agents (gh-coding) have basic support; full API integration deferred

**Research Needed**:
- Claude Code CLI interface and automation options
- GitHub Coding Agent API (triggering, status checking)
- Gemini CLI capabilities
- Aider integration patterns

**Related Work**:
- **Spec 118**: Git worktrees for parallel development (foundation)
- **Spec 158**: Persistent agent sessions (concepts moved to agent-relay)
- **Spec 159**: LeanSpec as memory layer architecture
- **Spec 072**: AI agent first-use workflow (onboarding)
- **Spec 110**: Project-aware AGENTS.md generation (context)
- **agent-relay**: [github.com/codervisor/agent-relay](https://github.com/codervisor/agent-relay) (orchestration engine)

**Alternatives Considered**:
- Full orchestration in LeanSpec - violates single responsibility (moved to agent-relay)
- IDE-only integration (VS Code tasks) - too narrow
- Shell scripts only - not portable, hard to maintain
