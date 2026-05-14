---
status: planned
created: 2026-05-14
priority: high
tags:
- http
- migration
- adapter
- rust
depends_on:
- "386-http-read-path-migration"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# HTTP Write Path Migration

## Overview

`leanspec-http` write handlers (`create`, `update`, `archive`, `batch`) currently
call `SpecWriter`, `SpecArchiver`, and `spec_ops` functions (`apply_checklist_toggles`,
`rebuild_content`, `split_frontmatter`) directly. This spec migrates the write
path to the fetch-transform-push pattern via the adapter layer.

Done when: all write handlers use the adapter API, no `SpecWriter`/`SpecArchiver`/
`spec_ops` imports remain in `leanspec-http`, and all existing HTTP write tests pass.

## Design

### Fetch-transform-push pattern

Body manipulation operations (checklist toggles, section updates, content
replacements) are performed on the raw markdown string, not on adapter types.
The pattern is:

```
1. adapter.get(id)                    → SpecDoc
2. extract fields["content"] as &str
3. apply_checklist_toggles(content, toggles)   → String   (pure fn)
4. adapter.update(id, UpdateRequest {
       fields: { "content": FieldValue::String(new_content) },
       …other field changes…
   })
```

The pure string utility functions (`apply_checklist_toggles`, `apply_replacements`,
`apply_section_updates`, `rebuild_content`, `split_frontmatter`) are available
as crate-root re-exports from `leanspec-core` (established in spec 383). They
have no adapter type dependencies.

### `write.rs` handler migration

**Status update handler:**
```rust
// BEFORE
let status: SpecStatus = status_str.parse()?;
let writer = SpecWriter::new(&project.specs_dir);
writer.update_metadata(id, MetadataUpdate { status: Some(status), … })?;

// AFTER
let schema = adapter.schema();
let status_key = schema.key_for_semantic(semantic::STATUS)
    .ok_or(ApiError::unsupported("status field not available"))?;
// Validate value against schema enum options
let valid_values: Vec<_> = schema.field(status_key)
    .and_then(|f| f.kind.enum_options())
    .map(|opts| opts.iter().map(|o| o.value.as_str()).collect())
    .unwrap_or_default();
if !valid_values.contains(&status_str.as_str()) {
    return Err(ApiError::validation(format!("invalid status: {status_str}")));
}
adapter.update(id, UpdateRequest {
    fields: HashMap::from([(status_key.to_string(), FieldValue::String(status_str))]),
    ..Default::default()
})?;
```

**Checklist toggle handler:**
```rust
// Fetch current content
let doc = adapter.get(id)?;
let content = doc.fields.get("content")
    .and_then(|v| v.as_string())
    .unwrap_or("");

// Apply toggle (pure string operation)
let new_content = apply_checklist_toggles(content, &toggles)?;

// Push back
adapter.update(id, UpdateRequest {
    fields: HashMap::from([("content".to_string(), FieldValue::String(new_content))]),
    ..Default::default()
})?;
```

**Archive handler:**
```rust
// BEFORE
let archiver = SpecArchiver::new(&project.specs_dir);
archiver.archive(id)?;

// AFTER
adapter.delete(id)?;
```

**Create handler:**
```rust
// BEFORE
let writer = SpecWriter::new(&project.specs_dir);
let spec_info = writer.create(slug, frontmatter, content)?;

// AFTER
let req = CreateRequest {
    slug: params.slug,          // used by markdown adapter; ignored by others
    title: params.title,
    schema_id: params.schema_id,
    fields: build_fields_map(&params),
    links: vec![],
};
let doc = adapter.create(&req)?;
```

### Validation before write

For status/priority updates, validate the incoming value against the adapter's
schema enum options. Return `HTTP 422` with `{ "error": "invalid value", "valid": [...] }`
if validation fails. This replaces `SpecStatus::from_str()` / `SpecPriority::from_str()`.

### Transition logic

The current `write.rs` has transition logic: auto-record `completed_at` when
status moves to Complete, warn when moving Draft → InProgress skipping Planned.
This logic is markdown-specific (it writes to `SpecFrontmatter.transitions`).

After migration: transition logic moves to `MarkdownAdapter::update()` internals
where it belongs. For non-markdown adapters there are no transition side effects —
the adapter only does what the `UpdateRequest` asks.

The HTTP handler is kept simple: just build `UpdateRequest` from the request
body and call `adapter.update()`.

### Batch operations

Batch handlers (`POST /api/specs/batch`) map each operation to the appropriate
adapter call in a loop. Partial failure semantics: return results per-item
(success or error) — do not abort the whole batch on first failure.

## Plan

- [ ] `rust/leanspec-http/src/handlers/specs/write.rs`
  - [ ] Migrate status update to `adapter.update()` with enum validation
  - [ ] Migrate priority/assignee/tags updates to `adapter.update()`
  - [ ] Migrate checklist toggle to fetch-transform-push pattern
  - [ ] Migrate section update to fetch-transform-push pattern
  - [ ] Migrate content replacement to fetch-transform-push pattern
  - [ ] Migrate create handler to `adapter.create()`
  - [ ] Migrate archive handler to `adapter.delete()`
  - [ ] Move transition logic out of handler into `MarkdownAdapter::update()` internals
  - [ ] Remove all `SpecWriter`, `SpecArchiver` imports
  - [ ] Remove all direct `spec_ops` function imports (use crate-root re-exports from spec 383)
  - [ ] Remove all `SpecStatus`, `SpecInfo` imports
- [ ] Batch handler: migrate to per-adapter-call loop with per-item results
- [ ] Add enum validation helper: `validate_enum_value(key, value, schema) -> Result<(), ApiError>`
- [ ] `cargo check -p leanspec-http` passes with zero errors
- [ ] All existing write integration tests pass

## Test

- [ ] `cargo test -p leanspec-http` passes (all write tests)
- [ ] Status update with invalid value returns HTTP 422 with valid values list
- [ ] Checklist toggle round-trip: toggle an item, re-fetch, item state changed
- [ ] Create spec: returned doc has correct title and fields
- [ ] Archive: archived spec no longer appears in default list
- [ ] No `SpecWriter`, `SpecArchiver`, `SpecStatus`, `SpecInfo` imports in `leanspec-http`
- [ ] Transition logic (auto-complete timestamp) still works for markdown projects
- [ ] `cargo clippy -p leanspec-http -- -D warnings` passes

## Notes

### Content field for non-markdown adapters

GitHub issues have a body (markdown). ADO work items have plain text. Jira items
use ADF (handled by spec 398's converter). The `content` field in `UpdateRequest`
is always a markdown string at the HTTP API boundary; each adapter's `update()`
implementation is responsible for converting to its native format.

### Spec-ops re-exports

The `apply_checklist_toggles`, `apply_section_updates`, `apply_replacements`,
`rebuild_content`, `split_frontmatter`, `preserve_title_heading` functions are
re-exported from `leanspec-core` crate root as pure utilities. HTTP handlers
import from `leanspec_core::{ apply_checklist_toggles, … }` — this is clean
because these functions have no adapter type dependencies after spec 383.
