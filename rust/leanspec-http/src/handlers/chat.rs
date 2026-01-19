//! Chat proxy handler

use axum::body::{Body, Bytes};
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::Response;
use futures_util::TryStreamExt;
use std::env;
use std::fs;
use std::path::PathBuf;

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

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

/// POST /api/chat - Proxy to chat server with SSE streaming
pub async fn proxy_chat(
    State(_state): State<AppState>,
    headers: HeaderMap,
    body: Bytes,
) -> ApiResult<Response> {
    let config = ChatServerConfig::from_env();
    let response = match config.transport {
        #[cfg(unix)]
        ChatTransport::Unix(socket_path) => {
            // Use hyperlocal with hyper for Unix socket connection
            use http_body_util::{BodyExt, Full};
            use hyper_util::client::legacy::Client;
            use hyper_util::rt::TokioExecutor;

            let connector = hyperlocal::UnixConnector;
            let client: Client<_, Full<Bytes>> =
                Client::builder(TokioExecutor::new()).build(connector);

            let uri = hyperlocal::Uri::new(&socket_path, "/api/chat");
            let mut req = hyper::Request::builder().method("POST").uri(uri);

            // Copy relevant headers
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

            // Convert hyper response to axum Response
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
