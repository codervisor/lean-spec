---
status: planned
created: 2026-02-08
priority: high
tags:
- rust
- ai-native
- streaming
- openai
- reasoning
created_at: 2026-02-08T05:33:44.998242Z
updated_at: 2026-02-08T05:33:44.998242Z
---
# OpenAI Responses API for Native Reasoning Streaming

## Overview

The Chat Completions API path in `chat.rs` uses a fragile hack (`extract_reasoning_from_raw_chunk`) to extract `reasoning_content` from raw JSON because `async-openai`'s typed struct doesn't model this field. The Responses API provides native `ResponseReasoningTextDelta` events, making reasoning streaming first-class.

The Responses API also enables: reasoning summaries, encrypted reasoning content for multi-turn continuity, and response-level metadata tracking.

**Providers that support Responses API (verified against official docs, Feb 2026):**

| Provider      | `/v1/responses` | Source                                                                                    | Notes                                                                                                              |
| ------------- | --------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| OpenAI        | Yes             | [API docs](https://platform.openai.com/docs/api-reference/responses)                      | Full support — origin of the API. All GPT-4o, GPT-4.1, GPT-5, o-series models.                                     |
| Azure OpenAI  | Yes             | [Azure docs](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/responses) | Full support including streaming, function calling, code interpreter, MCP tools, background tasks. 25+ regions.    |
| xAI (Grok)    | Yes             | [xAI API docs](https://docs.x.ai/docs/api-reference)                                      | Full `/v1/responses` endpoint with reasoning summaries. Notes "OpenResponses compatibility" for some fields.       |
| OpenRouter    | Yes (beta)      | Docs unavailable for verification                                                         | Referenced as beta.                                                                                                |
| Google/Gemini | **No**          | [OpenAI compat docs](https://ai.google.dev/gemini-api/docs/openai)                        | Chat Completions only. Reasoning via `reasoning_effort` / `thinking_config` in CC API. Has own "Interactions API". |
| HuggingFace   | **No**          | [Inference docs](https://huggingface.co/docs/api-inference/en/tasks/chat-completion)      | Chat Completions only. No Responses API endpoint (404).                                                            |

## Design

### Protocol Selection

Use models.dev registry data (already bundled/refreshed) to determine capabilities — **no hardcoded model-ID prefix matching**. The registry's `reasoning: bool` field tells us if a model supports reasoning, and the provider ID tells us if Responses API is available.

In `providers.rs`:

```rust
/// Providers verified to support the OpenAI Responses API (`/v1/responses`).
/// Source: Official API documentation, verified Feb 2026.
/// Google/Gemini and HuggingFace do NOT support this endpoint.
const RESPONSES_API_PROVIDERS: &[&str] = &["openai", "azure", "xai", "openrouter"];

fn supports_responses_api(provider_id: &str, model: &Model) -> bool {
    // Provider must expose /v1/responses endpoint
    let provider_supports = RESPONSES_API_PROVIDERS.contains(&provider_id);
    // Model must have reasoning capability
    provider_supports && model.supports_reasoning()
}
```

Add `use_responses_api: bool` to `ProviderSelection`. Pass the registry `Model` through `select_provider()` to enable capability-based routing.

This follows the AI SDK (`getOpenAILanguageModelCapabilities`) and OpenCode (`shouldUseCopilotResponsesApi`) patterns but uses data-driven capability detection instead of allowlists.

### Models.dev Schema Gaps

The registry has fields we're NOT yet storing. Add to `Model` struct in `types.rs`:

| Field                    | Type                        | Description                                                                |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------- |
| `interleaved`            | `Option<serde_json::Value>` | Interleaved reasoning support (`bool` or `{"field": "reasoning_details"}`) |
| `status`                 | `Option<String>`            | Model status: `alpha`, `beta`, `deprecated`                                |
| `provider`               | `Option<ProviderOverride>`  | Provider override (e.g., `{"npm": "@ai-sdk/openai"}`)                      |
| `limit.input`            | `Option<u64>`               | Max input tokens (separate from context window)                            |
| `cost.reasoning`         | `Option<f64>`               | Per-million reasoning token pricing                                        |
| `cost.input_audio`       | `Option<f64>`               | Audio input pricing                                                        |
| `cost.output_audio`      | `Option<f64>`               | Audio output pricing                                                       |
| `cost.context_over_200k` | `Option<CostTier>`          | Different pricing for >200K context                                        |

These gaps should be addressed alongside the Responses API work since `interleaved` and `status` are relevant to protocol selection.

### Responses API Streaming

New function `stream_openai_responses_round()` in `chat.rs`:

- Use `client.responses().create_stream(request)` from `async-openai`
- Map `ResponseOutputItemAdded` (type=reasoning) → `StreamEvent::ReasoningStart`
- Map `ResponseReasoningSummaryTextDelta` → `StreamEvent::ReasoningDelta`
- Map `ResponseOutputItemDone` (type=reasoning) → `StreamEvent::ReasoningEnd`
- Map `ResponseOutputTextDelta` → `StreamEvent::TextDelta`
- Map `ResponseFunctionCallArgumentsDelta` → tool accumulation

### Routing in Conversation Loop

```rust
let round_result = if selection.use_responses_api {
    stream_openai_responses_round(/* ... */).await?
} else {
    stream_openai_round(/* ... */).await?  // existing CC path
};
```

### Dependency: Enable `responses` feature

```toml
async-openai = {version = "0.32", features = ["chat-completion", "responses"]}
```

## Plan

- [ ] Add missing models.dev fields to `Model` struct (interleaved, status, provider, cost.reasoning, limit.input, etc.)
- [ ] Enable `responses` feature in async-openai Cargo.toml
- [ ] Add `supports_responses_api()` using registry `Model.reasoning` field (no prefix matching)
- [ ] Pass registry `Model` into `select_provider()` for capability-based routing
- [ ] Add `use_responses_api` field to `ProviderSelection`
- [ ] Implement `stream_openai_responses_round()` in chat.rs
- [ ] Wire protocol routing in `run_openai_conversation()`
- [ ] Handle reasoning/text/tool-call stream events from Responses API
- [ ] Add reasoning effort config option support
- [ ] Update `generate_text()` to optionally use Responses API
- [ ] Add unit tests for Responses API path
- [ ] Verify Chat Completions regression (existing tests pass)

## Test

- [ ] Reasoning events emitted correctly via Responses API (start/delta/end)
- [ ] Text events emitted correctly via Responses API
- [ ] Tool calls work via Responses API (function_call items)
- [ ] Chat Completions path still works for non-reasoning models
- [ ] Chat Completions fallback works for generic OpenAI-compat providers
- [ ] Protocol selection correctly routes by provider + model.reasoning flag

## Notes

- **Data-driven detection**: Use `model.supports_reasoning()` from models.dev registry instead of hardcoded prefix lists. The registry already tracks 100+ reasoning models across 70+ providers.
- **AI SDK pattern**: Separate model classes with model-ID prefix matching. Stream events use `reasoning-start/delta/end` — matching our SSE protocol.
- **OpenCode pattern**: `shouldUseCopilotResponsesApi(modelID)` routes GPT-5+ to Responses API. Provider factory exposes `sdk.chat()` vs `sdk.responses()`.
- **Anthropic**: Separate issue — `anthropic` crate v0.0.8 lacks thinking block streaming.
- **Fallback**: Keep `extract_reasoning_from_raw_chunk` hack for generic OpenAI-compat providers (e.g., Google/Gemini, HuggingFace, DeepSeek).
- **Config escape hatch**: `force_responses_api: bool` option per provider for custom deployments that support the endpoint but aren't in the verified list.
- **No single official source**: There is no registry (including models.dev) that tracks provider-level protocol support. The `RESPONSES_API_PROVIDERS` list is manually maintained based on official API documentation. Consider proposing a `protocols` field upstream to models.dev.
- **xAI specifics**: xAI's Responses API includes `summary_text` in reasoning output items and has deprecated their Anthropic SDK compatibility in favor of Responses API.
- **Azure specifics**: Azure requires `base_url` format `https://{resource}.openai.azure.com/openai/v1/` and supports additional features like MCP tools, code interpreter, and background tasks.
- **Gemini reasoning**: Google supports reasoning via Chat Completions `reasoning_effort` param and proprietary `thinking_config` via `extra_body` — not via Responses API.