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
    pub messages: Vec<UIMessage>,
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
    if payload.messages.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            axum::Json(ApiError::invalid_request(
                "messages must be a non-empty array",
            )),
        ));
    }

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

    if let Some(session_id) = payload.session_id.as_deref() {
        if let Some((session_provider, session_model)) =
            fetch_session_context(state.clone(), session_id).await
        {
            if session_provider.is_some() {
                provider_id = session_provider;
            }
            if session_model.is_some() {
                model_id = session_model;
            }
        }
    }

    let config = state.chat_config.read().await.config();
    let request_context = ChatRequestContext {
        messages: payload.messages.clone(),
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
        let messages = payload.messages.clone();
        let completion = result.completion;
        let provider_id_for_store = selected_provider_id.clone();
        let model_id_for_store = selected_model_id.clone();
        tokio::spawn(async move {
            if let Ok(Some(assistant_text)) = completion.await {
                let trimmed = assistant_text.trim();
                if trimmed.is_empty() {
                    return;
                }
                let mut persisted = to_chat_messages(messages);
                persisted.push(ChatMessageInput {
                    id: None,
                    role: "assistant".to_string(),
                    content: trimmed.to_string(),
                    timestamp: None,
                    metadata: None,
                });

                let _ = tokio::task::spawn_blocking(move || {
                    store.replace_messages(
                        &session_id,
                        Some(provider_id_for_store),
                        Some(model_id_for_store),
                        persisted,
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

fn to_chat_messages(messages: Vec<UIMessage>) -> Vec<ChatMessageInput> {
    messages
        .into_iter()
        .filter_map(|message| {
            let text = extract_text(&message);
            if text.trim().is_empty() {
                return None;
            }
            let role = match message.role {
                MessageRole::System => "system",
                MessageRole::User => "user",
                MessageRole::Assistant => "assistant",
            };

            Some(ChatMessageInput {
                id: Some(message.id),
                role: role.to_string(),
                content: text,
                timestamp: None,
                metadata: message.metadata,
            })
        })
        .collect()
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
