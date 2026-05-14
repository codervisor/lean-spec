---
status: planned
created: 2026-05-14
priority: medium
tags:
- schema
- customization
- cli
- yaml
depends_on:
- "399-dynamic-schema-enrichment"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Custom Schema Authoring

## Overview

LeanSpec ships with built-in schemas (`leanspec:base`, `leanspec:feature`,
`leanspec:bug`, `leanspec:adr`). Teams often need custom fields — a `severity`
field for security bugs, a `quarter` field for roadmap planning, a team-specific
status lifecycle.

This spec enables teams to define custom YAML schemas in `.lean-spec/schemas/`,
use them with any adapter, and manage them via `leanspec schema` subcommands.

Done when: a custom schema can be authored, validated, and used to create specs
with adapter-specific fields.

## Design

### Schema file location

Custom schemas are YAML files in `.lean-spec/schemas/`:

```
.lean-spec/
├── config.json
├── schemas/
│   ├── sprint-story.yaml
│   └── security-bug.yaml
└── templates/
    └── spec-template.md
```

Files are auto-discovered at adapter initialization time. Custom schemas can
extend built-in schemas via `extends:`.

### Schema ID convention

Built-in: `leanspec:{name}` (reserved prefix).
Custom: `{project}:{name}` or just `{name}`.

Example:
```yaml
id: "acme:sprint-story"
name: "Sprint Story"
extends: "leanspec:feature"
fields:
  - key: sprint
    label: Sprint
    kind:
      kind: enum
      options:
        - { value: q1-2026, label: Q1 2026 }
        - { value: q2-2026, label: Q2 2026 }
        - { value: backlog, label: Backlog }
      multi: false
      allow_custom: false
      dynamic: false
    display: inline
    required: false

  - key: story_points
    label: Story Points
    kind:
      kind: number
    display: inline
    required: false
```

### Schema inheritance

When `extends: "leanspec:feature"` is declared, all fields from the parent
schema are included. Fields declared in the child with the same `key` override
the parent. Link types are merged.

```rust
pub fn resolve_schema(id: &str, registry: &SchemaRegistry) -> Result<SpecSchema, SchemaError> {
    let raw = registry.get(id)?;
    match &raw.extends {
        None => Ok(raw),
        Some(parent_id) => {
            let parent = resolve_schema(parent_id, registry)?;  // recursive
            Ok(merge_schemas(parent, raw))
        }
    }
}

fn merge_schemas(parent: SpecSchema, child: SpecSchema) -> SpecSchema {
    let mut fields = parent.fields;
    for child_field in child.fields {
        if let Some(pos) = fields.iter().position(|f| f.key == child_field.key) {
            fields[pos] = child_field;  // override
        } else {
            fields.push(child_field);   // append
        }
    }
    // link_types: merge, child wins on key collision
    SpecSchema {
        id: child.id,
        name: child.name,
        extends: None,  // resolved, no longer needed
        fields,
        link_types: merge_link_types(parent.link_types, child.link_types),
    }
}
```

Circular inheritance (`a extends b extends a`) is detected and returns an error.

### `SchemaRegistry`

```rust
pub struct SchemaRegistry {
    schemas: HashMap<String, SpecSchema>,
}

impl SchemaRegistry {
    /// Load built-in bundles + custom schemas from project root.
    pub fn load(project_root: &Path) -> Result<Self, SchemaError>;
    pub fn get(&self, id: &str) -> Result<&SpecSchema, SchemaError>;
    pub fn list(&self) -> Vec<&SpecSchema>;
}
```

Built-in schemas are compiled in as `include_str!` YAML. Custom schemas are
loaded from `.lean-spec/schemas/*.yaml`. Loaded schemas are resolved (inheritance
flattened) before being stored.

### `leanspec schema` subcommands

```
leanspec schema list
leanspec schema show <schema-id>
leanspec schema validate <path>
```

**`schema list`** — lists all available schemas (built-in + custom):
```
Built-in:
  leanspec:base      Base            5 fields
  leanspec:feature   Feature         9 fields (extends leanspec:base)
  leanspec:bug       Bug             8 fields (extends leanspec:base)
  leanspec:adr       ADR             9 fields (extends leanspec:base)

Custom (.lean-spec/schemas/):
  acme:sprint-story  Sprint Story   11 fields (extends leanspec:feature)
  acme:security-bug  Security Bug    9 fields (extends leanspec:bug)
```

**`schema show <id>`** — prints all fields of a resolved schema:
```
Schema: acme:sprint-story (extends leanspec:feature)

Fields (inline):
  status       Status        enum   [draft, planned, in-progress, complete, archived]  *required
  priority     Priority      enum   [low, medium, high, critical]
  sprint       Sprint        enum   [q1-2026, q2-2026, backlog]
  story_points Story Points  number

Fields (section):
  content      Content       text
  acceptance   Acceptance    checklist
```

**`schema validate <path>`** — validates a YAML schema file:
```
Validating .lean-spec/schemas/sprint-story.yaml...
✓ Valid YAML
✓ Required fields: id, name
✓ All field keys are valid identifiers
✓ Parent schema 'leanspec:feature' exists
✓ No circular inheritance
✗ Field 'sprint': enum options list is empty — add at least one option

1 error found.
```

### Using a custom schema with an adapter

Set `schema_id` in `leanspec.adapter.yaml`:

```yaml
adapter: github
settings:
  owner: acme
  repo: backend
schema_id: acme:sprint-story
```

Or per-spec via `leanspec create --schema acme:sprint-story "My Story"`.

## Plan

- [ ] `SchemaRegistry` in `rust/leanspec-core/src/schema_registry.rs`
  - [ ] Load built-in schemas from `include_str!` YAML bundles
  - [ ] Load custom schemas from `.lean-spec/schemas/*.yaml`
  - [ ] Resolve inheritance (flatten `extends` chain)
  - [ ] Circular inheritance detection
  - [ ] `get(id)`, `list()` methods
- [ ] Integrate `SchemaRegistry` into `AdapterRegistry::from_project()`
  - [ ] Pass registry to adapter constructor
  - [ ] `adapter.schema()` now returns from registry if `schema_id` declared in config
- [ ] Add `schema_id` field to `AdapterConfig` (optional)
- [ ] `leanspec schema` subcommand (`cli_args.rs` + `commands/schema.rs`):
  - [ ] `schema list` — built-in + custom
  - [ ] `schema show <id>` — resolved field list
  - [ ] `schema validate <path>` — YAML + structure + inheritance validation
- [ ] Schema YAML validation rules:
  - [ ] Required: `id`, `name`
  - [ ] All field `key` values are valid identifiers (`[a-z][a-z0-9_]*`)
  - [ ] `extends` target exists in registry
  - [ ] No circular inheritance
  - [ ] Enum fields with `allow_custom: false` must have at least one option
- [ ] Update `leanspec init` to create `.lean-spec/schemas/` directory (empty)
- [ ] Update `create --schema <id>` to pass schema_id in `CreateRequest`

## Test

- [ ] `leanspec schema list`: shows all built-in schemas
- [ ] `leanspec schema list` with custom schema in `.lean-spec/schemas/`: shows both
- [ ] `leanspec schema show leanspec:feature`: all 9 fields shown correctly
- [ ] `leanspec schema show acme:sprint-story`: inherited + custom fields shown
- [ ] `leanspec schema validate valid.yaml`: exits 0
- [ ] `leanspec schema validate invalid.yaml` (missing `id`): exits 1 with error
- [ ] `leanspec schema validate circular.yaml` (a extends b extends a): exits 1
- [ ] `leanspec create "My Story" --schema acme:sprint-story`: creates with schema fields
- [ ] Custom schema `sprint` field visible in `leanspec view`
- [ ] Custom schema survives adapter re-initialization (loaded from disk each time)

## Notes

### `leanspec:` prefix protection

Schemas with IDs starting with `leanspec:` are built-in and cannot be overridden
by custom files. If a custom file declares `id: leanspec:feature`, emit a warning
and skip it.

### Schema versioning

Custom schemas are loaded fresh each invocation. No migration is needed when a
schema changes — existing `SpecDoc` items simply don't have the new field value
until explicitly updated.

### JSON Schema for YAML authoring

Generate a JSON Schema for the schema YAML format and publish it so editors
(VS Code, IntelliJ) can provide autocomplete. This is a follow-up quality-of-life
improvement, not in scope for this spec.
