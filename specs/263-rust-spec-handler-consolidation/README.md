---
status: in-progress
created: 2026-01-30
priority: high
tags:
- refactoring
- rust
- backend
parent: 259-technical-debt-refactoring
created_at: 2026-01-30T09:19:49.348075Z
updated_at: 2026-01-30T09:57:33.195316Z
transitions:
- status: in-progress
  at: 2026-01-30T09:57:33.195316Z
---

# Rust Spec Handler Consolidation

## Overview

Reduce duplication between MCP and HTTP spec handlers by extracting shared logic into leanspec-core utilities and modularizing oversized handler files.

## Design

- Shared spec operations (hashing, frontmatter handling, list/detail mapping) move into leanspec-core utilities.
- rust/leanspec-http/src/handlers/specs.rs uses core helpers instead of local copies.
- rust/leanspec-mcp/src/tools.rs is split into focused modules for readability and reuse.

## Plan

- [ ] Identify duplicated helpers in rust/leanspec-http/src/handlers/specs.rs, rust/leanspec-http/src/types.rs, and rust/leanspec-sync-bridge/src/main.rs (e.g., hash_content).
- [ ] Add shared helpers in rust/leanspec-core/src/utils (or a new utils submodule) and update imports.
- [ ] Refactor HTTP handlers to rely on core helpers for hashing and common transformations.
- [ ] Split rust/leanspec-mcp/src/tools.rs into modules (e.g., specs, relationships, validation, templates) without changing behavior.
- [ ] Verify no duplicate hashing functions remain outside core utilities.

## Test

- [ ] cargo clippy -- -D warnings
- [ ] All existing Rust tests pass

## Notes

Keep public API behavior identical; this is structural refactoring only.