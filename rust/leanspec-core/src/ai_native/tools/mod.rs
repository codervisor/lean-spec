//! LeanSpec AI tools (native)

use std::collections::HashMap;
use std::sync::Arc;

use async_openai::types::chat::{ChatCompletionTool, ChatCompletionTools, FunctionObject};
use regex::Regex;
use schemars::schema_for;
use schemars::JsonSchema;
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::ai_native::error::AiError;

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
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListSpecsInput {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchSpecsInput {
    pub project_id: Option<String>,
    pub query: String,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SpecIdInput {
    pub project_id: Option<String>,
    pub spec_id: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpecStatusInput {
    pub project_id: Option<String>,
    pub spec_id: String,
    pub status: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct LinkSpecsInput {
    pub project_id: Option<String>,
    pub spec_id: String,
    pub depends_on: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ValidateSpecsInput {
    pub project_id: Option<String>,
    pub spec_id: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpecInput {
    pub project_id: Option<String>,
    pub spec_id: String,
    pub content: String,
    pub expected_content_hash: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpecSectionInput {
    pub project_id: Option<String>,
    pub spec_id: String,
    pub section: String,
    pub content: String,
    pub mode: Option<String>,
    pub expected_content_hash: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ToggleChecklistInput {
    pub project_id: Option<String>,
    pub spec_id: String,
    pub item_text: String,
    pub checked: bool,
    pub expected_content_hash: Option<String>,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct SubSpecInput {
    pub project_id: Option<String>,
    pub spec_id: String,
    pub file: String,
}

#[derive(Debug, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubSpecInput {
    pub project_id: Option<String>,
    pub spec_id: String,
    pub file: String,
    pub content: String,
    pub expected_content_hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecRawResponse {
    pub content: String,
    pub content_hash: String,
}

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

fn get_subspec_raw(
    base_url: &str,
    project_id: &str,
    spec_id: &str,
    file: &str,
) -> Result<SpecRawResponse, String> {
    let url = format!(
        "{}/api/projects/{}/specs/{}/subspecs/{}/raw",
        normalize_base_url(base_url),
        urlencoding::encode(project_id),
        urlencoding::encode(spec_id),
        urlencoding::encode(file)
    );
    let value = fetch_json("GET", &url, None)?;
    serde_json::from_value(value).map_err(|e| e.to_string())
}

fn update_subspec_raw(
    base_url: &str,
    project_id: &str,
    spec_id: &str,
    file: &str,
    content: &str,
    expected: Option<String>,
) -> Result<Value, String> {
    let url = format!(
        "{}/api/projects/{}/specs/{}/subspecs/{}/raw",
        normalize_base_url(base_url),
        urlencoding::encode(project_id),
        urlencoding::encode(spec_id),
        urlencoding::encode(file)
    );
    let mut body = serde_json::json!({ "content": content });
    if let Some(expected) = expected {
        body["expectedContentHash"] = Value::String(expected);
    }
    fetch_json("PATCH", &url, Some(body))
}

fn split_frontmatter(content: &str) -> (Option<String>, String) {
    let re = regex::Regex::new(r"(?s)^---\s*\n(.*?)\n---\s*\n?").unwrap();
    if let Some(caps) = re.captures(content) {
        let full = caps.get(0).map(|m| m.as_str()).unwrap_or("");
        let frontmatter = full.trim_end().to_string();
        let body = content[full.len()..].to_string();
        (Some(frontmatter), body)
    } else {
        (None, content.to_string())
    }
}

fn rebuild_content(frontmatter: Option<String>, body: &str) -> String {
    if let Some(frontmatter) = frontmatter {
        let trimmed = body.trim_start_matches('\n');
        format!("{}\n{}", frontmatter, trimmed)
    } else {
        body.to_string()
    }
}

fn update_section(
    body: &str,
    section: &str,
    new_content: &str,
    mode: &str,
) -> Result<String, String> {
    let mut lines: Vec<String> = body.lines().map(|l| l.to_string()).collect();
    let target = section.trim().to_lowercase();
    let mut start: Option<usize> = None;
    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if let Some(stripped) = trimmed.strip_prefix("## ") {
            let title = stripped.trim().to_lowercase();
            if title == target {
                start = Some(i + 1);
                break;
            }
        }
    }

    let start = start.ok_or_else(|| format!("Section not found: {}", section))?;
    let mut end = lines.len();
    for (i, line) in lines.iter().enumerate().skip(start) {
        if line.trim().starts_with("## ") {
            end = i;
            break;
        }
    }

    let mut updated_lines: Vec<String> = if new_content.trim().is_empty() {
        Vec::new()
    } else {
        new_content.trim().lines().map(|l| l.to_string()).collect()
    };

    if mode == "append" {
        lines.splice(
            end..end,
            std::iter::once(String::new())
                .chain(updated_lines.drain(..))
                .chain(std::iter::once(String::new())),
        );
    } else {
        let mut insert = vec![String::new()];
        insert.append(&mut updated_lines);
        insert.push(String::new());
        lines.splice(start..end, insert);
    }

    Ok(lines.join("\n"))
}

fn toggle_checklist_item_in_body(
    body: &str,
    item_text: &str,
    checked: bool,
) -> Result<String, String> {
    let mut lines: Vec<String> = body.lines().map(|l| l.to_string()).collect();
    let target = item_text.trim().to_lowercase();

    let index = lines
        .iter()
        .position(|line| {
            let normalized = line.trim().to_lowercase();
            (normalized.starts_with("- [ ]")
                || normalized.starts_with("- [x]")
                || normalized.starts_with("- [X]"))
                && normalized.contains(&target)
        })
        .ok_or_else(|| format!("Checklist item not found: {}", item_text))?;

    let line = lines[index].clone();
    let updated = Regex::new(r"- \[[ xX]\]")
        .map_err(|e| e.to_string())?
        .replace(&line, if checked { "- [x]" } else { "- [ ]" });
    lines[index] = updated.to_string();

    Ok(lines.join("\n"))
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

pub fn build_tools(context: ToolContext) -> Result<ToolRegistry, AiError> {
    let ToolContext {
        base_url,
        project_id,
    } = context;

    let mut tools: Vec<ChatCompletionTools> = Vec::new();
    let mut executors: HashMap<String, ToolExecutor> = HashMap::new();

    let base_url_list = base_url.clone();
    let project_id_list = project_id.clone();
    let (list_specs_tool, list_specs_exec) = make_tool::<_, ListSpecsInput>(
        "list_specs",
        "List specs with optional filters",
        move |value| {
            let params: ListSpecsInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_list)?;
            let mut url = format!(
                "{}/api/projects/{}/specs",
                normalize_base_url(&base_url_list),
                urlencoding::encode(&project_id)
            );
            let mut query = Vec::new();
            if let Some(status) = params.status {
                query.push(format!("status={}", urlencoding::encode(&status)));
            }
            if let Some(priority) = params.priority {
                query.push(format!("priority={}", urlencoding::encode(&priority)));
            }
            if let Some(tags) = params.tags {
                if !tags.is_empty() {
                    query.push(format!("tags={}", urlencoding::encode(&tags.join(","))));
                }
            }
            if !query.is_empty() {
                url.push('?');
                url.push_str(&query.join("&"));
            }
            let value = fetch_json("GET", &url, None)?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        },
    )?;
    tools.push(list_specs_tool);
    executors.insert("list_specs".to_string(), list_specs_exec);

    let base_url_search = base_url.clone();
    let project_id_search = project_id.clone();
    let (search_specs_tool, search_specs_exec) =
        make_tool::<_, SearchSpecsInput>("search_specs", "Search specs by query", move |value| {
            let params: SearchSpecsInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_search)?;
            let url = format!(
                "{}/api/projects/{}/search",
                normalize_base_url(&base_url_search),
                urlencoding::encode(&project_id)
            );
            let body = serde_json::json!({
                "query": params.query,
                "filters": {
                    "status": params.status,
                    "priority": params.priority,
                    "tags": params.tags,
                }
            });
            let value = fetch_json("POST", &url, Some(body))?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        })?;
    tools.push(search_specs_tool);
    executors.insert("search_specs".to_string(), search_specs_exec);

    let base_url_get = base_url.clone();
    let project_id_get = project_id.clone();
    let (get_spec_tool, get_spec_exec) =
        make_tool::<_, SpecIdInput>("get_spec", "Get a spec by name or number", move |value| {
            let params: SpecIdInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_get)?;
            let url = format!(
                "{}/api/projects/{}/specs/{}",
                normalize_base_url(&base_url_get),
                urlencoding::encode(&project_id),
                urlencoding::encode(&params.spec_id)
            );
            let value = fetch_json("GET", &url, None)?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        })?;
    tools.push(get_spec_tool);
    executors.insert("get_spec".to_string(), get_spec_exec);

    let base_url_status = base_url.clone();
    let project_id_status = project_id.clone();
    let (update_spec_status_tool, update_spec_status_exec) = make_tool::<_, UpdateSpecStatusInput>(
        "update_spec_status",
        "Update spec status",
        move |value| {
            let params: UpdateSpecStatusInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_status)?;
            let url = format!(
                "{}/api/projects/{}/specs/{}/status",
                normalize_base_url(&base_url_status),
                urlencoding::encode(&project_id),
                urlencoding::encode(&params.spec_id)
            );
            let body = serde_json::json!({ "status": params.status });
            let value = fetch_json("POST", &url, Some(body))?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        },
    )?;
    tools.push(update_spec_status_tool);
    executors.insert("update_spec_status".to_string(), update_spec_status_exec);

    let base_url_link = base_url.clone();
    let project_id_link = project_id.clone();
    let (link_specs_tool, link_specs_exec) =
        make_tool::<_, LinkSpecsInput>("link_specs", "Link spec dependency", move |value| {
            let params: LinkSpecsInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_link)?;
            let url = format!(
                "{}/api/projects/{}/specs/{}/dependencies",
                normalize_base_url(&base_url_link),
                urlencoding::encode(&project_id),
                urlencoding::encode(&params.spec_id)
            );
            let body = serde_json::json!({ "dependsOn": params.depends_on });
            let value = fetch_json("POST", &url, Some(body))?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        })?;
    tools.push(link_specs_tool);
    executors.insert("link_specs".to_string(), link_specs_exec);

    let base_url_unlink = base_url.clone();
    let project_id_unlink = project_id.clone();
    let (unlink_specs_tool, unlink_specs_exec) =
        make_tool::<_, LinkSpecsInput>("unlink_specs", "Remove spec dependency", move |value| {
            let params: LinkSpecsInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_unlink)?;
            let url = format!(
                "{}/api/projects/{}/specs/{}/dependencies/{}",
                normalize_base_url(&base_url_unlink),
                urlencoding::encode(&project_id),
                urlencoding::encode(&params.spec_id),
                urlencoding::encode(&params.depends_on)
            );
            let value = fetch_json("DELETE", &url, None)?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        })?;
    tools.push(unlink_specs_tool);
    executors.insert("unlink_specs".to_string(), unlink_specs_exec);

    let base_url_validate = base_url.clone();
    let project_id_validate = project_id.clone();
    let (validate_specs_tool, validate_specs_exec) = make_tool::<_, ValidateSpecsInput>(
        "validate_specs",
        "Validate all specs or a single spec",
        move |value| {
            let params: ValidateSpecsInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_validate)?;
            let url = format!(
                "{}/api/projects/{}/validate",
                normalize_base_url(&base_url_validate),
                urlencoding::encode(&project_id)
            );
            let body = params
                .spec_id
                .map(|spec_id| serde_json::json!({ "specId": spec_id }))
                .unwrap_or_else(|| serde_json::json!({}));
            let value = fetch_json("POST", &url, Some(body))?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        },
    )?;
    tools.push(validate_specs_tool);
    executors.insert("validate_specs".to_string(), validate_specs_exec);

    let base_url_read = base_url.clone();
    let project_id_read = project_id.clone();
    let (read_spec_tool, read_spec_exec) =
        make_tool::<_, SpecIdInput>("read_spec", "Read raw spec content", move |value| {
            let params: SpecIdInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_read)?;
            let value = get_spec_raw(&base_url_read, &project_id, &params.spec_id)?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        })?;
    tools.push(read_spec_tool);
    executors.insert("read_spec".to_string(), read_spec_exec);

    let base_url_update = base_url.clone();
    let project_id_update = project_id.clone();
    let (update_spec_tool, update_spec_exec) = make_tool::<_, UpdateSpecInput>(
        "update_spec",
        "Update spec content with full replacement",
        move |value| {
            let params: UpdateSpecInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_update)?;
            let value = update_spec_raw(
                &base_url_update,
                &project_id,
                &params.spec_id,
                &params.content,
                params.expected_content_hash,
            )?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        },
    )?;
    tools.push(update_spec_tool);
    executors.insert("update_spec".to_string(), update_spec_exec);

    let base_url_section = base_url.clone();
    let project_id_section = project_id.clone();
    let (update_spec_section_tool, update_spec_section_exec) =
        make_tool::<_, UpdateSpecSectionInput>(
            "update_spec_section",
            "Replace or append a section in spec content",
            move |value| {
                let params: UpdateSpecSectionInput = tool_input(value)?;
                let project_id = ensure_project_id(params.project_id, &project_id_section)?;
                let raw = get_spec_raw(&base_url_section, &project_id, &params.spec_id)?;
                let (frontmatter, body) = split_frontmatter(&raw.content);
                let mode = params.mode.unwrap_or_else(|| "replace".to_string());
                let updated_body = update_section(&body, &params.section, &params.content, &mode)?;
                let rebuilt = rebuild_content(frontmatter, &updated_body);
                let value = update_spec_raw(
                    &base_url_section,
                    &project_id,
                    &params.spec_id,
                    &rebuilt,
                    params.expected_content_hash.or(Some(raw.content_hash)),
                )?;
                serde_json::to_string(&value).map_err(|e| e.to_string())
            },
        )?;
    tools.push(update_spec_section_tool);
    executors.insert("update_spec_section".to_string(), update_spec_section_exec);

    let base_url_checklist = base_url.clone();
    let project_id_checklist = project_id.clone();
    let (toggle_checklist_item_tool, toggle_checklist_item_exec) =
        make_tool::<_, ToggleChecklistInput>(
            "toggle_checklist_item",
            "Check or uncheck a checklist item in a spec",
            move |value| {
                let params: ToggleChecklistInput = tool_input(value)?;
                let project_id = ensure_project_id(params.project_id, &project_id_checklist)?;
                let raw = get_spec_raw(&base_url_checklist, &project_id, &params.spec_id)?;
                let (frontmatter, body) = split_frontmatter(&raw.content);
                let updated =
                    toggle_checklist_item_in_body(&body, &params.item_text, params.checked)?;
                let rebuilt = rebuild_content(frontmatter, &updated);
                let value = update_spec_raw(
                    &base_url_checklist,
                    &project_id,
                    &params.spec_id,
                    &rebuilt,
                    params.expected_content_hash.or(Some(raw.content_hash)),
                )?;
                serde_json::to_string(&value).map_err(|e| e.to_string())
            },
        )?;
    tools.push(toggle_checklist_item_tool);
    executors.insert(
        "toggle_checklist_item".to_string(),
        toggle_checklist_item_exec,
    );

    let base_url_subspec = base_url.clone();
    let project_id_subspec = project_id.clone();
    let (read_subspec_tool, read_subspec_exec) = make_tool::<_, SubSpecInput>(
        "read_subspec",
        "Read raw content of a sub-spec file",
        move |value| {
            let params: SubSpecInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_subspec)?;
            let value = get_subspec_raw(
                &base_url_subspec,
                &project_id,
                &params.spec_id,
                &params.file,
            )?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        },
    )?;
    tools.push(read_subspec_tool);
    executors.insert("read_subspec".to_string(), read_subspec_exec);

    let base_url_update_subspec = base_url.clone();
    let project_id_update_subspec = project_id.clone();
    let (update_subspec_tool, update_subspec_exec) = make_tool::<_, UpdateSubSpecInput>(
        "update_subspec",
        "Update raw content of a sub-spec file",
        move |value| {
            let params: UpdateSubSpecInput = tool_input(value)?;
            let project_id = ensure_project_id(params.project_id, &project_id_update_subspec)?;
            let value = update_subspec_raw(
                &base_url_update_subspec,
                &project_id,
                &params.spec_id,
                &params.file,
                &params.content,
                params.expected_content_hash,
            )?;
            serde_json::to_string(&value).map_err(|e| e.to_string())
        },
    )?;
    tools.push(update_subspec_tool);
    executors.insert("update_subspec".to_string(), update_subspec_exec);

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
        let value = serde_json::json!({ "projectId": "test", "specId": "123" });
        let result: Result<SpecIdInput, _> = tool_input(value);
        assert!(result.is_ok());
        let input = result.unwrap();
        assert_eq!(input.spec_id, "123");
    }

    #[test]
    fn test_split_frontmatter_with_frontmatter() {
        let content = "---\ntitle: Test\n---\n\n# Body";
        let (fm, body) = split_frontmatter(content);
        assert!(fm.is_some());
        assert!(body.contains("# Body"));
    }

    #[test]
    fn test_split_frontmatter_without_frontmatter() {
        let content = "# Just Body";
        let (fm, body) = split_frontmatter(content);
        assert!(fm.is_none());
        assert_eq!(body, "# Just Body");
    }

    #[test]
    fn test_rebuild_content_with_frontmatter() {
        let frontmatter = Some("---\ntitle: Test\n---".to_string());
        let body = "# Header\nContent";
        let result = rebuild_content(frontmatter, body);
        assert!(result.contains("---"));
        assert!(result.contains("# Header"));
    }

    #[test]
    fn test_rebuild_content_without_frontmatter() {
        let result = rebuild_content(None, "# Header");
        assert_eq!(result, "# Header");
    }

    #[test]
    fn test_update_section_replace() {
        let body = "# Title\n\n## Section A\nContent A\n\n## Section B\nContent B";
        let result = update_section(body, "Section A", "New Content", "replace");
        assert!(result.is_ok());
        let updated = result.unwrap();
        assert!(updated.contains("New Content"));
        assert!(!updated.contains("Content A"));
    }

    #[test]
    fn test_update_section_append() {
        let body = "# Title\n\n## Section A\nContent A";
        let result = update_section(body, "Section A", "New Content", "append");
        assert!(result.is_ok());
        let updated = result.unwrap();
        assert!(updated.contains("Content A"));
        assert!(updated.contains("New Content"));
    }

    #[test]
    fn test_update_section_not_found() {
        let body = "# Title\n\n## Section A\nContent A";
        let result = update_section(body, "NonExistent", "Content", "replace");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Section not found"));
    }

    #[test]
    fn test_toggle_checklist_item_check() {
        let body = "- [ ] Item 1\n- [ ] Item 2";
        let result = toggle_checklist_item_in_body(body, "Item 1", true);
        assert!(result.is_ok());
        let updated = result.unwrap();
        assert!(updated.contains("- [x] Item 1"));
        assert!(updated.contains("- [ ] Item 2"));
    }

    #[test]
    fn test_toggle_checklist_item_uncheck() {
        let body = "- [x] Item 1\n- [x] Item 2";
        let result = toggle_checklist_item_in_body(body, "Item 2", false);
        assert!(result.is_ok());
        let updated = result.unwrap();
        assert!(updated.contains("- [x] Item 1"));
        assert!(updated.contains("- [ ] Item 2"));
    }

    #[test]
    fn test_toggle_checklist_item_not_found() {
        let body = "- [ ] Item 1";
        let result = toggle_checklist_item_in_body(body, "NonExistent", true);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Checklist item not found"));
    }

    #[test]
    fn test_toggle_checklist_item_case_insensitive() {
        let body = "- [ ] ITEM ONE";
        let result = toggle_checklist_item_in_body(body, "item one", true);
        assert!(result.is_ok());
        assert!(result.unwrap().contains("- [x] ITEM ONE"));
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
    fn test_build_tools_empty_context() {
        let context = ToolContext {
            base_url: "http://localhost:3000".to_string(),
            project_id: None,
        };
        let registry = build_tools(context);
        assert!(registry.is_ok());
        let reg = registry.unwrap();
        assert!(!reg.tools().is_empty());
        assert_eq!(reg.tools().len(), 13);
    }

    #[test]
    fn test_list_specs_input_schema() {
        let schema = schema_for!(ListSpecsInput);
        let schema_json = serde_json::to_value(&schema).unwrap();
        assert!(schema_json.get("properties").is_some());
    }

    #[test]
    fn test_search_specs_input_schema() {
        let schema = schema_for!(SearchSpecsInput);
        let schema_json = serde_json::to_value(&schema).unwrap();
        assert!(schema_json.get("properties").is_some());
        assert!(schema_json["properties"].get("query").is_some());
    }
}
