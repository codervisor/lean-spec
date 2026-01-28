---
status: planned
created: 2026-01-28
priority: medium
tags:
- rust
- ai
- architecture
- evaluation
- migration
created_at: 2026-01-28T03:18:51.318976Z
updated_at: 2026-01-28T03:18:51.318976Z
---

# Evaluate Migration from Node.js AI SDK to Rust aisdk

> **Status**: Planned · **Priority**: Medium · **Created**: 2026-01-28  
> **Dependencies**: Spec 237 (complete), Spec 236 (complete)

## Current Implementation State

**Spec 237** (Rust IPC AI Chat Bridge) is **COMPLETE** and in production:
- ✅ Rust HTTP server (`leanspec-http`) with Axum
- ✅ Node.js AI worker (`@leanspec/ai-worker`) via IPC
- ✅ IPC protocol via JSON Lines over stdin/stdout
- ✅ Worker lifecycle management with health checks
- ✅ Fallback to HTTP proxy if IPC unavailable

**Spec 236** (Chat Config API Migration) is **COMPLETE**:
- ✅ AI model config managed by Rust (not Node.js)
- ✅ Config stored at `~/.leanspec/config/chat.json`
- ✅ Node.js worker receives config via IPC

**This spec** evaluates replacing the Node.js worker with native Rust using aisdk.rs.

## Overview

**Problem**: Currently, LeanSpec uses the Vercel AI SDK (Node.js) through `@leanspec/ai-worker` to handle AI model interactions. This creates an architectural split:
- **Rust**: Core CLI, MCP server, HTTP server (fast, compiled, single binary)
- **Node.js**: AI worker for LLM streaming (requires Node.js runtime, separate process)

**Opportunity**: [aisdk.rs](https://aisdk.rs) is a Rust toolkit for building AI applications that is:
- Provider-agnostic (OpenAI, Anthropic, Google, DeepSeek, etc.)
- Type-safe with compile-time model/task validation
- Compatible with Vercel AI SDK UI components
- Native Rust (no IPC overhead, no Node.js dependency)

**Question**: Should we migrate from Node.js AI SDK to Rust aisdk to achieve a **pure Rust implementation**?

```
Current Architecture (Spec 237 - COMPLETED):
┌─────────────────────────┐
│ Rust HTTP Server        │ ← Main server (leanspec-http)
│ (leanspec-http)         │   Axum-based, manages all state
│ ├─ Chat config          │   (Spec 236 migrated config to Rust)
│ ├─ Session persistence  │   
│ └─ AI Worker Manager    │
└───────────┬─────────────┘
            │ IPC (stdin/stdout, JSON Lines)
            ↓
┌─────────────────────────┐
│ Node.js AI Worker       │ ← @leanspec/ai-worker
│ (packages/ai-worker/)   │   Vercel AI SDK v6.0.39+
│ ├─ streamText()         │   14 LeanSpec tools
│ ├─ Tool execution       │   Requires Node.js v20+
│ └─ Provider factory     │   (OpenAI, Anthropic, Google)
└─────────────────────────┘

Potential Architecture (Pure Rust):
┌─────────────────────────────────┐
│ Rust HTTP Server                │ ← Single process
│ (leanspec-http)                 │   + aisdk.rs crate
│ ├─ Chat config                  │   No Node.js needed
│ ├─ Session persistence          │
│ └─ AI Module (native)           │   Direct function calls
│    ├─ aisdk.rs providers        │   Zero IPC overhead
│    ├─ 14 Tool implementations   │   ~300 lines new code
│    └─ Stream handling           │   Removes 420+ lines IPC
└─────────────────────────────────┘
```

## Design

### Benefits Analysis

**Pros of Rust aisdk Migration**:
1. **Pure Rust Stack**: Single language, single runtime
2. **No Node.js Dependency**: Users don't need Node.js v20+ installed
3. **Zero IPC Overhead**: Direct function calls instead of JSON Lines over stdio
4. **Single Binary**: Can bundle everything into one executable
5. **Better Type Safety**: Compile-time model capability validation
6. **Lower Memory**: No Node.js runtime overhead (~50-100MB saved)
7. **Simpler Deployment**: One process instead of two
8. **Faster Startup**: No worker spawn delay
9. **Better Error Messages**: Rust error handling vs JavaScript
10. **Easier Testing**: Pure Rust integration tests

**Cons of Rust aisdk Migration**:
1. **Ecosystem Maturity**: aisdk.rs is newer than Vercel AI SDK
2. **Provider Coverage**: May lag behind Vercel AI SDK for new providers
3. **Community Size**: Smaller community, fewer examples
4. **Migration Effort**: Rewrite AI worker logic in Rust
5. **Tool Calls**: Need to verify feature parity for tool execution
6. **Stream Compatibility**: Must ensure SSE streaming works with UI
7. **Maintenance**: Need to follow aisdk.rs updates
8. **Unknown Issues**: Early adopter risks

### Feature Parity Check

| Feature | Vercel AI SDK (Node.js) | aisdk.rs (Rust) | Status |
|---------|------------------------|-----------------|--------|
| Text Generation | ✅ streamText() | ✅ stream_text() | ✅ Parity |
| Streaming | ✅ SSE via async iterator | ✅ StreamTextResponse | ✅ Parity |
| Tool Calls | ✅ tools + onStepFinish | ✅ with_tool() + #[tool] macro | ✅ Parity |
| Multi-step Execution | ✅ maxSteps | ✅ Agents API | ⚠️ Different API |
| OpenAI | ✅ @ai-sdk/openai | ✅ providers::OpenAI | ✅ Parity |
| Anthropic | ✅ @ai-sdk/anthropic | ✅ providers::Anthropic | ✅ Parity |
| Google | ✅ @ai-sdk/google | ✅ providers::Google | ✅ Parity |
| System Prompts | ✅ system message | ✅ .system() | ✅ Parity |
| Token Usage Stats | ✅ result.usage | ✅ result.usage() | ✅ Parity |
| Stop Reasons | ✅ result.finishReason | ✅ result.stop_reason() | ✅ Parity |
| UI Compatibility | ✅ Native | ✅ "Compatible with Vercel's ai-sdk ui" | ✅ Claimed |

### Code Comparison

**Current (Node.js + Vercel AI SDK)**:
```typescript
// packages/ai-worker/src/worker.ts (262 lines)
import { streamText, stepCountIs } from 'ai';
import { createLeanSpecTools } from './tools/leanspec-tools';
import { systemPrompt } from './prompts';

const result = streamText({
  model: aiProvider(model.id),
  tools: createLeanSpecTools({ baseUrl, projectId }),  // 14 tools
  system: systemPrompt,
  messages: transformedMessages,
  stopWhen: stepCountIs(config.settings.maxSteps),
  onStepFinish: (step) => {
    // Send tool calls/results via IPC
    for (const toolCall of step.toolCalls) {
      this.send({
        id: request.id,
        type: 'tool_call',
        data: { toolCallId, toolName, args }
      });
    }
    for (const toolResult of step.toolResults) {
      this.send({
        id: request.id,
        type: 'tool_result', 
        data: { toolCallId, result }
      });
    }
  },
});

for await (const chunk of result.textStream) {
  this.send({ type: 'chunk', data: { text: chunk } });
}
this.send({ type: 'done' });
```

**Proposed (Pure Rust + aisdk.rs)**:
```rust
// rust/leanspec-http/src/ai/chat.rs
use aisdk::core::{LanguageModelRequest, LanguageModelStreamChunkType};
use aisdk::providers::OpenAI;
use aisdk::macros::tool;
use futures::StreamExt;

#[tool]
/// View a spec by path or number
pub fn view_spec(spec_path: String) -> Tool {
    // Call leanspec core API directly
    let result = leanspec_core::view_spec(&spec_path)?;
    Ok(serde_json::to_string(&result)?)
}

pub async fn chat_stream(
    messages: Vec<Message>,
    config: ChatConfig,
) -> Result<impl Stream<Item = ChatChunk>> {
    let mut stream = LanguageModelRequest::builder()
        .model(OpenAI::gpt_4o())
        .system(&system_prompt)
        .messages(messages)
        .with_tool(view_spec())
        .with_tool(search_specs())
        .build()
        .stream_text()
        .await?;

    let stream = stream.map(|chunk| {
        match chunk {
            LanguageModelStreamChunkType::Text(text) => {
                ChatChunk::Text(text)
            }
            LanguageModelStreamChunkType::ToolCall(tool) => {
                ChatChunk::ToolCall {
                    name: tool.name,
                    args: tool.args,
                }
            }
            LanguageModelStreamChunkType::ToolResult(result) => {
                ChatChunk::ToolResult(result)
            }
        }
    });

    Ok(stream)
}
```

### Integration Points

**HTTP Handler (Axum)**:
```rust
// rust/leanspec-http/src/handlers/chat.rs
use axum::response::sse::{Event, Sse};

pub async fn chat_handler(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Result<Sse<impl Stream<Item = Result<Event>>>> {
    // No IPC needed - direct function call
    let stream = chat_stream(req.messages, state.config).await?;
    
    let sse = stream.map(|chunk| {
        Event::default().json_data(chunk)
    });
    
    Ok(Sse::new(sse))
}
```

**No Worker Manager Needed**:
```rust
// DELETE: rust/leanspec-http/src/ai/worker.rs (entire file)
// DELETE: rust/leanspec-http/src/ai/manager.rs (entire file)
// No more IPC protocol, no process spawning, no health checks
```

### Migration Complexity

**Files to Change**:
1. ✅ **Remove**: `packages/ai-worker/` (entire package - 378 lines in leanspec-tools.ts + 262 lines worker.ts)
2. ✅ **Remove**: `rust/leanspec-http/src/ai/worker.rs` (420 lines IPC worker manager)
3. ✅ **Remove**: `rust/leanspec-http/src/ai/manager.rs` (137 lines worker lifecycle)
4. ✅ **Remove**: `rust/leanspec-http/src/ai/protocol.rs` (243 lines IPC protocol)
5. ✅ **Add**: `rust/leanspec-http/src/ai/chat.rs` (pure Rust chat ~200 lines)
6. ✅ **Add**: `rust/leanspec-http/src/ai/tools.rs` (14 tool definitions ~400 lines)
7. ✅ **Add**: `rust/leanspec-http/src/ai/providers.rs` (provider factory ~150 lines)
8. ✅ **Update**: `rust/leanspec-http/Cargo.toml` (add aisdk.rs dependencies)
9. ✅ **Update**: `rust/leanspec-http/src/handlers/chat_handler.rs` (remove IPC fallback)
10. ⚠️ **Keep**: UI components (should work unchanged if SSE format matches)

**Tools to Migrate** (14 tools in `leanspec-tools.ts`):
1. `list_specs` - List specs with filters (status, priority, tags)
2. `search_specs` - Search specs by query
3. `get_spec` - Get spec details by name/number
4. `update_spec_status` - Update spec status
5. `link_specs` - Add dependency links
6. `unlink_specs` - Remove dependency links
7. `validate_specs` - Validate specs for issues
8. `read_spec` - Read raw spec content
9. `update_spec` - Update spec content (full replacement)
10. `update_spec_section` - Replace/append section in spec
11. `toggle_checklist_item` - Check/uncheck checklist items
12. `read_subspec` - Read sub-spec file content
13. `update_subspec` - Update sub-spec file content

**Estimated Effort**:
- Remove IPC code: ~1,200 lines deleted (worker.rs + manager.rs + protocol.rs)
- Add aisdk.rs integration: ~200 lines
- Tool migration: ~400 lines (14 tools × ~30 lines each)
- Provider factory: ~150 lines
- Testing: ~500 lines
- **Total**: ~4-5 days for 1 developer (or 2-3 days with aisdk.rs familiarity)

### Risk Assessment

**High Risk**:
- ❌ **UI Compatibility**: If SSE format differs, frontend breaks
- ❌ **Provider APIs**: If aisdk.rs doesn't support needed features
- ❌ **Production Bugs**: Early adopter issues in aisdk.rs

**Medium Risk**:
- ⚠️ **Performance**: Unknown if streaming is as fast as Node.js
- ⚠️ **Memory**: Rust async runtime vs Node.js event loop
- ⚠️ **Tool Execution**: Different execution model might have edge cases

**Low Risk**:
- ✅ **Compilation**: Type safety catches most issues
- ✅ **Dependencies**: Rust crates are stable
- ✅ **Rollback**: Can keep Node.js worker as fallback

### Testing Strategy

**Must Verify**:
1. ✅ OpenAI GPT-4o streaming works
2. ✅ Anthropic Claude streaming works
3. ✅ Google Gemini streaming works
4. ✅ Tool calls execute correctly
5. ✅ Multi-step tool chains work
6. ✅ UI receives proper SSE events
7. ✅ Token usage stats returned
8. ✅ Error handling works (invalid keys, rate limits)
9. ✅ Concurrent requests handled
10. ✅ Memory usage under load

**Test Plan**:
```rust
#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn test_openai_streaming() {
        let stream = chat_stream(vec![
            Message::user("Hello")
        ], default_config()).await.unwrap();
        
        // Verify stream produces text chunks
    }
    
    #[tokio::test]
    async fn test_tool_execution() {
        let stream = chat_stream(vec![
            Message::user("Show me spec 237")
        ], default_config()).await.unwrap();
        
        // Verify tool call happens and returns result
    }
    
    #[tokio::test]
    async fn test_multi_step() {
        // Test agent loop with multiple tool calls
    }
}
```

### Deployment Impact

**Before** (with Node.js worker):
```bash
# User needs Node.js v20+
node --version  # v22.11.0

# Install both packages
npm install -g @leanspec/ui @leanspec/ai-worker

# Run (spawns worker internally)
leanspec-http
```

**After** (pure Rust):
```bash
# No Node.js needed!

# Single binary install
npm install -g @leanspec/ui

# Or direct binary download
curl -fsSL https://leanspec.dev/install.sh | sh

# Run
leanspec-http
```

**Docker**:
```dockerfile
# Before: Multi-runtime
FROM node:20-slim
RUN npm install -g @leanspec/ui @leanspec/ai-worker
CMD ["leanspec-http"]

# After: Minimal Rust-only
FROM debian:bookworm-slim
COPY target/release/leanspec-http /usr/local/bin/
CMD ["leanspec-http"]
```

**Size Comparison**:
- Node.js base image: ~140MB
- Debian slim + Rust binary: ~80MB (with OpenSSL)
- Alpine + static Rust binary: ~15MB
- **Savings**: ~125MB for minimal setup

### Alternative: Hybrid Approach

**Option**: Keep Node.js worker as **optional fallback**:
```rust
pub async fn chat_stream(...) -> Result<Stream> {
    // Try Rust aisdk first
    if let Some(rust_provider) = try_rust_aisdk(&config) {
        return rust_provider.stream(messages).await;
    }
    
    // Fallback to Node.js worker if:
    // - User has custom provider not in aisdk.rs
    // - Environment variable LEANSPEC_USE_NODE_WORKER=1
    // - Rust aisdk fails (graceful degradation)
    fallback_to_node_worker(messages, config).await
}
```

**Benefits**:
- ✅ Best of both worlds
- ✅ Gradual migration path
- ✅ Handles edge cases

**Drawbacks**:
- ❌ More complexity
- ❌ Still need to maintain both
- ❌ Users still need Node.js for fallback

## Plan

- [ ] **Phase 1: Research & Prototyping** (1 day)
  - [ ] Create PoC: Simple Rust chat with aisdk.rs + OpenAI
  - [ ] Test streaming output to console
  - [ ] Verify SSE format matches current implementation
  - [ ] Test tool calls with simple example
  - [ ] Measure performance vs Node.js worker
  - [ ] Check aisdk.rs documentation completeness

- [ ] **Phase 2: Compatibility Testing** (1 day)
  - [ ] Test all providers (OpenAI, Anthropic, Google)
  - [ ] Verify UI components work with Rust SSE stream
  - [ ] Test tool execution with actual LeanSpec tools
  - [ ] Test multi-step agent loops
  - [ ] Test error handling (bad keys, rate limits)
  - [ ] Compare token usage stats format

- [ ] **Phase 3: Decision Point** (Decision Gate)
  - [ ] Document compatibility findings
  - [ ] List any blockers or missing features
  - [ ] Estimate full migration effort
  - [ ] Decide: Full migration, hybrid, or stay with Node.js
  - [ ] Update this spec with decision + reasoning

- [ ] **Phase 4A: Full Migration** (if approved, 3-4 days)
  - [ ] Implement chat handler with aisdk.rs
  - [ ] Migrate all 14 LeanSpec tools to Rust
  - [ ] Implement provider factory (OpenAI, Anthropic, Google)
  - [ ] Remove Node.js worker code (packages/ai-worker/)
  - [ ] Remove IPC infrastructure (worker.rs, manager.rs, protocol.rs)
  - [ ] Update error handling for native Rust errors
  - [ ] Add comprehensive tests (14 tool tests + streaming tests)
  - [ ] Update documentation

- [ ] **Phase 4B: Hybrid Approach** (if partial migration, 4 days)
  - [ ] Implement Rust aisdk as primary
  - [ ] Keep Node.js worker as fallback
  - [ ] Add detection/switching logic
  - [ ] Test both paths
  - [ ] Document when each is used

- [ ] **Phase 4C: Stay with Node.js** (if blocked, 0 days)
  - [ ] Document blockers in spec
  - [ ] Keep current IPC architecture
  - [ ] Revisit in 6 months when aisdk.rs matures

- [ ] **Phase 5: Performance Testing** (1 day)
  - [ ] Benchmark streaming latency
  - [ ] Benchmark memory usage under load
  - [ ] Compare startup time
  - [ ] Test concurrent requests
  - [ ] Load test with 100+ simultaneous chats

- [ ] **Phase 6: Production Validation** (1 day)
  - [ ] Deploy to staging environment
  - [ ] Test with real users
  - [ ] Monitor for errors/edge cases
  - [ ] Verify deployment size reduction
  - [ ] Check logs for any issues

- [ ] **Phase 7: Rollout** (1 day)
  - [ ] Update installation docs (remove Node.js requirement)
  - [ ] Update Docker images (use minimal base)
  - [ ] Publish new version
  - [ ] Announce pure Rust architecture
  - [ ] Deprecate @leanspec/ai-worker package

## Test

- [ ] **Functional Tests**
  - [ ] OpenAI GPT-4o chat works end-to-end
  - [ ] Anthropic Claude chat works end-to-end
  - [ ] Google Gemini chat works end-to-end
  - [ ] Tool calls execute correctly (all 14 tools):
    - [ ] list_specs (with filters: status, priority, tags)
    - [ ] search_specs (query with scoring)
    - [ ] get_spec (by name or number)
    - [ ] update_spec_status (status transitions)
    - [ ] link_specs / unlink_specs (dependency management)
    - [ ] validate_specs (spec validation)
    - [ ] read_spec / update_spec (content operations)
    - [ ] update_spec_section (section replacement)
    - [ ] toggle_checklist_item (checklist manipulation)
    - [ ] read_subspec / update_subspec (sub-spec operations)
  - [ ] Multi-step agent loops work (maxSteps from config)
  - [ ] System prompts are respected
  - [ ] Token usage stats are accurate

- [ ] **Streaming Tests**
  - [ ] SSE format matches UI expectations
  - [ ] Text chunks stream smoothly
  - [ ] Tool calls/results stream correctly
  - [ ] Stream ends with proper event
  - [ ] Errors propagate to UI

- [ ] **Performance Tests**
  - [ ] First token latency < 500ms
  - [ ] Streaming throughput > Node.js worker
  - [ ] Memory usage < Node.js worker
  - [ ] Supports 10+ concurrent chats
  - [ ] No memory leaks over 1000+ requests

- [ ] **Error Handling Tests**
  - [ ] Invalid API key returns clear error
  - [ ] Rate limit errors handled gracefully
  - [ ] Network errors recoverable
  - [ ] Malformed requests rejected
  - [ ] Tool execution errors surfaced

- [ ] **Integration Tests**
  - [ ] UI chat page works unchanged
  - [ ] Desktop app chat works unchanged
  - [ ] CI/CD builds succeed
  - [ ] Docker images smaller
  - [ ] Binary size acceptable

- [ ] **Deployment Tests**
  - [ ] Works without Node.js installed
  - [ ] Single binary deployment works
  - [ ] Docker deployment works
  - [ ] Binary runs on Linux/macOS/Windows

## Notes

### aisdk.rs Maturity

**GitHub Stats** (as of Jan 2026):
- Repository: https://github.com/lazy-hq/aisdk
- Crate: https://crates.io/crates/aisdk
- Stars: Need to check
- Last commit: Need to check
- Issues: Need to check
- Version: Need to check

**Pre-Implementation Check** (Phase 1):
```bash
# Check if aisdk.rs is available on crates.io
cargo search aisdk
cargo info aisdk  # Check latest version

# Verify required features exist:
# - Provider support: OpenAI, Anthropic, Google
# - Tool calling with #[tool] macro
# - Streaming responses (Stream trait)
# - SSE-compatible output
```

**Red Flags to Watch**:
- ❌ No commits in 3+ months (abandoned)
- ❌ Many open issues/PRs (maintenance issues)
- ❌ <100 stars (very early)
- ❌ Breaking changes in minor versions (unstable API)

**Green Flags**:
- ✅ Active development (commits within weeks)
- ✅ Responsive maintainers
- ✅ Clear documentation
- ✅ Used in production by others
- ✅ Semantic versioning

### Provider Support

**Currently Used** (must work):
- ✅ OpenAI (GPT-4o, GPT-4o-mini)
- ✅ Anthropic (Claude 3.5 Sonnet)
- ✅ Google (Gemini 1.5 Pro)

**Nice to Have**:
- DeepSeek
- Groq
- OpenRouter (aggregator)

### System Prompt Handling

Verify aisdk.rs handles system prompts correctly:
- Single system message at start? ✅
- Multiple system messages? Need to check
- System message in middle of conversation? Need to check

### Tool Call Format

**Critical**: Tool call format must match what UI expects:
```typescript
// Current format from Vercel AI SDK
{
  type: 'tool_call',
  toolCallId: '...',
  toolName: 'viewSpec',
  args: { specPath: '237' }
}

{
  type: 'tool_result',
  toolCallId: '...',
  result: '...'
}
```

Must verify aisdk.rs produces equivalent format.

### Related Specs

- **Spec 237**: Rust IPC AI Chat Bridge (current Node.js worker architecture) - **COMPLETE**
- **Spec 236**: Chat Config API Migration (config management in Rust) - **COMPLETE**
- **Spec 170**: CLI/MCP/Core Rust Migration Evaluation (similar migration analysis) - **COMPLETE**
- **Spec 184**: Unified UI Architecture (parent context)

### Dependencies

**Blocks**: None (evaluation only)  
**Blocked By**: None (can start immediately)  
**Related Code**:
- `packages/ai-worker/src/worker.ts` - Current Node.js implementation
- `packages/ai-worker/src/tools/leanspec-tools.ts` - 14 tool definitions
- `rust/leanspec-http/src/ai/worker.rs` - IPC worker manager (420 lines)
- `rust/leanspec-http/src/ai/manager.rs` - Worker lifecycle (137 lines)
- `rust/leanspec-http/src/ai/protocol.rs` - IPC protocol (243 lines)
- `rust/leanspec-http/src/handlers/chat_handler.rs` - HTTP handler with IPC

### Decision Criteria

**Go ahead with full migration if**:
- ✅ All 3 providers work correctly
- ✅ Tool calls work with no changes to UI
- ✅ SSE streaming format compatible
- ✅ Performance equal or better
- ✅ Active aisdk.rs development
- ✅ Clear migration path

**Consider hybrid approach if**:
- ⚠️ 1-2 minor compatibility issues fixable
- ⚠️ Some edge cases need Node.js fallback
- ⚠️ aisdk.rs lacks 1-2 non-critical features

**Stay with Node.js if**:
- ❌ Major compatibility blockers
- ❌ Performance significantly worse
- ❌ aisdk.rs appears abandoned
- ❌ Missing critical features
- ❌ Tool calls don't work
- ❌ UI breaks with SSE format

### Future: WASM Alternative

If Rust migration succeeds, future possibility:
- Compile aisdk.rs to WASM
- Run in browser (client-side inference)
- Or run in Desktop app (no server needed)
- Or serverless edge functions

But that's a separate evaluation (out of scope for this spec).

### Timeline Recommendation

Based on actual codebase analysis (14 tools, 1,200 lines IPC code to remove):

**Optimistic** (aisdk.rs works perfectly): 5-6 days
- Phase 1-2 (Research): 1 day
- Phase 4A (Full migration): 3 days
- Phase 5-6 (Testing/Validation): 1-2 days

**Realistic** (minor compatibility issues): 8-10 days
- Phase 1-2 (Research): 1-2 days
- Phase 4A (Full migration): 4-5 days (including tool edge cases)
- Phase 5-6 (Testing/Validation): 2-3 days

**Pessimistic** (major blockers found): Deferred to future
- Document blockers and revisit in 3-6 months

**Recommendation**: Start with Phase 1 (1 day PoC) to verify aisdk.rs works with our use case before committing to full migration.