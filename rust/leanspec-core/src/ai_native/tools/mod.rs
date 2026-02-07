//! LeanSpec AI tools (native)
//!
//! Tool names and schemas mirror the MCP server tools exactly.
//! The AI chat uses HTTP API calls while MCP operates on the filesystem directly.
//! `run_subagent` is the only AI-chat-specific tool.

mod helpers;
pub mod inputs;
mod registry;

use std::collections::HashMap;
use std::sync::Arc;

use async_openai::types::chat::ChatCompletionTools;
use serde_json::Value;

use crate::ai_native::error::AiError;
use crate::ai_native::runner_config::ResolvedRunnerConfig;

type ToolExecutor = Arc<dyn Fn(Value) -> Result<String, String> + Send + Sync + 'static>;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct ToolRegistry {
    tools: Vec<ChatCompletionTools>,
    executors: Arc<HashMap<String, ToolExecutor>>,
}

impl ToolRegistry {
    pub(crate) fn new(
        tools: Vec<ChatCompletionTools>,
        executors: HashMap<String, ToolExecutor>,
    ) -> Self {
        Self {
            tools,
            executors: Arc::new(executors),
        }
    }

    pub fn tools(&self) -> &[ChatCompletionTools] {
        &self.tools
    }

    pub fn execute(&self, name: &str, input: Value) -> Result<String, AiError> {
        if name.trim().is_empty() {
            return Err(AiError::Tool(
                "Tool call received with empty name".to_string(),
            ));
        }
        let available: Vec<&str> = self.executors.keys().map(|k| k.as_str()).collect();
        let executor = self.executors.get(name).ok_or_else(|| {
            AiError::Tool(format!(
                "Unknown tool: '{}'. Available tools: {}",
                name,
                available.join(", ")
            ))
        })?;
        executor(input).map_err(|e| AiError::ToolExecution {
            tool_name: name.to_string(),
            message: e,
        })
    }
}

#[derive(Debug, Clone)]
pub struct ToolContext {
    pub base_url: String,
    pub project_id: Option<String>,
    pub project_path: Option<String>,
    pub runner_config: Option<ResolvedRunnerConfig>,
}

pub use registry::build_tools;

#[cfg(test)]
mod tests {
    use super::helpers::*;
    use super::inputs::*;
    use super::*;

    use schemars::schema_for;

    #[test]
    fn test_normalize_base_url() {
        assert_eq!(
            normalize_base_url("http://localhost:3000"),
            "http://localhost:3000"
        );
        assert_eq!(
            normalize_base_url("http://localhost:3000/"),
            "http://localhost:3000"
        );
        assert_eq!(
            normalize_base_url("http://localhost:3000//"),
            "http://localhost:3000"
        );
    }

    #[test]
    fn test_ensure_project_id_with_input() {
        let result = ensure_project_id(
            Some("my-project".to_string()),
            &Some("fallback".to_string()),
        );
        assert_eq!(result.unwrap(), "my-project");
    }

    #[test]
    fn test_ensure_project_id_with_fallback() {
        let result = ensure_project_id(None, &Some("fallback".to_string()));
        assert_eq!(result.unwrap(), "fallback");
    }

    #[test]
    fn test_ensure_project_id_missing() {
        let result = ensure_project_id(None, &None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("projectId is required"));
    }

    #[test]
    fn test_tool_input_parsing() {
        let value = serde_json::json!({ "projectId": "test", "specPath": "123" });
        let result: Result<ViewInput, _> = tool_input(value);
        assert!(result.is_ok());
        let input = result.unwrap();
        assert_eq!(input.spec_path, "123");
    }

    #[test]
    fn test_tool_registry_empty() {
        let registry = ToolRegistry::new(vec![], HashMap::new());
        assert!(registry.tools().is_empty());
    }

    #[test]
    fn test_build_tools_produces_11_tools() {
        let context = ToolContext {
            base_url: "http://localhost:3000".to_string(),
            project_id: None,
            project_path: None,
            runner_config: None,
        };
        let registry = build_tools(context);
        assert!(registry.is_ok());
        let reg = registry.unwrap();
        // 10 MCP-aligned tools + 1 AI-chat-only (run_subagent) = 11
        assert_eq!(reg.tools().len(), 11);
    }

    #[test]
    fn test_tool_names_match_mcp() {
        let context = ToolContext {
            base_url: "http://localhost:3000".to_string(),
            project_id: None,
            project_path: None,
            runner_config: None,
        };
        let reg = build_tools(context).unwrap();

        let tool_names: Vec<String> = reg
            .tools()
            .iter()
            .filter_map(|t| match t {
                ChatCompletionTools::Function(f) => Some(f.function.name.clone()),
                _ => None,
            })
            .collect();

        // MCP tools
        assert!(tool_names.contains(&"list".to_string()));
        assert!(tool_names.contains(&"view".to_string()));
        assert!(tool_names.contains(&"create".to_string()));
        assert!(tool_names.contains(&"update".to_string()));
        assert!(tool_names.contains(&"search".to_string()));
        assert!(tool_names.contains(&"validate".to_string()));
        assert!(tool_names.contains(&"tokens".to_string()));
        assert!(tool_names.contains(&"board".to_string()));
        assert!(tool_names.contains(&"stats".to_string()));
        assert!(tool_names.contains(&"relationships".to_string()));
        // AI-chat only
        assert!(tool_names.contains(&"run_subagent".to_string()));
    }

    #[test]
    fn test_list_input_schema() {
        let schema = schema_for!(ListInput);
        let schema_json = serde_json::to_value(&schema).unwrap();
        assert!(schema_json.get("properties").is_some());
    }

    #[test]
    fn test_update_input_schema() {
        let schema = schema_for!(UpdateInput);
        let schema_json = serde_json::to_value(&schema).unwrap();
        let props = schema_json.get("properties").unwrap();
        assert!(props.get("specPath").is_some());
        assert!(props.get("status").is_some());
        assert!(props.get("replacements").is_some());
        assert!(props.get("sectionUpdates").is_some());
        assert!(props.get("checklistToggles").is_some());
    }

    #[test]
    fn test_relationships_input_schema() {
        let schema = schema_for!(RelationshipsInput);
        let schema_json = serde_json::to_value(&schema).unwrap();
        let props = schema_json.get("properties").unwrap();
        assert!(props.get("specPath").is_some());
        assert!(props.get("action").is_some());
        assert!(props.get("type").is_some());
        assert!(props.get("target").is_some());
    }

    #[test]
    fn test_parse_replacements() {
        let inputs = vec![
            ReplacementInput {
                old_string: "foo".to_string(),
                new_string: "bar".to_string(),
                match_mode: Some("unique".to_string()),
            },
            ReplacementInput {
                old_string: "baz".to_string(),
                new_string: "qux".to_string(),
                match_mode: None,
            },
        ];
        let result = parse_replacements(&inputs);
        assert!(result.is_ok());
        let repls = result.unwrap();
        assert_eq!(repls.len(), 2);
    }

    #[test]
    fn test_parse_section_updates() {
        let inputs = vec![SectionUpdateInput {
            section: "Plan".to_string(),
            content: "New plan content".to_string(),
            mode: Some("append".to_string()),
        }];
        let result = parse_section_updates(&inputs);
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_checklist_toggles() {
        let inputs = vec![ChecklistToggleInput {
            item_text: "Task 1".to_string(),
            checked: true,
        }];
        let result = parse_checklist_toggles(&inputs);
        assert_eq!(result.len(), 1);
        assert!(result[0].checked);
    }
}
