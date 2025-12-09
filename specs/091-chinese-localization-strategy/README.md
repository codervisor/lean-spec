---
status: in-progress
created: '2025-11-17'
tags: []
priority: high
created_at: '2025-11-17T02:12:58.531Z'
updated_at: '2025-12-09T14:08:31.796Z'
transitions:
  - status: in-progress
    at: '2025-11-17T02:14:06.440Z'
  - status: complete
    at: '2025-11-17T02:14:06.656Z'
  - status: planned
    at: '2025-11-17T02:58:36.055Z'
  - status: complete
    at: '2025-11-17T09:15:05.884Z'
  - status: planned
    at: '2025-11-17T12:52:05.092Z'
  - status: in-progress
    at: '2025-12-09T14:08:31.796Z'
completed_at: '2025-11-17T02:14:06.656Z'
completed: '2025-11-17'
depends_on:
  - 064-docs-site-zh-translation
  - 095-pr-migration-verification
---

# Comprehensive Chinese Localization for LeanSpec

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-11-17

**Project**: lean-spec  
**Team**: Core Development

**Current Progress**: Docs-site i18n complete (spec 064). Web app and CLI i18n not yet started.

## Overview

Most early LeanSpec users come from China. Without Chinese localization, we're creating a significant barrier to adoption and understanding.

**Problem**:
- Web app UI is English-only
- CLI (templates, help text, error messages) is English-only
- Lost opportunity to build strong Chinese community

**Key Insight**: This is **tool localization**, not content translation.
- Developers write specs in their native language (Chinese devs write Chinese specs, English devs write English specs)
- We don't duplicate/translate user-created specs
- We translate the framework/tooling that helps them write specs

**Scope of localization**:

1. ~~**Docs Site** (docusaurus)~~ - ✅ COMPLETE (spec 064)

2. **Web App** (@leanspec/ui) - **Priority 1**
   - UI strings and labels
   - Error messages
   - Help text and tooltips
   - Navigation elements

3. **CLI** (packages/cli/) - **Priority 2**
   - Help text and command descriptions
   - Error messages and warnings
   - Template boilerplate text
   - Section headers and prompts
   - AGENTS.md instructions

**Out of Scope**:
- On-demand spec translation (separate spec)

**Translation requirements**:
- Professional quality (AI-assisted + human review)
- Technical terminology consistency (follow spec 115 guidelines)
- Natural Chinese expression (avoid literal word-by-word translation)
- Keep core technical terms in English (Spec, Token, Agent, etc.)
- Cultural adaptation where needed
- Maintain separate language versions (not side-by-side bilingual)

## Design

**Technical approach**:

### 1. Web App i18n
Implement i18n library for React:
- Use `react-i18next` or similar
- Extract all UI strings to translation files
- Language switcher in UI
- Persist language preference
- Load translations dynamically

**Translation file structure**:
```
packages/ui/src/locales/
  en/
    common.json
    errors.json
    help.json
  zh-CN/
    common.json
    errors.json
    help.json
```

### 2. CLI i18n
Add Chinese localization for CLI:
- Use i18n library (e.g., `i18next` or custom solution)
- Extract all user-facing strings to translation files
- Detect system locale for default language
- Allow language override via config or flag
- Create Chinese template variants

**What to translate**:
- Command help text (`--help` output)
- Command descriptions
- Error messages and warnings
- Interactive prompts
- Template boilerplate content
- AGENTS.md instructions

**Translation file structure**:
```
packages/cli/src/locales/
  en/
    commands.json
    errors.json
    templates.json
  zh-CN/
    commands.json
    errors.json
    templates.json
```

### 3. Translation Management
**Options**:
1. **Manual**: Maintain JSON/markdown files in repo (simple, full control)
2. **Crowdin/Lokalise**: Translation management platform (scalable)
3. **AI-assisted**: Use AI for first pass, human review (fast, needs validation)

**Recommendation**: Start with option 3 (AI + human review), move to option 2 if community grows

### 4. Terminology Glossary

**Translation Principles** (established in spec 115, documented in docs-site/AGENTS.md):

**Always Keep in English:**
- Spec (❌ NOT 规格/规范)
- LeanSpec (❌ NOT 精益规范)
- CLI (❌ NOT 命令行界面)
- Token (❌ NOT 令牌/标记)
- README (❌ NOT 说明文件)
- frontmatter (❌ NOT 前置元数据)
- MCP (❌ NOT 模型上下文协议)
- Agent (⚠️ Use "AI Agent" or "智能体" - for AI agents, use "AI Agent" in technical contexts or "智能体" for natural Chinese)
- Commands: `lean-spec create`, `lean-spec update`, etc.
- Status values: `planned`, `in-progress`, `complete`, `archived`
- File types: `.md`, `.mdx`, `.json`, `.yaml`

**Translate with English Reference** (first use only, then Chinese only):
- Context Economy → 上下文经济 (Context Economy)
- Signal-to-Noise → 信噪比 (Signal-to-Noise Ratio)
- Progressive Disclosure → 渐进式披露 (Progressive Disclosure)
- Dependency Graph → 依赖图 (Dependency Graph)
- Working Memory → 工作记忆 (Working Memory)
- Intent Over Implementation → 意图优于实现 (Intent Over Implementation)
- Bridge the Gap → 弥合差距 (Bridge the Gap)
- Spec-Driven Development → 规格驱动开发 (Spec-Driven Development, SDD)

**Pure Chinese Translation** (common terms, no English reference needed):
- Overview → 概述
- Getting Started → 快速开始
- Tutorial → 教程
- Examples → 示例
- Installation → 安装
- Configuration → 配置
- Usage → 使用
- Reference → 参考
- FAQ → 常见问题
- Best Practices → 最佳实践

Maintain consistency across all translations

## Plan

**Phase 1: Foundation**
- [x] Create SDD terminology glossary (Chinese) - Done in spec 064
- [x] Establish natural translation guidelines - Done in spec 115
- [x] Set up Docusaurus i18n configuration - Done in spec 064
- [ ] Set up web app i18n infrastructure (react-i18next)
- [ ] Set up CLI i18n infrastructure
- [ ] Create translation file structures

**Phase 2: Docs Site Translation** - ✅ COMPLETE (spec 064)
- [x] Translate Core Concepts pages
- [x] Translate "Your First Spec" tutorial (spec 089)
- [x] Translate Guides and best practices
- [x] Translate homepage and navigation
- [x] Test zh-CN docs site build

**Phase 3: Web App Translation** (Priority 1) - 🔴 NOT STARTED
- [ ] Extract all UI strings to translation files
- [ ] Translate to Chinese
- [ ] Add language switcher to UI
- [ ] Test web app with Chinese locale

**Phase 4: CLI Translation** (Priority 2) - 🔴 NOT STARTED
- [ ] Extract all CLI strings to translation files
- [ ] Translate help text and command descriptions
- [ ] Translate error messages and warnings
- [ ] Create Chinese template variants (zh-CN)
- [ ] Translate template boilerplate text
- [ ] Translate AGENTS.md instructions
- [ ] Implement locale detection
- [ ] Test CLI with Chinese locale

**Phase 5: Quality & Polish**
- [x] Native speaker review of translations (docs-site done)
- [ ] Cultural adaptation review (web app, CLI)
- [x] Fix inconsistencies (docs-site)

**Phase 6: Ongoing Maintenance**
- [x] Document translation workflow (docs-site done)
- [ ] Set up process for new content (web app, CLI)
- [ ] Build Chinese community for feedback

## Test

**Docs-site (completed in spec 064):**
- [x] Chinese users can read all core docs in their language
- [x] Terminology is consistent across all translations (docs-site)
- [x] Language switcher works smoothly in docs

**Web app (not yet implemented):**
- [ ] Web app fully functional in Chinese
- [ ] Language switcher works in web app
- [ ] Native speakers confirm quality and clarity (web app)

**CLI (not yet implemented):**
- [ ] CLI help text displays in Chinese when locale is zh-CN
- [ ] Error messages display in Chinese
- [ ] Chinese templates work correctly
- [ ] Locale detection works properly

## Notes

**Existing i18n infrastructure**:
- Docusaurus i18n complete in `docs-site/i18n/zh-Hans/`
- Web app has no i18n infrastructure yet
- CLI has no i18n infrastructure yet

**Translation challenges**:
- SDD is new methodology - keep core terms in English for clarity
- Balance natural Chinese expression with technical precision
- Avoid literal word-by-word translation (e.g., NOT 规格说明, 令牌)
- Maintain consistency with established guidelines (spec 115)
- CLI localization needs system locale detection

**User-created specs**:
- Developers write specs in their native language
- Chinese devs write Chinese specs, English devs write English specs
- We do NOT translate user specs (that's their content)
- We only translate the framework/tooling

**Future considerations**:
- Other languages (Japanese, Korean, Spanish)
- Community translation contributions
- Automated translation quality checks

**Resources needed**:
- Native Chinese speaker for review (critical)
- AI-assisted translation + human validation
- Ongoing maintenance commitment
