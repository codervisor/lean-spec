---
status: planned
created: 2026-02-06
priority: high
tags:
- ai
- rust
- architecture
- providers
parent: 168-leanspec-orchestration-platform
created_at: 2026-02-06T13:19:22.393941Z
updated_at: 2026-02-06T14:20:41.880201Z
---

# AI Provider Abstraction Layer (Inspired by Vercel AI SDK)

## Overview

The current Rust AI integration uses a concrete `ProviderClient` enum with `match`-based dispatch in `chat.rs`. Adding new providers (Gemini, Mistral, etc.) requires modifying the enum, `build_provider()`, and every match arm across `stream_chat()` and `generate_text()`. The Vercel AI SDK solves this elegantly with a trait-based provider/model abstraction — we should adopt a similar pattern in Rust.

## Non-Goals

- Rewriting in TypeScript or using the AI SDK npm package directly
- Building a full provider registry with middleware (AI SDK v3 feature beyond our needs)
- Supporting non-language model types (image, speech, transcription) — LeanSpec only uses language models

## Design

### Vercel AI SDK Architecture (Reference)

The AI SDK V3 specification defines:

1. **`ProviderV3` trait** — Factory that creates model instances by ID:
   - `language_model(model_id) → LanguageModelV3`
   - `embedding_model(model_id) → EmbeddingModelV3`

2. **`LanguageModelV3` trait** — Uniform interface all providers implement:
   - `do_generate(options) → GenerateResult` (non-streaming)
   - `do_stream(options) → StreamResult` (streaming)
   - `provider: String`, `model_id: String`, `supported_urls: HashMap`

3. **Provider Registry** — Maps `"provider:model"` string IDs to provider instances

4. **OpenAI-Compatible base** — Reusable implementation for OpenAI-compat APIs (used by Groq, Together, Fireworks, xAI, etc.)

### Proposed Rust Architecture

```
trait LanguageModel: Send + Sync {
    fn provider(&self) -> &str;
    fn model_id(&self) -> &str;
    async fn generate(&self, req: GenerateRequest) -> Result<GenerateResponse>;
    fn stream(&self, req: GenerateRequest) -> Result<Pin<Box<dyn Stream<Item=StreamEvent>>>>;
}

trait Provider: Send + Sync {
    fn id(&self) -> &str;
    fn language_model(&self, model_id: &str) -> Result<Box<dyn LanguageModel>>;
}

struct ProviderRegistry {
    providers: HashMap<String, Box<dyn Provider>>,
    // resolve "openai:gpt-4o" → provider + model
    fn language_model(&self, id: &str) -> Result<Box<dyn LanguageModel>>;
}
```

**Key insight from AI SDK**: providers like Groq, Together, Fireworks, and DeepInfra all extend `OpenAICompatibleChatLanguageModel` — they share 90% of the code. Same pattern applies in Rust: an `OpenAiCompatModel` struct that works for any OpenAI-compatible API.

## Plan

- [ ] Define `LanguageModel` and `Provider` traits in `ai_native/`
- [ ] Create `OpenAiCompatModel` — reusable impl for OpenAI-compatible APIs
- [ ] Implement `AnthropicModel` with full tool-calling support (currently missing)
- [ ] Build `ProviderRegistry` to resolve `"provider:model"` IDs
- [ ] Migrate `stream_chat()` and `generate_text()` from match-based to trait-based dispatch
- [ ] Deduplicate `resolve_api_key()` (exists in both `chat_config.rs` and `providers.rs`)
- [ ] Add retry/backoff for provider API calls

## Test

- [ ] Unit test: `OpenAiCompatModel` works with mock HTTP server
- [ ] Unit test: `ProviderRegistry` resolves `"openai:gpt-4o"` correctly
- [ ] Integration test: Anthropic tool calling works end-to-end
- [ ] Existing chat streaming behavior unchanged after migration

## Notes

### AI SDK Key Patterns Worth Adopting

| AI SDK Pattern | Rust Equivalent |
|---------------|-----------------|
| `LanguageModelV3` interface | `LanguageModel` trait |
| `ProviderV3` interface | `Provider` trait |
| `OpenAICompatibleChatLanguageModel` | `OpenAiCompatModel` struct |
| `createProviderRegistry()` | `ProviderRegistry::new()` |
| `providerOptions` per-call | `ProviderOptions` in request |
| `LanguageModelV3CallOptions` | `GenerateRequest` struct |

### Current Pain Points Addressed

1. **Enum dispatch → Trait dispatch** — New providers = new struct, not enum modification
2. **Anthropic tool calling** — Currently missing, blocking agentic use
3. **Duplicated `resolve_api_key()`** — Single source of truth
4. **Fragile OpenAI-compat detection** — Explicit per-provider configuration instead of URL heuristics
5. **No retry logic** — Exponential backoff like AI SDK's `postJsonToApi`

### Reference: AI SDK Source Files

- Provider interface: `packages/provider/src/provider/v3/provider-v3.ts`
- Language model interface: `packages/provider/src/language-model/v3/language-model-v3.ts`
- Provider registry: `packages/ai/src/registry/provider-registry.ts`
- OpenAI-compatible base: `packages/openai-compatible/src/chat/openai-compatible-chat-language-model.ts`
- OpenAI provider: `packages/openai/src/openai-provider.ts`