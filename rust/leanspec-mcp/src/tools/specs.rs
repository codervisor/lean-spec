//! Spec management tools (list, view, create, update, search)

use super::helpers::{
    create_content_description, get_next_spec_number, load_config, merge_frontmatter,
    resolve_project_root, resolve_template_variables, to_title_case, MergeFrontmatterInput,
};
use chrono::Utc;
use leanspec_core::hash_content;
use leanspec_core::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, preserve_title_heading,
    rebuild_content, split_frontmatter, ChecklistToggle, CompletionVerifier, FrontmatterParser,
    MatchMode, Replacement, SectionMode, SectionUpdate, SpecLoader, TemplateLoader,
};
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
    let parent = args.get("parent").and_then(|v| v.as_str());
    let depends_on: Vec<String> = args
        .get("dependsOn")
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

    let content = merge_frontmatter(&MergeFrontmatterInput {
        content: &base_content,
        status,
        priority,
        tags: &tags,
        created_date: &created_date,
        now,
        title: &title,
        parent,
        depends_on: &depends_on,
    })?;

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

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;
    let parser = FrontmatterParser::new();
    let (_, body) = parser.parse(&content).map_err(|e| e.to_string())?;
    let (frontmatter, _) = split_frontmatter(&content);

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

    let expected_hash = args
        .get("expectedContentHash")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if let Some(expected_hash) = expected_hash {
        let current_hash = hash_content(&body);
        if expected_hash != current_hash {
            return Err(format!(
                "Content hash mismatch (expected {}, current {}).",
                expected_hash, current_hash
            ));
        }
    }

    let content_override = args
        .get("content")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let replacements = parse_replacements(&args)?;
    let section_updates = parse_section_updates(&args)?;
    let checklist_toggles = parse_checklist_toggles(&args)?;

    let has_content_ops = content_override.is_some()
        || !replacements.is_empty()
        || !section_updates.is_empty()
        || !checklist_toggles.is_empty();

    if updates.is_empty() && !has_content_ops {
        return Ok("No updates specified".to_string());
    }

    let mut updated_body = body.clone();
    let mut content_notes = Vec::new();
    let mut checklist_results = Vec::new();

    if let Some(content_override) = content_override {
        updated_body = preserve_title_heading(&body, &content_override);
        content_notes.push("content replacement".to_string());
    } else {
        if !replacements.is_empty() {
            let (new_body, results) = apply_replacements(&updated_body, &replacements)?;
            updated_body = new_body;
            content_notes.push(format!("replacements: {}", results.len()));
        }

        if !section_updates.is_empty() {
            updated_body = apply_section_updates(&updated_body, &section_updates)?;
            content_notes.push(format!("section updates: {}", section_updates.len()));
        }

        if !checklist_toggles.is_empty() {
            let (new_body, results) = apply_checklist_toggles(&updated_body, &checklist_toggles)?;
            updated_body = new_body;
            checklist_results = results;
            content_notes.push(format!("checklist toggles: {}", checklist_results.len()));
        }
    }

    let mut rebuilt = rebuild_content(frontmatter, &updated_body);
    if !updates.is_empty() {
        rebuilt = parser
            .update_frontmatter(&rebuilt, &updates)
            .map_err(|e| e.to_string())?;
    }

    if let Some(new_status) = args.get("status").and_then(|v| v.as_str()) {
        if new_status == "complete" && !force {
            let verification =
                CompletionVerifier::verify_content(&rebuilt).map_err(|e| e.to_string())?;

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

            let all_specs = loader.load_all().map_err(|e| e.to_string())?;
            let umbrella_verification =
                CompletionVerifier::verify_umbrella_completion(&spec.path, &all_specs);

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

    std::fs::write(&spec.file_path, &rebuilt).map_err(|e| e.to_string())?;

    let mut summary_parts = fields_updated;
    summary_parts.extend(content_notes);
    let summary = if summary_parts.is_empty() {
        format!("Updated {}", spec.path)
    } else {
        format!("Updated {}: {}", spec.path, summary_parts.join(", "))
    };

    let mut output_lines = vec![summary];
    if !checklist_results.is_empty() {
        output_lines.push("Checklist updates:".to_string());
        for item in checklist_results {
            output_lines.push(format!("  line {}: {}", item.line, item.line_text.trim()));
        }
    }

    Ok(output_lines.join("\n"))
}

fn parse_replacements(args: &Value) -> Result<Vec<Replacement>, String> {
    let mut replacements = Vec::new();
    let Some(items) = args.get("replacements").and_then(|v| v.as_array()) else {
        return Ok(replacements);
    };

    for item in items {
        let old_string = item
            .get("oldString")
            .and_then(|v| v.as_str())
            .ok_or("Missing replacements.oldString")?;
        let new_string = item
            .get("newString")
            .and_then(|v| v.as_str())
            .ok_or("Missing replacements.newString")?;
        let match_mode = item
            .get("matchMode")
            .and_then(|v| v.as_str())
            .unwrap_or("unique");

        let match_mode = match match_mode {
            "unique" => MatchMode::Unique,
            "all" => MatchMode::All,
            "first" => MatchMode::First,
            other => return Err(format!("Invalid matchMode: {}", other)),
        };

        replacements.push(Replacement {
            old_string: old_string.to_string(),
            new_string: new_string.to_string(),
            match_mode,
        });
    }

    Ok(replacements)
}

fn parse_section_updates(args: &Value) -> Result<Vec<SectionUpdate>, String> {
    let mut updates = Vec::new();
    let Some(items) = args.get("sectionUpdates").and_then(|v| v.as_array()) else {
        return Ok(updates);
    };

    for item in items {
        let section = item
            .get("section")
            .and_then(|v| v.as_str())
            .ok_or("Missing sectionUpdates.section")?;
        let content = item
            .get("content")
            .and_then(|v| v.as_str())
            .ok_or("Missing sectionUpdates.content")?;
        let mode = item
            .get("mode")
            .and_then(|v| v.as_str())
            .unwrap_or("replace");

        let mode = match mode {
            "replace" => SectionMode::Replace,
            "append" => SectionMode::Append,
            "prepend" => SectionMode::Prepend,
            other => return Err(format!("Invalid sectionUpdates.mode: {}", other)),
        };

        updates.push(SectionUpdate {
            section: section.to_string(),
            content: content.to_string(),
            mode,
        });
    }

    Ok(updates)
}

fn parse_checklist_toggles(args: &Value) -> Result<Vec<ChecklistToggle>, String> {
    let mut toggles = Vec::new();
    let Some(items) = args.get("checklistToggles").and_then(|v| v.as_array()) else {
        return Ok(toggles);
    };

    for item in items {
        let item_text = item
            .get("itemText")
            .and_then(|v| v.as_str())
            .ok_or("Missing checklistToggles.itemText")?;
        let checked = item
            .get("checked")
            .and_then(|v| v.as_bool())
            .ok_or("Missing checklistToggles.checked")?;

        toggles.push(ChecklistToggle {
            item_text: item_text.to_string(),
            checked,
        });
    }

    Ok(toggles)
}

pub(crate) fn tool_search(specs_dir: &str, args: Value) -> Result<String, String> {
    use leanspec_core::{parse_query_terms, search_specs};

    let query = args
        .get("query")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: query")?;

    let limit = args.get("limit").and_then(|v| v.as_u64()).unwrap_or(10) as usize;

    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all().map_err(|e| e.to_string())?;

    // Check for empty query
    let terms = parse_query_terms(query);
    if terms.is_empty() {
        return serde_json::to_string_pretty(&json!({
            "query": query,
            "count": 0,
            "results": [],
            "error": "Empty search query"
        }))
        .map_err(|e| e.to_string());
    }

    // Use core search module
    let results = search_specs(&specs, query, limit);

    serde_json::to_string_pretty(&json!({
        "query": query,
        "count": results.len(),
        "results": results
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
                }
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
                "required": ["specPath"]
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
                        "description": "Initial status (defaults to 'planned')",
                        "enum": ["planned", "in-progress"]
                    },
                    "priority": {
                        "type": "string",
                        "description": "Priority level (defaults to 'medium')",
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
                    },
                    "parent": {
                        "type": "string",
                        "description": "Parent umbrella spec path or number"
                    },
                    "dependsOn": {
                        "type": "array",
                        "items": { "type": "string" },
                        "description": "Specs this new spec depends on (blocking dependencies)"
                    }
                },
                "required": ["name"]
            }),
        },
        ToolDefinition {
            name: "update".to_string(),
            description: "Update a spec's metadata and/or content. Use replacements for surgical edits. When setting status to 'complete', verifies checklist items unless force=true.".to_string(),
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
                    "replacements": {
                        "type": "array",
                        "description": "String replacements (preferred). Include context lines for unique matching.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "oldString": { "type": "string", "description": "Exact text to find" },
                                "newString": { "type": "string", "description": "Replacement text" },
                                "matchMode": {
                                    "type": "string",
                                    "enum": ["unique", "all", "first"],
                                    "description": "unique=error if multiple matches, all=replace all, first=first only (defaults to 'unique')"
                                }
                            },
                            "required": ["oldString", "newString"]
                        }
                    },
                    "sectionUpdates": {
                        "type": "array",
                        "description": "Replace or append/prepend content in a section by heading.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "section": { "type": "string", "description": "Section heading to find" },
                                "content": { "type": "string", "description": "New content for section" },
                                "mode": {
                                    "type": "string",
                                    "enum": ["replace", "append", "prepend"],
                                    "description": "Section update mode (defaults to 'replace')"
                                }
                            },
                            "required": ["section", "content"]
                        }
                    },
                    "checklistToggles": {
                        "type": "array",
                        "description": "Check or uncheck checklist items (partial match).",
                        "items": {
                            "type": "object",
                            "properties": {
                                "itemText": { "type": "string" },
                                "checked": { "type": "boolean" }
                            },
                            "required": ["itemText", "checked"]
                        }
                    },
                    "content": {
                        "type": "string",
                        "description": "Full body replacement (frontmatter preserved); other content ops ignored"
                    },
                    "expectedContentHash": {
                        "type": "string",
                        "description": "Optimistic concurrency check for content updates"
                    },
                    "force": {
                        "type": "boolean",
                        "description": "Skip completion verification when setting status to complete (defaults to false)"
                    }
                },
                "required": ["specPath"]
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
                        "type": "number",
                        "description": "Maximum results (defaults to 10)"
                    }
                },
                "required": ["query"]
            }),
        },
    ]
}
