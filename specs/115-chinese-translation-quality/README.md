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

### Translation Glossary

**Full glossary in `docs-site/AGENTS.md` - Key terms below:**

**Always Keep in English:**

| English | Chinese (Don't Use) | Usage |
|---------|-------------------|--------|
| Spec | ❌ 规格/规范 | "创建新 Spec" ✅ |
| LeanSpec | ❌ 精益规范 | "LeanSpec 方法论" ✅ |
| CLI | ❌ 命令行界面 | "使用 CLI 命令" ✅ |
| Token | ❌ 令牌/标记 | "Token 数量" ✅ |
| README | ❌ 说明文件 | "README.md 文件" ✅ |
| frontmatter | ❌ 前置元数据 | "frontmatter 配置" ✅ |
| MCP | ❌ 模型上下文协议 | "MCP 服务器" ✅ |
| Agent | ⚠️ Use "AI Agent" or "智能体" | For AI agents, use "AI Agent" in technical contexts or "智能体" for natural Chinese |

**Translate with English Reference (First Use):**

| English | Chinese Translation | First Use Example |
|---------|-------------------|------------------|
| Context Economy | 上下文经济 | "上下文经济 (Context Economy) 原则" |
| Signal-to-Noise | 信噪比 | "信噪比 (Signal-to-Noise) 最大化" |
| Progressive Disclosure | 渐进式披露 | "渐进式披露 (Progressive Disclosure)" |
| Dependency Graph | 依赖图 | "查看依赖图 (Dependency Graph)" |
| Working Memory | 工作记忆 | "适应工作记忆 (Working Memory)" |
| Intent Over Implementation | 意图优于实现 | "意图优于实现 (Intent Over Implementation)" |
| Bridge the Gap | 弥合差距 | "弥合差距 (Bridge the Gap)" |
| Spec-Driven Development | 规格驱动开发 | "规格驱动开发 (Spec-Driven Development, SDD)" |

**Pure Chinese Translation (Common Terms):**

| English | Chinese | Notes |
|---------|---------|-------|
| Overview | 概述 | Common, no English needed |
| Getting Started | 快速开始 | Standard phrase |
| Tutorial | 教程 | Common term |
| Examples | 示例 | Common term |
| Installation | 安装 | Common action |
| Configuration | 配置 | Common term |
| Usage | 使用 | Common term |
| Reference | 参考 | Common term |
| FAQ | 常见问题 | Common term |
| Best Practices | 最佳实践 | Common phrase |
