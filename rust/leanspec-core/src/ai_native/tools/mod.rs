//! LeanSpec AI tools (native)
//!
//! Tool names and schemas mirror the MCP server tools exactly.
//! The AI chat uses HTTP API calls while MCP operates on the filesystem directly.
//! `run_subagent` is the only AI-chat-specific tool.

use std::collections::HashMap;
use std::io::Write;
use std::process::Stdio;
use std::sync::Arc;

use async_openai::types::chat::{ChatCompletionTool, ChatCompletionTools, FunctionObject};
use schemars::schema_for;
use schemars::JsonSchema;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::ai_native::error::AiError;
use crate::ai_native::runner_config::{resolve_runner_config, ResolvedRunnerConfig};
use crate::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, preserve_title_heading,
    rebuild_content, split_frontmatter, ChecklistToggle, MatchMode, Replacement, SectionMode,
    SectionUpdate,
};

type ToolExecutor = Arc<dyn Fn(Value) -> Result<String, String> + Send + Sync + 'static>;

#[derive(Clone)]
pub struct ToolRegistry {
    tools: Vec<ChatCompletionTools>,
    executors: Arc<HashMap<String, ToolExecutor>>,
}

impl ToolRegistry {
    pub fn tools(&self) -> &[ChatCompletionTools] {
        &self.tools
    }

    pub fn execute(&self, name: &str, input: Value) -> Result<String, AiError> {
        let executor = self
            .executors
            .get(name)
            .ok_or_else(|| AiError::Tool(format!("Unknown tool: {}", name)))?;
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

// ---------------------------------------------------------------------------
// Input structs — aligned 1:1 with MCP tool schemas
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListInput {
    pub project_id: Option<String>,
    /// Filter by status: planned, in-progress, complete, archived
    pub status: Option<String>,
    /// Filter by tags (spec must have ALL specified tags)
    pub tags: Option<Vec<String>>,
    /// Filter by priority: low, medium, high, critical
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ViewInput {
    pub project_id: Option<String>,
    /// Spec path or number (e.g., '170' or '170-cli-mcp')
    pub spec_path: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CreateInput {
    pub project_id: Option<String>,
    /// Short spec name in kebab-case (e.g., 'my-feature'). Number is auto-generated.
    pub name: String,
    /// Human-readable title
    pub title: Option<String>,
    /// Initial status
    pub status: Option<String>,
    /// Priority level
    pub priority: Option<String>,
    /// Template name to load from .lean-spec/templates
    pub template: Option<String>,
    /// Body content (markdown sections, no frontmatter)
    pub content: Option<String>,
    /// Tags for categorization
    pub tags: Option<Vec<String>>,
    /// Parent umbrella spec path or number
    pub parent: Option<String>,
    /// Specs this new spec depends on (blocking dependencies)
    pub depends_on: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReplacementInput {
    /// Exact text to find
    pub old_string: String,
    /// Replacement text
    pub new_string: String,
    /// unique=error if multiple matches, all=replace all, first=first only
    pub match_mode: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SectionUpdateInput {
    /// Section heading to find
    pub section: String,
    /// New content for section
    pub content: String,
    /// replace, append, or prepend
    pub mode: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ChecklistToggleInput {
    pub item_text: String,
    pub checked: bool,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInput {
    pub project_id: Option<String>,
    /// Spec path or number
    pub spec_path: String,
    /// New status
    pub status: Option<String>,
    /// New priority
    pub priority: Option<String>,
    /// New assignee
    pub assignee: Option<String>,
    /// Tags to add
    pub add_tags: Option<Vec<String>>,
    /// Tags to remove
    pub remove_tags: Option<Vec<String>>,
    /// String replacements (preferred). Include context lines for unique matching.
    pub replacements: Option<Vec<ReplacementInput>>,
    /// Replace or append/prepend content in a section by heading.
    pub section_updates: Option<Vec<SectionUpdateInput>>,
    /// Check or uncheck checklist items (partial match).
    pub checklist_toggles: Option<Vec<ChecklistToggleInput>>,
    /// Full body replacement (frontmatter preserved); other content ops ignored
    pub content: Option<String>,
    /// Optimistic concurrency check for content updates
    pub expected_content_hash: Option<String>,
    /// Skip completion verification when setting status to complete
    pub force: Option<bool>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchInput {
    pub project_id: Option<String>,
    /// Search query
    pub query: String,
    /// Maximum results
    pub limit: Option<u64>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ValidateInput {
    pub project_id: Option<String>,
    /// Specific spec to validate (validates all if not provided)
    pub spec_path: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TokensInput {
    pub project_id: Option<String>,
    /// Specific spec to count (counts all specs if not provided)
    pub spec_path: Option<String>,
    /// Path to any file (markdown, code, text) to count tokens
    pub file_path: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct BoardInput {
    pub project_id: Option<String>,
    /// Group by: status, priority, assignee, tag, parent
    pub group_by: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct StatsInput {
    pub project_id: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipsInput {
    pub project_id: Option<String>,
    /// Spec path or number
    pub spec_path: String,
    /// Action to perform: view, add, remove
    pub action: Option<String>,
    /// Relationship type: parent, child, depends_on
    #[serde(rename = "type")]
    pub rel_type: Option<String>,
    /// Target spec path or number
    pub target: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RunSubagentInput {
    pub project_id: Option<String>,
    pub spec_id: Option<String>,
    pub runner_id: Option<String>,
    pub task: String,
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecRawResponse {
    pub content: String,
    pub content_hash: String,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn tool_input<T: DeserializeOwned>(value: Value) -> Result<T, String> {
    serde_json::from_value(value).map_err(|e| e.to_string())
}

fn ensure_project_id(input: Option<String>, fallback: &Option<String>) -> Result<String, String> {
    input
        .or_else(|| fallback.clone())
        .ok_or_else(|| "projectId is required for LeanSpec operations".to_string())
}

fn normalize_base_url(base_url: &str) -> String {
    base_url.trim_end_matches('/').to_string()
}

fn fetch_json(method: &str, url: &str, body: Option<Value>) -> Result<Value, String> {
    let client = reqwest::blocking::Client::new();
    let mut request = match method {
        "GET" => client.get(url),
        "POST" => client.post(url),
        "PATCH" => client.patch(url),
        "PUT" => client.put(url),
        "DELETE" => client.delete(url),
        _ => return Err(format!("Unsupported HTTP method: {}", method)),
    };

    if let Some(body) = body {
        request = request.json(&body);
    }

    let response = request.send().map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        return Err(format!("LeanSpec API error ({}): {}", status, text));
    }

    response.json::<Value>().map_err(|e| e.to_string())
}

fn get_spec_raw(
    base_url: &str,
    project_id: &str,
    spec_id: &str,
) -> Result<SpecRawResponse, String> {
    let url = format!(
        "{}/api/projects/{}/specs/{}/raw",
        normalize_base_url(base_url),
        urlencoding::encode(project_id),
        urlencoding::encode(spec_id)
    );
    let value = fetch_json("GET", &url, None)?;
    serde_json::from_value(value).map_err(|e| e.to_string())
}

fn update_spec_raw(
    base_url: &str,
    project_id: &str,
    spec_id: &str,
    content: &str,
    expected: Option<String>,
) -> Result<Value, String> {
    let url = format!(
        "{}/api/projects/{}/specs/{}/raw",
        normalize_base_url(base_url),
        urlencoding::encode(project_id),
        urlencoding::encode(spec_id)
    );
    let mut body = serde_json::json!({ "content": content });
    if let Some(expected) = expected {
        body["expectedContentHash"] = Value::String(expected);
    }
    fetch_json("PATCH", &url, Some(body))
}

fn run_subagent_task(
    runner_config: &ResolvedRunnerConfig,
    project_path: &str,
    spec_id: Option<String>,
    task: &str,
) -> Result<serde_json::Value, String> {
    let command = runner_config
        .command
        .as_ref()
        .ok_or_else(|| format!("Runner '{}' is not runnable", runner_config.id))?;

    let mut cmd = std::process::Command::new(command);
    cmd.args(&runner_config.args)
        .current_dir(project_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .envs(&runner_config.env);

    if let Some(spec_id) = spec_id {
        cmd.env("LEANSPEC_SPEC_ID", spec_id);
    }

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    if let Some(stdin) = child.stdin.as_mut() {
        stdin
            .write_all(task.as_bytes())
            .map_err(|e| e.to_string())?;
    }

    let output = child.wait_with_output().map_err(|e| e.to_string())?;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    Ok(serde_json::json!({
        "runnerId": runner_config.id,
        "exitCode": output.status.code(),
        "stdout": stdout,
        "stderr": stderr,
    }))
}

fn parse_replacements(inputs: &[ReplacementInput]) -> Result<Vec<Replacement>, String> {
    inputs
        .iter()
        .map(|r| {
            let match_mode = match r.match_mode.as_deref().unwrap_or("unique") {
                "unique" => MatchMode::Unique,
                "all" => MatchMode::All,
                "first" => MatchMode::First,
                other => return Err(format!("Invalid matchMode: {}", other)),
            };
            Ok(Replacement {
                old_string: r.old_string.clone(),
                new_string: r.new_string.clone(),
                match_mode,
            })
        })
        .collect()
}

fn parse_section_updates(inputs: &[SectionUpdateInput]) -> Result<Vec<SectionUpdate>, String> {
    inputs
        .iter()
        .map(|s| {
            let mode = match s.mode.as_deref().unwrap_or("replace") {
                "replace" => SectionMode::Replace,
                "append" => SectionMode::Append,
                "prepend" => SectionMode::Prepend,
                other => return Err(format!("Invalid section mode: {}", other)),
            };
            Ok(SectionUpdate {
                section: s.section.clone(),
                content: s.content.clone(),
                mode,
            })
        })
        .collect()
}

fn parse_checklist_toggles(inputs: &[ChecklistToggleInput]) -> Vec<ChecklistToggle> {
    inputs
        .iter()
        .map(|c| ChecklistToggle {
            item_text: c.item_text.clone(),
            checked: c.checked,
        })
        .collect()
}

fn make_tool<F, I>(
    name: &str,
    description: &str,
    execute: F,
) -> Result<(ChatCompletionTools, ToolExecutor), AiError>
where
    F: Fn(Value) -> Result<String, String> + Send + Sync + 'static,
    I: JsonSchema,
{
    let schema = schema_for!(I);
    let params =
        serde_json::to_value(&schema).map_err(|e| AiError::Serialization(e.to_string()))?;
    let tool = ChatCompletionTools::Function(ChatCompletionTool {
        function: FunctionObject {
            name: name.to_string(),
            description: Some(description.to_string()),
            parameters: Some(params),
            strict: None,
        },
    });

    Ok((tool, Arc::new(execute)))
}

// ---------------------------------------------------------------------------
// Tool registry builder
// ---------------------------------------------------------------------------

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

    // ── view ──────────────────────────────────────────────────────────────
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

    // ── create ────────────────────────────────────────────────────────────
    let bu = base_url.clone();
    let pid = project_id.clone();
    let (tool, exec) = make_tool::<_, CreateInput>("create", "Create a new spec", move |value| {
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

    // ── update (consolidated) ─────────────────────────────────────────────
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

    // ── search ────────────────────────────────────────────────────────────
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

    // ── validate ──────────────────────────────────────────────────────────
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

    // ── tokens ────────────────────────────────────────────────────────────
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
                // No spec specified - return stats which include token overview
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

    // ── board ─────────────────────────────────────────────────────────────
    let bu = base_url.clone();
    let pid = project_id.clone();
    let (tool, exec) = make_tool::<_, BoardInput>(
        "board",
        "Show project board view grouped by status, priority, or assignee",
        move |value| {
            let p: BoardInput = tool_input(value)?;
            let project_id = ensure_project_id(p.project_id, &pid)?;
            let group_by = p.group_by.as_deref().unwrap_or("status");

            // Fetch all specs via list endpoint
            let url = format!(
                "{}/api/projects/{}/specs",
                normalize_base_url(&bu),
                urlencoding::encode(&project_id)
            );
            let list_value = fetch_json("GET", &url, None)?;

            // Group client-side
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

    // ── stats ─────────────────────────────────────────────────────────────
    let bu = base_url.clone();
    let pid = project_id.clone();
    let (tool, exec) =
        make_tool::<_, StatsInput>("stats", "Show spec statistics and insights", move |value| {
            let p: StatsInput = tool_input(value)?;
            let project_id = ensure_project_id(p.project_id, &pid)?;
            let url = format!(
                "{}/api/projects/{}/stats",
                normalize_base_url(&bu),
                urlencoding::encode(&project_id)
            );
            let v = fetch_json("GET", &url, None)?;
            serde_json::to_string(&v).map_err(|e| e.to_string())
        })?;
    tools.push(tool);
    executors.insert("stats".to_string(), exec);

    // ── relationships ─────────────────────────────────────────────────────
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

                    // Also fetch the dependency graph for required_by info
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
                                    e.get("target").and_then(|v| v.as_str()) == Some(spec_path_str)
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

    // ── run_subagent (AI chat only) ───────────────────────────────────────
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

    Ok(ToolRegistry {
        tools,
        executors: Arc::new(executors),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let registry = ToolRegistry {
            tools: vec![],
            executors: Arc::new(HashMap::new()),
        };
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
