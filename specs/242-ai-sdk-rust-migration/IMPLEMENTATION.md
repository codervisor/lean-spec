# Implementation Plan: AI SDK Rust Migration

This document contains the detailed implementation phases for migrating from Vercel AI SDK (Node.js) to aisdk.rs (Rust).

**Parent Spec**: [242-ai-sdk-rust-migration](./README.md)

---

## Implementation Phases

### Phase 1: Setup & Dependencies (1 day)

- [ ] Research latest aisdk.rs version and API
- [ ] Add aisdk dependencies to `leanspec-core/Cargo.toml`
- [ ] Create `ai_native` module structure in `leanspec-core`
- [ ] Setup feature flag for ai_native (allow incremental rollout)
- [ ] Add test dependencies (tokio-test, mockito)
- [ ] Verify compilation

### Phase 2: Provider Implementation (2 days)

- [ ] Implement `providers.rs` with OpenRouter support
- [ ] Implement OpenAI provider integration
- [ ] Implement Anthropic provider integration
- [ ] Add provider factory with API key resolution
- [ ] Write unit tests for each provider
- [ ] Test streaming with each provider (manual verification)

### Phase 3: Tool Migration (3-4 days)

- [ ] Create tools module structure
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
- [ ] Write unit tests for each tool
- [ ] Create tool registry/factory

### Phase 4: Chat Streaming (2 days)

- [ ] Implement `chat.rs` with aisdk.rs integration
- [ ] Implement streaming logic (text chunks)
- [ ] Implement tool call/result streaming
- [ ] Add max_steps support (multi-step agents)
- [ ] Add error propagation
- [ ] Write integration tests for streaming
- [ ] Test SSE format compatibility with UI

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

- 🔄 `rust/leanspec-core/Cargo.toml` (add aisdk dependencies)
- 🔄 `rust/leanspec-core/src/lib.rs` (export ai_native module)
- 🔄 `rust/leanspec-http/src/handlers/chat_handler.rs` (use ai_native)
- 🔄 `rust/leanspec-http/Cargo.toml` (remove IPC dependencies)
- 🔄 Documentation, README files

**Net Change**: ~300 lines added (1,500 new - 1,200 deleted)

---

## Timeline Estimate

### Optimistic (experienced with aisdk.rs): 10-12 days

- Phase 1-2: 3 days (setup + providers)
- Phase 3: 3 days (tools)
- Phase 4-5: 2 days (chat + HTTP)
- Phase 6-7: 1 day (cleanup + docs)
- Phase 8-10: 2 days (testing + deployment)

### Realistic (learning aisdk.rs): 14-18 days

- Add 2-3 days for learning curve
- Add 1-2 days for edge cases
- Add 1 day for unexpected issues

### Pessimistic (major blockers): 20+ days

- If aisdk.rs has missing features: +5 days
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
