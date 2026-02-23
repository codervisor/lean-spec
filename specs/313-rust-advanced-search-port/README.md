---
status: planned
created: 2026-02-05
priority: high
tags:
- search
- rust
- cli
- mcp
- gap-closure
- dx
depends_on:
- 182-rust-implementation-gaps
created_at: 2026-02-05T13:38:06.533540Z
updated_at: 2026-02-05T13:38:18.867622Z
---

# Port Advanced Search Features to Rust

## Overview

### Problem

The Rust CLI/MCP search implementation is significantly less capable than the TypeScript version that was deprecated and removed. Key features from specs 075 (Intelligent Search Engine) and 124 (Advanced Search Capabilities) were never ported to Rust.

**Current state after quick fix (this PR)**:
- ✅ Multi-term cross-field matching (terms can appear in any field)
- ✅ Weighted scoring (title > path > tags > content)
- ✅ Case-insensitive search
- ❌ No boolean operators (`AND`, `OR`, `NOT`)
- ❌ No field-specific search (`status:in-progress`, `tag:api`, `priority:high`)
- ❌ No date range filters (`created:>2025-11-01`)
- ❌ No fuzzy matching (typo tolerance)
- ❌ No quoted phrase search (`"exact phrase"`)

**Impact**: Users and AI agents cannot effectively discover specs using natural queries, limiting the usefulness of the search tool.

### Why Now

This is identified as the **#1 critical gap** in spec 182 (Rust Implementation Gaps Analysis). Search is foundational for AI agents and human users to discover relevant specs.

## Design

### Query Grammar (Port from TypeScript spec 124)

```
<query>      ::= <term>+
<term>       ::= <field>:<value> | <boolean> | <phrase> | <word>
<field>      ::= "status" | "tag" | "priority" | "created" | "title"
<boolean>    ::= "AND" | "OR" | "NOT"
<phrase>     ::= '"' <word>+ '"'
<word>       ::= [a-zA-Z0-9_-]+
<fuzzy>      ::= <word> "~"
```

### Examples

```bash
# Boolean operators
lean-spec search "api AND security"
lean-spec search "frontend OR backend"
lean-spec search "api NOT deprecated"

# Field-specific search
lean-spec search "status:in-progress"
lean-spec search "tag:api priority:high"
lean-spec search "created:>2025-11"

# Fuzzy matching
lean-spec search "authetication~"  # finds "authentication"

# Phrase search
lean-spec search '"user authentication"'

# Combined
lean-spec search "tag:api status:planned rust"
```

### Architecture

```
rust/leanspec-core/src/search/
├── mod.rs           # Public API
├── query.rs         # Query parser (AST)
├── scorer.rs        # Relevance scoring
├── fuzzy.rs         # Levenshtein distance
└── filters.rs       # Field filters, date ranges
```

Shared by CLI, MCP, and future HTTP server.

## Plan

### Phase 1: Query Parser Foundation
- [ ] Create `search` module in `leanspec-core`
- [ ] Define query AST types (Term, Field, Operator, Phrase)
- [ ] Implement tokenizer for query strings
- [ ] Implement parser that builds AST from tokens
- [ ] Add unit tests for parser

### Phase 2: Field-Specific Search
- [ ] Implement `status:` filter
- [ ] Implement `tag:` filter
- [ ] Implement `priority:` filter
- [ ] Implement `title:` filter
- [ ] Implement `created:` date filter with range support
- [ ] Add integration tests

### Phase 3: Boolean Operators
- [ ] Implement AND operator (current default)
- [ ] Implement OR operator
- [ ] Implement NOT operator
- [ ] Add tests for complex boolean expressions

### Phase 4: Enhanced Matching
- [ ] Implement quoted phrase search
- [ ] Implement fuzzy matching with Levenshtein distance
- [ ] Add configurable fuzzy threshold (~1, ~2)
- [ ] Add tests for fuzzy and phrase matching

### Phase 5: Integration
- [ ] Refactor CLI `search.rs` to use new search module
- [ ] Refactor MCP `tool_search` to use new search module
- [ ] Update search tool descriptions with examples
- [ ] Add search syntax help (`lean-spec search --help`)

## Test

### Parser Tests
- [ ] `"api AND security"` → AST with AND operator
- [ ] `"tag:api"` → AST with field filter
- [ ] `'"exact phrase"'` → AST with phrase term
- [ ] `"typo~"` → AST with fuzzy term
- [ ] Invalid queries return clear error messages

### Field Filter Tests
- [ ] `status:in-progress` returns only in-progress specs
- [ ] `tag:rust` returns only specs with "rust" tag
- [ ] `priority:high` returns only high-priority specs
- [ ] `created:>2025-11-01` returns specs created after date

### Boolean Tests
- [ ] `A AND B` returns intersection
- [ ] `A OR B` returns union
- [ ] `A NOT B` returns A minus B

### Fuzzy Tests
- [ ] `authetication~` matches "authentication"
- [ ] `clii~` matches "cli"
- [ ] Fuzzy threshold is configurable

### E2E Tests
- [ ] Combined queries work correctly
- [ ] Performance: <100ms for 500 specs
- [ ] Backward compatibility: simple queries still work

## Notes

### Dependencies
- **Builds on**: spec 182 (gap analysis), spec 075 (original TypeScript impl)
- **Depends on**: None (new module)
- **Future**: spec 209 (embeddings search) will build on this

### Reference
- TypeScript query parser: `packages/core/src/search/` (now deleted)
- Spec 124 for query syntax design
- Consider using `strsim` crate for Levenshtein distance

### Alternatives
- **Tantivy**: Full-text search library, but overkill for 100-500 specs
- **Nucleo**: Fuzzy matcher, good for completion but not full search
- **Custom**: Preferred for control and minimal dependencies
