//! Spec management tools (list, view, create, update, search)

use super::helpers::{
    create_content_description, get_next_spec_number, load_config, merge_frontmatter,
    resolve_project_root, resolve_template_variables, to_title_case,
};
use chrono::Utc;
use leanspec_core::{SpecLoader, TemplateLoader};
use serde_json::{json, Value};

pub(crate) fn tool_list(specs_dir: &str, args: Value) -> Result<String, String> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let status_filter = args.get("status").and_then(|v| v.as_str());
    let tags_filter: Option<Vec<&str>> = args
        .get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect());
    let priority_filter = args.get("priority").and_then(|v| v.as_str());

    let filtered: Vec<_> = specs
        .iter()
        .filter(|spec| {
            if let Some(status) = status_filter {
                if spec.frontmatter.status.to_string() != status {
                    return false;
                }
            }
            if let Some(ref tags) = tags_filter {
                if !tags
                    .iter()
                    .all(|t| spec.frontmatter.tags.contains(&t.to_string()))
                {
                    return false;
                }
            }
            if let Some(priority) = priority_filter {
                if spec.frontmatter.priority.map(|p| p.to_string()) != Some(priority.to_string()) {
                    return false;
                }
            }
            true
        })
        .collect();

    let output: Vec<_> = filtered
        .iter()
        .map(|s| {
            json!({
                "path": s.path,
                "title": s.title,
                "status": s.frontmatter.status.to_string(),
                "priority": s.frontmatter.priority.map(|p| p.to_string()),
                "tags": s.frontmatter.tags,
            })
        })
        .collect();

    serde_json::to_string_pretty(&json!({
        "count": filtered.len(),
        "specs": output
    }))
    .map_err(|e| e.to_string())
}

pub(crate) fn tool_view(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    let all_specs = loader.load_all().map_err(|e| e.to_string())?;
    let children: Vec<String> = all_specs
        .iter()
        .filter(|s| s.frontmatter.parent.as_deref() == Some(spec.path.as_str()))
        .map(|s| s.path.clone())
        .collect();
    let required_by: Vec<String> = all_specs
        .iter()
        .filter(|s| s.frontmatter.depends_on.contains(&spec.path))
        .map(|s| s.path.clone())
        .collect();

    let output = json!({
        "path": spec.path,
        "title": spec.title,
        "status": spec.frontmatter.status.to_string(),
        "created": spec.frontmatter.created,
        "priority": spec.frontmatter.priority.map(|p| p.to_string()),
        "tags": spec.frontmatter.tags,
        "depends_on": spec.frontmatter.depends_on,
        "assignee": spec.frontmatter.assignee,
        "parent": spec.frontmatter.parent,
        "children": children,
        "required_by": required_by,
        "content": spec.content,
    });

    serde_json::to_string_pretty(&output).map_err(|e| e.to_string())
}

pub(crate) fn tool_create(specs_dir: &str, args: Value) -> Result<String, String> {
    let name = args
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: name")?;

    let title_input = args.get("title").and_then(|v| v.as_str());
    let status = args
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("planned");
    let priority = args
        .get("priority")
        .and_then(|v| v.as_str())
        .or(Some("medium"));
    let template_name = args.get("template").and_then(|v| v.as_str());
    let content_override = args.get("content").and_then(|v| v.as_str());
    let tags: Vec<String> = args
        .get("tags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let next_number = get_next_spec_number(specs_dir)?;
    let spec_name = format!("{:03}-{}", next_number, name);

    let title = title_input
        .map(String::from)
        .unwrap_or_else(|| to_title_case(name));
    let now = Utc::now();
    let created_date = now.format("%Y-%m-%d").to_string();

    let base_content = if let Some(content) = content_override {
        content.to_string()
    } else {
        let project_root = resolve_project_root(specs_dir)?;
        let config = load_config(&project_root);
        let loader = TemplateLoader::with_config(&project_root, config);
        let template = loader
            .load(template_name)
            .map_err(|e| format!("Failed to load template: {}", e))?;
        resolve_template_variables(&template, &title, status, priority, &created_date)
    };

    let content = merge_frontmatter(
        &base_content,
        status,
        priority,
        &tags,
        &created_date,
        now,
        &title,
    )?;

    let spec_dir = std::path::Path::new(specs_dir).join(&spec_name);
    std::fs::create_dir_all(&spec_dir).map_err(|e| e.to_string())?;
    std::fs::write(spec_dir.join("README.md"), &content).map_err(|e| e.to_string())?;

    Ok(format!("Created spec: {}", spec_name))
}

pub(crate) fn tool_update(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    // Check for completion verification if changing status to complete
    let force = args.get("force").and_then(|v| v.as_bool()).unwrap_or(false);
    if let Some(new_status) = args.get("status").and_then(|v| v.as_str()) {
        if new_status == "complete" && !force {
            let spec_dir = std::path::Path::new(&spec.file_path)
                .parent()
                .ok_or("Invalid spec path")?;

            // Check checklist items
            let verification = leanspec_core::CompletionVerifier::verify_completion(spec_dir)
                .map_err(|e| e.to_string())?;

            if !verification.is_complete {
                let outstanding: Vec<_> = verification
                    .outstanding
                    .iter()
                    .map(|item| {
                        json!({
                            "section": item.section,
                            "line": item.line,
                            "text": item.text
                        })
                    })
                    .collect();

                return Err(serde_json::to_string_pretty(&json!({
                    "error": "INCOMPLETE_CHECKLIST",
                    "message": format!("Cannot mark spec complete: {} outstanding checklist items", verification.outstanding.len()),
                    "details": {
                        "outstanding": outstanding,
                        "progress": verification.progress.to_string(),
                        "suggestions": verification.suggestions
                    }
                })).map_err(|e| e.to_string())?);
            }

            // Check umbrella spec children
            let all_specs = loader.load_all().map_err(|e| e.to_string())?;
            let umbrella_verification =
                leanspec_core::CompletionVerifier::verify_umbrella_completion(
                    &spec.path, &all_specs,
                );

            if !umbrella_verification.is_complete {
                let incomplete_children: Vec<_> = umbrella_verification
                    .incomplete_children
                    .iter()
                    .map(|child| {
                        json!({
                            "path": child.path,
                            "title": child.title,
                            "status": child.status
                        })
                    })
                    .collect();

                return Err(serde_json::to_string_pretty(&json!({
                    "error": "INCOMPLETE_CHILDREN",
                    "message": format!("Cannot mark umbrella spec complete: {} child spec(s) are not complete", umbrella_verification.incomplete_children.len()),
                    "details": {
                        "incomplete_children": incomplete_children,
                        "progress": umbrella_verification.progress.to_string(),
                        "suggestions": umbrella_verification.suggestions
                    }
                })).map_err(|e| e.to_string())?);
            }
        }
    }

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;

    let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
        std::collections::HashMap::new();
    let mut fields_updated = Vec::new();

    if let Some(status) = args.get("status").and_then(|v| v.as_str()) {
        updates.insert(
            "status".to_string(),
            serde_yaml::Value::String(status.to_string()),
        );
        fields_updated.push(format!("status → {}", status));
    }

    if let Some(priority) = args.get("priority").and_then(|v| v.as_str()) {
        updates.insert(
            "priority".to_string(),
            serde_yaml::Value::String(priority.to_string()),
        );
        fields_updated.push(format!("priority → {}", priority));
    }

    if let Some(assignee) = args.get("assignee").and_then(|v| v.as_str()) {
        updates.insert(
            "assignee".to_string(),
            serde_yaml::Value::String(assignee.to_string()),
        );
        fields_updated.push(format!("assignee → {}", assignee));
    }

    // Handle tags
    let add_tags: Vec<String> = args
        .get("addTags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    let remove_tags: Vec<String> = args
        .get("removeTags")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    if !add_tags.is_empty() || !remove_tags.is_empty() {
        let mut current_tags = spec.frontmatter.tags.clone();

        for tag in add_tags {
            if !current_tags.contains(&tag) {
                fields_updated.push(format!("+tag: {}", tag));
                current_tags.push(tag);
            }
        }

        for tag in &remove_tags {
            if let Some(pos) = current_tags.iter().position(|t| t == tag) {
                fields_updated.push(format!("-tag: {}", tag));
                current_tags.remove(pos);
            }
        }

        let tags_seq: Vec<serde_yaml::Value> = current_tags
            .iter()
            .map(|t| serde_yaml::Value::String(t.clone()))
            .collect();
        updates.insert("tags".to_string(), serde_yaml::Value::Sequence(tags_seq));
    }

    if updates.is_empty() {
        return Ok("No updates specified".to_string());
    }

    let parser = leanspec_core::FrontmatterParser::new();
    let new_content = parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| e.to_string())?;

    std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;

    Ok(format!(
        "Updated {}: {}",
        spec.path,
        fields_updated.join(", ")
    ))
}

pub(crate) fn tool_search(specs_dir: &str, args: Value) -> Result<String, String> {
    let query = args
        .get("query")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: query")?;

    let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(10) as usize;

    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let query_lower = query.to_lowercase();

    let mut results: Vec<_> = specs
        .iter()
        .filter_map(|spec| {
            let mut score = 0.0;

            if spec.title.to_lowercase().contains(&query_lower) {
                score += 10.0;
            }
            if spec.path.to_lowercase().contains(&query_lower) {
                score += 5.0;
            }
            for tag in &spec.frontmatter.tags {
                if tag.to_lowercase().contains(&query_lower) {
                    score += 3.0;
                }
            }
            let content_matches = spec.content.to_lowercase().matches(&query_lower).count();
            if content_matches > 0 {
                score += (content_matches as f64).min(5.0);
            }

            if score > 0.0 {
                Some((spec, score))
            } else {
                None
            }
        })
        .collect();

    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    results.truncate(limit);

    let output: Vec<_> = results
        .iter()
        .map(|(spec, score)| {
            json!({
                "path": spec.path,
                "title": spec.title,
                "status": spec.frontmatter.status.to_string(),
                "score": score,
                "tags": spec.frontmatter.tags,
            })
        })
        .collect();

    serde_json::to_string_pretty(&json!({
        "query": query,
        "count": output.len(),
        "results": output
    }))
    .map_err(|e| e.to_string())
}

/// Get tool definitions for spec management tools
pub(crate) fn get_definitions() -> Vec<crate::protocol::ToolDefinition> {
    use crate::protocol::ToolDefinition;

    vec![
        ToolDefinition {
            name: "list".to_string(),
            description: "List all specs with optional filtering by status, tags, or priority"
                .to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filter by status: planned, in-progress, complete, archived",
                        "enum": ["planned", "in-progress", "complete", "archived"]
                    },
                    "tags": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Filter by tags (spec must have ALL specified tags)"
                    },
                    "priority": {
                        "type": "string",
                        "description": "Filter by priority: low, medium, high, critical",
                        "enum": ["low", "medium", "high", "critical"]
                    }
                },
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "view".to_string(),
            description: "View a spec's full content and metadata".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Spec path or number (e.g., '170' or '170-cli-mcp')"
                    }
                },
                "required": ["specPath"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "create".to_string(),
            description: "Create a new spec".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Short spec name in kebab-case (e.g., 'my-feature'). NOTE: DO NOT add spec number (NNN), it will be auto-generated."
                    },
                    "title": {
                        "type": "string",
                        "description": "Human-readable title"
                    },
                    "status": {
                        "type": "string",
                        "description": "Initial status",
                        "enum": ["planned", "in-progress"],
                        "default": "planned"
                    },
                    "priority": {
                        "type": "string",
                        "description": "Priority level",
                        "enum": ["low", "medium", "high", "critical"],
                        "default": "medium"
                    },
                    "template": {
                        "type": "string",
                        "description": "Template name to load from .lean-spec/templates"
                    },
                    "content": {
                        "type": "string",
                        "description": create_content_description()
                    },
                    "tags": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Tags for categorization"
                    }
                },
                "required": ["name"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "update".to_string(),
            description: "Update a spec's frontmatter (status, priority, tags, assignee). When setting status to 'complete', verifies all checklist items are checked unless force=true.".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Spec path or number"
                    },
                    "status": {
                        "type": "string",
                        "description": "New status",
                        "enum": ["planned", "in-progress", "complete", "archived"]
                    },
                    "priority": {
                        "type": "string",
                        "description": "New priority",
                        "enum": ["low", "medium", "high", "critical"]
                    },
                    "assignee": {
                        "type": "string",
                        "description": "New assignee"
                    },
                    "addTags": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Tags to add"
                    },
                    "removeTags": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Tags to remove"
                    },
                    "force": {
                        "type": "boolean",
                        "description": "Skip completion verification when setting status to complete",
                        "default": false
                    }
                },
                "required": ["specPath"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "search".to_string(),
            description: "Search specs by query".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results",
                        "default": 10
                    }
                },
                "required": ["query"],
                "additionalProperties": false
            }),
        },
    ]
}
