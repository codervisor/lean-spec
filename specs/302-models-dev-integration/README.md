---
status: complete
created: 2026-02-03
priority: medium
parent: 168-leanspec-orchestration-platform
created_at: 2026-02-03T15:00:14.818091Z
updated_at: 2026-02-04T15:26:56.012112Z
transitions:
- status: in-progress
  at: 2026-02-03T15:00:24.572294Z
---
# Integrate models.dev as Default Model Registry

## Why
LeanSpec users currently need to manually configure LLM models and providers in their AI chat settings. This creates friction during onboarding and ongoing usage. By integrating models.dev as the default model registry, users get automatic access to 80+ providers and hundreds of models without manual configuration.

## Goal
- Use models.dev API (https://models.dev/api.json) as the source of truth for available AI models
- Auto-detect configured API keys in environment and only show usable providers
- Allow optional user overrides for custom configurations
- Reduce time-to-first-chat from minutes to seconds

## Design

### Data Source
models.dev provides:
- Provider metadata: `id`, `name`, `env` (required API key vars), `npm` (AI SDK package), `api` (base URL), `doc`
- Rich model info: `id`, `name`, `family`, capabilities (`tool_call`, `reasoning`, `attachment`), `cost` (input/output), `limit` (context/output tokens)

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      models.dev API                          │
│                https://models.dev/api.json                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ fetch + cache
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           ModelRegistry (Rust leanspec-core)                 │
│  - Cache models.dev data locally (~/.lean-spec/models.json)  │
│  - Refresh on startup if stale (24h TTL)                     │
│  - Filter providers by available API keys                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  ChatConfig (existing)                       │
│  - Uses ModelRegistry for available models                   │
│  - Optional user overrides (custom base_url, models)         │
│  - Stores user preferences (default provider/model)          │
└─────────────────────────────────────────────────────────────┘
```

### Key Changes

1. **New Rust module**: `leanspec-core/src/models_registry/`
   - Fetch from models.dev API
   - Local cache with TTL
   - Environment-based provider filtering

2. **Updated ChatConfig**:
   - Remove hardcoded provider/model list
   - Delegate to ModelRegistry for available options
   - Keep user preferences and overrides

3. **UI Integration**:
   - Show "x providers available, y API keys configured"
   - Group models by provider with capability badges
   - Highlight models with reasoning/tool_call support

### Priority Providers
Focus on commonly used providers with tool_call support:
- openai (OPENAI_API_KEY)
- anthropic (ANTHROPIC_API_KEY)
- deepseek (DEEPSEEK_API_KEY)
- google (GOOGLE_GENERATIVE_AI_API_KEY)
- openrouter (OPENROUTER_API_KEY)
- groq (GROQ_API_KEY)
- fireworks-ai (FIREWORKS_API_KEY)

### Offline Fallback
- Bundle a snapshot of models.dev in the binary for offline use
- Update bundled snapshot with each release

## Checklist
- [x] Create `models_registry` module in leanspec-core
- [x] Implement models.dev API fetching with caching
- [x] Filter providers by configured environment variables
- [x] Update ChatConfig to use ModelRegistry
- [x] Update HTTP server endpoints for model listing
- [x] Update UI model selector with new capabilities
- [x] Add offline fallback with bundled snapshot
- [x] Write tests for registry and filtering logic