---
status: planned
created: 2025-12-12
priority: critical
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
created_at: 2025-12-12T07:50:22.373Z
updated_at: 2026-01-14T07:59:38.875478Z
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

### Phase 1: Architecture & Design (Week 1)
- [x] Create spec 168 (this document)
- [ ] Create DESIGN.md with detailed architecture
- [ ] Review with team
- [ ] Define API contracts

### Phase 2: Core Integration (Week 2)
- [ ] Implement agent-relay client
- [ ] Implement orchestrator
- [ ] Implement session manager

### Phase 3: Desktop UI (Week 3)
- [ ] Implement session views
- [ ] Implement implementation flow
- [ ] System integration (tray, shortcuts, notifications)

### Phase 4: Validation System (Week 4)
- [ ] Implement validation runner
- [ ] Implement AI code review
- [ ] Implement validation UI

### Phase 5: Devlog Integration (Week 5)
- [ ] Implement telemetry client
- [ ] Implement metrics views
- [ ] End-to-end testing

### Phase 6: Documentation & Launch (Week 6)
- [ ] Update documentation
- [ ] Create video tutorials
- [ ] Release v0.5.0-orchestration

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
