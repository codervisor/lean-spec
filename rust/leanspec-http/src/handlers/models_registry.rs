//! Models Registry API handlers

use axum::{extract::State, Json};
use leanspec_core::models_registry::{
    get_configured_providers, get_providers_with_availability, load_bundled_registry,
    load_registry, registry_to_chat_config, ModelsDevClient, ProviderWithAvailability,
};
use leanspec_core::storage::chat_config::{ChatModel, ChatProvider};
use serde::{Deserialize, Serialize};

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

/// Response for listing available providers
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProvidersResponse {
    /// All available providers with their configuration status
    pub providers: Vec<ProviderWithAvailability>,
    /// List of provider IDs that have API keys configured
    pub configured_provider_ids: Vec<String>,
    /// Total number of providers
    pub total: usize,
    /// Number of configured providers
    pub configured_count: usize,
}

/// Response for a single provider's models
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderModelsResponse {
    pub provider_id: String,
    pub provider_name: String,
    pub is_configured: bool,
    pub models: Vec<ModelInfo>,
}

/// Simplified model info for API response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub tool_call: bool,
    pub reasoning: bool,
    pub vision: bool,
    pub context_window: Option<u64>,
    pub max_output: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input_cost: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output_cost: Option<f64>,
}

/// Query parameters for filtering providers
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProvidersQuery {
    /// Only return configured providers
    #[serde(default)]
    pub configured_only: bool,
    /// Only return providers with agentic models
    #[serde(default)]
    pub agentic_only: bool,
}

/// Get list of available providers and their configuration status
pub async fn list_providers(
    State(_state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<ProvidersQuery>,
) -> ApiResult<Json<ProvidersResponse>> {
    // Load registry (try bundled first for quick response)
    let registry = load_registry().await.map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&format!(
                "Failed to load models registry: {}",
                e
            ))),
        )
    })?;

    let mut providers = get_providers_with_availability(&registry);

    // Apply filters
    if query.configured_only {
        providers.retain(|p| p.is_configured);
    }
    if query.agentic_only {
        providers.retain(|p| {
            p.provider
                .models
                .values()
                .any(|m| m.tool_call.unwrap_or(false))
        });
    }

    let configured_ids = get_configured_providers();
    let configured_count = providers.iter().filter(|p| p.is_configured).count();

    Ok(Json(ProvidersResponse {
        total: providers.len(),
        configured_count,
        configured_provider_ids: configured_ids,
        providers,
    }))
}

/// Get models for a specific provider
pub async fn get_provider_models(
    State(_state): State<AppState>,
    axum::extract::Path(provider_id): axum::extract::Path<String>,
) -> ApiResult<Json<ProviderModelsResponse>> {
    let registry = load_registry().await.map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&format!(
                "Failed to load models registry: {}",
                e
            ))),
        )
    })?;

    let provider = registry.providers.get(&provider_id).ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found(&format!(
                "Provider '{}' not found",
                provider_id
            ))),
        )
    })?;

    let is_configured = leanspec_core::models_registry::is_provider_configured(&provider_id);

    let models: Vec<ModelInfo> = provider
        .models
        .values()
        .map(|m| ModelInfo {
            id: m.id.clone(),
            name: m.name.clone(),
            tool_call: m.tool_call.unwrap_or(false),
            reasoning: m.reasoning.unwrap_or(false),
            vision: m.supports_vision(),
            context_window: m.context_window(),
            max_output: m.max_output(),
            input_cost: m.cost.as_ref().and_then(|c| c.input),
            output_cost: m.cost.as_ref().and_then(|c| c.output),
        })
        .collect();

    Ok(Json(ProviderModelsResponse {
        provider_id: provider.id.clone(),
        provider_name: provider.name.clone(),
        is_configured,
        models,
    }))
}

/// Refresh the models registry from models.dev
pub async fn refresh_registry(
    State(_state): State<AppState>,
) -> ApiResult<Json<serde_json::Value>> {
    let client = ModelsDevClient::new();

    match client.fetch().await {
        Ok(registry) => {
            // Try to save to cache
            if let Ok(cache) = leanspec_core::models_registry::ModelCache::new() {
                let _ = cache.save(&registry);
            }

            let provider_count = registry.providers.len();
            let model_count: usize = registry.providers.values().map(|p| p.models.len()).sum();

            Ok(Json(serde_json::json!({
                "success": true,
                "providers": provider_count,
                "models": model_count,
                "message": format!("Refreshed registry with {} providers and {} models", provider_count, model_count)
            })))
        }
        Err(e) => Err((
            axum::http::StatusCode::BAD_GATEWAY,
            Json(ApiError::internal_error(&format!(
                "Failed to fetch from models.dev: {}",
                e
            ))),
        )),
    }
}

/// Request to set an API key for a provider
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetApiKeyRequest {
    /// The API key value (can be empty to clear the key)
    pub api_key: String,
}

/// Response for setting an API key
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetApiKeyResponse {
    pub success: bool,
    pub provider_id: String,
    pub has_api_key: bool,
}

/// Set the API key for a provider
pub async fn set_provider_api_key(
    State(state): State<AppState>,
    axum::extract::Path(provider_id): axum::extract::Path<String>,
    Json(request): Json<SetApiKeyRequest>,
) -> ApiResult<Json<SetApiKeyResponse>> {
    // Load the registry to get provider info
    let registry = load_bundled_registry().map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&format!(
                "Failed to load models registry: {}",
                e
            ))),
        )
    })?;

    let registry_provider = registry.providers.get(&provider_id);

    // Get current chat config
    let mut store = state.chat_config.write().await;
    let current_config = store.config();

    // Check if provider already exists in config
    let existing_provider_idx = current_config
        .providers
        .iter()
        .position(|p| p.id == provider_id);

    let new_providers = if let Some(idx) = existing_provider_idx {
        // Update existing provider's API key
        let mut providers = current_config.providers.clone();
        providers[idx].api_key = request.api_key.clone();
        providers
    } else if let Some(reg_provider) = registry_provider {
        // Add new provider from registry with the API key
        let mut providers = current_config.providers.clone();
        let chat_config_from_registry = registry_to_chat_config(&registry);
        if let Some(reg_chat_provider) = chat_config_from_registry
            .providers
            .iter()
            .find(|p| p.id == provider_id)
        {
            let mut new_provider = reg_chat_provider.clone();
            new_provider.api_key = request.api_key.clone();
            providers.push(new_provider);
        } else {
            // Fallback: create a minimal provider entry
            providers.push(ChatProvider {
                id: provider_id.clone(),
                name: reg_provider.name.clone(),
                base_url: reg_provider.api.clone(),
                api_key: request.api_key.clone(),
                models: reg_provider
                    .models
                    .values()
                    .filter(|m| m.tool_call.unwrap_or(false))
                    .map(|m| ChatModel {
                        id: m.id.clone(),
                        name: m.name.clone(),
                        max_tokens: m.limit.as_ref().and_then(|l| l.output.map(|o| o as u32)),
                        default: None,
                    })
                    .collect(),
            });
        }
        providers
    } else {
        // Provider not in registry - reject
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found(&format!(
                "Provider '{}' not found in registry. Use custom provider endpoint for non-registry providers.",
                provider_id
            ))),
        ));
    };

    // Create update with new providers
    let update = leanspec_core::storage::chat_config::ChatConfigUpdate {
        version: current_config.version.clone(),
        settings: current_config.settings.clone(),
        providers: new_providers
            .into_iter()
            .map(
                |p| leanspec_core::storage::chat_config::ChatProviderUpdate {
                    id: p.id,
                    name: p.name,
                    base_url: p.base_url,
                    api_key: Some(p.api_key),
                    models: p.models,
                    has_api_key: None,
                },
            )
            .collect(),
    };

    store.update(update).map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    let has_key = !request.api_key.is_empty();

    Ok(Json(SetApiKeyResponse {
        success: true,
        provider_id,
        has_api_key: has_key,
    }))
}
