---
status: planned
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
related:
  - 118-parallel-spec-implementation
  - 072-ai-agent-first-use-workflow
  - 110-project-aware-agents-generation
---

# AI Coding Agent Integration for Automated Spec Orchestration

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-26

**Project**: lean-spec  
**Team**: Core Development

## Overview

Integrate AI coding agents (GitHub Copilot CLI, Claude Code, Gemini CLI, OpenChat, GitHub Coding Agent, etc.) directly into LeanSpec to automate spec implementation orchestration. Currently users manually manage agent sessions, branch creation, and spec status updates. This spec extends the parallel spec implementation work (spec 118) to enable seamless agent-driven development without manual coordination.

**Problem**:
- Users manually orchestrate AI agents to implement specs (copy context, manage branches, update status)
- No unified interface across different agent types (CLI-based vs cloud-based)
- Parallel spec implementation (spec 118) requires manual worktree management
- Agent sessions are disconnected from spec lifecycle (status, dependencies, completion)

**Goals**:
1. Unified interface to dispatch specs to various AI coding agents
2. Automatic environment setup (branches, worktrees) based on spec requirements
3. Bi-directional sync between agent progress and spec status
4. Support both CLI agents (local) and cloud agents (GitHub Coding Agent)
5. Enable parallel spec implementation with minimal manual coordination

## Design

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
│                    LeanSpec CLI / MCP                        │
├─────────────────────────────────────────────────────────────┤
│                   Agent Orchestrator                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ CLI Adapter  │  │Cloud Adapter │  │ Status Sync  │      │
│  │ (local exec) │  │  (API/GH)    │  │  (webhooks)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│              Environment Manager                             │
│  • Git worktree creation (parallel specs)                   │
│  • Branch strategy enforcement                              │
│  • Context injection (spec content → agent prompt)          │
└─────────────────────────────────────────────────────────────┘
```

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

**Single Spec → Agent**:
```bash
lean-spec agent run 045 --agent claude
# 1. Updates spec status to in-progress
# 2. Creates feature branch (feature/045-dashboard)
# 3. Injects spec content as agent context
# 4. Launches agent with appropriate prompt
# 5. Monitors for completion (optional webhook/polling)
# 6. Updates spec status on completion
```

**Parallel Specs → Agents (extends spec 118)**:
```bash
lean-spec agent run 045 047 048 --parallel --agent claude
# 1. Creates .worktrees/ for each spec
# 2. Updates all specs to in-progress
# 3. Dispatches agent to each worktree (separate sessions)
# 4. Monitors all sessions
# 5. Reports completion status
```

**Cloud Agent (GitHub Coding Agent)**:
```bash
lean-spec agent run 045 --agent gh-coding
# 1. Creates GitHub issue from spec (if not exists)
# 2. Triggers GitHub Coding Agent via API
# 3. Agent creates branch + PR automatically
# 4. LeanSpec monitors PR status via webhooks
# 5. Updates spec status when PR merged
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

- [ ] Research agent APIs and CLI interfaces (Claude Code, Copilot CLI, Gemini CLI)
- [ ] Design agent adapter interface (abstract common operations)
- [ ] Implement CLI agent adapter (exec-based, stdin/stdout)
- [ ] Implement GitHub Coding Agent adapter (API-based)
- [ ] Create `lean-spec agent run` command
- [ ] Integrate with worktree creation (spec 118)
- [ ] Add spec status auto-update on agent events
- [ ] Implement `lean-spec agent status` for monitoring
- [ ] Add MCP tools for agent orchestration
- [ ] Document agent setup for each supported provider
- [ ] Create example workflows in docs

## Test

**Verification Criteria**:

- [ ] Can dispatch a spec to Claude Code and have it start implementation
- [ ] Can dispatch a spec to GitHub Coding Agent and receive PR
- [ ] Parallel dispatch creates proper worktrees and isolated sessions
- [ ] Spec status updates automatically on agent completion
- [ ] Agent configuration is flexible and extensible
- [ ] MCP tools work for AI-to-AI orchestration

**Integration Tests**:

- [ ] End-to-end: spec → agent → implementation → PR → status update
- [ ] Parallel: 3 specs → 3 agents → 3 worktrees → all complete
- [ ] Failure handling: agent error → spec status reflects failure

## Notes

**Open Questions**:
- How to handle agent authentication (API keys, OAuth)?
- Should we support custom agent prompts per spec/project?
- How to handle long-running agents (timeout, checkpoints)?
- Priority: CLI agents first (simpler) or cloud agents first (more powerful)?

**Research Needed**:
- Claude Code CLI interface and automation options
- GitHub Coding Agent API (triggering, status checking)
- Gemini CLI capabilities
- Aider integration patterns

**Related Work**:
- Spec 118: Git worktrees for parallel development (foundation)
- Spec 072: AI agent first-use workflow (onboarding)
- Spec 110: Project-aware AGENTS.md generation (context)

**Alternatives Considered**:
- IDE-only integration (VS Code tasks) - too narrow
- Shell scripts only - not portable, hard to maintain
- Full orchestration platform - too complex for LeanSpec's lean philosophy
