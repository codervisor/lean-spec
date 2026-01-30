---
status: archived
created: 2025-12-04
priority: low
tags:
- i18n
- web-app
- future
depends_on:
- 091-chinese-localization-strategy
created_at: 2025-12-04T12:42:25.749Z
updated_at: 2026-01-30T01:46:09.248945Z
transitions:
- status: archived
  at: 2026-01-30T01:46:09.248945Z
---

# On-Demand Spec Translation

> **Status**: 🗓️ Planned · **Priority**: Low · **Created**: 2025-12-04 · **Tags**: i18n, web-app, future

## Overview

**Problem**: Developers may need to read specs written in languages they don't understand. For example, a Chinese developer needs to read English specs from an open-source project, or an English-speaking contributor needs to understand Chinese specs.

**Solution**: Add on-demand translation feature to the web app:
- "Translate" button in spec viewer
- Uses external translation API (Google Translate, LibreTranslate, etc.)
- Markdown-aware parsing to preserve structure
- Ephemeral translation (not saved, regenerated on demand)

**Key insight**: This is different from tool localization (spec 091). This translates user-created spec content, not the framework/tooling.

## Design

**Markdown-aware translation**:
- Parse markdown to identify translatable sections
- Keep frontmatter untranslated (YAML keys)
- Keep code blocks untranslated
- Keep file paths and links untranslated
- Translate only prose sections
- Preserve formatting (bold, headers, lists, etc.)

**API options**:
1. **Google Translate API** - High quality, has costs
2. **LibreTranslate** - Free, self-hostable
3. **DeepL** - High quality for supported languages
4. **OpenAI/Claude** - Context-aware, more expensive

**UI integration**:
- "Translate" button in spec viewer header
- Language selector dropdown
- Loading indicator during translation
- Toggle between original/translated view

## Plan

- [ ] Research and select translation API
- [ ] Implement markdown parser to extract translatable sections
- [ ] Build translation service layer
- [ ] Add "Translate" button to spec viewer UI
- [ ] Implement language selector
- [ ] Add original/translated toggle
- [ ] Handle API rate limits and errors
- [ ] Test with various spec formats

## Test

- [ ] Chinese specs translate correctly to English
- [ ] English specs translate correctly to Chinese
- [ ] Code blocks remain untranslated
- [ ] Frontmatter remains untranslated
- [ ] Markdown formatting preserved after translation
- [ ] API errors handled gracefully

## Notes

**Why low priority**:
- Users can use external translation tools (browser translate, etc.)
- Core localization (spec 091) should complete first
- Requires API integration and potential costs

**Future considerations**:
- Caching translations for frequently accessed specs
- Supporting more languages
- Offline translation capability
