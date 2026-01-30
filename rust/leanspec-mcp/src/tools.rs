//! MCP Tool implementations

use crate::protocol::ToolDefinition;
use chrono::Utc;
use leanspec_core::parsers::ParseError;
use leanspec_core::{
    DependencyGraph, FrontmatterParser, LeanSpecConfig, SpecFrontmatter, SpecLoader, SpecPriority,
    SpecStats, SpecStatus, TemplateLoader, TokenCounter,
};
use serde_json::{json, Value};
use std::cell::RefCell;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;

thread_local! {
    /// Thread-local specs directory override for tests
    static TEST_SPECS_DIR: RefCell<Option<String>> = const { RefCell::new(None) };
}

/// Set the specs directory for the current thread (used by tests)
pub fn set_test_specs_dir(path: Option<String>) {
    TEST_SPECS_DIR.with(|cell| {
        *cell.borrow_mut() = path;
    });
}

/// Get all tool definitions
pub fn get_tool_definitions() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "list".to_string(),
            description: "List all specs with optional filtering by status, tags, or priority".to_string(),
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
                        "enum": ["low", "medium", "high", "critical"]
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
            name: "validate".to_string(),
            description: "Validate specs for issues (frontmatter, structure, dependencies)".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Specific spec to validate (validates all if not provided)"
                    },
                    "checkDeps": {
                        "type": "boolean",
                        "description": "Check dependency alignment",
                        "default": false
                    }
                },
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "deps".to_string(),
            description: "Show dependency graph for a spec".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Spec path or number"
                    },
                    "depth": {
                        "type": "integer",
                        "description": "Maximum depth to traverse",
                        "default": 3
                    }
                },
                "required": ["specPath"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "link".to_string(),
            description: "Add a dependency link between specs".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Spec to link from"
                    },
                    "dependsOn": {
                        "type": "string",
                        "description": "Spec to depend on"
                    }
                },
                "required": ["specPath", "dependsOn"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "unlink".to_string(),
            description: "Remove a dependency link between specs".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Spec to unlink from"
                    },
                    "dependsOn": {
                        "type": "string",
                        "description": "Spec to remove from dependencies"
                    }
                },
                "required": ["specPath", "dependsOn"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "set_parent".to_string(),
            description: "Assign or clear a parent umbrella for a spec".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Spec to update"
                    },
                    "parent": {
                        "type": ["string", "null"],
                        "description": "Parent spec path or number (null to clear)"
                    }
                },
                "required": ["specPath"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "relationships".to_string(),
            description: "Manage spec relationships (hierarchy and dependencies)".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Spec path or number"
                    },
                    "action": {
                        "type": "string",
                        "description": "Action to perform",
                        "enum": ["view", "add", "remove"],
                        "default": "view"
                    },
                    "type": {
                        "type": "string",
                        "description": "Relationship type",
                        "enum": ["parent", "child", "depends_on"]
                    },
                    "target": {
                        "type": "string",
                        "description": "Target spec path or number"
                    }
                },
                "required": ["specPath"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "list_children".to_string(),
            description: "List direct children of a parent spec".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "specPath": {
                        "type": "string",
                        "description": "Parent spec path or number"
                    }
                },
                "required": ["specPath"],
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "list_umbrellas".to_string(),
            description: "List umbrella specs (explicit or inferred)".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {},
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
        ToolDefinition {
            name: "board".to_string(),
            description: "Show project board view grouped by status, priority, or assignee".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {
                    "groupBy": {
                        "type": "string",
                        "description": "Group by: status, priority, assignee, tag, parent",
                        "enum": ["status", "priority", "assignee", "tag", "parent"],
                        "default": "status"
                    }
                },
                "additionalProperties": false
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
                },
                "additionalProperties": false
            }),
        },
        ToolDefinition {
            name: "stats".to_string(),
            description: "Show spec statistics and insights".to_string(),
            input_schema: json!({
                "type": "object",
                "properties": {},
                "additionalProperties": false
            }),
        },
    ]
}

/// Call a tool with arguments
pub async fn call_tool(name: &str, args: Value) -> Result<String, String> {
    // Use thread-local specs directory if set (for tests), otherwise use env var
    let specs_dir = TEST_SPECS_DIR
        .with(|cell| cell.borrow().clone())
        .or_else(|| std::env::var("LEANSPEC_SPECS_DIR").ok())
        .unwrap_or_else(|| "specs".to_string());

    match name {
        "list" => tool_list(&specs_dir, args),
        "view" => tool_view(&specs_dir, args),
        "create" => tool_create(&specs_dir, args),
        "update" => tool_update(&specs_dir, args),
        "validate" => tool_validate(&specs_dir, args),
        "deps" => with_deprecation_warning(
            tool_deps(&specs_dir, args),
            "Use relationships with action=view instead of deps",
        ),
        "link" => with_deprecation_warning(
            tool_link(&specs_dir, args),
            "Use relationships with action=add type=depends_on instead of link",
        ),
        "unlink" => with_deprecation_warning(
            tool_unlink(&specs_dir, args),
            "Use relationships with action=remove type=depends_on instead of unlink",
        ),
        "set_parent" => with_deprecation_warning(
            tool_set_parent(&specs_dir, args),
            "Use relationships with action=add/remove type=parent instead of set_parent",
        ),
        "list_children" => with_deprecation_warning(
            tool_list_children(&specs_dir, args),
            "Use relationships with action=view instead of list_children",
        ),
        "list_umbrellas" => with_deprecation_warning(
            tool_list_umbrellas(&specs_dir),
            "Use relationships with action=view instead of list_umbrellas",
        ),
        "relationships" => tool_relationships(&specs_dir, args),
        "search" => tool_search(&specs_dir, args),
        "board" => tool_board(&specs_dir, args),
        "tokens" => tool_tokens(&specs_dir, args),
        "stats" => tool_stats(&specs_dir),
        _ => Err(format!("Unknown tool: {}", name)),
    }
}

fn with_deprecation_warning(
    result: Result<String, String>,
    warning: &str,
) -> Result<String, String> {
    result.map(|output| format!("DEPRECATED: {}\n{}", warning, output))
}

fn tool_list(specs_dir: &str, args: Value) -> Result<String, String> {
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

fn tool_view(specs_dir: &str, args: Value) -> Result<String, String> {
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

fn tool_create(specs_dir: &str, args: Value) -> Result<String, String> {
    let name = args
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: name")?;

    let title_input = args.get("title").and_then(|v| v.as_str());
    let status = args
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("planned");
    let priority = args.get("priority").and_then(|v| v.as_str());
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

fn tool_update(specs_dir: &str, args: Value) -> Result<String, String> {
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

fn tool_validate(specs_dir: &str, args: Value) -> Result<String, String> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let fm_validator = leanspec_core::FrontmatterValidator::new();
    let struct_validator = leanspec_core::StructureValidator::new();
    let line_validator = leanspec_core::LineCountValidator::new();

    let mut issues = Vec::new();

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
        result.merge(line_validator.validate(spec));

        if result.has_errors() || result.has_warnings() {
            issues.push(json!({
                "spec": spec.path,
                "errors": result.errors().map(|i| i.message.clone()).collect::<Vec<_>>(),
                "warnings": result.warnings().map(|i| i.message.clone()).collect::<Vec<_>>(),
            }));
        }
    }

    if issues.is_empty() {
        Ok(format!(
            "All {} specs passed validation",
            specs_to_validate.len()
        ))
    } else {
        serde_json::to_string_pretty(&json!({
            "total": specs_to_validate.len(),
            "issues": issues
        }))
        .map_err(|e| e.to_string())
    }
}

fn tool_deps(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let _depth = args.get("depth").and_then(|v| v.as_u64()).unwrap_or(3) as usize;

    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    let graph = DependencyGraph::new(&specs);
    let complete = graph
        .get_complete_graph(&spec.path)
        .ok_or_else(|| "Spec not in graph".to_string())?;

    let output = json!({
        "spec": spec.path,
        "title": spec.title,
        "dependsOn": complete.depends_on.iter().map(|s| json!({
            "path": s.path,
            "title": s.title,
            "status": s.frontmatter.status.to_string()
        })).collect::<Vec<_>>(),
        "requiredBy": complete.required_by.iter().map(|s| json!({
            "path": s.path,
            "title": s.title,
            "status": s.frontmatter.status.to_string()
        })).collect::<Vec<_>>(),
        "hasCircular": graph.has_circular_dependency(&spec.path),
    });

    serde_json::to_string_pretty(&output).map_err(|e| e.to_string())
}

fn tool_link(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let depends_on = args
        .get("dependsOn")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: dependsOn")?;

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    let target = loader
        .load(depends_on)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Target spec not found: {}", depends_on))?;

    if spec.frontmatter.depends_on.contains(&target.path) {
        return Ok(format!("{} already depends on {}", spec.path, target.path));
    }

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;

    let mut depends_on_list = spec.frontmatter.depends_on.clone();
    depends_on_list.push(target.path.clone());

    let deps_seq: Vec<serde_yaml::Value> = depends_on_list
        .iter()
        .map(|t| serde_yaml::Value::String(t.clone()))
        .collect();

    let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
        std::collections::HashMap::new();
    updates.insert(
        "depends_on".to_string(),
        serde_yaml::Value::Sequence(deps_seq),
    );

    let parser = leanspec_core::FrontmatterParser::new();
    let new_content = parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| e.to_string())?;

    std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;

    Ok(format!("Linked: {} → {}", spec.path, target.path))
}

fn tool_unlink(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let depends_on = args
        .get("dependsOn")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: dependsOn")?;

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    let target_path = spec
        .frontmatter
        .depends_on
        .iter()
        .find(|d| d.contains(depends_on) || depends_on.contains(d.as_str()))
        .cloned()
        .ok_or_else(|| format!("{} does not depend on {}", spec.path, depends_on))?;

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;

    let depends_on_list: Vec<_> = spec
        .frontmatter
        .depends_on
        .iter()
        .filter(|d| *d != &target_path)
        .cloned()
        .collect();

    let deps_seq: Vec<serde_yaml::Value> = depends_on_list
        .iter()
        .map(|t| serde_yaml::Value::String(t.clone()))
        .collect();

    let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
        std::collections::HashMap::new();
    updates.insert(
        "depends_on".to_string(),
        serde_yaml::Value::Sequence(deps_seq),
    );

    let parser = leanspec_core::FrontmatterParser::new();
    let new_content = parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| e.to_string())?;

    std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;

    Ok(format!("Unlinked: {} ✗ {}", spec.path, target_path))
}

fn tool_set_parent(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let parent = args.get("parent").and_then(|v| v.as_str());

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    if let Some(parent_path) = parent {
        if parent_path == spec.path {
            return Err("Spec cannot be its own parent".to_string());
        }

        let parent_spec = loader
            .load(parent_path)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Parent spec not found: {}", parent_path))?;

        let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
            std::collections::HashMap::new();
        updates.insert(
            "parent".to_string(),
            serde_yaml::Value::String(parent_spec.path.clone()),
        );

        let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;
        let parser = leanspec_core::FrontmatterParser::new();
        let new_content = parser
            .update_frontmatter(&content, &updates)
            .map_err(|e| e.to_string())?;

        std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;
        return Ok(format!("Set parent: {} → {}", spec.path, parent_spec.path));
    }

    let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
        std::collections::HashMap::new();
    updates.insert("parent".to_string(), serde_yaml::Value::Null);

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;
    let parser = leanspec_core::FrontmatterParser::new();
    let new_content = parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| e.to_string())?;

    std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;
    Ok(format!("Cleared parent for {}", spec.path))
}

fn tool_relationships(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let action = args
        .get("action")
        .and_then(|v| v.as_str())
        .unwrap_or("view");

    let rel_type = args.get("type").and_then(|v| v.as_str());
    let target = args.get("target").and_then(|v| v.as_str());

    match action {
        "view" => {
            let loader = SpecLoader::new(specs_dir);
            let spec = loader
                .load(spec_path)
                .map_err(|e| e.to_string())?
                .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

            let all_specs = loader.load_all().map_err(|e| e.to_string())?;
            let children: Vec<_> = all_specs
                .iter()
                .filter(|s| s.frontmatter.parent.as_deref() == Some(spec.path.as_str()))
                .collect();
            let required_by: Vec<_> = all_specs
                .iter()
                .filter(|s| s.frontmatter.depends_on.contains(&spec.path))
                .collect();

            let to_summary = |s: &leanspec_core::SpecInfo| {
                json!({
                    "path": s.path,
                    "title": s.title,
                    "status": s.frontmatter.status.to_string()
                })
            };

            let output = json!({
                "spec": {
                    "path": spec.path,
                    "title": spec.title,
                    "status": spec.frontmatter.status.to_string(),
                },
                "hierarchy": {
                    "parent": spec.frontmatter.parent,
                    "children": children.iter().map(|s| to_summary(s)).collect::<Vec<_>>()
                },
                "dependencies": {
                    "depends_on": spec.frontmatter.depends_on.iter().map(|path| {
                        all_specs
                            .iter()
                            .find(|s| s.path == *path)
                            .map(|s| to_summary(s))
                            .unwrap_or_else(|| json!({ "path": path }))
                    }).collect::<Vec<_>>(),
                    "required_by": required_by.iter().map(|s| to_summary(s)).collect::<Vec<_>>()
                }
            });

            return serde_json::to_string_pretty(&output).map_err(|e| e.to_string());
        }
        "add" | "remove" => {
            let rel_type = rel_type.ok_or("Missing required parameter: type")?;
            let target = target.ok_or("Missing required parameter: target")?;

            match rel_type {
                "parent" => {
                    if action == "add" {
                        tool_set_parent(
                            specs_dir,
                            json!({ "specPath": spec_path, "parent": target }),
                        )
                    } else {
                        tool_set_parent(specs_dir, json!({ "specPath": spec_path, "parent": null }))
                    }
                }
                "child" => {
                    if action == "add" {
                        tool_set_parent(
                            specs_dir,
                            json!({ "specPath": target, "parent": spec_path }),
                        )
                    } else {
                        tool_set_parent(specs_dir, json!({ "specPath": target, "parent": null }))
                    }
                }
                "depends_on" => {
                    if action == "add" {
                        tool_link(
                            specs_dir,
                            json!({ "specPath": spec_path, "dependsOn": target }),
                        )
                    } else {
                        tool_unlink(
                            specs_dir,
                            json!({ "specPath": spec_path, "dependsOn": target }),
                        )
                    }
                }
                _ => Err("Invalid relationship type".to_string()),
            }
        }
        _ => Err("Invalid action".to_string()),
    }
}

fn tool_list_children(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let loader = SpecLoader::new(specs_dir);
    let parent = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    let specs = loader.load_all().map_err(|e| e.to_string())?;
    let children: Vec<_> = specs
        .iter()
        .filter(|s| s.frontmatter.parent.as_deref() == Some(parent.path.as_str()))
        .map(|s| {
            json!({
                "path": s.path,
                "title": s.title,
                "status": s.frontmatter.status.to_string()
            })
        })
        .collect();

    serde_json::to_string_pretty(&json!({
        "parent": parent.path,
        "title": parent.title,
        "count": children.len(),
        "children": children
    }))
    .map_err(|e| e.to_string())
}

fn tool_list_umbrellas(specs_dir: &str) -> Result<String, String> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let mut child_counts: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();
    for spec in &specs {
        if let Some(parent) = spec.frontmatter.parent.as_deref() {
            *child_counts.entry(parent.to_string()).or_insert(0) += 1;
        }
    }

    let umbrellas: Vec<_> = specs
        .iter()
        .filter(|s| child_counts.contains_key(&s.path))
        .map(|s| {
            json!({
                "path": s.path,
                "title": s.title,
                "status": s.frontmatter.status.to_string(),
                "childCount": child_counts.get(&s.path).cloned().unwrap_or(0)
            })
        })
        .collect();

    serde_json::to_string_pretty(&json!({
        "count": umbrellas.len(),
        "umbrellas": umbrellas
    }))
    .map_err(|e| e.to_string())
}

fn tool_search(specs_dir: &str, args: Value) -> Result<String, String> {
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

fn tool_board(specs_dir: &str, args: Value) -> Result<String, String> {
    let group_by = args
        .get("groupBy")
        .and_then(|v| v.as_str())
        .unwrap_or("status");

    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let mut groups: std::collections::HashMap<String, Vec<serde_json::Value>> =
        std::collections::HashMap::new();

    for spec in &specs {
        let key = match group_by {
            "status" => spec.frontmatter.status.to_string(),
            "priority" => spec
                .frontmatter
                .priority
                .map(|p| p.to_string())
                .unwrap_or_else(|| "none".to_string()),
            "assignee" => spec
                .frontmatter
                .assignee
                .clone()
                .unwrap_or_else(|| "unassigned".to_string()),
            "tag" => {
                for tag in &spec.frontmatter.tags {
                    groups.entry(tag.clone()).or_default().push(json!({
                        "path": spec.path,
                        "title": spec.title,
                        "status": spec.frontmatter.status.to_string(),
                    }));
                }
                continue;
            }
            "parent" => spec
                .frontmatter
                .parent
                .clone()
                .unwrap_or_else(|| "(no-parent)".to_string()),
            _ => "unknown".to_string(),
        };

        groups.entry(key).or_default().push(json!({
            "path": spec.path,
            "title": spec.title,
            "status": spec.frontmatter.status.to_string(),
        }));
    }

    let output: Vec<_> = groups
        .into_iter()
        .map(|(name, specs)| {
            json!({
                "name": name,
                "count": specs.len(),
                "specs": specs,
            })
        })
        .collect();

    serde_json::to_string_pretty(&json!({
        "groupBy": group_by,
        "total": specs.len(),
        "groups": output
    }))
    .map_err(|e| e.to_string())
}

fn tool_tokens(specs_dir: &str, args: Value) -> Result<String, String> {
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

fn tool_stats(specs_dir: &str) -> Result<String, String> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    let stats = SpecStats::compute(&specs);

    serde_json::to_string_pretty(&json!({
        "total": stats.total,
        "byStatus": stats.by_status.iter().map(|(k, v)| (k.to_string(), *v)).collect::<std::collections::HashMap<_, _>>(),
        "byPriority": stats.by_priority.iter().map(|(k, v)| (k.to_string(), *v)).collect::<std::collections::HashMap<_, _>>(),
        "completionPercentage": stats.completion_percentage(),
        "activeCount": stats.active_count(),
        "withDependencies": stats.with_dependencies,
        "totalDependencies": stats.total_dependencies,
        "subSpecs": stats.sub_specs,
        "topTags": stats.top_tags(10).iter().map(|(k, v)| json!({ "tag": k, "count": v })).collect::<Vec<_>>(),
    }))
    .map_err(|e| e.to_string())
}

// Helper functions

fn create_content_description() -> String {
    // Skip caching when thread-local is set (tests), rebuild description each time
    if TEST_SPECS_DIR.with(|cell| cell.borrow().is_some()) {
        return build_template_body_description().unwrap_or_else(|e| {
            eprintln!(
                "Warning: failed to load spec template for create tool description: {}",
                e
            );
            CREATE_CONTENT_FALLBACK.to_string()
        });
    }

    static DESCRIPTION: OnceLock<String> = OnceLock::new();

    DESCRIPTION
        .get_or_init(|| {
            build_template_body_description().unwrap_or_else(|e| {
                eprintln!(
                    "Warning: failed to load spec template for create tool description: {}",
                    e
                );
                CREATE_CONTENT_FALLBACK.to_string()
            })
        })
        .clone()
}

fn build_template_body_description() -> Result<String, String> {
    // Use thread-local specs directory if set (for tests), otherwise use env var
    let specs_dir = TEST_SPECS_DIR
        .with(|cell| cell.borrow().clone())
        .or_else(|| std::env::var("LEANSPEC_SPECS_DIR").ok())
        .unwrap_or_else(|| "specs".to_string());
    let project_root = resolve_project_root(&specs_dir)?;
    let config = load_config(&project_root);
    let loader = TemplateLoader::with_config(&project_root, config);
    let template = loader
        .load(None)
        .map_err(|e| format!("Failed to load template: {}", e))?;

    let template_body = extract_template_body(&template);

    Ok(format!(
        "{}{}{}",
        CONTENT_DESCRIPTION_PREFIX, template_body, CONTENT_DESCRIPTION_SUFFIX
    ))
}

fn extract_template_body(template: &str) -> String {
    let parser = FrontmatterParser::new();
    let body = match parser.parse(template) {
        Ok((_, body)) => body,
        Err(_) => template.to_string(),
    };

    let mut lines = body.lines().peekable();
    let skip_empty = |iter: &mut std::iter::Peekable<std::str::Lines<'_>>| {
        while matches!(iter.peek(), Some(line) if line.trim().is_empty()) {
            iter.next();
        }
    };

    skip_empty(&mut lines);

    if matches!(lines.peek(), Some(line) if line.trim_start().starts_with('#')) {
        lines.next();
        skip_empty(&mut lines);
    }

    if matches!(
        lines.peek(),
        Some(line) if line.trim_start().starts_with("> **Status**")
    ) {
        lines.next();
        skip_empty(&mut lines);
    }

    let mut collected = String::with_capacity(body.len());
    for (idx, line) in lines.enumerate() {
        if idx > 0 {
            collected.push('\n');
        }
        collected.push_str(line);
    }

    collected.trim().to_string()
}

const CREATE_CONTENT_FALLBACK: &str =
    "Body content only (markdown sections). Frontmatter and title are auto-generated.";

const CONTENT_DESCRIPTION_PREFIX: &str = "Body content only (markdown sections). DO NOT include frontmatter or title - these are auto-generated from other parameters (name, title, status, priority, tags).\n\nTEMPLATE STRUCTURE (body sections only):\n\n";

const CONTENT_DESCRIPTION_SUFFIX: &str =
    "\n\nKeep specs <2000 tokens optimal, <3500 max. Consider sub-specs (IMPLEMENTATION.md) if >400 lines.";

fn get_next_spec_number(specs_dir: &str) -> Result<u32, String> {
    let specs_path = std::path::Path::new(specs_dir);

    if !specs_path.exists() {
        return Ok(1);
    }

    let mut max_number = 0u32;

    for entry in std::fs::read_dir(specs_path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.file_type().map_err(|e| e.to_string())?.is_dir() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            if let Some(num_str) = name_str.split('-').next() {
                if let Ok(num) = num_str.parse::<u32>() {
                    max_number = max_number.max(num);
                }
            }
        }
    }

    Ok(max_number + 1)
}

fn resolve_project_root(specs_dir: &str) -> Result<PathBuf, String> {
    let specs_path = Path::new(specs_dir);
    let absolute = if specs_path.is_absolute() {
        specs_path.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(specs_path)
    };

    Ok(absolute.parent().map(PathBuf::from).unwrap_or(absolute))
}

fn load_config(project_root: &Path) -> LeanSpecConfig {
    let config_path = project_root.join(".lean-spec").join("config.yaml");
    if config_path.exists() {
        LeanSpecConfig::load(&config_path).unwrap_or_default()
    } else {
        LeanSpecConfig::default()
    }
}

fn resolve_template_variables(
    template: &str,
    title: &str,
    status: &str,
    priority: Option<&str>,
    created_date: &str,
) -> String {
    let resolved_priority = priority.unwrap_or("medium");
    let mut content = template.to_string();

    for (key, value) in [
        ("name", title),
        ("title", title),
        ("status", status),
        ("priority", resolved_priority),
        ("date", created_date),
        ("created", created_date),
    ] {
        content = content.replace(&format!("{{{{{}}}}}", key), value);
        content = content.replace(&format!("{{{}}}", key), value);
    }

    content
}

fn merge_frontmatter(
    content: &str,
    status: &str,
    priority: Option<&str>,
    tags: &[String],
    created_date: &str,
    now: chrono::DateTime<Utc>,
    title: &str,
) -> Result<String, String> {
    let parser = FrontmatterParser::new();
    let status_parsed: SpecStatus = status
        .parse()
        .map_err(|_| format!("Invalid status: {}", status))?;

    let priority_parsed: Option<SpecPriority> = priority
        .map(|p| p.parse().map_err(|_| format!("Invalid priority: {}", p)))
        .transpose()?;

    match parser.parse(content) {
        Ok((mut fm, body)) => {
            fm.status = status_parsed;
            if let Some(p) = priority_parsed {
                fm.priority = Some(p);
            }
            if !tags.is_empty() {
                fm.tags = tags.to_vec();
            }
            if fm.created.trim().is_empty() {
                fm.created = created_date.to_string();
            }
            if fm.created_at.is_none() {
                fm.created_at = Some(now);
            }
            fm.updated_at = Some(now);

            // Ensure H1 title is present in the body
            let trimmed_body = body.trim_start();
            let final_body = if trimmed_body.starts_with("# ") || trimmed_body.starts_with("#\n") {
                body
            } else {
                format!("# {}\n\n{}", title, trimmed_body)
            };

            Ok(parser.stringify(&fm, &final_body))
        }
        Err(ParseError::NoFrontmatter) => build_frontmatter_from_scratch(
            content,
            status_parsed,
            priority_parsed,
            tags,
            created_date,
            title,
            now,
        ),
        Err(e) => Err(e.to_string()),
    }
}

fn build_frontmatter_from_scratch(
    content: &str,
    status: SpecStatus,
    priority: Option<SpecPriority>,
    tags: &[String],
    created_date: &str,
    title: &str,
    now: chrono::DateTime<Utc>,
) -> Result<String, String> {
    let frontmatter = SpecFrontmatter {
        status,
        created: created_date.to_string(),
        priority,
        tags: tags.to_vec(),
        depends_on: Vec::new(),
        parent: None,
        assignee: None,
        reviewer: None,
        issue: None,
        pr: None,
        epic: None,
        breaking: None,
        due: None,
        updated: None,
        completed: None,
        created_at: Some(now),
        updated_at: Some(now),
        completed_at: None,
        transitions: Vec::new(),
        custom: std::collections::HashMap::new(),
    };

    let parser = FrontmatterParser::new();

    // Ensure H1 title is present in the body
    let body = content.trim_start();
    let final_body = if body.starts_with("# ") || body.starts_with("#\n") {
        body.to_string()
    } else {
        format!("# {}\n\n{}", title, body)
    };

    Ok(parser.stringify(&frontmatter, &final_body))
}

fn to_title_case(name: &str) -> String {
    name.split('-')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}
