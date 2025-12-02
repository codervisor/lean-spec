---
status: complete
created: '2025-11-24'
tags: []
priority: high
created_at: '2025-11-24T06:08:51.572Z'
updated_at: '2025-11-24T06:11:05.557Z'
transitions:
  - status: in-progress
    at: '2025-11-24T06:09:45.779Z'
  - status: complete
    at: '2025-11-24T06:11:05.557Z'
completed_at: '2025-11-24T06:11:05.557Z'
completed: '2025-11-24'
---

# Improve Chinese Translation Quality

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-24

**Project**: lean-spec  
**Team**: Core Development

## Overview

The current Chinese translations in the documentation site are overly literal and not professionally localized. This creates readability issues for Chinese-speaking users and makes the documentation feel unnatural. We need to establish clear translation guidelines and update existing translations.

**Problem:** Literal translations like "规格" for "Spec" sound awkward in technical context. Missing English references for technical terms reduces clarity.

**Goal:** Professional, natural Chinese translations that maintain technical precision while being easy to read.

## Design

### Translation Guidelines

**1. Keep English Terms for Core Concepts**
- "Spec" → Keep as "Spec" (not "规格")
- "LeanSpec" → Keep as "LeanSpec"
- "CLI" → Keep as "CLI"
- "Token" → Keep as "Token" (in context economy discussions)
- Technical commands → Keep in English (e.g., `lean-spec create`)

**2. Add English References for Technical Terms**
When translating necessary technical terms, include original English in parentheses:
- "Context Economy" → "上下文经济 (Context Economy)"
- "Signal-to-Noise Ratio" → "信噪比 (Signal-to-Noise)"
- "Progressive Disclosure" → "渐进式披露 (Progressive Disclosure)"
- "Dependency Graph" → "依赖图 (Dependency Graph)"

**3. Avoid Literal Translation**
Use natural Chinese expressions instead of word-by-word translation:
- ❌ "规格文件" (literal: specification file)
- ✅ "Spec 文件" (natural, clear)
- ❌ "为什么这个很重要" (literal: why this is important)
- ✅ "重要性" or contextual phrasing (natural)

**4. Maintain Technical Accuracy**
- Keep code examples, commands, and file paths in English
- Use Chinese for explanatory text, concepts, and instructions
- Balance between readability and technical precision

### Scope

**Phase 1: Documentation Guidelines**
- Update `docs-site/AGENTS.md` with translation rules
- Create translation glossary for common terms
- Document examples of good vs. bad translations

**Phase 2: Existing Content Review**
- Audit current Chinese translations
- Prioritize high-traffic pages (homepage, getting started, core guides)
- Update translations following new guidelines

## Plan

- [x] Create spec and define translation guidelines
- [ ] Update `docs-site/AGENTS.md` with translation rules
- [ ] Create translation glossary (common terms reference)
- [ ] Audit existing Chinese translations (identify issues)
- [ ] Update high-priority pages (homepage, getting started)
- [ ] Update remaining documentation pages
- [ ] Validate build and review changes

## Test

### Verification Criteria

- [ ] Translation guidelines documented in `docs-site/AGENTS.md`
- [ ] Translation glossary created with 20+ common terms
- [ ] All core concepts use English terms (Spec, LeanSpec, CLI, etc.)
- [ ] Technical terms have English references in parentheses
- [ ] Chinese text reads naturally (native speaker review)
- [ ] Build passes: `npm run build` in docs-site
- [ ] MDX syntax validation passes: `pnpm validate:mdx`

### Quality Checks

**Readability Test:**
- Chinese text should be natural and fluent
- Technical content should be clear without ambiguity
- Balance between localization and technical accuracy

**Consistency Test:**
- Same term translated consistently across all pages
- Core concepts always use English (not translated)
- Technical terms always have English reference

## Notes

### Translation Glossary (Initial)

**Keep in English:**
- Spec, LeanSpec, CLI, Token, README, frontmatter
- Commands: `lean-spec create`, `lean-spec update`, etc.
- File extensions: `.md`, `.mdx`, `.json`
- Status values: `planned`, `in-progress`, `complete`

**Translate with English Reference:**
- Context Economy → 上下文经济 (Context Economy)
- Signal-to-Noise → 信噪比 (Signal-to-Noise)
- Progressive Disclosure → 渐进式披露 (Progressive Disclosure)
- Dependency Graph → 依赖图 (Dependency Graph)
- Working Memory → 工作记忆 (Working Memory)

**Natural Chinese (No English Reference):**
- Overview → 概述
- Getting Started → 快速开始
- Tutorial → 教程
- Examples → 示例
- Installation → 安装
