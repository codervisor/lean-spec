use axum::{extract::State, Json};

#[cfg(feature = "ai")]
use leanspec_core::storage::chat_config::{resolve_api_key, ChatProvider};

#[cfg(feature = "ai")]
use reqwest::StatusCode;

#[cfg(feature = "ai")]
use std::time::Duration;

use crate::chat_config::{ChatConfigClient, ChatConfigUpdate};
use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

pub async fn get_chat_config(State(state): State<AppState>) -> ApiResult<Json<ChatConfigClient>> {
    let config = state.chat_config.read().await.client_config();
    Ok(Json(config))
}

pub async fn update_chat_config(
    State(state): State<AppState>,
    Json(update): Json<ChatConfigUpdate>,
) -> ApiResult<Json<ChatConfigClient>> {
    let mut store = state.chat_config.write().await;
    store.update(update).map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    // Use the already-held store to get client_config instead of acquiring another lock
    let config = store.client_config();
    Ok(Json(config))
}

#[cfg(feature = "ai")]
#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderValidationRequest {
    pub provider_id: String,
    pub model_id: Option<String>,
}

#[cfg(feature = "ai")]
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderValidationResponse {
    pub provider_id: String,
    pub valid: bool,
    pub error: Option<String>,
}

#[cfg(feature = "ai")]
pub async fn validate_provider_api_key(
    State(state): State<AppState>,
    Json(request): Json<ProviderValidationRequest>,
) -> ApiResult<Json<ProviderValidationResponse>> {
    let config = state.chat_config.read().await.config();
    let provider = config
        .providers
        .iter()
        .find(|p| p.id == request.provider_id)
        .ok_or_else(|| {
            (
                axum::http::StatusCode::NOT_FOUND,
                Json(ApiError::not_found(&format!(
                    "Provider '{}' not found",
                    request.provider_id
                ))),
            )
        })?;

    let api_key = resolve_api_key(&provider.api_key);
    if api_key.is_empty() {
        return Ok(Json(ProviderValidationResponse {
            provider_id: provider.id.clone(),
            valid: false,
            error: Some("API key is not configured".to_string()),
        }));
    }

    match perform_provider_validation(provider, &api_key, request.model_id.as_deref()).await {
        Ok(()) => Ok(Json(ProviderValidationResponse {
            provider_id: provider.id.clone(),
            valid: true,
            error: None,
        })),
        Err(message) => Ok(Json(ProviderValidationResponse {
            provider_id: provider.id.clone(),
            valid: false,
            error: Some(message),
        })),
    }
}

#[cfg(feature = "ai")]
fn normalize_base_url(base_url: &Option<String>, fallback: &str) -> String {
    let base = base_url
        .as_ref()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.trim_end_matches('/').to_string());

    base
}

#[cfg(feature = "ai")]
fn build_openai_models_url(base_url: &Option<String>, fallback: &str) -> String {
    let base = normalize_base_url(base_url, fallback);
    if base.ends_with("/v1") {
        format!("{}/models", base)
    } else {
        format!("{}/v1/models", base)
    }
}

#[cfg(feature = "ai")]
fn build_anthropic_models_url(base_url: &Option<String>) -> String {
    let base = normalize_base_url(base_url, "https://api.anthropic.com");
    if base.ends_with("/v1") {
        format!("{}/models?limit=1", base)
    } else {
        format!("{}/v1/models?limit=1", base)
    }
}

#[cfg(feature = "ai")]
async fn perform_provider_validation(
    provider: &ChatProvider,
    api_key: &str,
    _model_id: Option<&str>,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|err| err.to_string())?;

    let (url, request_builder) = match provider.id.as_str() {
        "anthropic" => {
            let url = build_anthropic_models_url(&provider.base_url);
            let builder = client
                .get(&url)
                .header("x-api-key", api_key)
                .header("anthropic-version", "2023-06-01")
                .header("accept", "application/json");
            (url, builder)
        }
        "openai" => {
            let url = build_openai_models_url(&provider.base_url, "https://api.openai.com");
            let builder = client
                .get(&url)
                .bearer_auth(api_key)
                .header("accept", "application/json");
            (url, builder)
        }
        "openrouter" => {
            let url = build_openai_models_url(&provider.base_url, "https://openrouter.ai/api");
            let builder = client
                .get(&url)
                .bearer_auth(api_key)
                .header("accept", "application/json");
            (url, builder)
        }
        _ => {
            if provider
                .base_url
                .as_ref()
                .map(|value| value.trim().is_empty())
                .unwrap_or(true)
            {
                return Err("No base URL configured for provider".to_string());
            }
            let url = build_openai_models_url(&provider.base_url, "");
            let builder = client
                .get(&url)
                .bearer_auth(api_key)
                .header("accept", "application/json");
            (url, builder)
        }
    };

    if url.is_empty() {
        return Err("No base URL configured for provider".to_string());
    }

    let response = request_builder
        .send()
        .await
        .map_err(|err| err.to_string())?;

    if response.status().is_success() {
        return Ok(());
    }

    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let trimmed = body.trim();
    let truncated = if trimmed.len() > 200 {
        format!("{}...", &trimmed[..200])
    } else {
        trimmed.to_string()
    };

    let message = match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
            "Authentication failed. Check the API key.".to_string()
        }
        _ => {
            if truncated.is_empty() {
                format!("Provider validation failed (status {})", status)
            } else {
                format!("Provider validation failed (status {}): {}", status, truncated)
            }
        }
    };

    Err(message)
}
