//! Chat streaming implementation using async-openai and anthropic

use async_openai::types::chat::{
    ChatCompletionMessageToolCall, ChatCompletionMessageToolCallChunk,
    ChatCompletionMessageToolCalls, ChatCompletionRequestAssistantMessage,
    ChatCompletionRequestAssistantMessageContent, ChatCompletionRequestMessage,
    ChatCompletionRequestSystemMessage, ChatCompletionRequestSystemMessageContent,
    ChatCompletionRequestToolMessage, ChatCompletionRequestToolMessageContent,
    ChatCompletionRequestUserMessage, ChatCompletionRequestUserMessageContent,
    CreateChatCompletionRequestArgs, FinishReason, FunctionCall, FunctionCallStream,
};
use futures_util::StreamExt;
use tokio::sync::{mpsc, oneshot};

use crate::ai_native::error::AiError;
use crate::ai_native::providers::{select_provider, ProviderClient};
use crate::ai_native::runner_config::resolve_runner_config;
use crate::ai_native::streaming::StreamEvent;
use crate::ai_native::tools::{build_tools, ToolContext, ToolRegistry};
use crate::ai_native::types::{MessageRole, UIMessage, UIMessagePart};
use crate::storage::chat_config::ChatConfig;

const SYSTEM_PROMPT: &str = "You are LeanSpec Assistant. Manage specs through tools.\n\nCapabilities: list, search, create, update, link, validate specs. Edit content, checklists, sub-specs.\n\nRules:\n1. Use tools - never invent spec IDs\n2. Follow LeanSpec: <2000 tokens, required sections, kebab-case names\n3. Multi-step: explain before executing\n4. Be concise - actionable answers only\n5. Format lists as markdown bullets\n\nContext economy: stay focused.";

#[derive(Debug, Clone)]
pub struct ChatRequestContext {
    pub messages: Vec<UIMessage>,
    pub project_id: Option<String>,
    pub project_path: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub session_id: Option<String>,
    pub base_url: String,
    pub config: ChatConfig,
}

pub struct StreamChatResult {
    pub stream: mpsc::UnboundedReceiver<StreamEvent>,
    pub completion: oneshot::Receiver<Option<String>>,
    pub selected_provider_id: String,
    pub selected_model_id: String,
}

#[derive(Debug, Default)]
struct ToolCallAccumulator {
    id: Option<String>,
    name: Option<String>,
    arguments: String,
}

#[derive(Debug, Clone)]
struct ToolCall {
    id: String,
    name: String,
    arguments: String,
}

pub async fn stream_chat(context: ChatRequestContext) -> Result<StreamChatResult, AiError> {
    let ChatRequestContext {
        messages,
        project_id,
        project_path,
        provider_id,
        model_id,
        session_id: _,
        base_url,
        config,
    } = context;

    let provider_id = provider_id.unwrap_or_else(|| config.settings.default_provider_id.clone());
    let model_id = model_id.unwrap_or_else(|| config.settings.default_model_id.clone());

    let selection = select_provider(&config, &provider_id, &model_id)?;
    let runner_config = resolve_runner_config(project_path.as_deref(), None)?;
    let tools = build_tools(ToolContext {
        base_url: base_url.clone(),
        project_id: project_id.clone(),
        project_path: project_path.clone(),
        runner_config,
    })?;

    let (sender, receiver) = mpsc::unbounded_channel();
    let (done_tx, done_rx) = oneshot::channel();
    let message_id = format!("msg_{}", uuid::Uuid::new_v4());
    let text_id = format!("text_{}_0", message_id);

    let selected_provider_id = selection.provider_id.clone();
    let selected_model_id = selection.model_id.clone();
    let selected_model_id_for_task = selected_model_id.clone();
    let max_steps = config.settings.max_steps;
    let max_tokens = selection.model_max_tokens;

    tokio::spawn(async move {
        let _ = sender.send(StreamEvent::MessageStart { message_id });

        let result = match selection.provider {
            ProviderClient::OpenAI(client) => {
                let mut messages = build_openai_messages(messages, SYSTEM_PROMPT);
                run_openai_conversation(OpenAiConversationParams {
                    client,
                    model_id: &selected_model_id_for_task,
                    messages: &mut messages,
                    tools,
                    max_steps,
                    max_tokens,
                    sender: &sender,
                    text_id: &text_id,
                })
                .await
            }
            ProviderClient::OpenRouter(client) => {
                let mut messages = build_openai_messages(messages, SYSTEM_PROMPT);
                run_openai_conversation(OpenAiConversationParams {
                    client,
                    model_id: &selected_model_id_for_task,
                    messages: &mut messages,
                    tools,
                    max_steps,
                    max_tokens,
                    sender: &sender,
                    text_id: &text_id,
                })
                .await
            }
            ProviderClient::Anthropic(client) => {
                let (anthropic_messages, system_extra) = build_anthropic_messages(messages);
                let system_prompt = if system_extra.trim().is_empty() {
                    SYSTEM_PROMPT.to_string()
                } else {
                    format!("{}\n\n{}", SYSTEM_PROMPT, system_extra)
                };
                run_anthropic_conversation(
                    client,
                    &selected_model_id_for_task,
                    anthropic_messages,
                    system_prompt,
                    max_tokens,
                    &sender,
                    &text_id,
                )
                .await
            }
        };

        match result {
            Ok(text) => {
                let _ = sender.send(StreamEvent::Finish);
                let _ = done_tx.send(Some(text));
            }
            Err(err) => {
                let _ = sender.send(StreamEvent::Error {
                    error_text: err.to_string(),
                });
                let _ = sender.send(StreamEvent::Finish);
                let _ = done_tx.send(None);
            }
        }
    });

    Ok(StreamChatResult {
        stream: receiver,
        completion: done_rx,
        selected_provider_id,
        selected_model_id,
    })
}

fn build_openai_messages(
    messages: Vec<UIMessage>,
    system_prompt: &str,
) -> Vec<ChatCompletionRequestMessage> {
    let mut output = Vec::new();
    output.push(ChatCompletionRequestMessage::System(
        ChatCompletionRequestSystemMessage {
            content: ChatCompletionRequestSystemMessageContent::Text(system_prompt.to_string()),
            name: None,
        },
    ));

    output.extend(ui_messages_to_openai(messages));
    output
}

fn ui_messages_to_openai(messages: Vec<UIMessage>) -> Vec<ChatCompletionRequestMessage> {
    messages
        .into_iter()
        .filter_map(|message| {
            let text = ui_message_text(&message);
            if text.trim().is_empty() {
                return None;
            }

            match message.role {
                MessageRole::System => Some(ChatCompletionRequestMessage::System(
                    ChatCompletionRequestSystemMessage {
                        content: ChatCompletionRequestSystemMessageContent::Text(text),
                        name: None,
                    },
                )),
                MessageRole::User => Some(ChatCompletionRequestMessage::User(
                    ChatCompletionRequestUserMessage {
                        content: ChatCompletionRequestUserMessageContent::Text(text),
                        name: None,
                    },
                )),
                MessageRole::Assistant => Some(ChatCompletionRequestMessage::Assistant(
                    ChatCompletionRequestAssistantMessage {
                        content: Some(ChatCompletionRequestAssistantMessageContent::Text(text)),
                        ..Default::default()
                    },
                )),
            }
        })
        .collect()
}

fn build_anthropic_messages(messages: Vec<UIMessage>) -> (Vec<anthropic::types::Message>, String) {
    let mut output = Vec::new();
    let mut system_parts = Vec::new();

    for message in messages {
        let text = ui_message_text(&message);
        if text.trim().is_empty() {
            continue;
        }

        match message.role {
            MessageRole::System => system_parts.push(text),
            MessageRole::User => output.push(anthropic::types::Message {
                role: anthropic::types::Role::User,
                content: vec![anthropic::types::ContentBlock::Text { text }],
            }),
            MessageRole::Assistant => output.push(anthropic::types::Message {
                role: anthropic::types::Role::Assistant,
                content: vec![anthropic::types::ContentBlock::Text { text }],
            }),
        }
    }

    (output, system_parts.join("\n\n"))
}

fn ui_message_text(message: &UIMessage) -> String {
    message
        .parts
        .iter()
        .filter_map(|part| match part {
            UIMessagePart::Text { text } => Some(text.clone()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("\n")
}

struct OpenAiConversationParams<'a> {
    client: async_openai::Client<async_openai::config::OpenAIConfig>,
    model_id: &'a str,
    messages: &'a mut Vec<ChatCompletionRequestMessage>,
    tools: ToolRegistry,
    max_steps: u32,
    max_tokens: Option<u32>,
    sender: &'a mpsc::UnboundedSender<StreamEvent>,
    text_id: &'a str,
}

async fn run_openai_conversation(
    OpenAiConversationParams {
        client,
        model_id,
        messages,
        tools,
        max_steps,
        max_tokens,
        sender,
        text_id,
    }: OpenAiConversationParams<'_>,
) -> Result<String, AiError> {
    let mut assistant_text = String::new();

    for step in 0..max_steps {
        let _ = sender.send(StreamEvent::StartStep);

        let round = stream_openai_round(
            &client,
            model_id,
            messages,
            tools.tools(),
            max_tokens,
            sender,
            text_id,
        )
        .await?;

        if !round.text.is_empty() {
            assistant_text.push_str(&round.text);
        }

        if round.tool_calls.is_empty() {
            let _ = sender.send(StreamEvent::FinishStep);
            return Ok(assistant_text);
        }

        let assistant_tool_calls = round
            .tool_calls
            .iter()
            .map(|call| {
                ChatCompletionMessageToolCalls::Function(ChatCompletionMessageToolCall {
                    id: call.id.clone(),
                    function: FunctionCall {
                        name: call.name.clone(),
                        arguments: call.arguments.clone(),
                    },
                })
            })
            .collect::<Vec<_>>();

        messages.push(ChatCompletionRequestMessage::Assistant(
            ChatCompletionRequestAssistantMessage {
                content: None,
                tool_calls: Some(assistant_tool_calls),
                ..Default::default()
            },
        ));

        for call in round.tool_calls {
            let input =
                serde_json::from_str::<serde_json::Value>(&call.arguments).map_err(|e| {
                    AiError::Tool(format!("Invalid tool input JSON for {}: {}", call.name, e))
                })?;

            let _ = sender.send(StreamEvent::ToolInputStart {
                tool_call_id: call.id.clone(),
                tool_name: call.name.clone(),
            });
            let _ = sender.send(StreamEvent::ToolInputAvailable {
                tool_call_id: call.id.clone(),
                tool_name: call.name.clone(),
                input: input.clone(),
            });

            let registry = tools.clone();
            let tool_name = call.name.clone();
            let exec_input = input.clone();
            let result =
                tokio::task::spawn_blocking(move || registry.execute(&tool_name, exec_input))
                    .await
                    .map_err(|e| AiError::Tool(e.to_string()))??;

            let output_value = serde_json::from_str::<serde_json::Value>(&result)
                .unwrap_or_else(|_| serde_json::Value::String(result.clone()));
            let _ = sender.send(StreamEvent::ToolOutputAvailable {
                tool_call_id: call.id.clone(),
                output: output_value.clone(),
            });

            messages.push(ChatCompletionRequestMessage::Tool(
                ChatCompletionRequestToolMessage {
                    content: ChatCompletionRequestToolMessageContent::Text(result),
                    tool_call_id: call.id.clone(),
                },
            ));
        }

        let _ = sender.send(StreamEvent::FinishStep);

        if step + 1 >= max_steps {
            return Err(AiError::InvalidRequest(
                "Reached max_steps while tool calls remain".to_string(),
            ));
        }
    }

    Ok(assistant_text)
}

async fn stream_openai_round(
    client: &async_openai::Client<async_openai::config::OpenAIConfig>,
    model_id: &str,
    messages: &[ChatCompletionRequestMessage],
    tools: &[async_openai::types::chat::ChatCompletionTools],
    max_tokens: Option<u32>,
    sender: &mpsc::UnboundedSender<StreamEvent>,
    text_id: &str,
) -> Result<OpenAiRoundResult, AiError> {
    let mut builder = CreateChatCompletionRequestArgs::default();
    builder.model(model_id);
    builder.messages(messages.to_vec());
    builder.stream(true);
    if !tools.is_empty() {
        builder.tools(tools.to_vec());
        builder.parallel_tool_calls(true);
    }
    if let Some(max_tokens) = max_tokens {
        builder.max_completion_tokens(max_tokens);
    }
    let request = builder
        .build()
        .map_err(|e| AiError::Provider(e.to_string()))?;

    let mut stream = client
        .chat()
        .create_stream(request)
        .await
        .map_err(|e| AiError::Provider(e.to_string()))?;

    let mut text_started = false;
    let mut text = String::new();
    let mut tool_calls: Vec<ToolCallAccumulator> = Vec::new();
    let mut finish_reason: Option<FinishReason> = None;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AiError::Stream(e.to_string()))?;
        for choice in chunk.choices {
            if finish_reason.is_none() {
                finish_reason = choice.finish_reason;
            }

            let delta = choice.delta;
            if let Some(content) = delta.content {
                if !text_started {
                    text_started = true;
                    let _ = sender.send(StreamEvent::TextStart {
                        id: text_id.to_string(),
                    });
                }
                text.push_str(&content);
                let _ = sender.send(StreamEvent::TextDelta {
                    id: text_id.to_string(),
                    delta: content,
                });
            }

            if let Some(tool_chunks) = delta.tool_calls {
                collect_tool_call_chunks(&mut tool_calls, tool_chunks);
            }
        }
    }

    if text_started {
        let _ = sender.send(StreamEvent::TextEnd {
            id: text_id.to_string(),
        });
    }

    let completed_tool_calls = if matches!(finish_reason, Some(FinishReason::ToolCalls)) {
        tool_calls
            .into_iter()
            .filter_map(|call| {
                let name = call.name?;
                let id = call
                    .id
                    .unwrap_or_else(|| format!("tool_{}", uuid::Uuid::new_v4()));
                Some(ToolCall {
                    id,
                    name,
                    arguments: call.arguments,
                })
            })
            .collect()
    } else {
        Vec::new()
    };

    Ok(OpenAiRoundResult {
        text,
        tool_calls: completed_tool_calls,
    })
}

fn collect_tool_call_chunks(
    tool_calls: &mut Vec<ToolCallAccumulator>,
    chunks: Vec<ChatCompletionMessageToolCallChunk>,
) {
    for chunk in chunks {
        let index = chunk.index as usize;
        while tool_calls.len() <= index {
            tool_calls.push(ToolCallAccumulator::default());
        }

        let accumulator = &mut tool_calls[index];
        if let Some(id) = chunk.id {
            accumulator.id = Some(id);
        }

        if let Some(FunctionCallStream { name, arguments }) = chunk.function {
            if let Some(name) = name {
                accumulator.name = Some(name);
            }
            if let Some(arguments) = arguments {
                accumulator.arguments.push_str(&arguments);
            }
        }
    }
}

struct OpenAiRoundResult {
    text: String,
    tool_calls: Vec<ToolCall>,
}

async fn run_anthropic_conversation(
    client: anthropic::client::Client,
    model_id: &str,
    messages: Vec<anthropic::types::Message>,
    system: String,
    max_tokens: Option<u32>,
    sender: &mpsc::UnboundedSender<StreamEvent>,
    text_id: &str,
) -> Result<String, AiError> {
    let max_tokens = max_tokens.unwrap_or(4096) as usize;
    let request = anthropic::types::MessagesRequestBuilder::default()
        .model(model_id.to_string())
        .messages(messages)
        .system(system)
        .max_tokens(max_tokens)
        .stream(true)
        .build()
        .map_err(|e| AiError::Provider(e.to_string()))?;

    let mut stream = client
        .messages_stream(request)
        .await
        .map_err(|e| AiError::Provider(e.to_string()))?;

    let mut text_started = false;
    let mut text = String::new();
    let _ = sender.send(StreamEvent::StartStep);

    while let Some(event) = stream.next().await {
        let event = event.map_err(|e| AiError::Stream(e.to_string()))?;
        if let anthropic::types::MessagesStreamEvent::ContentBlockDelta { delta, .. } = event {
            let anthropic::types::ContentBlockDelta::TextDelta { text: delta_text } = delta;
            if !text_started {
                text_started = true;
                let _ = sender.send(StreamEvent::TextStart {
                    id: text_id.to_string(),
                });
            }
            text.push_str(&delta_text);
            let _ = sender.send(StreamEvent::TextDelta {
                id: text_id.to_string(),
                delta: delta_text,
            });
        }
    }

    if text_started {
        let _ = sender.send(StreamEvent::TextEnd {
            id: text_id.to_string(),
        });
    }

    let _ = sender.send(StreamEvent::FinishStep);
    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_openai_messages_with_system_prompt() {
        let messages = vec![];
        let result = build_openai_messages(messages, "Test system prompt");

        assert_eq!(result.len(), 1);
        match &result[0] {
            ChatCompletionRequestMessage::System(msg) => match &msg.content {
                ChatCompletionRequestSystemMessageContent::Text(text) => {
                    assert_eq!(text, "Test system prompt");
                }
                _ => panic!("Expected text content"),
            },
            _ => panic!("Expected system message"),
        }
    }

    #[test]
    fn test_ui_messages_to_openai_user_message() {
        let messages = vec![UIMessage {
            id: "msg_1".to_string(),
            role: MessageRole::User,
            parts: vec![UIMessagePart::Text {
                text: "Hello".to_string(),
            }],
            metadata: None,
        }];

        let result = ui_messages_to_openai(messages);
        assert_eq!(result.len(), 1);

        match &result[0] {
            ChatCompletionRequestMessage::User(msg) => match &msg.content {
                ChatCompletionRequestUserMessageContent::Text(text) => {
                    assert_eq!(text, "Hello");
                }
                _ => panic!("Expected text content"),
            },
            _ => panic!("Expected user message"),
        }
    }

    #[test]
    fn test_ui_messages_to_openai_assistant_message() {
        let messages = vec![UIMessage {
            id: "msg_2".to_string(),
            role: MessageRole::Assistant,
            parts: vec![UIMessagePart::Text {
                text: "Hi there".to_string(),
            }],
            metadata: None,
        }];

        let result = ui_messages_to_openai(messages);
        assert_eq!(result.len(), 1);

        match &result[0] {
            ChatCompletionRequestMessage::Assistant(msg) => match &msg.content {
                Some(ChatCompletionRequestAssistantMessageContent::Text(text)) => {
                    assert_eq!(text, "Hi there");
                }
                _ => panic!("Expected text content"),
            },
            _ => panic!("Expected assistant message"),
        }
    }

    #[test]
    fn test_ui_messages_to_openai_empty_text_filtered() {
        let messages = vec![UIMessage {
            id: "msg_3".to_string(),
            role: MessageRole::User,
            parts: vec![UIMessagePart::Text {
                text: "   ".to_string(),
            }],
            metadata: None,
        }];

        let result = ui_messages_to_openai(messages);
        assert!(result.is_empty());
    }

    #[test]
    fn test_ui_message_text_extraction() {
        let message = UIMessage {
            id: "msg_4".to_string(),
            role: MessageRole::User,
            parts: vec![
                UIMessagePart::Text {
                    text: "Line 1".to_string(),
                },
                UIMessagePart::Text {
                    text: "Line 2".to_string(),
                },
            ],
            metadata: None,
        };

        let text = ui_message_text(&message);
        assert_eq!(text, "Line 1\nLine 2");
    }

    #[test]
    fn test_build_anthropic_messages_with_system() {
        let messages = vec![UIMessage {
            id: "msg_5".to_string(),
            role: MessageRole::System,
            parts: vec![UIMessagePart::Text {
                text: "System prompt".to_string(),
            }],
            metadata: None,
        }];

        let (anthropic_msgs, system_extra) = build_anthropic_messages(messages);
        assert!(anthropic_msgs.is_empty());
        assert_eq!(system_extra, "System prompt");
    }

    #[test]
    fn test_build_anthropic_messages_user_assistant() {
        let messages = vec![
            UIMessage {
                id: "msg_6".to_string(),
                role: MessageRole::User,
                parts: vec![UIMessagePart::Text {
                    text: "Hello".to_string(),
                }],
                metadata: None,
            },
            UIMessage {
                id: "msg_7".to_string(),
                role: MessageRole::Assistant,
                parts: vec![UIMessagePart::Text {
                    text: "Hi".to_string(),
                }],
                metadata: None,
            },
        ];

        let (anthropic_msgs, system_extra) = build_anthropic_messages(messages);
        assert_eq!(anthropic_msgs.len(), 2);
        assert!(system_extra.is_empty());

        match &anthropic_msgs[0].role {
            anthropic::types::Role::User => {}
            _ => panic!("Expected user role"),
        }

        match &anthropic_msgs[1].role {
            anthropic::types::Role::Assistant => {}
            _ => panic!("Expected assistant role"),
        }
    }

    #[test]
    fn test_chat_request_context_creation() {
        let config = crate::storage::chat_config::ChatConfig {
            version: "1.0".to_string(),
            settings: crate::storage::chat_config::ChatSettings {
                default_provider_id: "openai".to_string(),
                default_model_id: "gpt-4o".to_string(),
                max_steps: 5,
            },
            providers: vec![],
        };

        let context = ChatRequestContext {
            messages: vec![],
            project_id: Some("test-project".to_string()),
            project_path: Some("/tmp/test-project".to_string()),
            provider_id: Some("anthropic".to_string()),
            model_id: Some("claude".to_string()),
            session_id: Some("session-123".to_string()),
            base_url: "http://localhost:3000".to_string(),
            config,
        };

        assert_eq!(context.project_id, Some("test-project".to_string()));
        assert_eq!(context.provider_id, Some("anthropic".to_string()));
        assert_eq!(context.model_id, Some("claude".to_string()));
    }
}
