---
status: planned
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
updated_at: 2026-03-03T07:26:55.275171Z
---

# Session Create Dialog: Runner & Model Selection Optimization

## Overview

The session creation dialog has several UX issues with runner and model selection that make it inconsistent with the settings page and confusing for users:

1. Runner dropdown shows hardcoded fallback list instead of only available/validated runners
2. No model configuration per runner — models and runners are disconnected systems
3. The `InlineModelSelector` shows chat server models (OpenAI, Anthropic providers), not runner-compatible models
4. Mode selector icons are duplicated (both `autonomous` and `ralph` use `Bot` icon)

## Requirements

### 1. Runners: Show Only Available (Default First)

- [ ] Session create dialog should call `listRunners` with validation (not `skipValidation: true`)
- [ ] Only show runners where `available === true`
- [ ] Order: default runner first, then alphabetical
- [ ] Remove hardcoded fallback list (`claude, copilot, codex, opencode, aider, cline`)
- [ ] Match the same filtering/ordering as the Settings → Runners page
- [ ] Show runner availability badge or subtle indicator if validation is pending

### 2. Runner Model Configuration in Settings

- [ ] Add optional `model` and `availableModels` fields to `RunnerDefinition` schema
- [ ] Add model configuration section to the Runner edit dialog in Settings
  - Default model dropdown/input per runner
  - Available models list (manually configured or auto-detected)
- [ ] Persist model config in `runners.json` (global + project level)
- [ ] Update Rust `RunnerDefinition` struct to include `model: Option<String>` and `available_models: Option<Vec<String>>`
- [ ] Update JSON schema (`schemas/runners.json`) with model fields

### 3. Research & Implement Runner Model Listing

Runner CLIs have varying model listing capabilities:

| Runner | Model List CLI | Command |
|--------|---------------|---------|
| `aider` | Yes | `aider --list-models <filter>` |
| `opencode` | Yes | `opencode models [provider]` |
| `copilot` | Partial | Hardcoded choices in `--help` |
| `claude` | No | `--model <alias>` only |
| `codex` | No | `-m <model>` only |

- [ ] Add `model_list_command` to runner schema for runners that support it
- [ ] Implement backend endpoint `GET /api/runners/:id/models` that executes the listing command
- [ ] Cache model list results (invalidate on runner config change)
- [ ] For runners without model listing, allow manual model configuration in Settings
- [ ] Add UI in Settings → Runners to trigger model discovery and display results

### 4. Fix Session Dialog Model Selector

- [ ] Replace `InlineModelSelector` (chat-server models) with a runner-aware model selector
- [ ] New selector should show models from the selected runner's configuration
- [ ] When runner changes, update available models list
- [ ] Pre-select the runner's configured default model
- [ ] If runner has no models configured, hide the model selector
- [ ] Remove dependency on `useModelsRegistry` (chat models) from session creation

### 5. Fix Duplicated Mode Icons

- [ ] `sessionModeConfig` uses `Bot` icon for both `autonomous` and `ralph` modes
- [ ] Assign distinct icons: keep `Bot` for `autonomous`, use a different icon for `ralph` (or remove `ralph` since it's deprecated)
- [ ] Clean up `ralph` mode from `sessionModeConfig` if it's no longer selectable (already excluded from `MODES` array)

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

## Acceptance Criteria

- Session dialog only shows available runners, default runner listed first
- Each runner can have models configured in Settings → Runners
- Session dialog model selector shows runner-specific models (not chat models)
- Changing runner in dialog updates available models
- Mode icons are visually distinct
- Runners without model support gracefully hide the model selector