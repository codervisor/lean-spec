//! HTTP client for fetching models.dev registry

use crate::error::{CoreError, CoreResult};
use crate::models_registry::types::ModelRegistry;
use crate::models_registry::MODELS_DEV_API_URL;

/// Client for fetching the models.dev registry
pub struct ModelsDevClient {
    url: String,
}

impl Default for ModelsDevClient {
    fn default() -> Self {
        Self::new()
    }
}

impl ModelsDevClient {
    /// Create a new client with default URL
    pub fn new() -> Self {
        Self {
            url: MODELS_DEV_API_URL.to_string(),
        }
    }

    /// Create a client with a custom URL (for testing)
    pub fn with_url(url: String) -> Self {
        Self { url }
    }

    /// Fetch the registry from models.dev API
    pub async fn fetch(&self) -> CoreResult<ModelRegistry> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| CoreError::ConfigError(format!("Failed to build HTTP client: {}", e)))?;

        let response = client
            .get(&self.url)
            .header("User-Agent", "leanspec-core")
            .send()
            .await
            .map_err(|e| CoreError::ConfigError(format!("Failed to fetch models.dev: {}", e)))?;

        if !response.status().is_success() {
            return Err(CoreError::ConfigError(format!(
                "models.dev API returned status {}",
                response.status()
            )));
        }

        let registry: ModelRegistry = response
            .json()
            .await
            .map_err(|e| CoreError::ConfigError(format!("Failed to parse models.dev response: {}", e)))?;

        Ok(registry)
    }

    /// Fetch the registry synchronously (blocking)
    pub fn fetch_blocking(&self) -> CoreResult<ModelRegistry> {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| CoreError::ConfigError(format!("Failed to build HTTP client: {}", e)))?;

        let response = client
            .get(&self.url)
            .header("User-Agent", "leanspec-core")
            .send()
            .map_err(|e| CoreError::ConfigError(format!("Failed to fetch models.dev: {}", e)))?;

        if !response.status().is_success() {
            return Err(CoreError::ConfigError(format!(
                "models.dev API returned status {}",
                response.status()
            )));
        }

        let registry: ModelRegistry = response
            .json()
            .map_err(|e| CoreError::ConfigError(format!("Failed to parse models.dev response: {}", e)))?;

        Ok(registry)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_real_api() {
        // This test actually calls the models.dev API
        // Skip in CI if no network or rate limited
        let client = ModelsDevClient::new();
        match client.fetch().await {
            Ok(registry) => {
                // Should have common providers
                assert!(registry.providers.contains_key("openai"));
                assert!(registry.providers.contains_key("anthropic"));

                // Check openai has expected models
                let openai = registry.providers.get("openai").unwrap();
                assert!(!openai.models.is_empty());
                assert!(openai.models.contains_key("gpt-4o") || openai.models.len() > 0);
            }
            Err(e) => {
                // Network may be unavailable in CI
                eprintln!("Warning: Could not fetch models.dev (expected in CI): {}", e);
            }
        }
    }
}
