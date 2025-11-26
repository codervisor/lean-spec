---
status: planned
created: '2025-11-26'
tags:
  - search
  - cli
  - mcp
  - core
  - dx
  - power-users
priority: medium
created_at: '2025-11-26T06:26:37.183Z'
---

# Advanced Search Capabilities for Specs

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-26

**Project**: lean-spec  
**Team**: Core Development

## Overview

The current search (075-intelligent-search-engine) provides basic relevance-ranked search across spec content. While functional, it lacks power-user features needed for complex queries in larger projects. This spec proposes advanced search capabilities to improve discovery and navigation.

## Problem

### Critical: Strict ALL-terms matching

Current search requires ALL query terms to appear in a SINGLE field/line to match:

```bash
# Query: "AI agent integration coding agent orchestration" (6 terms)
# Result: 0 matches (or very few) because no single line contains all 6 terms

# Even though spec 123-ai-coding-agent-integration clearly matches conceptually
```

**Root cause**: `containsAllTerms()` in `packages/core/src/search/engine.ts` requires every term in a single line/field.

### Other limitations

- No boolean operators (`AND`, `OR`, `NOT`)
- No field-specific search (`status:in-progress`, `tag:api`)
- No date range filters (`created:>2025-11-01`)
- No fuzzy/typo-tolerant matching
- No search history or saved queries
- No cross-field term matching (term A in title, term B in content)

## Design

### Immediate Fix: Cross-field matching (Phase 1)

Change from "all terms in one field" to "all terms across entire spec":

```typescript
// Current: containsAllTerms(line, queryTerms) - each line must have ALL terms
// Proposed: Match if spec contains all terms across ANY fields

function specContainsAllTerms(spec: SearchableSpec, terms: string[]): boolean {
  const allText = [spec.title, spec.name, spec.tags?.join(' '), spec.content].join(' ');
  return terms.every(term => allText.toLowerCase().includes(term));
}
```

### Query Syntax (Phase 2)

```bash
# Boolean operators
lean-spec search "api AND authentication"
lean-spec search "frontend OR backend"  
lean-spec search "api NOT deprecated"

# Field-specific search
lean-spec search "status:in-progress"
lean-spec search "tag:api priority:high"
lean-spec search "assignee:marvin"
lean-spec search "title:dashboard"

# Date range filters
lean-spec search "created:>2025-11-01"
lean-spec search "created:2025-11-01..2025-11-15"

# Fuzzy matching
lean-spec search "authetication~"  # matches "authentication"

# Combined
lean-spec search "tag:api status:planned created:>2025-11"
```

### Approach

1. **Parser** - Tokenize query into structured AST
2. **Field matchers** - Map field prefixes to frontmatter/content
3. **Fuzzy engine** - Levenshtein distance for typo tolerance
4. **Combine with existing** - Layer on top of 075 relevance scoring

## Plan

### Phase 1: Fix cross-field matching (High Priority)
- [ ] Change `containsAllTerms` to check across entire spec, not per-field
- [ ] Keep per-field scoring but allow spec-level term matching
- [ ] Add unit tests for multi-term queries

### Phase 2: Advanced query syntax
- [ ] Design query grammar and AST structure
- [ ] Implement query parser with field extraction
- [ ] Add boolean operator support (AND/OR/NOT)
- [ ] Add date range filter support
- [ ] Add fuzzy matching option
- [ ] Update CLI search command
- [ ] Update MCP search tool
- [ ] Add search syntax help command

## Test

### Phase 1 tests
- [ ] `"AI agent integration coding orchestration"` finds spec 123
- [ ] Multi-term queries return relevant specs even if terms span fields
- [ ] Scoring still reflects per-field relevance

### Phase 2 tests
- [ ] Parse `"tag:api AND status:planned"` correctly
- [ ] Date range `created:>2025-11-01` filters as expected
- [ ] Fuzzy `authetication~` matches `authentication`
- [ ] Combined queries return correct intersections
- [ ] Invalid syntax provides helpful error messages

## Notes

- Consider backward compatibility - simple queries should work as before
- May want search syntax cheatsheet in `--help`
- Evaluate if saved searches are worth the complexity

### Implemented: Query guidance for AI agents

Updated MCP search tool description and AGENTS.md with search query best practices:
- Use 2-4 specific terms
- Use filters instead of long queries
- Good/poor query examples
