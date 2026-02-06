//! Validation tools (validate, tokens)

use leanspec_core::{SpecLoader, TokenCounter};
use serde_json::{json, Value};
use std::path::Path;

pub(crate) fn tool_validate(specs_dir: &str, args: Value) -> Result<String, String> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let fm_validator = leanspec_core::FrontmatterValidator::new();
    let struct_validator = leanspec_core::StructureValidator::new();
    let token_validator = leanspec_core::TokenCountValidator::new();

    let mut validation_errors = Vec::new();

    let specs_to_validate = if let Some(spec_path) = args.get("specPath").and_then(|v| v.as_str()) {
        let spec = loader
            .load(spec_path)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Spec not found: {}", spec_path))?;
        vec![spec]
    } else {
        specs.clone()
    };

    for spec in &specs_to_validate {
        let mut result = leanspec_core::ValidationResult::new(&spec.path);
        result.merge(fm_validator.validate(spec));
        result.merge(struct_validator.validate(spec));
        result.merge(token_validator.validate(spec));

        if result.has_errors() || result.has_warnings() {
            validation_errors.push(json!({
                "spec": spec.path,
                "errors": result.errors().map(|i| i.message.clone()).collect::<Vec<_>>(),
                "warnings": result.warnings().map(|i| i.message.clone()).collect::<Vec<_>>(),
            }));
        }
    }

    if validation_errors.is_empty() {
        Ok(format!(
            "All {} specs passed validation",
            specs_to_validate.len()
        ))
    } else {
        serde_json::to_string_pretty(&json!({
            "total": specs_to_validate.len(),
            "errors": validation_errors
        }))
        .map_err(|e| e.to_string())
    }
}

pub(crate) fn tool_tokens(specs_dir: &str, args: Value) -> Result<String, String> {
    let loader = SpecLoader::new(specs_dir);
    let counter = TokenCounter::new();

    // Check if filePath is provided (for generic files)
    if let Some(file_path) = args.get("filePath").and_then(|v| v.as_str()) {
        let path = Path::new(file_path);

        if !path.exists() {
            return Err(format!("File not found: {}", file_path));
        }

        if !path.is_file() {
            return Err(format!("Not a file: {}", file_path));
        }

        let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
        let result = counter.count_file(&content);

        return serde_json::to_string_pretty(&json!({
            "path": file_path,
            "total": result.total,
            "status": format!("{:?}", result.status),
        }))
        .map_err(|e| e.to_string());
    }

    // Otherwise, handle as spec (existing behavior)
    if let Some(spec_path) = args.get("specPath").and_then(|v| v.as_str()) {
        let spec = loader
            .load(spec_path)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

        let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;
        let result = counter.count_spec(&content);

        Ok(serde_json::to_string_pretty(&json!({
            "spec": spec.path,
            "total": result.total,
            "frontmatter": result.frontmatter,
            "content": result.content,
            "status": format!("{:?}", result.status),
        }))
        .map_err(|e| e.to_string())?)
    } else {
        let specs = loader.load_all().map_err(|e| e.to_string())?;

        let results: Vec<_> = specs
            .iter()
            .filter_map(|spec| {
                let content = std::fs::read_to_string(&spec.file_path).ok()?;
                let result = counter.count_spec(&content);
                Some(json!({
                    "path": spec.path,
                    "title": spec.title,
                    "total": result.total,
                    "status": format!("{:?}", result.status),
                }))
            })
            .collect();

        let total_tokens: usize = results
            .iter()
            .filter_map(|r| r.get("total").and_then(|v| v.as_u64()))
            .map(|v| v as usize)
            .sum();

        Ok(serde_json::to_string_pretty(&json!({
            "count": results.len(),
            "totalTokens": total_tokens,
            "averageTokens": if results.is_empty() { 0 } else { total_tokens / results.len() },
            "specs": results,
        }))
        .map_err(|e| e.to_string())?)
    }
}

/// Get tool definitions for validation tools
pub(crate) fn get_definitions() -> Vec<crate::protocol::ToolDefinition> {
    use crate::protocol::ToolDefinition;

    vec![
        ToolDefinition {
            name: "validate".to_string(),
            description: "Validate specs for issues (frontmatter, structure, dependencies)"
                .to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Specific spec to validate (validates all if not provided)"
                    },
                    "checkDeps": {
                        "type": "boolean",
                        "description": "Check dependency alignment (defaults to false)"
                    }
                }
            }),
        },
        ToolDefinition {
            name: "tokens".to_string(),
            description: "Count tokens in spec(s) or any file for context economy".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Specific spec to count (counts all specs if not provided)"
                    },
                    "filePath": {
                        "type": "string",
                        "description": "Path to any file (markdown, code, text) to count tokens"
                    }
                }
            }),
        },
    ]
}
