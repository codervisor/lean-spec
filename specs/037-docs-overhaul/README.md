---
status: planned
created: '2025-11-03'
tags:
  - docs
  - maintenance
  - clarity
  - merged-into-051
priority: low
related:
  - 043-official-launch-02
created_at: '2025-11-03T00:00:00Z'
updated_at: '2025-11-05T05:04:02.384Z'
---

# Documentation Overhaul & Simplification

> **Status**: 🗓️ Planned · **Priority**: Low · **Created**: 2025-11-03 · **Tags**: docs, maintenance, clarity, merged-into-051

**Project**: lean-spec  
**Team**: Core Development

## Overview

Audit and simplify all LeanSpec documentation to eliminate unnecessary complexity, reduce redundancy, and ensure docs stay true to the "lean" philosophy. We may have accumulated overkill documentation that contradicts our core principle of clarity over documentation.

**Why now?** As the project matures, docs naturally accumulate. Before we scale further, we need to ensure our documentation practices what we preach: minimal, clear, actionable—not exhaustive.

## Design

**Audit Scope:**
- Main README.md
- AGENTS.md (AI agent instructions)
- CONTRIBUTING.md
- Documentation website (`docs-site/docs/**`)
- Inline code comments
- Spec templates
- Example specs

**Assessment Criteria:**

**Keep if:**
- ✅ Answers "why" or "what" clearly
- ✅ Needed for first-time users
- ✅ Prevents common mistakes
- ✅ Explains non-obvious design decisions

**Cut if:**
- ❌ Duplicates other docs
- ❌ States the obvious (self-documenting code)
- ❌ Over-explains simple concepts
- ❌ Shows off rather than helps
- ❌ Prescribes one "right way" unnecessarily
- ❌ Hasn't been updated and is stale

**Structure Review:**

**README.md:**
- Should get someone started in <5 min
- Quick install, one example, link to docs
- Cut: long philosophy sections, redundant examples

**AGENTS.md:**
- Keep focused on actionable instructions
- Remove redundant context (they can read README)
- Ensure examples are current

**Documentation Website:**
- Consolidate overlapping guides
- Merge "Getting Started" with "Quick Start" if redundant
- Reduce tutorial depth—link to specs as examples instead

**Spec Templates:**
- Already fairly lean, but review for cruft
- Ensure comments are helpful, not prescriptive

**Code Comments:**
- Audit for unnecessary comments
- Keep: "why" comments, non-obvious decisions
- Remove: "what" comments that restate code

## Plan

**Status (2025-11-04):** Ready to start - part of Phase 2 for v0.2.0 launch

- [ ] Audit README.md for redundancy and verbosity
- [ ] Review AGENTS.md for outdated or unnecessary instructions
- [ ] Check CONTRIBUTING.md for overkill guidelines
- [ ] Audit docs-site structure for overlapping content
- [ ] Review each doc page against assessment criteria
- [ ] Consolidate or remove redundant guides
- [ ] Simplify spec templates if needed
- [ ] Scan codebase for unnecessary comments
- [ ] Update examples to reflect current best practices
- [ ] Test first-time user experience with simplified docs
- [ ] Get feedback from fresh users (if possible)
- [ ] Archive removed content for reference

**Implementation Priority:**
- 🔴 HIGH: README.md simplification (first impression matters)
- 🔴 HIGH: AGENTS.md accuracy (AI integration is core feature)
- 🟡 MEDIUM: Docs site consolidation
- 🟢 LOW: Code comment cleanup

**Related Work:**
- Spec 043: Official Launch v0.2.0 - docs quality is critical for launch
- Clear docs support adoption and reduce support burden

## Test

- [ ] New user can get started in <5 minutes from README
- [ ] No duplicate information across docs
- [ ] Every doc serves a clear purpose
- [ ] Docs site navigation is intuitive
- [ ] Spec templates are clear but not prescriptive
- [ ] Code comments add value, not noise
- [ ] Examples are current and accurate
- [ ] No broken links after consolidation
- [ ] Docs still cover critical use cases
- [ ] The word count is notably reduced

## Notes

**Metrics to Track:**
- Word count before/after
- Number of doc pages before/after
- Time to first successful spec creation (ideal: <5min)

**LeanSpec Philosophy Check:**
- "Clarity over documentation"
- "If it doesn't add clarity, cut it"
- "Minimal is the goal"

**Risk:**
- We might cut too much and confuse users
- Mitigation: start with obvious redundancies, gather feedback

**Related:**
- Live specs showcase (spec 021) - could replace some documentation with examples
- README improvement (spec 009) - previous work to build on

**Examples of Potential Overkill:**
- Multiple "Quick Start" sections across README and docs
- Long philosophical explanations in every doc
- Over-documented example projects
- Exhaustive command references (when `--help` exists)
- Multiple tutorials covering the same workflow

**What Makes Good Lean Docs:**
- Get user to "aha!" moment fast
- One clear path for common tasks
- Link to details rather than inline them
- Trust users to explore
- Show, don't tell (examples over prose)

**Action Items Post-Overhaul:**
- Add docs maintenance guidelines to CONTRIBUTING.md
- Set up periodic review (quarterly?) to prevent accumulation
- Consider docs page limit or word count budget
