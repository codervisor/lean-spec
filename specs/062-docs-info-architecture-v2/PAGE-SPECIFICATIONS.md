# Page Specifications

This document contains detailed content specifications for each page in the docs restructure.

## Modified: `guide/understanding.mdx` (Keep title, restructure content)

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

## Keep: `guide/first-principles.mdx` (Extract from current understanding.mdx)

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

## New: `guide/context-engineering.mdx`

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

## New: `guide/ai-agent-memory.mdx`

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

## Modified: `guide/philosophy.mdx`

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

## New: `guide/usage/ai-executable-patterns.mdx`

**Move**: `guide/ai-executable-patterns.mdx` → `guide/usage/ai-executable-patterns.mdx`
**Rename**: "Writing Specs AI Can Execute" → "AI-Executable Patterns"
**Keep**: All 12 patterns content (no changes)

## New: `guide/usage/essential-usage/` (3 pages)

### Page 1: `creating-managing.mdx`

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

### Page 2: `finding-specs.mdx`

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

### Page 3: `spec-structure.mdx`

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

## Sidebar Configuration Changes

### Before
```typescript
guideSidebar: [
  Introduction/,
  Core Concepts/ (3 pages),
  Working with AI/ (5 pages),
  Features/ (4 pages),
  Workflow/ (3 pages),
]
```

### After
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
