---
status: planned
created: 2026-05-14
priority: high
tags:
- cli
- migration
- adapter
- board
depends_on:
- "389-list-command-migration"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# `board` Command Migration

## Overview

`leanspec board` currently has five hardcoded grouping functions (`print_by_status`,
`print_by_priority`, `print_by_assignee`, `print_by_tags`, `print_by_parent`),
each pattern-matching against `SpecStatus`/`SpecPriority` variants. This spec
replaces all of them with generic grouping driven by the adapter's schema.

Done when: `leanspec board` works correctly for both markdown and GitHub projects,
grouping by any enum field in the active schema in schema-declared order.

## Design

### Generic grouping

Replace all `print_by_*` functions with a single `group_by_field(docs, key, schema)`:

```rust
fn group_by_field<'a>(
    docs: &'a [SpecDoc],
    field_key: &str,
    schema: &SpecSchema,
) -> Vec<(String, Vec<&'a SpecDoc>)> {
    // Group order: follow schema's enum option declaration order
    let ordered_values: Vec<String> = schema
        .field(field_key)
        .and_then(|f| f.kind.enum_options())
        .map(|opts| opts.iter().map(|o| o.value.clone()).collect())
        .unwrap_or_default();

    let mut groups: HashMap<String, Vec<&SpecDoc>> = HashMap::new();
    for doc in docs {
        let value = doc.fields.get(field_key)
            .and_then(|v| v.as_string())
            .unwrap_or("(none)")
            .to_string();
        groups.entry(value).or_default().push(doc);
    }

    // Return in schema-declared order; append unknown values at end
    let mut result: Vec<(String, Vec<&SpecDoc>)> = ordered_values
        .iter()
        .filter_map(|v| groups.remove(v).map(|items| (v.clone(), items)))
        .collect();
    // Append any values not in schema (e.g. custom labels)
    result.extend(groups.into_iter());
    result
}
```

### `--group-by` flag

Add `--group-by <field-key>` flag. If omitted, default to the status field
(`schema.key_for_semantic(semantic::STATUS)`). If the adapter has no status
field, use the first declared enum field in the schema.

```
leanspec board                        # group by status (default)
leanspec board --group-by priority    # group by priority
leanspec board --group-by assignee    # group by assignee
leanspec board --group-by tags        # group by tags (multi-value: item appears in each group)
```

For multi-value fields (tags, multi-select enums): an item appears in every
group that matches one of its values.

### Column header colorization

Column headers (group labels) use the color declared on the enum option in the
schema. Replace the current hard-coded `SpecStatus` → ANSI color mappings with
`schema.field(key)?.kind.enum_options()?.find(|o| o.value == group_value)?.color`.

### `--filter-*` flags

Carry over from `list` — `--status`, `--priority`, `--assignee`, `--tag` still
work as pre-filters before grouping. Same `build_list_filter()` implementation
from spec 389.

### Unchanged behaviors

- Board layout (column widths, truncation, padding) is unchanged
- `--compact` flag behavior unchanged
- Hierarchy within groups (parent/child nesting) unchanged

## Plan

- [ ] Remove all `print_by_status`, `print_by_priority`, `print_by_assignee`,
  `print_by_tags`, `print_by_parent` functions from `commands/board.rs`
- [ ] Implement `group_by_field(docs, field_key, schema)` function
- [ ] Add `--group-by` flag to `BoardParams`/`BoardArgs` in `cli_args.rs`
- [ ] Default `--group-by` to `schema.key_for_semantic(semantic::STATUS)` when omitted
- [ ] Implement header colorization from schema enum option `color` field
- [ ] Apply `build_list_filter()` pattern from spec 389 for pre-filtering
- [ ] Handle multi-value grouping (tags): item appears in multiple groups
- [ ] Remove all `SpecLoader`, `SpecStatus`, `SpecPriority`, `SpecInfo` imports
- [ ] Update `rust/leanspec-cli/tests/board.rs` E2E tests

## Test

- [ ] All existing `tests/board.rs` E2E tests pass
- [ ] `leanspec board` on markdown project: output visually identical to pre-spec
- [ ] `leanspec board` on GitHub project: groups by `state` (open/closed) in schema order
- [ ] `leanspec board --group-by priority` on markdown: groups by priority
- [ ] `leanspec board --group-by tags` on markdown: items with multiple tags appear in each
- [ ] `leanspec board --group-by nonexistent-key`: clear error message, exit 1
- [ ] Column headers use schema-defined colors, not hardcoded ANSI sequences
- [ ] No `SpecStatus`, `SpecPriority`, `SpecInfo`, `SpecLoader` imports in `board.rs`

## Notes

### `print_by_parent` (hierarchy board)

This function groups by parent spec. `parent` is a link type (`link_type: "parent"`),
not a field. After migration: group by `doc.links.iter().find(|l| l.link_type == "parent")?.target_id`.
Items with no parent link go into a "No parent" group. This is not a `--group-by`
candidate (links are not fields) — it stays as a separate `--by-parent` flag.
