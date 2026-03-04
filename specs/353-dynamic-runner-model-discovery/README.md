---
status: complete
created: 2026-03-04
priority: high
tags:
- sessions
- runners
- models
- models.dev
- registry
depends_on:
- 351-session-dialog-runner-model-optimization
created_at: 2026-03-04T06:38:31.354034484Z
updated_at: 2026-03-04T07:18:07.271194358Z
completed_at: 2026-03-04T07:18:07.271194358Z
transitions:
- status: complete
  at: 2026-03-04T07:18:07.271194358Z
---

# Dynamic Runner Models via models.dev Registry (Remove Hardcoded available_models)

## Overview

Runner `available_models` are currently `None` for every built-in runner, and models can only be configured by manually typing model IDs in Settings. The `model_list_command` field (from spec 351) requires CLI parsing which is brittle.

Both `available_models` and `model_list_command` represent a flawed approach: **hardcoding model lists that go stale**. Instead, we should leverage the **models.dev registry** that LeanSpec already fully integrates (`ModelsDevClient`, `bundled_models.json`, caching, offline fallback) to dynamically provide runner models.

The registry already has providers that map directly to runners:

| Runner | models.dev Provider | Example Models |
|--------|-------------------|----------------|
| `copilot` | `github-copilot` | `claude-sonnet-4.6`, `gpt-5.2-codex`, `claude-opus-4.6` |
| `claude` | `anthropic` | `claude-opus-4-0`, `claude-haiku-4-5`, `claude-sonnet-4-5` |
| `gemini` | `google` | `gemini-3-flash-preview`, `gemini-3-pro-preview` |
| `codex` | `openai` | `gpt-5.2`, `gpt-5.1-codex`, `gpt-4.1` |
| `opencode` | Multiple | User-configured providers |
| `aider` | Multiple | User-configured providers |

**Goal**: Replace `available_models` (hardcoded) and `model_list_command` (brittle CLI parsing) with `model_providers` — a mapping to models.dev providers that keeps model lists always up-to-date.

## Design

### Remove Hardcoded Fields

Remove from `RunnerConfig`, `RunnerDefinition`, and all API types:
- `available_models: Option<Vec<String>>` — hardcoded model list
- `model_list_command: Option<String>` — brittle CLI parsing

### Add Provider Mapping

Add `model_providers` field to `RunnerDefinition`:

```rust
pub struct RunnerDefinition {
    // ...existing fields (minus available_models, model_list_command)...
    /// models.dev provider IDs whose models this runner can use.
    /// Models are resolved dynamically from the registry.
    pub model_providers: Option<Vec<String>>,
}
```

```json
{
  "runners": {
    "copilot": {
      "command": "copilot",
      "model_providers": ["github-copilot"]
    },
    "claude": {
      "command": "claude",
      "model_providers": ["anthropic"]
    },
    "gemini": {
      "command": "gemini",
      "model_providers": ["google"]
    },
    "codex": {
      "command": "codex",
      "model_providers": ["openai"]
    }
  }
}
```

### Model Resolution Pipeline

```
1. Check runner.model_providers → look up each provider in models.dev registry
2. Filter models by capability (tool_call=true for agentic runners)
3. Return merged, deduplicated model list sorted by relevance
```

The models.dev registry is already cached with TTL (`ModelCache`) and has a bundled fallback (`bundled_models.json`), so this works offline too.

### Model Filtering

Not all models from a provider are suitable for coding agents. Filter by:
- `tool_call: true` — required for agentic use
- Exclude embedding-only, audio-only, and image-generation models (check `modalities`)

## Removal Scope

### Rust (`leanspec-core`)
- `RunnerConfig`: remove `available_models`, `model_list_command` fields
- `RunnerDefinition`: remove `available_models`, `model_list_command`; add `model_providers`
- `merge_runner()`: remove merge logic for removed fields; add merge for `model_providers`
- All built-in runner defaults: remove `available_models: None, model_list_command: ...` lines; add `model_providers`

### Rust (`leanspec-http`)
- `RunnerCreatePayload` / `RunnerUpdatePayload`: remove `available_models`, `model_list_command`; add `model_providers`
- `RunnerInfoResponse`: same removal/addition
- `RunnerModelsResponse`: keep but change source from `model_list_command` execution to registry lookup
- Remove `model_list_command` execution and caching logic in runners handler
- Remove command-binary validation for `model_list_command` (no longer needed)

### JSON Schema (`schemas/runners.json`)
- Remove `available_models` and `model_list_command` properties
- Add `model_providers` array property

### TypeScript (UI)
- `RunnerDefinition` generated type: will auto-update from `ts-rs`
- `api.ts`: remove `availableModels`, `modelListCommand` from create/update payloads; add `modelProviders`
- `runner-settings-tab.tsx`: remove "Available Models" textarea and "Model List Command" input; add `model_providers` selector
- `session-create-dialog.tsx`: replace `staticModels = selected?.availableModels` with registry lookup
- Backend adapters (`http.ts`, `tauri.ts`, `core.ts`): remove `availableModels`, `modelListCommand`; add `modelProviders`
- Locales (`en/common.json`, `zh-CN/common.json`): remove `availableModels*`, `modelListCommand*` keys; add `modelProviders*`

## Plan

- [ ] Remove `available_models` and `model_list_command` from `RunnerConfig` in `runner.rs`
- [ ] Remove `available_models` and `model_list_command` from `RunnerDefinition`; add `model_providers: Option<Vec<String>>`
- [ ] Update `merge_runner()` to handle `model_providers` instead of removed fields
- [ ] Configure built-in defaults with `model_providers`:
  - `copilot` → `["github-copilot"]`
  - `claude` → `["anthropic"]`
  - `gemini` → `["google"]`
  - `codex` → `["openai"]`
  - `aider` → `["openai", "anthropic", "google"]`
  - `opencode` → `["openai", "anthropic", "google"]`
- [ ] Implement `resolve_runner_models()`: load registry → filter by provider → filter by tool_call → return model IDs
- [ ] Update `schemas/runners.json`: remove old fields, add `model_providers`
- [ ] Update HTTP types (`RunnerCreatePayload`, `RunnerUpdatePayload`, `RunnerInfoResponse`)
- [ ] Replace model_list_command execution in `/api/runners/:id/models` with registry lookup
- [ ] Update UI: `api.ts` types, backend adapters, runner settings form, session create dialog
- [ ] Update locales (en, zh-CN): remove hardcoded model placeholders, add `modelProviders` labels
- [ ] Write tests for `resolve_runner_models()` with mock registry data

## Test

- [ ] `copilot` runner resolves models from `github-copilot` provider in registry
- [ ] `claude` runner resolves models from `anthropic` provider (filtered to tool_call-capable models)
- [ ] Runners with no `model_providers` return empty models list
- [ ] Multi-provider runners (aider) merge and deduplicate models from all providers
- [ ] Offline fallback works via `bundled_models.json` when API is unreachable
- [ ] Model filter excludes embedding/audio-only models
- [ ] User can configure `model_providers` in project-level `runners.json`
- [ ] Existing `runners.json` files with `available_models` are gracefully ignored (no crash)
- [ ] Settings UI no longer shows "Available Models" textarea
- [ ] Session create dialog model selector pulls from registry

## Notes

- models.dev is community-maintained and updated frequently — always reflects latest models
- The bundled snapshot ensures offline/air-gapped environments still get model lists
- Future: "Refresh models" button to force registry re-fetch
- Future: provider-specific model aliases (e.g., `sonnet` → `claude-sonnet-4-5`)
- `available_models` in existing user `runners.json` files should be silently ignored via `#[serde(default)]` during migration