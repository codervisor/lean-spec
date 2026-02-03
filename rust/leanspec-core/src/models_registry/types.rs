//! Type definitions for models.dev registry data

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// The complete models.dev registry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelRegistry {
    /// Map of provider_id -> Provider
    #[serde(flatten)]
    pub providers: HashMap<String, Provider>,
}

/// A model provider (e.g., OpenAI, Anthropic)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    /// Provider ID (e.g., "openai")
    pub id: String,

    /// Display name (e.g., "OpenAI")
    pub name: String,

    /// Required environment variables for API authentication
    #[serde(default)]
    pub env: Vec<String>,

    /// npm package for AI SDK integration (e.g., "@ai-sdk/openai")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub npm: Option<String>,

    /// API base URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api: Option<String>,

    /// Documentation URL
    #[serde(skip_serializing_if = "Option::is_none")]
    pub doc: Option<String>,

    /// Available models for this provider
    #[serde(default)]
    pub models: HashMap<String, Model>,
}

/// A specific AI model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    /// Model ID (e.g., "gpt-4o")
    pub id: String,

    /// Display name (e.g., "GPT-4o")
    pub name: String,

    /// Model family (e.g., "gpt", "claude")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub family: Option<String>,

    /// Supports file/image attachments
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attachment: Option<bool>,

    /// Has reasoning/thinking capability (e.g., o1, DeepSeek R1)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<bool>,

    /// Supports tool/function calling
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call: Option<bool>,

    /// Supports structured output (JSON mode)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub structured_output: Option<bool>,

    /// Supports temperature adjustment
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<bool>,

    /// Knowledge cutoff date (e.g., "2024-04")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub knowledge: Option<String>,

    /// Release date
    #[serde(skip_serializing_if = "Option::is_none")]
    pub release_date: Option<String>,

    /// Last update date
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_updated: Option<String>,

    /// Input/output modalities
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modalities: Option<ModelModalities>,

    /// Whether weights are open source
    #[serde(skip_serializing_if = "Option::is_none")]
    pub open_weights: Option<bool>,

    /// Cost information (per million tokens)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost: Option<ModelCost>,

    /// Context and output limits
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<ModelLimits>,
}

/// Model input/output modalities
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelModalities {
    /// Supported input types (e.g., ["text", "image", "audio"])
    #[serde(default)]
    pub input: Vec<String>,

    /// Supported output types (e.g., ["text", "image"])
    #[serde(default)]
    pub output: Vec<String>,
}

/// Model cost information (per million tokens)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCost {
    /// Cost per million input tokens (USD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub input: Option<f64>,

    /// Cost per million output tokens (USD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<f64>,

    /// Cost per million cached read tokens (USD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_read: Option<f64>,

    /// Cost per million cached write tokens (USD)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cache_write: Option<f64>,
}

/// Model context and output limits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelLimits {
    /// Maximum context window size (tokens)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<u64>,

    /// Maximum output tokens
    #[serde(skip_serializing_if = "Option::is_none")]
    pub output: Option<u64>,
}

/// Provider with availability status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderWithAvailability {
    /// The provider details
    #[serde(flatten)]
    pub provider: Provider,

    /// Whether API key is configured
    pub is_configured: bool,

    /// Which env vars are configured
    pub configured_env_vars: Vec<String>,
}

impl Model {
    /// Check if model supports agentic use (tool calling)
    pub fn supports_agentic(&self) -> bool {
        self.tool_call.unwrap_or(false)
    }

    /// Check if model supports reasoning/thinking
    pub fn supports_reasoning(&self) -> bool {
        self.reasoning.unwrap_or(false)
    }

    /// Check if model supports vision (image input)
    pub fn supports_vision(&self) -> bool {
        self.modalities
            .as_ref()
            .map(|m| m.input.contains(&"image".to_string()))
            .unwrap_or(false)
    }

    /// Get context window size
    pub fn context_window(&self) -> Option<u64> {
        self.limit.as_ref().and_then(|l| l.context)
    }

    /// Get max output tokens
    pub fn max_output(&self) -> Option<u64> {
        self.limit.as_ref().and_then(|l| l.output)
    }
}

impl Provider {
    /// Get all models that support tool calling
    pub fn agentic_models(&self) -> Vec<&Model> {
        self.models
            .values()
            .filter(|m| m.supports_agentic())
            .collect()
    }

    /// Get all models that support reasoning
    pub fn reasoning_models(&self) -> Vec<&Model> {
        self.models
            .values()
            .filter(|m| m.supports_reasoning())
            .collect()
    }

    /// Get the default model (first agentic model, or first model)
    pub fn default_model(&self) -> Option<&Model> {
        // Prefer agentic models
        if let Some(m) = self.agentic_models().into_iter().next() {
            return Some(m);
        }
        // Fall back to any model
        self.models.values().next()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_model() -> Model {
        Model {
            id: "gpt-4o".to_string(),
            name: "GPT-4o".to_string(),
            family: Some("gpt".to_string()),
            attachment: Some(true),
            reasoning: Some(false),
            tool_call: Some(true),
            structured_output: Some(true),
            temperature: Some(true),
            knowledge: Some("2024-04".to_string()),
            release_date: Some("2024-05-13".to_string()),
            last_updated: Some("2024-05-13".to_string()),
            modalities: Some(ModelModalities {
                input: vec!["text".to_string(), "image".to_string()],
                output: vec!["text".to_string()],
            }),
            open_weights: Some(false),
            cost: Some(ModelCost {
                input: Some(2.5),
                output: Some(10.0),
                cache_read: None,
                cache_write: None,
            }),
            limit: Some(ModelLimits {
                context: Some(128000),
                output: Some(16384),
            }),
        }
    }

    #[test]
    fn test_model_capabilities() {
        let model = sample_model();
        assert!(model.supports_agentic());
        assert!(!model.supports_reasoning());
        assert!(model.supports_vision());
        assert_eq!(model.context_window(), Some(128000));
        assert_eq!(model.max_output(), Some(16384));
    }

    #[test]
    fn test_model_serde() {
        let model = sample_model();
        let json = serde_json::to_string(&model).unwrap();
        let parsed: Model = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, model.id);
        assert_eq!(parsed.tool_call, model.tool_call);
    }
}
