---
status: complete
created: '2025-11-07'
tags:
  - ai
  - philosophy
  - docs
priority: high
created_at: '2025-11-07T15:44:34.381Z'
updated_at: '2025-11-10T07:22:30.312Z'
transitions:
  - status: in-progress
    at: '2025-11-07T15:51:24.539Z'
  - status: complete
    at: '2025-11-10T07:22:30.312Z'
completed_at: '2025-11-10T07:22:30.312Z'
completed: '2025-11-10'
related: [43]
---

# AI-Assisted Spec Writing

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-07 · **Tags**: ai, philosophy, docs

**Project**: lean-spec  
**Team**: Core Development  
**Related**: [043-official-launch-02](../043-official-launch-02/) - Blocks v0.2.0 launch

**⚠️ CRITICAL FOR 0.2.0 LAUNCH** - Must resolve before finalizing positioning and "When to Use" docs.

## Overview

**Current State:**
LeanSpec assumes: Human writes spec → AI implements from spec
- Docs focus on "making specs AI-readable/executable"
- Decision criteria: "Will AI need this context to execute?"
- Value prop: Specs bridge human intent to machine execution

**The Question:**
If AI assists in **writing specs** (not just implementing), does this change our docs?

**The Shift:**
Human provides intent → AI drafts spec → Human refines → AI implements
- Specs become **refinement artifacts** in human-AI conversation
- Decision shifts: "Should I formalize intent as spec, or just converse with AI?"
- New question: **When does structuring intent into a spec add value over direct conversation?**

**Impact:**
This fundamentally changes:
1. Value proposition of specs
2. Decision criteria for "when to use"
3. How we frame the methodology
4. What makes a "good spec"

## Key Questions

### 1. Does This Change "When to Use"?

**Current logic:**
- Write spec when AI needs context to implement
- Skip when intent is self-evident

**New logic (if AI writes specs):**
- Write spec when formalization adds value over conversation
- Skip when conversational iteration is faster
- But... what adds value? When is structure better than chat?

**✅ ANSWER:**
The core value proposition doesn't change—**specs add value when persistence and structure matter**. However, the decision criteria expand:

**Write a spec when (EXPANDED):**
- ✅ Intent needs to persist (reference, onboarding, decisions)
- ✅ Multiple stakeholders need alignment (can't all chat with AI)
- ✅ Compliance/audit trail required
- ✅ Complex enough that conversation would drift
- ✅ **NEW:** Conversation has clarified intent enough to formalize
- ✅ **NEW:** Multiple iterations with AI have refined the approach

**Skip the spec when:**
- ❌ Quick feature, no ambiguity (AI can draft + implement directly)
- ❌ Exploratory work (conversation is better for discovery)
- ❌ **NEW:** Still discovering what to build (keep conversing)

**Key Insight:** AI-assisted authoring makes specs MORE accessible (easier to create), but doesn't change WHEN they're needed. The decision point is still: **"Does formalization add value?"**

### 2. Does This Change First Principles?

**✅ ANSWER:** First principles remain valid, but their application evolves:

**Context Economy** - **Still critical.** AI can help keep specs concise by drafting minimal versions. But AI can also be verbose—human review ensures economy.

**Signal-to-Noise** - **Still critical.** AI might expand prompts verbosely. Human refinement cuts noise. The test remains: "What decision does this inform?"

**Intent Over Implementation** - **EVEN MORE critical.** When AI drafts specs AND implements, capturing "why" is essential. AI needs intent to make good decisions at both stages.

**Bridge the Gap** - **Evolution, not change.** Specs still bridge human intent to machine execution. But now the bridge is co-created: Human intent → AI draft spec → Human refine → AI implement.

**Progressive Disclosure** - **AI can accelerate this.** AI can draft minimal specs, then expand specific sections on request. Human decides what complexity to add.

**Conclusion:** First principles are reinforced, not replaced. AI-assisted authoring makes them MORE important because AI can violate them (verbosity, implementation focus) without human guidance.

### 3. Does This Change Success Criteria?

**Current:** Good spec = AI can implement correctly
**New:** Good spec = AI can draft it + AI can implement from it + Humans understand it

**✅ ANSWER:** Success criteria expand, but don't fundamentally change:

**A good spec must:**
1. **Fit in working memory** (Context Economy)
2. **Inform decisions** (Signal-to-Noise)
3. **Capture intent** (Intent Over Implementation)
4. **Bridge human-AI understanding** (Bridge the Gap)
5. **Grow naturally** (Progressive Disclosure)
6. **Be maintainable** by humans AND AI
7. **Support both authoring and implementation** workflows

**This IS a higher bar**, but it's achievable because:
- AI handles first drafts (reduces authoring burden)
- Humans refine for clarity (ensures quality)
- LeanSpec principles guide both (maintain standards)

### 4. What's the New Mental Model?

**✅ ANSWER:** All three models are valid, depending on context. We adopt **Spec-as-Checkpoint** as the primary mental model, with the others as variations:

**Primary: Spec-as-Checkpoint** (Most Common)
- Conversation with AI → Crystallize into spec → Continue from spec
- Spec = formalized agreement/checkpoint in ongoing work
- **Use when:** Intent has been clarified through conversation and needs to be captured before implementation

**Variation 1: Spec-as-Artifact** (Formal Projects)
- Spec = durable output of human-AI collaboration
- Can be referenced, shared, evolved over time
- **Use when:** Work needs documentation for compliance, onboarding, or long-term reference

**Variation 2: Spec-as-Context** (Living Documentation)
- Spec = structured context for AI + humans
- Still bridges intent to execution, but co-created
- **Use when:** Spec evolves alongside implementation (SDD-style iterative refinement)

**Key Insight:** These are phases, not separate approaches. Most specs start as checkpoints, evolve as context, and end as artifacts.

## Design

### Proposed Changes to Docs

#### 1. Update "When to Use" (docs-site/docs/guide/when-to-use.mdx)

**Add section: "When AI Assists in Writing Specs"**

Current decision: "Will AI need this context to execute?"
New decision: "When does formalizing intent as a spec add value?"

**Write a spec when:**
- Intent needs to persist (decisions, reference, onboarding)
- Multiple stakeholders need shared understanding
- Work is complex enough that conversation would drift
- Audit trail or compliance required
- Progressive refinement benefits from structure

**Skip the spec when:**
- Quick feature with no ambiguity (AI can draft + implement directly)
- Exploratory work (conversation is better for discovery)
- One-off prototype or experiment
- Context is already clear in codebase

#### 2. Update "Understanding LeanSpec" (docs-site/docs/guide/understanding.mdx)

**Add mental model for AI-assisted spec writing**

Clarify that specs can be:
- Human-written, AI-implemented (traditional)
- AI-drafted, human-refined, AI-implemented (assisted)
- Co-created iteratively (collaborative)

All three modes are valid. First principles still apply.

#### 3. Update "AI Integration" docs (docs-site/docs/guide/ai/index.mdx)

**Expand to include AI-assisted spec authoring**

Current: Focus on AI implementing from specs
Add: AI drafting specs from human intent

Workflow becomes:
1. Human articulates intent (conversation, notes, rough outline)
2. AI drafts initial spec following LeanSpec principles
3. Human reviews, refines, adds context
4. Spec serves as checkpoint/contract
5. AI implements from refined spec

#### 4. Consider New Page: "Writing Specs with AI"

**Topics:**
- How to prompt AI to draft specs
- What to review/refine in AI-drafted specs
- Common pitfalls (AI verbosity, missing context)
- Ensuring first principles are maintained
- When to iterate vs. accept draft

### Technical Considerations

**No tooling changes needed** - This is purely docs/methodology

**But future opportunities:**
- `lean-spec draft "feature description"` - AI drafts spec from prompt
- `lean-spec refine <spec>` - AI suggests improvements
- `lean-spec validate <spec> --ai-check` - AI validates against first principles

## Plan

### Phase 1: Research & Define (This Spec)
- [x] Identify the question
- [x] Answer key questions (above)
- [x] Define new mental model (Spec-as-Checkpoint primary, with variations)
- [ ] Validate with team/community (deferred to post-implementation feedback)

### Phase 2: Update Core Docs
- [x] Update "When to Use" with AI-assisted context (merged into understanding.mdx)
- [x] Update "Understanding LeanSpec" with new mental models (decision framework added)
- [x] Update "AI Integration" docs with authoring workflow (covered in writing-specs-with-ai.mdx)
- [x] Review all docs for consistency (validated via build + validate)

### Phase 3: New Content (If Needed)
- [x] Created dedicated "Writing Specs with AI" page (docs-site/docs/guide/usage/ai-assisted/writing-specs-with-ai.mdx)
- [x] Added examples of AI-drafted specs and workflows
- [x] Documented best practices for prompting (Do's and Don'ts)
- [x] Created workflow templates (5-step process, common patterns)

### Phase 4: Validation
- [ ] Dogfood: Use AI to draft/refine specs
- [ ] Get feedback from community
- [ ] Iterate based on real usage

## Test

**Validation Criteria (Phases 1-3):**

- [x] Docs clearly explain when to formalize intent as spec vs. just converse with AI (understanding.mdx updated with decision framework)
- [x] First principles still make sense in AI-assisted context (understanding.mdx confirms they're reinforced, not replaced)
- [x] New mental models are clear and actionable (Spec-as-Checkpoint, Artifact, Context defined in writing-specs-with-ai.mdx)
- [x] No contradictions between old/new framing (consistent messaging across all updated docs)
- [x] Examples demonstrate AI-assisted workflow (writing-specs-with-ai.mdx has 5-step workflow + patterns)
- [ ] Community understands and can apply guidance (deferred to Phase 4: user feedback)

**Additional Validation:**
- [x] Docs build successfully (verified with `npm run build`)
- [x] Spec structure validated (no new errors from our changes)
- [x] All three target docs updated (understanding.mdx updated; when-to-use.mdx was merged into understanding.mdx by spec 062)
- [x] New dedicated page created (guide/usage/ai-assisted/writing-specs-with-ai.mdx)
- [x] Sidebar navigation updated (added to "AI-Assisted Workflows" section)

**Success Signals (To be measured in Phase 4):**
- Users know when to use specs vs. conversation
- AI-drafted specs follow LeanSpec principles
- Methodology remains coherent and practical
- No confusion about "what LeanSpec is for"

## Notes

### Core Insight

The fundamental value of specs doesn't change:
- **Persistence** - Specs outlive conversations
- **Shared understanding** - Specs align stakeholders
- **Structure** - Specs prevent drift and ambiguity
- **Context** - Specs bridge intent to execution

What changes is **how specs are created**, not **why they exist**.

### Open Questions

1. **Does AI-assisted writing make specs MORE or LESS necessary?**
   - Less: AI can implement from conversation
   - More: Specs formalize and checkpoint the conversation

2. **When is conversation better than specs?**
   - Rapid exploration, high uncertainty
   - Simple features, no ambiguity
   - One-off work, no future reference needed

3. **How do we teach "when to formalize"?**
   - This is judgment, not rules
   - Need examples and heuristics
   - Maybe: "If conversation > 5 turns, consider formalizing"

### Related Work

- **[049-leanspec-first-principles](../049-leanspec-first-principles/)** - First principles still apply
- **[043-official-launch-02](../043-official-launch-02/)** - Original positioning
- **AI Integration docs** - Current state of AI guidance

### Next Steps

1. **Discuss with community** - Is this the right framing?
2. **Prototype workflows** - Try AI-assisted spec writing
3. **Draft doc updates** - Apply learnings
4. **Validate with real usage** - Does it work in practice?
