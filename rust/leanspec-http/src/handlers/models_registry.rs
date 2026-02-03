//! Models Registry API handlers

use axum::{extract::State, Json};
use leanspec_core::models_registry::{
    get_configured_providers, get_providers_with_availability, load_bundled_registry,
    ModelsDevClient, ProviderWithAvailability,
};
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
    let registry = load_bundled_registry().map_err(|e| {
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
    let registry = load_bundled_registry().map_err(|e| {
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

    match client.fetch_blocking() {
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
