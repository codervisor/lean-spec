---
status: planned
created: '2025-11-18'
tags: []
priority: medium
created_at: '2025-11-18T13:42:51.756Z'
related:
  - 106-ui-package-documentation
  - 087-cli-ui-command
  - 035-live-specs-showcase
updated_at: '2025-11-18T14:36:33.079Z'
---

# Documentation Site Optimization and Enhancements

> **Status**: 🗓️ Planned · **Priority**: Medium · **Created**: 2025-11-18

**Project**: lean-spec  
**Team**: Core Development

## Overview

This spec addresses comprehensive improvements to the documentation site based on structural issues, content accuracy, translation gaps, and user experience concerns identified during review.

### Problems

**Content Structure Issues:**
- Navigation hierarchy is confusing for first-time users
- Content is scattered across multiple levels when it should be consolidated
- Tutorial content includes video walkthrough placeholders that don't align with AI-first approach

**Content Accuracy Issues:**
- Outdated references to line-count metrics instead of token-based
- Usage docs don't match current implementation
- Reference docs may be out of sync with codebase

**Translation & Localization Issues:**
- Examples section not translated to Chinese
- Missing translations in other sections
- Poor quality Chinese translations in landing page
- "Web App" needs better Chinese translation

**Missing Content:**
- `lean-spec ui` / `@leanspec/ui` package not documented (needs separate spec)

### Goals

1. **Improve Information Architecture**: Restructure docs to guide users from beginner → intermediate → advanced
2. **Update Content Accuracy**: Align all docs with current implementation (token-based, not line-based)
3. **Complete Translations**: Ensure feature parity between English and Chinese docs
4. **Enhance User Experience**: Simplify landing experience, remove placeholders, improve tutorial flow

## Design

### 1. Information Architecture Restructuring

**Introduction Section:**
- Simplify "Overview" - make it concise and intuitive for first-timers
- Consider merging with "Core Concepts -> What Is LeanSpec" for consistency
- Move "Migrating to LeanSpec" to top-level navigation (beside Roadmap)

**Core Concepts Reorganization:**
- Rename "Understanding Specs" → "Understanding LeanSpec" (broader scope)
- Remove "Terminology Overview" as separate page
- Restructure terminology directly after "Understanding LeanSpec":
  - **Keep as-is**: "Spec", "SDD Workflow"
  - **Merge**: "Sub-Specs" content into "Spec" concept
  - **Consolidate**: "Status", "Dependencies", "Tags & Priority" into "Built-in Fields" or "Metadata" concept
- Expand terminology content with in-depth explanations:
  - Why LeanSpec is designed this way
  - How concepts work behind the scenes
  - Help users transition from beginner → intermediate/advanced

**Usage Section Restructuring:**
- Remove "AI-Assisted Workflows -> Writing Specs AI Can Execute"
- Lift "AI-Assisted Workflows" docs up one level (after "Advanced Features")

**Examples Section:**
- Fix: Default doc should not be named "index" (use proper descriptive name)

### 2. Content Updates

**Switch from Line-Count to Token-Based:**
- Audit all docs for line-count references (especially "Advanced Topics")
- Replace with token-based metrics
- Ensure consistency with current implementation

**Update Outdated Content:**
- Review all "Usage" docs against current codebase
- Update "Reference" tab to match current CLI implementation
- Verify code examples and command outputs are current

**Tutorial Content:**
- Remove video walkthrough placeholders (timestamps like 00:30, 02:10)
- Rewrite tutorials emphasizing AI-assisted workflow:
  - Human developer expresses intent
  - AI helps with spec creation, drafting, and implementation
  - Focus on conversational, intent-driven development

### 3. Translation & Localization

**Complete Missing Translations:**
- Translate all "Examples" docs to Chinese
- Audit for other missing translations (systematic review)
- Ensure feature parity between English and Chinese versions

**Improve Translation Quality:**
- Landing page: Replace "轻量级规范方法论，助力 AI 驱动开发" with better tagline
  - Consider: Focus on clarity and natural Chinese phrasing
  - Avoid literal translation
- "Web App" → Find more natural Chinese equivalent
  - Consider: "网页应用" or context-specific term

### 4. Deferred Items

**Out of Scope for This Spec:**
- `lean-spec ui` / `@leanspec/ui` documentation (track in separate spec)

### Technical Approach

1. **Content Audit Phase:**
   - Script to find all line-count references
   - Manual review of outdated content in Usage/Reference sections
   - Translation gap analysis

2. **Restructuring Phase:**
   - Update sidebars.ts for navigation changes
   - Move/rename files as needed
   - Update cross-references and links

3. **Content Improvement Phase:**
   - Rewrite simplified content with depth
   - Update examples and commands
   - Improve tutorials

4. **Translation Phase:**
   - Translate missing content
   - Improve existing translations
   - Verify completeness

## Plan

### Phase 1: Content Audit
- [ ] Grep search for "line" references that should be "token"
- [ ] Review "Advanced Topics" docs for line-count metrics
- [ ] List all "Usage" docs and check against current implementation
- [ ] Review "Reference" docs against CLI codebase
- [ ] Identify all translation gaps (English vs Chinese)
- [ ] List all "Examples" that need Chinese translation

### Phase 2: Information Architecture
- [ ] Update sidebars.ts for navigation restructure
- [ ] Simplify "Introduction -> Overview"
- [ ] Move "Migrating to LeanSpec" to top level
- [ ] Rename "Understanding Specs" → "Understanding LeanSpec"
- [ ] Remove "Terminology Overview" page
- [ ] Restructure terminology concepts (merge Sub-Specs, consolidate metadata)
- [ ] Move "AI-Assisted Workflows" up one level
- [ ] Remove "Writing Specs AI Can Execute" page
- [ ] Fix "Examples" default doc name

### Phase 3: Content Updates
- [ ] Replace all line-count references with token-based
- [ ] Update outdated "Usage" docs
- [ ] Update "Reference" docs to match current CLI
- [ ] Expand terminology with in-depth explanations
- [ ] Rewrite tutorials (remove video placeholders, focus on AI-assisted)
- [ ] Update code examples and command outputs

### Phase 4: Translation & Localization
- [ ] Translate all "Examples" to Chinese
- [ ] Fill other translation gaps identified in audit
- [ ] Improve landing page Chinese tagline
- [ ] Improve "Web App" Chinese translation
- [ ] Verify feature parity between languages

### Phase 5: Validation
- [ ] Build docs-site and verify no broken links
- [ ] Review navigation flow (beginner → advanced)
- [ ] Spot-check translations for quality
- [ ] Verify all commands and examples work

## Test

### Navigation & Structure
- [ ] Introduction section is concise and intuitive for new users
- [ ] "Migrating to LeanSpec" appears at top level beside Roadmap
- [ ] "Understanding LeanSpec" (renamed) appears in Core Concepts
- [ ] Terminology concepts are properly organized and consolidated
- [ ] "AI-Assisted Workflows" is at correct hierarchy level
- [ ] Examples section has proper default doc name (not "index")

### Content Accuracy
- [ ] No line-count references remain (all token-based)
- [ ] All "Usage" docs match current implementation
- [ ] All "Reference" docs match current CLI
- [ ] All code examples execute correctly
- [ ] Command outputs are current

### Tutorial Quality
- [ ] No video walkthrough placeholders (timestamps removed)
- [ ] Tutorials emphasize AI-assisted workflow
- [ ] Clear examples of intent → AI spec creation → implementation

### Translation Completeness
- [ ] All English docs have Chinese equivalents
- [ ] Examples section fully translated
- [ ] Landing page Chinese tagline reads naturally
- [ ] "Web App" has appropriate Chinese translation

### Build & Technical
- [ ] `npm run build` succeeds in docs-site
- [ ] No broken links or 404s
- [ ] Cross-references work between restructured pages
- [ ] Navigation hierarchy makes sense (test with fresh eyes)

### User Experience
- [ ] New users can understand LeanSpec quickly from Introduction
- [ ] Core Concepts provide depth for learning
- [ ] Terminology concepts have "why" and "how" explanations
- [ ] Chinese content is natural and high-quality

## Notes

### Original Feedback Summary

All 18 feedback points from initial review:

1. ✓ Missing `lean-spec ui` docs → Deferred to separate spec
2. ✓ "Introduction -> Overview" too long → Simplify
3. ✓ Move "Migrating to LeanSpec" → Top level
4. ✓ Remove video walkthrough placeholders from tutorials
5. ✓ Rewrite tutorials for AI-assisted workflow
6. ✓ Restructure "Understanding Specs" and terminology
7. ✓ Rename to "Understanding LeanSpec"
8. ✓ Reorganize terminology concepts
9. ✓ Expand terminology with depth and rationale
10. ✓ Remove "Writing Specs AI Can Execute"
11. ✓ Lift "AI-Assisted Workflows" up one level
12. ✓ Update outdated "Usage" docs
13. ✓ Fix line-count → token-based references
14. ✓ Complete Chinese translations for Examples
15. ✓ Fix "index" naming in Examples
16. ✓ Update Reference docs against codebase
17. ✓ Improve "Web App" Chinese translation
18. ✓ Improve landing page Chinese tagline

### Design Decisions

**Why consolidate metadata concepts?**
Status, Dependencies, Tags, and Priority are all system-managed frontmatter fields. Grouping them helps users understand LeanSpec's metadata model holistically rather than as fragmented concepts.

**Why expand terminology content?**
Original feedback noted over-simplification. Users need to understand the "why" behind LeanSpec's design to appreciate its value and use it effectively. This bridges the gap from beginner to intermediate/advanced usage.

**Why lift AI-Assisted Workflows?**
These workflows are central to LeanSpec's value proposition and should be prominent in navigation, not buried under Usage section.

**Why focus tutorials on AI-assisted approach?**
LeanSpec is designed for AI-first development. Video walkthrough placeholders suggest manual, traditional workflows. Rewriting with AI-assisted focus aligns tutorials with core methodology.

### Open Questions

- **Chinese tagline alternatives**: Need to brainstorm better options than current "轻量级规范方法论，助力 AI 驱动开发"
  - Consider focus on outcomes vs methodology
  - Test with native speakers
  
- **Examples naming convention**: What should default doc be called instead of "index"?
  - "Overview"?
  - "Getting Started"?
  - Or directly use first real example?

### Related Work

- Separate spec needed for `@leanspec/ui` documentation
- May want to track translation process improvements if this reveals systematic issues
