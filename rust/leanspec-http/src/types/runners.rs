//! Runner-related API request/response types

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// List available runners
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRunnersRequest {
    pub project_path: Option<String>,
    /// When true, skip command validation and version detection for faster response
    #[serde(default)]
    pub skip_validation: bool,
}

#[derive(Debug, Default, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum RunnerScope {
    Project,
    #[default]
    Global,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerCreateRequest {
    pub project_path: String,
    pub runner: RunnerConfigPayload,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerUpdateRequest {
    pub project_path: String,
    pub runner: RunnerUpdatePayload,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerDeleteRequest {
    pub project_path: String,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerDefaultRequest {
    pub project_path: String,
    pub runner_id: String,
    pub scope: Option<RunnerScope>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerConfigPayload {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerUpdatePayload {
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Deserialize)]
pub struct RunnerPatchQuery {
    #[serde(default)]
    pub minimal: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerInfoResponse {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    /// None means validation hasn't been performed yet (pending state)
    pub available: Option<bool>,
    pub version: Option<String>,
    pub source: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerListResponse {
    pub default: Option<String>,
    pub runners: Vec<RunnerInfoResponse>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerValidateResponse {
    pub valid: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerVersionResponse {
    pub version: Option<String>,
}
