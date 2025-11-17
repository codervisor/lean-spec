---
status: planned
created: '2025-11-17'
tags: []
priority: high
created_at: '2025-11-17T02:09:38.041Z'
updated_at: '2025-11-17T02:58:35.396Z'
transitions:
  - status: in-progress
    at: '2025-11-17T02:10:38.350Z'
  - status: complete
    at: '2025-11-17T02:10:43.845Z'
  - status: planned
    at: '2025-11-17T02:58:35.396Z'
completed_at: '2025-11-17T02:10:43.845Z'
completed: '2025-11-17'
---

# Core Concepts: Real SDD Terminology Only

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

## Overview

Users report that the current "Core Concepts" section in docs-site contains philosophy and principles rather than actual terminology definitions. This creates confusion for newcomers trying to understand SDD basics.

**Problem**: Current Core Concepts mixes:
- Philosophical principles (first principles, progressive disclosure)
- Process guidance (workflow, decision-making)
- Actual SDD terminology (specs, tokens, context)

**Goal**: Restructure Core Concepts to be a **glossary of essential SDD terms** only:
- **Spec**: What is a specification in SDD context
- **Context**: What context means (human + AI working memory)
- **Tokens**: Why tokens matter for AI + human cognition
- **Agent**: AI agents in SDD workflow
- **Status**: Spec lifecycle states
- **Dependencies**: Relationship between specs
- Other concrete terms users encounter when using LeanSpec

**Non-Goals**: 
- Philosophy content → move to "Philosophy & Principles" section
- Workflow guidance → move to tutorials/guides
- Decision frameworks → keep in methodology docs

## Design

**Restructure Core Concepts as a terminology glossary with definitions only.**

Each concept entry should:
1. **Definition**: What it is (1-2 sentences)
2. **Why it matters**: Practical importance for SDD
3. **Example**: Concrete example from LeanSpec usage
4. **Related**: Links to deeper explanations

**Priority order for inclusion**:
1. Terms users encounter in first 5 minutes (spec, status, tokens)
2. Terms in CLI/UI (tags, priority, dependencies)
3. SDD methodology terms (context, agent, signal-to-noise)
4. Advanced concepts (progressive disclosure, templates)

**Content reorganization**:
- Philosophy → New "Philosophy & Principles" section
- Workflow → Move to step-by-step tutorials (spec 089)
- Decision frameworks → Keep in "Methodology" docs

**Term structure template**:
```markdown
### [Term Name]

**Definition**: [One sentence explanation]

**Why it matters**: [Practical importance in SDD workflow]

**Example**: 
[Concrete example from LeanSpec usage]

**See also**: [Links to related concepts or deeper docs]
```

## Plan

- [ ] Audit current Core Concepts docs - identify what's philosophy vs terminology
- [ ] Create list of essential SDD terms users encounter
- [ ] Write clean definitions for each term (using template)
- [ ] Create new "Philosophy & Principles" section in docs
- [ ] Move philosophical content to new section
- [ ] Update navigation/sidebar in docs-site
- [ ] Verify all cross-references still work

## Test

- [ ] New user can find definition of any term they encounter in first use
- [ ] Each term has clear, concise definition (no philosophy/principles mixed in)
- [ ] Examples are concrete and actionable
- [ ] Philosophy content successfully moved to separate section
- [ ] All internal doc links still work after reorganization

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
