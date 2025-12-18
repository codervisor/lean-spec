---
status: planned
created: '2025-12-18'
priority: high
tags:
  - rust
  - migration
  - gap-analysis
depends_on:
  - 181-typescript-deprecation-rust-migration
created_at: '2025-12-18T12:00:36.562538324+00:00'
---

# Rust Implementation Gaps Analysis

> **Status**: 📅 Planned · **Created**: 2025-12-18 · **Priority**: High · **Tags**: rust, migration, gap-analysis

## Overview

Following the TypeScript deprecation in spec 181, this spec documents the gaps between the removed TypeScript implementation and the current Rust implementation. These gaps should be evaluated for necessity and prioritized for implementation.

**Analysis scope**: ~49,000 lines of TypeScript removed vs Rust implementation

## Feature Gap Analysis

### CLI Commands

| TypeScript Command | Rust Implementation | Status | Priority | Notes |
|--------------------|---------------------|--------|----------|-------|
| `compress` | ❌ Missing | 🔴 Gap | Low | Context compression utility |
| `isolate` | ❌ Missing | 🔴 Gap | Low | Spec isolation for AI context |
| `registry` | ❌ Missing | 🔴 Gap | Medium | Template registry management |
| `viewer` | `view` ✅ | ✅ Done | - | Renamed to `view` in Rust |

**Summary**: 3 missing commands (compress, isolate, registry)

### Validators

| TypeScript Validator | Rust Implementation | Status | Priority | Notes |
|---------------------|---------------------|--------|----------|-------|
| `complexity` | ❌ Missing | 🔴 Gap | High | Token/complexity scoring |
| `corruption` | ❌ Missing | 🟡 Gap | Medium | File corruption detection |
| `dependency-alignment` | ❌ Missing | 🟡 Gap | Medium | Content/frontmatter dep sync |
| `sub-spec` | ❌ Missing | 🟡 Gap | Medium | Sub-spec validation |
| `completion` | ✅ Present | ✅ Done | - | Checklist completion check |
| `frontmatter` | ✅ Present | ✅ Done | - | |
| `line_count` | ✅ Present | ✅ Done | - | |
| `structure` | ✅ Present | ✅ Done | - | |

**Summary**: 4 missing validators

### Utilities

| TypeScript Utility | Rust Implementation | Status | Priority | Notes |
|-------------------|---------------------|--------|----------|-------|
| `atomic-file` | ❌ Missing | 🟡 Gap | Low | Atomic file writes (inlined in UI) |
| `velocity` | ❌ Missing | 🔴 Gap | Medium | Sprint velocity tracking |
| `git-timestamps` | ❌ Missing | 🟡 Gap | Low | Git-based timestamp backfill |
| `pattern-detection` | ❌ Missing | 🟢 Low | Low | Migration pattern detection |
| `variable-resolver` | ❌ Missing | 🟡 Gap | Medium | Template variable resolution |
| `badge-helpers` | ❌ Missing | 🟢 Low | Low | Visual badge generation |
| `completion` | ❌ Missing | 🟡 Gap | Medium | Shell completion scripts |
| `package-manager` | ❌ Missing | 🟢 Low | Low | npm/pnpm/yarn detection |
| `validate-formatter` | ❌ Missing | 🟡 Gap | Medium | Validation output formatting |
| `dependency_graph` | ✅ Present | ✅ Done | - | |
| `insights` | ✅ Present | ✅ Done | - | |
| `stats` | ✅ Present | ✅ Done | - | |
| `token_counter` | ✅ Present | ✅ Done | - | |
| `template_loader` | ✅ Present | ✅ Done | - | |
| `spec_loader` | ✅ Present | ✅ Done | - | |

**Summary**: 10 missing utilities (most are low priority)

### Search Engine

| TypeScript Search | Rust Implementation | Status | Priority | Notes |
|-------------------|---------------------|--------|----------|-------|
| Query parser | ❌ Missing | 🔴 Gap | High | Boolean operators, field filters |
| Scoring engine | ❌ Missing | 🔴 Gap | High | Relevance scoring with weights |
| Context extraction | ❌ Missing | 🟡 Gap | Medium | Search result context/excerpts |
| Date filters | ❌ Missing | 🟡 Gap | Medium | `created:>2025-01-01` syntax |
| Fuzzy matching | ❌ Missing | 🟡 Gap | Low | Typo tolerance |

**Current Rust search**: Simple substring matching (basic implementation)
**TypeScript search**: Advanced query parser with field filters, date ranges, boolean operators

**Summary**: Rust search is significantly less capable than TypeScript version

### MCP Server Tools

| TypeScript MCP Tool | Rust Implementation | Status | Notes |
|--------------------|---------------------|--------|-------|
| `agent_list` | ❌ Missing | 🟡 Gap | AI agent orchestration |
| `agent_run` | ❌ Missing | 🟡 Gap | Dispatch specs to agents |
| `agent_status` | ❌ Missing | 🟡 Gap | Check agent session status |
| `archive` | ❌ Missing | 🟡 Gap | Archive tool |
| `backfill` | ❌ Missing | 🟡 Gap | Timestamp backfill |
| `check` | ❌ Missing | 🟢 Low | Sequence check |
| `files` | ❌ Missing | 🟡 Gap | File listing |
| `list` | ✅ Present | ✅ Done | |
| `view` | ✅ Present | ✅ Done | |
| `create` | ✅ Present | ✅ Done | |
| `update` | ✅ Present | ✅ Done | |
| `validate` | ✅ Present | ✅ Done | |
| `deps` | ✅ Present | ✅ Done | |
| `link` | ✅ Present | ✅ Done | |
| `unlink` | ✅ Present | ✅ Done | |
| `search` | ✅ Present (basic) | 🟡 Gap | Basic vs advanced |
| `board` | ✅ Present | ✅ Done | |
| `tokens` | ✅ Present | ✅ Done | |
| `stats` | ✅ Present | ✅ Done | |

**Summary**: 8 missing MCP tools, search needs enhancement

### Internationalization (i18n)

| Feature | Rust Status | Notes |
|---------|-------------|-------|
| English locale | ❌ Missing | Hardcoded strings in Rust |
| Chinese (zh-CN) locale | ❌ Missing | No i18n support |
| i18n framework | ❌ Missing | No runtime translation |

**Impact**: Users cannot switch CLI language; all output is English-only

### Testing Infrastructure

| TypeScript Test Type | Rust Status | Notes |
|---------------------|-------------|-------|
| Unit tests | ✅ Some coverage | Basic unit tests exist |
| Integration tests | 🟡 Limited | Need more coverage |
| E2E tests | ❌ Missing | No equivalent to TS e2e tests |
| MCP protocol tests | ❌ Missing | Need MCP-specific tests |

**TypeScript had**: ~50+ E2E test files covering CLI workflows

## Priority Ranking

### Critical (Should implement soon)
1. **Advanced search** - Query parser with boolean operators
2. **Complexity validator** - Token/complexity scoring for spec economy

### High Priority
3. **Velocity tracking** - Sprint velocity stats for teams
4. **Validation output formatter** - Better CLI output for validate
5. **Variable resolver** - Template variable expansion

### Medium Priority
6. **Sub-spec validator** - Validate sub-spec relationships
7. **Dependency alignment validator** - Frontmatter/content sync check
8. **Missing MCP tools** - archive, backfill, agent_*, files
9. **Shell completion** - bash/zsh/fish completions
10. **Corruption validator** - File integrity checks

### Low Priority (Nice to have)
11. **compress command** - Context compression
12. **isolate command** - Spec isolation
13. **i18n support** - Multi-language CLI
14. **Badge helpers** - Visual badges
15. **Git timestamp backfill** - Historical data enrichment

## Plan

### Phase 1: Critical Gaps
- [ ] Implement advanced search query parser in Rust
- [ ] Implement complexity validator in Rust
- [ ] Add E2E test infrastructure

### Phase 2: High Priority
- [ ] Implement velocity tracking utility
- [ ] Implement validation output formatter
- [ ] Implement variable resolver for templates

### Phase 3: Medium Priority
- [ ] Add missing MCP tools (archive, backfill, files)
- [ ] Implement sub-spec validator
- [ ] Implement dependency alignment validator
- [ ] Add shell completion generation

### Phase 4: Polish
- [ ] Consider i18n requirements
- [ ] Add compression/isolation commands if needed
- [ ] Improve test coverage

## Recommendations

1. **Search is the biggest gap** - The TypeScript search was significantly more capable. Prioritize implementing the query parser.

2. **Validators are important** - Complexity and sub-spec validation were key features. Should be ported.

3. **MCP tools can wait** - Most commonly used tools exist. Agent tools are niche.

4. **i18n is optional** - Low user demand for non-English CLI.

5. **E2E tests needed** - Rust implementation lacks comprehensive E2E testing that TypeScript had.

## Notes

This analysis was performed by comparing:
- `packages/cli/src/` (~30,000 lines deleted)
- `packages/core/src/` (~19,000 lines deleted)
- `rust/leanspec-cli/src/` (current implementation)
- `rust/leanspec-core/src/` (current implementation)
- `rust/leanspec-mcp/src/` (current implementation)
