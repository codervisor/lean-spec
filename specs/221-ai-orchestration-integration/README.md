---
status: planned
created: 2026-01-16
priority: critical
tags:
- orchestration
- integration
- ai-agents
- desktop
- web
- cli
- ralph
- umbrella
depends_on:
- 168-leanspec-orchestration-platform
- 171-burst-mode-orchestrator
- 094-ai-chatbot-web-integration
- 211-leanspec-as-anthropic-skill
- 123-ai-coding-agent-integration
created_at: 2026-01-16T07:46:14.630001Z
updated_at: 2026-01-16T07:46:22.231130Z
---

# AI Orchestration Integration: Unified Workflow

## Overview

**Purpose**: Coordinate and integrate all AI orchestration components (specs 168, 171, 94, 211) into a cohesive, powerful agent orchestration system that surpasses tools like vibe-kanban.

**Problem**: We have excellent individual specs for orchestration capabilities, but no unified integration plan to bring them together into a seamless user experience.

**Solution**: This umbrella spec coordinates the integration of:
- **Spec 168**: Desktop orchestration platform (visual kanban UI, session management)
- **Spec 171**: Ralph mode (autonomous test-driven loops, quality assurance)
- **Spec 94**: AI chatbot (conversational spec management)
- **Spec 211**: Agent Skills (cross-platform methodology)

**Vision**: Make LeanSpec the most powerful AI coding orchestration platform by combining spec-driven development methodology with autonomous quality loops and intuitive UX.

## Competitive Context

**vibe-kanban** (16.4k GitHub stars) provides:
- Visual kanban board for AI agent task management
- Multi-agent orchestration (parallel execution)
- Real-time terminal output monitoring
- MCP configuration centralization

**LeanSpec differentiators**:
1. **Spec-driven** - Everything flows from spec requirements (not just tasks)
2. **Autonomous loops** - Ralph mode iterates until quality achieved
3. **Quality assurance** - Built-in validation and verification
4. **Context economy** - Token limits prevent bloat
5. **Methodology layer** - Agent Skills teach SDD across platforms

**Market position**: Not competing directly - vibe-kanban is task-centric, LeanSpec is methodology + quality-centric.

## Architecture

### High-Level Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                   LeanSpec AI Orchestration                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Desktop App (Spec 168) - Visual Control           │  │
│  │  • Kanban board for spec lifecycle                        │  │
│  │  • "Implement with AI" button (one-click)                 │  │
│  │  • Real-time session monitoring                           │  │
│  │  • Multi-project orchestration hub                        │  │
│  └─────────────────┬────────────────────────────────────────┘  │
│                    │ triggers                                   │
│  ┌─────────────────▼─────────────────────────────────────────┐  │
│  │         CLI Agent Commands (Enhanced) - Dispatch          │  │
│  │  lean-spec agent run <spec> --agent <type>                │  │
│  │  lean-spec agent run <spec> --ralph --max-iterations 10   │  │
│  │  lean-spec agent run <spec> --guided                      │  │
│  └─────────────────┬────────────────────────────────────────┘  │
│                    │ dispatches to                              │
│  ┌─────────────────▼─────────────────────────────────────────┐  │
│  │         Ralph Mode (Spec 171) - Quality Loop              │  │
│  │  while (iteration < max) {                                │  │
│  │    code = generate(spec, errors)                          │  │
│  │    result = test(code)                                    │  │
│  │    verification = critic.verify(spec, result)             │  │
│  │    if (verification.complete) break                       │  │
│  │    errors = verification.gaps                             │  │
│  │  }                                                         │  │
│  └─────────────────┬────────────────────────────────────────┘  │
│                    │ logs to                                    │
│  ┌─────────────────▼─────────────────────────────────────────┐  │
│  │         Session Management - State & History              │  │
│  │  • agent-relay integration (persistent sessions)          │  │
│  │  • Devlog integration (telemetry)                         │  │
│  │  • Session recovery and replay                            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Web UI Chatbot (Spec 94) - Conversational         │  │
│  │  User: "Implement spec 171 with Claude in ralph mode"    │  │
│  │  AI: [triggers orchestration] "Started session..."       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         Agent Skills (Spec 211) - Methodology Layer       │  │
│  │  SKILL.md teaches agents:                                 │  │
│  │  • Always discover specs first (board, search)            │  │
│  │  • Follow SDD workflow (design → implement → validate)    │  │
│  │  • Use Ralph mode for quality assurance                   │  │
│  │  • Validate completion criteria before marking done       │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### User Experience Flows

#### Flow 1: Desktop-Initiated Orchestration (Primary)

```
User opens Desktop App
  → Views spec board (kanban UI)
  → Clicks spec card "171-ralph-mode"
  → Clicks "Implement with AI" button
  → Selects agent: "Claude"
  → Toggles Ralph mode: ON (max 10 iterations)
  → Clicks "Start"
  
Desktop App:
  → Reads spec content + dependencies
  → Calls: lean-spec agent run 171 --agent claude --ralph --max-iterations 10
  → Opens split view: Spec detail | Terminal output
  → Streams PTY output in real-time
  → Shows phase indicators: Design ✓ → Implement (50%)...
  
Ralph Mode Loop (background):
  → Iteration 1: Generate code → Run tests → Fail
  → Iteration 2: Fix errors → Run tests → Fail  
  → Iteration 3: Fix logic → Run tests → Pass
  → Critic verifies: Spec incomplete (missing edge cases)
  → Iteration 4: Add edge cases → Run tests → Pass
  → Critic verifies: All requirements met ✓
  
Desktop App:
  → Shows: "✓ Implementation complete (4 iterations, 12m 34s)"
  → Prompts: "Validate implementation? [Y/n]"
  → Runs validation suite
  → Shows: "✓ All tests passed, ✓ No lint errors, ✓ Type check passed"
  → Updates spec status: in-progress → complete
  → Logs session to Devlog
```

#### Flow 2: CLI-Initiated Orchestration (Developer)

```bash
# Developer working in terminal
$ lean-spec agent run 171 --agent aider --ralph --max-iterations 15

✓ Loaded spec 171-ralph-mode
→ Dispatching to Aider with Ralph mode (max 15 iterations)
→ Iteration 1/15: Generating implementation...
→ Running tests... ✗ Failed (2 errors)
→ Iteration 2/15: Fixing errors...
→ Running tests... ✗ Failed (1 error)
→ Iteration 3/15: Fixing error...
→ Running tests... ✓ Passed
→ Verifying spec compliance... ⚠ Incomplete (60%)
→ Iteration 4/15: Implementing missing requirements...
→ Running tests... ✓ Passed
→ Verifying spec compliance... ✓ Complete (100%)

✓ Implementation complete in 4 iterations (11m 22s)
→ Updating spec status to complete
→ Session logged to Devlog

$ lean-spec view 171
Status: complete ✓
Completed: 2026-01-16
Session: 4 iterations, 11m 22s
```

#### Flow 3: Web UI Chatbot-Initiated (Non-technical User)

```
User (Product Manager) opens Web UI
  → Opens chatbot panel
  → Types: "I need to implement the API rate limiting spec"
  
AI Chatbot:
  → Searches specs: "api rate limiting"
  → Finds: "095-api-rate-limiting (planned)"
  → Responds: "Found spec 095-api-rate-limiting. Would you like me to:
             1. Implement it automatically with AI?
             2. Show me the spec details first?
             3. Validate if implementation is needed?"
  
User: "Implement it automatically"

AI Chatbot:
  → Calls: lean-spec agent run 095 --agent claude --ralph
  → Responds: "Started implementation session for spec 095
              Agent: Claude | Mode: Ralph (autonomous)
              You can monitor progress in the Sessions tab."
  
User clicks "Sessions" tab:
  → Sees real-time output from Claude
  → Watches Ralph mode iterations
  → Receives notification: "✓ Spec 095 complete"
```

#### Flow 4: Agent Skills Integration (Cross-platform)

```
Developer using Cursor (or any skills-compatible agent)
  → Cursor detects LeanSpec project
  → Auto-loads: .lean-spec/skills/leanspec-sdd/SKILL.md
  
Agent learns from SKILL.md:
  → "Always run `lean-spec board` before creating specs"
  → "Use `lean-spec agent run <spec> --ralph` for quality assurance"
  → "Keep specs under 2000 tokens"
  → "Update status before implementation: `--status in-progress`"
  
Developer: "Let's implement the caching layer"

Cursor (guided by SKILL.md):
  → Runs: lean-spec search "caching"
  → Finds: No existing spec
  → Asks: "Should I create a spec first?"
  → Developer: "Yes"
  → Cursor creates spec following SKILL.md template
  → Cursor: "Ready to implement? I can use Ralph mode for quality assurance."
  → Developer: "Yes, use Ralph mode"
  → Cursor: Runs `lean-spec agent run <new-spec> --ralph`
```

## Integration Points

### 1. Desktop App (Spec 168) Integration

**Kanban Board View**:
- Columns: Planned | In Progress | Validating | Complete
- Spec cards: Title, priority, tags, token count, dependencies
- Drag-and-drop to update status
- Real-time updates when sessions change status

**Session Monitor View**:
- Split panel: Spec detail (left) | Terminal output (right)
- Phase indicators: Design → Implement → Test → Docs
- Ralph mode progress: "Iteration 3/10 - Tests passing, verifying spec..."
- Controls: Pause, Resume, Cancel, Validate Now

**Agent Selector**:
- Dropdown: Claude, Copilot, Aider, Gemini, Cursor, Continue
- Mode toggle: Guided (pauses between phases) vs Autonomous
- Ralph mode checkbox with iteration slider (1-20)

### 2. CLI Enhancement (Foundation)

**New flags**:
```bash
--ralph / --burst              Enable Ralph mode (autonomous loops)
--max-iterations <n>           Maximum Ralph iterations (default: 10)
--guided                       Pause between phases for review
--autonomous                   Run all phases without pauses
--validate-only                Skip implementation, just validate
```

**Examples**:
```bash
lean-spec agent run 171 --ralph --max-iterations 15
lean-spec agent run 171 --guided  # Pause after design phase
lean-spec agent run 171 --autonomous --validate-only
```

### 3. Ralph Mode (Spec 171) Integration

**Triggered by**:
- Desktop: "Implement with AI" button + Ralph mode toggle
- CLI: `--ralph` or `--burst` flag
- Chatbot: "implement automatically with quality assurance"

**Provides**:
- Autonomous test-driven loop (generate → test → fix)
- Critic verification (prevents false positives)
- Iteration tracking and logging
- Automatic spec status update on completion

**Outputs**:
- Real-time iteration progress to Desktop/CLI
- Verification reports (what passed, what's incomplete)
- Session metrics (iterations, time, token usage)

### 4. Web Chatbot (Spec 94) Integration

**Orchestration commands via chat**:
- "Implement spec 171 with Claude"
- "Use ralph mode for spec 171"
- "Show me the status of my implementation sessions"
- "Cancel the session for spec 171"

**Chatbot calls**:
- `lean-spec agent run <spec> --agent <type> --ralph` (under the hood)
- Streams session updates back to chat UI
- Provides session links for monitoring

### 5. Agent Skills (Spec 211) Integration

**SKILL.md teaches agents**:
```markdown
## Using Ralph Mode for Quality Assurance

When implementing a spec, use Ralph mode for autonomous quality loops:

`lean-spec agent run <spec> --ralph`

Ralph mode will:
1. Generate implementation based on spec
2. Run all tests automatically
3. Analyze failures and fix them
4. Verify spec requirements are met (not just tests passing)
5. Iterate until quality criteria satisfied or max iterations reached

This prevents false positives (tests pass but spec incomplete).
```

## Dependencies

**Foundation (must exist)**:
- ✅ **123-ai-coding-agent-integration**: Basic agent dispatch (exists in Rust)
- ✅ **148-leanspec-desktop-app**: Tauri desktop app (exists)
- ✅ **186-rust-http-server**: Backend for web UI (exists)
- ✅ **187-vite-spa-migration**: Frontend for web UI (exists)

**Core Components (planned)**:
- **168-leanspec-orchestration-platform**: Desktop orchestration UI
- **171-burst-mode-orchestrator**: Ralph mode autonomous loops
- **094-ai-chatbot-web-integration**: Conversational interface
- **211-leanspec-as-anthropic-skill**: Cross-platform methodology

**Infrastructure (external)**:
- **agent-relay** (separate repo): Session management, PTY streaming
- **Devlog** (separate repo): Telemetry and analytics

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: Enhance CLI with Ralph mode flags, basic orchestration

- [ ] **CLI Enhancement**:
  - [ ] Add `--ralph` / `--burst` flag to agent command
  - [ ] Add `--max-iterations <n>` flag
  - [ ] Add `--guided` / `--autonomous` mode flags
  - [ ] Implement flag parsing and validation
  
- [ ] **Ralph Mode Stub**:
  - [ ] Create Ralph orchestrator interface
  - [ ] Implement basic loop structure (generate → test → repeat)
  - [ ] Log iterations and metrics
  - [ ] No critic yet (just basic loop)
  
- [ ] **Testing**:
  - [ ] Verify flags work: `lean-spec agent run 123 --ralph --dry-run`
  - [ ] Test basic loop with simple spec
  
**Deliverable**: CLI can dispatch with Ralph mode (basic iteration, no critic)

### Phase 2: Desktop Orchestration UI (Weeks 3-6)

**Goal**: Vibe-kanban-level UX with spec-driven enhancements

**Implementing Spec 168 Phase 2**:

- [ ] **Kanban Board View**:
  - [ ] Board component with draggable spec cards
  - [ ] Real-time status updates via Rust backend
  - [ ] Filter by project, priority, tags
  - [ ] Search and sort capabilities
  
- [ ] **Session Monitor**:
  - [ ] Split panel layout (spec detail + terminal)
  - [ ] PTY streaming integration (via agent-relay or fallback)
  - [ ] Phase indicators with progress estimation
  - [ ] Pause/Resume/Cancel controls
  
- [ ] **Agent Dispatcher**:
  - [ ] "Implement with AI" button on spec detail
  - [ ] Agent selector (dropdown: Claude, Copilot, etc.)
  - [ ] Ralph mode toggle with iteration slider
  - [ ] Guided vs Autonomous mode selector
  
- [ ] **Backend Integration**:
  - [ ] Rust HTTP endpoint: POST /api/sessions
  - [ ] Session state management in SQLite
  - [ ] WebSocket support for real-time updates
  
**Deliverable**: Desktop app can dispatch agents and monitor sessions in real-time

### Phase 3: Ralph Mode Quality Loop (Weeks 7-10)

**Goal**: Autonomous test-driven loops with spec verification

**Implementing Spec 171**:

- [ ] **Critic/Validator**:
  - [ ] Test analysis engine (parse errors, suggest fixes)
  - [ ] Spec verification engine (check requirements coverage)
  - [ ] Acceptance criteria validation
  - [ ] Gap analysis (identify missing functionality)
  
- [ ] **Iteration Loop**:
  - [ ] Generate/refine implementation
  - [ ] Run tests in sandbox (Docker or Deno)
  - [ ] Analyze results with critic
  - [ ] Update context for next iteration
  - [ ] Exit on completion or max iterations
  
- [ ] **Context Management**:
  - [ ] Token counting per iteration
  - [ ] Error log compression (keep last 3 failures)
  - [ ] Incremental code diffs (not full code)
  - [ ] Smart truncation to stay under 10k tokens
  
**Deliverable**: Ralph mode converges to quality code in <10 iterations (75%+ cases)

### Phase 4: Web Chatbot Integration (Weeks 11-14)

**Goal**: Conversational orchestration via web UI

**Implementing Spec 94**:

- [ ] **Chatbot UI**:
  - [ ] Floating chat button (bottom-right)
  - [ ] Slide-out chat panel with message history
  - [ ] Text input with multiline support
  - [ ] Quick action chips ("Implement spec", "Check status")
  
- [ ] **AI Backend**:
  - [ ] Rust HTTP endpoint: POST /api/chat (streaming)
  - [ ] AI SDK v6 integration (OpenAI GPT-4o)
  - [ ] Tool definitions for orchestration
  - [ ] Function calling: agent_run, agent_status, list_specs
  
- [ ] **Orchestration Tools**:
  - [ ] Tool: agent_run(spec, agent, ralph, iterations)
  - [ ] Tool: agent_status(spec)
  - [ ] Tool: list_specs(status, tags)
  - [ ] Tool: cancel_session(spec)
  
**Deliverable**: Users can trigger orchestration via natural language chat

### Phase 5: Agent Skills Distribution (Weeks 15-16)

**Goal**: Cross-platform SDD methodology via SKILL.md

**Implementing Spec 211**:

- [ ] **SKILL.md Creation**:
  - [ ] Write frontmatter (name, description, compatibility)
  - [ ] Document core SDD workflow
  - [ ] Document Ralph mode usage
  - [ ] Document context economy principles
  - [ ] Create references/ directory with detailed docs
  
- [ ] **Distribution**:
  - [ ] Bundle with lean-spec installation: .lean-spec/skills/
  - [ ] User installation: ~/.cursor/skills/ or ~/.codex/skills/
  - [ ] Git distribution: Copy SKILL.md to project
  
- [ ] **Testing**:
  - [ ] Validate SKILL.md with skills-ref tool
  - [ ] Test with Claude, Cursor, Codex
  - [ ] Measure agent compliance with SDD workflow
  
**Deliverable**: Agent Skills teach SDD methodology across platforms

### Phase 6: Polish & Integration (Weeks 17-18)

**Goal**: Seamless experience across Desktop, CLI, Web

- [ ] **Integration Testing**:
  - [ ] End-to-end: Desktop → CLI → Ralph → Validation → Complete
  - [ ] Parallel sessions (multiple specs simultaneously)
  - [ ] Session recovery after crashes
  - [ ] Cross-UI consistency (Desktop, Web, CLI)
  
- [ ] **Performance Optimization**:
  - [ ] PTY streaming latency <500ms
  - [ ] Desktop UI responsive during sessions
  - [ ] Chatbot streaming <2s to first token
  - [ ] Session state persistence <100ms
  
- [ ] **Documentation**:
  - [ ] Video tutorials: Desktop orchestration, Ralph mode, Chatbot
  - [ ] Migration guide: vibe-kanban → LeanSpec
  - [ ] Agent Skills setup guide
  - [ ] Troubleshooting FAQ
  
**Deliverable**: Production-ready orchestration platform v0.5.0

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Desktop dispatch time** | <3 clicks to start | User testing |
| **Real-time latency** | <500ms to first output | Performance monitoring |
| **Ralph convergence rate** | >75% in <10 iterations | Session analytics |
| **False positive rate** | <5% | Spec verification logs |
| **User satisfaction** | >4.5/5 | NPS survey (vs vibe-kanban baseline) |
| **Session recovery** | <1s after crash | Performance testing |
| **Chatbot accuracy** | >80% correct dispatch | Conversation analytics |
| **Agent Skills adoption** | >100 projects in 3 months | Git analytics |
| **Token efficiency** | <50k per Ralph session | Token monitoring |

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **agent-relay unavailable** | No persistent sessions | Graceful fallback to basic dispatch |
| **Ralph infinite loops** | Token waste | Hard limit on iterations (max 20) |
| **Desktop UI complexity** | Development time | Start with basic kanban, iterate |
| **Chatbot accuracy** | Wrong commands | Require confirmation for destructive actions |
| **vibe-kanban feature parity** | User expectations | Focus on differentiators (Ralph, validation) |
| **Cross-platform Skills** | Inconsistent behavior | Test with multiple agents (Claude, Cursor, Codex) |
| **Session state management** | Data loss | SQLite persistence + periodic backups |

## Open Questions

1. **Should we integrate with vibe-kanban's MCP server?**
   - Pros: Leverage existing ecosystem
   - Cons: Adds dependency, may not align with SDD philosophy
   
2. **How to handle agent conflicts?** (e.g., both Desktop and CLI dispatch to same spec)
   - Option A: Lock specs during sessions
   - Option B: Allow parallel sessions, merge results
   
3. **What happens if Ralph mode hits max iterations without completion?**
   - Option A: Mark spec as "blocked", require manual intervention
   - Option B: Continue with partial implementation, flag gaps
   
4. **Should chatbot have autonomy to trigger implementations?**
   - Security: Require user confirmation for code generation
   - UX: Balance automation with control
   
5. **How to price/limit Ralph mode iterations?**
   - Free tier: 10 iterations per month
   - Pro tier: Unlimited iterations
   - Team tier: Shared pool + analytics

## Marketing & Positioning

### Key Messages

**vs vibe-kanban**:
- "More than task management - full SDD methodology + quality assurance"
- "Autonomous quality loops - iterate until perfect, not just working"
- "Spec-driven - everything flows from requirements, not ad-hoc tasks"

**Target Audience**:
- Teams practicing SDD or wanting to adopt it
- Quality-focused developers tired of false positives
- Organizations automating development workflows

**Launch Messaging**:
- "LeanSpec v0.5: The orchestration platform for spec-driven teams"
- "Autonomous AI coding with built-in quality assurance"
- "Beyond task management - methodology + automation + verification"

### Competitive Advantages

1. **Methodology layer** - Teaches SDD via Agent Skills, not just tools
2. **Quality assurance** - Ralph mode + critic prevents false positives
3. **Spec-driven** - Requirements are source of truth, not tasks
4. **Context economy** - Token limits enforced, prevents bloat
5. **Cross-platform** - CLI, Desktop, Web, Agent Skills work together

## Next Steps

1. **Immediate (Week 1)**:
   - [ ] Create this integration spec (221)
   - [ ] Update spec 168 with vibe-kanban comparison
   - [ ] Link dependencies: 221 ← 168, 171, 94, 211
   - [ ] Start Phase 1: Enhance CLI with Ralph flags
   
2. **Short-term (Weeks 2-6)**:
   - [ ] Implement Desktop kanban UI (spec 168 Phase 2)
   - [ ] Build basic Ralph mode loop (spec 171 Phase 1-2)
   - [ ] Test end-to-end orchestration
   
3. **Medium-term (Weeks 7-14)**:
   - [ ] Complete Ralph mode with critic (spec 171 Phase 3-4)
   - [ ] Implement web chatbot (spec 94)
   - [ ] Integration testing across all UIs
   
4. **Long-term (Weeks 15-18)**:
   - [ ] Distribute Agent Skills (spec 211)
   - [ ] Performance optimization
   - [ ] Launch v0.5.0-orchestration

---

**Remember**: The goal is not to copy vibe-kanban, but to build a **spec-driven orchestration platform** with **autonomous quality loops** that fundamentally improves how teams develop software with AI.