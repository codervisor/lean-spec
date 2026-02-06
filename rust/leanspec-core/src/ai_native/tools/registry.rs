//! Tool registry builder — registers all LeanSpec AI tools.

use serde_json::Value;
use std::collections::HashMap;

use crate::ai_native::error::AiError;
use crate::ai_native::runner_config::resolve_runner_config;
use crate::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, preserve_title_heading,
    rebuild_content, split_frontmatter,
};

use super::helpers::*;
use super::inputs::*;
use super::{ToolContext, ToolExecutor, ToolRegistry};

use async_openai::types::chat::ChatCompletionTools;

pub fn build_tools(context: ToolContext) -> Result<ToolRegistry, AiError> {
    let ToolContext {
        base_url,
        project_id,
        project_path,
        runner_config,
    } = context;

    let mut tools: Vec<ChatCompletionTools> = Vec::new();
    let mut executors: HashMap<String, ToolExecutor> = HashMap::new();

    // ── list ───────────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, ListInput>(
            "list",
            "List all specs with optional filtering by status, tags, or priority",
            move |value| {
                let p: ListInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let mut url = format!(
                    "{}/api/projects/{}/specs",
                    normalize_base_url(&bu),
                    urlencoding::encode(&project_id)
                );
                let mut q = Vec::new();
                if let Some(status) = p.status {
                    q.push(format!("status={}", urlencoding::encode(&status)));
                }
                if let Some(priority) = p.priority {
                    q.push(format!("priority={}", urlencoding::encode(&priority)));
                }
                if let Some(tags) = p.tags {
                    if !tags.is_empty() {
                        q.push(format!("tags={}", urlencoding::encode(&tags.join(","))));
                    }
                }
                if !q.is_empty() {
                    url.push('?');
                    url.push_str(&q.join("&"));
                }
                let v = fetch_json("GET", &url, None)?;
                serde_json::to_string(&v).map_err(|e| e.to_string())
            },
        )?;
        tools.push(tool);
        executors.insert("list".to_string(), exec);
    }

    // ── view ──────────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, ViewInput>(
            "view",
            "View a spec's full content and metadata",
            move |value| {
                let p: ViewInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let url = format!(
                    "{}/api/projects/{}/specs/{}",
                    normalize_base_url(&bu),
                    urlencoding::encode(&project_id),
                    urlencoding::encode(&p.spec_path)
                );
                let v = fetch_json("GET", &url, None)?;
                serde_json::to_string(&v).map_err(|e| e.to_string())
            },
        )?;
        tools.push(tool);
        executors.insert("view".to_string(), exec);
    }

    // ── create ────────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) =
            make_tool::<_, CreateInput>("create", "Create a new spec", move |value| {
                let p: CreateInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let url = format!(
                    "{}/api/projects/{}/specs",
                    normalize_base_url(&bu),
                    urlencoding::encode(&project_id)
                );
                let mut body = serde_json::json!({ "name": p.name });
                if let Some(v) = p.title {
                    body["title"] = Value::String(v);
                }
                if let Some(v) = p.status {
                    body["status"] = Value::String(v);
                }
                if let Some(v) = p.priority {
                    body["priority"] = Value::String(v);
                }
                if let Some(v) = p.template {
                    body["template"] = Value::String(v);
                }
                if let Some(v) = p.content {
                    body["content"] = Value::String(v);
                }
                if let Some(v) = p.tags {
                    body["tags"] = serde_json::json!(v);
                }
                if let Some(v) = p.parent {
                    body["parent"] = Value::String(v);
                }
                if let Some(v) = p.depends_on {
                    body["dependsOn"] = serde_json::json!(v);
                }
                let v = fetch_json("POST", &url, Some(body))?;
                serde_json::to_string(&v).map_err(|e| e.to_string())
            })?;
        tools.push(tool);
        executors.insert("create".to_string(), exec);
    }

    // ── update (consolidated) ─────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, UpdateInput>(
            "update",
            "Update a spec's metadata and/or content. Use replacements for surgical edits. When setting status to 'complete', verifies checklist items unless force=true.",
            move |value| {
                let p: UpdateInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;

                let has_content_ops = p.content.is_some()
                    || p.replacements.as_ref().is_some_and(|r| !r.is_empty())
                    || p.section_updates.as_ref().is_some_and(|s| !s.is_empty())
                    || p.checklist_toggles.as_ref().is_some_and(|c| !c.is_empty());

                let has_metadata = p.status.is_some()
                    || p.priority.is_some()
                    || p.assignee.is_some()
                    || p.add_tags.as_ref().is_some_and(|t| !t.is_empty())
                    || p.remove_tags.as_ref().is_some_and(|t| !t.is_empty());

                if !has_content_ops && !has_metadata {
                    return Ok("No updates specified".to_string());
                }

                let mut results = Vec::new();

                // Content updates via read-modify-write on raw endpoint
                if has_content_ops {
                    let raw = get_spec_raw(&bu, &project_id, &p.spec_path)?;
                    let (frontmatter, body) = split_frontmatter(&raw.content);
                    let mut updated_body = body.clone();

                    if let Some(new_content) = &p.content {
                        updated_body = preserve_title_heading(&body, new_content);
                        results.push("content replaced".to_string());
                    } else {
                        if let Some(ref repls) = p.replacements {
                            if !repls.is_empty() {
                                let parsed = parse_replacements(repls)?;
                                let (new_body, rep_results) =
                                    apply_replacements(&updated_body, &parsed)?;
                                updated_body = new_body;
                                results.push(format!("{} replacement(s)", rep_results.len()));
                            }
                        }
                        if let Some(ref sections) = p.section_updates {
                            if !sections.is_empty() {
                                let parsed = parse_section_updates(sections)?;
                                updated_body = apply_section_updates(&updated_body, &parsed)?;
                                results.push(format!("{} section update(s)", sections.len()));
                            }
                        }
                        if let Some(ref toggles) = p.checklist_toggles {
                            if !toggles.is_empty() {
                                let parsed = parse_checklist_toggles(toggles);
                                let (new_body, toggle_results) =
                                    apply_checklist_toggles(&updated_body, &parsed)?;
                                updated_body = new_body;
                                results.push(format!("{} toggle(s)", toggle_results.len()));
                            }
                        }
                    }

                    let rebuilt = rebuild_content(frontmatter, &updated_body);
                    update_spec_raw(
                        &bu,
                        &project_id,
                        &p.spec_path,
                        &rebuilt,
                        p.expected_content_hash.or(Some(raw.content_hash)),
                    )?;
                }

                // Metadata updates via dedicated endpoint
                if has_metadata {
                    let url = format!(
                        "{}/api/projects/{}/specs/{}/metadata",
                        normalize_base_url(&bu),
                        urlencoding::encode(&project_id),
                        urlencoding::encode(&p.spec_path)
                    );
                    let mut body = serde_json::json!({});
                    if let Some(v) = &p.status {
                        body["status"] = Value::String(v.clone());
                        results.push(format!("status -> {}", v));
                    }
                    if let Some(v) = &p.priority {
                        body["priority"] = Value::String(v.clone());
                        results.push(format!("priority -> {}", v));
                    }
                    if let Some(v) = &p.assignee {
                        body["assignee"] = Value::String(v.clone());
                        results.push(format!("assignee -> {}", v));
                    }
                    if let Some(v) = &p.add_tags {
                        if !v.is_empty() {
                            body["addTags"] = serde_json::json!(v);
                        }
                    }
                    if let Some(v) = &p.remove_tags {
                        if !v.is_empty() {
                            body["removeTags"] = serde_json::json!(v);
                        }
                    }
                    if let Some(force) = p.force {
                        body["force"] = Value::Bool(force);
                    }
                    fetch_json("PATCH", &url, Some(body))?;
                }

                let summary = if results.is_empty() {
                    format!("Updated {}", p.spec_path)
                } else {
                    format!("Updated {}: {}", p.spec_path, results.join(", "))
                };
                Ok(summary)
            },
        )?;
        tools.push(tool);
        executors.insert("update".to_string(), exec);
    }

    // ── search ────────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) =
            make_tool::<_, SearchInput>("search", "Search specs by query", move |value| {
                let p: SearchInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let url = format!(
                    "{}/api/projects/{}/search",
                    normalize_base_url(&bu),
                    urlencoding::encode(&project_id)
                );
                let mut body = serde_json::json!({ "query": p.query });
                if let Some(limit) = p.limit {
                    body["limit"] = serde_json::json!(limit);
                }
                let v = fetch_json("POST", &url, Some(body))?;
                serde_json::to_string(&v).map_err(|e| e.to_string())
            })?;
        tools.push(tool);
        executors.insert("search".to_string(), exec);
    }

    // ── validate ──────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, ValidateInput>(
            "validate",
            "Validate specs for issues (frontmatter, structure, dependencies)",
            move |value| {
                let p: ValidateInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let url = format!(
                    "{}/api/projects/{}/validate",
                    normalize_base_url(&bu),
                    urlencoding::encode(&project_id)
                );
                let mut body = serde_json::json!({});
                if let Some(spec_path) = p.spec_path {
                    body["specId"] = Value::String(spec_path);
                }
                let v = fetch_json("POST", &url, Some(body))?;
                serde_json::to_string(&v).map_err(|e| e.to_string())
            },
        )?;
        tools.push(tool);
        executors.insert("validate".to_string(), exec);
    }

    // ── tokens ────────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, TokensInput>(
            "tokens",
            "Count tokens in spec(s) or any file for context economy",
            move |value| {
                let p: TokensInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                if let Some(spec_path) = p.spec_path {
                    let url = format!(
                        "{}/api/projects/{}/specs/{}/tokens",
                        normalize_base_url(&bu),
                        urlencoding::encode(&project_id),
                        urlencoding::encode(&spec_path)
                    );
                    let v = fetch_json("GET", &url, None)?;
                    serde_json::to_string(&v).map_err(|e| e.to_string())
                } else {
                    let url = format!(
                        "{}/api/projects/{}/stats",
                        normalize_base_url(&bu),
                        urlencoding::encode(&project_id)
                    );
                    let v = fetch_json("GET", &url, None)?;
                    serde_json::to_string(&v).map_err(|e| e.to_string())
                }
            },
        )?;
        tools.push(tool);
        executors.insert("tokens".to_string(), exec);
    }

    // ── board ─────────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, BoardInput>(
            "board",
            "Show project board view grouped by status, priority, or assignee",
            move |value| {
                let p: BoardInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let group_by = p.group_by.as_deref().unwrap_or("status");

                let url = format!(
                    "{}/api/projects/{}/specs",
                    normalize_base_url(&bu),
                    urlencoding::encode(&project_id)
                );
                let list_value = fetch_json("GET", &url, None)?;
                let specs = list_value.as_array().cloned().unwrap_or_default();

                let mut groups: HashMap<String, Vec<Value>> = HashMap::new();
                for spec in &specs {
                    let key = match group_by {
                        "status" => spec
                            .get("status")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown")
                            .to_string(),
                        "priority" => spec
                            .get("priority")
                            .and_then(|v| v.as_str())
                            .unwrap_or("none")
                            .to_string(),
                        "assignee" => spec
                            .get("assignee")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unassigned")
                            .to_string(),
                        "tag" => {
                            if let Some(tags) = spec.get("tags").and_then(|v| v.as_array()) {
                                for tag in tags {
                                    if let Some(t) = tag.as_str() {
                                        groups.entry(t.to_string()).or_default().push(
                                            serde_json::json!({
                                                "path": spec.get("path"),
                                                "title": spec.get("title"),
                                                "status": spec.get("status"),
                                            }),
                                        );
                                    }
                                }
                            }
                            continue;
                        }
                        "parent" => spec
                            .get("parent")
                            .and_then(|v| v.as_str())
                            .unwrap_or("(no-parent)")
                            .to_string(),
                        _ => "unknown".to_string(),
                    };
                    groups.entry(key).or_default().push(serde_json::json!({
                        "path": spec.get("path"),
                        "title": spec.get("title"),
                        "status": spec.get("status"),
                    }));
                }

                let output: Vec<_> = groups
                    .into_iter()
                    .map(|(name, specs)| {
                        serde_json::json!({
                            "name": name,
                            "count": specs.len(),
                            "specs": specs,
                        })
                    })
                    .collect();

                serde_json::to_string(&serde_json::json!({
                    "groupBy": group_by,
                    "total": specs.len(),
                    "groups": output
                }))
                .map_err(|e| e.to_string())
            },
        )?;
        tools.push(tool);
        executors.insert("board".to_string(), exec);
    }

    // ── stats ─────────────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, StatsInput>(
            "stats",
            "Show spec statistics and insights",
            move |value| {
                let p: StatsInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let url = format!(
                    "{}/api/projects/{}/stats",
                    normalize_base_url(&bu),
                    urlencoding::encode(&project_id)
                );
                let v = fetch_json("GET", &url, None)?;
                serde_json::to_string(&v).map_err(|e| e.to_string())
            },
        )?;
        tools.push(tool);
        executors.insert("stats".to_string(), exec);
    }

    // ── relationships ─────────────────────────────────────────────────────
    {
        let bu = base_url.clone();
        let pid = project_id.clone();
        let (tool, exec) = make_tool::<_, RelationshipsInput>(
            "relationships",
            "Manage spec relationships (hierarchy and dependencies)",
            move |value| {
                let p: RelationshipsInput = tool_input(value)?;
                let project_id = ensure_project_id(p.project_id, &pid)?;
                let action = p.action.as_deref().unwrap_or("view");

                match action {
                    "view" => {
                        let url = format!(
                            "{}/api/projects/{}/specs/{}",
                            normalize_base_url(&bu),
                            urlencoding::encode(&project_id),
                            urlencoding::encode(&p.spec_path)
                        );
                        let spec = fetch_json("GET", &url, None)?;

                        let deps_url = format!(
                            "{}/api/projects/{}/dependencies",
                            normalize_base_url(&bu),
                            urlencoding::encode(&project_id)
                        );
                        let deps = fetch_json("GET", &deps_url, None)?;

                        let spec_path_str = spec
                            .get("path")
                            .and_then(|v| v.as_str())
                            .unwrap_or(&p.spec_path);
                        let required_by: Vec<String> = deps
                            .get("edges")
                            .and_then(|v| v.as_array())
                            .map(|edges| {
                                edges
                                    .iter()
                                    .filter(|e| {
                                        e.get("target").and_then(|v| v.as_str())
                                            == Some(spec_path_str)
                                    })
                                    .filter_map(|e| {
                                        e.get("source").and_then(|v| v.as_str()).map(String::from)
                                    })
                                    .collect()
                            })
                            .unwrap_or_default();

                        let output = serde_json::json!({
                            "spec": {
                                "path": spec.get("path"),
                                "title": spec.get("title"),
                                "status": spec.get("status"),
                            },
                            "hierarchy": {
                                "parent": spec.get("parent"),
                                "children": spec.get("children"),
                            },
                            "dependencies": {
                                "depends_on": spec.get("dependsOn").or_else(|| spec.get("depends_on")),
                                "required_by": required_by,
                            }
                        });
                        serde_json::to_string(&output).map_err(|e| e.to_string())
                    }
                    "add" | "remove" => {
                        let rel_type = p
                            .rel_type
                            .as_deref()
                            .ok_or("Missing required parameter: type")?;
                        let target = p
                            .target
                            .as_deref()
                            .ok_or("Missing required parameter: target")?;

                        let metadata_url = format!(
                            "{}/api/projects/{}/specs/{}/metadata",
                            normalize_base_url(&bu),
                            urlencoding::encode(&project_id),
                            urlencoding::encode(if rel_type == "child" {
                                target
                            } else {
                                &p.spec_path
                            })
                        );

                        let body = match rel_type {
                            "depends_on" => {
                                if action == "add" {
                                    serde_json::json!({ "addDependsOn": [target] })
                                } else {
                                    serde_json::json!({ "removeDependsOn": [target] })
                                }
                            }
                            "parent" => {
                                if action == "add" {
                                    serde_json::json!({ "parent": target })
                                } else {
                                    serde_json::json!({ "parent": null })
                                }
                            }
                            "child" => {
                                if action == "add" {
                                    serde_json::json!({ "parent": p.spec_path })
                                } else {
                                    serde_json::json!({ "parent": null })
                                }
                            }
                            _ => return Err(format!("Invalid relationship type: {}", rel_type)),
                        };

                        fetch_json("PATCH", &metadata_url, Some(body))?;

                        let verb = if action == "add" { "Added" } else { "Removed" };
                        Ok(format!(
                            "{} {} relationship: {} <-> {}",
                            verb, rel_type, p.spec_path, target
                        ))
                    }
                    _ => Err(format!("Invalid action: {}", action)),
                }
            },
        )?;
        tools.push(tool);
        executors.insert("relationships".to_string(), exec);
    }

    // ── run_subagent (AI chat only) ───────────────────────────────────────
    {
        let context_project_path = project_path.clone();
        let context_runner_config = runner_config.clone();
        let (tool, exec) = make_tool::<_, RunSubagentInput>(
            "run_subagent",
            "Run a task via an AI runner",
            move |value| {
                let params: RunSubagentInput = tool_input(value)?;
                let project_path = context_project_path
                    .as_deref()
                    .ok_or_else(|| "projectPath is required for runner dispatch".to_string())?;
                let runner_config = if let Some(runner_id) = params.runner_id.as_deref() {
                    resolve_runner_config(Some(project_path), Some(runner_id))
                        .map_err(|e| e.to_string())?
                } else if let Some(config) = context_runner_config.clone() {
                    Some(config)
                } else {
                    resolve_runner_config(Some(project_path), None).map_err(|e| e.to_string())?
                }
                .ok_or_else(|| "Runner registry unavailable".to_string())?;

                let output =
                    run_subagent_task(&runner_config, project_path, params.spec_id, &params.task)?;
                serde_json::to_string(&output).map_err(|e| e.to_string())
            },
        )?;
        tools.push(tool);
        executors.insert("run_subagent".to_string(), exec);
    }

    Ok(ToolRegistry::new(tools, executors))
}
