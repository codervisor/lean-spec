# Implementation Plan: AI SDK Rust Migration

This document contains the detailed implementation phases for migrating from Vercel AI SDK (Node.js) to native Rust using `async-openai` and `anthropic` crates.

**Parent Spec**: [242-ai-sdk-rust-migration](./README.md)

---

## Implementation Phases

### Phase 1: Setup & Dependencies (1 day) ✅ COMPLETE

- [x] ~~Research latest aisdk.rs version and API~~ → Discovered incompatibility (Rust 2024 edition issues)
- [x] Evaluate alternatives → Selected `async-openai` + `anthropic` crates
- [x] Add dependencies to `leanspec-core/Cargo.toml`
- [ ] Create `ai_native` module structure in `leanspec-core`
- [ ] Setup feature flag for ai_native (allow incremental rollout)
- [ ] Add test dependencies (tokio-test, mockito)
- [ ] Verify compilation

### Phase 2: Provider Implementation (2 days) - NOT STARTED

- [ ] Implement `providers.rs` with unified `ProviderClient` enum
- [ ] Implement OpenAI provider using `async-openai` crate
- [ ] Implement OpenRouter provider (OpenAI-compatible with custom base URL)
- [ ] Implement Anthropic provider using `anthropic` crate
- [ ] Add provider factory with API key resolution from config
- [ ] Write unit tests for each provider
- [ ] Test streaming with each provider (manual verification)

### Phase 3: Tool Migration (3 days) - NOT STARTED

- [ ] Create tools module structure with JSON schema support
- [ ] Add `#[derive(JsonSchema)]` to all input structs using `schemars`
- [ ] Port `list_specs` tool → `tools/list_specs.rs`
- [ ] Port `search_specs` tool → `tools/search_specs.rs`
- [ ] Port `get_spec` tool → `tools/get_spec.rs`
- [ ] Port `update_spec_status` tool → `tools/update_spec_status.rs`
- [ ] Port `link_specs` tool → `tools/link_specs.rs`
- [ ] Port `unlink_specs` tool → `tools/unlink_specs.rs`
- [ ] Port `validate_specs` tool → `tools/validate_specs.rs`
- [ ] Port `read_spec` tool → `tools/read_spec.rs`
- [ ] Port `update_spec` tool → `tools/update_spec.rs`
- [ ] Port `update_spec_section` tool → `tools/update_spec_section.rs`
- [ ] Port `toggle_checklist_item` tool → `tools/toggle_checklist_item.rs`
- [ ] Port `read_subspec` tool → `tools/read_subspec.rs`
- [ ] Port `update_subspec` tool → `tools/update_subspec.rs`
- [ ] Convert `make_tool` to use `ChatCompletionTool` format (OpenAI schema)
- [ ] Test tool schema generation with schemars
- [ ] Write unit tests for each tool
- [ ] Create tool registry for provider integration

### Phase 4: Chat Streaming (2 days) - NOT STARTED

- [ ] Implement `chat.rs` with `async-openai` streaming
- [ ] Implement SSE streaming for OpenAI/OpenRouter providers
- [ ] Implement SSE streaming for Anthropic provider
- [ ] Implement tool call/result streaming
- [ ] Add max_steps support (multi-step agents)
- [ ] Add error propagation
- [ ] Write integration tests for streaming
- [ ] Test SSE format compatibility with UI (useChat hook)

### Phase 5: HTTP Handler Integration (1 day)

- [ ] Update `chat_handler.rs` to use `ai_native`
- [ ] Remove IPC fallback logic
- [ ] Update error handling
- [ ] Test end-to-end HTTP → AI → streaming
- [ ] Verify UI compatibility (no frontend changes needed)

### Phase 6: Cleanup & Deprecation (1 day)

- [ ] Delete `packages/ai-worker/` directory
- [ ] Delete `src/ai/protocol.rs` from core
- [ ] Delete `src/ai/worker.rs` from core
- [ ] Update `src/ai/manager.rs` to deprecated (or remove if unused)
- [ ] Remove Node.js worker dependencies from HTTP server
- [ ] Update Cargo.toml files (remove unused deps)
- [ ] Clean up imports across codebase

### Phase 7: Documentation & Examples (1 day)

- [ ] Update README.md (remove Node.js requirement)
- [ ] Update installation docs
- [ ] Update Docker files (use smaller base image)
- [ ] Add aisdk.rs architecture documentation
- [ ] Document provider configuration
- [ ] Add examples for tool usage
- [ ] Update API documentation

### Phase 8: Testing & Validation (2 days)

- [ ] Run full test suite: `cargo test --workspace`
- [ ] Run integration tests with real providers
- [ ] Load test with 100+ concurrent chats
- [ ] Benchmark vs Node.js worker (latency, memory)
- [ ] Test error scenarios (invalid keys, rate limits)
- [ ] Verify UI functionality (all 14 tools work)
- [ ] Test Docker builds (verify size reduction)

### Phase 9: Deployment & Rollout (1 day)

- [ ] Deploy to staging environment
- [ ] Monitor for errors/issues
- [ ] A/B test if possible (compare with Node.js worker)
- [ ] Roll out to production gradually
- [ ] Monitor performance metrics
- [ ] Collect user feedback

### Phase 10: Post-Migration Cleanup (1 day)

- [ ] Remove deprecated code paths
- [ ] Archive Node.js worker package
- [ ] Update CI/CD (remove Node.js steps)
- [ ] Announce migration in changelog
- [ ] Update project website/marketing materials
- [ ] Celebrate pure Rust architecture! 🎉

---

## Migration Impact Analysis

### Files to Delete (~1,200 LOC)

- ❌ `packages/ai-worker/` (entire package)
  - `src/worker.ts` (262 lines)
  - `src/tools/leanspec-tools.ts` (378 lines)
  - `src/provider-factory.ts` (50 lines)
  - `src/config.ts` (120 lines)
  - `package.json`, dependencies, etc.
- ❌ `rust/leanspec-core/src/ai/protocol.rs` (243 lines IPC protocol)
- ❌ `rust/leanspec-core/src/ai/worker.rs` (419 lines IPC worker)
- ❌ `rust/leanspec-http/src/handlers/chat_handler.rs` (IPC fallback logic)

### Files to Create (~1,500 LOC)

- ✅ `rust/leanspec-core/src/ai_native/mod.rs` (~100 lines)
- ✅ `rust/leanspec-core/src/ai_native/chat.rs` (~300 lines)
- ✅ `rust/leanspec-core/src/ai_native/providers.rs` (~200 lines)
- ✅ `rust/leanspec-core/src/ai_native/tools/` (~800 lines, 14 tools × ~60 lines)
- ✅ `rust/leanspec-core/src/ai_native/error.rs` (~100 lines)

### Files to Update

- 🔄 `rust/leanspec-core/Cargo.toml` (add async-openai, anthropic, schemars dependencies)
- 🔄 `rust/leanspec-core/src/lib.rs` (export ai_native module)
- 🔄 `rust/leanspec-http/src/handlers/chat_handler.rs` (use ai_native)
- 🔄 `rust/leanspec-http/Cargo.toml` (remove IPC dependencies)
- 🔄 Documentation, README files

**Net Change**: ~300 lines added (1,500 new - 1,200 deleted)

---

## Timeline Estimate

### Optimistic: 8-10 days

- Phase 1: 1 day (foundation complete)
- Phase 2: 2 days (providers)
- Phase 3: 3 days (tools)
- Phase 4: 2 days (chat streaming)
- Phase 5: 1 day (HTTP integration)
- Phase 6-7: 1 day (cleanup + docs)

### Realistic: 12-14 days

- Add 1-2 days for provider API differences
- Add 1-2 days for tool schema generation
- Add 1 day for unexpected issues

### Pessimistic: 18+ days

- If provider streaming differences: +3 days
- If UI compatibility issues: +3 days
- If performance problems: +2 days

**Recommendation**: Start with 2-week sprint, extend if needed.

---

## Rollback Plan

If migration fails or encounters blockers:

1. **Revert commits**: Git revert to pre-migration state
2. **Keep Node.js worker**: Re-enable IPC architecture
3. **Feature flag**: Add `LEANSPEC_USE_RUST_AI` env var
4. **Document blockers**: Update spec with findings
5. **Revisit in 6 months**: Wait for aisdk.rs maturity

**Note**: Design for clean git history with atomic commits per phase.

### Key Changes from aisdk.rs to async-openai/anthropic

1. **No unified provider trait** - Must implement separate logic for OpenAI-compatible vs Anthropic APIs
2. **Different streaming APIs** - `async-openai` uses `ChatCompletionResponseStream`, Anthropic uses its own streaming format
3. **Tool schema format** - OpenAI uses specific JSON Schema format, need to convert from schemars
4. **No `#[tool]` macro** - Must manually define tool schemas and execution mapping
5. **More explicit error handling** - Direct API error types instead of unified abstraction

**Benefits of the switch**:
- ✅ Stable Rust (no 2024 edition requirements)
- ✅ Mature, well-tested crates (3k+ GitHub stars for async-openai)
- ✅ Better documentation and community support
- ✅ More predictable API (closer to raw OpenAI/Anthropic APIs)
