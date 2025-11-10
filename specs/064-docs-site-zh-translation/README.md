---
status: complete
created: '2025-11-10'
tags:
  - docs
  - i18n
  - translation
  - chinese
priority: medium
created_at: '2025-11-10T14:32:32.477Z'
updated_at: '2025-11-10T15:12:43.784Z'
transitions:
  - status: in-progress
    at: '2025-11-10T15:12:07.668Z'
  - status: complete
    at: '2025-11-10T15:12:43.784Z'
completed_at: '2025-11-10T15:12:43.784Z'
completed: '2025-11-10'
---

# Docs Site Chinese (ZH) Translation

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-10 · **Tags**: docs, i18n, translation, chinese

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add Chinese (Simplified) translation support to the LeanSpec documentation site to expand reach to Chinese-speaking developers. Docusaurus has built-in i18n support that makes this straightforward.

**Why**: China has a large developer community, and Chinese documentation significantly lowers adoption barriers for non-English speakers.

**Scope**: 
- Translation infrastructure setup (i18n config)
- Initial translation of core documentation pages
- Translation workflow and guidelines for maintainability

**Out of scope**: Traditional Chinese (can be added later), automatic translation (manual/human translation only for quality).

## Design

### Docusaurus i18n Architecture

Docusaurus provides built-in i18n support with locale-based file organization:

```
docs-site/
  i18n/
    zh-Hans/           # Chinese Simplified
      docusaurus-plugin-content-docs/
        current/       # Translated docs/
          intro.md
          getting-started.md
          ...
      docusaurus-plugin-content-blog/
        ...            # Translated blog posts
      code.json        # UI labels, nav items
```

**Key decisions**:
1. **Use `zh-Hans` (Simplified Chinese)** - Most widely used in mainland China
2. **Manual translation** - Ensures quality and proper context
3. **Progressive translation** - Start with high-value pages (getting started, core concepts)
4. **Maintain English as source of truth** - Chinese follows English updates

### Translation Priority

**Phase 1 (Initial Launch)** - Critical path pages:
- Homepage
- Getting Started guide
- Core Concepts section
- Quick Start tutorial
- Navigation/UI elements

**Phase 2** - Feature documentation:
- CLI Commands reference
- Frontmatter reference
- Workflow guides
- Templates guide

**Phase 3** - Advanced content:
- Blog posts
- Advanced guides
- Contributing guide
- API documentation

## Plan

### Setup i18n Infrastructure
- [ ] Add Chinese locale to `docusaurus.config.ts`
- [ ] Configure locale routing and language switcher
- [ ] Create `i18n/zh-Hans/` directory structure
- [ ] Set up translation workflow documentation

### Translate Core Pages (Phase 1)
- [ ] Homepage (`index.tsx` or homepage content)
- [ ] Getting Started guide
- [ ] Core Concepts overview
- [ ] Quick Start tutorial
- [ ] Navigation labels (`code.json`)
- [ ] Common UI strings (buttons, labels, etc.)

### Quality & Workflow
- [ ] Create translation style guide (terminology, tone)
- [ ] Document translation workflow for contributors
- [ ] Add translation status tracking (which pages are translated)
- [ ] Test locale switching and URL routing

### Deployment
- [ ] Verify build process includes Chinese locale
- [ ] Test Chinese site on Vercel preview
- [ ] Add Chinese docs link to main README.md (near documentation links)
- [ ] Add language badge/notice in docs site
- [ ] Deploy to production

## Test

**Build & Navigation**:
- [ ] `npm run build` succeeds with Chinese locale
- [ ] Language switcher appears and works correctly
- [ ] Chinese URLs route properly (`/zh-Hans/docs/...`)
- [ ] All translated pages render without errors

**Content Quality**:
- [ ] Chinese text displays correctly (encoding, fonts)
- [ ] Technical terms translated consistently
- [ ] Code examples remain in English (code itself)
- [ ] Links point to correct locale (Chinese → Chinese)

**Fallback Behavior**:
- [ ] Untranslated pages show English version with notice
- [ ] Navigation works even with partial translation
- [ ] Language switcher shows translation progress

## Notes

**Docusaurus i18n commands**:
```bash
# Run dev server with Chinese locale
npm run start -- --locale zh-Hans

# Build with all locales
npm run build

# Write translations (extracts default text)
npm run write-translations -- --locale zh-Hans
```

**Translation resources**:
- Docusaurus i18n guide: https://docusaurus.io/docs/i18n/introduction
- Chinese technical writing style: Focus on clarity, avoid overly formal language
- Terminology: Consider creating glossary (e.g., "spec" → "规范文档")

**Accessibility for Chinese developers**:
- Add link in main README.md (near existing documentation links)
  - Format: `[中文文档](https://www.lean-spec.dev/zh-Hans/)` or similar
  - Place prominently so it's discoverable without scrolling
- Consider adding language badge/selector notice in docs header
- Chinese URL will be: `https://www.lean-spec.dev/zh-Hans/`

**Maintenance considerations**:
- English docs are source of truth - Chinese translations may lag behind
- Consider adding translation status badges to indicate freshness
- May need community contributions to keep translations current

**Future enhancements**:
- Traditional Chinese (`zh-Hant`) for Taiwan/Hong Kong
- Japanese (`ja`) or other languages
- Automated translation sync detection (flag outdated translations)
