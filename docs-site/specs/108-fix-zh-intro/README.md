---
status: complete
created: '2025-11-20'
tags:
  - docs
  - translation
  - i18n
priority: high
created_at: '2025-11-20T05:43:14.669Z'
updated_at: '2025-11-20T05:55:15.423Z'
transitions:
  - status: in-progress
    at: '2025-11-20T05:43:19.834Z'
  - status: complete
    at: '2025-11-20T05:43:57.355Z'
  - status: in-progress
    at: '2025-11-20T05:49:35.405Z'
  - status: complete
    at: '2025-11-20T05:55:15.423Z'
completed_at: '2025-11-20T05:43:57.355Z'
completed: '2025-11-20'
related:
  - 105-docs-site-enhancements
---

# Fix Outdated Chinese Documentation Content

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-20 · **Tags**: docs, translation, i18n

**Project**: lean-spec  
**Team**: Core Development

## Overview

**Problem**: User reported that Chinese documentation (`zh-Hans`) contains outdated content, specifically:
1. Introduction page (`guide/index.mdx`) had old verbose content
2. Multiple pages still reference "300 lines" instead of token-based metrics (2,000 tokens)

**Discovery**: Spec 105 marked Phase 3 (Content Updates) as complete, but:
- ❌ Both English AND Chinese docs still use "300 lines" in several critical pages
- ✅ Chinese introduction was outdated but now fixed
- ❌ Content accuracy task from spec 105 is actually incomplete

**Impact**: 
- Users see inconsistent metrics between AGENTS.md (tokens) and docs (lines)
- Chinese translation doesn't match current English content
- Undermines credibility of documentation

## Design

### Token Thresholds (Correct Values from AGENTS.md)

Replace all "300 lines" references with:
- **Target**: <2,000 tokens per spec file
- **Warning**: 2,000-3,500 tokens (acceptable but watch complexity)  
- **Problem**: >3,500 tokens (consider splitting)

### Files Requiring Updates

**English docs with "300 line" references:**
1. `docs/advanced/first-principles.mdx` - 2 occurrences
2. `docs/advanced/limits-and-tradeoffs.mdx` - 3 occurrences  
3. `docs/comparison.mdx` - 4 occurrences

**Chinese docs with "300行" references:**
1. `i18n/zh-Hans/.../advanced/first-principles.mdx` - 2 occurrences
2. `i18n/zh-Hans/.../advanced/limits-and-tradeoffs.mdx` - 3 occurrences
3. `i18n/zh-Hans/.../advanced/comparison.mdx` - 4 occurrences

Total: 18 replacements needed (9 English + 9 Chinese)

## Plan

### Phase 1: Verification ✅
- [x] Review Chinese introduction page
- [x] Search for outdated content patterns
- [x] Identify all line-based metric references
- [x] Compare with AGENTS.md source of truth

### Phase 2: English Content Updates ✅
- [x] Update `docs/advanced/first-principles.mdx`
- [x] Update `docs/advanced/limits-and-tradeoffs.mdx`
- [x] Update `docs/comparison.mdx`

### Phase 3: Chinese Translation Updates ✅
- [x] Update `i18n/zh-Hans/.../advanced/first-principles.mdx`
- [x] Update `i18n/zh-Hans/.../advanced/limits-and-tradeoffs.mdx`
- [x] Update `i18n/zh-Hans/.../advanced/comparison.mdx`
- [x] Update `i18n/zh-Hans/.../guide/first-principles.mdx`
- [x] Update `i18n/zh-Hans/.../guide/limits-and-tradeoffs.mdx`
- [x] Update `i18n/zh-Hans/.../guide/understanding.mdx`
- [x] Update `i18n/zh-Hans/.../guide/usage/essential-usage/spec-structure.mdx`
- [x] Update `i18n/zh-Hans/.../tutorials/writing-first-spec-with-ai.mdx`

### Phase 4: Validation ✅
- [x] Build docs site for both locales
- [x] Verify no broken links
- [x] Spot-check translation quality
- [x] Update spec 105 status notes

## Test

### Content Accuracy ✅
- [x] No "300 line" references in English docs
- [x] No "300行" references in Chinese docs (except code example "~300 行")
- [x] All docs reference token-based metrics consistently
- [x] Metrics match AGENTS.md: <2,000 / 2,000-3,500 / >3,500 tokens

### Build Validation ✅
- [x] `npm run build` succeeds in docs-site
- [x] Both English and Chinese builds complete without errors
- [x] No MDX compilation errors (fixed unescaped `<` character)

### Translation Quality ✅
- [x] Chinese translations accurately reflect English content
- [x] Technical terms (tokens, Context Economy, etc.) properly translated
- [x] Natural Chinese phrasing maintained

## Notes

### Initial Fix (Completed)
- ✅ Fixed Chinese introduction page (`i18n/zh-Hans/.../guide/index.mdx`)
  - Replaced verbose outdated content with concise AI-native focus
  - Fixed MDX compilation error (unescaped `<` character)
  - Aligned with English version structure

### Remaining Issues Found
- Original assessment was premature - spec 105 Phase 3 incomplete
- Both English and Chinese docs need token-based updates
- This is not just a translation issue but a content accuracy issue

### Comprehensive Fix Completed (2025-11-20)

**Files Updated:**
- English docs: 3 files (first-principles.mdx, limits-and-tradeoffs.mdx, comparison.mdx)
- Chinese docs: 8 files (advanced/*, guide/*, usage/*, tutorials/*)
- Total replacements: 18 occurrences (9 English + 9 Chinese)

**All References Changed:**
- "300 lines" → "2,000 tokens"
- "300-400 lines" → "2,000-3,500 tokens"  
- ">400 lines" → ">3,500 tokens"

**Build Verification:**
- Both English and Chinese builds successful
- Fixed MDX compilation error (unescaped `<` character)
- No broken links or errors

### Related Work
- Links back to spec 105 which should track overall docs improvements
- This spec focuses specifically on the line→token metric corrections
