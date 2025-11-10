# Implementation Guide

> **Note**: This file exceeds 400 lines intentionally. It contains detailed implementation specifications, content templates, code examples, and checklists. These are reference materials meant to be consulted section-by-section, not read sequentially. The length provides comprehensive guidance for implementation.

This document contains detailed implementation specifications for each content change.

## First Principles Document

**File**: `docs-site/docs/guide/first-principles.mdx`

**Content Source**: Spec 049 (FIRST-PRINCIPLES.md)

**Structure**:

Frontmatter:
- id: 'first-principles'
- title: 'First Principles'
- sidebar_position: 1

Content sections:

# First Principles

> LeanSpec isn't arbitrary rules—it's derived from fundamental constraints.

## Why First Principles?

[Explain what first principles are and why they matter]

## The 5 First Principles

### 1. Context Economy
**Specs must fit in working memory—both human and AI.**

- **Target**: <300 lines per spec file
- **Warning**: 300-400 lines (consider simplifying)
- **Problem**: >400 lines (must split)
- **Rationale**: 
  - Physics: AI context windows are bounded (~20K effective tokens)
  - Biology: Human working memory is limited (7±2 items)
  - Economics: Large contexts cost more time and money

**Question**: "Can this be read in 5-10 minutes?"
**Action**: Split at 400 lines, warning at 300

### 2. Signal-to-Noise Maximization
**Every word must inform decisions or be cut.**

- **Test**: "What decision does this sentence inform?"
- **Cut**: Obvious, inferable, or "maybe future" content
- **Keep**: Decision rationale, constraints, success criteria

**Question**: "Does this add clarity?"
**Action**: Remove anything that doesn't answer the test question

### 3. Intent Over Implementation
**Capture "why" and "what," let "how" emerge.**

- **Must have**: Problem, intent, success criteria
- **Should have**: Design rationale, trade-offs
- **Could have**: Implementation details, examples

**Question**: "Is the rationale clear?"
**Action**: Explain trade-offs, constraints, success criteria

### 4. Bridge the Gap
**Specs exist to align human intent with machine execution.**

- **For humans**: Overview, context, rationale
- **For AI**: Unambiguous requirements, clear structure, examples
- **Both must understand**: Use clear structure + natural language

**Question**: "Can both parse and reason about this?"
**Action**: Clear structure + natural language explanation

### 5. Progressive Disclosure
**Start simple, add structure only when pain is felt.**

- **Solo dev**: Just status + created
- **Feel pain?**: Add tags, priority, custom fields
- **Never add**: "Just in case" features

**Question**: "Do we need this now?"
**Action**: Start minimal, add fields when required

## Conflict Resolution Framework

When practices conflict, apply principles in priority order:

**Priority Order**:
1. Context Economy
2. Signal-to-Noise
3. Intent Over Implementation
4. Bridge the Gap
5. Progressive Disclosure

**Examples**:

**"Should I split this 450-line spec?"**
→ **Yes** (Context Economy at 400 lines overrides completeness)

**"Should I document every edge case?"**
→ **Only if it informs current decisions** (Signal-to-Noise test)

**"Should I add custom fields upfront?"**
→ **Only if you feel pain without them** (Progressive Disclosure)

**"This spec is complex but under 350 lines, split it?"**
→ **No** (Under Context Economy threshold, no split needed)

## Applying First Principles

[Examples of applying principles to real decisions]

## Learning More

- **[Philosophy](/docs/guide/philosophy)** - How to apply first principles day-to-day
- **[Agile Principles](/docs/guide/principles)** - Practical guidelines for writing specs
- **[Spec 049](https://github.com/codervisor/lean-spec/tree/main/specs/049-leanspec-first-principles)** - Full analysis and derivation

**Adaptations for Docusaurus**:
- Use Docusaurus admonitions (`:::tip`, `:::info`, `:::warning`)
- Add frontmatter with sidebar position
- Link to other docs pages
- Format for web readability (shorter paragraphs, more headings)

## Philosophy Update

**File**: `docs-site/docs/guide/philosophy.mdx`

**Key Changes**:

Frontmatter:
- id: 'philosophy'
- title: 'Philosophy'
- sidebar_position: 2

Content updates:

# Philosophy

> "The best spec is the one that gets read, understood, and acted upon—by humans and AI alike."

LeanSpec philosophy derives from **[5 first principles](/docs/guide/first-principles)** (Context Economy, Signal-to-Noise, Intent Over Implementation, Bridge the Gap, Progressive Disclosure).

:::tip Start Here
New to LeanSpec? Start with **[First Principles](/docs/guide/first-principles)** to understand the foundational constraints. Then come back here to understand the philosophy and mindset.
:::

## The Core Philosophy

[Keep existing content but add explicit derivation]

### 1. Documentation is a Means, Not an End
**Derives from**: Signal-to-Noise Maximization

The goal isn't to create comprehensive documentation. The goal is to **enable effective action**.

[rest of content...]

### 2. Context Beats Comprehensiveness
**Derives from**: Intent Over Implementation

Capturing **why** something matters is more valuable than exhaustively documenting **what** it is.

[rest of content...]

### 3. Specs Should Reduce Burden, Not Create It
**Derives from**: Context Economy

Traditional specs often become a burden...

[rest of content...]

### 4. AI Changes Everything
**Derives from**: Bridge the Gap

In the era of AI-assisted development...

[rest of content...]

## AI Integration Migration

**File Structure**:
- `guide/ai-setup.mdx` (comprehensive setup guide)
- `guide/ai-best-practices.mdx` (tips and patterns)
- `guide/ai-examples.mdx` (real-world examples)

**`guide/ai-setup.mdx` Structure**:

Frontmatter:
- id: 'ai-setup'
- title: 'AI Integration Setup'
- sidebar_position: 7

Content sections:

# AI Integration Setup

LeanSpec is designed from the ground up to work seamlessly with AI coding agents.

## Why AI Integration Matters

[Content from ai-integration/index.mdx]

## Integration Methods

### 1. System Prompts (AGENTS.md)
[Content from ai-integration/agents-md.mdx + setup.mdx]

### 2. MCP Server
[Brief intro, link to Reference for full API]

### 3. Repository Context
[Content from existing docs]

## Setup Steps

[Step-by-step setup from ai-integration/setup.mdx]

## Troubleshooting

[Common issues and solutions]

## Next Steps

- **[Best Practices](/docs/guide/ai-best-practices)** - Tips for effective AI integration
- **[Examples](/docs/guide/ai-examples)** - Real-world workflows
- **[MCP Server API](/docs/reference/mcp-server)** - Full MCP reference

## MCP Server Reference

**File**: `docs-site/docs/reference/mcp-server.mdx`

**Content Source**: `docs/MCP-SERVER.md` (more comprehensive than current docs-site)

**Structure**:

Frontmatter:
- id: 'mcp-server'
- title: 'MCP Server API'
- sidebar_position: 4

Content sections:

# MCP Server API

Complete reference for the LeanSpec Model Context Protocol (MCP) server.

## Overview

[What is MCP, what does LeanSpec MCP provide]

## Tools

[Complete tool reference from docs/MCP-SERVER.md]

## Resources

[Resource reference]

## Prompts

[Prompt templates]

## Configuration

### VS Code (GitHub Copilot)
[Detailed setup with examples]

### Claude Desktop
[Detailed setup with examples]

### Other Clients
[Generic setup instructions]

## Troubleshooting

[Comprehensive troubleshooting from docs/MCP-SERVER.md]

## Security Considerations

[Security notes from docs/MCP-SERVER.md]

## API Details

[Technical API details]

## Workflow Section

**New Files**:

### 1. `guide/board-stats.mdx`

Frontmatter:
- id: 'board-stats'
- title: 'Board & Stats'
- sidebar_position: 11

Content sections:

# Board & Stats

Project visibility and health monitoring with LeanSpec.

## Board View

The `lean-spec board` command provides a Kanban-style view of your specs:

```bash
lean-spec board
```

Shows specs organized by status:
- **Planned**: Specs not yet started
- **In Progress**: Active work
- **Complete**: Finished specs
- **Archived**: Historical specs

**Use cases**:
- Daily standup visibility
- Sprint planning
- Identifying bottlenecks
- Team coordination

## Stats

The `lean-spec stats` command provides project metrics:

```bash
lean-spec stats
```

Shows:
- Total specs by status
- Completion rate
- Average spec size
- Distribution by priority/tags

**Use cases**:
- Project health checks
- Identifying trends
- Planning capacity
- Reporting progress

## Workflows

### Daily Workflow
1. Run `lean-spec board` to see current state
2. Update spec status as you work
3. Review stats weekly

### Team Workflow
1. Board in standup meetings
2. Stats for retrospectives
3. Track velocity over time

## Tips

- Update status early and often
- Use stats to identify patterns
- Archive completed work regularly

### 2. `guide/dependencies.mdx`

Frontmatter:
- id: 'dependencies'
- title: 'Dependencies'
- sidebar_position: 12

Content sections:

# Dependencies

Managing spec relationships and dependencies.

## Understanding Relationships

LeanSpec has two types of relationships:

### `related` - Bidirectional Soft Reference

**Meaning**: Informational relationship between specs (they're related/connected)

**Behavior**: Automatically shown from both sides

**Example**:
```yaml
# Spec 042
related: [043]

# Spec 043 doesn't need to list 042
```

Both specs will show the relationship.

**Use when:**
- Specs cover related topics
- Work is coordinated but not blocking
- Context is helpful but not required

### `depends_on` - Directional Blocking Dependency

**Meaning**: Hard dependency - spec cannot start until dependencies complete

**Behavior**: Directional only

**Example**:
```yaml
# Spec A
depends_on: [spec-b]
```

**Use when:**
- Spec truly cannot start until another completes
- There's a clear dependency chain
- Work must be done in specific order

## Using deps Command

View spec relationships:

```bash
lean-spec deps <spec>
```

Shows:
- Dependencies (what this spec depends on)
- Blocks (what this spec blocks)
- Related specs

## Best Practices

1. **Use `related` by default** - It's simpler and matches most use cases
2. **Reserve `depends_on` for true blocking dependencies**
3. **Update once, show everywhere** - `related` only needs to be in one spec
4. **Check dependencies** - Run `lean-spec deps` to see all relationships

## Patterns

### Feature Dependencies
```yaml
# Spec B depends on Spec A
depends_on: [spec-a]
```

### Related Features
```yaml
# Both specs work on same area
related: [other-spec]
```

### Complex Dependencies
```yaml
# Multiple dependencies
depends_on: [spec-a, spec-b]
related: [spec-c, spec-d]

### 3. `guide/validation.mdx`

Frontmatter:
- id: 'validation'
- title: 'Validation'
- sidebar_position: 13

Content sections:

# Validation

Quality checks and complexity analysis.

## Validate Command

Check specs for quality issues:

```bash
lean-spec validate
```

Validates all specs by default. Check specific specs:

```bash
lean-spec validate <spec-1> <spec-2>
```

## Quality Checks

### Line Count
- **Warning**: Specs over 300 lines
- **Error**: Specs over 400 lines
- **Rationale**: Context Economy principle

### Sub-Spec Validation
- Checks sub-spec files (DESIGN.md, etc.)
- Ensures sub-specs also follow line limits

### Frontmatter Validation
- Required fields present
- Valid values for status, priority
- Proper date formats

## Complexity Analysis

Validation detects:
- Overly long specs (Context Economy violation)
- Missing required frontmatter
- Invalid frontmatter values
- Sub-specs that need splitting

## Workflows

### Pre-Commit Check
```bash
lean-spec validate
```

### CI/CD Integration
```yaml
# .github/workflows/validate.yml
- name: Validate Specs
  run: npx lean-spec validate
```

### Regular Review
```bash
# Weekly spec health check
lean-spec validate --max-lines 300
```

## Best Practices

1. **Validate early** - Before committing
2. **Fix warnings** - Don't let them accumulate
3. **Split when needed** - Use sub-specs at 400 lines
4. **Automate** - Add to CI/CD pipeline

## Tips

- Use `--max-lines` to set custom thresholds
- Validate after major changes
- Keep specs under 300 lines ideally
- Split complex specs using spec 012 pattern

## Content Migration Checklist

### From `docs/` to docs-site

- [ ] Migrate `docs/MCP-SERVER.md` → `docs-site/docs/reference/mcp-server.mdx`
  - [ ] Copy comprehensive setup instructions
  - [ ] Copy troubleshooting section
  - [ ] Copy security considerations
  - [ ] Format for Docusaurus
  - [ ] Test all code examples

- [ ] Migrate `docs/MIGRATION.md` → `docs-site/docs/guide/migration.mdx`
  - [ ] Copy migration guides
  - [ ] Format for Docusaurus
  - [ ] Add navigation links

- [ ] Merge `docs/examples/CUSTOM-FIELDS-GUIDE.md` → `docs-site/docs/guide/custom-fields.mdx`
  - [ ] Copy examples
  - [ ] Copy config snippets
  - [ ] Integrate with existing content

- [ ] Deprecate `docs/` folder
  - [ ] Create `docs/README.md` with redirect message
  - [ ] Keep folder for backwards compatibility

### Within docs-site

- [ ] Move `ai-integration/index.mdx` → `guide/ai-setup.mdx`
- [ ] Merge `ai-integration/setup.mdx` into `guide/ai-setup.mdx`
- [ ] Move `ai-integration/best-practices.mdx` → `guide/ai-best-practices.mdx`
- [ ] Move `ai-integration/examples.mdx` → `guide/ai-examples.mdx`
- [ ] Incorporate `ai-integration/agents-md.mdx` into `guide/ai-setup.mdx`
- [ ] Update all internal links (`/docs/ai-integration/` → `/docs/guide/`)
- [ ] Delete `docs-site/docs/ai-integration/` directory

## Link Update Strategy

### Find and Replace

```bash
# Update all references
grep -r "/docs/ai-integration/" docs-site/docs/
# Replace with /docs/guide/
```

### Redirect Configuration

Add to `docusaurus.config.ts`:

```typescript
plugins: [
  [
    '@docusaurus/plugin-client-redirects',
    {
      redirects: [
        {
          from: '/docs/ai-integration/setup',
          to: '/docs/guide/ai-setup',
        },
        {
          from: '/docs/ai-integration/best-practices',
          to: '/docs/guide/ai-best-practices',
        },
        {
          from: '/docs/ai-integration/examples',
          to: '/docs/guide/ai-examples',
        },
        // Add more redirects as needed
      ],
    },
  ],
],
```

## Testing Checklist

### Automated
- [ ] Build completes without errors: `cd docs-site && npm run build`
- [ ] No broken internal links
- [ ] Search functionality works
- [ ] All assets load correctly

### Manual
- [ ] Navigation flows logically
- [ ] First Principles doc renders correctly
- [ ] Philosophy shows derivation
- [ ] AI setup is comprehensive
- [ ] MCP reference is complete
- [ ] Workflow docs are clear
- [ ] All examples work
- [ ] Mobile rendering correct
- [ ] Desktop rendering correct

### Content Quality
- [ ] No spelling/grammar errors
- [ ] Code examples tested
- [ ] Links go to correct pages
- [ ] Images/diagrams load
- [ ] Formatting consistent
