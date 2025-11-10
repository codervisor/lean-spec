---
status: complete
created: '2025-11-08'
tags:
  - docs
  - information-architecture
  - ux
  - v0.2.0
priority: high
created_at: '2025-11-08T13:02:31.871Z'
updated_at: '2025-11-10T07:12:35.179Z'
transitions:
  - status: in-progress
    at: '2025-11-08T13:04:23.997Z'
  - status: complete
    at: '2025-11-10T07:12:35.179Z'
completed_at: '2025-11-10T07:12:35.179Z'
completed: '2025-11-10'
---

# Documentation Information Architecture v2

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-08 · **Tags**: docs, information-architecture, ux, v0.2.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

Restructure docs-site to cleanly separate **WHY (Core Concepts)** from **HOW (Getting Started/Usage)**, eliminate conceptual confusion, and create clear, progressive learning pathways for users.

**Current Problem**: Documentation mixes WHY and HOW, lacks clear basic commands documentation, and has redundant/misplaced sections.

**Solution**: Restructure with clear separation - Core Concepts (WHY) → Usage (HOW with progressive disclosure: basic → advanced).

**Why This Matters**: Users need a clear mental model for learning and using LeanSpec effectively.

## Summary

**Key Changes:**
1. **Core Concepts** - Pure WHY (positioning, principles, philosophy) + new Context Engineering and AI Agent Memory pages
2. **Remove "Working with AI"** - Integrate throughout (setup in Getting Started, usage in new AI-Assisted section)
3. **Unified Usage Section** - Merge Features + Workflow, add missing Essential Usage docs, organize progressively
4. **Navigation Flow** - Intro → Core Concepts → Usage (basic → project mgmt → advanced → AI) → Reference

**Result**: Clear progressive learning path, comprehensive basic commands documentation, no confusion about where to find information.

## Details

See sub-specs for comprehensive design:

- **[PROBLEM-ANALYSIS.md](./PROBLEM-ANALYSIS.md)** - Current structure issues and user confusion points
- **[SOLUTION-DESIGN.md](./SOLUTION-DESIGN.md)** - New information architecture and navigation flow
- **[PAGE-SPECIFICATIONS.md](./PAGE-SPECIFICATIONS.md)** - Detailed page content specifications
- **[IMPLEMENTATION-PLAN.md](./IMPLEMENTATION-PLAN.md)** - 11-phase implementation plan with tasks

## Test

### Success Criteria

#### Structure & Navigation
- [ ] Core Concepts has 5 pages: Understanding, First Principles, Context Engineering, AI Agent Memory, Philosophy
- [ ] "Working with AI" section removed
- [ ] Usage section exists with 4 subcategories
- [ ] Essential Usage documented (create, update, list, search)
- [ ] No "Features" or "Workflow" sections (merged into Usage)
- [ ] Clear progressive learning path: Intro → Understanding → Core Concepts → Usage → Reference
- [ ] Cross-links to Reference pages present throughout Usage section

#### Content Quality
- [ ] "Understanding LeanSpec" clearly positions the methodology
- [ ] First Principles standalone and comprehensive
- [ ] Context Engineering explains LeanSpec's approach to managing AI context
- [ ] AI Agent Memory connects specs to semantic memory concept
- [ ] Philosophy references all foundational concepts
- [ ] No redundancy between sections
- [ ] AI setup integrated in Getting Started
- [ ] All 12 patterns preserved in new location
- [ ] Cross-links to Reference pages work correctly

#### Completeness
- [ ] Essential usage comprehensively documented with Reference cross-links
- [ ] Project management features grouped logically
- [ ] Advanced features clearly marked as such
- [ ] AI-assisted content consolidated (patterns + MCP + agents)
- [ ] Context Engineering properly documented with spec 059 references
- [ ] AI Agent Memory properly documented with LangChain references
- [ ] All previous content accounted for (nothing lost)

#### Technical
- [ ] Build succeeds: `cd docs-site && npm run build`
- [ ] No broken internal links
- [ ] No 404 errors
- [ ] Search works correctly
- [ ] Mobile/desktop rendering correct

#### User Experience
- [ ] Clear separation of WHY (concepts) vs HOW (usage)
- [ ] Progressive disclosure: basic → advanced
- [ ] No confusion about where to find information
- [ ] Natural learning flow

### Validation Commands

```bash
# Build docs site
cd docs-site && npm run build

# Validate specs
cd .. && npx lean-spec validate

# Check for broken links (if link checker available)
# npm run check-links
```

## Notes

### Key Design Decisions

**1. Why keep "Understanding LeanSpec" as entry point but add Context Engineering + AI Agent Memory?**
- "Understanding LeanSpec" is more informative than abrupt "Why LeanSpec"
- Users need quick overview before diving into detailed concepts
- Context Engineering coherently links to spec 059 and Context Economy principle
- AI Agent Memory connects to broader research (LangChain) and positions specs as persistent memory
- Each concept gets dedicated page for depth

**2. Why remove "Working with AI" section?**
- AI is not optional add-on, it's core to LeanSpec
- Setup belongs in Getting Started (everyone needs it)
- Patterns/best practices belong in Usage (how to use)
- Having separate section implies AI is secondary concern

**3. Why merge Features + Workflow into Usage?**
- Both are "how to use LeanSpec features"
- Artificial separation confuses users
- New structure is progressive: Basic → Project Mgmt → Advanced → AI
- Natural learning progression

**4. Why "Essential Usage" instead of "Basic Commands"?**
- "Essential" is more accurate - these are core operations, not just "basic"
- Covers both commands AND concepts (spec structure, frontmatter)
- Better conveys importance to new users
- Each page includes cross-links to detailed Reference documentation
- Critical gap filled - fundamental operations clearly documented

### Content Migration Map

```
OLD LOCATION                          → NEW LOCATION
================================================================
guide/understanding.mdx               → Split & Restructure:
  - Positioning + Problem/Solution    → guide/understanding.mdx (keep, restructure)
  - Constraints + 5 Principles        → guide/first-principles.mdx (extract)
  - Mindset + Beliefs                 → guide/philosophy.mdx (extract)

guide/when-to-use.mdx                 → guide/understanding.mdx (merge into)

(NEW - from spec 059)                 → guide/context-engineering.mdx
(NEW - from research)                 → guide/ai-agent-memory.mdx

guide/ai-executable-patterns.mdx      → guide/usage/ai-assisted/ai-executable-patterns.mdx

guide/ai/setup.mdx                    → Split:
  - Setup basics                      → guide/getting-started.mdx (merged)
  - MCP details                       → guide/usage/ai-assisted/mcp-integration.mdx

guide/ai/best-practices.mdx           → guide/usage/ai-assisted/agent-configuration.mdx (merged)

guide/ai/agents-md.mdx                → guide/usage/ai-assisted/agent-configuration.mdx (merged)

guide/ai/examples.mdx                 → Distribute to relevant sections

guide/templates.mdx                   → guide/usage/advanced-features/templates.mdx
guide/custom-fields.mdx               → guide/usage/advanced-features/custom-fields.mdx
guide/variables.mdx                   → guide/usage/advanced-features/variables.mdx
guide/frontmatter.mdx                 → guide/usage/advanced-features/frontmatter.mdx

guide/board-stats.mdx                 → guide/usage/project-management/board-stats.mdx
guide/dependencies.mdx                → guide/usage/project-management/dependencies.mdx
guide/validation.mdx                  → guide/usage/project-management/validation.mdx

(NEW)                                 → guide/usage/essential-usage/creating-managing.mdx
(NEW)                                 → guide/usage/essential-usage/finding-specs.mdx
(NEW)                                 → guide/usage/essential-usage/spec-structure.mdx
```

### Estimated Effort

- **Phase 1-2 (Core Concepts + new pages)**: 4-5 hours
- **Phase 3-7 (Usage)**: 5-6 hours
- **Phase 8-11 (Navigation + Testing)**: 2-3 hours
- **Total**: 11-14 hours over 2-3 days

### Research Sources

**Context Engineering**:
- Spec 059: Programmatic Spec Management & Context Engineering
- Spec 059/CONTEXT-ENGINEERING.md: Deep dive on strategies and failure modes
- Anthropic: [Effective Context Engineering for AI Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- LangChain: [Context Engineering for Agents](https://blog.langchain.com/context-engineering-for-agents/)
- Drew Breunig: [How Contexts Fail and How to Fix Them](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html)

**AI Agent Memory**:
- LangChain: [Memory for Agents](https://blog.langchain.com/memory-for-agents/)
- CoALA paper: [Cognitive Architectures for Language Agents](https://arxiv.org/pdf/2309.02427)
- Key insight: Specs serve as **semantic memory** (long-term knowledge store) for AI agents
- MCP integration enables memory retrieval in AI chat context

### Related Specs

- **Spec 060**: Core Concepts Coherence (created 12 patterns approach)
- **Spec 059**: Programmatic Spec Management & Context Engineering (source for Context Engineering concept)
- **Spec 058**: Comprehensive docs restructure (previous iteration)
- **Spec 049**: LeanSpec First Principles (foundation for First Principles page)
- **Spec 043**: v0.2.0 launch (this blocks launch)

### Trade-offs

**Lose**:
- Separate "Working with AI" navigation entry
- "Features" and "Workflow" as distinct categories

**Gain**:
- Crystal clear WHY vs HOW separation
- Progressive learning path
- No redundancy or confusion
- Comprehensive basic commands docs
- Logical feature grouping (basic → advanced)

**5. Why add Context Engineering and AI Agent Memory as core concepts?**
- Both are fundamental to understanding LeanSpec's innovation
- Context Engineering: Connects to spec 059, explains practical application of Context Economy
- AI Agent Memory: Positions specs as persistent memory layer (research-backed from LangChain)
- Both coherently link to First Principles and differentiate LeanSpec from traditional approaches
- Elevates discussion from "how to write specs" to "how AI agents use specs"

**6. Why add cross-links to Reference pages throughout Usage?**
- Reduces redundancy - Usage guides the "what/why", Reference documents the "how/details"
- Users can quickly jump to detailed API/config documentation
- Maintains clear separation between guidance and reference material
- Follows documentation best practices (guide → reference pattern)

**Rationale**: Users need clear mental models. WHY (positioning/principles) vs HOW (usage) is the fundamental distinction. Context Engineering and AI Agent Memory strengthen the WHY by connecting to research and implementation. Cross-linking creates cohesive documentation. Everything else flows from that.
