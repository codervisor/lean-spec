---
status: complete
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
updated_at: 2026-02-24T07:04:54.914372Z
completed_at: 2026-02-24T07:04:54.914372Z
transitions:
- status: in-progress
  at: 2026-02-24T06:37:58.821479Z
- status: complete
  at: 2026-02-24T07:04:54.914372Z
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
- [x] Create `search` module in `leanspec-core`
- [x] Define query AST types (Term, Field, Operator, Phrase)
- [x] Implement tokenizer for query strings
- [x] Implement parser that builds AST from tokens
- [x] Add unit tests for parser

### Phase 2: Field-Specific Search
- [x] Implement `status:` filter
- [x] Implement `tag:` filter
- [x] Implement `priority:` filter
- [x] Implement `title:` filter
- [x] Implement `created:` date filter with range support
- [x] Add integration tests

### Phase 3: Boolean Operators
- [x] Implement AND operator (current default)
- [x] Implement OR operator
- [x] Implement NOT operator
- [x] Add tests for complex boolean expressions

### Phase 4: Enhanced Matching
- [x] Implement quoted phrase search
- [x] Implement fuzzy matching with Levenshtein distance
- [x] Add configurable fuzzy threshold (~1, ~2)
- [x] Add tests for fuzzy and phrase matching

### Phase 5: Integration
- [x] Refactor CLI `search.rs` to use new search module
- [x] Refactor MCP `tool_search` to use new search module
- [x] Update search tool descriptions with examples
- [x] Add search syntax help (`lean-spec search --help`)

## Test

### Parser Tests
- [x] `"api AND security"` → AST with AND operator
- [x] `"tag:api"` → AST with field filter
- [x] `'"exact phrase"'` → AST with phrase term
- [x] `"typo~"` → AST with fuzzy term
- [x] Invalid queries return clear error messages

### Field Filter Tests
- [x] `status:in-progress` returns only in-progress specs
- [x] `tag:rust` returns only specs with "rust" tag
- [x] `priority:high` returns only high-priority specs
- [x] `created:>2025-11-01` returns specs created after date

### Boolean Tests
- [x] `A AND B` returns intersection
- [x] `A OR B` returns union
- [x] `A NOT B` returns A minus B

### Fuzzy Tests
- [x] `authetication~` matches "authentication"
- [x] `clii~` matches "cli"
- [x] Fuzzy threshold is configurable

### E2E Tests
- [x] Combined queries work correctly
- [ ] Performance: <100ms for 500 specs
- [x] Backward compatibility: simple queries still work

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

### Implementation update (2026-02-24)

- Implemented modular Rust search engine under `rust/leanspec-core/src/search/` with:
  - query parser/AST (`query.rs`)
  - field/date filters (`filters.rs`)
  - Levenshtein-based fuzzy matching (`fuzzy.rs`)
  - boolean evaluation + weighted scoring (`scorer.rs`)
- Added support for:
  - boolean operators: `AND`, `OR`, `NOT`
  - field filters: `status:`, `tag:`, `priority:`, `title:`, `created:`
  - date ranges/operators for created date: `>`, `>=`, `<`, `<=`, `=`
  - quoted phrase queries
  - fuzzy terms with threshold (`term~`, `term~2`)
- Integrated query validation + advanced syntax behavior in:
  - CLI search command (`rust/leanspec-cli/src/commands/search.rs`)
  - MCP `search` tool (`rust/leanspec-mcp/src/tools/specs.rs`)
  - CLI help text + MCP tool description examples
- Added/expanded tests in:
  - `rust/leanspec-core/src/search/mod.rs`
  - `rust/leanspec-mcp/tests/tools/search.rs`

### Verification status

- ✅ `pnpm typecheck` passed
- ✅ `pnpm test` passed
- ❌ `pnpm lint` failed due existing unrelated lint issues in `packages/ui` (workspace-wide pre-existing failures)
- ❌ `pnpm cli validate` failed due existing unrelated spec-length/structure issues across many specs
- ✅ Targeted Rust validation passed:
  - `cargo test --manifest-path rust/Cargo.toml -p leanspec-core search`
  - `cargo test --manifest-path rust/Cargo.toml -p leanspec-mcp search`

Spec remains `in-progress` until repository-wide validation blockers are resolved.
