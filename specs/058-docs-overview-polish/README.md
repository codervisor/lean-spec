---
status: planned
created: '2025-11-07'
tags:
  - documentation
  - quality
  - polish
priority: medium
related:
  - '056'
  - '057'
created_at: '2025-11-07T01:53:09.673Z'
---

# Docs-Site Overview Polish

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-07 · **Tags**: documentation, quality, polish

**Project**: lean-spec  
**Team**: Core Development

## Overview

Polish the docs-site overview page (`docs-site/docs/guide/index.mdx`) to address minor completeness and clarity issues found during validation.

**Current State**: Overview is accurate and well-written, but has 3 minor issues:
1. Feature list incomplete (missing board, stats, deps, validate, etc.)
2. Example structure doesn't match actual templates
3. Example date is cosmetic (minor)

**Why Now**: Part of v0.2.0 launch polish (spec 043). These are the last documentation issues before launch.

**Scope**: Minor fixes only - the page fundamentally works, just needs polish.

## Issues Found

### Issue #1: Feature Section Needs Restructuring (High Priority)

**Location**: "How It Works" section

**Problem**: Section lists 5 CLI capabilities but:
1. Missing **MCP server** - major feature for AI integration!
2. Missing other key commands: `board`, `stats`, `deps`, `validate`, etc.
3. These are CLI commands, but framed as "what LeanSpec provides" (confusing scope)
4. No mention of roadmap/vision (VS Code extension, GitHub Action, PM integrations, etc.)

**Analysis**: The README.md does this better - it has a "Features" section that groups implementation features:
- 🤖 AI-Native Integration (MCP, Copilot, Claude, Cursor)
- 📊 Workflow Visibility (`board`, `stats`)
- 🎨 Progressive Structure (custom fields, adaptable)
- ⚡ Actually Maintainable (short specs, CLI tools, AI-friendly)

**Proposed Solution**: Two-part approach

**Part A: Improve Overview Page**

Replace "How It Works" with better grouping:

```markdown
## What You Get

**Core CLI** - Lightweight spec management from terminal:
- Create, organize, and search specs
- Track project health with Kanban board and analytics
- Validate specs for quality and complexity
- [Full CLI reference →](/docs/reference/cli)

**MCP Server** - Native AI assistant integration:
- Works with Claude Desktop, Cline, and MCP-compatible tools
- Specs available directly in AI chat context
- [Setup guide →](/docs/ai-integration/setup)

**Templates & Customization**:
- Three templates: minimal, standard, enterprise
- Custom fields adapt to your workflow
- Progressive structure grows with your team
```

**Part B: Create Dedicated Roadmap Page**

Create new page: `docs-site/docs/roadmap.mdx`

This is a better approach because:
- ✅ Keeps overview focused on "what is LeanSpec" and "what you get today"
- ✅ Roadmap deserves its own page with more detail
- ✅ Can link from overview: "See our [roadmap](/docs/roadmap) for upcoming features"
- ✅ Roadmap page can pull from actual specs (dogfooding!)
- ✅ Easier to maintain as features ship and roadmap evolves
- ✅ More transparent (links to actual GitHub specs)

**Roadmap Page Structure**:
```markdown
# Roadmap

LeanSpec is actively developed. Here's what's coming next—with links to 
the actual specs we're using to build them. (We dogfood LeanSpec!)

## In Development (v0.2.0)
[Features currently in progress]

## Planned Near-Term (v0.3.0)
**VS Code Extension** ([spec 017](github link))
**GitHub Action** ([spec 016](github link))
**Copilot Chat Integration** ([spec 034](github link))

## Planned Long-Term
**PM Integrations** ([spec 036](github link))
**Tool Redesign** ([spec 050](github link))

## Completed
[Archive of shipped features with links to specs]
```

### Issue #2: Example Structure vs Templates (Minor Priority)

**Location**: "A Simple Example" section

**Current Text**:
```markdown
Here's what a minimal LeanSpec might look like:

[example with Goal, Key Scenarios, Acceptance Criteria, etc.]
```

**Problem**: Example structure doesn't match actual templates:
- **Minimal template**: Goal, Key Points, Non-Goals, Notes
- **Standard template**: Overview, Design, Plan, Test, Notes
- **Example**: Goal, Key Scenarios, Acceptance Criteria, Technical Contracts, Non-Goals

**Proposed Fix**: Add clarifying note
```markdown
Here's an example structure (adapt sections to your needs):

[example...]
```

**Rationale**: Example is illustrative of flexibility, not prescriptive. Just needs to be clearer about that.

### Issue #3: Example Date (Trivial)

**Location**: Same example

**Current**: `created: 2025-11-02`

**Problem**: Date is in the past (cosmetic only)

**Fix**: Change to `created: 2025-11-07` or use `{date}` variable

## Plan

- [ ] Fix Issue #1 - Restructure "How It Works" section
  - [ ] Replace with "What You Get" section
  - [ ] Add MCP server prominence
  - [ ] Group CLI by use case (not individual commands)
  - [ ] Add link to new roadmap page
- [ ] Create new roadmap page (`docs-site/docs/roadmap.mdx`)
  - [ ] Pull features from planned specs (017, 016, 034, 036, etc.)
  - [ ] Link to actual GitHub specs (dogfooding!)
  - [ ] Group by timeframe: In Development / Near-Term / Long-Term / Completed
  - [ ] Add to sidebar navigation
- [ ] Fix Issue #2 - Add clarifying note to example
- [ ] Fix Issue #3 - Update example date to current
- [ ] Build docs-site to verify no errors
- [ ] Review both pages (overview + roadmap)

## Test

**Success Criteria**:
- [ ] MCP server is prominently featured in overview (it's a key differentiator!)
- [ ] Features grouped logically in overview (CLI, MCP, Templates)
- [ ] CLI commands grouped by use case, not listed individually
- [ ] Dedicated roadmap page exists with clear timeframes
- [ ] Roadmap links to actual GitHub specs (transparency + dogfooding)
- [ ] Roadmap added to sidebar navigation
- [ ] Example structure is clearly illustrative, not prescriptive
- [ ] Docs-site builds without errors
- [ ] Both pages guide users effectively

**Validation**:
```bash
cd docs-site && npm run build
```

## Notes

**Why a Dedicated Roadmap Page is Better**:
1. **Focus**: Keeps overview focused on "what is LeanSpec" today
2. **Detail**: Roadmap can be more comprehensive without cluttering overview
3. **Maintenance**: Easier to update as features ship and priorities change
4. **Transparency**: Can link directly to GitHub specs (dogfooding!)
5. **Discoverability**: Searchable, linkable, shareable
6. **Navigation**: Natural place in sidebar (after Guide, before Reference)

**Roadmap Page Benefits**:
- Pull from actual planned specs (017, 016, 034, 036, 050, etc.)
- Show timeframes: In Development → Near-Term → Long-Term
- Archive completed features (show velocity and accomplishments)
- Link to GitHub issues/specs for full transparency
- Updates automatically as specs move to in-progress/complete

**From Validation** (spec 057):
- Overall assessment: 🟢 Good Quality
- These are completeness issues, not accuracy issues
- Page does its job well but missing key features (MCP!) and vision
- Adding roadmap page + improving overview will complete the picture

**Related Specs**:
- Spec 056: Initial docs audit (fixed major issues)
- Spec 057: Comprehensive validation (found these issues)
- Spec 043: v0.2.0 launch (parent context)
