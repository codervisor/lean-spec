---
status: complete
created: '2025-11-17'
tags: []
priority: high
created_at: '2025-11-17T02:12:58.531Z'
updated_at: '2025-11-17T09:15:05.884Z'
transitions:
  - status: in-progress
    at: '2025-11-17T02:14:06.440Z'
  - status: complete
    at: '2025-11-17T02:14:06.656Z'
  - status: planned
    at: '2025-11-17T02:58:36.055Z'
  - status: complete
    at: '2025-11-17T09:15:05.884Z'
completed_at: '2025-11-17T02:14:06.656Z'
completed: '2025-11-17'
---

# Comprehensive Chinese Localization for LeanSpec

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

## Overview

Most early LeanSpec users come from China. Without Chinese localization, we're creating a significant barrier to adoption and understanding.

**Problem**:
- Docs site is English-only
- Web app UI is English-only
- CLI templates and help text are English-only
- Chinese developers struggle to understand SDD methodology
- Lost opportunity to build strong Chinese community

**Key Insight**: This is **tool localization**, not content translation.
- Developers write specs in their native language (Chinese devs write Chinese specs, English devs write English specs)
- We don't duplicate/translate user-created specs
- We translate the framework/tooling that helps them write specs

**Scope of localization**:

1. **Docs Site** (docusaurus) - **Priority 1**
   - Methodology documentation
   - Tutorial content
   - Guides and best practices
   - Navigation and UI elements

2. **Web App** (@leanspec/web) - **Priority 2**
   - UI strings and labels
   - Error messages
   - Help text and tooltips
   - Navigation elements

3. **CLI Templates** (packages/cli/templates/) - **Priority 3**
   - Template boilerplate text
   - Section headers and prompts
   - AGENTS.md instructions

4. **Example Specs** (for teaching)
   - Tutorial examples in docs
   - Demo specs showing methodology
   - NOT translating real project specs

**Out of Scope** (for now):
- CLI help text and error messages (English is acceptable for CLI users)
- On-demand spec translation (future feature for web app)

**Translation requirements**:
- Professional quality (AI-assisted + human review)
- Technical terminology consistency (SDD glossary)
- Cultural adaptation where needed
- Maintain separate language versions (not side-by-side bilingual)

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

### 4. CLI Templates Localization
Add Chinese templates:
- Create `zh-CN` template variants
- Translate boilerplate content
- Localize AGENTS.md instructions
- Language detection for `lean-spec create` (based on system locale)

### 5. Terminology Glossary
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

**Phase 2: Docs Site Translation** (Priority 1)
- [ ] Translate Core Concepts pages
- [ ] Translate "Your First Spec" tutorial (spec 089)
- [ ] Translate Guides and best practices
- [ ] Translate homepage and navigation
- [ ] Test zh-CN docs site build

**Phase 3: Web App Translation** (Priority 2)
- [ ] Extract all UI strings to translation files
- [ ] Translate to Chinese
- [ ] Add language switcher to UI
- [ ] Test web app with Chinese locale

**Phase 4: CLI Templates Translation** (Priority 3)
- [ ] Create Chinese template variants (zh-CN)
- [ ] Translate template boilerplate text
- [ ] Translate AGENTS.md instructions
- [ ] Test Chinese template creation

**Phase 5: Quality & Polish**
- [ ] Native speaker review of translations
- [ ] Cultural adaptation review
- [ ] Fix inconsistencies
- [ ] Create Chinese example specs for docs

**Phase 6: Ongoing Maintenance**
- [ ] Document translation workflow
- [ ] Set up process for new content
- [ ] Build Chinese community for feedback

**Future: Cross-Language Spec Translation** (separate spec, after this)
- On-demand spec translation feature in web app
- Free external API integration
- Markdown parsing to preserve structure
- See "Cross-Language Spec Reading" section above

## Test

- [ ] Chinese users can read all core docs in their language
- [ ] Web app fully functional in Chinese
- [ ] Terminology is consistent across all translations
- [ ] Native speakers confirm quality and clarity
- [ ] Language switcher works smoothly in both web app and docs
- [ ] Chinese users successfully complete tutorials in Chinese

## Cross-Language Spec Reading (Future)

**Problem**: Chinese dev needs to read English specs (or vice versa)

**Solution** (future web app feature):
- On-demand translation via free external API (Google Translate, LibreTranslate, etc.)
- Implemented in web app with "Translate" button
- Parse markdown to preserve structure:
  - Keep frontmatter untranslated
  - Keep code blocks untranslated
  - Translate only prose sections
  - Preserve links and formatting
- Ephemeral translation (not saved, regenerated on demand)
- No caching initially (keep simple)

**Why future implementation**:
- Not blocking initial Chinese adoption
- Users can use external tools meanwhile
- Need to complete functional localization first
- Free API limits may need management

**Implementation priority**: After core localization complete (separate spec)

## Notes

**Existing i18n infrastructure**:
- Docusaurus already has some zh-CN setup in `docs-site/i18n/` (needs completion)
- Web app has no i18n infrastructure yet
- CLI templates are English-only

**Translation challenges**:
- SDD is new methodology - no established Chinese terminology
- Need to balance literal translation vs cultural adaptation
- Technical terms (tokens, context, agents) have multiple Chinese translations
- CLI template localization needs system locale detection

**User-created specs**:
- Developers write specs in their native language
- Chinese devs write Chinese specs, English devs write English specs
- We do NOT translate user specs (that's their content)
- We only translate the framework/tooling

**Future considerations**:
- Other languages (Japanese, Korean, Spanish)
- Community translation contributions
- On-demand spec translation feature (web app)
- Automated translation quality checks

**Resources needed**:
- Native Chinese speaker for review (critical)
- AI-assisted translation + human validation
- Ongoing maintenance commitment
