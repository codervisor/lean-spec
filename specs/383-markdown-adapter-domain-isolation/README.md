---
status: planned
created: 2026-05-14
priority: critical
tags:
- architecture
- refactoring
- crate-boundaries
- prerequisite
depends_on:
- "381-tool-agnostic-spec-framework"
- "382-pivot-implementation-plan"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Markdown Adapter Domain Isolation

## Overview

The `leanspec-core` crate currently re-exports markdown-specific internals
(`SpecLoader`, `SpecWriter`, `SpecArchiver`, `SpecInfo`, `SpecStatus`,
`SpecPriority`, `SpecFrontmatter`, `SpecFilterOptions`) from its root `pub use`
block. Every downstream crate (`leanspec-cli`, `leanspec-http`) imports them
directly, bypassing the adapter layer entirely.

This spec makes the crate boundary real: markdown-specific code moves into
`adapters/markdown/`, old types are removed from the crate root re-exports, and
`spec_ops/content.rs` utilities become pure string functions. The deliverable is
a compiler-guided migration map — not fixed code, but every coupling point
surfaced as a compile error for downstream specs to resolve.

This is the prerequisite for every other spec in the major upgrade.

## Design

### Module restructuring

`spec_ops/` submodules move into `adapters/markdown/` as private modules:

```
rust/leanspec-core/src/
├── adapters/
│   ├── mod.rs
│   ├── registry.rs
│   └── markdown/
│       ├── mod.rs          ← MarkdownAdapter (pub struct)
│       ├── loader.rs       ← SpecLoader (private)
│       ├── writer.rs       ← SpecWriter (private)
│       ├── archiver.rs     ← SpecArchiver (private)
│       ├── content.rs      ← pure string utilities (pub within adapters)
│       ├── graph.rs        ← DependencyGraph (private)
│       └── types.rs        ← SpecInfo, SpecStatus, SpecPriority,
│                              SpecFrontmatter, SpecFilterOptions (pub)
├── model.rs
├── spec_ops/               ← DELETED (contents distributed above)
└── types/
    ├── config.rs           ← LeanSpecConfig (unchanged, stays public)
    └── spec.rs             ← DELETED (contents moved to adapters/markdown/types.rs)
```

### Visibility rules

- `SpecInfo`, `SpecStatus`, `SpecPriority`, `SpecFrontmatter`, `SpecFilterOptions`
  remain `pub` inside `adapters::markdown::types` and are re-exported from
  `leanspec_core::adapters::markdown`. They are **not** re-exported from the
  crate root.
- `SpecLoader`, `SpecWriter`, `SpecArchiver` become private to the
  `adapters::markdown` module. No external crate may use them directly.
- `DependencyGraph` and graph utilities remain accessible via
  `leanspec_core::adapters::markdown` for the markdown-only CLI commands that
  need them.

### Content utilities become pure functions

All functions in `content.rs` (`apply_checklist_toggles`, `rebuild_content`,
`split_frontmatter`, `apply_replacements`, `apply_section_updates`, etc.) must
have signatures of the form `fn(input: &str, ...) -> Result<String, ...>`. No
parameter or return type may reference `SpecInfo`, `SpecFrontmatter`, or any
adapter type. These functions are purely string-in / string-out.

This is required so HTTP handlers can use them in the fetch-transform-push
pattern without importing markdown-specific types.

### `MarkdownAdapter::invalidate_path`

`watcher.rs` in `leanspec-http` currently calls
`SpecLoader::invalidate_cached_path(&path)` — a static method on the old loader.
Add `pub fn invalidate_path(&self, path: &Path)` to `MarkdownAdapter` so the
watcher can hold a typed reference instead.

### `lib.rs` pub use changes

Remove from crate root re-exports:
- All of `spec_ops::*`
- `SpecLoader`, `SpecWriter`, `SpecArchiver`, `ArchiveError`, `WriteError`,
  `LoadError`, `MetadataUpdate`, `SpecHierarchyNode`
- `SpecInfo`, `SpecStatus`, `SpecPriority`, `SpecFrontmatter`, `SpecFilterOptions`,
  `StatusTransition`

Keep (these remain genuinely public crate API):
- Everything from `model` (SpecDoc, FieldDef, SpecSchema, …)
- Everything from `adapters` (Adapter, AdapterRegistry, AdapterConfig, …)
- `LeanSpecConfig` from `types::config`
- `CoreError`, `CoreResult` from `error`
- `TemplateLoader`, `ProjectDiscovery` from `io`
- `TokenCounter`, `SpecStats`, `Insights` from `compute`
- `FrontmatterParser` from `parsers`
- `search_specs`, `SearchResult`, `SearchOptions` from `search`
- Validator types from `validators`
- `validate_dependency_addition`, `RelationshipError` from `relationships`

Content utility functions (`apply_checklist_toggles`, `rebuild_content`,
`split_frontmatter`, `apply_replacements`, `apply_section_updates`,
`apply_section_updates`, `preserve_title_heading`) are re-exported from the crate
root as they are used by HTTP handlers as pure string utilities.

### Migration map deliverable

After the module moves and `lib.rs` changes, run `cargo check --workspace`.
Do not fix the resulting errors. Record the full error list as a comment at the
bottom of this spec under Notes. This list is the authoritative migration map
consumed by specs 386, 387, 389–394.

## Plan

- [ ] Create `rust/leanspec-core/src/adapters/markdown/` directory structure
- [ ] Move `spec_ops/loader.rs` → `adapters/markdown/loader.rs`, update module path, keep private
- [ ] Move `spec_ops/writer.rs` → `adapters/markdown/writer.rs`, keep private
- [ ] Move `spec_ops/archiver.rs` → `adapters/markdown/archiver.rs`, keep private
- [ ] Move `spec_ops/content.rs` → `adapters/markdown/content.rs`
  - [ ] Audit every function signature — remove any `SpecInfo`/`SpecFrontmatter` parameters
  - [ ] Replace struct parameters with primitive equivalents where needed
- [ ] Move `spec_ops/graph.rs` → `adapters/markdown/graph.rs`, keep private
- [ ] Delete `spec_ops/mod.rs` and `rust/leanspec-core/src/spec_ops/` directory
- [ ] Create `adapters/markdown/types.rs` with contents of `types/spec.rs`
- [ ] Delete `types/spec.rs`
- [ ] Update `adapters/markdown/mod.rs`:
  - [ ] Add `mod loader`, `mod writer`, `mod archiver`, `mod content`, `mod graph`, `mod types`
  - [ ] Re-export `SpecInfo`, `SpecStatus`, `SpecPriority`, `SpecFrontmatter`, `SpecFilterOptions`, `StatusTransition` as `pub`
  - [ ] Add `pub fn invalidate_path(&self, path: &Path)` to `MarkdownAdapter`
- [ ] Update `rust/leanspec-core/src/lib.rs`:
  - [ ] Remove `pub mod spec_ops`
  - [ ] Update `pub mod types` to only re-export `config` contents
  - [ ] Remove old `pub use spec_ops::*` block
  - [ ] Remove old `pub use types::{ SpecInfo, SpecStatus, … }` entries
  - [ ] Add `pub use adapters::markdown::content::{ apply_checklist_toggles, rebuild_content, split_frontmatter, apply_replacements, apply_section_updates, preserve_title_heading, … }` for HTTP handler use
- [ ] Fix all intra-crate import paths broken by the move (within `leanspec-core`)
- [ ] Run `cargo check --manifest-path rust/Cargo.toml -p leanspec-core` — must pass with zero errors
- [ ] Run `cargo check --workspace` — record all errors in Notes section; do not fix them
- [ ] Run `cargo test -p leanspec-core` — all existing tests must pass

## Test

- [ ] `cargo test -p leanspec-core` passes with zero failures
- [ ] `cargo check -p leanspec-core` clean
- [ ] `cargo check --workspace` produces errors only in `leanspec-cli` and `leanspec-http` (not in `leanspec-core` itself)
- [ ] `cargo clippy -p leanspec-core -- -D warnings` passes
- [ ] All existing `adapters/markdown.rs` tests continue to pass unchanged
- [ ] Content utility functions verified as pure (no adapter type in signatures) — review each function signature manually

## Notes

### Supersedes

Spec 344 (core-crate-domain-boundaries) identified the same problem at a higher
level. This spec is the concrete execution of that intent for the Rust layer.

### Migration map

After completing the plan steps, paste `cargo check --workspace` error output
here. Downstream specs use this list to scope their work.

```
(paste cargo check --workspace output after spec is complete)
```

### Why not a separate crate?

Extracting a `leanspec-markdown` crate would be even cleaner but involves
workspace Cargo.toml changes, binary distribution changes, and circular
dependency risk. Moving to `adapters/markdown/` achieves the same isolation
with lower risk. Crate extraction can follow later as a pure housekeeping PR.
