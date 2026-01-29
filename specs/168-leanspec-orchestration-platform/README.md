---
status: planned
created: 2025-12-12
priority: high
tags:
- architecture
- ai-agents
- desktop
- orchestration
- sdd-lifecycle
- agent-relay
- devlog
depends_on:
- 159-leanspec-memory-layer-architecture
- 148-leanspec-desktop-app
- 123-ai-coding-agent-integration
- 213-cloud-leanspec-local-sync-bridge
- 239-ai-coding-session-management
- 245-session-orchestration-workflows
- 244-session-ui-enhancement
- 249-sessions-sidebar-unified-ux
- 243-ui-realtime-file-watch-sync
- 160-ui-tokens-validation-display
parent: 221-ai-orchestration-integration
created_at: 2025-12-12T07:50:22.373Z
updated_at: 2026-01-29T02:35:17.694215474Z
---

# LeanSpec as AI Coding Session Orchestration Platform

> **Status**: 🗓️ Planned · **Priority**: Critical · **Created**: 2025-12-12 · **Tags**: architecture, ai-agents, desktop, orchestration, sdd-lifecycle, agent-relay, devlog

**Project**: lean-spec

## Overview

### The Strategic Pivot

**Previous Positioning** (spec 159): LeanSpec as **memory layer only** - providing persistent specs and context while orchestration lives in agent-relay.

**New Positioning**: LeanSpec as **orchestration platform** - the unified interface for triggering and managing AI coding sessions throughout the entire SDD lifecycle, while still leveraging agent-relay and Devlog as infrastructure.

### Why This Matters

**Problem with Memory-Only Positioning**:
- ❌ Fragmented UX: Users must context-switch between LeanSpec (specs), agent-relay (execution), Devlog (observability)
- ❌ Unclear product identity: "Just a spec storage tool?" vs complete AI development platform
- ❌ Desktop app underutilized: Beautiful GUI but only shows specs, doesn't trigger actions
- ❌ Missing SDD lifecycle integration: No clear path from spec → implementation → validation

**Opportunity with Desktop App**:
- ✅ Native GUI for triggering AI coding sessions (one-click spec implementation)
- ✅ Visual workflow: Create spec → Implement spec → Validate spec → Complete
- ✅ Real-time session monitoring in desktop app
- ✅ Multi-project AI orchestration hub

**The Codervisor Platform Vision**:
```
┌─────────────────────────────────────────────────────────────────┐
│                    CODERVISOR PLATFORM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐      ┌──────────────┐      ┌─────────────┐  │
│   │  LeanSpec    │ ───► │ agent-relay  │ ───► │   Devlog    │  │
│   │ (Frontend)   │      │ (Backend)    │      │ (Telemetry) │  │
│   │              │      │              │      │             │  │
│   │ • Desktop UI │      │ • HQ Server  │      │ • Activity  │  │
│   │ • Spec Mgmt  │      │ • Runners    │      │ • Metrics   │  │
│   │ • Trigger AI │      │ • Sessions   │      │ • Audit     │  │
│   │ • Monitor    │      │ • Execution  │      │ • Analytics │  │
│   └──────────────┘      └──────────────┘      └─────────────┘  │
│                                                                 │
│   User Interface → Execution Engine → Observability Layer      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**LeanSpec becomes the orchestration frontend**, not just memory:
- **Desktop app** = Control center for AI coding sessions
- **CLI** = Programmatic interface for automation
- **MCP** = AI-to-AI orchestration
- **Web UI** = Team collaboration and monitoring

### Complete SDD Lifecycle

```
┌───────────────────────────────────────────────────────────────┐
│         LeanSpec SDD Lifecycle (User Perspective)             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  1. CREATE SPEC                                               │
│     Desktop App: Click "New Spec" button                      │
│     → Opens template, writes design doc                       │
│                                                               │
│  2. IMPLEMENT SPEC                                            │
│     Desktop App: Click "Implement with AI" button             │
│     → Select agent (Claude/Copilot/Cursor)                    │
│     → LeanSpec triggers agent-relay                           │
│     → Watch real-time progress in desktop app                 │
│     → Phase-by-phase execution with checkpoints               │
│                                                               │
│  3. VALIDATE SPEC                                             │
│     Desktop App: Click "Validate Implementation" button       │
│     → Run tests, linting, type checking                       │
│     → AI reviews code against spec requirements               │
│     → Show validation results in UI                           │
│                                                               │
│  4. COMPLETE SPEC                                             │
│     Desktop App: Click "Mark Complete" button                 │
│     → Update spec status                                      │
│     → Archive session logs to Devlog                          │
│     → Show completion metrics and next steps                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Never leave LeanSpec Desktop** - entire workflow in one place.

## Design

See [DESIGN.md](./DESIGN.md) for detailed architecture, UI flows, and integration patterns.

**Key Components**:
1. Desktop UI for session orchestration
2. agent-relay integration for AI execution
3. Devlog integration for telemetry
4. Validation system for quality assurance
5. Enhanced CLI commands for automation

## Plan

### Phase 1: Foundation Enhancement (Week 1-2)
- [x] Create spec 168 (this document)
- [x] Add competitive landscape analysis
- [x] Clarify LeanSpec-native UX approach (build on existing desktop + chatbot)
- [ ] Create DESIGN.md with detailed architecture
- [ ] Define API contracts between desktop, chatbot, and agent-relay
- [ ] Enhance Rust agent command with ralph/burst flags (stub)
- [ ] Add `--max-iterations <n>` flag support

### Phase 2: Desktop Orchestration UI (Week 3-4) 🎯
**Goal**: Enhance existing LeanSpec Desktop with orchestration capabilities

- [ ] **Enhanced Spec Detail View**
  - [ ] Add "Implement with AI" action button (primary CTA)
  - [ ] Show implementation status banner when agent running
  - [ ] Live task status section (current phase, progress)
  - [ ] Agent activity log (condensed view, expandable)
  
- [ ] **AI Orchestration Panel**
  - [ ] Trigger panel: agent selector, mode (guided/autonomous), ralph toggle
  - [ ] Collapsible terminal output stream (preserves existing spec view)
  - [ ] Phase progress indicators (inline status chips)
  - [ ] Quick controls: pause/resume/cancel
  
- [ ] **Chatbot Integration (Spec 94)**
  - [ ] Embed AI chat panel (slide-out from right)
  - [ ] Context-aware: knows current spec, can trigger implementation
  - [ ] Natural language commands: "implement this spec with Claude"
  - [ ] Show implementation status in chat history
  
- [ ] **Implementation Status Tracking**
  - [ ] Visual indicators on spec cards: idle/running/validating/complete
  - [ ] Real-time updates without page refresh
  - [ ] Session history view (past implementations)
  - [ ] Error state handling with actionable feedback

### Phase 3: Agent-Relay Integration (Week 5-6)
- [ ] Implement agent-relay client library
- [ ] Session manager with persistence
- [ ] WebSocket connection for real-time updates
- [ ] Graceful fallback to basic dispatch if agent-relay unavailable

### Phase 4: Validation System (Week 7-8)
- [ ] Integrate with Ralph mode critic (spec 171)
- [ ] Test runner integration (npm test, pytest, cargo test)
- [ ] Spec verification checks
- [ ] Validation results UI with actionable feedback

### Phase 5: Devlog Integration (Week 9-10)
- [ ] Telemetry client for session logging
- [ ] Metrics dashboard: completion rates, iteration counts, token usage
- [ ] Session history and replay
- [ ] Analytics views for team performance

### Phase 6: Polish & Launch (Week 11-12)
- [ ] Performance optimization (streaming, rendering)
- [ ] Error handling and recovery
- [ ] Documentation and video tutorials
- [ ] Release v0.5.0-orchestration

**Success Metrics**:
- Can dispatch spec to agent from Desktop in <3 clicks
- Real-time output appears within 500ms
- Session state persists across app restarts
- Ralph mode converges to quality code in <10 iterations (75%+ cases)
- User satisfaction: >4.5/5 (vs vibe-kanban baseline)

## Test

### Integration Tests
- [ ] Full SDD lifecycle (create → implement → validate → complete)
- [ ] agent-relay integration works correctly
- [ ] Devlog telemetry captured correctly
- [ ] Desktop UI updates in real-time

### User Experience Tests
- [ ] Guided mode (pause between phases)
- [ ] Autonomous mode (run all phases)
- [ ] Multi-project session isolation
- [ ] Error handling and recovery

### Performance Tests
- [ ] Desktop app responsive during sessions
- [ ] Output streaming without lag
- [ ] Multiple simultaneous sessions
- [ ] Session recovery <1s

## Notes

### Key Architectural Decisions

**1. LeanSpec as Frontend, agent-relay as Backend**

This is the critical repositioning:
- **LeanSpec Desktop** = User-facing orchestration interface
- **agent-relay** = Headless execution engine
- **Devlog** = Observability and analytics layer

**2. Desktop App as Primary Interface**

With the desktop app (spec 148), we have a native GUI that can display real-time session output, trigger actions, and provide complete workflow visibility.

**3. agent-relay is Infrastructure, Not UX**

Users should never need to directly interact with agent-relay - LeanSpec handles all coordination behind the scenes.

**4. Devlog as Telemetry, Not Observability UI**

Devlog captures everything, LeanSpec shows what matters for daily work.

### Why This Doesn't Violate Spec 159

Spec 159 established separation of concerns at the **implementation level**. This spec adds a **UX coordination layer**:

- ✅ User-facing interface for triggering AI sessions
- ✅ Coordination between components
- ✅ Integration point for the platform
- ❌ NOT reimplementing agent-relay functionality
- ❌ NOT reimplementing Devlog functionality

**Spec 159 defines WHAT each component does**, spec 168 defines HOW users interact with the platform.

### Product Positioning

**Before**: "LeanSpec is a lightweight spec management tool for AI-powered development."

**After**: "LeanSpec is the orchestration platform for AI coding sessions. Create specs, implement them with AI agents, validate the results, and track everything - all from one unified interface."

### Competitive Landscape: LeanSpec vs Vibe-Kanban

**Vibe-Kanban** (github.com/BloopAI/vibe-kanban) is an orchestration tool that provides kanban-style task management for AI coding agents (16.4k stars, actively maintained).

#### Strategic Differentiation

**Vibe-Kanban**: Task-centric kanban board for agent switching
- Focus: Visual task board with drag-and-drop, multi-agent orchestration
- Workflow: Create task → Assign agent → Monitor via terminal → Manual completion
- Value: Better UX for managing multiple agents than CLI-only tools

**LeanSpec**: Spec-driven orchestration with autonomous quality loops
- Focus: Spec lifecycle automation with built-in validation
- Workflow: Design spec → Auto-implement → Auto-validate → Auto-complete
- Value: End-to-end SDD methodology + autonomous quality loops + existing UI foundation

#### Why LeanSpec's Approach is Different

**1. Build on Existing Strengths**
- ✅ Already have desktop app (spec 148) with native GUI
- ✅ Already have spec detail views, metadata editing
- ✅ Already have chatbot (spec 94) for conversational interface
- ❌ Don't need to replicate kanban boards - specs already organized by status

**2. Spec-Centric vs Task-Centric**
- **Vibe-Kanban**: Tasks are the unit of work (kanban cards)
- **LeanSpec**: Specs are the unit of work (design documents)
- **Advantage**: Specs contain requirements, validation criteria, and context - tasks don't

**3. Conversational + Visual**
- **Vibe-Kanban**: Pure visual interface (click buttons, drag cards)
- **LeanSpec**: Hybrid interface (visual spec browsing + AI chat orchestration)
- **Advantage**: "Implement this spec with Claude" in chat is faster than 5 UI clicks

**4. Autonomous Quality Loops**
- **Vibe-Kanban**: Manual supervision, no validation
- **LeanSpec**: Ralph mode (spec 171) + critic/validator iterates until quality achieved
- **Advantage**: Set it and forget it, agent self-corrects until tests pass

#### Feature Comparison (What We Don't Need to Copy)

| Vibe-Kanban Feature         | LeanSpec Equivalent                          | Why Different?                               |
| --------------------------- | -------------------------------------------- | -------------------------------------------- |
| Kanban board UI             | Status filtering + list/grid views           | Specs already organized, no need for columns |
| Drag-and-drop status change | Chat: "mark spec 82 in-progress"             | Conversational > mouse dragging              |
| Task creation modal         | Chat: "create spec for X"                    | Natural language > form filling              |
| Agent selector dropdown     | Chat: "use Claude" or quick action button    | Context-aware selection                      |
| Terminal output panel       | Collapsible activity log + status indicators | Non-intrusive, preserves spec view           |
| Parallel task view          | Multi-project dashboard (already exists)     | Already have this via spec 148               |

#### Market Positioning

**Vibe-Kanban positioning**: "Get 10X more out of coding agents" (productivity multiplier)

**LeanSpec positioning**: "AI orchestration platform for spec-driven development" (methodology + automation)

**Not competing directly** - Serving different needs:
- Vibe-Kanban = Visual task board for agent juggling
- LeanSpec = Spec-driven development with AI assistance

**Target Users**:
- **Vibe-Kanban**: Individual developers switching between multiple agents
- **LeanSpec**: Teams practicing SDD with automated quality assurance

### Related Specs

**Foundation**:
- **159-leanspec-memory-layer-architecture**: Separation of concerns
- **148-leanspec-desktop-app**: Native GUI platform
- **123-ai-coding-agent-integration**: Current agent dispatch
- **158-persistent-agent-sessions**: Session concepts (in agent-relay)

**Infrastructure**:
- **agent-relay** (separate repo): Execution engine
- **Devlog** (separate repo): Observability platform

**Adjacent**:
- **136-growth-marketing-strategy-v2**: Platform positioning
- **118-parallel-spec-implementation**: Multi-spec workflows
