---
status: planned
created: 2026-05-14
priority: high
tags:
- cli
- migration
- adapter
- view
- create
depends_on:
- "389-list-command-migration"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# `view` + `create` Commands Migration

## Overview

Migrate `leanspec view` and `leanspec create` from `SpecLoader`/`SpecInfo` to
the adapter layer. These two commands are paired because they share the
"field rendering" concern: `view` renders all fields, and `create` needs to
validate field values before writing.

Done when: both commands work correctly on markdown and GitHub projects with no
`SpecLoader`/`SpecInfo` imports remaining.

## Design

### `view` — schema-ordered field rendering

Replace `spec_info.frontmatter.*` field accesses with a loop over schema fields:

```rust
fn render_spec(doc: &SpecDoc, schema: &SpecSchema) {
    // Title
    println!("# {}", doc.title);
    println!();

    // Inline fields (displayed as a header row)
    for field in schema.fields.iter().filter(|f| f.display == FieldDisplay::Inline) {
        if let Some(value) = doc.fields.get(&field.key) {
            println!("  {}: {}", field.label, render_value(value, field, schema));
        }
    }
    println!();

    // Section fields (displayed as full sections)
    for field in schema.fields.iter().filter(|f| f.display == FieldDisplay::Section) {
        if let Some(value) = doc.fields.get(&field.key) {
            println!("## {}", field.label);
            println!("{}", render_section_value(value, field));
            println!();
        }
    }
}
```

`render_value` handles each `FieldKind`:
- `Enum` with single value: display with color from schema option definition
- `Enum` with multi: comma-separated
- `Bool`: ✓ / ✗
- `Timestamp`: formatted date
- `Text`, `LongText`: raw string
- `Checklist`: `[x] item` / `[ ] item` lines
- `References`: listed with target titles if available

Metadata fields (id, url, created_at, updated_at) are displayed at the bottom
if present on `SpecDoc`.

### `view` — relationship display

Links are displayed as a section after fields:
```
## Relationships
  Parent: 042-some-feature
  Depends on: 031-another-spec, 035-third-spec
```

Uses `doc.links` grouped by `link_type`. Link type labels come from
`schema.link_types.iter().find(|lt| lt.key == link_type)?.label`.

### `create` — slug vs title

Slug generation (e.g. `042-my-spec/`) is markdown-specific. For non-markdown
adapters, the `--slug` flag is an error:

```rust
if params.slug.is_some() && caps.name != "markdown" {
    return Err(CliError::NotApplicable { flag: "--slug", adapter: caps.name }.into());
}
```

For non-markdown adapters, the positional `name` argument is the issue title.

### `create` — field value validation

`--status`, `--priority`, and any `--field key=value` flags are validated against
the schema before sending to the adapter:

```rust
fn validate_field_value(key: &str, value: &str, schema: &SpecSchema) -> Result<(), CliError> {
    let field = schema.field(key).ok_or(CliError::UnknownField(key.to_string()))?;
    if let FieldKind::Enum { options, allow_custom, .. } = &field.kind {
        if !allow_custom && !options.iter().any(|o| o.value == value) {
            let valid: Vec<_> = options.iter().map(|o| o.value.as_str()).collect();
            return Err(CliError::InvalidFieldValue {
                key: key.to_string(),
                value: value.to_string(),
                valid,
            });
        }
    }
    Ok(())
}
```

### `--field key=value` generic flag

Add `--field` flag accepting `key=value` pairs for any adapter-specific field
not covered by named flags:

```
leanspec create "My feature" --field severity=high --field epic=Q3
```

These are merged into `CreateRequest::fields` after standard flag processing.

### Template loading

`create` still supports `--template` for markdown projects (loads from
`.lean-spec/templates/`). For non-markdown adapters, `--template` is silently
ignored since templates produce markdown frontmatter which has no meaning in
GitHub Issues / ADO / Jira.

## Plan

**`view` command:**
- [ ] Rewrite `commands/view.rs::run()` — use `adapter.get(id)`
- [ ] Implement `render_spec(doc, schema)` with inline + section field loop
- [ ] Implement `render_value(value, field, schema)` for each `FieldKind`
- [ ] Implement `render_section_value(value, field)` for long-text/checklist
- [ ] Replace relationship display with `doc.links` grouped by link_type
- [ ] Remove `SpecLoader`, `SpecInfo`, `SpecFrontmatter` imports

**`create` command:**
- [ ] Rewrite `commands/create.rs::run()` — use `adapter.create(req)`
- [ ] Add `--slug` error for non-markdown
- [ ] Implement `validate_field_value(key, value, schema)`
- [ ] Apply validation to `--status`, `--priority`, and `--field` values
- [ ] Add `--field key=value` flag (repeatable) to `CreateArgs`
- [ ] Build `CreateRequest::fields` from all named flags + `--field` pairs
- [ ] Keep `--template` for markdown; silently ignore for others
- [ ] Remove `SpecLoader`, `SpecInfo`, `SpecFrontmatter`, `SpecStatus`, `SpecPriority` imports

**Tests:**
- [ ] Update `rust/leanspec-cli/tests/view.rs`
- [ ] Update `rust/leanspec-cli/tests/create.rs`

## Test

- [ ] `leanspec view <id>` on markdown: output identical to pre-spec
- [ ] `leanspec view <id>` on GitHub: displays title, status, labels, assignee, body
- [ ] `leanspec view <id>` with checklist field: shows item completion state
- [ ] `leanspec view <id>` with links: displays relationship section
- [ ] `leanspec create "Title"` on markdown: creates file with correct slug
- [ ] `leanspec create "Title"` on GitHub: creates issue, prints issue URL
- [ ] `leanspec create "Title" --status invalid`: clear error with valid values
- [ ] `leanspec create "Title" --slug foo` on GitHub: error
- [ ] `leanspec create "Title" --field severity=high`: field appears in created doc
- [ ] No old type imports in `view.rs` or `create.rs`

## Notes

### Checklist rendering in view

The existing `view` command renders checklists from markdown frontmatter.
After migration, checklists are `FieldValue::Checklist(Vec<CompletableItem>)`.
The render is `"[x] item"` or `"[ ] item"` per item — identical visual output.

### ID argument for non-markdown adapters

For markdown, `<id>` is a spec number or slug. For GitHub, it's an issue number.
For ADO, it's a work item ID. The adapter's `get(id)` handles the disambiguation.
The CLI passes the string as-is.
