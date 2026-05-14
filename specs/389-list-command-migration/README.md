---
status: planned
created: 2026-05-14
priority: high
tags:
- cli
- migration
- adapter
- reference-implementation
depends_on:
- "383-markdown-adapter-domain-isolation"
- "384-github-adapter"
- "388-init-command-redesign"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# `list` Command Migration (Reference Implementation)

## Overview

Migrate `leanspec list` from `SpecLoader`/`SpecInfo` to `AdapterRegistry`.
This is the reference implementation: the pattern established here — semantic
hint translation, `ListFilter::fields` map, schema-driven output — is the
template for all subsequent command migrations (390–392).

Done when: `leanspec list` works correctly against both a markdown project and
a GitHub-backed project, with no `SpecLoader`/`SpecInfo` imports remaining.

## Design

### Entry point pattern

Every adapter-aware command starts with:

```rust
pub fn run(params: ListParams) -> Result<(), Box<dyn Error>> {
    let adapter = AdapterRegistry::from_project()?;
    let schema = adapter.schema();
    let caps = adapter.capabilities();

    // … build filter, call adapter, render output
}
```

The `--specs-dir` flag is markdown-only. If provided with a non-markdown adapter:

```rust
if params.specs_dir.is_some() && caps.name != "markdown" {
    return Err(CliError::NotApplicable {
        flag: "--specs-dir",
        adapter: caps.name.clone(),
    }.into());
}
```

For markdown with `--specs-dir`, the adapter is constructed directly:
`MarkdownAdapter::new(specs_dir)` instead of `AdapterRegistry::from_project()`.

### Semantic hint translation

Filter flags (`--status`, `--priority`, `--assignee`, `--tag`) are translated to
`ListFilter::fields` using the schema:

```rust
fn build_list_filter(params: &ListParams, schema: &SpecSchema) -> ListFilter {
    let mut fields: HashMap<String, Vec<String>> = HashMap::new();

    if let Some(status) = &params.status {
        if let Some(key) = schema.key_for_semantic(semantic::STATUS) {
            fields.insert(key.to_string(), vec![status.clone()]);
        }
    }
    if let Some(priority) = &params.priority {
        if let Some(key) = schema.key_for_semantic(semantic::PRIORITY) {
            fields.insert(key.to_string(), vec![priority.clone()]);
        }
    }
    if let Some(tags) = &params.tags {
        if let Some(key) = schema.key_for_semantic(semantic::TAGS) {
            fields.insert(key.to_string(), tags.clone());
        }
    }
    if let Some(assignee) = &params.assignee {
        if let Some(key) = schema.key_for_semantic(semantic::ASSIGNEE) {
            fields.insert(key.to_string(), vec![assignee.clone()]);
        }
    }

    ListFilter {
        fields,
        text: params.search.clone(),
        include_archived: params.include_archived.unwrap_or(false),
        raw: None,
    }
}
```

If a flag is provided but the adapter's schema has no matching field, the flag
is silently ignored (the adapter simply has no such concept). This is correct:
`--priority high` on a GitHub adapter with no priority field is a no-op, not an
error, because the user may have a generic script that passes the flag regardless.

### Schema-driven output rendering

Replace hard-coded field accesses (`spec.frontmatter.status.to_string()`, etc.)
with schema-aware rendering:

```rust
fn render_row(doc: &SpecDoc, schema: &SpecSchema, compact: bool) -> String {
    let id_col = &doc.id;
    let title_col = &doc.title;

    let status_col = schema
        .key_for_semantic(semantic::STATUS)
        .and_then(|k| doc.fields.get(k))
        .and_then(|v| v.as_string())
        .map(|s| colorize_status(s))
        .unwrap_or_default();

    let priority_col = schema
        .key_for_semantic(semantic::PRIORITY)
        .and_then(|k| doc.fields.get(k))
        .and_then(|v| v.as_string())
        .unwrap_or_default();

    // … format row
}
```

Status colorization (`colorize_status`) maps enum values to colors using the
`color` field declared on the enum option in the schema, rather than hard-coding
`SpecStatus` variant → color mappings.

### `--hierarchy` flag

Hierarchy display (parent/child tree) uses `doc.links` filtered by link type
`"parent"` / `"child"`. Works for any adapter that populates links. If the
adapter returns no links, hierarchy display falls back to flat list.

### Output formats

`--output json` serializes `Vec<SpecDoc>` as JSON. `--output table` (default)
uses the schema-driven row renderer. `--output compact` is the existing one-line
format.

### `ListParams` changes

Remove `specs_dir: String` (was the only required parameter) — it's now optional
and only applies to markdown. Add `adapter_config: Option<PathBuf>` for
overriding the config file location in tests.

## Plan

- [ ] Update `ListParams` struct — make `specs_dir` optional
- [ ] Rewrite `commands/list.rs::run()`:
  - [ ] `AdapterRegistry::from_project()` at entry
  - [ ] `--specs-dir` hard error for non-markdown
  - [ ] Implement `build_list_filter()` with semantic hint translation
  - [ ] Implement `render_row()` with schema-driven field lookup and colorize-from-schema
  - [ ] Implement `colorize_status(value: &str, schema: &SpecSchema) -> String`
  - [ ] Remove all `SpecLoader`, `SpecInfo`, `SpecStatus`, `SpecPriority`, `SpecFilterOptions` imports
- [ ] Update caller sites in `main.rs` / `cli_args.rs` for changed `ListParams`
- [ ] Update E2E tests in `rust/leanspec-cli/tests/list.rs`:
  - [ ] Existing markdown tests pass unchanged
  - [ ] Add GitHub adapter test (using `TestContext` with mock GitHub)
- [ ] Document the semantic-hint translation pattern in
  `.agents/skills/leanspec-development/references/CI-COMMANDS.md`
  as the canonical pattern for command migrations

## Test

- [ ] All existing `tests/list.rs` E2E tests pass
- [ ] `leanspec list` on a markdown project: identical output to pre-spec
- [ ] `leanspec list --status planned` on markdown: filters correctly
- [ ] `leanspec list --status open` on GitHub project: filters correctly
- [ ] `leanspec list --specs-dir ./other` on GitHub project: exits with clear error
- [ ] `leanspec list --output json` on GitHub project: valid JSON with correct fields
- [ ] `leanspec list --priority high` when adapter has no priority field: runs without error
- [ ] No `SpecLoader`, `SpecInfo`, `SpecStatus`, `SpecPriority` imports in `list.rs`

## Notes

### Template for all subsequent command migrations

The pattern in this spec — `AdapterRegistry::from_project()`, `build_*_filter()`
with semantic hints, schema-driven rendering, `--specs-dir` hard error — is
copy-pasted as the starting point for specs 390, 391, 392. Do not deviate from
this pattern without updating this spec as the canonical reference.

### `FieldValue::as_string()` helper

The `FieldValue` enum needs a convenience method:
```rust
impl FieldValue {
    pub fn as_string(&self) -> Option<&str> {
        match self {
            FieldValue::String(s) => Some(s),
            _ => None,
        }
    }
    pub fn as_strings(&self) -> Option<&[String]> {
        match self {
            FieldValue::Strings(v) => Some(v),
            _ => None,
        }
    }
}
```
Add these in spec 383 or here if they're missing from `model.rs`.
