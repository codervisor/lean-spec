use crate::error::ServerError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConfig {
    pub version: String,
    pub providers: Vec<ChatProvider>,
    pub settings: ChatSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSettings {
    pub max_steps: u32,
    pub default_provider_id: String,
    pub default_model_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatProvider {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    pub api_key: String,
    pub models: Vec<ChatModel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatModel {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConfigUpdate {
    pub version: String,
    pub providers: Vec<ChatProviderUpdate>,
    pub settings: ChatSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatProviderUpdate {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
    pub models: Vec<ChatModel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_api_key: Option<bool>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConfigClient {
    pub version: String,
    pub providers: Vec<ChatProviderClient>,
    pub settings: ChatSettings,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatProviderClient {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    pub models: Vec<ChatModel>,
    pub has_api_key: bool,
}

#[derive(Debug)]
pub struct ChatConfigStore {
    config: ChatConfig,
    path: PathBuf,
}

impl ChatConfigStore {
    pub fn load_default() -> Result<Self, ServerError> {
        let path = resolve_chat_config_path()?;
        let config = load_chat_config(&path).unwrap_or_else(|err| {
            tracing::warn!("Failed to load chat config: {}. Using defaults.", err);
            default_chat_config()
        });

        Ok(Self { config, path })
    }

    pub fn config(&self) -> ChatConfig {
        self.config.clone()
    }

    pub fn client_config(&self) -> ChatConfigClient {
        ChatConfigClient {
            version: self.config.version.clone(),
            settings: self.config.settings.clone(),
            providers: self
                .config
                .providers
                .iter()
                .map(|provider| ChatProviderClient {
                    id: provider.id.clone(),
                    name: provider.name.clone(),
                    base_url: provider.base_url.clone(),
                    models: provider.models.clone(),
                    has_api_key: !resolve_api_key(&provider.api_key).is_empty(),
                })
                .collect(),
        }
    }

    pub fn update(&mut self, update: ChatConfigUpdate) -> Result<(), ServerError> {
        if update.settings.max_steps < 1 || update.settings.max_steps > 50 {
            return Err(ServerError::ConfigError(
                "maxSteps must be between 1 and 50".to_string(),
            ));
        }

        let existing: HashMap<String, ChatProvider> = self
            .config
            .providers
            .iter()
            .cloned()
            .map(|provider| (provider.id.clone(), provider))
            .collect();

        let merged_providers = update
            .providers
            .into_iter()
            .map(|provider| {
                let existing_provider = existing.get(&provider.id);
                ChatProvider {
                    id: provider.id,
                    name: provider.name,
                    base_url: provider.base_url,
                    api_key: provider
                        .api_key
                        .or_else(|| existing_provider.map(|p| p.api_key.clone()))
                        .unwrap_or_default(),
                    models: provider.models,
                }
            })
            .collect::<Vec<_>>();

        self.config = ChatConfig {
            version: update.version,
            providers: merged_providers,
            settings: update.settings,
        };

        save_chat_config(&self.path, &self.config)?;
        Ok(())
    }
}

fn resolve_chat_config_path() -> Result<PathBuf, ServerError> {
    if let Some(home) = dirs::home_dir() {
        return Ok(home.join(".leanspec").join("chat-config.json"));
    }

    Err(ServerError::ConfigError(
        "Unable to resolve chat config path".to_string(),
    ))
}

fn load_chat_config(path: &PathBuf) -> Result<ChatConfig, ServerError> {
    if path.exists() {
        let content = std::fs::read_to_string(path)
            .map_err(|e| ServerError::ConfigError(e.to_string()))?;
        let config: ChatConfig = serde_json::from_str(&content)
            .map_err(|e| ServerError::ConfigError(e.to_string()))?;
        return Ok(config);
    }

    Ok(default_chat_config())
}

fn save_chat_config(path: &PathBuf, config: &ChatConfig) -> Result<(), ServerError> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| ServerError::ConfigError(e.to_string()))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| ServerError::ConfigError(e.to_string()))?;
    std::fs::write(path, content).map_err(|e| ServerError::ConfigError(e.to_string()))?;

    Ok(())
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

fn default_chat_config() -> ChatConfig {
    ChatConfig {
        version: "1.0".to_string(),
        providers: vec![
            ChatProvider {
                id: "openai".to_string(),
                name: "OpenAI".to_string(),
                base_url: None,
                api_key: "${OPENAI_API_KEY}".to_string(),
                models: vec![
                    ChatModel {
                        id: "gpt-4o".to_string(),
                        name: "GPT-4o".to_string(),
                        max_tokens: Some(128000),
                        default: Some(true),
                    },
                    ChatModel {
                        id: "gpt-4o-mini".to_string(),
                        name: "GPT-4o Mini".to_string(),
                        max_tokens: Some(128000),
                        default: None,
                    },
                ],
            },
            ChatProvider {
                id: "anthropic".to_string(),
                name: "Anthropic".to_string(),
                base_url: None,
                api_key: "${ANTHROPIC_API_KEY}".to_string(),
                models: vec![ChatModel {
                    id: "claude-sonnet-4-5".to_string(),
                    name: "Claude Sonnet 4.5".to_string(),
                    max_tokens: Some(200000),
                    default: None,
                }],
            },
            ChatProvider {
                id: "deepseek".to_string(),
                name: "Deepseek".to_string(),
                base_url: Some("https://api.deepseek.com/v1".to_string()),
                api_key: "${DEEPSEEK_API_KEY}".to_string(),
                models: vec![ChatModel {
                    id: "deepseek-reasoner".to_string(),
                    name: "Deepseek R1".to_string(),
                    max_tokens: Some(64000),
                    default: None,
                }],
            },
            ChatProvider {
                id: "openrouter".to_string(),
                name: "OpenRouter".to_string(),
                base_url: Some("https://openrouter.ai/api/v1".to_string()),
                api_key: "${OPENROUTER_API_KEY}".to_string(),
                models: vec![ChatModel {
                    id: "google/gemini-2.0-flash-thinking-exp:free".to_string(),
                    name: "Gemini 2.0 Flash (Free)".to_string(),
                    max_tokens: Some(32000),
                    default: None,
                }],
            },
        ],
        settings: ChatSettings {
            max_steps: 10,
            default_provider_id: "openai".to_string(),
            default_model_id: "gpt-4o".to_string(),
        },
    }
}
