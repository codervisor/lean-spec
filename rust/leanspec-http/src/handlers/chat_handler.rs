//! Chat streaming handler

use axum::body::{Body, Bytes};
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::sse::{Event, Sse};
use axum::response::{IntoResponse, Response};
use futures_util::{stream, Stream, TryStreamExt};
use serde::Deserialize;
use std::env;
use std::fs;
use std::path::PathBuf;

use crate::ai::{AiWorkerError, WorkerChatPayload, WorkerResponse};
use crate::chat_config::ChatConfig;
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

#[derive(Debug, Clone, Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    pub messages: Vec<serde_json::Value>,
    pub project_id: Option<String>,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone)]
enum ChatTransport {
    #[cfg(unix)]
    Unix(PathBuf),
    Http(String),
}

#[derive(Debug, Clone)]
struct ChatServerConfig {
    transport: ChatTransport,
}

impl ChatServerConfig {
    fn from_env() -> Self {
        let transport = env::var("LEANSPEC_CHAT_TRANSPORT").unwrap_or_default();
        if transport.eq_ignore_ascii_case("http") {
            return Self {
                transport: ChatTransport::Http(resolve_http_url()),
            };
        }

        #[cfg(unix)]
        {
            let socket_path = env::var("LEANSPEC_CHAT_SOCKET")
                .unwrap_or_else(|_| "/tmp/leanspec-chat.sock".to_string());
            let socket_path = PathBuf::from(socket_path);
            if socket_path.exists() {
                return Self {
                    transport: ChatTransport::Unix(socket_path),
                };
            }
        }

        Self {
            transport: ChatTransport::Http(resolve_http_url()),
        }
    }
}

fn resolve_http_url() -> String {
    if let Ok(explicit) = env::var("LEANSPEC_CHAT_URL") {
        return explicit;
    }

    if let Ok(port) = env::var("LEANSPEC_CHAT_PORT") {
        if let Ok(port) = port.parse::<u16>() {
            return format!("http://127.0.0.1:{}", port);
        }
    }

    let port_file = env::var("LEANSPEC_CHAT_PORT_FILE").unwrap_or_else(|_| {
        let mut path = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push(".leanspec/chat-port.txt");
        path.to_string_lossy().to_string()
    });

    if let Ok(content) = fs::read_to_string(&port_file) {
        if let Ok(port) = content.trim().parse::<u16>() {
            return format!("http://127.0.0.1:{}", port);
        }
    }

    "http://127.0.0.1:3031".to_string()
}

/// POST /api/chat - Stream responses via IPC worker
pub async fn chat_stream(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(payload): axum::Json<ChatRequest>,
) -> ApiResult<Response> {
    let body_bytes = serde_json::to_vec(&payload).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            axum::Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    if should_proxy_chat() {
        return proxy_chat(headers, Bytes::from(body_bytes)).await;
    }

    let config = state.chat_config.read().await.config();
    let payload = build_worker_payload(payload, &state, config)?;

    let response_stream = {
        let mut manager = state.ai_worker.lock().await;
        match manager.get_or_spawn().await {
            Ok(worker) => worker
                .send_chat_request(payload)
                .await
                .map_err(map_ai_error)?,
            Err(error) => {
                tracing::warn!("AI worker unavailable: {}", error);
                return fallback_or_error(headers, Bytes::from(body_bytes), error).await;
            }
        }
    };

    let stream = response_stream_to_sse(response_stream);
    Ok(Sse::new(stream).into_response())
}

fn build_worker_payload(
    payload: ChatRequest,
    state: &AppState,
    config: ChatConfig,
) -> Result<WorkerChatPayload, (StatusCode, axum::Json<ApiError>)> {
    let base_url = resolve_http_base_url(state);
    let config_value = serde_json::to_value(config).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(WorkerChatPayload {
        messages: payload.messages,
        project_id: payload.project_id,
        provider_id: payload.provider_id,
        model_id: payload.model_id,
        session_id: payload.session_id,
        config: Some(config_value),
        base_url: Some(base_url),
    })
}

fn resolve_http_base_url(state: &AppState) -> String {
    if let Ok(explicit) = env::var("LEANSPEC_HTTP_URL") {
        return explicit;
    }

    let host = state.config.server.host.clone();
    let port = state.config.server.port;
    format!("http://{}:{}", host, port)
}

fn response_stream_to_sse(
    receiver: tokio::sync::mpsc::Receiver<WorkerResponse>,
) -> impl Stream<Item = Result<Event, std::convert::Infallible>> {
    stream::unfold(receiver, |mut receiver| async move {
        match receiver.recv().await {
            Some(response) => {
                let event = map_worker_response(response);
                Some((Ok(event), receiver))
            }
            None => None,
        }
    })
}

fn map_worker_response(response: WorkerResponse) -> Event {
    match response {
        WorkerResponse::Chunk { data, .. } => {
            let text = data.get("text").and_then(|v| v.as_str()).unwrap_or("");
            Event::default()
                .json_data(serde_json::json!({ "type": "text", "text": text }))
                .unwrap_or_else(|_| Event::default().data(""))
        }
        WorkerResponse::ToolCall { data, .. } => event_with_type(data, "tool_call"),
        WorkerResponse::ToolResult { data, .. } => event_with_type(data, "tool_result"),
        WorkerResponse::Done { .. } => Event::default()
            .json_data(serde_json::json!({ "type": "finish" }))
            .unwrap_or_else(|_| Event::default().data("")),
        WorkerResponse::Error { error, .. } => Event::default()
            .json_data(serde_json::json!({ "type": "error", "error": error }))
            .unwrap_or_else(|_| Event::default().data("")),
        _ => Event::default().data(""),
    }
}

fn event_with_type(data: serde_json::Value, kind: &str) -> Event {
    let payload = match data {
        serde_json::Value::Object(mut map) => {
            map.insert("type".to_string(), serde_json::json!(kind));
            serde_json::Value::Object(map)
        }
        other => serde_json::json!({ "type": kind, "data": other }),
    };

    Event::default()
        .json_data(payload)
        .unwrap_or_else(|_| Event::default().data(""))
}

fn should_proxy_chat() -> bool {
    match env::var("LEANSPEC_CHAT_TRANSPORT") {
        Ok(value) => !value.trim().is_empty(),
        Err(_) => false,
    }
}

async fn fallback_or_error(
    headers: HeaderMap,
    body: Bytes,
    error: AiWorkerError,
) -> ApiResult<Response> {
    match proxy_chat(headers, body).await {
        Ok(response) => Ok(response),
        Err(_) => Err((
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(ApiError::invalid_request(&format!(
                "AI chat unavailable: {}",
                error
            ))),
        )),
    }
}

fn map_ai_error(error: AiWorkerError) -> (StatusCode, axum::Json<ApiError>) {
    (
        StatusCode::SERVICE_UNAVAILABLE,
        axum::Json(ApiError::invalid_request(&format!(
            "AI chat unavailable: {}",
            error
        ))),
    )
}

/// Proxy to legacy chat server (HTTP or Unix socket)
async fn proxy_chat(headers: HeaderMap, body: Bytes) -> ApiResult<Response> {
    let config = ChatServerConfig::from_env();
    let response = match config.transport {
        #[cfg(unix)]
        ChatTransport::Unix(socket_path) => {
            use http_body_util::{BodyExt, Full};
            use hyper_util::client::legacy::Client;
            use hyper_util::rt::TokioExecutor;

            let connector = hyperlocal::UnixConnector;
            let client: Client<_, Full<Bytes>> =
                Client::builder(TokioExecutor::new()).build(connector);

            let uri = hyperlocal::Uri::new(&socket_path, "/api/chat");
            let mut req = hyper::Request::builder().method("POST").uri(uri);

            if let Some(content_type) = headers.get(axum::http::header::CONTENT_TYPE) {
                req = req.header(axum::http::header::CONTENT_TYPE, content_type);
            }
            if let Some(accept) = headers.get(axum::http::header::ACCEPT) {
                req = req.header(axum::http::header::ACCEPT, accept);
            }

            let req = req.body(Full::new(body)).map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(ApiError::internal_error(&e.to_string())),
                )
            })?;

            let resp = client.request(req).await.map_err(|e| {
                (
                    StatusCode::BAD_GATEWAY,
                    axum::Json(ApiError::invalid_request(&e.to_string())),
                )
            })?;

            let status = resp.status();
            let response_headers = resp.headers().clone();
            let body_stream = resp
                .into_body()
                .into_data_stream()
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e));

            let mut builder = Response::builder().status(status);
            for (key, value) in response_headers.iter() {
                if !key.as_str().eq_ignore_ascii_case("content-length") {
                    builder = builder.header(key, value);
                }
            }

            return builder.body(Body::from_stream(body_stream)).map_err(|e| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(ApiError::internal_error(&e.to_string())),
                )
            });
        }
        ChatTransport::Http(base_url) => {
            let client = reqwest::Client::new();
            client
                .post(format!("{}/api/chat", base_url.trim_end_matches('/')))
                .headers(copy_headers(&headers))
                .body(body.to_vec())
                .send()
                .await
                .map_err(|e| {
                    (
                        StatusCode::BAD_GATEWAY,
                        axum::Json(ApiError::invalid_request(&e.to_string())),
                    )
                })?
        }
    };

    let status = response.status();
    let response_headers = response.headers().clone();
    let stream = response
        .bytes_stream()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e));

    let mut builder = Response::builder().status(status);
    for (key, value) in response_headers.iter() {
        if key.as_str().eq_ignore_ascii_case("content-length") {
            continue;
        }
        builder = builder.header(key, value);
    }

    builder.body(Body::from_stream(stream)).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(ApiError::internal_error(&e.to_string())),
        )
    })
}

fn copy_headers(headers: &HeaderMap) -> reqwest::header::HeaderMap {
    let mut out = reqwest::header::HeaderMap::new();
    if let Some(content_type) = headers.get(axum::http::header::CONTENT_TYPE) {
        out.insert(axum::http::header::CONTENT_TYPE, content_type.clone());
    }
    if let Some(accept) = headers.get(axum::http::header::ACCEPT) {
        out.insert(axum::http::header::ACCEPT, accept.clone());
    }
    out
}
