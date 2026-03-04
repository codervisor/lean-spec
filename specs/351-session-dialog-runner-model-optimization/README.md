---
status: complete
created: 2026-03-03
priority: high
tags:
- ui
- sessions
- runners
- models
- ux
depends_on:
- 267-ai-session-runner-configuration
created_at: 2026-03-03T07:26:50.559807Z
updated_at: 2026-03-04T06:06:39.347241449Z
completed_at: 2026-03-04T06:06:39.347241449Z
transitions:
- status: in-progress
  at: 2026-03-04T05:57:27.884081508Z
- status: complete
  at: 2026-03-04T06:06:39.347241449Z
---
# Session Create Dialog: Runner & Model Selection Optimization

## Overview

The session creation dialog has several UX issues with runner and model selection that make it inconsistent with the settings page and confusing for users:

1. Runner dropdown shows hardcoded fallback list instead of only available/validated runners
2. No model configuration per runner — models and runners are disconnected systems
3. The `InlineModelSelector` shows chat server models (OpenAI, Anthropic providers), not runner-compatible models
4. Deprecated `ralph` mode still present in `sessionModeConfig` (shares `Bot` icon with `autonomous`)

## Requirements

### 1. Runners: Show Only Available (Default First)

- [x] Session create dialog should call `listRunners` with validation (not `skipValidation: true`)
- [x] Only show runners where `available === true`
- [x] Order: default runner first, then alphabetical
- [x] Remove hardcoded fallback list (`claude, copilot, codex, opencode, aider, cline`)
- [x] Match the same filtering/ordering as the Settings → Runners page
- [x] Show runner availability badge or subtle indicator if validation is pending

### 2. Runner Model Configuration in Settings

- [x] Add optional `model` and `availableModels` fields to `RunnerDefinition` schema
- [x] Add model configuration section to the Runner edit dialog in Settings
  - Default model dropdown/input per runner
  - Available models list (manually configured or auto-detected)
- [x] Persist model config in `runners.json` (global + project level)
- [x] Update Rust `RunnerDefinition` struct to include `model: Option<String>` and `available_models: Option<Vec<String>>`
- [x] Update JSON schema (`schemas/runners.json`) with model fields

### 3. Research & Implement Runner Model Listing

Runner CLIs have varying model listing capabilities:

| Runner | Model List CLI | Command |
|--------|---------------|---------|
| `aider` | Yes | `aider --list-models <filter>` |
| `opencode` | Yes | `opencode models [provider]` |
| `copilot` | Partial | Hardcoded choices in `--help` |
| `claude` | No | `--model <alias>` only |
| `codex` | No | `-m <model>` only |

- [x] Add `model_list_command` to runner schema for runners that support it
- [x] Implement backend endpoint `GET /api/runners/:id/models` that executes the listing command
  - Sanitize and validate `model_list_command` — only allow commands matching the runner's own `command` binary to prevent command injection
  - Apply a timeout (e.g., 10s) to prevent hanging on unresponsive CLIs
  - Parse output defensively; treat unexpected formats as empty model list
- [x] Cache model list results in-memory with a 5-minute TTL, invalidated immediately on runner config change
- [x] For runners without model listing, allow manual model configuration in Settings
- [x] Add UI in Settings → Runners to trigger model discovery and display results

### 4. Fix Session Dialog Model Selector

- [x] Replace `InlineModelSelector` (chat-server models) with a runner-aware model selector
- [x] New selector should show models from the selected runner's configuration
- [x] When runner changes, update available models list
- [x] Pre-select the runner's configured default model
- [x] If runner has no models configured, hide the model selector
- [x] Remove dependency on `useModelsRegistry` (chat models) from session creation

### 5. Remove Deprecated `ralph` Mode

- [x] Remove `ralph` entry from `sessionModeConfig` in `session-utils.ts` (already excluded from `MODES` array, so it's dead code)
- [x] Remove any remaining `ralph` references in session creation UI components
- [x] Verify no backend code depends on `ralph` mode string

## Implementation Strategy

This spec covers multiple layers (schema, backend, UI). Recommended implementation order:

1. **Quick wins first**: Requirements 1 (runner filtering) and 5 (remove `ralph`) — minimal risk, immediate UX improvement
2. **Schema & backend**: Requirements 2 (model fields) and 3 (model listing endpoint) — foundational changes
3. **UI integration**: Requirement 4 (runner-aware model selector) — depends on 2 & 3

## Non-Goals

- Changing how the chat sidebar model selector works (separate system)
- Building a runner marketplace or model marketplace
- Auto-detecting which models a user has API access to
- Changing session backend/ACP protocol

## Technical Notes

### Current Architecture Gap
- **Chat models** (`useModelsRegistry`): OpenAI/Anthropic/etc providers for LeanSpec's built-in chat. Configured in Settings → Models tab.
- **Runner models**: Which AI model a runner CLI should use (e.g., `claude --model sonnet`). Currently unconfigured — no schema, no UI, no API.
- The `InlineModelSelector` in session create dialog incorrectly bridges these two systems.

### Files to Modify
- `rust/leanspec-core/src/sessions/runner.rs` — Add model fields to RunnerDefinition
- `schemas/runners.json` — Add model-related properties
- `packages/ui/src/components/settings/runner-settings-tab.tsx` — Add model config to runner dialog
- `packages/ui/src/components/sessions/session-create-dialog.tsx` — Fix runner list + replace model selector
- `packages/ui/src/lib/session-utils.ts` — Fix mode icon duplication
- `packages/ui/src/types/api.ts` — Update RunnerDefinition type
- `rust/leanspec-http/` — Add model listing endpoint


### Progress Verification - 2026-03-04

Verified against implementation, git history, and test runs.

Completed and verified:
- Runner filtering/ordering in session dialog: validated `listRunners` usage, `available===true` filtering, and default-first alphabetical sorting.
- Runner model configuration end-to-end in UI + API + Rust + schema.
- Model discovery endpoint `/api/runners/{id}/models` with command-binary validation, 10s timeout, defensive parsing, and 5m in-memory cache.
- Cache invalidation on runner config updates (create/update/patch/delete/default).
- Session model selector switched to runner-specific models and hidden when no models are configured.
- `ralph` removed from session create UI mode selection and session mode config map.

Remaining gaps:
- None. Previously pending items were completed: session runner filtering now mirrors settings availability semantics for runnable runners, pending validation is surfaced in the runner picker, and backend/session mode no longer depends on `ralph`.

Test evidence:
- `cargo test --manifest-path rust/Cargo.toml -p leanspec-http` -> pass
- `pnpm --filter @leanspec/ui test` -> pass

## Acceptance Criteria

- Session dialog only shows available runners, default runner listed first
- Each runner can have models configured in Settings → Runners
- Session dialog model selector shows runner-specific models (not chat models)
- Changing runner in dialog updates available models
- `ralph` mode is fully removed from session config
- Runners without model support gracefully hide the model selector
- Model listing endpoint rejects commands that don't match the runner's own binary
- Model list cache expires after 5 minutes or on config change