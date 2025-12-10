---
status: planned
created: '2025-12-10'
tags:
  - ai-agents
  - workflow
  - sessions
  - context-management
  - dx
priority: high
created_at: '2025-12-10T06:00:10.832Z'
depends_on:
  - 123-ai-coding-agent-integration
updated_at: '2025-12-10T06:01:54.441Z'
---

# Persistent AI Agent Sessions for Multi-Phase Spec Implementation

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-12-10 · **Tags**: ai-agents, workflow, sessions, context-management, dx

> **⚠️ ARCHITECTURAL NOTE**: This spec describes session persistence patterns that should be implemented in **[agent-relay](https://github.com/codervisor/agent-relay)** (the orchestration engine), not LeanSpec itself. See **spec 159** for architectural separation: LeanSpec provides memory/context, agent-relay handles execution/sessions. The concepts in this spec remain valid but belong in agent-relay's implementation.

## Overview

**Problem**: The current `lean-spec agent` command (spec 123) launches one-shot agent sessions that don't persist state across multiple interactions. For medium-to-large specs requiring 2-5+ agent sessions due to:
- Context window performance degradation after ~20k tokens
- Natural implementation phases (design → core → polish → tests → docs)
- Need to incorporate human feedback between phases
- Agent hitting rate limits or timeouts

Users must manually:
- Track which phase they're in
- Remember what was completed
- Reconstruct context for next session
- Update spec status manually between sessions

**Impact**: 
- 60-70% of real-world specs require multiple sessions
- Manual session management breaks flow and loses context
- No clear handoff between sessions leads to duplicated work
- Can't resume failed sessions without starting over

**Goals**:
1. **Persistent session state** - Track progress across multiple agent invocations
2. **Phase-based workflows** - Support natural implementation phases (design → build → test → document)
3. **Context continuity** - Seamlessly resume with minimal context reconstruction
4. **Session history** - Audit trail of what was done in each session
5. **Human-in-the-loop** - Easy review/feedback between phases

## Design

### Orchestration Pattern Context

This design applies **Sequential Orchestration** pattern (Microsoft Agent Framework) to spec implementation:
- Multi-phase workflow with clear linear dependencies (design → implementation → testing → documentation)
- Progressive refinement through structured phases
- Session state enables resumption at any phase boundary
- Human-in-the-loop between phases for feedback and validation

**Why Sequential over Other Patterns**:
- **vs Concurrent**: Phases have dependencies (can't test before implementing)
- **vs Group Chat**: Single agent per phase with checkpoints, not multi-agent discussion
- **vs Handoff**: Phase sequence is predetermined, not dynamic routing
- **vs Magentic**: Spec provides the plan, agent executes phases sequentially

### Core Concepts

**Session**: A series of agent interactions working toward completing a spec
- Has unique ID, tracks state across invocations
- Persisted to `.leanspec/sessions/<spec-name>-<session-id>.json`
- Contains: phase progress, completed tasks, notes, artifacts

**Phase**: A logical stage of implementation (configurable per spec/project)
- Default phases: `design` → `implementation` → `testing` → `documentation` → `review`
- Each phase has entry criteria and completion markers
- Agent receives phase-specific context and prompts

**Resume**: Continue an existing session from last checkpoint
- Restores: working directory, branch state, phase context
- Injects: session summary, completed work, next steps
- Minimizes token usage via intelligent context selection

### Session State Schema

```typescript
interface AgentSession {
  // Identity
  id: string;                    // e.g., "045-20251210-001"
  specPath: string;              // Spec being implemented
  agent: AgentType;              // Which agent (claude, cursor, etc.)
  
  // State
  status: 'active' | 'paused' | 'completed' | 'failed';
  currentPhase: string;          // Current implementation phase
  phases: PhaseRecord[];         // History of phases
  
  // Context
  worktree?: string;             // Git worktree path (if parallel)
  branch: string;                // Working branch
  
  // History
  createdAt: string;
  updatedAt: string;
  interactions: Interaction[];   // Each agent invocation
  
  // Progress tracking
  completedTasks: string[];      // What's done
  nextSteps: string[];           // What's next
  notes: string;                 // Session notes (for next resume)
}

interface PhaseRecord {
  phase: string;                 // Phase name
  startedAt: string;
  completedAt?: string;
  summary: string;               // What was accomplished
  filesChanged: string[];        // Affected files
}

interface Interaction {
  id: number;                    // Interaction number
  timestamp: string;
  phase: string;
  durationMs: number;
  promptTokens: number;          // Estimated
  exitCode?: number;
  summary: string;               // Brief description
}
```

### Proposed Commands

```bash
# Start a new session (replaces simple `agent run`)
lean-spec agent start <spec> [--agent <type>] [--phase <name>]

# Continue existing session
lean-spec agent resume <spec> [--phase <name>]

# Pause session with notes
lean-spec agent pause <spec> --notes "Core API done, tests next"

# Show session details
lean-spec agent status <spec> [--verbose]

# List all sessions
lean-spec agent sessions [--active] [--spec <spec>]

# Complete session (updates spec status to complete)
lean-spec agent complete <spec> [--notes "Final review done"]

# Examples:
lean-spec agent start 045 --agent claude
# ... agent works, exits after design phase ...

lean-spec agent resume 045
# Agent receives: "Previous session completed design phase. 
# Files changed: api.ts, types.ts. Next: Implement core logic."

lean-spec agent pause 045 --notes "Core logic done, need design review"
# ... human reviews, provides feedback in spec ...

lean-spec agent resume 045 --phase testing
# Agent receives: "Design review incorporated. Start testing phase."
```

### Workflow Integration

#### Multi-Session Flow

```
┌─────────────────────────────────────────────────────────┐
│ Session 1: Design Phase                                 │
│ lean-spec agent start 045 --agent claude                │
│ → Agent creates architecture, defines interfaces        │
│ → Auto-pauses after ~15k tokens or explicit exit        │
│ → Session saved with: phase=design, files=[api.ts, ...] │
└─────────────────────────────────────────────────────────┘
         ↓ (human reviews, updates spec with feedback)
┌─────────────────────────────────────────────────────────┐
│ Session 2: Implementation Phase                         │
│ lean-spec agent resume 045                              │
│ → Agent receives: design summary + feedback + next phase│
│ → Implements core logic                                 │
│ → Auto-pauses after ~15k tokens                         │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Session 3: Testing Phase                                │
│ lean-spec agent resume 045 --phase testing              │
│ → Agent writes tests, fixes bugs                        │
│ → Runs tests, validates                                 │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Session 4: Documentation Phase                          │
│ lean-spec agent resume 045 --phase documentation        │
│ → Agent writes docs, updates README                     │
│ → lean-spec agent complete 045                          │
│ → Spec status → complete, session → completed           │
└─────────────────────────────────────────────────────────┘
```

#### Context Injection Strategy

**On Resume**, inject minimal but sufficient context:

```
# Context Template for Resume
You are continuing work on spec 045.

## Previous Session Summary
- Phase: design
- Completed: API interface defined, type system created
- Files changed: api.ts (156 lines), types.ts (89 lines)
- Duration: 12 minutes

## Current Status
Phase: implementation
Files to work on: api.ts (implement methods), handlers.ts (new)

## Next Steps
1. Implement core API methods in api.ts
2. Create request handlers in handlers.ts
3. Add error handling

## Recent Spec Updates
[If spec was updated since last session, show diff]

## Full Spec Reference
[Link to spec file, agent can read if needed]

---
Continue from where you left off. You have the working branch 
and all previous changes. Focus on the implementation phase.
```

**Token Budget**: ~2-3k tokens for resume context (vs 10-15k for full spec)

### Session Storage

```
.leanspec/
  sessions/
    045-unified-dashboard/
      session-20251210-001.json    # Active/latest session
      session-20251208-001.json    # Previous session (kept for history)
      session-20251208-002.json    # Failed session (kept for debugging)
```

### Phase Management

**Default Phases** (configurable per project):

```yaml
# .leanspec/config.yaml
agents:
  phases:
    - name: design
      prompt: "Create architecture, define interfaces, plan implementation"
      auto-advance: false    # Requires explicit resume
      
    - name: implementation
      prompt: "Implement core functionality per design"
      auto-advance: false
      
    - name: testing
      prompt: "Write comprehensive tests, fix bugs"
      auto-advance: false
      
    - name: documentation
      prompt: "Write documentation, update README"
      auto-advance: false
      
    - name: review
      prompt: "Final review, cleanup, polish"
      auto-advance: true     # Auto-complete spec
```

**Custom Phases** (per spec):

```yaml
# In spec frontmatter
agent_phases:
  - design: "Focus on API contract and data model"
  - backend: "Implement server-side logic"
  - frontend: "Build UI components"
  - integration: "Connect frontend to backend"
  - polish: "Performance, error handling, edge cases"
```

### Auto-Pause Triggers

Sessions automatically pause when:
1. **Token threshold** - After ~15k tokens processed
2. **Time limit** - After 30 minutes (configurable)
3. **Explicit checkpoint** - Agent writes `[CHECKPOINT]` in output
4. **Phase completion** - Agent completes phase goals
5. **Error/failure** - Non-zero exit code

### MCP Tool Extensions

```typescript
// Enhanced MCP tools
mcp_lean-spec_agent_start   // Start new session
mcp_lean-spec_agent_resume  // Resume existing session
mcp_lean-spec_agent_pause   // Pause with notes
mcp_lean-spec_agent_status  // Enhanced with session details
```

## Implementation Considerations

### Context Window Management

**Problem**: Sequential phases accumulate context (spec + design + implementation + ...). By phase 4-5, context can exceed 30-50k tokens.

**Strategy** (inspired by Microsoft patterns):
1. **Minimal Context Resume**: Each resume gets 2-3k tokens (phase summary + file changes + next steps)
2. **On-Demand Full Context**: Agent can read full spec if needed, but default is summary
3. **Progressive Context**: Early phases (design) need full spec, later phases (testing) need only recent changes
4. **Context Pruning**: Drop completed phase details after 2-3 phases

**Token Budget Guidelines**:
```
Phase 1 (Design):       Full spec (~5-10k) + prompt (~1k) = 6-11k tokens
Phase 2 (Implementation): Summary (~2k) + design output (~3k) + prompt = ~6k
Phase 3 (Testing):       Summary (~2k) + impl changes (~2k) + prompt = ~5k
Phase 4 (Documentation): Summary (~2k) + test results (~1k) + prompt = ~4k
```

Total across 4 phases: ~21-26k tokens (vs 40-60k for full context each time)

### Reliability and Error Handling

**Checkpoint Mechanisms** (Microsoft pattern: reliability considerations):
- Auto-save session state every 2 minutes during agent execution
- Commit progress before phase transitions
- Store last successful state before risky operations
- Enable resume from last checkpoint on failure

**Failure Recovery**:
```typescript
interface SessionCheckpoint {
  timestamp: string;
  phase: string;
  workingDirectory: string;
  gitCommit: string;              // Last known good commit
  partialCompletions: string[];   // Tasks completed in current phase
  environmentState: Record<string, any>; // Env vars, tool state, etc.
}
```

**Retry Strategy**:
- Phase failure → Retry same phase with error context
- Timeout (>30min) → Auto-pause, allow human intervention
- Rate limit → Pause session, resume when quota available
- Infinite loop detection → After 3 retries in same phase, escalate to human

### Observability and Audit Trail

**Session Telemetry** (Microsoft pattern: observability):
- Track all agent invocations: timestamp, duration, phase, tokens used
- Log phase transitions: what triggered move to next phase
- Record file changes per phase: which files modified in each phase
- Capture decision points: why agent chose certain approach

**Debug Logs Structure**:
```
.leanspec/sessions/<spec>/
  session-001.json           # Session state
  session-001.log            # Detailed execution log
  session-001-phase-1.log    # Per-phase logs
  session-001-phase-2.log
  checkpoints/
    checkpoint-001.json      # Periodic checkpoints
    checkpoint-002.json
```

**Metrics to Track**:
- Session duration per phase
- Token usage per phase
- Number of retries/errors
- Files changed per phase
- Human interventions (pauses, feedback)

### Security Considerations

**Principle of Least Privilege** (Microsoft pattern: security):
- Each phase gets only necessary permissions
- Design phase: Read-only access to codebase
- Implementation phase: Write access to source files only
- Testing phase: Write access to test files + execute tests
- Documentation phase: Write access to docs only

**Session Isolation**:
- Session files stored in `.leanspec/sessions/` (gitignored by default)
- No sensitive data (API keys, tokens) in session state
- Session resumption requires workspace authentication
- Cross-session state sharing prohibited

### Avoiding Common Pitfalls

**Anti-Patterns to Avoid** (Microsoft guide):
1. ❌ **Unnecessary Complexity**: Don't use sessions for simple 1-phase specs (<150 lines)
2. ❌ **Excessive Context**: Don't pass full conversation history to every phase
3. ❌ **Shared Mutable State**: Each phase should commit changes before handoff
4. ❌ **Missing Error Boundaries**: Every phase must handle failures gracefully
5. ❌ **Ignoring Resource Constraints**: Don't assume unlimited API quota during long sessions
6. ❌ **Premature Optimization**: Start with simple sequential phases, add complexity only if needed

## Plan

### Phase 1: Session State Management
- [ ] Design session schema (JSON format)
- [ ] Implement session storage (`.leanspec/sessions/`)
- [ ] Create session CRUD operations (create, read, update)
- [ ] Add session listing/filtering

### Phase 2: Core Commands
- [ ] Implement `agent start` (replaces/enhances `agent run`)
- [ ] Implement `agent resume` (load session, inject context)
- [ ] Implement `agent pause` (save state, add notes)
- [ ] Implement `agent complete` (finalize session, update spec)
- [ ] Implement `agent sessions` (list all sessions)

### Phase 3: Phase Management
- [ ] Define default phases (design/implementation/testing/docs/review)
- [ ] Support custom phases (config.yaml + spec frontmatter)
- [ ] Implement phase transitions
- [ ] Add phase-specific prompts

### Phase 4: Context Continuity
- [ ] Design minimal context template for resume
- [ ] Implement smart context selection (what to include)
- [ ] Track file changes per session/phase
- [ ] Generate session summaries automatically

### Phase 5: Auto-Pause Logic
- [ ] Token counting during session (estimate)
- [ ] Time-based auto-pause (configurable)
- [ ] Checkpoint detection in agent output
- [ ] Phase completion detection

### Phase 6: Enhanced Status
- [ ] Enhanced `agent status` with session history
- [ ] Session analytics (time spent, phases completed)
- [ ] Progress visualization (which phase, % complete)

### Phase 7: MCP Integration
- [ ] Update MCP tools with session support
- [ ] Add session management to MCP prompts
- [ ] Test AI-to-AI session handoff

### Phase 8: Documentation & Testing
- [ ] Document session workflow
- [ ] Add examples for multi-session specs
- [ ] Integration tests for session persistence
- [ ] Migration guide from one-shot to sessions

## Test

### Unit Tests
- [ ] Session state serialization/deserialization
- [ ] Phase transitions (design → impl → test → docs)
- [ ] Context template generation
- [ ] Auto-pause triggers

### Integration Tests
- [ ] Complete multi-session workflow (3+ sessions)
- [ ] Resume after manual spec updates
- [ ] Phase-specific prompts work correctly
- [ ] Session history persists across CLI invocations

### Real-World Validation
- [ ] Implement a medium spec (200-300 lines) in 3 sessions
- [ ] Implement a large spec (400+ lines) in 5+ sessions
- [ ] Verify context continuity (no duplicated work)
- [ ] Measure token savings (resume vs fresh start)

### Edge Cases
- [ ] Resume after failed session
- [ ] Resume after git conflicts
- [ ] Multiple active sessions for same spec (error handling)
- [ ] Resume with different agent type

## Notes

### Key Design Decisions

**1. Why Session Files vs In-Memory State?**
- Sessions must survive CLI process restarts
- Need audit trail for debugging/analytics
- Files are simple, portable, version-controllable
- **Pattern justification**: Aligns with Microsoft's checkpoint/reliability recommendations

**2. Why Sequential Orchestration Pattern?**
- **Natural workflow**: Spec implementation follows predictable stages (design → build → test → document)
- **Clear dependencies**: Can't test before implementing, can't document before testing
- **Progressive refinement**: Each phase builds on previous phase output
- **Human-in-the-loop**: Pauses between phases enable review/feedback
- **Not concurrent**: Phases can't be parallelized without compromising quality
- **Not magentic**: Spec provides the plan; agent executes it sequentially

**3. Why Phases vs Free-Form?**
- Phases provide structure for large specs
- Enable phase-specific prompts and context
- Easier to track progress and estimate completion
- Agents work better with clear phase goals
- **Pattern justification**: Sequential orchestration requires well-defined stages

**3. Why Auto-Pause?**
- Prevents context window degradation
- Forces natural breakpoints for human review
- Saves costs (long sessions waste tokens on degraded performance)
- Enables better error recovery

**4. Token Budget for Resume Context**
- 2-3k tokens sufficient for continuation
- 85-90% reduction vs full spec re-injection
- Include: phase summary, file changes, next steps
- Agent can request full spec if needed

### Alternatives Considered

**A. No Sessions, Just Better Prompts**
- Rejected: Doesn't solve state persistence or context degradation
- Agents still lose track across invocations

**B. Database for Sessions**
- Rejected: Adds complexity, dependency
- File-based is simpler, portable, debuggable

**C. Single Long-Running Agent Process**
- Rejected: Ties up resources, hard to pause/resume
- Better to have explicit session boundaries

**D. Cloud-Based Session Management**
- Rejected: Requires backend service, auth
- Should work offline/locally first

**E. Automatic Phase Detection**
- Considered: Parse git commits to infer phases
- Rejected: Too complex, error-prone
- Better to be explicit about phases

### Open Questions

1. **Should sessions be spec-exclusive?**
   - Current: One active session per spec
   - Alternative: Multiple sessions for different branches/approaches
   - Decision: Start with one session per spec, add multi-session later if needed

2. **How to handle session conflicts?**
   - Two agents trying to work on same spec
   - Solution: Lock file (`.leanspec/sessions/<spec>.lock`)

3. **Session cleanup strategy?**
   - Keep all sessions forever?
   - Auto-archive old sessions after spec complete?
   - Decision: Keep last 5 sessions per spec, archive older ones

4. **Should phases be strictly sequential?**
   - Or allow jumping (design → testing → implementation)?
   - Decision: Allow phase specification with `--phase` flag

5. **Token counting accuracy?**
   - Estimate based on output length?
   - Use tiktoken library?
   - Decision: Start with rough estimate (char count / 4), refine later

### Related Specs

- **123-ai-coding-agent-integration**: Foundation for agent orchestration
- **118-parallel-spec-implementation**: Git worktree management
- **059-programmatic-spec-management**: Spec automation principles
- **072-ai-agent-first-use-workflow**: Onboarding considerations

### References

**Microsoft AI Agent Orchestration Patterns**:
- [AI Agent Design Patterns Guide](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- Sequential orchestration: Multi-stage processes with linear dependencies
- Implementation considerations: Context window, reliability, observability, security
- Common pitfalls: Unnecessary complexity, excessive context accumulation

**Key Takeaways**:
1. **Sequential pattern fits perfectly**: Spec implementation is inherently sequential with phase dependencies
2. **Context economy is critical**: Accumulated context degrades performance; use minimal resume context
3. **Checkpoint everything**: Session state, git commits, phase progress for failure recovery
4. **Observability from day 1**: Log all transitions, decisions, errors for debugging
5. **Human-in-the-loop**: Pause between phases for review matches sequential pattern strengths

### Success Metrics

After implementation, track:
- Average sessions per spec (expect 2-3 for medium specs)
- Token savings from resume vs fresh start (expect 80-90%)
- Time to resume (expect <5 seconds)
- User feedback on session continuity

### Future Enhancements

- **Session branching**: Try different approaches in parallel sessions
- **Session templates**: Pre-defined workflows for common spec types
- **AI session summaries**: Use LLM to generate phase summaries automatically
- **Session sharing**: Export/import sessions for collaboration
- **Multi-agent sessions**: Different agents for different phases
- **Session analytics dashboard**: Visualize productivity, bottlenecks
