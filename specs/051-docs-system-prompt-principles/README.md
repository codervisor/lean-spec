---
status: planned
created: '2025-11-05'
tags:
  - documentation
  - ai-agents
  - first-principles
  - system-prompt
  - philosophy
  - v0.2.0
priority: critical
related:
  - 049-leanspec-first-principles
  - 050-tool-redesign-first-principles
created_at: '2025-11-05T00:00:00Z'
updated_at: '2025-11-05T05:03:54.922Z'
---

# Update System Prompt and Docs with First Principles

> **Status**: 🗓️ Planned · **Priority**: Critical · **Created**: 2025-11-05 · **Tags**: documentation, ai-agents, first-principles, system-prompt, philosophy, v0.2.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Purpose**: Embed the 5 LeanSpec first principles from spec 049 into AGENTS.md, README.md, and documentation so both AI agents and users understand and apply them consistently.

**Why Now**:
- First principles established in spec 049 but not integrated into guidance
- AI agents need conflict resolution framework for spec decisions
- Users need to understand philosophy driving LeanSpec design
- Current docs focus on "what" not "why"

**Key Insight**: Documentation should teach principles, not just commands. When users/AI understand the "why," they make better decisions without needing explicit rules for every case.

**Result**: Updated documentation where first principles are visible, actionable, and guide decision-making for both humans and AI.

## Background

### Current Documentation State

**AGENTS.md**:
- ✅ Has practical guidelines (line thresholds, when to split)
- ❌ Missing WHY these guidelines exist
- ❌ No conflict resolution framework
- ❌ Doesn't connect practices to principles

**README.md**:
- ✅ Shows adaptive design, features
- ❌ Philosophy implied but not explicit
- ❌ First principles not stated clearly
- ❌ Missing "decision framework" section

**Docs Site**:
- ✅ Good getting started guides
- ❌ Philosophy buried or scattered
- ❌ No clear "First Principles" page
- ❌ Examples don't highlight principle application

### The Gap

**Spec 049 identified 5 first principles**:
1. Context Economy
2. Signal-to-Noise Maximization
3. Progressive Disclosure
4. Intent Over Implementation
5. Bridge the Gap

**Current docs** focus on mechanics (how to use commands) without grounding in these principles.

**Result**: Users follow rules without understanding. AI agents can't reason about edge cases.

### What Success Looks Like

**AI Agents** can:
- Resolve conflicts using principle priority order
- Decide when to split specs (Context Economy > completeness)
- Choose what to include/exclude (Signal-to-Noise test)
- Make spec structure decisions without explicit rules

**Users** can:
- Understand why LeanSpec is designed this way
- Make consistent decisions aligned with philosophy
- Explain LeanSpec philosophy to teammates
- Evaluate if LeanSpec fits their needs (clear identity)

## Design

### Core Approach: Principles as Foundation

**Strategy**: Make principles discoverable at every level
- README: Quick principle summary in "Why LeanSpec" section
- AGENTS.md: Detailed guidance with conflict resolution
- Docs site: Dedicated first principles page with examples
- Examples: Annotate with which principles they demonstrate

### AGENTS.md Updates

**Section 1: First Principles Framework** (new)
```markdown
## First Principles (Decision Framework)

When making spec decisions, apply principles in priority order:

1. **Context Economy** - Fit in working memory (<400 lines)
   - Question: "Can this be read in 5-10 minutes?"
   - Action: Split at 400 lines, warning at 300
   
2. **Signal-to-Noise** - Every word informs decisions
   - Question: "What decision does this inform?"
   - Action: Cut if answer is "none" or "maybe future"
   
3. **Intent Over Implementation** - Capture why, not just how
   - Question: "Is the rationale clear?"
   - Action: Explain trade-offs, constraints, success criteria
   
4. **Bridge the Gap** - Both human and AI must understand
   - Question: "Can both parse and reason about this?"
   - Action: Clear structure + natural language explanation
   
5. **Progressive Disclosure** - Add complexity when pain is felt
   - Question: "Do we need this now?"
   - Action: Start minimal, add fields when required

### Conflict Resolution Examples

**"Should I split this 450-line spec?"**
→ Yes (Context Economy at 400 lines overrides completeness)

**"Should I document every edge case?"**
→ Only if it informs current decisions (Signal-to-Noise)

**"Should I add custom fields upfront?"**
→ Only if you feel pain without them (Progressive Disclosure)

**"Should I keep implementation details in spec?"**
→ Only if rationale/constraints matter (Intent Over Implementation)
```

**Section 2: Quality Checks** (enhanced)
- Add principle validation to existing guidelines
- Connect line thresholds to Context Economy
- Link splitting guidance to Signal-to-Noise

**Section 3: Common Patterns** (new)
- Good vs bad examples annotated with principles
- Show how principles resolve real conflicts
- Include AI agent decision scenarios

### README.md Updates

**Add "Core Principles" Section** (after "The LeanSpec Solution")
```markdown
## Core Principles

LeanSpec is built on 5 first principles that define what it is:

1. **Context Economy** - Specs must fit in working memory (human + AI)
   - Target <300 lines, warning 300-400, split >400
   - Why: Physics (context windows) + Biology (attention)

2. **Signal-to-Noise Maximization** - Every word must inform decisions
   - Test: "What decision does this sentence inform?"
   - Why: Token costs, cognitive load, maintenance

3. **Progressive Disclosure** - Add structure only when pain is felt
   - Start: Just status + created
   - Scale: Add fields as team/complexity grows
   - Why: Premature abstraction is waste

4. **Intent Over Implementation** - Capture "why" and "what," let "how" emerge
   - Must: Problem, intent, success criteria
   - Optional: Implementation details
   - Why: Intent is stable, implementation changes

5. **Bridge the Gap** - Align human intent with machine execution
   - For humans: Context, rationale
   - For AI: Clear requirements, structure
   - Why: Gap between goals and execution must be bridged

These aren't principles we chose—they're constraints we discovered. 
[Learn more in spec 049 →](./specs/049-leanspec-first-principles/)
```

**Enhance "Why LeanSpec" Section**
- Connect features to principles explicitly
- Show how principles solve the stated problems
- Add principle-driven design examples

### Docs Site Updates

**New Page: `/docs/guide/first-principles.md`**
- Deep dive into each principle with examples
- When principles conflict, how to resolve
- How principles influenced LeanSpec design
- Link to spec 049 for full analysis

**Update Existing Pages**:
- Getting Started: Add "Philosophy in 60 seconds"
- Best Practices: Annotate with principle connections
- FAQ: Add "Why these constraints?" section
- Examples: Label which principles each demonstrates

## Plan

### Phase 1: AGENTS.md (Week 1)
**Goal**: AI agents can resolve conflicts using principles

- [ ] Add "First Principles Framework" section at top
- [ ] Add conflict resolution examples with principle priority
- [ ] Enhance existing guidelines with principle connections
- [ ] Add "Common Patterns" section with annotated examples
- [ ] Test with AI agent scenarios (simulate conflicts)

**Success**: AI can answer "should I...?" questions using principles

### Phase 2: README.md (Week 1)
**Goal**: Users understand philosophy driving LeanSpec

- [ ] Add "Core Principles" section after solution description
- [ ] Connect principles to problem statement
- [ ] Enhance "Why LeanSpec" with principle examples
- [ ] Add links to deeper principle documentation
- [ ] Keep under 300 lines total (Context Economy!)

**Success**: New users understand "why" not just "what"

### Phase 3: Docs Site (Week 2)
**Goal**: Comprehensive principle documentation with examples

- [ ] Create `/docs/guide/first-principles.md` page
- [ ] Add "Philosophy in 60 seconds" to Getting Started
- [ ] Annotate existing examples with principles
- [ ] Add FAQ entries about principles
- [ ] Create principle-focused tutorial

**Success**: Users can learn philosophy at any depth level

### Phase 4: Validation (Week 2)
**Goal**: Verify principles are clear and actionable

- [ ] Self-validation: Create test scenarios and apply framework
- [ ] AI agent testing: Simulate conflicts, verify principle-based decisions
- [ ] Fresh-eyes test: Read docs with "beginner mindset"
- [ ] Dog-fooding: Use principles in next spec work
- [ ] Optional: Share with early users (Discord, GitHub discussions) if available

**Success**: Principles enable consistent decision-making (demonstrated through test scenarios)

## Test

### Principle Visibility

- [ ] README mentions all 5 principles clearly
- [ ] AGENTS.md provides decision framework
- [ ] Docs site has dedicated first principles page
- [ ] Examples annotated with which principles they demonstrate

### AI Agent Capability

Test scenarios where AI must apply principles:
- [ ] "This spec is 450 lines, what should I do?" → Correctly applies Context Economy
- [ ] "Should I add these future considerations?" → Correctly applies Signal-to-Noise
- [ ] "Should I add custom fields now?" → Correctly applies Progressive Disclosure
- [ ] Given conflicting guidance, resolves using principle priority

### User Understanding

Test by simulating new user scenarios:
- [ ] Reading README: Can extract 5 principles without searching
- [ ] Given question "Why 400-line limit?": Docs clearly explain Context Economy
- [ ] Decision scenario: "450-line spec" → Framework leads to "split" decision
- [ ] Can write 2-paragraph philosophy summary from docs alone

### Quality Checks

- [ ] AGENTS.md <300 lines (practices Context Economy)
- [ ] README Core Principles section <100 lines (Signal-to-Noise)
- [ ] Every principle statement actionable (not abstract philosophy)
- [ ] Examples show principle application clearly

## Success Metrics

**Documentation Quality**:
- All 5 principles documented in 3+ places (README, AGENTS.md, docs site)
- Conflict resolution framework in AGENTS.md
- Examples annotated with principles
- Links between related docs
**User/AI Capability** (validated through scenarios):
- Principles discoverable in <5 minutes of reading
- AI agents make principle-consistent decisions in test cases
- Conflict scenarios resolve systematically using framework
- Docs enable self-service philosophy understanding

**Internal Quality** (measurable now):
- First principles referenced in new spec work
- Design decisions justified by principles
- Team uses principle language in planning
- Philosophy serves as filter for feature requestses
- Users share philosophy with others

## Notes

### Key Design Decisions

**Principle Priority Order**: Context Economy first because nothing else matters if spec doesn't fit in working memory.

**Placement Strategy**: 
- README: Quick summary for discovery
- AGENTS.md: Detailed framework for decision-making
- Docs site: Deep dive for comprehensive understanding

**Annotation Approach**: Show don't tell—examples demonstrate principles better than abstract explanation.

### What This Enables

**Consistency**: Same principles guide users and AI agents
**Scalability**: Principles work for solo dev → enterprise
**Identity**: Clear differentiation from other SDD approaches
**Quality**: Decisions justified by principles, not preferences

### This Spec Demonstrates Principles

**Context Economy**: 260 lines, single file, focused scope
**Signal-to-Noise**: Every section informs implementation
**Progressive Disclosure**: Core plan first, details in sections
**Intent Over Implementation**: Clear "why" for each update
**Bridge the Gap**: Readable by humans, actionable by AI

---

**Remember**: Documentation isn't just reference material—it's how we transfer philosophy to users and AI agents. If they understand principles, they don't need rules for every case.
