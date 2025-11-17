---
status: planned
created: '2025-11-17'
tags: []
priority: high
created_at: '2025-11-17T02:12:58.531Z'
updated_at: '2025-11-17T02:58:36.055Z'
transitions:
  - status: in-progress
    at: '2025-11-17T02:14:06.440Z'
  - status: complete
    at: '2025-11-17T02:14:06.656Z'
  - status: planned
    at: '2025-11-17T02:58:36.055Z'
completed_at: '2025-11-17T02:14:06.656Z'
completed: '2025-11-17'
---

# Comprehensive Chinese Localization for LeanSpec

> **Status**: 🗓️ Planned · **Priority**: High · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

## Overview

Most early LeanSpec users come from China. Without Chinese localization, we're creating a significant barrier to adoption and understanding.

**Problem**:
- Docs site is English-only
- Web app UI is English-only
- Example specs in docs are English-only
- Chinese developers struggle to understand SDD methodology
- Lost opportunity to build strong Chinese community

**Scope of localization**:

1. **Docs Site** (docusaurus)
   - All documentation pages
   - Tutorial content
   - Case studies
   - Navigation and UI elements

2. **Web App** (@leanspec/web)
   - UI strings and labels
   - Error messages
   - Help text and tooltips
   - Example content

3. **Example Specs** (in docs)
   - Translate example specs used in tutorials
   - Provide Chinese spec templates
   - Show Chinese naming conventions

4. **CLI Output** (maybe - lower priority)
   - Help text
   - Error messages
   - Success messages

**Translation requirements**:
- Professional quality (not machine translation)
- Technical terminology consistency
- SDD methodology context preserved
- Cultural adaptation where needed (not just literal translation)

## Design

**Technical approach**:

### 1. Docs Site (Docusaurus i18n)
Docusaurus has built-in i18n support:
- Use `docs-site/i18n/zh-CN/` structure
- Run `npm run write-translations -- --locale zh-CN`
- Translate markdown files in `i18n/zh-CN/docusaurus-plugin-content-docs/`
- Configure `docusaurus.config.ts` with Chinese locale

**Files to translate**:
- Core Concepts pages
- Tutorials
- Guides
- API reference
- Navigation labels
- Footer content

### 2. Web App i18n
Implement i18n library for React:
- Use `react-i18next` or similar
- Extract all UI strings to translation files
- Language switcher in UI
- Persist language preference
- Load translations dynamically

**Translation file structure**:
```
packages/web/src/locales/
  en/
    common.json
    errors.json
    help.json
  zh-CN/
    common.json
    errors.json
    help.json
```

### 3. Translation Management
**Options**:
1. **Manual**: Maintain JSON/markdown files in repo (simple, full control)
2. **Crowdin/Lokalise**: Translation management platform (scalable)
3. **AI-assisted**: Use AI for first pass, human review (fast, needs validation)

**Recommendation**: Start with option 3 (AI + human review), move to option 2 if community grows

### 4. Terminology Glossary
Create SDD terminology glossary:
- Spec → 规格说明 (guīgé shuōmíng)
- Context → 上下文 (shàngxià wén)
- Token → 令牌 (lìngpái) or 标记 (biāojì)
- Agent → 代理 (dàilǐ) or AI 助手
- Status → 状态 (zhuàngtài)
- Maintain consistency across all translations

## Plan

**Phase 1: Foundation**
- [ ] Create SDD terminology glossary (Chinese)
- [ ] Set up Docusaurus i18n configuration
- [ ] Set up web app i18n infrastructure (react-i18next)
- [ ] Create translation file structures

**Phase 2: Docs Site Translation**
- [ ] Translate Core Concepts pages
- [ ] Translate "Your First Spec" tutorial (spec 089)
- [ ] Translate homepage and navigation
- [ ] Test zh-CN docs site build

**Phase 3: Web App Translation**
- [ ] Extract all UI strings to translation files
- [ ] Translate to Chinese
- [ ] Add language switcher to UI
- [ ] Test web app with Chinese locale

**Phase 4: Quality & Polish**
- [ ] Native speaker review of translations
- [ ] Cultural adaptation review
- [ ] Fix inconsistencies
- [ ] Add Chinese example specs

**Phase 5: Ongoing Maintenance**
- [ ] Document translation workflow
- [ ] Set up process for new content
- [ ] Consider translation platform (Crowdin/Lokalise)
- [ ] Build Chinese community for feedback

## Test

- [ ] Chinese users can read all core docs in their language
- [ ] Web app fully functional in Chinese
- [ ] Terminology is consistent across all translations
- [ ] Native speakers confirm quality and clarity
- [ ] Language switcher works smoothly in both web app and docs
- [ ] Chinese users successfully complete tutorials in Chinese

## Notes

**Existing i18n infrastructure**:
- Docusaurus already has some zh-CN setup in `docs-site/i18n/` (needs completion)
- Web app has no i18n infrastructure yet

**Translation challenges**:
- SDD is new methodology - no established Chinese terminology
- Need to balance literal translation vs cultural adaptation
- Technical terms (tokens, context, agents) have multiple Chinese translations

**Future considerations**:
- Other languages (Japanese, Korean, Spanish)
- Community translation contributions
- Translation memory/consistency tools
- Automated translation quality checks

**Resources needed**:
- Native Chinese speaker for review (critical)
- Budget for professional translation (if not using AI + review)
- Ongoing maintenance commitment
