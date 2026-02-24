---
status: planned
created: 2026-02-24
priority: high
tags: [sessions, redesign, architecture]
created_at: 2026-02-24T07:35:07.231777Z
updated_at: 2026-02-24T07:35:07.231777Z
---

# Session Context Redesign: Specs as Attached Context

> **Status**: planned · **Priority**: high · **Created**: 2026-02-24

## Overview

The current session model strictly binds a session to at most one spec (`spec_id: Option<String>`). This is too restrictive:

1. **No spec workflow**: Users may want to run a session with a custom prompt or command (e.g., "fix all lint errors", "write unit tests for module X") without targeting any spec.
2. **Multi-spec context**: A session may need context from multiple related specs (e.g., a parent spec and child specs).
3. **Conceptual mismatch**: A spec is really *context* that guides the AI — not an ownership relationship. Sessions should be able to exist independently.

**Goal**: Decouple sessions from specs. Specs become optional, attachable context items — zero, one, or many can be attached to a session. A separate `prompt` field allows sessions to carry standalone instructions.

## Design

### Core Model Changes

Replace `spec_id: Option<String>` with two new fields:

```rust
pub struct Session {
    // ...existing fields...

    /// Specs attached as context (zero or more)
    pub spec_ids: Vec<String>,

    /// Optional custom prompt/instructions for the session
    pub prompt: Option<String>,
}
```

**Backward compatibility**: During DB migration, existing `spec_id` values are migrated to `spec_ids = [spec_id]` if non-null.

### Database Changes

- **`sessions` table**: Remove `spec_id TEXT` column; add `prompt TEXT` column.
- **New `session_specs` join table**:
  ```sql
  CREATE TABLE session_specs (
    session_id TEXT NOT NULL,
    spec_id    TEXT NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,  -- ordering
    PRIMARY KEY (session_id, spec_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  )
  ```
- Migration: copy non-null `spec_id` values from `sessions` into `session_specs` (position 0).

### Runtime Changes

When building the runner environment:
- `LEANSPEC_SPEC_IDS`: comma-separated list of spec IDs (replaces `LEANSPEC_SPEC_ID`)
- `LEANSPEC_SPEC_ID`: kept for single-spec backward compat (first spec ID, or empty)
- `LEANSPEC_PROMPT`: value of `prompt` field if set

### API Changes

**`CreateRunnerSessionRequest`**:
```json
{
  "project_path": "...",
  "spec_ids": ["028-cli-ui-modernization"],   // replaces spec_id
  "prompt": "Fix all compilation errors",      // new optional field
  "runner": "claude",
  "mode": "autonomous"
}
```
`spec_id` (singular) is kept as a deprecated alias that populates `spec_ids` for backward compat.

**`SessionResponse`** and **`ListSessionsRequest`**: mirror the same changes.

### CLI Changes

`lean-spec session create/run`:
- `--spec` becomes repeatable: `--spec 028 --spec 320` (or still accepts a single value)
- `--prompt` new flag for inline instructions

### UI / TypeScript Changes

`Session` type:
```ts
export interface Session {
  // ...
  specIds: string[];    // replaces specId
  prompt?: string | null;
  // specId kept as deprecated alias for one release cycle
}
```

## Plan

- [ ] Update `Session` struct and `SessionConfig` in `leanspec-core/src/sessions/types.rs`
- [ ] Update `SessionDatabase`: new schema, migration from `spec_id` → `session_specs`, add `prompt`
- [ ] Update `SessionManager::create_session` signature and `start_session` env var injection
- [ ] Update `leanspec-http` handler types (`CreateRunnerSessionRequest`, `SessionResponse`, `ListSessionsRequest`)
- [ ] Update `leanspec-cli` `session.rs` commands (repeatable `--spec`, add `--prompt`)
- [ ] Update `main.rs` `SessionSubcommand` enum
- [ ] Update TypeScript `Session` type in `packages/ui/src/types/api.ts`
- [ ] Update `BackendAdapter` interface and HTTP/Tauri adapters
- [ ] Update `useSessionsQuery` hook
- [ ] Update any UI components that use `specId`

## Test

- [ ] `SessionDatabase`: creating a session with no specs stores an empty `session_specs` table; creating with multiple specs stores all rows in correct order
- [ ] `SessionDatabase`: migration of existing sessions with `spec_id` populates `session_specs` correctly; sessions without `spec_id` are unaffected
- [ ] `SessionManager::start_session`: `LEANSPEC_SPEC_IDS` env var is empty string when no specs attached; comma-separated when multiple specs attached
- [ ] `SessionManager::start_session`: `LEANSPEC_SPEC_ID` is set to first spec ID for backward compat; empty when no specs attached
- [ ] `SessionManager::start_session`: `LEANSPEC_PROMPT` env var is set when `prompt` is provided; not set when `prompt` is `None`
- [ ] HTTP API: `POST /sessions` with `spec_ids: []` and `prompt: "..."` creates a valid prompt-only session
- [ ] HTTP API: `POST /sessions` with `spec_ids: ["028", "320"]` creates a session with two attached specs
- [ ] HTTP API: `POST /sessions` with deprecated `spec_id: "028"` is accepted and stored as `spec_ids: ["028"]`
- [ ] CLI: `lean-spec session run --project-path . --prompt "fix lint errors"` works without `--spec`
- [ ] CLI: `lean-spec session run --project-path . --spec 028 --spec 320` attaches two specs
- [ ] TypeScript `Session` type: `specIds` is always an array; `specId` alias returns first element or undefined

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
