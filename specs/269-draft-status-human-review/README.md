---
status: in-progress
created: 2026-01-31
priority: high
tags:
- lifecycle
- workflow
- cli
- mcp
parent: 319-spec-lifecycle-enhancements
created_at: 2026-01-31T06:11:02.684844Z
updated_at: 2026-02-07T03:19:39.523558Z
transitions:
- status: in-progress
  at: 2026-02-07T03:19:39.523558Z
---

# Draft Status for Human-Reviewed Spec Refinement

## Overview

Add a `draft` status to the spec lifecycle, positioned before `planned`. As quality becomes increasingly important in Spec-Driven Development (SDD), human review and refinement should be valued more than "vibe coding" approaches. The draft phase allows developers to review, refine, and align specs with correct objectives before committing to implementation.

## Motivation

- **Quality over speed**: AI-generated specs need human oversight to ensure they align with actual project goals
- **Intentional planning**: Prevent premature implementation of under-specified or misaligned specs
- **Review workflow**: Create a formal stage where specs can be iterated without pressure to implement
- **Reduced rework**: Catch scope creep, misunderstandings, and missing context before coding starts

## Design

### Status Lifecycle

```
draft → planned → in-progress → complete
          ↓
       archived (can happen from any status)
```

### Draft Status Semantics

- **Purpose**: Spec is being authored or refined; not yet ready for implementation
- **Who acts**: Human developers review, provide feedback, refine objectives
- **Exit criteria**: Transition to `planned` or `archived` when ready

### Transition Rules

#### Allowed Transitions from Draft

| Target Status | Allowed? | Notes                                              |
| ------------- | -------- | -------------------------------------------------- |
| `planned`     | ✅ Yes    | Normal workflow - spec is ready for implementation |
| `archived`    | ✅ Yes    | Spec abandoned or superseded                       |
| `in-progress` | ⚠️ Force  | Skipping planned stage requires `--force`          |
| `complete`    | ⚠️ Force  | Skipping stages requires `--force`                 |

#### CLI/MCP: Force Override for Stage Skipping

Transitioning from `draft` directly to `in-progress` or `complete` requires `--force`:

```bash
# These work normally
lean-spec update <spec> --status planned
lean-spec update <spec> --status archived

# This will fail - skipping planned stage
lean-spec update <spec> --status in-progress
# Error: Cannot skip 'planned' stage. Use --force to override.

# This will succeed with force
lean-spec update <spec> --status in-progress --force
```

MCP equivalent:
```json
{
  "tool": "update",
  "specPath": "269-example",
  "status": "in-progress",
  "force": true
}
```

#### UI: Warning Dialog for Stage Skipping

When user tries to change status from `draft` directly to `in-progress` or `complete`:
1. Show warning: "This spec hasn't been through the planned stage. Skip planning?"
2. Options: "Go to Planned" (suggested) / "Skip Anyway" (confirm force)

This ensures the proper lifecycle is followed unless explicitly overridden.

### Configuration Flag

Draft status is **opt-in** via `.lean-spec/config.json`:

```json
{
  "draftStatus": {
    "enabled": true
  }
}
```

- When `enabled: false` (default): `create` defaults to `planned`, draft status is hidden from board/UI
- When `enabled: true`: `create` defaults to `draft`, full lifecycle enforced
- CLI override: `lean-spec create <name> --status draft` works regardless of config
- `lean-spec init` prompt: "Enable draft status for human review workflow? (y/N)"

### Default Behavior

- **Feature is disabled by default** — no breaking change for existing projects
- When enabled, new specs created via `create` default to `draft` status
- Existing specs with other statuses are unaffected
- Normal lifecycle transitions work without force
- Setting `draft` status manually (via `--status draft`) always works, even when disabled

## Plan

- [ ] Update status enum to include `draft` before `planned`
- [ ] Add `draftStatus.enabled` config option to `.lean-spec/config.json`
- [ ] Add draft status prompt to `lean-spec init`
- [ ] Modify `create` command to default status to `draft` when enabled
- [ ] Add `--force` flag to CLI update command
- [ ] Add `force` parameter to MCP update tool
- [ ] Implement draft→in-progress/complete guard requiring force
- [ ] Update board grouping to show `draft` specs prominently
- [ ] Update UI status dropdown with warning dialog for stage skipping
- [ ] Update CLI help text and documentation
- [ ] Add guidance to SDD skill about draft workflow
- [ ] Update validation to recognize `draft` as valid status

## Test

- [ ] `lean-spec create "test"` creates spec with `planned` status (default, disabled)
- [ ] `lean-spec create "test"` creates spec with `draft` status when `draftStatus.enabled: true`
- [ ] `lean-spec create "test" --status draft` works regardless of config
- [ ] `lean-spec update <spec> --status planned` succeeds
- [ ] `lean-spec update <spec> --status archived` succeeds
- [ ] `lean-spec update <spec> --status in-progress` fails with helpful error
- [ ] `lean-spec update <spec> --status in-progress --force` succeeds
- [ ] UI shows warning dialog for draft→in-progress transition
- [ ] Board shows draft group before planned

## Notes

This approach:
- Enforces proper lifecycle progression (draft→planned→in-progress→complete)
- Allows flexibility with `--force` for edge cases
- Keeps UI experience friendly with warnings for stage skipping
- Maintains backward compatibility for existing workflows
