# AI SDK Frontend-Rust Backend Alignment

## Overview

This document provides the detailed specifications for aligning the Rust backend implementation (using `async-openai` and `anthropic` crates) with the Vercel AI SDK frontend (useChat hook). This alignment ensures seamless compatibility between the Rust HTTP server and the existing frontend UI.

**Goal**: Replace the Node.js AI worker with native Rust implementation while maintaining 100% compatibility with the existing frontend using AI SDK's `useChat` hook.

**Note on Provider Choice**: Originally planned to use `aisdk.rs`, but discovered Rust 2024 edition compatibility issues. Switched to `async-openai` (for OpenAI/OpenRouter) and `anthropic` crate (for Anthropic).

---

## 1. Frontend API (useChat Hook)

### 1.1 Message Structure

The frontend expects messages with the following structure:

```typescript
type UIMessage = {
  id: string;                    // Unique identifier
  role: 'system' | 'user' | 'assistant';
  parts: UIMessagePart[];        // Array of message parts
  metadata?: unknown;            // Optional custom metadata
}

type UIMessagePart = 
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: object }
  | { type: 'tool-result'; toolCallId: string; toolName: string; output: unknown }
  | { type: 'file'; url: string; mediaType: string; filename?: string }
  | { type: 'reasoning'; text: string }
  | { type: 'source-url'; id: string; url: string; title?: string }
  | { type: 'source-document'; id: string; title?: string; mediaType?: string }
```

**Key Points**:
- Messages use a `parts` array for different content types
- Tool calls and results are represented as separate parts
- Text content is in `parts` with `type: 'text'`

### 1.2 Hook Status Values

The `useChat` hook tracks these status values:

- `submitted`: Request sent, awaiting stream start
- `streaming`: Actively receiving chunks
- `ready`: Stream complete, ready for next message
- `error`: Error occurred during request

### 1.3 Hook Methods

```typescript
const {
  messages,           // Array<UIMessage>
  status,            // Status enum
  error,             // Error | undefined
  sendMessage,       // (message, options?) => Promise<void>
  regenerate,        // (options?) => Promise<void>
  stop,              // () => void
  addToolOutput,     // (options) => void
  setMessages,       // Update messages locally
} = useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
  onFinish: (result) => { /* ... */ },
  onError: (error) => { /* ... */ },
  onData: (data) => { /* ... */ },
});
```

---

## 2. Server-Side Expectations

### 2.1 HTTP Endpoint

**Endpoint**: `POST /api/chat`

**Request Body**:
```json
{
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "parts": [
        { "type": "text", "text": "Hello!" }
      ]
    }
  ]
}
```

**Request Headers** (optional):
- `Content-Type: application/json`
- Custom headers for authentication, rate limiting, etc.

### 2.2 Response Format

**Required Headers**:
```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
x-vercel-ai-ui-message-stream: v1
```

The `x-vercel-ai-ui-message-stream: v1` header is **required** to indicate the UI message stream protocol version.

### 2.3 Server-Sent Events (SSE) Protocol

The response is a stream of Server-Sent Events (SSE) with the following format:

```
data: {JSON_OBJECT}\n\n
```

Each event is a JSON object with a `type` field indicating the event type.

---

## 3. Stream Protocol Parts

### 3.1 Message Start Part

Indicates the beginning of a new assistant message.

```json
data: {"type":"start","messageId":"msg_abc123"}
```

### 3.2 Text Streaming Parts

Text is streamed using a start/delta/end pattern:

**Text Start**:
```json
data: {"type":"text-start","id":"text_123"}
```

**Text Delta** (incremental chunks):
```json
data: {"type":"text-delta","id":"text_123","delta":"Hello"}
data: {"type":"text-delta","id":"text_123","delta":" world"}
data: {"type":"text-delta","id":"text_123","delta":"!"}
```

**Text End**:
```json
data: {"type":"text-end","id":"text_123"}
```

### 3.3 Tool Call Parts

**Tool Input Start**:
```json
data: {"type":"tool-input-start","toolCallId":"call_123","toolName":"list_specs"}
```

**Tool Input Delta** (streaming tool arguments):
```json
data: {"type":"tool-input-delta","toolCallId":"call_123","inputTextDelta":"{\"status\":"}
data: {"type":"tool-input-delta","toolCallId":"call_123","inputTextDelta":"\"planned\"}"}
```

**Tool Input Available** (complete tool call):
```json
data: {
  "type":"tool-input-available",
  "toolCallId":"call_123",
  "toolName":"list_specs",
  "input":{"status":"planned","priority":"high"}
}
```

**Tool Output Available** (tool result):
```json
data: {
  "type":"tool-output-available",
  "toolCallId":"call_123",
  "output":"Found 5 specs: ..."
}
```

### 3.4 Step Parts

For multi-step agent loops:

**Start Step**:
```json
data: {"type":"start-step"}
```

**Finish Step**:
```json
data: {"type":"finish-step"}
```

### 3.5 Message Finish Part

Indicates the message is complete:

```json
data: {"type":"finish"}
```

### 3.6 Stream Termination

The stream ends with a special marker:

```
data: [DONE]
```

### 3.7 Error Part

If an error occurs:

```json
data: {"type":"error","errorText":"Error message"}
```

### 3.8 Optional: Reasoning Parts

For models that support reasoning (e.g., DeepSeek R1):

```json
data: {"type":"reasoning-start","id":"reason_123"}
data: {"type":"reasoning-delta","id":"reason_123","delta":"Step 1: ..."}
data: {"type":"reasoning-end","id":"reason_123"}
```

**Note**: Reasoning must be enabled with `sendReasoning: true` in `toUIMessageStreamResponse()`.

### 3.9 Optional: Source Parts

For RAG/search models:

```json
data: {"type":"source-url","sourceId":"src_123","url":"https://example.com","title":"Example"}
data: {"type":"source-document","sourceId":"doc_123","title":"Document","mediaType":"file"}
```

**Note**: Sources must be enabled with `sendSources: true`.

---

## 4. Rust Implementation Mapping

### 4.1 Rust Types

**Note**: Using `async-openai` for OpenAI/OpenRouter and `anthropic` crate for Anthropic. Both implement the same SSE event protocol for frontend compatibility.

```rust
// rust/leanspec-core/src/ai_native/types.rs

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIMessage {
    pub id: String,
    pub role: MessageRole,
    pub parts: Vec<UIMessagePart>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum UIMessagePart {
    Text { text: String },
    ToolCall {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        input: serde_json::Value,
    },
    ToolResult {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        output: serde_json::Value,
    },
    File {
        url: String,
        #[serde(rename = "mediaType")]
        media_type: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        filename: Option<String>,
    },
    Reasoning {
        text: String,
    },
}
```

### 4.2 Stream Event Types

```rust
// rust/leanspec-core/src/ai_native/streaming.rs

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum StreamEvent {
    #[serde(rename = "start")]
    MessageStart {
        #[serde(rename = "messageId")]
        message_id: String,
    },
    
    #[serde(rename = "text-start")]
    TextStart {
        id: String,
    },
    
    #[serde(rename = "text-delta")]
    TextDelta {
        id: String,
        delta: String,
    },
    
    #[serde(rename = "text-end")]
    TextEnd {
        id: String,
    },
    
    #[serde(rename = "tool-input-start")]
    ToolInputStart {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
    },
    
    #[serde(rename = "tool-input-delta")]
    ToolInputDelta {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "inputTextDelta")]
        input_text_delta: String,
    },
    
    #[serde(rename = "tool-input-available")]
    ToolInputAvailable {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        #[serde(rename = "toolName")]
        tool_name: String,
        input: serde_json::Value,
    },
    
    #[serde(rename = "tool-output-available")]
    ToolOutputAvailable {
        #[serde(rename = "toolCallId")]
        tool_call_id: String,
        output: serde_json::Value,
    },
    
    #[serde(rename = "start-step")]
    StartStep,
    
    #[serde(rename = "finish-step")]
    FinishStep,
    
    #[serde(rename = "finish")]
    Finish,
    
    #[serde(rename = "error")]
    Error {
        #[serde(rename = "errorText")]
        error_text: String,
    },
}
```

### 4.3 SSE Formatting

```rust
// rust/leanspec-core/src/ai_native/streaming.rs

impl StreamEvent {
    pub fn to_sse_string(&self) -> String {
        let json = serde_json::to_string(self).expect("Failed to serialize event");
        format!("data: {}\n\n", json)
    }
}

// Special termination marker
pub fn sse_done() -> String {
    "data: [DONE]\n\n".to_string()
}
```

### 4.4 HTTP Handler

```rust
// rust/leanspec-http/src/handlers/chat_handler.rs

use axum::{
    body::Body,
    response::{Response, IntoResponse},
    http::{StatusCode, header},
    Json,
};
use futures::StreamExt;
use leanspec_core::ai_native::{UIMessage, StreamEvent, stream_chat, ChatConfig, ProviderClient};

pub async fn chat_handler(
    State(state): State<AppState>,
    Json(request): Json<ChatRequest>,
) -> Result<Response<Body>, ApiError> {
    // Extract messages from request
    let messages = request.messages;
    
    // Create provider client based on configuration
    let provider_client = create_provider_client(&request.provider_id, &state.config).await?;
    
    // Call Rust AI module (no IPC!)
    let stream = stream_chat(ChatConfig {
        messages,
        provider: provider_client,
        model_id: request.model_id,
        system_prompt: request.system_prompt,
        max_steps: request.max_steps,
        tools_enabled: request.tools_enabled,
    }).await?;
    
    // Convert to SSE stream
    let sse_stream = stream.map(|event| event.to_sse_string());
    
    // Create streaming response
    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/event-stream; charset=utf-8")
        .header(header::CACHE_CONTROL, "no-cache, no-transform")
        .header(header::CONNECTION, "keep-alive")
        .header("x-vercel-ai-ui-message-stream", "v1") // REQUIRED!
        .body(Body::from_stream(sse_stream))?;
    
    Ok(response)
}

#[derive(Deserialize)]
struct ChatRequest {
    messages: Vec<UIMessage>,
    provider_id: String,
    model_id: String,
    system_prompt: String,
    max_steps: u32,
    tools_enabled: bool,
}

async fn create_provider_client(
    provider_id: &str,
    config: &AppConfig,
) -> Result<ProviderClient, ApiError> {
    match provider_id {
        "openai" => Ok(ProviderClient::openai(&config.openai_api_key)?),
        "openrouter" => Ok(ProviderClient::openrouter(
            &config.openrouter_api_key,
            "https://openrouter.ai/api/v1",
        )?),
        "anthropic" => Ok(ProviderClient::anthropic(&config.anthropic_api_key)?),
        _ => Err(ApiError::BadRequest(format!("Unknown provider: {}", provider_id))),
    }
}
```

---

## 5. Tool Calling Flow

### 5.1 Provider-Specific Tool Format

Different providers have different tool schemas:

**OpenAI (async-openai)**:
```rust
use async_openai::types::{
    ChatCompletionTool, 
    ChatCompletionToolType,
    FunctionObject,
};

fn create_openai_tool(name: &str, description: &str, schema: serde_json::Value) -> ChatCompletionTool {
    ChatCompletionTool {
        r#type: ChatCompletionToolType::Function,
        function: FunctionObject {
            name: name.to_string(),
            description: Some(description.to_string()),
            parameters: Some(schema),
            strict: Some(false),
        },
    }
}
```

**Anthropic**:
```rust
use anthropic::types::Tool;

fn create_anthropic_tool(name: &str, description: &str, schema: serde_json::Value) -> Tool {
    Tool {
        name: name.to_string(),
        description: description.to_string(),
        input_schema: schema,
    }
}
```

### 5.2 Complete Tool Call Sequence

1. **User sends message**:
   ```json
   POST /api/chat
   {
     "messages": [
       {
         "id": "msg_1",
         "role": "user",
         "parts": [{"type": "text", "text": "list all high priority specs"}]
       }
     ]
   }
   ```

2. **Server starts streaming**:
   ```
   data: {"type":"start","messageId":"msg_2"}
   data: {"type":"text-start","id":"text_2_1"}
   data: {"type":"text-end","id":"text_2_1"}
   ```

3. **Tool call initiated**:
   ```
   data: {"type":"tool-input-start","toolCallId":"call_abc","toolName":"list_specs"}
   data: {"type":"tool-input-delta","toolCallId":"call_abc","inputTextDelta":"{\"priority\":"}
   data: {"type":"tool-input-delta","toolCallId":"call_abc","inputTextDelta":"\"high\"}"}
   data: {"type":"tool-input-available","toolCallId":"call_abc","toolName":"list_specs","input":{"priority":"high"}}
   ```

4. **Tool executed (server-side)**:
   ```
   data: {"type":"tool-output-available","toolCallId":"call_abc","output":"Found 3 specs: ..."}
   ```

5. **Follow-up text generation** (multi-step):
   ```
   data: {"type":"start-step"}
   data: {"type":"text-start","id":"text_2_2"}
   data: {"type":"text-delta","id":"text_2_2","delta":"I found 3 high priority specs:"}
   data: {"type":"text-delta","id":"text_2_2","delta":" ..."}
   data: {"type":"text-end","id":"text_2_2"}
   data: {"type":"finish-step"}
   ```

6. **Message complete**:
   ```
   data: {"type":"finish"}
   data: [DONE]
   ```

### 5.3 Rust Tool Execution

Tools must be executed **synchronously** within the streaming loop. The implementation differs by provider:

```rust
// rust/leanspec-core/src/ai_native/agent_loop.rs

pub async fn stream_chat(config: ChatConfig) -> Result<impl Stream<Item = StreamEvent>> {
    let mut messages = config.messages;
    let mut step = 0;
    
    loop {
        step += 1;
        if step > config.max_steps {
            break;
        }
        
        // Stream from provider based on type
        match &config.provider {
            ProviderClient::OpenAI(client) => {
                stream_openai(client, &messages, &config).await?
            }
            ProviderClient::Anthropic(client) => {
                stream_anthropic(client, &messages, &config).await?
            }
        }
        
        // If no tool calls, we're done
        if !has_tool_calls {
            break;
        }
        
        // Add tool results to messages and continue loop
        messages.push(tool_message(tool_calls));
        yield StreamEvent::FinishStep;
    }
    
    yield StreamEvent::Finish;
}

// OpenAI-compatible streaming (includes OpenRouter)
async fn stream_openai(
    client: &async_openai::Client<async_openai::config::OpenAIConfig>,
    messages: &[UIMessage],
    config: &ChatConfig,
) -> Result<StreamEvents> {
    use async_openai::types::{
        CreateChatCompletionRequestArgs,
        ChatCompletionRequestMessage,
    };
    
    let request = CreateChatCompletionRequestArgs::default()
        .model(&config.model_id)
        .messages(convert_to_openai_messages(messages))
        .tools(get_tool_definitions_openai())
        .stream(true)
        .build()?;
    
    let mut stream = client.chat().create_stream(request).await?;
    
    while let Some(result) = stream.next().await {
        match result {
            Ok(response) => {
                for choice in response.choices {
                    if let Some(tool_calls) = choice.delta.tool_calls {
                        // Handle tool call streaming
                        for tool_call in tool_calls {
                            yield StreamEvent::ToolInputStart {
                                tool_call_id: tool_call.id.clone(),
                                tool_name: tool_call.function.name.clone(),
                            };
                            // ... stream tool input deltas ...
                            
                            // Execute tool
                            let result = execute_tool(&tool_call.function.name, 
                                                      &tool_call.function.arguments).await?;
                            yield StreamEvent::ToolOutputAvailable {
                                tool_call_id: tool_call.id.clone(),
                                output: result,
                            };
                        }
                    }
                    if let Some(content) = choice.delta.content {
                        yield StreamEvent::TextDelta {
                            id: format!("text_{}", choice.index),
                            delta: content,
                        };
                    }
                }
            }
            Err(e) => {
                yield StreamEvent::Error {
                    error_text: format!("OpenAI error: {}", e),
                };
            }
        }
    }
}

// Anthropic streaming
async fn stream_anthropic(
    client: &anthropic::Client,
    messages: &[UIMessage],
    config: &ChatConfig,
) -> Result<StreamEvents> {
    use anthropic::types::MessageRequest;
    
    let request = MessageRequest::builder()
        .model(&config.model_id)
        .messages(convert_to_anthropic_messages(messages))
        .tools(get_tool_definitions_anthropic())
        .stream(true)
        .build()?;
    
    let mut stream = client.messages().create_stream(request).await?;
    
    while let Some(event) = stream.next().await {
        match event {
            Ok(anthropic::types::StreamEvent::ContentBlockStart { content_block }) => {
                // Handle tool use start
                if let anthropic::types::ContentBlock::ToolUse { id, name, .. } = content_block {
                    yield StreamEvent::ToolInputStart {
                        tool_call_id: id,
                        tool_name: name,
                    };
                }
            }
            Ok(anthropic::types::StreamEvent::ContentBlockDelta { delta }) => {
                // Handle text and tool input deltas
                match delta {
                    anthropic::types::ContentDelta::TextDelta { text } => {
                        yield StreamEvent::TextDelta { id: "text_1".to_string(), delta: text };
                    }
                    // ... handle tool input deltas ...
                }
            }
            // ... handle other events ...
            Err(e) => {
                yield StreamEvent::Error {
                    error_text: format!("Anthropic error: {}", e),
                };
            }
        }
    }
}
```

---

## 6. Error Handling

### 6.1 Error Streaming

When an error occurs during streaming:

```rust
pub async fn stream_chat(config: ChatConfig) -> Result<impl Stream<Item = StreamEvent>> {
    // ...
    match provider.stream_text(&messages).await {
        Ok(response) => {
            // Stream normally
        }
        Err(e) => {
            yield StreamEvent::Error {
                error_text: format!("AI provider error: {}", e),
            };
            return;
        }
    }
}
```

The error event will be displayed in the UI.

### 6.2 HTTP Error Responses

For errors before streaming starts:

```rust
pub async fn chat_handler(...) -> Result<Response, ApiError> {
    // Validate request
    if request.messages.is_empty() {
        return Err(ApiError::BadRequest("No messages provided".into()));
    }
    
    // ... rest of handler
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".into()),
            ApiError::InternalError(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg),
        };
        
        (status, Json(json!({ "error": message }))).into_response()
    }
}
```

---

## 7. Testing & Verification

### 7.1 Compatibility Checklist

- [ ] HTTP endpoint accepts JSON with `messages` array
- [ ] Response has correct SSE headers
- [ ] **`x-vercel-ai-ui-message-stream: v1` header is present**
- [ ] Stream starts with `{"type":"start","messageId":"..."}`
- [ ] Text chunks use `text-start`, `text-delta`, `text-end` pattern
- [ ] Tool calls use correct sequence: `tool-input-start` → `tool-input-available` → `tool-output-available`
- [ ] Multi-step flows use `start-step` / `finish-step`
- [ ] Stream ends with `{"type":"finish"}` followed by `[DONE]`
- [ ] Errors emit `{"type":"error","errorText":"..."}` events
- [ ] All JSON uses correct field names (camelCase): `toolCallId`, `toolName`, `messageId`, etc.

### 7.2 Manual Testing

Use curl to test the endpoint:

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "id": "msg_1",
        "role": "user",
        "parts": [
          {"type": "text", "text": "Hello!"}
        ]
      }
    ]
  }'
```

Expected output:
```
data: {"type":"start","messageId":"msg_2"}

data: {"type":"text-start","id":"text_1"}

data: {"type":"text-delta","id":"text_1","delta":"Hello"}

data: {"type":"text-delta","id":"text_1","delta":"!"}

data: {"type":"text-end","id":"text_1"}

data: {"type":"finish"}

data: [DONE]
```

### 7.3 Frontend Integration Test

Test with the actual UI:

```typescript
// Test in browser console
const { messages, status, sendMessage } = useChat();

await sendMessage({ text: "list all specs" });

// Verify:
// - status transitions: submitted → streaming → ready
// - messages array updates correctly
// - tool calls appear in message parts
// - UI renders without errors
```

---

## 8. Key Differences from Node.js Implementation

| Aspect             | Node.js (current)             | Rust (new)                  |
| ------------------ | ----------------------------- | --------------------------- |
| **Process**        | Separate Node.js worker       | Integrated into HTTP server |
| **IPC**            | JSON Lines over stdin/stdout  | Direct function calls       |
| **Streaming**      | Node.js streams               | Rust futures::Stream        |
| **Tool Execution** | Async event loop              | Tokio async runtime         |
| **Providers**      | Vercel AI SDK unified API     | async-openai + anthropic    |
| **Error Handling** | Try-catch + IPC serialization | Result types + ? operator   |
| **Type Safety**    | TypeScript (runtime)          | Rust (compile-time)         |
| **Deployment**     | Node.js + Rust binary         | Single Rust binary          |

---

## 9. Critical Implementation Notes

### 9.1 Field Naming

**CRITICAL**: The AI SDK frontend expects **camelCase** field names in JSON:

❌ **Wrong** (snake_case):
```json
{"tool_call_id": "call_123", "tool_name": "list_specs"}
```

✅ **Correct** (camelCase):
```json
{"toolCallId": "call_123", "toolName": "list_specs"}
```

Use `#[serde(rename = "toolCallId")]` in Rust structs.

### 9.2 Required Header

The `x-vercel-ai-ui-message-stream: v1` header **must** be present, otherwise the frontend will not parse the stream correctly.

### 9.3 SSE Format

Each event must be formatted as:
```
data: {JSON}\n\n
```

Note the **double newline** (`\n\n`) after each event.

### 9.4 Stream Termination

Always end the stream with:
```
data: [DONE]\n\n
```

This signals the frontend that no more events will arrive.

### 9.5 Tool Execution Timing

Tools **must** be executed during the streaming loop, **not** after the stream completes. The frontend expects to see:
1. `tool-input-available` (tool call from LLM)
2. `tool-output-available` (tool result from server)
3. Continued text generation using the tool result

### 9.6 Message IDs

Generate unique IDs for:
- Messages: `msg_{uuid}`
- Text blocks: `text_{message_id}_{index}`
- Tool calls: `call_{uuid}`
- Reasoning blocks: `reason_{uuid}`

Use `uuid::Uuid::new_v4()` for generation.

---

## 10. Migration Checklist

### Phase 1: Core Streaming
- [ ] Implement SSE response builder with correct headers
- [ ] Implement basic text streaming (start/delta/end)
- [ ] Test with curl and verify format

### Phase 2: Tool Support
- [ ] Implement tool call streaming
- [ ] Implement tool execution
- [ ] Implement tool result streaming
- [ ] Test multi-step tool loops

### Phase 3: Error Handling
- [ ] Implement error events
- [ ] Test error scenarios
- [ ] Verify UI error display

### Phase 4: Integration
- [ ] Replace Node.js worker calls
- [ ] Test with real UI
- [ ] Verify all 14 tools work correctly

### Phase 5: Verification
- [ ] Run full test suite
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Production deployment

---

## 11. References

- [AI SDK useChat documentation](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [AI SDK Stream Protocol](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)
- [AI SDK useChat API reference](https://sdk.vercel.ai/docs/reference/ai-sdk-ui/use-chat)
- [AI SDK streamText reference](https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text)
- [Server-Sent Events spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)

---

## Conclusion

This document provides a complete specification for aligning the Rust backend with the AI SDK frontend. The key to success is:

1. **Exact JSON format** - Use camelCase, match the exact structure
2. **Required headers** - Don't forget `x-vercel-ai-ui-message-stream: v1`
3. **SSE format** - Double newlines, proper event structure
4. **Tool execution** - Synchronous within the stream, not after
5. **Stream termination** - Always end with `[DONE]`

By following this specification, the Rust implementation will be a drop-in replacement for the Node.js worker.
