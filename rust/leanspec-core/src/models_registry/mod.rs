//! Models Registry - Integration with models.dev
//!
//! This module provides automatic discovery of AI models and providers
//! using the models.dev registry (https://models.dev/api.json).
//!
//! # Features
//! - Fetches model catalog from models.dev API
//! - Caches data locally with configurable TTL
//! - Filters providers by available API keys
//! - Provides fallback to bundled snapshot for offline use

mod cache;
mod client;
mod types;

#[cfg(feature = "storage")]
mod bridge;

pub use cache::ModelCache;
pub use client::ModelsDevClient;
pub use types::{
    Model, ModelCost, ModelLimits, ModelModalities, ModelRegistry, Provider,
    ProviderWithAvailability,
};

#[cfg(feature = "storage")]
pub use bridge::{
    build_chat_config_from_registry, merge_user_preferences, registry_to_chat_config,
};

use crate::error::{CoreError, CoreResult};
use std::collections::HashMap;

/// Default TTL for cached models data (24 hours)
pub const DEFAULT_CACHE_TTL_SECS: u64 = 24 * 60 * 60;

/// models.dev API endpoint
pub const MODELS_DEV_API_URL: &str = "https://models.dev/api.json";

/// Environment variables for common providers
const PROVIDER_ENV_VARS: &[(&str, &[&str])] = &[
    ("openai", &["OPENAI_API_KEY"]),
    ("anthropic", &["ANTHROPIC_API_KEY"]),
    ("deepseek", &["DEEPSEEK_API_KEY"]),
    (
        "google",
        &["GOOGLE_GENERATIVE_AI_API_KEY", "GOOGLE_API_KEY"],
    ),
    (
        "google-vertex",
        &["GOOGLE_VERTEX_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS"],
    ),
    ("openrouter", &["OPENROUTER_API_KEY"]),
    ("groq", &["GROQ_API_KEY"]),
    (
        "fireworks-ai",
        &["FIREWORKS_API_KEY", "FIREWORKS_AI_API_KEY"],
    ),
    ("mistral", &["MISTRAL_API_KEY"]),
    ("cohere", &["COHERE_API_KEY", "CO_API_KEY"]),
    ("togetherai", &["TOGETHER_API_KEY", "TOGETHERAI_API_KEY"]),
    ("perplexity", &["PERPLEXITY_API_KEY", "PPLX_API_KEY"]),
    ("xai", &["XAI_API_KEY"]),
    ("azure", &["AZURE_OPENAI_API_KEY", "AZURE_API_KEY"]),
    (
        "amazon-bedrock",
        &["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
    ),
];

/// Check if a provider has API keys configured in environment
pub fn is_provider_configured(provider_id: &str) -> bool {
    // Check predefined env vars first
    for (id, env_vars) in PROVIDER_ENV_VARS {
        if *id == provider_id {
            return env_vars.iter().any(|var| std::env::var(var).is_ok());
        }
    }
    false
}

/// Check provider configuration with custom env var list
pub fn is_provider_configured_with_env(env_vars: &[String]) -> bool {
    env_vars.iter().any(|var| std::env::var(var).is_ok())
}

/// Get list of configured providers from environment
pub fn get_configured_providers() -> Vec<String> {
    PROVIDER_ENV_VARS
        .iter()
        .filter(|(_, env_vars)| env_vars.iter().any(|var| std::env::var(var).is_ok()))
        .map(|(id, _)| id.to_string())
        .collect()
}

/// Load the model registry with intelligent fallback
///
/// 1. Try to load from cache if valid
/// 2. Fetch from models.dev API if cache is stale
/// 3. Fall back to bundled snapshot if offline
pub async fn load_registry() -> CoreResult<ModelRegistry> {
    let cache = ModelCache::new()?;

    // Try cache first
    if let Ok(Some(registry)) = cache.load() {
        if !cache.is_stale()? {
            return Ok(registry);
        }
    }

    // Fetch from API
    let client = ModelsDevClient::new();
    match client.fetch().await {
        Ok(registry) => {
            // Update cache
            if let Err(e) = cache.save(&registry) {
                eprintln!("Warning: Failed to cache models registry: {}", e);
            }
            Ok(registry)
        }
        Err(e) => {
            // Try stale cache
            if let Ok(Some(registry)) = cache.load() {
                eprintln!("Warning: Using stale cache due to fetch error: {}", e);
                return Ok(registry);
            }
            // Fall back to bundled
            load_bundled_registry()
        }
    }
}

/// Load the bundled models registry snapshot
pub fn load_bundled_registry() -> CoreResult<ModelRegistry> {
    let bundled = include_str!("bundled_models.json");
    serde_json::from_str(bundled)
        .map_err(|e| CoreError::ConfigError(format!("Failed to parse bundled registry: {}", e)))
}

/// Get available providers with their configuration status
pub fn get_providers_with_availability(registry: &ModelRegistry) -> Vec<ProviderWithAvailability> {
    registry
        .providers
        .iter()
        .map(|(id, provider)| {
            let configured = if provider.env.is_empty() {
                is_provider_configured(id)
            } else {
                is_provider_configured_with_env(&provider.env)
            };
            ProviderWithAvailability {
                provider: provider.clone(),
                is_configured: configured,
                configured_env_vars: if configured {
                    provider
                        .env
                        .iter()
                        .filter(|var| std::env::var(var).is_ok())
                        .cloned()
                        .collect()
                } else {
                    vec![]
                },
            }
        })
        .collect()
}

/// Get only configured providers with their models
pub fn get_configured_providers_with_models(registry: &ModelRegistry) -> HashMap<String, Provider> {
    registry
        .providers
        .iter()
        .filter(|(id, provider)| {
            if provider.env.is_empty() {
                is_provider_configured(id)
            } else {
                is_provider_configured_with_env(&provider.env)
            }
        })
        .map(|(id, provider)| (id.clone(), provider.clone()))
        .collect()
}

/// Filter models by capability
pub fn filter_models_with_tool_call(registry: &ModelRegistry) -> HashMap<String, Vec<Model>> {
    let mut result = HashMap::new();
    for (provider_id, provider) in &registry.providers {
        let models: Vec<Model> = provider
            .models
            .values()
            .filter(|m| m.tool_call.unwrap_or(false))
            .cloned()
            .collect();
        if !models.is_empty() {
            result.insert(provider_id.clone(), models);
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_configured_providers_empty() {
        // In CI/test environment, likely no API keys configured
        let providers = get_configured_providers();
        // Just ensure it doesn't panic - may have 0 or more providers
        let _ = providers;
    }

    #[test]
    fn test_is_provider_configured() {
        // Test with a definitely non-existent key
        std::env::remove_var("__TEST_NONEXISTENT_KEY__");
        assert!(!is_provider_configured("__fake_provider__"));

        // Test with a known provider that likely isn't configured in tests
        // (unless running locally with keys)
        let _ = is_provider_configured("openai");
    }

    #[test]
    fn test_bundled_registry() {
        let registry = load_bundled_registry();
        assert!(registry.is_ok());
        let registry = registry.unwrap();
        // Should have at least openai and anthropic
        assert!(registry.providers.contains_key("openai"));
        assert!(registry.providers.contains_key("anthropic"));
    }
}
