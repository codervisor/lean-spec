# AI Native Module - Migration Plan

## Current Status: ENABLED

The AI feature now uses native Rust providers (`async-openai` + `anthropic`) and is enabled in the `full` feature set.

## Migration Plan

### Target Libraries

Replace `aisdk` with:
- **`async-openai`** (v0.32+) - For OpenAI and OpenAI-compatible APIs (OpenRouter)
- **`anthropic`** (v0.0.8+) - For Anthropic Claude API

### Files to Update

| File           | Changes Required                                    |
| -------------- | --------------------------------------------------- |
| `Cargo.toml`   | ✅ Updated - uses async-openai + anthropic           |
| `providers.rs` | Rewrite provider enum for new clients               |
| `chat.rs`      | Rewrite streaming logic for each provider           |
| `tools/mod.rs` | Convert to async-openai `ChatCompletionTool` format |
| `types.rs`     | Update message types if needed                      |
| `error.rs`     | Update error types                                  |

### Key Differences

#### async-openai Approach
```rust
use async_openai::{
    types::{
        ChatCompletionRequestMessage,
        ChatCompletionTool,
        CreateChatCompletionRequestArgs,
    },
    Client,
};

// Streaming
let stream = client.chat().create_stream(request).await?;
pin_mut!(stream);
while let Some(result) = stream.next().await {
    match result {
        Ok(response) => {
            // Handle response.choices[0].delta
        }
        Err(e) => { /* handle error */ }
    }
}
```

#### Tool Definition
```rust
use async_openai::types::{ChatCompletionTool, ChatCompletionToolType, FunctionObject};
use schemars::JsonSchema;

#[derive(JsonSchema, Deserialize)]
struct ListSpecsInput { /* fields */ }

let tool = ChatCompletionTool {
    r#type: ChatCompletionToolType::Function,
    function: FunctionObject {
        name: "list_specs".to_string(),
        description: Some("List specs with filters".to_string()),
        parameters: Some(schemars::schema_for!(ListSpecsInput)),
        strict: None,
    },
};
```

### Migration Steps (Completed)

1. ✅ Add JsonSchema derive to all input types in `tools/mod.rs`
2. ✅ Rewrite `providers.rs` to create `async_openai::Client` and `anthropic::Client`
3. ✅ Rewrite `chat.rs` with provider-specific streaming
4. ✅ Update tool definitions to use `ChatCompletionTool` format
5. ✅ Re-enable AI in `full` feature

### Feature Flag

AI is enabled via `leanspec-core` `full` feature and inherits into `leanspec-http` via the `full` feature set.

### Testing

```bash
# Test with AI feature
cargo build -p leanspec-core --features ai
cargo build -p leanspec-http --features ai

# Run full build
make rust-build
```

## References

- [async-openai docs](https://docs.rs/async-openai)
- [anthropic crate](https://crates.io/crates/anthropic)
- [OpenAI API - Function Calling](https://platform.openai.com/docs/guides/function-calling)
