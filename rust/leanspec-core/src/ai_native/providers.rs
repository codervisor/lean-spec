//! Provider factory for native Rust AI clients

use async_openai::config::OpenAIConfig;
use async_openai::Client as OpenAIClient;

use crate::ai_native::error::AiError;
use crate::storage::chat_config::{ChatConfig, ChatProvider};

#[derive(Debug)]
pub enum ProviderClient {
    OpenAI(OpenAIClient<OpenAIConfig>),
    Anthropic(anthropic::client::Client),
    OpenRouter(OpenAIClient<OpenAIConfig>),
}

impl ProviderClient {
    pub fn name(&self) -> &'static str {
        match self {
            ProviderClient::OpenAI(_) => "openai",
            ProviderClient::Anthropic(_) => "anthropic",
            ProviderClient::OpenRouter(_) => "openrouter",
        }
    }
}

fn resolve_api_key(template: &str) -> String {
    if let Some(start) = template.find("${") {
        if let Some(end) = template[start..].find('}') {
            let key = &template[start + 2..start + end];
            return std::env::var(key).unwrap_or_default();
        }
    }

    template.to_string()
}

#[derive(Debug)]
pub struct ProviderSelection {
    pub provider_id: String,
    pub model_id: String,
    pub model_max_tokens: Option<u32>,
    pub use_openai_compat: bool,
    pub provider_base_url: Option<String>,
    pub provider: ProviderClient,
}

fn use_openai_compat(provider_id: &str, base_url: &Option<String>) -> bool {
    if provider_id == "openrouter" {
        return true;
    }

    if provider_id != "openai" {
        return false;
    }

    base_url
        .as_ref()
        .map(|url| !url.contains("openai.com"))
        .unwrap_or(false)
}

pub fn select_provider(
    config: &ChatConfig,
    provider_id: &str,
    model_id: &str,
) -> Result<ProviderSelection, AiError> {
    let provider = config
        .providers
        .iter()
        .find(|p| p.id == provider_id)
        .ok_or_else(|| AiError::InvalidProvider(provider_id.to_string()))?;

    let model = provider
        .models
        .iter()
        .find(|m| m.id == model_id)
        .ok_or_else(|| AiError::InvalidModel(model_id.to_string()))?;

    let api_key = resolve_api_key(&provider.api_key);
    if api_key.is_empty() {
        return Err(AiError::MissingApiKey(provider.name.clone()));
    }

    let provider_base_url = provider.base_url.clone();
    let provider_client = build_provider(provider, &api_key)?;
    let use_openai_compat = use_openai_compat(&provider.id, &provider_base_url);

    Ok(ProviderSelection {
        provider_id: provider.id.clone(),
        model_id: model.id.clone(),
        model_max_tokens: model.max_tokens,
        use_openai_compat,
        provider_base_url,
        provider: provider_client,
    })
}

fn build_provider(provider: &ChatProvider, api_key: &str) -> Result<ProviderClient, AiError> {
    match provider.id.as_str() {
        "openai" => {
            let mut config = OpenAIConfig::new().with_api_key(api_key.to_string());
            if let Some(base_url) = provider.base_url.clone() {
                if !base_url.is_empty() {
                    config = config.with_api_base(base_url);
                }
            }
            Ok(ProviderClient::OpenAI(OpenAIClient::with_config(config)))
        }
        "anthropic" => {
            let mut builder = anthropic::client::ClientBuilder::default();
            builder.api_key(api_key.to_string());
            if let Some(base_url) = provider.base_url.clone() {
                if !base_url.is_empty() {
                    builder.api_base(base_url);
                }
            }
            Ok(ProviderClient::Anthropic(
                builder
                    .build()
                    .map_err(|e| AiError::Provider(e.to_string()))?,
            ))
        }
        "openrouter" => {
            // OpenRouter requires its specific base URL - use configured or default
            let base_url = provider
                .base_url
                .clone()
                .filter(|u| !u.is_empty())
                .unwrap_or_else(|| "https://openrouter.ai/api/v1".to_string());
            let config = OpenAIConfig::new()
                .with_api_key(api_key.to_string())
                .with_api_base(base_url);
            Ok(ProviderClient::OpenRouter(OpenAIClient::with_config(
                config,
            )))
        }
        other => Err(AiError::InvalidProvider(other.to_string())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::chat_config::{ChatConfig, ChatModel, ChatProvider, ChatSettings};

    fn create_test_config() -> ChatConfig {
        ChatConfig {
            version: "1.0".to_string(),
            settings: ChatSettings {
                default_provider_id: "openai".to_string(),
                default_model_id: "gpt-4o".to_string(),
                max_steps: 5,
                enabled_models: None,
            },
            providers: vec![
                ChatProvider {
                    id: "openai".to_string(),
                    name: "OpenAI".to_string(),
                    api_key: "${OPENAI_API_KEY}".to_string(),
                    base_url: Some("https://api.openai.com/v1".to_string()),
                    models: vec![ChatModel {
                        id: "gpt-4o".to_string(),
                        name: "GPT-4o".to_string(),
                        max_tokens: Some(4096),
                        default: Some(true),
                    }],
                },
                ChatProvider {
                    id: "anthropic".to_string(),
                    name: "Anthropic".to_string(),
                    api_key: "${ANTHROPIC_API_KEY}".to_string(),
                    base_url: Some("https://api.anthropic.com".to_string()),
                    models: vec![ChatModel {
                        id: "claude-3-sonnet".to_string(),
                        name: "Claude 3 Sonnet".to_string(),
                        max_tokens: Some(4096),
                        default: Some(true),
                    }],
                },
            ],
        }
    }

    #[test]
    fn test_provider_client_name() {
        let openai = ProviderClient::OpenAI(async_openai::Client::new());
        assert_eq!(openai.name(), "openai");

        let anthropic = ProviderClient::Anthropic(
            anthropic::client::ClientBuilder::default()
                .api_key("test".to_string())
                .build()
                .unwrap(),
        );
        assert_eq!(anthropic.name(), "anthropic");

        let openrouter = ProviderClient::OpenRouter(async_openai::Client::new());
        assert_eq!(openrouter.name(), "openrouter");
    }

    #[test]
    fn test_resolve_api_key_with_env_var() {
        std::env::set_var("TEST_API_KEY", "secret123");
        let result = resolve_api_key("${TEST_API_KEY}");
        assert_eq!(result, "secret123");
    }

    #[test]
    fn test_resolve_api_key_literal() {
        let result = resolve_api_key("literal_key");
        assert_eq!(result, "literal_key");
    }

    #[test]
    fn test_resolve_api_key_missing_braces() {
        let result = resolve_api_key("$MISSING_BRACES");
        assert_eq!(result, "$MISSING_BRACES");
    }

    #[test]
    fn test_select_provider_success() {
        let config = create_test_config();
        std::env::set_var("OPENAI_API_KEY", "test_key");

        let result = select_provider(&config, "openai", "gpt-4o");
        assert!(result.is_ok());

        let selection = result.unwrap();
        assert_eq!(selection.provider_id, "openai");
        assert_eq!(selection.model_id, "gpt-4o");
        assert_eq!(selection.model_max_tokens, Some(4096));
    }

    #[test]
    fn test_select_provider_invalid_provider() {
        let config = create_test_config();
        let result = select_provider(&config, "invalid", "gpt-4o");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AiError::InvalidProvider(_)));
    }

    #[test]
    fn test_select_provider_invalid_model() {
        let config = create_test_config();
        std::env::set_var("OPENAI_API_KEY", "test_key");

        let result = select_provider(&config, "openai", "invalid-model");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AiError::InvalidModel(_)));
    }

    #[test]
    fn test_select_provider_missing_api_key() {
        let config = create_test_config();
        std::env::remove_var("ANTHROPIC_API_KEY");

        let result = select_provider(&config, "anthropic", "claude-3-sonnet");
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), AiError::MissingApiKey(_)));
    }
}
