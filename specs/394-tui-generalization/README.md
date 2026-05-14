---
status: planned
created: 2026-05-14
priority: high
tags:
- tui
- migration
- adapter
- generalization
depends_on:
- "392-update-search-archive-stats-migration"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# TUI Generalization

## Overview

The TUI (`leanspec tui`) hard-codes `SpecStatus` and `SpecPriority` across 8
files, with 53 total references. These appear in `FilterState` struct fields,
`HashMap` keys, const arrays, theme functions, board grouping, and sort options.

This spec replaces all of them with dynamic, schema-driven equivalents in a
single atomic migration. The 8 files must change together — they have
interlocking type dependencies that make incremental migration produce
intermediate broken states.

Done when: the TUI board, filter panel, and detail view work correctly against
both markdown and GitHub adapter projects, and zero `SpecStatus`/`SpecPriority`
references remain in TUI code.

## Design

### No `DynamicStatus` shim

There is no transitional shim enum. The migration is done once, completely.
Between spec 392 and this spec, the TUI is guarded as markdown-only:

```rust
// In tui command entry point (pre-394 guard):
if caps.name != "markdown" {
    eprintln!("The TUI currently requires a markdown adapter.");
    eprintln!("Active adapter: {}. Full TUI support coming soon.", caps.name);
    std::process::exit(1);
}
```

This guard is removed as part of this spec.

### `FilterState` restructuring

```rust
// BEFORE
pub struct FilterState {
    pub statuses: Vec<SpecStatus>,
    pub priorities: Vec<SpecPriority>,
    pub assignees: Vec<String>,
    pub tags: Vec<String>,
}

// AFTER
pub struct FilterState {
    /// key → selected values. e.g. "status" → ["planned", "in-progress"]
    pub fields: HashMap<String, Vec<String>>,
    pub assignees: Vec<String>,  // kept for semantic convenience
    pub tags: Vec<String>,
}
```

Initialize `FilterState` from the schema:

```rust
impl FilterState {
    pub fn from_schema(schema: &SpecSchema) -> Self {
        let mut fields = HashMap::new();
        for field in &schema.fields {
            if let FieldKind::Enum { options, .. } = &field.kind {
                // Default: all values selected
                let values: Vec<String> = options.iter().map(|o| o.value.clone()).collect();
                fields.insert(field.key.clone(), values);
            }
        }
        Self { fields, assignees: vec![], tags: vec![] }
    }
}
```

### `tui/theme.rs` — string-keyed dispatch

```rust
// BEFORE
pub fn status_style(status: &SpecStatus) -> Style { match status { … } }
pub fn priority_symbol(priority: Option<&SpecPriority>) -> &'static str { … }

// AFTER
pub fn field_style(value: &str, field_key: &str, schema: &SpecSchema) -> Style {
    let color = schema
        .field(field_key)
        .and_then(|f| f.kind.enum_options())
        .and_then(|opts| opts.iter().find(|o| o.value == value))
        .and_then(|o| o.color.as_deref())
        .unwrap_or("#9ca3af");  // fallback grey
    Style::default().fg(parse_hex_color(color))
}

pub fn field_symbol(value: &str, field_key: &str, schema: &SpecSchema) -> &str {
    schema
        .field(field_key)
        .and_then(|f| f.kind.enum_options())
        .and_then(|opts| opts.iter().find(|o| o.value == value))
        .and_then(|o| o.icon.as_deref())
        .unwrap_or("·")
}
```

All callers updated: `status_style(s)` → `field_style(s, status_key, schema)`.

### `tui/app.rs` — board grouping

```rust
// BEFORE
const FILTER_STATUSES: &[SpecStatus] = &[Draft, Planned, InProgress, Complete, Archived];

// AFTER
fn filter_values_for_field(key: &str, schema: &SpecSchema) -> Vec<String> {
    schema
        .field(key)
        .and_then(|f| f.kind.enum_options())
        .map(|opts| opts.iter().map(|o| o.value.clone()).collect())
        .unwrap_or_default()
}
```

Board groups are loaded from schema at TUI startup and stored in `AppState`.
Group order follows schema enum option declaration order.

### `tui/app.rs` — sort option

```rust
// BEFORE
enum SortOption { PriorityDesc, … }

// AFTER
enum SortOption { FieldDesc(String), FieldAsc(String), … }
// e.g. SortOption::FieldDesc("priority".to_string())
```

The sort key for priority is `schema.key_for_semantic(semantic::PRIORITY)`.

### `tui/app.rs` — filter HashMap key

```rust
// BEFORE
self.filter_state.statuses.contains(&spec.frontmatter.status)

// AFTER
let status_key = schema.key_for_semantic(semantic::STATUS).unwrap_or("status");
let doc_status = doc.fields.get(status_key).and_then(|v| v.as_string()).unwrap_or("");
self.filter_state.fields
    .get(status_key)
    .map(|selected| selected.iter().any(|s| s == doc_status))
    .unwrap_or(true)
```

### Schema stored in `AppState`

The `SpecSchema` and status key are loaded once at startup and stored in
`AppState`. All rendering and filtering functions receive `&AppState` which
carries the schema. This avoids passing the schema as a separate parameter
to every function.

```rust
pub struct AppState {
    pub adapter: Box<dyn Adapter>,
    pub schema: SpecSchema,
    pub status_key: Option<String>,
    pub priority_key: Option<String>,
    // … existing fields
}
```

## Plan

- [ ] Add TUI startup guard (markdown-only until this spec) in spec 392 — remove it here
- [ ] `tui/app.rs`:
  - [ ] Replace `FilterState.statuses: Vec<SpecStatus>` with `fields: HashMap<String, Vec<String>>`
  - [ ] Replace `FilterState.priorities: Vec<SpecPriority>` (folded into `fields`)
  - [ ] Remove `FILTER_STATUSES` and `FILTER_PRIORITIES` const arrays
  - [ ] Implement `FilterState::from_schema(schema)`
  - [ ] Add `schema`, `status_key`, `priority_key` to `AppState`
  - [ ] Update board grouping to use `filter_values_for_field(key, schema)`
  - [ ] Update filter matching to use `fields` HashMap
  - [ ] Replace `priority_sort_key(Option<SpecPriority>)` with `field_sort_key(key, value, schema)`
  - [ ] Replace `SortOption::PriorityDesc` with `SortOption::FieldDesc(key)`
  - [ ] Update HashMap keyed by `SpecStatus` → keyed by `String`
- [ ] `tui/theme.rs`:
  - [ ] Replace `status_style(&SpecStatus)` with `field_style(value, key, schema)`
  - [ ] Replace `status_symbol(&SpecStatus)` with `field_symbol(value, key, schema)`
  - [ ] Replace `priority_symbol(Option<&SpecPriority>)` with `field_symbol(value, key, schema)`
  - [ ] Replace `status_color(&SpecStatus)` with `field_style(value, key, schema).fg`
  - [ ] Implement `parse_hex_color(hex: &str) -> Color`
- [ ] `tui/board.rs`:
  - [ ] Update board rendering to use `AppState.schema` for group labels and colors
  - [ ] Update test fixtures to use `SpecDoc` instead of `SpecInfo`
- [ ] Update detail view to iterate `schema.fields` for rendering
- [ ] Remove TUI startup markdown-only guard
- [ ] Remove all `SpecStatus`, `SpecPriority`, `SpecInfo`, `SpecFilterOptions` imports from TUI
- [ ] Update `rust/leanspec-cli/tests/tui_e2e.rs`

## Test

- [ ] `leanspec tui` on markdown project: visually identical board and filter panel
- [ ] `leanspec tui` on GitHub project: board shows open/closed groups with GitHub labels
- [ ] Filter panel populated from schema enum options (not hardcoded variants)
- [ ] Board column headers use schema-defined colors
- [ ] Sort by priority: uses schema-declared priority field
- [ ] Toggling a filter value correctly shows/hides items
- [ ] No `SpecStatus`, `SpecPriority` imports in any TUI file
- [ ] `cargo test -p leanspec-cli --test tui_e2e` passes

## Notes

### Snapshot tests

The existing TUI snapshot tests will need updating since the output changes
(column headers may reorder based on schema declaration order vs hardcoded
variant order). Update snapshots as part of this spec, not as a follow-up.

### Color rendering

`parse_hex_color(hex: &str) -> Color` converts `"#f59e0b"` to an ANSI terminal
color. Use the `ratatui` crate's `Color::Rgb(r, g, b)` variant. Parse the hex
string manually — no additional color library needed.
