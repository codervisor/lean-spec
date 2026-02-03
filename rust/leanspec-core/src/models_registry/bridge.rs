//! Bridge between ModelRegistry and ChatConfig
//!
//! Converts models.dev registry data to the ChatConfig format used by the chat system.

use crate::models_registry::types::{Model, ModelRegistry, Provider};
use crate::storage::chat_config::{ChatConfig, ChatModel, ChatProvider, ChatSettings};
use std::collections::HashMap;

/// Priority ordering for providers (lower = higher priority)
const PROVIDER_PRIORITY: &[&str] = &[
    "anthropic",
    "openai",
    "deepseek",
    "google",
    "mistral",
    "groq",
    "openrouter",
    "fireworks-ai",
    "togetherai",
    "cohere",
    "xai",
    "perplexity",
];

/// Environment variable mappings for API keys
fn get_api_key_env_var(provider_id: &str) -> String {
    match provider_id {
        "openai" => "${OPENAI_API_KEY}".to_string(),
        "anthropic" => "${ANTHROPIC_API_KEY}".to_string(),
        "deepseek" => "${DEEPSEEK_API_KEY}".to_string(),
        "google" => "${GOOGLE_GENERATIVE_AI_API_KEY}".to_string(),
        "google-vertex" => "${GOOGLE_VERTEX_API_KEY}".to_string(),
        "openrouter" => "${OPENROUTER_API_KEY}".to_string(),
        "groq" => "${GROQ_API_KEY}".to_string(),
        "fireworks-ai" => "${FIREWORKS_API_KEY}".to_string(),
        "mistral" => "${MISTRAL_API_KEY}".to_string(),
        "cohere" => "${COHERE_API_KEY}".to_string(),
        "togetherai" => "${TOGETHER_API_KEY}".to_string(),
        "perplexity" => "${PERPLEXITY_API_KEY}".to_string(),
        "xai" => "${XAI_API_KEY}".to_string(),
        "azure" => "${AZURE_OPENAI_API_KEY}".to_string(),
        _ => format!(
            "${{{}_API_KEY}}",
            provider_id.to_uppercase().replace('-', "_")
        ),
    }
}

/// Convert a models.dev Model to ChatModel
fn model_to_chat_model(model: &Model, is_default: bool) -> ChatModel {
    ChatModel {
        id: model.id.clone(),
        name: model.name.clone(),
        max_tokens: model
            .limit
            .as_ref()
            .and_then(|l| l.output.map(|o| o as u32)),
        default: if is_default { Some(true) } else { None },
    }
}

/// Convert a models.dev Provider to ChatProvider
fn provider_to_chat_provider(provider: &Provider) -> ChatProvider {
    // Filter to models that support tool calling (for agentic use)
    let agentic_models: Vec<&Model> = provider
        .models
        .values()
        .filter(|m| m.tool_call.unwrap_or(false))
        .collect();

    // Sort by context window size (larger = better for complex tasks)
    let mut sorted_models = agentic_models.clone();
    sorted_models.sort_by(|a, b| {
        let a_ctx = a.context_window().unwrap_or(0);
        let b_ctx = b.context_window().unwrap_or(0);
        b_ctx.cmp(&a_ctx)
    });

    // Convert models, marking first as default
    let chat_models: Vec<ChatModel> = sorted_models
        .iter()
        .enumerate()
        .map(|(i, m)| model_to_chat_model(m, i == 0))
        .collect();

    ChatProvider {
        id: provider.id.clone(),
        name: provider.name.clone(),
        base_url: provider.api.clone(),
        api_key: get_api_key_env_var(&provider.id),
        models: chat_models,
    }
}

/// Convert ModelRegistry to ChatConfig
pub fn registry_to_chat_config(registry: &ModelRegistry) -> ChatConfig {
    // Sort providers by priority
    let mut providers: Vec<(&String, &Provider)> = registry.providers.iter().collect();
    providers.sort_by(|(a_id, _), (b_id, _)| {
        let a_priority = PROVIDER_PRIORITY
            .iter()
            .position(|p| p == a_id)
            .unwrap_or(100);
        let b_priority = PROVIDER_PRIORITY
            .iter()
            .position(|p| p == b_id)
            .unwrap_or(100);
        a_priority.cmp(&b_priority)
    });

    // Convert to ChatProviders
    let chat_providers: Vec<ChatProvider> = providers
        .into_iter()
        .map(|(_, p)| provider_to_chat_provider(p))
        .filter(|p| !p.models.is_empty()) // Only include providers with agentic models
        .collect();

    // Determine default provider and model
    let (default_provider_id, default_model_id) = chat_providers
        .first()
        .map(|p| {
            let default_model = p
                .models
                .iter()
                .find(|m| m.default == Some(true))
                .or(p.models.first());
            (
                p.id.clone(),
                default_model.map(|m| m.id.clone()).unwrap_or_default(),
            )
        })
        .unwrap_or(("openai".to_string(), "gpt-4o".to_string()));

    ChatConfig {
        version: "2.0".to_string(),
        providers: chat_providers,
        settings: ChatSettings {
            max_steps: 10,
            default_provider_id,
            default_model_id,
        },
    }
}

/// Build a ChatConfig from models.dev registry, filtered by configured API keys
pub fn build_chat_config_from_registry(registry: &ModelRegistry) -> ChatConfig {
    // Get list of configured providers
    let configured = crate::models_registry::get_configured_providers();

    // Filter registry to only configured providers
    let filtered_providers: HashMap<String, Provider> = registry
        .providers
        .iter()
        .filter(|(id, _)| configured.contains(id))
        .map(|(id, p)| (id.clone(), p.clone()))
        .collect();

    let filtered_registry = ModelRegistry {
        providers: filtered_providers,
    };

    registry_to_chat_config(&filtered_registry)
}

/// Merge user preferences into auto-generated config
pub fn merge_user_preferences(
    auto_config: ChatConfig,
    user_settings: Option<ChatSettings>,
    user_providers: Option<Vec<ChatProvider>>,
) -> ChatConfig {
    let settings = user_settings.unwrap_or(auto_config.settings);

    // If user has custom providers, merge them in
    let providers = if let Some(user_providers) = user_providers {
        let mut merged = auto_config.providers;
        for user_provider in user_providers {
            // User providers override auto-generated ones
            if let Some(existing) = merged.iter_mut().find(|p| p.id == user_provider.id) {
                *existing = user_provider;
            } else {
                merged.push(user_provider);
            }
        }
        merged
    } else {
        auto_config.providers
    };

    ChatConfig {
        version: auto_config.version,
        providers,
        settings,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models_registry::types::{ModelLimits, ModelModalities};

    fn sample_registry() -> ModelRegistry {
        let mut providers = HashMap::new();

        // OpenAI provider
        let mut openai_models = HashMap::new();
        openai_models.insert(
            "gpt-4o".to_string(),
            Model {
                id: "gpt-4o".to_string(),
                name: "GPT-4o".to_string(),
                family: Some("gpt".to_string()),
                attachment: Some(true),
                reasoning: Some(false),
                tool_call: Some(true),
                structured_output: Some(true),
                temperature: Some(true),
                knowledge: None,
                release_date: None,
                last_updated: None,
                modalities: Some(ModelModalities {
                    input: vec!["text".to_string(), "image".to_string()],
                    output: vec!["text".to_string()],
                }),
                open_weights: Some(false),
                cost: None,
                limit: Some(ModelLimits {
                    context: Some(128000),
                    output: Some(16384),
                }),
            },
        );
        openai_models.insert(
            "gpt-4o-mini".to_string(),
            Model {
                id: "gpt-4o-mini".to_string(),
                name: "GPT-4o Mini".to_string(),
                family: Some("gpt".to_string()),
                attachment: Some(true),
                reasoning: Some(false),
                tool_call: Some(true),
                structured_output: Some(true),
                temperature: Some(true),
                knowledge: None,
                release_date: None,
                last_updated: None,
                modalities: None,
                open_weights: Some(false),
                cost: None,
                limit: Some(ModelLimits {
                    context: Some(128000),
                    output: Some(4096),
                }),
            },
        );

        providers.insert(
            "openai".to_string(),
            Provider {
                id: "openai".to_string(),
                name: "OpenAI".to_string(),
                env: vec!["OPENAI_API_KEY".to_string()],
                npm: Some("@ai-sdk/openai".to_string()),
                api: None,
                doc: Some("https://platform.openai.com/docs/models".to_string()),
                models: openai_models,
            },
        );

        // Anthropic provider
        let mut anthropic_models = HashMap::new();
        anthropic_models.insert(
            "claude-3-5-sonnet".to_string(),
            Model {
                id: "claude-3-5-sonnet".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                family: Some("claude".to_string()),
                attachment: Some(true),
                reasoning: Some(true),
                tool_call: Some(true),
                structured_output: Some(true),
                temperature: Some(true),
                knowledge: None,
                release_date: None,
                last_updated: None,
                modalities: None,
                open_weights: Some(false),
                cost: None,
                limit: Some(ModelLimits {
                    context: Some(200000),
                    output: Some(8192),
                }),
            },
        );

        providers.insert(
            "anthropic".to_string(),
            Provider {
                id: "anthropic".to_string(),
                name: "Anthropic".to_string(),
                env: vec!["ANTHROPIC_API_KEY".to_string()],
                npm: Some("@ai-sdk/anthropic".to_string()),
                api: None,
                doc: None,
                models: anthropic_models,
            },
        );

        ModelRegistry { providers }
    }

    #[test]
    fn test_registry_to_chat_config() {
        let registry = sample_registry();
        let config = registry_to_chat_config(&registry);

        assert_eq!(config.version, "2.0");
        assert!(!config.providers.is_empty());

        // Anthropic should be first (highest priority)
        assert_eq!(config.providers[0].id, "anthropic");

        // OpenAI should be second
        assert_eq!(config.providers[1].id, "openai");
    }

    #[test]
    fn test_model_conversion() {
        let model = Model {
            id: "test-model".to_string(),
            name: "Test Model".to_string(),
            family: None,
            attachment: None,
            reasoning: None,
            tool_call: Some(true),
            structured_output: None,
            temperature: None,
            knowledge: None,
            release_date: None,
            last_updated: None,
            modalities: None,
            open_weights: None,
            cost: None,
            limit: Some(ModelLimits {
                context: Some(128000),
                output: Some(8192),
            }),
        };

        let chat_model = model_to_chat_model(&model, true);
        assert_eq!(chat_model.id, "test-model");
        assert_eq!(chat_model.name, "Test Model");
        assert_eq!(chat_model.max_tokens, Some(8192));
        assert_eq!(chat_model.default, Some(true));
    }

    #[test]
    fn test_api_key_env_var() {
        assert_eq!(get_api_key_env_var("openai"), "${OPENAI_API_KEY}");
        assert_eq!(get_api_key_env_var("anthropic"), "${ANTHROPIC_API_KEY}");
        assert_eq!(
            get_api_key_env_var("custom-provider"),
            "${CUSTOM_PROVIDER_API_KEY}"
        );
    }
}
