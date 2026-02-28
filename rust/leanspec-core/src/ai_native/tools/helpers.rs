//! Shared helper functions for AI tool execution.

use std::io::Write;
use std::process::Stdio;
use std::sync::Arc;

use async_openai::types::chat::{ChatCompletionTool, ChatCompletionTools, FunctionObject};
use schemars::schema_for;
use schemars::JsonSchema;
use serde::de::DeserializeOwned;
use serde_json::Value;

use crate::ai_native::error::AiError;
use crate::ai_native::runner_config::ResolvedRunnerConfig;
use crate::{ChecklistToggle, MatchMode, Replacement, SectionMode, SectionUpdate};

use super::inputs::{ChecklistToggleInput, ReplacementInput, SectionUpdateInput, SpecRawResponse};
use super::ToolExecutor;

// ---------------------------------------------------------------------------
// Deserialization
// ---------------------------------------------------------------------------

pub fn tool_input<T: DeserializeOwned>(value: Value) -> Result<T, String> {
    serde_json::from_value(value).map_err(|e| {
        let msg = e.to_string();
        // Enhance common serde errors with actionable guidance
        if msg.contains("missing field `oldString`") {
            "Each item in `replacements` requires both `oldString` (exact text to find) and `newString` (replacement text). Use `view` to read the current spec content first.".to_string()
        } else if msg.contains("missing field") {
            format!("Invalid tool input: {msg}")
        } else {
            msg
        }
    })
}

// ---------------------------------------------------------------------------
// Project ID resolution
// ---------------------------------------------------------------------------

pub fn ensure_project_id(
    input: Option<String>,
    fallback: &Option<String>,
) -> Result<String, String> {
    input
        .or_else(|| fallback.clone())
        .ok_or_else(|| "projectId is required for LeanSpec operations".to_string())
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

pub fn normalize_base_url(base_url: &str) -> String {
    base_url.trim_end_matches('/').to_string()
}

pub fn fetch_json(method: &str, url: &str, body: Option<Value>) -> Result<Value, String> {
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

pub fn get_spec_raw(
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

pub fn update_spec_raw(
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

// ---------------------------------------------------------------------------
// Runner / subagent
// ---------------------------------------------------------------------------

pub fn run_subagent_task(
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

// ---------------------------------------------------------------------------
// Content operation parsers
// ---------------------------------------------------------------------------

pub fn parse_replacements(inputs: &[ReplacementInput]) -> Result<Vec<Replacement>, String> {
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

pub fn parse_section_updates(inputs: &[SectionUpdateInput]) -> Result<Vec<SectionUpdate>, String> {
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

pub fn parse_checklist_toggles(inputs: &[ChecklistToggleInput]) -> Vec<ChecklistToggle> {
    inputs
        .iter()
        .map(|c| ChecklistToggle {
            item_text: c.item_text.clone(),
            checked: c.checked,
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Tool schema builder
// ---------------------------------------------------------------------------

pub fn make_tool<F, I>(
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
