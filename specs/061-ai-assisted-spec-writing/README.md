---
status: planned
created: '2025-11-07'
tags:
  - ai
  - philosophy
  - docs
priority: high
created_at: '2025-11-07T15:44:34.381Z'
---

# AI-Assisted Spec Writing

> **Status**: 📅 Planned · **Priority**: High · **Created**: 2025-11-07

**Project**: lean-spec  
**Team**: Core Development

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

**Hypothesis:**
Specs still add value when:
- ✅ Intent needs to persist (reference, onboarding, decisions)
- ✅ Multiple stakeholders need alignment (can't all chat with AI)
- ✅ Compliance/audit trail required
- ✅ Complex enough that conversation would drift
- ❌ Quick feature, no ambiguity (AI can draft + implement directly)
- ❌ Exploratory work (conversation is better for discovery)

### 2. Does This Change First Principles?

**Context Economy** - Still applies (specs must fit working memory)
**Signal-to-Noise** - Maybe changes? AI can expand brief prompts into full specs
**Intent Over Implementation** - Still critical, maybe MORE so (AI fills implementation)
**Bridge the Gap** - Shifts: spec is now human→AI→human artifact, not just human→AI
**Progressive Disclosure** - AI might help with this (draft minimal, expand as needed)

### 3. Does This Change Success Criteria?

**Current:** Good spec = AI can implement correctly
**New:** Good spec = AI can draft it + AI can implement from it + Humans understand it

This is actually a HIGHER bar.

### 4. What's the New Mental Model?

**Option A: Spec-as-Checkpoint**
- Conversation with AI → Crystallize into spec → Continue from spec
- Spec = formalized agreement/checkpoint in ongoing work

**Option B: Spec-as-Artifact**
- Spec = durable output of human-AI collaboration
- Can be referenced, shared, evolved over time

**Option C: Spec-as-Context**
- Spec = structured context for AI + humans
- Still bridges intent to execution, but co-created

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
- `lspec draft "feature description"` - AI drafts spec from prompt
- `lspec refine <spec>` - AI suggests improvements
- `lspec validate <spec> --ai-check` - AI validates against first principles

## Plan

### Phase 1: Research & Define (This Spec)
- [x] Identify the question
- [ ] Answer key questions (above)
- [ ] Define new mental model
- [ ] Validate with team/community

### Phase 2: Update Core Docs
- [ ] Update "When to Use" with AI-assisted context
- [ ] Update "Understanding LeanSpec" with new mental models
- [ ] Update "AI Integration" docs with authoring workflow
- [ ] Review all docs for consistency

### Phase 3: New Content (If Needed)
- [ ] Consider dedicated "Writing Specs with AI" page
- [ ] Add examples of AI-drafted specs
- [ ] Document best practices for prompting
- [ ] Create templates for AI-assisted workflows

### Phase 4: Validation
- [ ] Dogfood: Use AI to draft/refine specs
- [ ] Get feedback from community
- [ ] Iterate based on real usage

## Test

**Validation Criteria:**

- [ ] Docs clearly explain when to formalize intent as spec vs. just converse with AI
- [ ] First principles still make sense in AI-assisted context
- [ ] New mental models are clear and actionable
- [ ] No contradictions between old/new framing
- [ ] Examples demonstrate AI-assisted workflow
- [ ] Community understands and can apply guidance

**Success Signals:**
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
