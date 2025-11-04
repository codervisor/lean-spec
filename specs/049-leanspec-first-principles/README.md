---
status: planned
created: '2025-11-04'
tags:
  - philosophy
  - meta
  - foundation
  - principles
priority: critical
related:
  - 048-spec-complexity-analysis
  - 043-official-launch-02
---

# LeanSpec First Principles (第一性原理)

> **Status**: 📅 Planned · **Priority**: Critical · **Created**: 2025-11-04 · **Tags**: philosophy, meta, foundation, principles

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

**The Task**: Identify 3-7 crystal stone rules that:

1. **Never or hardly ever change** - True across all contexts, team sizes, project types
2. **Everything else derives from them** - All other rules/guidelines are applications of these
3. **Can be used to resolve conflicts** - When two practices conflict, first principles decide
4. **Define what makes something "LeanSpec"** - Core identity, not implementation details

## Background

**Project**: LeanSpec - A lightweight Spec-Driven Development (SDD) methodology for AI-powered development.

**Recent Discovery**: Through dogfooding LeanSpec, we discovered we're violating our own principles:
- Built to solve "30-page specs that overflow AI context windows"
- Yet our own specs have grown to 591-1,166 lines
- Experiencing the exact problems we're solving (spec corruption, cognitive overload)
- Built sub-spec splitting feature (spec 012) but never used it ourselves

**Key Insight**: We have stated principles but lack **first principles** - the fundamental, non-negotiable rules that everything else derives from.

## The Task

Conduct a deep-dive analysis to identify LeanSpec's **first principles** - the crystal stone rules that:

1. **Never or hardly ever change** - True across all contexts, team sizes, project types
2. **Everything else derives from them** - All other rules/guidelines are applications of these
3. **Can be used to resolve conflicts** - When two practices conflict, first principles decide
4. **Define what makes something "LeanSpec"** - Core identity, not implementation details

## Materials to Analyze

### Current Stated Principles

From `README.md`:
- "Write only what matters" - Clear intent AI can act on, not 50 pages of noise
- "Clarity over documentation" 
- "Structure that adapts, not constrains"
- "Add complexity only when you feel the pain"
- "Lean enough for humans to maintain"

From `AGENTS.md`:
- "Follow LeanSpec principles - Clarity over documentation"
- "Keep it minimal - If it doesn't add clarity, cut it"
- "Write a spec for: Features affecting multiple parts of the system"
- "Skip specs for: Bug fixes, trivial changes, self-explanatory refactors"

### Recent Learnings

From **Spec 048** (Spec Complexity Analysis):
- Thresholds: 300/400/600 lines for spec complexity
- Symptoms: Corruption, cognitive overload, context window issues
- Solution: Sub-spec splitting, but needs enforcement
- **Gap**: Principles exist but aren't enforced or operationalized

### Context Window Reality

- Claude Sonnet: 200K tokens total, ~20-30K effective working memory
- 600-line spec: ~15-20K tokens (entire working memory)
- Multi-file projects: Context must be shared across specs + code + conversation
- **Constraint**: This is a hard limit, not a preference

### The Dogfooding Paradox

We've experienced:
1. ✅ Identified problem: "Context overload from large specs"
2. ✅ Built solution: Sub-spec files (spec 012)
3. ❌ Didn't use it: All specs stayed single-file
4. ❌ Hit the problem: Our own specs became too large

**Question**: What first principle would have prevented this?

## Design

### Analysis Framework

### 1. Physics of AI-Powered Development

What are the **unchangeable constraints** of working with AI coding agents?
- Context window limits (hard technical constraint)
- Token costs (economic constraint)
- AI reasoning quality degradation with context size
- Need for clear, unambiguous instructions
- Async nature of human-AI collaboration

**Question**: What first principles emerge from these constraints?

### 2. Human Cognitive Limits

What are the **unchangeable constraints** of human cognition?
- Working memory: 7±2 items
- Reading speed and comprehension
- Fatigue from context switching
- Need for progressive disclosure
- Pattern recognition vs detailed analysis

**Question**: What first principles serve both human AND AI cognition?

### 3. Evolution and Emergence

What are the **unchangeable patterns** of how software projects evolve?
- Complexity tends to increase over time
- Teams grow from solo → small → large
- Requirements change and become clearer
- Context gets stale without maintenance
- Early decisions constrain later ones

**Question**: What first principles enable graceful evolution?

### 4. The "Lean" Philosophy

What makes something truly "lean"?
- Manufacturing: Eliminate waste, continuous improvement
- Startup: Build-measure-learn, validate assumptions
- Agile: Working software over comprehensive documentation

**Question**: What's the first principle of "lean" in SDD context?

### 5. Spec-Driven Development Essence

Why write specs at all?
- Clarity of intent before implementation
- Communication across time (async) and people
- Context for AI agents and future humans
- Design space exploration
- Decision documentation

**Question**: What's the **minimum viable spec** that achieves this?

## Specific Questions to Explore

### Question 1: The One Metric That Matters
If you could only measure ONE thing to determine spec quality, what would it?
- Lines of code? (too simplistic)
- Time to understand? (subjective)
- AI success rate at implementation? (observable)
- Maintenance burden? (long-term)
- Context efficiency? (tokens per insight)

**Hypothesis**: The right metric reveals the first principle.

### Question 2: The Conflict Resolution Test
When these conflict, which wins?
- Completeness vs Brevity
- Structure vs Flexibility  
- Upfront design vs Emergent design
- Single file vs Multiple files
- Human readability vs AI parseability

**Hypothesis**: First principles resolve these automatically.

### Question 3: The Scaling Test
What must remain true as you scale from:
- Solo dev → 2 people → 10 people → 100 people
- 1 spec → 10 specs → 100 specs → 1000 specs
- 1 week → 1 month → 1 year → 5 years

**Hypothesis**: What stays constant across scales is a first principle.

### Question 4: The Tool Independence Test
If you removed LeanSpec tooling entirely (just markdown files), what must still be true?
- Would the methodology still work?
- What's the core that tooling just automates?
- What's essential vs convenient?

**Hypothesis**: First principles exist independent of tooling.

### Question 5: The Boundary Test
What is NOT LeanSpec?
- Is a 2,000-line spec ever LeanSpec? Why/why not?
- Is a 10-line stub spec LeanSpec? Why/why not?
- Is a spec with no implementation plan LeanSpec?
- Is pure documentation (no "why") LeanSpec?

### Expected Output Structureies reveal first principles.

## Expected Deliverable

Create a document (or update this spec) that defines:

**Section 1: The First Principles (Crystal Stone Rules)**

List 3-7 first principles that:
- Are fundamental and unchanging
- Can be explained in one sentence each
- Have clear rationale rooted in constraints
- Can be used to derive all other rules
- Resolve conflicts between practices

**Format**:
```
## First Principle N: [Principle Name]

**Statement**: [One sentence principle]

**Rationale**: [Why this is fundamental - what constraint/truth it derives from]

**Implications**: [What this means in practice]

**Test**: [How to know if you're following it]
```

**Section 2: Derived Rules**

Show how current practices derive from first principles:
- Spec size limits → derives from Principle X
- Sub-spec splitting → derives from Principle Y
- Template structure → derives from Principle Z

**Section 3: Resolution Framework**

Show how first principles resolve conflicts:
- "Should I add this section?" → Apply Principle X
- "Is this spec too long?" → Apply Principle Y
- "Should I split this spec?" → Apply Principle Z

**Section 4: Operationalization**

How to enforce first principles:
- Tooling (`lspec check` rules)
- Documentation updates
- Cultural practices
- Review guidelines

**Section 5: The LeanSpec Identity**

**Final question**: What makes LeanSpec uniquely LeanSpec?

Complete this sentence based on first principles:
> "LeanSpec is fundamentally about ___________, which means ___________, and therefore ___________."

### Success Criteria

The analysis succeeds when:

1. ✅ **Clarity**: A new contributor can understand the philosophy in 5 minutes
2. ✅ **Decidability**: Any design question can be answered by applying first principles
3. ✅ **Consistency**: First principles explain ALL current practices (or reveal inconsistencies)
4. ✅ **Durability**: First principles will still be true in 5 years
5. ✅ **Distinctiveness**: First principles clearly differentiate LeanSpec from alternatives

### Methodology

### Approach 1: Constraint-Based Derivation
1. List all hard constraints (context windows, cognition, economics)
2. Derive what must be true given these constraints
3. Test if current practices align

### Approach 2: Comparison Analysis
Compare LeanSpec philosophy to:
- Traditional SDD (RFCs, ADRs, PRDs)
- BMAD, SpecKit, Kiro, OpenSpec
- Agile/Lean methodologies
- What's different? Why? What's the root cause?

### Approach 3: Thought Experiments
- "If context windows were infinite, what would change?" (reveals constraint-based principles)
- "If we could only keep 3 rules, which ones?" (reveals core vs derived)
- "If a user violates rule X but follows Y, is it still LeanSpec?" (reveals hierarchy)

### Approach 4: Historical Analysis
Look at our own evolution:
- What decisions worked well? Why?
- What decisions caused problems? Why?
- What patterns emerge?

## Plan

**Key repository files to reference**:nts (context windows, cognition, economics)
- [ ] Compare LeanSpec to traditional SDD and alternatives (BMAD, SpecKit, etc.)
- [ ] Run thought experiments to identify core vs derived principles
- [ ] Analyze our own evolution and what decisions worked/failed
- [ ] Identify 3-7 first principles with clear rationale
- [ ] Show how current practices derive from first principles
- [ ] Create conflict resolution framework
### Starting Questions for Analysisnalization approach (tooling + culture)
- [ ] Craft LeanSpec identity statement
- [ ] Update README.md and AGENTS.md with first principles
- [ ] Validate against current specs and practices

## Test

- [ ] New contributor can understand philosophy in 5 minutes
- [ ] Any design question can be answered by applying first principles
- [ ] First principles explain ALL current practices (or reveal inconsistencies)
- [ ] First principles will still be true in 5 years
- [ ] First principles clearly differentiate LeanSpec from alternatives
- [ ] Team can use principles to make consistent decisions
- [ ] First principles resolve conflicts we've experienced (e.g., spec size)

## Notes

### Context for Analysis

In the LeanSpec repository:
- `README.md` - Current positioning and principles
- `AGENTS.md` - Guidance for AI agents
- `specs/048-spec-complexity-analysis/` - Recent self-reflection on complexity
- `specs/012-sub-spec-files/` - Solution we built but didn't use
### Implementation Outputicial-launch-02/` - Launch goals and quality standards

When complete, deliver:
1. Update this spec with findings (or create sub-specs)
2. Include clear first principles with rationale
3. Show derivations from first principles
4. Propose updates to README.md and AGENTS.md
5. Identify any conflicts with current practices

### Why This Matters
2. **What problem are we REALLY solving?**
This analysis is critical because:
- We have principles but not **first** principles
- We violated our own stated principles (large specs)
- We built solutions but didn't use them (dogfooding failure)
- We need unchanging foundation to guide decisions

The goal: Establish the bedrock that everything else builds on - the rules that define LeanSpec's essence and never change, even as practices, tooling, and implementations evolve.

### For Next Session

This spec should be the **starting point** for a deep-dive session with clean context. The analysis should:
1. Reference current state of LeanSpec (README.md, AGENTS.md, specs)
2. Apply the frameworks and questions outlined here
3. Emerge with 3-7 crystal-clear first principles
4. Show how everything derives from those principles
5. Provide actionable updates to documentation and tooling: `specs/049-leanspec-first-principles/README.md`
