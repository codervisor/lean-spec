---
status: planned
created: '2025-12-18'
tags:
  - workflow
  - automation
  - documentation
  - ai-agents
  - quality
  - sdd-lifecycle
priority: high
created_at: '2025-12-18T15:25:08.395Z'
depends_on:
  - 047-git-backfill-timestamps
  - 122-ai-agent-deps-management-fix
  - 174-completion-status-verification-hook
  - 018-spec-validation
updated_at: '2025-12-18T15:27:17.813Z'
---

# Knowledge Backflow in SDD Workflow

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-12-18 · **Tags**: workflow, automation, documentation, ai-agents, quality, sdd-lifecycle

Add bidirectional knowledge flow to the SDD workflow, ensuring specs remain accurate reflections of implemented features through automated drift detection and workflow integration.

**Problem**: Specs often become outdated after implementation. Design decisions made during coding aren't captured, leading to spec-reality drift that misleads future AI agents and human developers.

**Solution**: Three-tier approach:
1. **Workflow Integration**: Make spec updates part of the completion process
2. **Automated Detection**: System identifies when specs might be outdated
3. **AI-Assisted Sync**: Use AI to suggest spec updates based on code changes

See [DESIGN.md](./DESIGN.md) for detailed architecture and [ANALYSIS.md](./ANALYSIS.md) for problem analysis.

## Design

See [DESIGN.md](./DESIGN.md) for complete technical architecture including:
- Three-tier implementation approach (Workflow → Detection → AI Sync)
- Detection heuristics and validation logic
- Phased rollout strategy
- Integration with existing infrastructure

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

### Phase 2: Automated Drift Detection (Week 2-3)

- [ ] Create RealityAlignmentValidator
  - [ ] Add to `rust/leanspec-core/src/validators/reality_alignment.rs`
  - [ ] Implement technology mention detection (grep for tech keywords)
  - [ ] Implement file staleness detection (compare timestamps)
  - [ ] Implement broken link detection (validate file paths, spec references)
  - [ ] Generate actionable warnings with suggestions
  
- [ ] Integrate with validation system
  - [ ] Add `--check-reality` flag to CLI validate command
  - [ ] Add `checkReality` option to MCP validate tool
  - [ ] Make it part of completion flow (optional warning, not blocker)
  
- [ ] Add freshness metrics
  - [ ] Calculate "spec staleness score" (days since spec update vs related code changes)
  - [ ] Show in `lean-spec list --detailed`
  - [ ] Highlight stale specs in UI
  
- [ ] Testing
  - [ ] Unit tests for each detection heuristic
  - [ ] Integration tests with real repos
  - [ ] Tune thresholds to reduce false positives

### Phase 3: AI-Assisted Sync (Week 4-5) - Optional/Future

- [ ] Implement git diff analysis
  - [ ] Find commits between spec creation and now
  - [ ] Extract meaningful changes (filter noise)
  - [ ] Categorize by section (architecture, API, etc.)
  
- [ ] Implement LLM integration
  - [ ] Create prompt template for change summarization
  - [ ] Feed: spec content + git diff → LLM → suggested updates
  - [ ] Parse LLM response into structured diffs
  
- [ ] Create `lean-spec sync` command
  - [ ] Analyze changes since spec creation
  - [ ] Show suggested updates
  - [ ] Interactive review (accept/reject/edit)
  - [ ] Apply updates atomically
  
- [ ] Add to Desktop UI
  - [ ] Show "Spec may be outdated" indicator
  - [ ] "Sync spec" button that runs analysis
  - [ ] Side-by-side diff view for reviewing changes

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

### Phase 2: Drift Detection Tests

- [ ] Technology mention detection works
  - [ ] Spec mentions "React" but no React files → warning
  - [ ] Spec mentions "TypeScript" and TS files exist → no warning
  
- [ ] File staleness detection works
  - [ ] Spec unchanged for 60 days, code modified last week → warning
  - [ ] Spec updated recently → no warning
  
- [ ] Broken link detection works
  - [ ] Spec links to deleted file → warning
  - [ ] Spec depends on archived spec → warning
  - [ ] All links valid → no warning
  
- [ ] False positive rate is acceptable
  - [ ] <10% false positives on real repos
  - [ ] Thresholds are tunable per-project

### Phase 3: AI Sync Tests

- [ ] Git diff analysis is accurate
  - [ ] Identifies major architecture changes
  - [ ] Filters out trivial changes (formatting, comments)
  - [ ] Correctly attributes changes to spec sections
  
- [ ] LLM suggestions are helpful
  - [ ] >80% acceptance rate for suggested updates
  - [ ] Suggestions are specific and actionable
  - [ ] No hallucinations or incorrect suggestions
  
- [ ] Interactive flow is smooth
  - [ ] Review/accept/reject workflow is intuitive
  - [ ] Changes apply correctly
  - [ ] Atomic updates (all or nothing)

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

**Design Philosophy**: Progressive enhancement
1. **Phase 1 (Manual)**: Remind humans to update specs
2. **Phase 2 (Detection)**: Tell humans when specs are outdated  
3. **Phase 3 (Automation)**: Help humans update specs with AI

Each phase adds value independently. See [ANALYSIS.md](./ANALYSIS.md) for complete problem analysis.

### Related Specs

**Builds On**:
- **047-git-backfill-timestamps**: Git history analysis patterns
- **122-ai-agent-deps-management-fix**: Content/metadata alignment validation
- **174-completion-status-verification-hook**: Completion checkpoint system
- **018-spec-validation**: Validation infrastructure

**Complements**:
- **168-leanspec-orchestration-platform**: Can trigger spec updates during orchestration
- **123-ai-coding-agent-integration**: Agents can be instructed to update specs
