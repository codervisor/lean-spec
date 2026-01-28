---
status: planned
created: 2025-12-18
priority: high
tags:
- workflow
- automation
- documentation
- ai-agents
- quality
- sdd-lifecycle
depends_on:
- 047-git-backfill-timestamps
- 122-ai-agent-deps-management-fix
- 174-completion-status-verification-hook
- 018-spec-validation
- 168-leanspec-orchestration-platform
- 245-session-orchestration-workflows
created_at: 2025-12-18T15:25:08.395Z
updated_at: 2026-01-28T09:05:00.846369Z
---

# Knowledge Backflow in SDD Workflow

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-12-18 · **Tags**: workflow, automation, documentation, ai-agents, quality, sdd-lifecycle

Add bidirectional knowledge flow to the SDD workflow, ensuring specs remain accurate reflections of implemented features through automated drift detection and workflow integration.

**Problem**: Specs often become outdated after implementation. Design decisions made during coding aren't captured, leading to spec-reality drift that misleads future AI agents and human developers.

**Solution**: Progressive enhancement approach:
1. **Workflow Integration** (v0.5.0): Make spec updates part of the completion process
2. **Orchestrator + Reviewer Validation** (v0.6.0): Use orchestrator agent with reviewer agent to validate completed specs against actual implementation
3. **Proactive Spec Sync** (Future): Periodic AI-powered spec review and update suggestions (high token cost, requires careful consideration)

See [DESIGN.md](./DESIGN.md) for detailed architecture and [ANALYSIS.md](./ANALYSIS.md) for problem analysis.

## Design

See [DESIGN.md](./DESIGN.md) for complete technical architecture including:
- Progressive enhancement approach (Workflow → Orchestrator Validation → Proactive Sync)
- Orchestrator + Reviewer agent integration (leveraging specs 168 and 171)
- Phased rollout strategy
- Integration with existing infrastructure

**Key Design Change**: Phase 2 uses **orchestrator + reviewer agents** instead of automated heuristic detection to avoid false positives and leverage clean agent context for validation (see spec 168 and 171).

## Plan

### Phase 1: Workflow Integration (Week 1) 🎯 Recommended Start

- [ ] Extend completion verification (spec 174)
  - [ ] Add "spec freshness" check (has README.md been modified since status→in-progress?)
  - [ ] Add warning if spec unchanged: "Did implementation match design exactly? Consider updating spec."
  - [ ] Allow `--force` to skip (for truly no-change implementations)
  
- [ ] Update AGENTS.md SDD Workflow
  - [ ] Add explicit "Update Spec" step between implementation and completion
  - [ ] Document backflow best practices
  - [ ] Add examples of what to update (architecture changes, decisions, learnings)
  
- [ ] Add MCP prompt for spec updates
  - [ ] Create `sdd-complete-spec` prompt that guides completion workflow
  - [ ] Include checklist: code done, tests passing, **spec updated**, validation passed
  - [ ] Provide guidance on what to update in spec
  
- [ ] Update spec templates
  - [ ] Add "Implementation Learnings" section to templates
  - [ ] Add checkbox: "Update spec with implementation changes and decisions"
  - [ ] Provide examples of backflow content

- [ ] Documentation
  - [ ] Add "Keeping Specs Current" guide to docs
  - [ ] Explain why backflow matters
  - [ ] Show before/after examples

### Phase 2: Orchestrator + Reviewer Agent Validation (Week 2-4)

**Rationale**: Instead of heuristic-based drift detection (prone to false positives and context window issues), use orchestrator agent to dispatch reviewer agent with clean context for validation.

- [ ] Extend orchestrator (spec 168) for spec validation workflow
  - [ ] Add "validate spec against implementation" orchestration mode
  - [ ] Orchestrator reads spec + implementation code
  - [ ] Dispatches reviewer agent with focused validation task
  
- [ ] Implement reviewer agent capability
  - [ ] Agent receives: spec requirements + actual codebase
  - [ ] Agent validates: implementation matches spec claims
  - [ ] Agent identifies: missing features, architecture drift, outdated design
  - [ ] Agent generates: actionable spec update suggestions
  
- [ ] Integrate with completion flow
  - [ ] Option to trigger reviewer validation before marking complete
  - [ ] `lean-spec agent review <spec>` command
  - [ ] Desktop UI: "Validate with AI Reviewer" button
  - [ ] Reviewer report displayed in UI with suggested updates
  
- [ ] Leverage clean context advantage
  - [ ] Reviewer gets fresh context (no long conversation history)
  - [ ] Focused task: "Does implementation match this spec?"
  - [ ] More accurate than heuristics, fewer false positives
  
- [ ] Testing
  - [ ] Test reviewer agent on known spec-reality mismatches
  - [ ] Measure accuracy vs heuristic approaches
  - [ ] Validate token efficiency (single focused prompt vs multiple checks)

### Phase 3: Proactive Spec Sync (Future) - High Token Cost

**Caution**: This phase requires proactive agents to periodically check specs against codebase, which incurs significant token cost. Requires careful cost/benefit analysis before implementation.

- [ ] Cost/benefit analysis
  - [ ] Calculate token cost per spec review (estimate: 5k-10k tokens)
  - [ ] Determine review frequency (daily? weekly? on-demand only?)
  - [ ] Project monthly token cost at scale
  - [ ] Validate ROI vs manual spec updates
  
- [ ] If cost-justified, implement periodic review agent
  - [ ] Scheduled background task to check specs
  - [ ] Agent reviews spec + recent code changes
  - [ ] Agent generates suggestions when drift detected
  - [ ] Human reviews and approves suggestions
  
- [ ] Alternative: On-demand sync only
  - [ ] `lean-spec sync <spec>` command (user-triggered)
  - [ ] Analyzes changes since spec creation
  - [ ] Shows suggested updates
  - [ ] Interactive review (accept/reject/edit)
  - [ ] Apply updates atomically
  
- [ ] Token optimization strategies
  - [ ] Incremental analysis (only check changed files)
  - [ ] Smart truncation (summarize old changes)
  - [ ] Batch processing (review multiple specs in one prompt)
  - [ ] Caching (avoid re-analyzing unchanged code)

## Test

### Phase 1: Workflow Tests

- [ ] Completion verification triggers for unchanged specs
  - [ ] Create spec, implement without updating spec → warning appears
  - [ ] Create spec, update spec during implementation → no warning
  - [ ] Force completion with `--force` → warning bypassed
  
- [ ] AGENTS.md workflow is clear
  - [ ] AI agent follows updated workflow
  - [ ] Spec updates happen before completion
  - [ ] MCP prompts guide correctly

### Phase 2: Orchestrator + Reviewer Tests

- [ ] Reviewer agent accuracy
  - [ ] Correctly identifies missing features in implementation
  - [ ] Detects architecture changes from original design
  - [ ] Identifies outdated technology mentions in spec
  - [ ] Minimal false positives (<5% rate)
  
- [ ] Orchestration workflow
  - [ ] Orchestrator successfully dispatches reviewer agent
  - [ ] Reviewer receives clean context (no history pollution)
  - [ ] Validation report is actionable and accurate
  - [ ] Results displayed in Desktop UI
  
- [ ] Integration tests
  - [ ] Test with known spec-reality mismatches
  - [ ] Compare accuracy vs heuristic approaches
  - [ ] Measure token efficiency
  - [ ] Validate completion flow integration

### Phase 3: Proactive Sync Tests (If Implemented)

- [ ] Token cost validation
  - [ ] Measure actual token usage per spec review
  - [ ] Compare cost vs manual spec maintenance
  - [ ] Validate ROI calculation
  
- [ ] Suggestion quality
  - [ ] >80% acceptance rate for suggested updates
  - [ ] Suggestions are specific and actionable
  - [ ] No hallucinations or incorrect suggestions
  
- [ ] On-demand sync workflow
  - [ ] `lean-spec sync` command works correctly
  - [ ] Interactive review flow is intuitive
  - [ ] Changes apply atomically

### Real-World Validation

- [ ] Run on LeanSpec's own specs
  - [ ] Identify specs with drift
  - [ ] Apply Phase 1 workflow improvements
  - [ ] Measure spec freshness over 1 month
  
- [ ] Gather user feedback
  - [ ] Are backflow prompts helpful or annoying?
  - [ ] Do drift warnings catch real issues?
  - [ ] Would AI-assisted sync be valuable?

## Notes

### Why This Matters

**Issue Origin**: Request from Chinese community (看是否可以增加一下知识回流).

**Core Challenge**: Specs often become outdated after implementation. This creates:
- **Misleading AI agents**: Read specs for context, implement based on false assumptions
- **Poor onboarding**: New team members misunderstand system architecture
- **Lost institutional knowledge**: Design decisions aren't captured

**Design Philosophy**: Progressive enhancement with agent-based validation
1. **Phase 1 (Workflow)**: Remind humans to update specs during completion
2. **Phase 2 (AI Reviewer)**: Use orchestrator + reviewer agent to validate specs against implementation (clean context, higher accuracy)
3. **Phase 3 (Proactive)**: Periodic AI-powered spec sync (high token cost, requires justification)

Each phase adds value independently. See [ANALYSIS.md](./ANALYSIS.md) for complete problem analysis.

### Related Specs

**Builds On**:
- **047-git-backfill-timestamps**: Git history analysis patterns
- **122-ai-agent-deps-management-fix**: Content/metadata alignment validation
- **174-completion-status-verification-hook**: Completion checkpoint system
- **018-spec-validation**: Validation infrastructure

**Complements**:
- **168-leanspec-orchestration-platform**: Orchestrator dispatches reviewer agent for validation
- **171-burst-mode-orchestrator**: Ralph mode pattern (autonomous loop) adapted for spec validation
- **123-ai-coding-agent-integration**: Agents can be instructed to update specs
