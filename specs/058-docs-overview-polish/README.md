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

### Issue #1: Incomplete Feature List (Medium Priority)

**Location**: "How It Works" section

**Current Text**:
```markdown
LeanSpec provides a simple CLI tool to help you:

1. **Initialize** your project with templates
2. **Create** specs in structured format
3. **Manage** spec metadata (status, priority, tags)
4. **Search** and filter specs
5. **Archive** completed work
```

**Problem**: Missing major features users should know about:
- `board` - Kanban view (key feature!)
- `stats` - Project analytics
- `deps` - Dependency tracking
- `view` - View spec content
- `open` - Open in editor
- `files` - List sub-specs
- `validate` - Quality checks
- `backfill` - Git timestamp backfill

**Proposed Fix** (Option A - Expand list):
```markdown
LeanSpec provides a simple CLI tool to help you:

1. **Initialize** your project with templates tailored to your workflow
2. **Create** specs in a structured, date-organized format
3. **Manage** spec metadata (status, priority, tags) easily
4. **Visualize** project health with Kanban board and analytics
5. **Search** and filter specs to find what you need
6. **Track** dependencies and relationships between specs
7. **Validate** specs for quality and complexity
8. **Archive** completed work to keep your workspace clean
```

**Proposed Fix** (Option B - Reframe as examples):
```markdown
The LeanSpec CLI helps you manage specs efficiently:

- Initialize projects with templates (`init`)
- Create and organize specs (`create`, `list`, `search`)
- Track project health (`board`, `stats`, `deps`)
- Maintain quality (`validate`, `check`)
- And more - run `lspec --help` to explore
```

**Recommendation**: Option B (clearer that it's not exhaustive)

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

- [ ] Fix Issue #1 - Reframe feature list (Option B)
- [ ] Fix Issue #2 - Add clarifying note to example
- [ ] Fix Issue #3 - Update example date to current
- [ ] Build docs-site to verify no errors
- [ ] Review rendered page

## Test

**Success Criteria**:
- [ ] Feature list accurately represents CLI without being exhaustive
- [ ] Example structure is clearly illustrative, not prescriptive
- [ ] Docs-site builds without errors
- [ ] Overview page reads smoothly and guides users to next steps

**Validation**:
```bash
cd docs-site && npm run build
```

## Notes

**From Validation** (spec 057):
- Overall assessment: 🟢 Good Quality
- These are completeness issues, not accuracy issues
- Page does its job well - introduces concept, explains philosophy, guides to next steps
- No critical fixes needed - can launch as-is

**Related Specs**:
- Spec 056: Initial docs audit (fixed major issues)
- Spec 057: Comprehensive validation (found these issues)
- Spec 043: v0.2.0 launch (parent context)
