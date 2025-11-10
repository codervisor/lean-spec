---
status: complete
created: '2025-11-04'
tags:
  - philosophy
  - quality
  - lean-principle
  - meta
priority: critical
related:
  - 018-spec-validation
  - 012-sub-spec-files
  - 043-official-launch-02
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-06T21:15:00Z'
completed_at: '2025-11-05T05:03:54.952Z'
completed: '2025-11-05'
transitions:
  - status: complete
    at: '2025-11-05T05:03:54.952Z'
---

# When Specs Become Too Complex

> **Status**: ✅ Complete · **Priority**: Critical · **Created**: 2025-11-04 · **Tags**: philosophy, quality, lean-principle, meta

**Split into sub-specs for Context Economy** - See detailed sections below

## Overview

**The Irony**: We're building LeanSpec to solve "specs that are too complex for AI," yet our own specs were becoming exactly what we're trying to prevent.

### The Evidence

- Spec 018 (spec-validation): **591 lines**, 43 sections, 13 code blocks
- Spec 045 (unified-dashboard): **1,166 lines** (largest spec in project)
- Spec 043 (official-launch): **408 lines** with 3 distinct phases
- Multiple instances of spec corruption from complex editing

### Core Philosophy Conflict

```markdown
# From our README:
"Context overload - 30-page documents blow up the AI's context window"
"Write only what matters - Clear intent AI can act on, not 50 pages of noise"
"Keep it minimal - If it doesn't add clarity, cut it"

# Reality (before this spec):
- 591-line spec with 8 implementation phases
- Specs getting corrupted from multi-replace operations
- AI agents struggling to maintain consistency
```

**The Question**: Are we practicing what we preach?

**The Answer**: Not yet - but we're fixing it through dogfooding.

## Key Findings

### Quantitative Thresholds

- **<300 lines**: ✅ Ideal, keep as single file
- **300-400 lines**: ⚠️ Warning zone, consider simplifying or splitting
- **>400 lines**: 🔴 Strong candidate for splitting
- **>600 lines**: 🔴 Almost certainly should be split

### The Paradox

We built sub-spec files (spec 012) to solve this exact problem, but never used them ourselves! We were experiencing the problem we set out to solve.

### The Solution

Apply our own principles:
1. Establish clear complexity thresholds (Context Economy)
2. Use sub-spec files when specs exceed 400 lines
3. Add validation to catch violations automatically
4. Dogfood our own guidelines

## Quick Reference

### Warning Signs Your Spec is Too Complex

- Takes >10 minutes to read
- Can't summarize in 2 paragraphs
- Recent edits caused corruption
- Scrolling endlessly to find information
- Implementation plan has >8 phases

**Action**: Split using sub-specs (see spec 012).

### When to Split

Single file OK: <300 lines, single concern, <6 phases

Consider splitting: >400 lines, multiple concerns, >6 phases

Use sub-specs:
- README.md: Overview + decision
- DESIGN.md: Detailed design
- IMPLEMENTATION.md: Implementation plan
- TESTING.md: Test strategy
- {CONCERN}.md: Specific concerns

## Sub-Specs

Detailed information split for Context Economy (<400 lines per file):

- **[FINDINGS.md](./FINDINGS.md)** - Problem analysis, symptoms, root causes, the paradox
- **[GUIDELINES.md](./GUIDELINES.md)** - When to split, decision tree, thresholds, case studies

## Status

✅ **COMPLETE** - Guidelines established, validation added, specs 018 and 045 successfully split.

### Implementation Summary

**Phase 1: Establish Guidelines** ✅
- Defined complexity thresholds (300/400/600 lines)
- Created decision tree for when to split
- Documented in AGENTS.md

**Phase 2: Add Detection** ✅  
- Line count detection in `lean-spec validate`
- Warnings for specs >400 lines
- Sub-spec validation

**Phase 3: Dogfood** ✅
- Spec 018 split into 6 focused sub-specs
- Spec 045 split into 5 focused sub-specs
- Spec 048 (this spec) split into sub-specs

**Phase 4: Future Enhancements** (v0.3.0+)
- `lean-spec split` command for guided splitting
- `lean-spec check --complexity` for detailed analysis
- Advanced sub-spec navigation

## Impact

### Before Dogfooding
- 3 specs >600 lines (Context Economy violations)
- No enforcement mechanism
- AI corruption incidents

### After Dogfooding
- All specs <400 lines (or split into sub-specs)
- Automatic validation catches violations
- Practicing what we preach ✅

This spec established the principle that drove our dogfooding effort in v0.2.0.
