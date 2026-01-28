---
status: planned
created: 2026-01-28
priority: high
tags:
- rust
- ai
- architecture
- migration
- technical-debt
depends_on:
- 240-rust-aisdk-migration-evaluation
- 241-rust-monorepo-architecture-refactoring
created_at: 2026-01-28T08:01:20.589461Z
updated_at: 2026-01-28T08:01:33.022644Z
---

# Migrate from Vercel AI SDK (Node.js) to aisdk.rs (Rust)

## Overview

**Context**: Spec 240 evaluated the feasibility of migrating from the Vercel AI SDK (Node.js) to aisdk.rs (Rust). The evaluation concluded that:

1. ✅ Migration is **feasible** and should use **full migration** (not hybrid)
2. ✅ aisdk.rs is **actively maintained** (latest commit 4 days ago)
3. ✅ Feature parity exists for all core functionality
4. ✅ Provider support is available for required providers

**Decision**: Proceed with full migration to achieve a pure Rust stack.

**Goals**:
- Eliminate Node.js dependency from LeanSpec architecture
- Reduce deployment complexity (single binary instead of two processes)
- Remove IPC overhead between Rust HTTP server and Node.js worker
- Leverage type safety and performance benefits of Rust
- Align with Spec 241's consolidated core architecture

**Provider Requirements**:
- ✅ **OpenRouter** - Unified access to multiple models
- ✅ **OpenAI** - GPT-4o, GPT-4o-mini, GPT-5.2 series
- ✅ **Anthropic** - Claude 3.5 Sonnet, Claude 4.5 Sonnet

**Non-Goals**:
- Maintaining Node.js worker as fallback (clean break)
- Supporting all providers immediately (start with top 3)
- WASM compilation (future consideration)

## Design

**See [DESIGN.md](./DESIGN.md) for detailed architecture, implementation strategy, and technical specifications.**

### Summary

**Current Architecture**: Node.js AI Worker communicating via IPC with Rust HTTP Server (~140MB Docker image)

**Target Architecture**: Pure Rust implementation with native AI module (~80MB Docker image, ~15MB Alpine static)

**Key Components**:
- `ai_native` module in `leanspec-core` with direct tool implementations
- SSE streaming compatible with Vercel AI SDK frontend (`useChat` hook)
- Support for OpenRouter, OpenAI, and Anthropic providers
- All 14 LeanSpec tools ported to native Rust

**Frontend Compatibility**: See [AI_SDK_ALIGNMENT.md](./AI_SDK_ALIGNMENT.md) for SSE protocol specifications.

## Error Handling Strategy

**Current** (Node.js):
- JavaScript errors serialized to JSON
- Sent over IPC
- Deserialized in Rust
- Mapped to HTTP errors

**Proposed** (Rust):
- Native Rust error types
- Direct Result<T, AiError> propagation
- Compile-time error checking
- Idiomatic ? operator usage

```rust
#[derive(Debug, thiserror::Error)]
pub enum AiError {
    #[error("Provider error: {0}")]
    Provider(String),
    
    #[error("Model not found: {0}")]
    ModelNotFound(String),
    
    #[error("API key not configured for provider: {0}")]
    MissingApiKey(String),
    
    #[error("Tool execution failed: {tool_name} - {message}")]
    ToolExecution {
        tool_name: String,
        message: String,
    },
    
    #[error("Stream error: {0}")]
    Stream(String),
    
    #[error(transparent)]
    Core(#[from] leanspec_core::error::CoreError),
}
```

## Testing Strategy

**Unit Tests** (~1,000 LOC):
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_openai_streaming() {
        let request = ChatRequest {
            messages: vec![Message::user("Hello")],
            provider_id: "openai".to_string(),
            model_id: "gpt-4o".to_string(),
            system_prompt: "You are helpful".to_string(),
            max_steps: 5,
            tools_enabled: false,
        };
        
        let stream = stream_chat(request).await.unwrap();
        // Verify stream produces text chunks
    }
    
    #[tokio::test]
    async fn test_tool_execution() {
        // Test list_specs tool
        let input = ListSpecsInput {
            project_id: Some("test".to_string()),
            status: None,
            priority: None,
            tags: None,
        };
        
        let result = list_specs(input).await.unwrap();
        // Verify result is valid JSON
    }
    
    #[tokio::test]
    async fn test_multi_step_agent() {
        // Test agent loop with multiple tool calls
    }
}
```

**Integration Tests**:
- Full chat flow with real providers (using test keys)
- Tool execution with mock LeanSpec API
- SSE streaming to HTTP client
- Error handling scenarios

**Performance Tests**:
- First token latency
- Streaming throughput
- Memory usage under load
- Concurrent requests (10+ simultaneous chats)

## Plan

**See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the detailed 10-phase implementation plan.**

**Summary Timeline**:

- **Optimistic**: 10-12 days (experienced with aisdk.rs)
- **Realistic**: 14-18 days (includes learning curve)
- **Pessimistic**: 20+ days (if blockers encountered)

**Key Phases**:

1. **Setup & Dependencies** (1 day) - aisdk.rs integration, module structure
2. **Provider Implementation** (2 days) - OpenRouter, OpenAI, Anthropic support
3. **Tool Migration** (3-4 days) - Port all 14 LeanSpec tools to Rust
4. **Chat Streaming** (2 days) - SSE streaming, multi-step agent loop
5. **HTTP Handler Integration** (1 day) - Replace IPC with native calls
6. **Cleanup** (1 day) - Remove Node.js worker, update dependencies
7. **Documentation** (1 day) - Update README, installation guides
8. **Testing** (2 days) - Integration tests, benchmarks, validation
9. **Deployment** (1 day) - Staging, rollout, monitoring
10. **Post-Migration** (1 day) - Remove deprecated code, celebrate 🎉

**Net Code Change**: ~300 lines (+1,500 new, -1,200 deleted)

## Test

### Unit Tests
- [ ] **Providers**: OpenRouter, OpenAI, Anthropic client creation
- [ ] **Tools** (14 total): Each tool with valid/invalid inputs
  - [ ] `list_specs` with filters (status, priority, tags)
  - [ ] `search_specs` with query scoring
  - [ ] `get_spec` by name and number
  - [ ] `update_spec_status` with state transitions
  - [ ] `link_specs` / `unlink_specs` dependency management
  - [ ] `validate_specs` validation logic
  - [ ] `read_spec` / `update_spec` content operations
  - [ ] `update_spec_section` replace/append modes
  - [ ] `toggle_checklist_item` check/uncheck
  - [ ] `read_subspec` / `update_subspec` sub-spec operations
- [ ] **Chat**: Streaming logic, error handling
- [ ] **Error Types**: Proper error propagation

### Integration Tests
- [ ] **OpenAI**: GPT-4o streaming with tools (end-to-end)
- [ ] **Anthropic**: Claude 3.5 Sonnet streaming with tools
- [ ] **OpenRouter**: Universal endpoint with tools
- [ ] **Multi-step**: Agent loop with 3+ consecutive tool calls
- [ ] **SSE Format**: Events match UI expectations
- [ ] **Error Scenarios**:
  - Invalid API key → clear error message
  - Rate limit → retry logic
  - Network error → graceful degradation
  - Malformed request → validation error

### Performance Tests
- [ ] **First Token Latency**: < 500ms (vs Node.js baseline)
- [ ] **Streaming Throughput**: >= Node.js worker throughput
- [ ] **Memory Usage**: < Node.js worker memory (no Node.js runtime)
- [ ] **Concurrent Chats**: 50+ simultaneous chats without degradation
- [ ] **Binary Size**: Measure before/after (expect smaller)
- [ ] **Startup Time**: Measure process initialization

### Regression Tests
- [ ] All existing E2E tests pass
- [ ] UI chat functionality unchanged
- [ ] Desktop app chat works
- [ ] MCP tools continue working
- [ ] Session persistence intact
- [ ] Config management unchanged

### Compatibility Tests
- [ ] Docker deployment (smaller image)
- [ ] Linux builds (x86_64, aarch64)
- [ ] macOS builds (x86_64, aarch64)
- [ ] Windows builds (x86_64)
- [ ] Single binary installation

## Additional Notes

### aisdk.rs Research

**Repository**: https://github.com/lazy-hq/aisdk  
**Last Commit**: 4 days ago (as of Jan 28, 2026) ✅  
**Crate**: https://crates.io/crates/aisdk  
**Version**: Check latest on crates.io

**Key Features**:
- Provider-agnostic (OpenAI, Anthropic, Google, DeepSeek, etc.)
- Type-safe model/task validation
- Compatible with Vercel AI SDK UI components
- Tool calling with `#[tool]` macro
- Streaming responses (futures::Stream)

**Pre-Implementation Verification**:
```bash
# Verify aisdk.rs availability
cargo search aisdk
cargo info aisdk

# Check features
# - OpenAI provider support
# - Anthropic provider support
# - Tool calling API
# - Streaming capabilities
```

### OpenRouter Integration

OpenRouter provides unified access to 100+ models through a single API. It uses OpenAI-compatible endpoints:

```rust
// OpenRouter configuration
let provider = LeanSpecProvider::OpenRouter {
    api_key: std::env::var("OPENROUTER_API_KEY")?,
    base_url: "https://openrouter.ai/api/v1".to_string(),
};

// Use OpenAI client with custom base URL
let client = OpenAI::new(&api_key)
    .with_base_url("https://openrouter.ai/api/v1");
```

**Models Available**:
- GPT-4o, GPT-4o-mini
- Claude 3.5 Sonnet, Claude 4.5 Sonnet
- Gemini 1.5 Pro, Gemini 2.0 Flash
- DeepSeek v3
- Llama 3.3 70B
- And 100+ more...

### Alignment with Spec 241

Spec 241 consolidated infrastructure into `leanspec-core`. This migration follows the same pattern:

- ✅ AI logic moves to `core::ai_native` (not HTTP package)
- ✅ Tools directly call core APIs (no HTTP requests)
- ✅ HTTP handler becomes thin presentation layer
- ✅ CLI can potentially use AI features directly (future)

### Migration Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| aisdk.rs missing features | High | Low | Pre-verify all features with PoC |
| UI incompatibility | High | Medium | Test SSE format early, iterate |
| Performance regression | Medium | Low | Benchmark continuously, optimize |
| Provider API changes | Medium | Low | Abstract providers, easy to swap |
| Tool execution bugs | Medium | Medium | Comprehensive unit/integration tests |
| Memory leaks | Medium | Low | Rust's safety guarantees + testing |
| Documentation gaps | Low | Medium | Write docs as we code |

### Timeline Estimate

**Optimistic** (experienced with aisdk.rs): 10-12 days
- Phase 1-2: 3 days (setup + providers)
- Phase 3: 3 days (tools)
- Phase 4-5: 2 days (chat + HTTP)
- Phase 6-7: 1 day (cleanup + docs)
- Phase 8-10: 2 days (testing + deployment)

**Realistic** (learning aisdk.rs): 14-18 days
- Add 2-3 days for learning curve
- Add 1-2 days for edge cases
- Add 1 day for unexpected issues

**Pessimistic** (major blockers): 20+ days
- If aisdk.rs has missing features: +5 days
- If UI compatibility issues: +3 days
- If performance problems: +2 days

**Recommendation**: Start with 2-week sprint, extend if needed.

### Success Criteria

**Must Have**:
- ✅ All 14 tools work correctly
- ✅ OpenRouter + OpenAI + Anthropic providers functional
- ✅ UI receives correct SSE events (no frontend changes)
- ✅ All existing tests pass
- ✅ Performance >= Node.js worker
- ✅ Binary size reduced
- ✅ Documentation updated

**Nice to Have**:
- 🎯 Memory usage < Node.js worker
- 🎯 First token latency improved
- 🎯 Deployment size < 50% of current
- 🎯 Zero production issues in first week

### Related Specs

- **Spec 240**: Migration evaluation (COMPLETE) - basis for this spec
- **Spec 241**: Rust architecture refactoring (COMPLETE) - core consolidation
- **Spec 237**: Rust IPC AI Chat Bridge (COMPLETE) - current architecture
- **Spec 236**: Chat Config API Migration (COMPLETE) - config management
- **AI_SDK_ALIGNMENT.md**: Detailed SSE protocol and frontend compatibility specifications

### Dependencies

**Blocks**: None (can start immediately)  
**Blocked By**: Spec 241 (COMPLETE) ✅  
**Related Code**:
- `packages/ai-worker/` - Will be deleted
- `rust/leanspec-core/src/ai/` - Will be refactored
- `rust/leanspec-http/src/handlers/chat_handler.rs` - Will be updated

### Rollback Plan

If migration fails or encounters blockers:

1. **Revert commits**: Git revert to pre-migration state
2. **Keep Node.js worker**: Re-enable IPC architecture
3. **Feature flag**: Add `LEANSPEC_USE_RUST_AI` env var
4. **Document blockers**: Update spec with findings
5. **Revisit in 6 months**: Wait for aisdk.rs maturity

**Note**: Design for clean git history with atomic commits per phase.

### Future Enhancements (Out of Scope)

- **WASM Compilation**: Run in browser or serverless edge
- **CLI AI Commands**: Direct AI usage from CLI (no HTTP server)
- **Desktop Offline Mode**: Embed LLMs for offline usage
- **Custom Providers**: Plugin system for proprietary models
- **Streaming Optimization**: Zero-copy streaming, batching

### Token Economy

This spec: ~3,800 tokens (comprehensive coverage)  
Estimated implementation: ~1,500 new LOC, 1,200 deleted LOC  
Net change: +300 lines (simplified architecture)  
Complexity: High (8-10 days for experienced Rust dev)  

Keep implementation focused on core requirements. Avoid scope creep.