---
status: planned
created: 2026-02-04
priority: high
parent: 094-ai-chatbot-web-integration
created_at: 2026-02-04T15:08:09.981072Z
updated_at: 2026-02-04T15:22:03.452434Z
---
# AI Chat Model Selector UX Improvements

> **Status**: planned · **Priority**: high · **Created**: 2026-02-04

## Overview

This spec addresses multiple UX issues with the AI chat model selector in the LeanSpec UI:

1. **Model Whitelist**: Allow enabling/disabling models for a given provider to reduce clutter
2. **Smart Default Selection**: Use first available model from a configured provider if no preference is persisted or current selection becomes unavailable
3. **Provider Mismatch Bug**: Fix error "missing api key for provider: OpenAI" when a model from a different provider (e.g., Claude Sonnet 4.5 on OpenRouter) is selected
4. **Missing Model Icons**: Add provider/model icons to the inline model selector in the chat input prompt

## Root Cause Analysis

### Issue 3: Provider Mismatch Bug

**Current Behavior**: User selects "Claude Sonnet 4.5 (OpenRouter)" → sends message → receives "Missing API key for provider: OpenAI" error.

**Root Cause Analysis**:

In `ChatPage.tsx`:
- `INITIAL_DEFAULT_MODEL` is hardcoded to `{ providerId: 'openai', modelId: 'gpt-4o' }`
- `selectedModel` state starts with this hardcoded default
- The `useEffect` that syncs `selectedModel` with `defaultSelection` only runs when the initial model doesn't exist or provider isn't configured
- When user selects a model in InlineModelSelector, `selectedModel` is updated correctly
- **BUT**: The `useLeanSpecChat` hook uses `selectedModel.providerId` and `selectedModel.modelId` for the transport
- When creating a new thread, `ChatApi.createThread()` is called with the current `selectedModel`
- The thread is created with correct model info
- However, the chat transport is created with potentially stale values if react state hasn't synchronized

**The Critical Bug**: When the page loads and `useModelsRegistry` returns its `defaultSelection`, the code only updates `selectedModel` if it still equals `INITIAL_DEFAULT_MODEL`. But if the user changes the model before registry loads, this check passes incorrectly.

Additionally, looking at `providers.rs`:
```rust
let provider = config.providers.iter()
    .find(|p| p.id == provider_id)
    .ok_or_else(|| AiError::InvalidProvider(provider_id.to_string()))?;
```

This uses the `chat_config.json` providers list. If "openrouter" provider's model IDs don't match what's being sent, it falls back to defaults or throws an error.

## Design

### 1. Model Enable/Disable (Whitelist)

Add a new configuration in `chat_config.json`:

```json
{
  "settings": {
    "defaultProviderId": "openrouter",
    "defaultModelId": "anthropic/claude-sonnet-4",
    "enabledModels": {
      "openrouter": ["anthropic/claude-sonnet-4", "anthropic/claude-3.5-haiku", "openai/gpt-4o"],
      "openai": ["gpt-4o", "gpt-4.1"],
      "anthropic": ["claude-sonnet-4"]
    }
  }
}
```

When `enabledModels` is defined for a provider, filter the models list to only show enabled ones. If not defined, show all models.

### 2. Smart Default Selection

Improve `use-models-registry.ts` and `ChatPage.tsx`:
- Remove hardcoded `INITIAL_DEFAULT_MODEL`
- Compute default from registry immediately on first load
- If persisted selection is unavailable (provider unconfigured or model removed), fall back to first available tool-enabled model

### 3. Provider Mismatch Bug Fix

The bug occurs because:
1. `selectedModel` state initialization doesn't wait for registry
2. When user selects a model, the transport might be using stale values

**Fix Strategy**:
- Initialize `selectedModel` as `null` and show loading state until registry is ready
- Use `useMemo` to compute transport config from stable state
- Add validation that `selectedModel.providerId` matches a configured provider before sending

### 4. Model Icons

Add provider icons to `InlineModelSelector`:
- Use a mapping of provider IDs to SVG icons or emoji representations
- Display provider icon before model name

## Plan

- [ ] Extend chat config schema to support `enabledModels` (providerId -> modelIds) in Rust and API: update `ChatSettings` in [rust/leanspec-core/src/storage/chat_config.rs](rust/leanspec-core/src/storage/chat_config.rs), plus `ChatConfigClient`/`ChatConfigUpdate` serialization in [rust/leanspec-http/src/handlers/chat_config.rs](rust/leanspec-http/src/handlers/chat_config.rs).
- [ ] Update UI chat config types and settings UI to edit enabled models: [packages/ui/src/types/chat-config.ts](packages/ui/src/types/chat-config.ts), [packages/ui/src/pages/ChatSettingsPage.tsx](packages/ui/src/pages/ChatSettingsPage.tsx), and/or [packages/ui/src/components/settings/AISettingsTab.tsx](packages/ui/src/components/settings/AISettingsTab.tsx).
- [ ] Filter registry models using enabled models in [packages/ui/src/lib/use-models-registry.ts](packages/ui/src/lib/use-models-registry.ts) and ensure `defaultSelection` respects the filtered list.
- [ ] Remove hardcoded `INITIAL_DEFAULT_MODEL` and initialize `selectedModel` from registry once ready in [packages/ui/src/pages/ChatPage.tsx](packages/ui/src/pages/ChatPage.tsx); align defaults in [packages/ui/src/components/chat/ChatSidebar.tsx](packages/ui/src/components/chat/ChatSidebar.tsx).
- [ ] Add provider/model icon mapping in [packages/ui/src/components/chat/InlineModelSelector.tsx](packages/ui/src/components/chat/InlineModelSelector.tsx) (and reuse in [packages/ui/src/components/chat/EnhancedModelSelector.tsx](packages/ui/src/components/chat/EnhancedModelSelector.tsx) if needed).
- [ ] Validate provider/model on send: ensure transport uses current selection and session data includes provider/model; audit defaults in [packages/ui/src/lib/chat-api.ts](packages/ui/src/lib/chat-api.ts) and backend selection in [rust/leanspec-core/src/ai_native/providers.rs](rust/leanspec-core/src/ai_native/providers.rs).

## Test

- [ ] Enable only 2 models for OpenRouter, verify only those appear in selector
- [ ] Start fresh with no saved preference, verify first configured provider's model is selected
- [ ] Select OpenRouter Claude model, send message, verify no "missing API key" error
- [ ] Verify provider icons display correctly in inline selector
- [ ] Switch providers and models rapidly, verify no state mismatch

## Notes

### Codebase Findings

- [packages/ui/src/pages/ChatPage.tsx](packages/ui/src/pages/ChatPage.tsx) initializes `selectedModel` to a hardcoded `INITIAL_DEFAULT_MODEL` and only replaces it when the value still equals the hardcoded default.
- [packages/ui/src/lib/use-models-registry.ts](packages/ui/src/lib/use-models-registry.ts) loads defaults from `/api/chat/config` but does not expose any enabled-models whitelist.
- [packages/ui/src/lib/chat-api.ts](packages/ui/src/lib/chat-api.ts) defaults missing session provider/model to `openai/gpt-4o`, which can mask stored provider/model issues.
- [packages/ui/src/components/chat/InlineModelSelector.tsx](packages/ui/src/components/chat/InlineModelSelector.tsx) renders text-only provider/model labels; no icon mapping exists.
- [packages/ui/src/components/chat/ChatSidebar.tsx](packages/ui/src/components/chat/ChatSidebar.tsx) also hardcodes `openai/gpt-4o` for the sidebar chat model.
- [rust/leanspec-core/src/storage/chat_config.rs](rust/leanspec-core/src/storage/chat_config.rs) `ChatSettings` only includes `max_steps`, `default_provider_id`, `default_model_id`, so `enabledModels` needs schema support here.
