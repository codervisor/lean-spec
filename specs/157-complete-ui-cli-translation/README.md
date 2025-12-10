---
status: in-progress
created: '2025-12-09'
tags:
  - i18n
  - ux
  - chinese-market
priority: high
created_at: '2025-12-09T14:27:09.883Z'
depends_on:
  - 091-chinese-localization-strategy
updated_at: '2025-12-09T14:29:54.700Z'
transitions:
  - status: in-progress
    at: '2025-12-09T14:29:54.700Z'
---

# Complete UI and CLI Chinese Translation Implementation

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-09 · **Tags**: i18n, ux, chinese-market

## Overview

**Problem**: Spec 091 completed i18n infrastructure setup but left actual translation integration as "future work". When users switch to Chinese, only the main sidebar menu is translated - everything else remains in English, creating a poor user experience for Chinese users.

**Current State**:
- ✅ i18n infrastructure exists (react-i18next, i18next)
- ✅ Translation files created (`packages/ui/src/locales/`, `packages/cli/src/locales/`)
- ✅ Language switcher component works
- ✅ Only 2 UI components use translations: `main-sidebar.tsx`, `language-switcher.tsx`
- ❌ CLI commands don't use translations at all (hardcoded English)
- ❌ 30+ UI components still have hardcoded English text

**Impact**:
- Chinese users see mostly English UI despite choosing Chinese
- Poor first impression for our primary target market
- Incomplete feature undermines trust in product quality

**Scope**:
1. Integrate translations into all UI components
2. Integrate translations into all CLI commands
3. Add missing translation keys to translation files
4. Ensure consistent terminology per spec 115 guidelines

**Out of Scope**:
- Creating new translations (use existing zh-CN files)
- Translating user-generated content (specs)
- Adding new languages beyond en/zh-CN

## Design

### Technical Approach

**Phase 1: Audit & Extract**
1. Identify all components with hardcoded English text
2. Extract strings to translation files
3. Group by namespace (common, errors, help, etc.)

**Phase 2: UI Component Integration**

**Pattern**: Replace hardcoded strings with `useTranslation()` hook

```tsx
// Before
<Button>Create New Spec</Button>

// After
const { t } = useTranslation('common');
<Button>{t('actions.createNewSpec')}</Button>
```

**Components requiring translation** (priority order):
1. **High Priority** (user-facing):
   - Navigation components (quick-search, navigation.tsx)
   - Spec pages (spec-detail-client, specs-client)
   - Status/Priority badges
   - Empty states
   - Forms and dialogs (create-project-dialog, editable-spec-metadata)

2. **Medium Priority**:
   - Stats page (stats-client)
   - Dependencies (spec-dependency-graph)
   - Timeline (spec-timeline)
   - Context viewer (context-client, context-file-viewer)

3. **Low Priority**:
   - Tooltips and help text
   - Accessibility labels (sr-only text)
   - Error boundaries

**Phase 3: CLI Command Integration**

**Pattern**: Import i18n and use `t()` function

```typescript
// Before
.description('List all specs')

// After
import i18n from '../lib/i18n/config.js';
.description(i18n.t('commands.list.description', { ns: 'commands' }))
```

**Commands requiring translation** (all in `packages/cli/src/commands/`):
- archive.ts
- backfill.ts
- board.ts
- check.ts
- create.ts
- deps.ts
- files.ts
- init.ts
- link.ts
- list.ts
- search.ts
- stats.ts
- tokens.ts
- unlink.ts
- update.ts
- validate.ts
- view.ts

**Translation Namespaces**:
- `common`: Shared UI strings (actions, navigation, labels)
- `errors`: Error messages and warnings
- `help`: Help text and tooltips
- `commands`: CLI command descriptions
- `templates`: Template section headers

### Translation Guidelines

Follow spec 115 and docs-site/AGENTS.md:

**Keep in English**: Spec, CLI, Token, README, frontmatter, MCP, Agent
**Translate naturally**: Avoid literal word-by-word translation
**Consistency**: Use established translations from existing files

## Plan

**Phase 1: Infrastructure Preparation** (1 day)
- [x] Create spec 157
- [ ] Audit all UI components for hardcoded strings
- [ ] Audit all CLI commands for hardcoded strings
- [ ] Create comprehensive translation key mapping

**Phase 2: Translation File Updates** (2 days)
- [ ] Add missing keys to `packages/ui/src/locales/zh-CN/*.json`
  - [x] Context viewer + summary strings (2025-12-10)
- [ ] Add missing keys to `packages/cli/src/locales/zh-CN/*.json`
  - [x] Help/command group headings (2025-12-10)
- [ ] Organize keys by component/feature
- [ ] Verify consistency with spec 115 guidelines

**Phase 3: UI Component Integration** (3-4 days)
- [ ] High priority components (navigation, spec pages, badges)
- [ ] Medium priority components (stats, dependencies, timeline)
  - [x] Project context (context-client, context-file-viewer, context-file-detail) localized (2025-12-10)
- [ ] Low priority components (tooltips, labels)
- [ ] Add 'use client' directive where needed
- [ ] Test each component after integration

**Phase 4: CLI Command Integration** (2 days)
- [x] Update all command descriptions
- [ ] Update error messages in commands
- [ ] Update output messages (success/warning text)
- [x] Update help text
- [ ] Test each command with zh-CN locale

**Phase 5: Testing & Polish** (1 day)
- [ ] Manual testing: Switch to Chinese and test all features
- [ ] Verify sidebar, navigation, spec pages work in Chinese
- [ ] Verify CLI commands show Chinese output
- [ ] Fix any missing translations or formatting issues
- [ ] Native speaker review (if available)

**Phase 6: Documentation** (0.5 days)
- [ ] Update docs/i18n/README.md with component examples
- [ ] Document translation workflow for future contributors
- [ ] Add screenshots showing translated UI

## Test

**UI Translation Tests**:
- [ ] Language switcher toggles between English and Chinese
- [ ] Main navigation fully translated
- [ ] Spec list page fully translated
- [ ] Spec detail page fully translated
- [ ] Stats page fully translated
- [ ] Dependencies page fully translated
- [ ] Status badges show Chinese text
- [ ] Priority badges show Chinese text
- [ ] Empty states show Chinese text
- [ ] Error messages show Chinese text
- [ ] Forms and dialogs show Chinese text
- [ ] No hardcoded English visible in Chinese mode

**CLI Translation Tests**:
- [ ] `LANG=zh-CN lean-spec list` shows Chinese output
- [ ] `LANG=zh-CN lean-spec create --help` shows Chinese help
- [ ] Command errors display in Chinese
- [ ] Template section headers in Chinese (when locale is zh-CN)
- [ ] All commands respect locale setting

**Consistency Tests**:
- [ ] Terminology matches spec 115 guidelines
- [ ] "Spec" never translated to 规格/规范
- [ ] Status values remain in English: `planned`, `in-progress`, etc.
- [ ] Technical terms consistent across UI and CLI

**Regression Tests**:
- [ ] All existing tests still pass
- [ ] English mode unchanged
- [ ] No performance degradation

## Notes

### Progress Log
- **2025-12-10**
  - Localized the project context surfaces (context-client, context-file-viewer, context-file-detail) and expanded both en/zh locale files with dedicated context keys.
  - Introduced CLI localization helpers so every registered command pulls its description/usage from `commands.json`, auto-localizes standard option descriptions, and rebuilds the grouped help/Examples section from translated metadata.

**Component Audit Summary**:

**UI Components Needing Translation** (~35 components):
- Navigation: navigation.tsx, quick-search.tsx, project-switcher.tsx
- Spec pages: spec-detail-client.tsx, specs-client.tsx, spec-detail-wrapper.tsx
- Editors: editable-spec-metadata.tsx, status-editor.tsx, priority-editor.tsx, tags-editor.tsx
- Badges: status-badge.tsx, priority-badge.tsx
- Empty states: empty-state.tsx
- Stats: stats-client.tsx
- Dependencies: spec-dependency-graph.tsx
- Context: context-client.tsx, context-file-viewer.tsx, context-file-detail.tsx
- Timeline: spec-timeline.tsx
- Sidebars: spec-sidebar.tsx, specs-nav-sidebar.tsx
- Dialogs: create-project-dialog.tsx
- Misc: table-of-contents.tsx, sub-spec-tabs.tsx, skeletons.tsx

**CLI Commands Needing Translation** (~17 commands):
All commands in `packages/cli/src/commands/*.ts`

**Existing Translation Coverage**:
- packages/ui/src/locales/zh-CN/common.json: ~60 keys (mostly navigation)
- packages/ui/src/locales/zh-CN/errors.json: ~10 keys
- packages/ui/src/locales/zh-CN/help.json: ~5 keys
- packages/cli/src/locales/zh-CN/commands.json: ~140 keys (descriptions only, not integrated)
- packages/cli/src/locales/zh-CN/errors.json: ~30 keys (not integrated)
- packages/cli/src/locales/zh-CN/templates.json: ~20 keys (not integrated)

**Estimated Work**:
- Translation keys already exist (done in spec 091)
- Need to integrate ~200-300 translation keys across 50+ files
- Most changes are mechanical (find string, wrap with t())
- Main challenge: ensuring no strings are missed

**Dependencies**:
- Depends on spec 091 (infrastructure complete)
- Blocks Chinese user adoption
- Should complete before any major marketing push to Chinese market

**Resources**:
- Translation quality already validated in spec 091
- No new translations needed
- Can leverage existing test infrastructure from spec 091
