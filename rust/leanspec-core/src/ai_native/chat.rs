//! Chat streaming implementation using aisdk

use std::sync::Arc;

use aisdk::core::{
    utils::step_count_is, AssistantMessage, LanguageModelRequest, LanguageModelResponseContentType,
    LanguageModelStreamChunkType, Message,
};
use futures_util::StreamExt;
use tokio::sync::{mpsc, oneshot};

use crate::ai_native::error::AiError;
use crate::ai_native::providers::{select_provider, ProviderClient};
use crate::ai_native::streaming::StreamEvent;
use crate::ai_native::tools::{build_tools, ToolContext};
use crate::ai_native::types::{MessageRole, UIMessage};
use crate::storage::chat_config::ChatConfig;

const SYSTEM_PROMPT: &str = "You are LeanSpec Assistant. Manage specs through tools.\n\nCapabilities: list, search, create, update, link, validate specs. Edit content, checklists, sub-specs.\n\nRules:\n1. Use tools - never invent spec IDs\n2. Follow LeanSpec: <2000 tokens, required sections, kebab-case names\n3. Multi-step: explain before executing\n4. Be concise - actionable answers only\n5. Format lists as markdown bullets\n\nContext economy: stay focused.";

#[derive(Debug, Clone)]
pub struct ChatRequestContext {
    pub messages: Vec<UIMessage>,
    pub project_id: Option<String>,
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

pub async fn stream_chat(context: ChatRequestContext) -> Result<StreamChatResult, AiError> {
    let ChatRequestContext {
        messages,
        project_id,
        provider_id,
        model_id,
        session_id: _,
        base_url,
        config,
    } = context;

    let provider_id = provider_id.unwrap_or_else(|| config.settings.default_provider_id.clone());
    let model_id = model_id.unwrap_or_else(|| config.settings.default_model_id.clone());

    let selection = select_provider(&config, &provider_id, &model_id)?;
    let tools = build_tools(ToolContext {
        base_url: base_url.clone(),
        project_id: project_id.clone(),
    })?;

    let aisdk_messages = ui_messages_to_ai(messages);

    let (sender, receiver) = mpsc::unbounded_channel();
    let (done_tx, done_rx) = oneshot::channel();
    let message_id = format!("msg_{}", uuid::Uuid::new_v4());
    let text_id = format!("text_{}_0", message_id);

    let sender_arc = Arc::new(sender);
    let hook_sender = sender_arc.clone();

    let mut builder = match selection.provider {
        ProviderClient::OpenAI(provider) => LanguageModelRequest::builder()
            .model(provider)
            .system(SYSTEM_PROMPT)
            .messages(aisdk_messages),
        ProviderClient::Anthropic(provider) => LanguageModelRequest::builder()
            .model(provider)
            .system(SYSTEM_PROMPT)
            .messages(aisdk_messages),
        ProviderClient::OpenRouter(provider) => LanguageModelRequest::builder()
            .model(provider)
            .system(SYSTEM_PROMPT)
            .messages(aisdk_messages),
    };

    let tool_list = tools.tools.clone();
    for tool in tool_list.lock().unwrap_or_else(|p| p.into_inner()).iter() {
        builder = builder.with_tool(tool.clone());
    }

    let hook_sender_finish = sender_arc.clone();

    let mut request = builder
        .stop_when(step_count_is(config.settings.max_steps as usize))
        .on_step_start(move |_| {
            let _ = hook_sender.send(StreamEvent::StartStep);
        })
        .on_step_finish(move |options| {
            if let Some(step) = options.last_step() {
                if let Some(tool_calls) = step.tool_calls() {
                    for call in tool_calls {
                        let tool_id = call.tool.id.clone();
                        let tool_name = call.tool.name.clone();
                        let _ = hook_sender_finish.send(StreamEvent::ToolInputStart {
                            tool_call_id: tool_id.clone(),
                            tool_name: tool_name.clone(),
                        });
                        let _ = hook_sender_finish.send(StreamEvent::ToolInputAvailable {
                            tool_call_id: tool_id,
                            tool_name,
                            input: call.input.clone(),
                        });
                    }
                }

                if let Some(tool_results) = step.tool_results() {
                    for result in tool_results {
                        let tool_id = result.tool.id.clone();
                        let output = result.output.unwrap_or(serde_json::Value::Null);
                        let _ = hook_sender_finish.send(StreamEvent::ToolOutputAvailable {
                            tool_call_id: tool_id,
                            output,
                        });
                    }
                }
            }
            let _ = hook_sender_finish.send(StreamEvent::FinishStep);
        })
        .build();

    tokio::spawn(async move {
        let mut assistant_text = String::new();
        let mut text_started = false;
        let _ = sender_arc.send(StreamEvent::MessageStart {
            message_id: message_id.clone(),
        });

        let stream_result = request.stream_text().await;
        match stream_result {
            Ok(response) => {
                let mut stream = response.stream;
                while let Some(chunk) = stream.next().await {
                    match chunk {
                        LanguageModelStreamChunkType::Start => {}
                        LanguageModelStreamChunkType::Text(delta) => {
                            if !text_started {
                                text_started = true;
                                let _ = sender_arc.send(StreamEvent::TextStart {
                                    id: text_id.clone(),
                                });
                            }
                            assistant_text.push_str(&delta);
                            let _ = sender_arc.send(StreamEvent::TextDelta {
                                id: text_id.clone(),
                                delta,
                            });
                        }
                        LanguageModelStreamChunkType::End(AssistantMessage { content, .. }) => {
                            if let LanguageModelResponseContentType::Text(text) = content {
                                if !text.is_empty() {
                                    assistant_text.push_str(&text);
                                }
                            }
                        }
                        LanguageModelStreamChunkType::Failed(error) => {
                            let _ = sender_arc.send(StreamEvent::Error { error_text: error });
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(error) => {
                let _ = sender_arc.send(StreamEvent::Error {
                    error_text: format!("{}", error),
                });
            }
        }

        if text_started {
            let _ = sender_arc.send(StreamEvent::TextEnd {
                id: text_id.clone(),
            });
        }
        let _ = sender_arc.send(StreamEvent::Finish);
        let _ = done_tx.send(Some(assistant_text));
    });

    Ok(StreamChatResult {
        stream: receiver,
        completion: done_rx,
        selected_provider_id: selection.provider_id,
        selected_model_id: selection.model_id,
    })
}

fn ui_messages_to_ai(messages: Vec<UIMessage>) -> Vec<Message> {
    messages
        .into_iter()
        .filter_map(|message| {
            let text = message
                .parts
                .iter()
                .filter_map(|part| match part {
                    crate::ai_native::types::UIMessagePart::Text { text } => Some(text.clone()),
                    _ => None,
                })
                .collect::<Vec<_>>()
                .join("\n");

            if text.trim().is_empty() {
                return None;
            }

            match message.role {
                MessageRole::System => Some(Message::System(text.into())),
                MessageRole::User => Some(Message::User(text.into())),
                MessageRole::Assistant => Some(Message::Assistant(AssistantMessage {
                    content: LanguageModelResponseContentType::Text(text),
                    usage: None,
                })),
            }
        })
        .collect()
}
