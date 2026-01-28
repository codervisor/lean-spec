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

pub struct ProviderSelection {
    pub provider_id: String,
    pub model_id: String,
    pub model_max_tokens: Option<u32>,
    pub provider: ProviderClient,
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

    let provider_client = build_provider(provider, &api_key)?;

    Ok(ProviderSelection {
        provider_id: provider.id.clone(),
        model_id: model.id.clone(),
        model_max_tokens: model.max_tokens,
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
            let mut config = OpenAIConfig::new().with_api_key(api_key.to_string());
            if let Some(base_url) = provider.base_url.clone() {
                if !base_url.is_empty() {
                    config = config.with_api_base(base_url);
                }
            }
            Ok(ProviderClient::OpenRouter(OpenAIClient::with_config(
                config,
            )))
        }
        other => Err(AiError::InvalidProvider(other.to_string())),
    }
}
