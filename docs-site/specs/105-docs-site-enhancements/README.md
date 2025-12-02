---
status: complete
created: '2025-11-18'
tags: []
priority: medium
created_at: '2025-11-18T13:42:51.756Z'
related:
  - 106-ui-package-documentation
  - 087-cli-ui-command
  - 035-live-specs-showcase
  - 108-fix-zh-intro
updated_at: '2025-11-20T05:50:42.004Z'
transitions:
  - status: in-progress
    at: '2025-11-19T02:47:45.348Z'
  - status: complete
    at: '2025-11-20T13:30:00.000Z'
---

# Documentation Site Optimization and Enhancements

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-18

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

## Status Update · 2025-11-20

**Completed (All Phases)**
- ✅ **Introduction Simplification (Phase 2)**: Simplified `docs/guide/index.mdx` to be concise and intuitive. Merged "Principles" and "When to Write" from `what-is-leanspec.mdx` into `understanding-leanspec.mdx` (both English and Chinese) and deleted the redundant file.
- ✅ **Final Validation (Phase 5)**:
  - Fixed broken links in English and Chinese docs caused by file deletion.
  - Verified build success for both locales (`npm run build`).
  - Confirmed navigation flow and translation consistency.
- ✅ **Usage Doc Audit (Phase 3)**: Systematically verified all 13 usage docs against current CLI output. All docs are accurate and up-to-date.
- ✅ **Examples Translation (Phase 4)**: Verified `cross-team-official-launch.mdx` and `refactoring-monorepo-core.mdx` are fully translated to Chinese.
- ✅ **Chinese Localization Polish (Phase 4)**:
  - Updated landing page tagline to "专为 AI 协作设计的轻量级规范" (Lightweight spec designed for AI collaboration).
  - Updated "Web App" translation to "Web 应用" in navbar.
  - Translated "Examples" to "示例" in navbar.

## Status Update · 2025-11-19

**Completed (Phases 1-3)**
- ✅ Navigation restructure (`docs-site/sidebars.ts`) now surfaces Migration, Core Concepts, and AI-Assisted content in the intended beginner → advanced order.
- ✅ `docs-site/docs/guide/understanding-leanspec.mdx` (and the zh-Hans translation) fully replaces the old "Understanding Specs" doc with deeper rationale and working-memory guidance.
- ✅ Terminology was consolidated: sub-spec coverage folded into `guide/terminology/spec.mdx`, and the new `guide/terminology/built-in-metadata.mdx` (plus zh-Hans) replaces the individual status/dependency/tag pages.
- ✅ Examples landing doc renamed to `examples/overview.mdx` (and translated) so the sidebar no longer points at an `index` placeholder.
- ✅ Validation guidance (`docs-site/docs/guide/usage/project-management/validation.mdx`) now speaks in token thresholds rather than line counts, keeping the docs consistent with the CLI's token tooling.
- ✅ Token-first messaging now covers the FAQ, comparison page, MCP reference, and context-engineering guide (including zh-Hans translations) so there are no remaining "300-line"/"line limit" references in the docs-site.
- ✅ Chinese localization mirrors the new terminology so both languages describe the 2,000/3,500/5,000-token thresholds consistently.
- ✅ "Writing Specs AI Can Execute" page removed and replaced with `ai-executable-patterns.mdx` in the correct location.
- ✅ "AI-Assisted Workflows" lifted to correct hierarchy level (under usage/, not buried deeper).
- ✅ Tutorial cleanup complete: All video walkthrough placeholders and timestamps removed from `docs/tutorials/writing-first-spec-with-ai.mdx` (both English and Chinese versions).
- ✅ Broken links fixed: `/docs/guide/terminology` → `/docs/guide/terminology/spec`, `/docs/examples` → `/docs/examples/overview`.
- ✅ Build validation passed: `npm run build` succeeds with no broken links or errors.

**Priority Next Actions (Remaining from Phases 3-5)**

1. **Examples Translation** (Phase 4) - HIGH PRIORITY
   - Translate `docs/examples/cross-team-official-launch.mdx` to Chinese
   - Translate `docs/examples/refactoring-monorepo-core.mdx` to Chinese

2. **Introduction Simplification** (Phase 2)
   - Condense `docs/guide/index.mdx` (currently 150 lines) for better first-time user experience

3. **Usage Docs Validation** (Phase 3)
   - Systematically verify all usage docs against current CLI output (see Usage Doc Audit table)

4. **Chinese Localization Polish** (Phase 4)
   - Improve landing page Chinese tagline (current: "轻量级规范方法论，助力 AI 驱动开发")
   - Improve "Web App" Chinese translation (consider "网页应用" or context-specific term)

5. **Final Validation** (Phase 5)
   - Test navigation flow for beginner → advanced progression
   - Spot-check translation quality

## Plan

### Phase 1: Content Audit
- [x] Grep search for "line" references that should be "token"
- [x] Review "Advanced Topics" docs for line-count metrics
- [x] List all "Usage" docs and check against current implementation
- [x] Review "Reference" docs against CLI codebase
- [x] Identify all translation gaps (English vs Chinese)
- [x] List all "Examples" that need Chinese translation

### Phase 2: Information Architecture
- [x] Update sidebars.ts for navigation restructure
- [x] Simplify "Introduction -> Overview" (docs/guide/index.mdx is 150 lines, needs condensing)
- [x] Move "Migrating to LeanSpec" to top level
- [x] Rename "Understanding Specs" → "Understanding LeanSpec"
- [x] Remove "Terminology Overview" page
- [x] Restructure terminology concepts (merge Sub-Specs, consolidate metadata)
- [x] Move "AI-Assisted Workflows" up one level
- [x] Remove "Writing Specs AI Can Execute" page (now ai-executable-patterns.mdx)
- [x] Fix "Examples" default doc name

### Phase 3: Content Updates
- [x] Replace all line-count references with token-based
- [x] Update outdated "Usage" docs
- [x] Update "Reference" docs to match current CLI
- [x] Expand terminology with in-depth explanations
- [x] Rewrite tutorials (video placeholders removed from writing-first-spec-with-ai.mdx)
- [x] Update code examples and command outputs

### Phase 4: Translation & Localization
- [x] Translate remaining "Examples" to Chinese (2 remaining: cross-team-official-launch, refactoring-monorepo-core)
- [x] Fill other translation gaps identified in audit
- [x] Improve landing page Chinese tagline
- [x] Improve "Web App" Chinese translation
- [x] Verify feature parity between languages

### Phase 5: Validation
- [x] Build docs-site and verify no broken links
- [x] Review navigation flow (beginner → advanced)
- [x] Spot-check translations for quality
- [x] Verify all commands and examples work

### Usage Doc Audit (Completed)
| Path | Review status | Notes |
| --- | --- | --- |
| `guide/usage/essential-usage/spec-structure.mdx` | ✅ | Verified with CLI |
| `guide/usage/essential-usage/creating-managing.mdx` | ✅ | Verified with CLI |
| `guide/usage/essential-usage/finding-specs.mdx` | ✅ | Verified with CLI |
| `guide/usage/project-management/board-stats.mdx` | ✅ | Verified with CLI |
| `guide/usage/project-management/dependencies.mdx` | ✅ | Verified with CLI |
| `guide/usage/project-management/validation.mdx` | ✅ | Token thresholds already updated (2025-11-19) |
| `guide/usage/ai-assisted/agent-configuration.mdx` | ✅ | Verified AGENTS.md content |
| `guide/usage/ai-assisted/ai-executable-patterns.mdx` | ✅ | Conceptual guide |
| `guide/usage/ai-assisted/mcp-integration.mdx` | ✅ | Verified CLI command existence |
| `guide/usage/advanced-features/custom-fields.mdx` | ✅ | Verified with CLI |
| `guide/usage/advanced-features/frontmatter.mdx` | ✅ | Verified with CLI |
| `guide/usage/advanced-features/templates.mdx` | ✅ | Verified with CLI |
| `guide/usage/advanced-features/variables.mdx` | ✅ | Verified with CLI |

## Test

### Navigation & Structure
- [x] Introduction section is concise and intuitive for new users
- [x] "Migrating to LeanSpec" appears at top level beside Roadmap
- [x] "Understanding LeanSpec" (renamed) appears in Core Concepts
- [x] Terminology concepts are properly organized and consolidated
- [x] "AI-Assisted Workflows" is at correct hierarchy level
- [x] Examples section has proper default doc name (not "index")

### Content Accuracy
- [x] No line-count references remain (all token-based)
- [x] All "Usage" docs match current implementation
- [x] All "Reference" docs match current CLI
- [x] All code examples execute correctly
- [x] Command outputs are current

### Tutorial Quality
- [x] No video walkthrough placeholders (timestamps removed)
- [x] Tutorials emphasize AI-assisted workflow
- [x] Clear examples of intent → AI spec creation → implementation

### Translation Completeness
- [x] All English docs have Chinese equivalents
- [x] Examples section fully translated
- [x] Landing page Chinese tagline reads naturally
- [x] "Web App" has appropriate Chinese translation

### Build & Technical
- [x] `npm run build` succeeds in docs-site
- [x] No broken links or 404s
- [x] Cross-references work between restructured pages
- [x] Navigation hierarchy makes sense (test with fresh eyes)

### User Experience
- [x] New users can understand LeanSpec quickly from Introduction
- [x] Core Concepts provide depth for learning
- [x] Terminology concepts have "why" and "how" explanations
- [x] Chinese content is natural and high-quality

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
