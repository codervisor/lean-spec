---
status: planned
created: 2026-02-03
priority: high
tags:
- sessions
- ai-agents
- typescript
- sub-agents
parent: 291-cli-runtime-web-orchestrator
created_at: 2026-02-03T13:48:12.998138Z
updated_at: 2026-02-03T15:37:14.636840Z
---

# Sub-Agent Session Management

## Overview

### Problem

When the primary agent (spec 094) invokes AI runners as sub-agents via `runSubagent`, we need:
- Session lifecycle tracking for sub-agent calls
- Context injection (workspace path, spec context)
- Result persistence for long-running tasks
- History of sub-agent invocations

### Solution

A lightweight session manager for sub-agent invocations. No PTY/VTE complexity—just track what we called, with what context, and what came back.

### Scope

**In Scope**:
- Sub-agent session lifecycle (create, run, complete)
- Context injection before invocation
- Result storage and retrieval
- Session history and querying

**Out of Scope**:
- PTY spawning (not needed for sub-agents)
- Terminal emulation (not needed)
- Hot-swap between runtimes (handled by tool selection)
- Screen snapshots (no terminal to snapshot)

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 Sub-Agent Session Manager                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Session Registry (In-Memory)               │   │
│   │                                                         │   │
│   │   Session A          Session B          Session C       │   │
│   │   ├── runner: claude ├── runner: copilot├── runner: gemini
│   │   ├── status: done   ├── status: running├── status: pending
│   │   ├── context: {...} ├── context: {...} ├── context: {...}
│   │   └── result: "..."  └── result: null   └── result: null
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Session Persistence (SQLite)               │   │
│   │                                                         │   │
│   │   • Session metadata (id, runner, status, timestamps)   │   │
│   │   • Context data (workspace, spec_id, env)              │   │
│   │   • Results (task output, token usage)                  │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model

```typescript
interface SubAgentSession {
  id: string;
  runnerId: string;           // e.g., "claude", "copilot"
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  
  // Context injected into sub-agent
  context: {
    workspacePath: string;
    specId?: string;
    prompt: string;
    files?: string[];         // Relevant files to include
  };
  
  // Result from sub-agent
  result?: {
    content: string;
    tokenUsage?: { input: number; output: number };
    durationMs: number;
  };
  
  error?: string;
}
```

### API

```typescript
class SubAgentSessionManager {
  // Create and start a sub-agent session
  async invoke(
    runnerId: string,
    prompt: string,
    context: SessionContext
  ): Promise<SubAgentSession>;
  
  // Get session by ID
  async get(sessionId: string): Promise<SubAgentSession | null>;
  
  // List sessions with optional filters
  async list(filter?: {
    runnerId?: string;
    status?: string;
    since?: Date;
  }): Promise<SubAgentSession[]>;
  
  // Get session history for a spec
  async getSpecHistory(specId: string): Promise<SubAgentSession[]>;
}
```

### Database Schema

```sql
CREATE TABLE subagent_sessions (
  id TEXT PRIMARY KEY,
  runner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  completed_at TEXT,
  
  -- Context
  workspace_path TEXT NOT NULL,
  spec_id TEXT,
  prompt TEXT NOT NULL,
  files_json TEXT,  -- JSON array of file paths
  
  -- Result
  result_content TEXT,
  token_input INTEGER,
  token_output INTEGER,
  duration_ms INTEGER,
  error TEXT
);

CREATE INDEX idx_subagent_sessions_runner ON subagent_sessions(runner_id);
CREATE INDEX idx_subagent_sessions_spec ON subagent_sessions(spec_id);
CREATE INDEX idx_subagent_sessions_created ON subagent_sessions(created_at);
```

## Plan

### Phase 1: Core Session Manager
- [ ] Define SubAgentSession type
- [ ] Implement in-memory session registry
- [ ] Add session CRUD operations
- [ ] Write unit tests

### Phase 2: Persistence
- [ ] Create SQLite schema
- [ ] Implement session persistence
- [ ] Add session history queries
- [ ] Test persistence across restarts

### Phase 3: Integration
- [ ] Integrate with `runSubagent` tool implementation
- [ ] Add context injection before invocation
- [ ] Capture results after completion
- [ ] Add to chat-server

## Test

- [ ] Session lifecycle: create → run → complete
- [ ] Failed sessions properly recorded
- [ ] History queries return correct results
- [ ] Persistence survives server restart

## Notes

### Relationship to Primary Agent

The primary agent (spec 094) calls `runSubagent` tool → this manager tracks the session → runner executes → result returned to primary agent.

This is purely bookkeeping—the actual AI invocation happens through the runner's API (using config from spec 288).

### Why Not PTY/VTE?

Spec 291 redesigned the architecture to use sub-agents instead of terminal emulation. Sub-agents:
- Handle their own context management
- Return text results, not terminal screens
- Don't need hot-swapping (just call different runner)
- Are invoked via API, not spawned as processes