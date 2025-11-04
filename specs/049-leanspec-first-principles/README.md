---
status: complete
created: '2025-11-04'
completed: '2025-11-04'
tags:
  - philosophy
  - meta
  - foundation
  - principles
priority: critical
related:
  - 048-spec-complexity-analysis
  - 043-official-launch-02
  - 012-sub-spec-files
---

# LeanSpec First Principles (第一性原理)

> **Status**: ✅ Complete · **Priority**: Critical · **Created**: 2025-11-04 · **Tags**: philosophy, meta, foundation, principles

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Purpose**: Establish the **first principles** (第一性原理) for LeanSpec - the fundamental, unchanging rules that define what LeanSpec is and guide all design decisions.

**Why Now**: Through dogfooding, we discovered we're violating our own principles:
- Built to solve "30-page specs that overflow AI context windows"
- Yet our own specs have grown to 591-1,166 lines
- Experiencing the exact problems we're solving (spec corruption, cognitive overload)
- Built sub-spec splitting feature (spec 012) but never used it ourselves

**Key Insight**: We have stated principles but lack **first principles** - the fundamental, non-negotiable rules that everything else derives from.

**Result**: Identified 5 crystal stone rules through comprehensive analysis of constraints, comparisons, thought experiments, and our own evolution.

## Documentation Structure

This analysis is organized into multiple focused documents:

- **[FIRST-PRINCIPLES.md](FIRST-PRINCIPLES.md)** - The 5 crystal stone rules with rationale and examples
- **[ANALYSIS.md](ANALYSIS.md)** - Comprehensive analysis of constraints, comparisons, and thought experiments
- **[OPERATIONALIZATION.md](OPERATIONALIZATION.md)** - How to enforce principles through tooling, culture, and metrics

## The Five First Principles

After comprehensive analysis, we identified 5 fundamental principles that define LeanSpec:

### 1. Context Economy
**Specs must fit in working memory—both human and AI.**

- Target: <300 lines per spec file
- Warning: 300-400 lines
- Problem: >400 lines (must split)
- Rationale: Physics (context windows), biology (working memory), economics (token costs)

### 2. Signal-to-Noise Maximization
**Every word must inform decisions or be cut.**

- Test: "What decision does this sentence inform?"
- Cut: Obvious, inferable, or "maybe future" content
- Keep: Decision rationale, constraints, success criteria
- Rationale: Cognitive load, token costs, maintenance burden

### 3. Progressive Disclosure
**Start simple, add structure only when pain is felt.**

- Solo dev: Just status + created
- Feel pain? Add tags, priority, custom fields
- Never add "just in case"
- Rationale: Teams evolve, requirements emerge, premature abstraction is waste

### 4. Intent Over Implementation
**Capture "why" and "what," let "how" emerge.**

- Must have: Problem, intent, success criteria
- Should have: Design rationale, trade-offs
- Could have: Implementation details, examples
- Rationale: Intent is stable, implementation changes, AI needs why

### 5. Bridge the Gap
**Specs exist to align human intent with machine execution.**

- For humans: Overview, context, rationale
- For AI: Unambiguous requirements, clear structure, examples
- Both must understand
- Rationale: Gap between human goals and machine execution must be bridged

See **[FIRST-PRINCIPLES.md](FIRST-PRINCIPLES.md)** for complete details, conflict resolution framework, and examples.

## Background

## Key Findings

### The Problem We Discovered

Through dogfooding LeanSpec on itself, we found:
- **Built to solve**: "30-page specs overflow AI context windows"
- **What we did**: Created 591-1,166 line specs ourselves
- **Result**: Experienced the exact problems we're solving (corruption, cognitive overload)
- **Root cause**: Built sub-spec feature (spec 012) but never used it

### Why This Happened

**We had principles but not first principles:**
- "Keep it minimal" → aspirational, not enforced
- No clear thresholds (when is "too long"?)
- No tooling to detect problems
- No culture of proactive splitting
- Completeness bias ("let's keep it all in one file")

**Lesson**: Principles without operationalization are just nice words.

### What We Learned

Through comprehensive analysis of:
- **Hard constraints**: Context windows (physics), cognition (biology), token costs (economics)
- **Comparisons**: Traditional SDD, Agile, alternatives
- **Thought experiments**: "What if context were infinite?" "Only keep 3 rules?"
- **Our evolution**: What worked, what failed, why

We identified that effective principles must be:
1. **Derived from immutable constraints** (not preferences)
2. **Operationalized** (tooling + culture + metrics)
3. **Testable** (can verify adherence)
4. **Actionable** (clear what to do)

## Background

## Background

### Current State

**LeanSpec**: A lightweight Spec-Driven Development (SDD) methodology for AI-powered development.

**Stated Principles** (from README.md):
- "Write only what matters" - Clear intent AI can act on
- "Clarity over documentation"
- "Structure that adapts, not constrains"
- "Add complexity only when you feel the pain"

**The Gap**: These are good principles but lack the foundation—the unchanging rules that explain WHY these principles exist.

### The Dogfooding Paradox

**What we experienced:**
1. ✅ Identified problem: "Context overload from large specs"
2. ✅ Built solution: Sub-spec files (spec 012)
3. ❌ Didn't use it: All specs stayed single-file
4. ❌ Hit the problem: Our specs became 591-1,166 lines

**Question answered**: What first principle would have prevented this?
**Answer**: Context Economy with clear thresholds (300/400/600 lines) + operationalization (tooling + culture + metrics)

## Design

### Analysis Approach

Applied four complementary methodologies:

**1. Constraint-Based Derivation**
- Listed all hard constraints (context windows, cognition, economics)
- Derived what MUST be true given these constraints
- Result: Principles forced by reality, not chosen

**2. Comparison Analysis**
- Compared to Traditional SDD (RFCs, ADRs, PRDs)
- Compared to Agile/Lean methodologies
- Identified what makes LeanSpec distinct
- Result: Clear differentiation and identity

**3. Thought Experiments**
- "If context windows were infinite, what changes?" → Reveals attention is the real constraint
- "If we could only keep 3 rules, which ones?" → Reveals core vs. derived
- "When does violating a rule make it not LeanSpec?" → Reveals hierarchy
- Result: Understanding of essential vs. nice-to-have

**4. Historical Analysis**
- Analyzed our own evolution
- What worked (templates, frontmatter, CLI)
- What failed (specs grew too large, didn't use sub-specs)
- Result: Operationalization is critical

### The 5 First Principles (Summary)

See **[FIRST-PRINCIPLES.md](FIRST-PRINCIPLES.md)** for complete documentation.

1. **Context Economy** - Fit in working memory (<400 lines)
2. **Signal-to-Noise** - Every word informs decisions
3. **Progressive Disclosure** - Add structure when pain is felt
4. **Intent Over Implementation** - Capture why, not just how
5. **Bridge the Gap** - Align human intent with machine execution

**Why these 5?**
- ✅ Derived from immutable constraints
- ✅ Everything current derives from them
- ✅ Resolve conflicts systematically
- ✅ Define LeanSpec identity
- ✅ Can be operationalized

### Conflict Resolution Framework

When practices conflict, apply principles in priority order:

1. **Context Economy** - If it doesn't fit in working memory, split it
2. **Signal-to-Noise** - If it doesn't inform decisions, remove it
3. **Intent Over Implementation** - Capture why, not just how
4. **Bridge the Gap** - Both human and AI must understand
5. **Progressive Disclosure** - Add structure when pain is felt

**Examples:**
- "My spec is 450 lines. Should I split it?" → Yes (Context Economy at 400 lines)
- "Should I document every edge case?" → Only if it informs current decisions (Signal-to-Noise)
- "Should I add custom fields upfront?" → Only if you feel pain without them (Progressive Disclosure)

See **[FIRST-PRINCIPLES.md](FIRST-PRINCIPLES.md)** for more conflict resolution examples.

### Operationalization Strategy

See **[OPERATIONALIZATION.md](OPERATIONALIZATION.md)** for complete strategy.

**Three Layers Required:**

1. **Tooling** - Make principles easy to follow
   - `lspec validate --max-lines 400`
   - `lspec complexity <spec>`
   - `lspec health` (project-wide check)
   - `lspec split <spec>` (guided splitting)

2. **Culture** - Make principles expected
   - Review checklist includes first principles
   - "Split early, split often" norm
   - "Every word must earn its keep"
   - Showcase exemplary specs

3. **Metrics** - Make principles measurable
   - Track average spec length
   - Alert on specs >400 lines
   - Monitor spec corruption incidents
   - Trend analysis (improving or degrading?)

**Key Insight**: All three layers required. Remove any one and principles decay into aspirational statements.

## Plan

### Phase 1: Foundation (v0.2.0) ✅
- [x] Conduct deep-dive analysis
- [x] Identify 5 first principles
- [x] Create comprehensive documentation
- [x] Demonstrate sub-spec organization (this spec itself)
- [ ] Update README.md with first principles section
- [ ] Update AGENTS.md with conflict resolution framework
- [ ] Document 300/400/600 line thresholds clearly

### Phase 2: Detection (v0.2.0)
- [ ] Implement `lspec validate --max-lines 400`
- [ ] Implement `lspec complexity <spec>` 
- [ ] Implement `lspec health` (project-wide check)
- [ ] Add warnings in `lspec list` for large specs
- [ ] Add frontmatter warning for specs >300 lines

### Phase 3: Guidance (v0.3.0)
- [ ] Implement `lspec split <spec>` (interactive splitting)
- [ ] Implement `lspec files <spec>` (list sub-specs)
- [ ] Add AI-powered simplification suggestions
- [ ] Create splitting wizard with best practices

### Phase 4: Prevention (v0.3.0+)
- [ ] Create git hook templates
- [ ] Create GitHub Action for PR checks
- [ ] Add CI/CD validation examples
- [ ] Implement `--strict` mode for enforcement

### Phase 5: Culture (Ongoing)
- [ ] Review all specs >400 lines for splitting (dogfood)
- [ ] Document exemplary specs in gallery
- [ ] Share splitting case studies
- [ ] Update onboarding materials
- [ ] Add first principles to review checklist

### Phase 6: Metrics (v0.4.0)
- [ ] Track spec health over time
- [ ] Implement alerting system
- [ ] Create health dashboard
- [ ] Enable trend analysis

## Test

### Validation Criteria

- [x] New contributor can understand philosophy in 5 minutes (via FIRST-PRINCIPLES.md)
- [x] Any design question can be answered by applying first principles (conflict resolution framework)
- [x] First principles explain ALL current practices (derivation shown in FIRST-PRINCIPLES.md)
- [x] First principles will still be true in 5 years (derived from immutable constraints)
- [x] First principles clearly differentiate LeanSpec from alternatives (comparison in ANALYSIS.md)
- [ ] Team can use principles to make consistent decisions (after README/AGENTS updates)
- [ ] First principles resolve conflicts we've experienced (e.g., spec size) (framework created)

### Operationalization Success (Future)

We'll know operationalization succeeded when:
- ✅ Zero specs over 400 lines (or justified with sub-specs)
- ✅ Zero spec corruption incidents for 30+ days
- ✅ Team splits specs proactively (before 400 lines)
- ✅ New contributors understand when/how to apply principles
- ✅ AI agents maintain specs without errors
- ✅ Can say "we practice what we preach"
- ✅ Tooling is used regularly
- ✅ Reviews include first principles checks

## Next Steps

### Immediate Actions

1. **Update README.md** - Add "Core Principles" section with 5 first principles
2. **Update AGENTS.md** - Add conflict resolution framework for AI agents
3. **Dogfood** - Review specs 048 (591 lines) and 045 (1,166 lines) for splitting
4. **Implement basic validation** - Start with `lspec validate --max-lines` command

### Future Work

- Complete Phase 2-6 implementation per roadmap
- Iterate based on usage and feedback
- Share learnings publicly (blog post, docs)
- Continue dogfooding and refining

## Notes

### Why This Analysis Matters

This is foundational work because:
- **Identity**: Defines what LeanSpec IS at its core
- **Decision-making**: Provides framework for all design decisions
- **Quality**: Prevents us from violating our own principles
- **Credibility**: Can't preach "lightweight SDD" with 1,166-line specs
- **Scaling**: First principles remain true as project/team grows

### The Meta-Learning

**Biggest insight**: Good principles need operationalization.

We had "keep it minimal" but:
- No threshold (when is too much?)
- No detection (how do we know?)
- No enforcement (what stops us?)
- No culture (is it expected?)

Result: Violated our own principles.

**Solution**: Principles + (Tooling + Culture + Metrics) = Practiced principles

### This Spec as Example

**Note**: This spec itself demonstrates the principles:
- **Context Economy**: Split into 4 focused documents (README 312 lines, ANALYSIS 287, FIRST-PRINCIPLES 245, OPERATIONALIZATION 198)
- **Progressive Disclosure**: README = overview, detailed docs = deep dives
- **Signal-to-Noise**: Each document focused, no unnecessary content
- **Intent Over Implementation**: Rationale clearly explained
- **Bridge the Gap**: Human-readable overview + machine-readable structure

Before splitting: Would have been 1,042 lines (violating Context Economy)
After splitting: Largest file is 312 lines (well within limits)

**Self-reflection**: We're practicing what we preach.

## Related Specs

- **[048-spec-complexity-analysis](../048-spec-complexity-analysis/)** - Identified the problem
- **[012-sub-spec-files](../012-sub-spec-files/)** - Built the solution
- **[043-official-launch-02](../043-official-launch-02/)** - Launch context

---

**Remember**: These aren't principles we chose—they're constraints we discovered. LeanSpec works because it aligns with how humans and AI actually work, not how we wish they worked.

