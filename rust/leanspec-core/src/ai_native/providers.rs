//! Provider factory for aisdk

use crate::ai_native::error::AiError;
use crate::storage::chat_config::{ChatConfig, ChatProvider};
use aisdk::core::DynamicModel;
use aisdk::providers::{Anthropic, OpenAI, OpenRouter};

#[derive(Debug, Clone)]
pub enum ProviderClient {
    OpenAI(OpenAI<DynamicModel>),
    Anthropic(Anthropic<DynamicModel>),
    OpenRouter(OpenRouter<DynamicModel>),
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

    let provider_client = build_provider(provider, model.id.as_str(), &api_key)?;

    Ok(ProviderSelection {
        provider_id: provider.id.clone(),
        model_id: model.id.clone(),
        provider: provider_client,
    })
}

fn build_provider(
    provider: &ChatProvider,
    model_id: &str,
    api_key: &str,
) -> Result<ProviderClient, AiError> {
    match provider.id.as_str() {
        "openai" => {
            let mut builder = OpenAI::<DynamicModel>::builder()
                .model_name(model_id)
                .api_key(api_key);
            if let Some(base_url) = provider.base_url.clone() {
                if !base_url.is_empty() {
                    builder = builder.base_url(base_url);
                }
            }
            Ok(ProviderClient::OpenAI(
                builder
                    .build()
                    .map_err(|e| AiError::Provider(e.to_string()))?,
            ))
        }
        "anthropic" => {
            let mut builder = Anthropic::<DynamicModel>::builder()
                .model_name(model_id)
                .api_key(api_key);
            if let Some(base_url) = provider.base_url.clone() {
                if !base_url.is_empty() {
                    builder = builder.base_url(base_url);
                }
            }
            Ok(ProviderClient::Anthropic(
                builder
                    .build()
                    .map_err(|e| AiError::Provider(e.to_string()))?,
            ))
        }
        "openrouter" => {
            let mut builder = OpenRouter::<DynamicModel>::builder()
                .model_name(model_id)
                .api_key(api_key);
            let base_url = provider
                .base_url
                .clone()
                .unwrap_or_else(|| "https://openrouter.ai/api/v1".to_string());
            builder = builder.base_url(base_url);
            Ok(ProviderClient::OpenRouter(
                builder
                    .build()
                    .map_err(|e| AiError::Provider(e.to_string()))?,
            ))
        }
        other => Err(AiError::InvalidProvider(other.to_string())),
    }
}
