//! Chat streaming handler (native Rust)

use axum::body::{Body, Bytes};
use axum::extract::State;
use axum::http::{header, StatusCode};
use axum::response::Response;
use futures_util::{stream, StreamExt};
use serde::Deserialize;

use crate::ai::{
    generate_text, sse_done, stream_chat, ChatRequestContext, GenerateTextContext, MessageRole,
    UIMessage, UIMessagePart,
};
use crate::chat_store::ChatMessageInput;
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    /// Full message history — only used when no session_id is provided (stateless mode).
    #[serde(default)]
    pub messages: Vec<UIMessage>,
    /// The new user message text. When session_id is set, history is fetched from DB
    /// and this message is appended.
    pub message: Option<String>,
    pub project_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub session_id: Option<String>,
}

/// POST /api/chat - Stream responses via native Rust AI
pub async fn chat_stream(
    State(state): State<AppState>,
    axum::Json(payload): axum::Json<ChatRequest>,
) -> ApiResult<Response> {
    let base_url = resolve_http_base_url(&state);
    let project_path = if let Some(project_id) = payload.project_id.as_deref() {
        let registry = state.registry.read().await;
        let project = registry.get(project_id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                axum::Json(ApiError::project_not_found(project_id)),
            )
        })?;
        Some(project.path.to_string_lossy().to_string())
    } else {
        None
    };
    let mut provider_id = payload.provider_id.clone();
    let mut model_id = payload.model_id.clone();

    // Only fall back to session-stored provider/model when the request doesn't
    // include them. The payload values represent the user's current selection
    // (e.g. after switching models in the UI) and must take precedence.
    if let Some(session_id) = payload.session_id.as_deref() {
        if provider_id.is_none() || model_id.is_none() {
            if let Some((session_provider, session_model)) =
                fetch_session_context(state.clone(), session_id).await
            {
                if provider_id.is_none() && session_provider.is_some() {
                    provider_id = session_provider;
                }
                if model_id.is_none() && session_model.is_some() {
                    model_id = session_model;
                }
            }
        }
    }

    // Build the message list:
    // - With session_id: fetch history from DB + append the new user message
    // - Without session_id: use messages array from the request (stateless/AI SDK default)
    let messages = if let Some(session_id) = payload.session_id.as_deref() {
        let user_text = payload.message.clone().or_else(|| {
            // Fallback: extract from the last user message in the messages array
            // (for backward compatibility with the AI SDK transport)
            payload.messages.iter().rev().find_map(|m| {
                if matches!(m.role, MessageRole::User) {
                    Some(extract_text(m))
                } else {
                    None
                }
            })
        });

        let user_text = user_text.filter(|t| !t.trim().is_empty()).ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                axum::Json(ApiError::invalid_request(
                    "message text is required when using a session",
                )),
            )
        })?;

        // Fetch existing messages from DB
        let store = state.chat_store.clone();
        let sid = session_id.to_string();
        let db_messages = tokio::task::spawn_blocking(move || store.get_messages(&sid))
            .await
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(ApiError::internal_error(&e.to_string())),
                )
            })?
            .map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(ApiError::internal_error(&e)),
                )
            })?;

        let mut messages: Vec<UIMessage> = db_messages
            .into_iter()
            .filter_map(|m| chat_message_to_ui_message(&m))
            .collect();

        // Append the new user message
        messages.push(UIMessage {
            id: uuid::Uuid::new_v4().to_string(),
            role: MessageRole::User,
            parts: vec![UIMessagePart::Text {
                text: user_text.clone(),
            }],
            metadata: None,
        });

        messages
    } else {
        // Stateless mode — use messages from request
        if payload.messages.is_empty() {
            return Err((
                StatusCode::BAD_REQUEST,
                axum::Json(ApiError::invalid_request(
                    "messages must be a non-empty array",
                )),
            ));
        }
        payload.messages.clone()
    };

    let config = state.chat_config.read().await.config();
    let request_context = ChatRequestContext {
        messages: messages.clone(),
        project_id: payload.project_id.clone(),
        project_path,
        provider_id: provider_id.clone(),
        model_id: model_id.clone(),
        session_id: payload.session_id.clone(),
        base_url: base_url.clone(),
        config,
    };

    let result = stream_chat(request_context).await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            axum::Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    let selected_provider_id = result.selected_provider_id.clone();
    let selected_model_id = result.selected_model_id.clone();

    if let Some(session_id) = payload.session_id.clone() {
        let store = state.chat_store.clone();
        // Only persist the new user message + assistant response (append, not replace).
        // The user message is the last one in our built messages list.
        let user_message = messages.last().cloned();
        let completion = result.completion;
        let provider_id_for_store = selected_provider_id.clone();
        let model_id_for_store = selected_model_id.clone();
        tokio::spawn(async move {
            let mut new_messages: Vec<ChatMessageInput> = Vec::new();

            // Persist the user message
            if let Some(user_msg) = user_message {
                let text = extract_text(&user_msg);
                if !text.trim().is_empty() {
                    let parts = serde_json::to_value(&user_msg.parts).ok();
                    new_messages.push(ChatMessageInput {
                        id: Some(user_msg.id),
                        role: "user".to_string(),
                        content: text,
                        timestamp: None,
                        parts,
                        metadata: user_msg.metadata,
                    });
                }
            }

            // Wait for the assistant response and persist it
            if let Ok(Some(assistant_parts)) = completion.await {
                if !assistant_parts.is_empty() {
                    // Extract text content for the content column
                    let content = assistant_parts
                        .iter()
                        .filter_map(|p| match p {
                            UIMessagePart::Text { text } => Some(text.as_str()),
                            _ => None,
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                    let parts = serde_json::to_value(&assistant_parts).ok();
                    new_messages.push(ChatMessageInput {
                        id: None,
                        role: "assistant".to_string(),
                        content,
                        timestamp: None,
                        parts,
                        metadata: None,
                    });
                }
            }

            if !new_messages.is_empty() {
                let _ = tokio::task::spawn_blocking(move || {
                    store.append_messages(
                        &session_id,
                        Some(provider_id_for_store),
                        Some(model_id_for_store),
                        new_messages,
                    )
                })
                .await;
            }
        });
    }

    let response_stream = stream::unfold(result.stream, |mut receiver| async move {
        receiver
            .recv()
            .await
            .map(|event| (Ok(event.to_sse_string()), receiver))
    })
    .chain(stream::once(async { Ok(sse_done()) }))
    .map(|item: Result<String, std::convert::Infallible>| {
        Ok::<_, std::convert::Infallible>(Bytes::from(item.unwrap_or_else(|_| String::new())))
    });

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "text/event-stream; charset=utf-8")
        .header(header::CACHE_CONTROL, "no-cache, no-transform")
        .header(header::CONNECTION, "keep-alive")
        .header("x-vercel-ai-ui-message-stream", "v1")
        .header("x-chat-provider-id", selected_provider_id)
        .header("x-chat-model-id", selected_model_id)
        .body(Body::from_stream(response_stream))
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    Ok(response)
}

fn resolve_http_base_url(state: &AppState) -> String {
    if let Ok(explicit) = std::env::var("LEANSPEC_HTTP_URL") {
        return explicit;
    }

    let host = state.config.server.host.clone();
    let port = state.config.server.port;
    format!("http://{}:{}", host, port)
}

async fn fetch_session_context(
    state: AppState,
    session_id: &str,
) -> Option<(Option<String>, Option<String>)> {
    let store = state.chat_store.clone();
    let session_id = session_id.to_string();
    let session = tokio::task::spawn_blocking(move || store.get_session(&session_id))
        .await
        .ok()
        .and_then(|result| result.ok())
        .flatten()?;

    Some((session.provider_id, session.model_id))
}

/// Convert a stored ChatMessage (from DB) to a UIMessage for the AI context.
fn chat_message_to_ui_message(msg: &crate::chat_store::ChatMessage) -> Option<UIMessage> {
    let role = match msg.role.as_str() {
        "system" => MessageRole::System,
        "user" => MessageRole::User,
        "assistant" => MessageRole::Assistant,
        _ => return None,
    };

    // If parts were stored, deserialize them; otherwise fall back to a text part
    let parts: Vec<UIMessagePart> = msg
        .parts
        .as_ref()
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(|| {
            vec![UIMessagePart::Text {
                text: msg.content.clone(),
            }]
        });

    Some(UIMessage {
        id: msg.id.clone(),
        role,
        parts,
        metadata: msg.metadata.clone(),
    })
}

fn extract_text(message: &UIMessage) -> String {
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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateTitleRequest {
    pub text: String,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GenerateTitleResponse {
    pub title: String,
}

const TITLE_SYSTEM_PROMPT: &str =
    "You generate concise chat titles. Return only the title, no quotes, no punctuation at the end. Limit to 5 to 7 words.";

/// POST /api/chat/generate-title - Generate a title for a chat conversation
pub async fn generate_title(
    State(state): State<AppState>,
    axum::Json(payload): axum::Json<GenerateTitleRequest>,
) -> ApiResult<axum::Json<GenerateTitleResponse>> {
    if payload.text.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            axum::Json(ApiError::invalid_request("text must not be empty")),
        ));
    }

    let config = state.chat_config.read().await.config();
    let user_prompt = format!(
        "Generate a short title for this message:\n\n{}",
        payload.text
    );

    let context = GenerateTextContext {
        system_prompt: TITLE_SYSTEM_PROMPT.to_string(),
        user_prompt,
        provider_id: payload.provider_id,
        model_id: payload.model_id,
        config,
    };

    let result = generate_text(context).await.map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            axum::Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    let title = result.text.trim().replace(['\"', '"', '"'], "");

    Ok(axum::Json(GenerateTitleResponse { title }))
}
