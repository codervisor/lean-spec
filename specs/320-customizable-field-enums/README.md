---
status: planned
created: 2026-02-07
priority: medium
tags:
- config
- customization
- lifecycle
- cli
- mcp
- ui
depends_on:
- 269-draft-status-human-review
parent: 319-spec-lifecycle-enhancements
created_at: 2026-02-07T03:14:18.057734Z
updated_at: 2026-02-07T03:18:18.559777Z
---
# Customizable Status, Priority, and Field Enums

## Overview

Status (`planned`, `in-progress`, `complete`, `archived`) and priority (`low`, `medium`, `high`, `critical`) are hardcoded Rust enums. Organizations have different SOPs — some need `draft`, `review`, `qa`, `deployed`; others want `P0`–`P4` priorities or custom fields like `effort`, `risk`, `team`.

This spec makes status values, priority values, and custom enum fields fully configurable via `.lean-spec/config.yaml`, so companies/individuals can tailor LeanSpec to their workflows.

## Motivation

- **Enterprise SOPs**: Teams need statuses like `review`, `qa`, `staging`, `deployed`
- **Individual workflows**: Solo devs may want `idea`, `wip`, `done`
- **Priority schemes**: Some orgs use `P0`–`P4`, others `blocker`/`major`/`minor`/`trivial`
- **Custom enum fields**: Risk levels, effort T-shirt sizes, team assignments
- **Extends spec 269**: `draft` is a built-in status; this spec allows adding further custom statuses on top

## Design

### Config Schema

In `.lean-spec/config.yaml`:
```yaml
fields:
  status:
    # Built-in: draft, planned, in-progress, complete, archived
    # Add custom statuses on top
    extra: [review, qa, deployed]
    default: draft
    # Optional: transition rules
    transitions:
      draft: [planned, archived]
      planned: [in-progress, archived]
      in-progress: [review, complete, archived]
      review: [in-progress, complete, archived]
      complete: [archived]
      archived: [planned]  # restore

  priority:
    values: [P0, P1, P2, P3, P4]
    default: P3
    # Optional aliases for convenience
    aliases:
      critical: P0
      high: P1
      medium: P3
      low: P4

  # Custom enum fields
  custom:
    effort:
      values: [XS, S, M, L, XL]
      default: M
    risk:
      values: [low, medium, high]
      default: low
    team:
      values: [frontend, backend, infra, design]
```

### Defaults (No Config)

When no `fields` config exists, use current hardcoded values as defaults:
- **Status**: `planned`, `in-progress`, `complete`, `archived` (default: `planned`)
- **Priority**: `low`, `medium`, `high`, `critical` (default: `medium`)
- **No transitions enforced** (any→any allowed)
- **No custom fields**

This ensures 100% backward compatibility.

### Transition Rules

Optional state machine for status transitions:
- If `transitions` defined: enforce allowed transitions (reject invalid ones)
- `--force` flag overrides transition rules
- If `transitions` omitted: any transition allowed (current behavior)

### Architecture Changes

**Rust core** (`leanspec-core`):
- `SpecStatus` / `SpecPriority` enums → config-driven string values validated at runtime
- New `FieldConfig` struct loaded from config
- Validation checks values against configured list
- `FromStr` becomes config-aware

**MCP tools** (`leanspec-mcp`):
- `update` tool: `status` enum → dynamic values from config
- Tool descriptions auto-generated from config (AI agents see valid options)
- `create` tool: default values from config

**HTTP server** (`leanspec-http`):
- API responses include field definitions for UI
- `GET /config/fields` endpoint returns valid values
- Validation uses config-driven values

**TypeScript UI** (`packages/ui`):
- Fetch field definitions from API
- Dynamic badge colors (map values → color scheme)
- Status/priority dropdowns populated from config
- Custom fields shown in spec detail view

### Badge/Color Mapping

For custom values, provide sensible defaults + user overrides:
```yaml
fields:
  status:
    values: [draft, planned, in-progress, review, complete, archived]
    colors:
      draft: gray
      planned: blue
      in-progress: yellow
      review: purple
      complete: green
      archived: muted
```

Unmapped values get auto-assigned colors from a palette.

## Plan

- [ ] Design `FieldConfig` schema and add to `LeanSpecConfig`
- [ ] Replace hardcoded `SpecStatus` enum with config-driven validation
- [ ] Replace hardcoded `SpecPriority` enum with config-driven validation
- [ ] Implement transition rules engine with `--force` override
- [ ] Support custom enum fields in frontmatter parsing
- [ ] Update MCP tool schemas to reflect dynamic field values
- [ ] Update HTTP API with field definitions endpoint
- [ ] Update UI to dynamically render status/priority/custom fields
- [ ] Add `lean-spec init` prompts for workflow customization
- [ ] Update documentation and SDD skill
- [ ] Migration path: existing specs with standard values work unchanged

## Test

- [ ] Default config (no `fields`) behaves identically to current behavior
- [ ] Custom status values accepted in `create` and `update`
- [ ] Custom priority values accepted in `create` and `update`
- [ ] Invalid status/priority values rejected with helpful error listing valid options
- [ ] Transition rules enforced when configured
- [ ] `--force` overrides transition rules
- [ ] Custom enum fields stored in frontmatter and queryable via `list`/`search`
- [ ] MCP tool descriptions include valid field values
- [ ] UI displays custom fields with appropriate colors
- [ ] Aliases resolve correctly (e.g., `critical` → `P0`)

## Notes

- **Relation to spec 269**: `draft` is implemented as a built-in status (spec 269). This spec extends the system so users can add *additional* custom statuses beyond the built-in set.
- **Relation to spec 014**: Custom frontmatter (014) added arbitrary key-value fields. This spec adds *validated enum fields* with defined value sets. Both can coexist.
- **Relation to spec 210**: JSON configurable templates (210) defines section structure. This spec defines *field value* structure. Complementary.
- **Breaking change risk**: None. Default config reproduces current behavior exactly.
