---
status: planned
created: 2026-01-28
priority: high
tags:
- ai-agents
- orchestration
- sessions
- workflows
- quality
- automation
created_at: 2026-01-28T09:03:50.502569Z
updated_at: 2026-01-28T09:03:50.502569Z
---

# Session Orchestration Workflows - Chained AI Coding Sessions with Quality Gates

## Overview

Implement session orchestration workflows that chain multiple AI coding sessions together with quality verification between each step, enabling autonomous iteration toward spec completion.

**Problem**: Single AI coding sessions often fail to fully implement a spec in one attempt. Tests fail, edge cases are missed, or implementation doesn't match requirements. Manually restarting sessions and managing context is tedious and error-prone.

**Solution**: Orchestration workflows that automatically chain sessions together with verification gates between each session. When one session completes, the orchestrator evaluates the result and either marks the spec complete or dispatches a follow-up session with refined context.

**Key Insight**: This is not a "special mode" but a **workflow pattern** built on top of session management (spec 239). Each iteration is a distinct session with full persistence, monitoring, and history.

## Design

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│              Session Orchestration Workflow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Orchestrator (Session Manager)             │   │
│  │  • Monitors session completion                          │   │
│  │  • Evaluates results against success criteria           │   │
│  │  • Dispatches follow-up sessions with context           │   │
│  │  • Enforces iteration limits                            │   │
│  └──────────────────┬──────────────────────────────────────┘   │
│                     │ orchestrates                              │
│                     ▼                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Session Chain (Sequential)                 │   │
│  │                                                         │   │
│  │  Session 1: Initial implementation                      │   │
│  │      ↓ [Quality Gate: Tests pass?]                     │   │
│  │  Session 2: Fix test failures                          │   │
│  │      ↓ [Quality Gate: Spec compliance?]                │   │
│  │  Session 3: Add missing requirements                   │   │
│  │      ↓ [Quality Gate: All criteria met?]               │   │
│  │  ✅ Complete                                           │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Quality Gates (Verification)               │   │
│  │  • Test execution (pass/fail)                          │   │
│  │  • Spec requirement coverage                           │   │
│  │  • Acceptance criteria validation                      │   │
│  │  • Gap identification                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Session Chain Pattern

Each session in the chain is a standard session (spec 239) with additional metadata:

```typescript
interface ChainedSession {
  // Standard session fields (from spec 239)
  id: string;
  project_path: string;
  spec_id: string;
  tool: string;
  status: SessionStatus;
  
  // Chain-specific fields
  chain_id: string;              // Groups sessions in same workflow
  sequence_number: number;       // Position in chain (1, 2, 3...)
  parent_session_id?: string;    // Previous session in chain
  
  // Context inheritance
  inherited_context: {
    previous_errors: string[];   // Errors from prior sessions
    refinement_prompt: string;   // What to fix/improve
    iteration_count: number;     // Current iteration
    max_iterations: number;      // Limit to prevent infinite loops
  };
  
  // Quality gate results
  quality_gate?: {
    checks: QualityCheck[];
    passed: boolean;
    gaps: string[];              // What's missing if not complete
  };
}
```

### Quality Gates

Quality gates are verification steps that run between sessions:

```typescript
interface QualityGate {
  name: string;
  checks: QualityCheck[];
  onPass: 'complete' | 'next' | 'manual_review';
  onFail: 'retry' | 'next' | 'manual_review';
}

interface QualityCheck {
  name: string;
  type: 'test' | 'spec_coverage' | 'acceptance_criteria' | 'custom';
  command?: string;              // e.g., "npm test"
  validator?: string;            // AI validator agent
  criteria: string[];            // What to verify
}
```

**Standard Gates**:

1. **Test Gate**: Run test suite, check for failures
   ```typescript
   {
     name: 'test_execution',
     type: 'test',
     command: 'npm test',
     criteria: ['All tests pass', 'No errors in stderr']
   }
   ```

2. **Spec Coverage Gate**: Verify all spec requirements are implemented
   ```typescript
   {
     name: 'spec_compliance',
     type: 'spec_coverage',
     validator: 'spec-validator-agent',
     criteria: [
       'All requirements implemented',
       'All acceptance criteria met',
       'No missing functionality'
     ]
   }
   ```

3. **Acceptance Criteria Gate**: Validate ACs explicitly
   ```typescript
   {
     name: 'acceptance_criteria',
     type: 'acceptance_criteria',
     criteria: ['AC1: User can login', 'AC2: Rate limiting works', ...]
   }
   ```

### Orchestration Workflow

```
┌───────────────────────────────────────────────────────────────┐
│                  Orchestration Loop                           │
└───────────────────────────────────────────────────────────────┘

1. INITIALIZE
   → Create chain_id
   → Set max_iterations (default: 10)
   → Record initial context from spec

2. DISPATCH SESSION
   → Create Session N with inherited context
   → Start session (spec 239)
   → Wait for completion

3. QUALITY GATE
   → Run configured checks
   → Evaluate results
   → Decision:
     ├─ All passed → Mark complete
     ├─ Failed + iterations left → Generate refinement context
     └─ Failed + max iterations → Mark failed, require manual review

4. CHAIN OR COMPLETE
   → If complete: Update spec status, archive chain
   → If retry: Go to step 2 with refined context

Repeat until complete or max iterations reached.
```

### Context Inheritance

Each session inherits context from previous sessions in the chain:

```typescript
function buildSessionContext(chain: ChainedSession[]): SessionContext {
  const previousSessions = chain.slice(0, -1);
  const lastSession = chain[chain.length - 1];
  
  return {
    // Spec content (always included)
    spec: loadSpec(lastSession.spec_id),
    
    // Error history (last 3 failures)
    previousErrors: previousSessions
      .filter(s => s.quality_gate && !s.quality_gate.passed)
      .slice(-3)
      .map(s => s.quality_gate?.gaps || []),
    
    // Refinement prompt
    refinementPrompt: generateRefinementPrompt(lastSession),
    
    // Iteration info
    iterationCount: chain.length,
    maxIterations: lastSession.inherited_context.max_iterations,
    
    // Token management
    contextSize: estimateTokenSize(chain),
  };
}
```

### CLI Integration

```bash
# Start orchestrated workflow for a spec
lean-spec orchestrate <spec> --max-iterations 10

# View chain status
lean-spec chain status <chain_id>

# List all sessions in a chain
lean-spec chain sessions <chain_id>

# View chain history
lean-spec chain logs <chain_id> --follow

# Cancel chain
lean-spec chain cancel <chain_id>

# Retry failed chain from specific session
lean-spec chain retry <chain_id> --from-session 3
```

### HTTP API

```typescript
// Start orchestration
POST /api/chains
{
  spec_id: string;
  max_iterations?: number;
  quality_gates?: QualityGate[];
  tool?: string;
}

// Get chain status
GET /api/chains/:chain_id

// List sessions in chain
GET /api/chains/:chain_id/sessions

// Cancel chain
POST /api/chains/:chain_id/cancel

// WebSocket for real-time updates
WS /api/chains/:chain_id/stream
```

## Plan

### Phase 1: Core Orchestration (Weeks 1-2)

- [ ] **Chain Manager**
  - [ ] Create chain data model (extends session model)
  - [ ] Implement chain lifecycle (create, dispatch, monitor, complete)
  - [ ] Add chain-to-session relationship tracking
  - [ ] Database migrations for chain tables

- [ ] **Quality Gate Framework**
  - [ ] Define quality gate interface
  - [ ] Implement test execution gate
  - [ ] Add gate result evaluation logic
  - [ ] Gate configuration system

- [ ] **Context Inheritance**
  - [ ] Build context from chain history
  - [ ] Error log compression (last 3 failures)
  - [ ] Refinement prompt generation
  - [ ] Token size estimation and limits

### Phase 2: Verification Gates (Weeks 3-4)

- [ ] **Spec Coverage Gate**
  - [ ] Spec-to-code mapping
  - [ ] Requirement coverage analysis
  - [ ] Gap identification
  - [ ] False positive prevention

- [ ] **Acceptance Criteria Gate**
  - [ ] AC checklist validation
  - [ ] Intent matching verification
  - [ ] Edge case coverage check

- [ ] **Custom Gates**
  - [ ] User-defined quality checks
  - [ ] Gate composition (AND/OR logic)
  - [ ] Gate ordering and dependencies

### Phase 3: CLI & API (Week 5)

- [ ] **CLI Commands**
  - [ ] `lean-spec orchestrate` command
  - [ ] `lean-spec chain` subcommands
  - [ ] Chain status and monitoring
  - [ ] Cancel and retry operations

- [ ] **HTTP API**
  - [ ] Chain CRUD endpoints
  - [ ] WebSocket streaming
  - [ ] Chain event broadcasting

### Phase 4: UI Integration (Weeks 6-7)

- [ ] **Desktop App Integration**
  - [ ] Chain visualization (session timeline)
  - [ ] Quality gate results display
  - [ ] Chain controls (pause, resume, cancel)
  - [ ] Chain history and replay

- [ ] **Web UI Integration**
  - [ ] Chain list view
  - [ ] Chain detail with session cards
  - [ ] Real-time chain monitoring

### Phase 5: Advanced Features (Week 8+)

- [ ] **Adaptive Iteration**
  - [ ] Dynamic max_iterations based on complexity
  - [ ] Early termination on repeated failures
  - [ ] Success pattern learning

- [ ] **Parallel Gates**
  - [ ] Run multiple gates concurrently
  - [ ] Gate result aggregation
  - [ ] Performance optimization

## Test

- [ ] Chain completes successfully within max iterations
- [ ] Chain fails gracefully when max iterations reached
- [ ] Context properly inherited between sessions
- [ ] Quality gates correctly identify failures
- [ ] Token limits respected across chain
- [ ] Chain can be cancelled mid-execution
- [ ] Failed chains can be retried from specific point
- [ ] WebSocket streams chain events correctly
- [ ] UI displays chain progress accurately

## Notes

### Relationship to Session Management

This spec builds **on top of** spec 239 (Session Management), not instead of it:

- **Spec 239**: Manages individual sessions (create, start, monitor, stop)
- **This spec**: Orchestrates multiple sessions into workflows (chain, verify, iterate)

Each session in a chain is a full session with its own persistence, logs, and lifecycle. The orchestrator coordinates between sessions but doesn't replace session management.

### Relationship to Previous "Ralph Mode"

This spec supersedes spec 171 (Ralph Mode) with cleaner abstractions:

| Aspect | Old (Ralph Mode) | New (Session Orchestration) |
|--------|------------------|----------------------------|
| Unit of work | "Ralph Loop" | Chain of sessions |
| Persistence | Custom | Uses spec 239 sessions |
| Components | Planner, Coder, Executor, Critic | Quality gates between sessions |
| Branding | "Ralph" references | Neutral workflow terminology |
| Monitoring | Custom | Uses spec 239 monitoring |

### Success Metrics

- **Completion rate**: >90% for simple specs (<200 LOC)
- **Average chain length**: <5 sessions
- **False positive rate**: <5% (tests pass but spec incomplete)
- **Token efficiency**: <50k tokens per completed chain

### Risks

- **Infinite loops**: Mitigated by max_iterations limit
- **Token bloat**: Context compression and smart inheritance
- **Quality gate latency**: Parallel execution for independent checks
- **Storage growth**: Chain archival after completion