---
status: in-progress
created: '2025-11-08'
tags:
  - docs
  - information-architecture
  - ux
  - v0.2.0
priority: high
created_at: '2025-11-08T13:02:31.871Z'
updated_at: '2025-11-08T13:04:23.997Z'
transitions:
  - status: in-progress
    at: '2025-11-08T13:04:23.997Z'
---

# Documentation Information Architecture v2

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-08 · **Tags**: docs, information-architecture, ux, v0.2.0

**Project**: lean-spec  
**Team**: Core Development

## Overview

Restructure docs-site to cleanly separate **WHY (Core Concepts)** from **HOW (Getting Started/Usage)**, eliminate conceptual confusion, and create clear, progressive learning pathways for users.

**Current Problem**: Despite recent improvements (specs 060, 058), the documentation still suffers from:
1. **Mixing too many concepts in "Understanding LeanSpec"**: 5 first principles, mental models, mindset, core beliefs are jumbled together
2. **"Writing Specs AI Can Execute"** is positioned as core concept but it's actually HOW content
3. **"When to Use LeanSpec"** is also HOW (decision framework) but sits in Core Concepts
4. **"Working with AI"** section has redundancy with "Getting Started" and mixes foundational setup with advanced usage
5. **"Features" and "Workflow" are the same category** but artificially separated
6. **Missing standard/basic commands documentation** - create, update, archive, list, search basics aren't clearly documented

**Why This Matters**: Users need a clear mental model:
- **WHY exists (positioning, principles)** → **HOW to get started** → **HOW to use (basic → advanced)**

## Problem

### Current Structure Issues

**Core Concepts Section** (Currently mixing WHY and HOW):
```
Core Concepts/
  - Understanding LeanSpec (5 principles + mental models + mindset + beliefs - TOO MUCH)
  - Writing Specs AI Can Execute (This is HOW, not core concept)
  - When to Use (This is HOW - decision framework)
```

**Working with AI Section** (Redundant and misplaced):
```
Working with AI/
  - index, setup, agents-md, best-practices, examples
  - Overlaps with Getting Started
  - Mixes foundational setup with advanced tips
```

**Features vs Workflow** (Artificial separation):
```
Features/ (templates, frontmatter, custom-fields, variables)
Workflow/ (board-stats, dependencies, validation)
```
- Both are "how to use LeanSpec features"
- Split creates confusion about where to find things
- Missing basic commands (create, update, list, search)

### User Confusion Points

1. **What IS LeanSpec fundamentally?** (positioning/philosophy buried in verbose content)
2. **Why should I use it?** (positioning not clear upfront)
3. **How do I get started?** (split between Getting Started and Working with AI)
4. **How do I use basic commands?** (not clearly documented)
5. **What are advanced features?** (scattered across Features and Workflow)

## Solution

### New Information Architecture

**Principle**: Separate WHY from HOW, progressive disclosure from foundational to advanced.

#### 1. Core Concepts → WHY LeanSpec Exists

**New Structure**:
```
Core Concepts/
  - Understanding LeanSpec (positioning, problem/solution, when to use)
  - First Principles (5 principles with clear examples)
  - Context Engineering (NEW - managing AI working memory)
  - AI Agent Memory (NEW - specs as persistent memory layer)
  - Philosophy & Mindset (beliefs, mental models - references principles)
```

**Changes**:
- **RESTRUCTURE "Understanding LeanSpec"**: Merge positioning + when to use, keep as entry point
- **Keep "First Principles"**: Standalone page with 5 principles and constraints
- **NEW "Context Engineering"**: How LeanSpec manages context for AI agents (link to spec 059)
- **NEW "AI Agent Memory"**: Specs as persistent memory layer for AI agents (semantic memory concept)
- **KEEP "Philosophy & Mindset"**: Beliefs, mental models - references all above concepts
- **REMOVE "Writing Specs AI Can Execute"**: Move to Usage section

#### 2. Working with AI → REMOVE Section

**Rationale**: AI is integrated throughout LeanSpec, not a separate concern.

**Content Migration**:
- Setup content → Merge into "Getting Started" 
- AGENTS.md reference → Keep in Getting Started
- Best practices → Move to new "AI-Assisted Spec Writing" in Usage
- Examples → Distribute to relevant Usage sections

#### 3. Features + Workflow → Unified "Usage" Section

**New Structure**:
```
Usage/
  Essential Usage/
    - Creating & Managing Specs (create, update, archive)
    - Finding Specs (list, search, view)
    - Spec Structure (frontmatter, content sections)
  
  Project Management/
    - Board & Stats (kanban view, analytics)
    - Dependencies (related vs depends_on)
    - Validation & Quality (validate command, complexity analysis)
  
  Advanced Features/
    - Templates (minimal, standard, enterprise)
    - Custom Fields (extending frontmatter)
    - Variables & Configuration
    - Sub-Specs (for complex specs)
  
  AI-Assisted Writing/
    - Writing Specs AI Can Execute (12 patterns - moved from Core Concepts)
    - MCP Integration (setup, usage)
    - Agent Configuration (AGENTS.md)
```

**Changes**:
- **NEW "Essential Usage"**: Fill gap - document create, update, list, search, view basics
- **NEW "Project Management"**: Combine board/stats/deps/validate (formerly "Workflow")
- **NEW "Advanced Features"**: Templates, custom fields, variables (formerly "Features")
- **NEW "AI-Assisted Writing"**: Consolidate all AI-related HOW content
- **Add cross-links to Reference**: Each page links to relevant CLI/Config/Frontmatter reference docs

### Navigation Flow

**Progressive Learning Path**:
```
1. Introduction (Overview → Getting Started)
   ↓
2. Core Concepts (WHY - positioning, principles, philosophy)
   ↓
3. Usage (HOW - basic → project mgmt → advanced → AI)
   ↓
4. Reference (CLI, Config, Frontmatter, MCP API)
```

## Design

### Detailed Page Specifications

#### Modified: `guide/understanding.mdx` (Keep title, restructure content)

**Content Structure**:
```markdown
# Understanding LeanSpec

## The Problem
- Traditional specs fail (too long, too rigid, too formal)
- AI-powered development needs new approach
- Context limits are real constraints

## The LeanSpec Solution
- Specs as executable blueprints for AI agents
- Lightweight, agile, living documentation
- Practical methodology for AI agent memory management

## Core Value Propositions
- Reduced cognitive load (Context Economy)
- AI-executable specifications (Bridge the Gap)
- Living documentation that evolves (Progressive Disclosure)
- Persistent memory layer for AI agents

## When to Use LeanSpec
(Move content from current when-to-use.mdx)
- Write a spec when...
- Skip a spec when...
- Decision framework

## Core Concepts Overview
(Brief intro to First Principles, Context Engineering, AI Agent Memory, Philosophy)
- Link to each detailed page
```

#### Keep: `guide/first-principles.mdx` (Extract from current understanding.mdx)

**Content Structure**:
```markdown
# First Principles

## The Constraints We Discovered
(Keep existing content - Physics, Biology, Economics)

## The Five First Principles
(Keep existing detailed content)
1. Context Economy
2. Signal-to-Noise Maximization
3. Intent Over Implementation
4. Bridge the Gap
5. Progressive Disclosure

## Applying First Principles
(Conflict resolution examples from current doc)
```

#### New: `guide/context-engineering.mdx`

**Content Structure**:
```markdown
# Context Engineering

## What is Context Engineering?
- Managing AI agent working memory constraints
- Strategic approach to fitting specs in context windows
- Practical techniques from spec 059

## Four Core Strategies
(Reference spec 059-programmatic-spec-management/CONTEXT-ENGINEERING.md)
1. Partitioning - Split into sub-specs
2. Compaction - Remove redundancy
3. Compression - Summarize sections
4. Isolation - Separate concerns

## How LeanSpec Applies Context Engineering
- Context Economy principle (fit in working memory)
- <300 lines target, >400 lines warning
- Sub-specs for complex features
- Validation tools detect violations

## Context Failure Modes
- Poisoning, Distraction, Confusion, Clash
- How LeanSpec prevents each

## Links
- See [First Principles](/docs/guide/first-principles) - Context Economy
- See [Validation](/docs/guide/usage/project-management/validation) - Complexity analysis
- See [CLI Reference](/docs/reference/cli) - validate command
```

#### New: `guide/ai-agent-memory.mdx`

**Content Structure**:
```markdown
# AI Agent Memory

## Specs as Persistent Memory
- AI agents need memory beyond conversation context
- LeanSpec specs serve as persistent memory layer
- Semantic memory for AI agents (facts, decisions, context)

## Types of Memory (from LangChain research)
1. **Procedural Memory**: How to perform tasks (AGENTS.md, system prompts)
2. **Semantic Memory**: Facts about the world (THIS IS WHERE SPECS FIT)
3. **Episodic Memory**: Past actions and sequences (git history, transitions)

## LeanSpec as Semantic Memory
- Specs store decisions, rationale, constraints
- MCP server provides memory retrieval for AI assistants
- Search/filter enables targeted memory access
- Frontmatter enables structured memory queries

## Benefits for AI Agents
- Persistent context across sessions
- Searchable knowledge base
- Structured decision history
- Reduced need for repeated explanations

## Integration with AI Tools
- MCP server for Claude Desktop, Cline, etc.
- Direct spec access in AI chat context
- Search and filter capabilities
- See [MCP Integration](/docs/guide/usage/ai-assisted/mcp-integration)

## Research Foundation
- LangChain article on agent memory (link)
- Semantic memory for agents
- Persistent knowledge management

## Links
- See [Understanding LeanSpec](/docs/guide/understanding) - Core concepts
- See [MCP Server Reference](/docs/reference/mcp-server) - API details
- See [AI-Assisted Writing](/docs/guide/usage/ai-assisted/ai-executable-patterns) - How to write
```

#### Modified: `guide/philosophy.mdx`

**Content Structure**:
```markdown
# Philosophy & Mindset

(Link to First Principles, Context Engineering, AI Agent Memory as foundation)

## Core Beliefs
(Extract from current understanding.mdx)
- Specs should guide, not constrain
- Start small, grow as needed
- Living documentation
- Specs are memory, not just documents

## Mental Models
(Extract from current understanding.mdx)
- Specs as communication tools (human-human)
- Specs as context management (human-AI)
- Specs as persistent memory (AI agents)
- Progressive disclosure in practice
- Agile principles alignment

## The LeanSpec Mindset
(Keep existing mindset content + integrate memory concept)
```

#### New: `guide/usage/ai-executable-patterns.mdx`

**Move**: `guide/ai-executable-patterns.mdx` → `guide/usage/ai-executable-patterns.mdx`
**Rename**: "Writing Specs AI Can Execute" → "AI-Executable Patterns"
**Keep**: All 12 patterns content (no changes)

#### New: `guide/usage/essential-usage/` (3 pages)

**Page 1: `creating-managing.mdx`**:
```markdown
# Creating & Managing Specs

## Creating Specs
- lean-spec create <name>
- Template selection
- Initial structure
- See [CLI Reference: create](/docs/reference/cli#create)

## Updating Specs
- lean-spec update --status
- lean-spec update --priority
- lean-spec update --tags
- lean-spec update --assignee
- See [CLI Reference: update](/docs/reference/cli#update)

## Managing Lifecycle
- lean-spec archive
- Status transitions
- See [Frontmatter Reference](/docs/reference/frontmatter)
```

**Page 2: `finding-specs.mdx`**:
```markdown
# Finding Specs

## Listing Specs
- lean-spec list (with filters)
- Filtering by status, priority, tags
- See [CLI Reference: list](/docs/reference/cli#list)

## Searching
- lean-spec search (full-text)
- Search strategies
- See [CLI Reference: search](/docs/reference/cli#search)

## Viewing
- lean-spec view (formatted)
- lean-spec view --raw (markdown)
- lean-spec view --json (structured)
- See [CLI Reference: view](/docs/reference/cli#view)
```

**Page 3: `spec-structure.mdx`**:
```markdown
# Spec Structure

## Frontmatter Fields
- System-managed vs manual
- Status, priority, tags, etc.
- See [Frontmatter Reference](/docs/reference/frontmatter)

## Content Sections
- Problem, Solution, Success Criteria
- Optional sections
- See [AI-Executable Patterns](/docs/guide/usage/ai-assisted/ai-executable-patterns)

## Metadata Management
- Never manually edit system-managed fields
- Use lean-spec update commands
- See [Configuration Reference](/docs/reference/config)
```

### Sidebar Configuration Changes

**Before**:
```typescript
guideSidebar: [
  Introduction/,
  Core Concepts/ (3 pages),
  Working with AI/ (5 pages),
  Features/ (4 pages),
  Workflow/ (3 pages),
]
```

**After**:
```typescript
guideSidebar: [
  Introduction/ (Overview, Getting Started),
  Core Concepts/ (Understanding, First Principles, Context Engineering, AI Agent Memory, Philosophy),
  Usage/ {
    Essential Usage/ (3 pages),
    Project Management/ (3 pages),
    Advanced Features/ (4 pages),
    AI-Assisted/ (3 pages)
  },
]
```

## Plan

### Phase 1: Core Concepts Restructure (WHY)

- [ ] Restructure `guide/understanding.mdx` (KEEP as entry point)
  - [ ] Merge positioning + "When to Use" content from `when-to-use.mdx`
  - [ ] Add problem/solution overview
  - [ ] Add decision framework
  - [ ] Add Core Concepts overview with links
- [ ] Extract `guide/first-principles.mdx` from understanding.mdx
  - [ ] Keep constraints and 5 principles sections
  - [ ] Remove mindset/beliefs content (move to philosophy)
  - [ ] Keep conflict resolution examples
- [ ] Create `guide/context-engineering.mdx` (NEW)
  - [ ] Reference spec 059 CONTEXT-ENGINEERING.md
  - [ ] Explain 4 strategies and 4 failure modes
  - [ ] Show how LeanSpec applies context engineering
  - [ ] Link to First Principles (Context Economy)
- [ ] Create `guide/ai-agent-memory.mdx` (NEW)
  - [ ] Explain specs as persistent memory layer
  - [ ] Reference LangChain article on agent memory
  - [ ] Connect to semantic memory concept
  - [ ] Show MCP integration for memory retrieval
- [ ] Update `guide/philosophy.mdx`
  - [ ] Extract mindset/beliefs from old understanding.mdx
  - [ ] Add links to First Principles, Context Engineering, AI Agent Memory
  - [ ] Integrate memory concept into mental models
  - [ ] Structure: Beliefs → Mental Models → Mindset

### Phase 2: Remove "Working with AI" Section

- [ ] Merge AI setup into Getting Started
  - [ ] Update `guide/getting-started.mdx` with MCP setup
  - [ ] Add AGENTS.md reference
  - [ ] Keep setup concise
- [ ] Migrate AI best practices content
  - [ ] Will move to new `usage/ai-assisted/` section in Phase 4
- [ ] Delete `guide/ai/` directory after migration complete

### Phase 3: Create Usage Section Structure

- [ ] Create `guide/usage/` directory structure
  - [ ] `basic-commands/`
  - [ ] `project-management/`
  - [ ] `advanced-features/`
  - [ ] `ai-assisted/`

### Phase 4: Essential Usage (New Content)

- [ ] Create `guide/usage/essential-usage/creating-managing.mdx`
  - [ ] Document create, update, archive commands
  - [ ] Include examples and common workflows
  - [ ] Add cross-links to CLI Reference
- [ ] Create `guide/usage/essential-usage/finding-specs.mdx`
  - [ ] Document list, search, view commands
  - [ ] Show filtering and querying examples
  - [ ] Add cross-links to CLI Reference
- [ ] Create `guide/usage/essential-usage/spec-structure.mdx`
  - [ ] Explain frontmatter fields
  - [ ] Document content section conventions
  - [ ] Metadata management best practices
  - [ ] Add cross-links to Frontmatter Reference and Config Reference

### Phase 5: Project Management (Rename Workflow)

- [ ] Move `guide/board-stats.mdx` → `guide/usage/project-management/board-stats.mdx`
- [ ] Move `guide/dependencies.mdx` → `guide/usage/project-management/dependencies.mdx`
- [ ] Move `guide/validation.mdx` → `guide/usage/project-management/validation.mdx`
- [ ] Add index page `guide/usage/project-management/index.mdx`

### Phase 6: Advanced Features (Rename Features)

- [ ] Move `guide/templates.mdx` → `guide/usage/advanced-features/templates.mdx`
- [ ] Move `guide/custom-fields.mdx` → `guide/usage/advanced-features/custom-fields.mdx`
- [ ] Move `guide/variables.mdx` → `guide/usage/advanced-features/variables.mdx`
- [ ] Move `guide/frontmatter.mdx` → `guide/usage/advanced-features/frontmatter.mdx`
- [ ] Add sub-specs documentation (if not exists)

### Phase 7: AI-Assisted Writing

- [ ] Move `guide/ai-executable-patterns.mdx` → `guide/usage/ai-assisted/ai-executable-patterns.mdx`
- [ ] Create `guide/usage/ai-assisted/mcp-integration.mdx`
  - [ ] MCP server setup (migrate from guide/ai/setup.mdx)
  - [ ] Usage examples
  - [ ] Troubleshooting
- [ ] Create `guide/usage/ai-assisted/agent-configuration.mdx`
  - [ ] AGENTS.md explanation
  - [ ] Configuration examples
  - [ ] Best practices (migrate from guide/ai/best-practices.mdx)

### Phase 8: Update Navigation (sidebars.ts)

- [ ] Update `docs-site/sidebars.ts`
  - [ ] Restructure Core Concepts section
  - [ ] Remove "Working with AI" section
  - [ ] Remove "Features" and "Workflow" sections
  - [ ] Add new "Usage" section with 4 subcategories
  - [ ] Update all item paths

### Phase 9: Update Cross-References

- [ ] Update all internal links in documentation
  - [ ] Fix links to moved pages
  - [ ] Update "Working with AI" references
  - [ ] Update "Features" and "Workflow" references
- [ ] Update Getting Started links
- [ ] Update Overview page links

### Phase 10: Cleanup

- [ ] Delete old files
  - [ ] `guide/when-to-use.mdx` (content merged into understanding.mdx)
  - [ ] `guide/ai/` directory (all content migrated)
- [ ] Delete empty directories
- [ ] Remove old sections from sidebars.ts

### Phase 11: Testing & Validation

- [ ] Build docs-site: `cd docs-site && npm run build`
- [ ] Verify no broken links
- [ ] Check navigation flow
- [ ] Test all cross-references
- [ ] Validate search functionality
- [ ] Review on mobile/desktop

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
