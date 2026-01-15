//! Project management handlers

use axum::extract::{Path, State};
use axum::http::HeaderMap;
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::error::{ApiError, ApiResult};
use crate::project_registry::{Project, ProjectUpdate};
use crate::state::AppState;
use crate::sync_state::machine_id_from_headers;

/// Response for project list
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectsListResponse {
    pub projects: Vec<ProjectResponse>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub recent_projects: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favorite_projects: Option<Vec<String>>,
}

/// Project response type (camelCase for frontend compatibility)
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectResponse {
    pub id: String,
    pub name: String,
    pub path: String,
    pub specs_dir: String,
    pub favorite: bool,
    pub color: Option<String>,
    pub last_accessed: String,
    pub added_at: String,
}

/// Project detail wrapper response
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SingleProjectResponse {
    pub project: ProjectResponse,
}

impl From<&Project> for ProjectResponse {
    fn from(p: &Project) -> Self {
        Self {
            id: p.id.clone(),
            name: p.name.clone(),
            path: p.path.to_string_lossy().to_string(),
            specs_dir: p.specs_dir.to_string_lossy().to_string(),
            favorite: p.favorite,
            color: p.color.clone(),
            last_accessed: p.last_accessed.to_rfc3339(),
            added_at: p.added_at.to_rfc3339(),
        }
    }
}

fn project_response_from_record(record: &crate::sync_state::ProjectRecord) -> ProjectResponse {
    ProjectResponse {
        id: record.id.clone(),
        name: record.name.clone(),
        path: record.path.clone().unwrap_or_else(|| record.id.clone()),
        specs_dir: record.path.clone().unwrap_or_else(|| record.id.clone()),
        favorite: record.favorite,
        color: record.color.clone(),
        last_accessed: chrono::Utc::now().to_rfc3339(),
        added_at: chrono::Utc::now().to_rfc3339(),
    }
}

/// GET /api/projects - List all projects
pub async fn list_projects(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Json<ProjectsListResponse> {
    list_projects_with_headers(state, headers).await
}

async fn list_projects_with_headers(
    state: AppState,
    headers: HeaderMap,
) -> Json<ProjectsListResponse> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state.persistent.machines.get(&machine_id).cloned();

        let projects: Vec<ProjectResponse> = machine
            .map(|machine| {
                machine
                    .projects
                    .values()
                    .map(project_response_from_record)
                    .collect()
            })
            .unwrap_or_default();

        return Json(ProjectsListResponse {
            projects,
            recent_projects: None,
            favorite_projects: None,
        });
    }

    let registry = state.registry.read().await;
    let projects: Vec<ProjectResponse> = registry.all().iter().map(|p| (*p).into()).collect();
    let recent_projects = Some(registry.recent(5).iter().map(|p| p.id.clone()).collect());
    let favorite_projects = Some(registry.favorites().iter().map(|p| p.id.clone()).collect());

    Json(ProjectsListResponse {
        projects,
        recent_projects,
        favorite_projects,
    })
}

/// Request body for adding a project
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddProjectRequest {
    pub path: String,
}

/// POST /api/projects - Add a new project
pub async fn add_project(
    State(state): State<AppState>,
    Json(req): Json<AddProjectRequest>,
) -> ApiResult<Json<ProjectResponse>> {
    let path = PathBuf::from(&req.path);

    let mut registry = state.registry.write().await;
    let project = registry.add(&path).map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request(&e.to_string())),
        )
    })?;

    Ok(Json((&project).into()))
}

/// GET /api/projects/:id - Get a project by ID
pub async fn get_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> ApiResult<Json<SingleProjectResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        let project = machine.projects.get(&id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&id)),
            )
        })?;

        return Ok(Json(SingleProjectResponse {
            project: project_response_from_record(project),
        }));
    }

    let registry = state.registry.read().await;
    let project = registry.get(&id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&id)),
        )
    })?;

    Ok(Json(SingleProjectResponse {
        project: project.into(),
    }))
}

/// PATCH /api/projects/:id - Update a project
pub async fn update_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(updates): Json<ProjectUpdate>,
) -> ApiResult<Json<ProjectResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let mut sync_state = state.sync_state.write().await;
        let response = {
            let machine = sync_state
                .persistent
                .machines
                .get_mut(&machine_id)
                .ok_or_else(|| {
                    (
                        StatusCode::NOT_FOUND,
                        Json(ApiError::invalid_request("Machine not found")),
                    )
                })?;

            let project = machine.projects.get_mut(&id).ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::project_not_found(&id)),
                )
            })?;

            if let Some(name) = updates.name {
                project.name = name;
            }
            if let Some(favorite) = updates.favorite {
                project.favorite = favorite;
            }
            if let Some(color) = updates.color {
                project.color = Some(color);
            }

            project_response_from_record(project)
        };

        sync_state.save();

        return Ok(Json(response));
    }

    let mut registry = state.registry.write().await;
    let project = registry.update(&id, updates).map_err(|e| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&e.to_string())),
        )
    })?;

    Ok(Json(project.into()))
}

/// DELETE /api/projects/:id - Remove a project
pub async fn remove_project(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> ApiResult<StatusCode> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let mut sync_state = state.sync_state.write().await;
        let machine = sync_state
            .persistent
            .machines
            .get_mut(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        if machine.projects.remove(&id).is_none() {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&id)),
            ));
        }

        sync_state.save();
        return Ok(StatusCode::NO_CONTENT);
    }

    let mut registry = state.registry.write().await;
    registry.remove(&id).map_err(|e| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&e.to_string())),
        )
    })?;

    Ok(StatusCode::NO_CONTENT)
}

/// POST /api/projects/:id/favorite - Toggle favorite status
pub async fn toggle_favorite(
    State(state): State<AppState>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> ApiResult<Json<serde_json::Value>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let mut sync_state = state.sync_state.write().await;
        let machine = sync_state
            .persistent
            .machines
            .get_mut(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        let project = machine.projects.get_mut(&id).ok_or_else(|| {
            (
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&id)),
            )
        })?;

        project.favorite = !project.favorite;
        let is_favorite = project.favorite;
        sync_state.save();

        return Ok(Json(serde_json::json!({ "favorite": is_favorite })));
    }

    let mut registry = state.registry.write().await;
    let is_favorite = registry.toggle_favorite(&id).map_err(|e| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&e.to_string())),
        )
    })?;

    Ok(Json(serde_json::json!({ "favorite": is_favorite })))
}

/// POST /api/projects/refresh - Refresh and clean up invalid projects
pub async fn refresh_projects(State(state): State<AppState>) -> Json<serde_json::Value> {
    let mut registry = state.registry.write().await;
    let removed = registry.refresh().unwrap_or(0);

    Json(serde_json::json!({
        "removed": removed,
        "message": format!("Removed {} invalid projects", removed)
    }))
}

/// POST /api/projects/:projectId/validate - Validate a project
pub async fn validate_project(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    headers: HeaderMap,
) -> ApiResult<Json<crate::types::ProjectValidationResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        if !machine.projects.contains_key(&project_id) {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&project_id)),
            ));
        }

        return Ok(Json(crate::types::ProjectValidationResponse {
            project_id: project_id.clone(),
            path: project_id.clone(),
            validation: crate::types::ProjectValidationSummary {
                is_valid: true,
                error: None,
                specs_dir: None,
            },
        }));
    }

    let registry = state.registry.read().await;
    let project = registry.get(&project_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&project_id)),
        )
    })?;

    let validation = match project.validate() {
        Ok(_) => crate::types::ProjectValidationSummary {
            is_valid: true,
            error: None,
            specs_dir: Some(project.specs_dir.to_string_lossy().to_string()),
        },
        Err(error) => crate::types::ProjectValidationSummary {
            is_valid: false,
            error: Some(error),
            specs_dir: None,
        },
    };

    Ok(Json(crate::types::ProjectValidationResponse {
        project_id: project.id.clone(),
        path: project.path.to_string_lossy().to_string(),
        validation,
    }))
}

/// GET /api/projects/:projectId/context - Get project context (agent instructions, config, docs)
pub async fn get_project_context(
    State(state): State<AppState>,
    Path(project_id): Path<String>,
    headers: HeaderMap,
) -> ApiResult<Json<crate::types::ProjectContextResponse>> {
    if let Some(machine_id) = machine_id_from_headers(&headers) {
        let sync_state = state.sync_state.read().await;
        let machine = sync_state
            .persistent
            .machines
            .get(&machine_id)
            .ok_or_else(|| {
                (
                    StatusCode::NOT_FOUND,
                    Json(ApiError::invalid_request("Machine not found")),
                )
            })?;

        if !machine.projects.contains_key(&project_id) {
            return Err((
                StatusCode::NOT_FOUND,
                Json(ApiError::project_not_found(&project_id)),
            ));
        }

        return Ok(Json(crate::types::ProjectContextResponse {
            agent_instructions: Vec::new(),
            config: crate::types::ProjectConfigResponse {
                file: None,
                parsed: None,
            },
            project_docs: Vec::new(),
            total_tokens: 0,
            project_root: project_id.clone(),
        }));
    }

    let registry = state.registry.read().await;
    let project = registry.get(&project_id).ok_or_else(|| {
        (
            StatusCode::NOT_FOUND,
            Json(ApiError::project_not_found(&project_id)),
        )
    })?;

    let project_root = &project.path;

    // Collect agent instruction files
    let agent_instructions = collect_agent_instructions(project_root)?;

    // Collect project config
    let config = collect_project_config(project_root)?;

    // Collect project docs
    let project_docs = collect_project_docs(project_root)?;

    // Calculate total tokens
    let mut total_tokens = 0;
    for file in &agent_instructions {
        total_tokens += file.token_count;
    }
    if let Some(ref config_file) = config.file {
        total_tokens += config_file.token_count;
    }
    for file in &project_docs {
        total_tokens += file.token_count;
    }

    Ok(Json(crate::types::ProjectContextResponse {
        agent_instructions,
        config,
        project_docs,
        total_tokens,
        project_root: project_root.to_string_lossy().to_string(),
    }))
}

/// Helper: Read a context file and return its metadata
fn read_context_file(
    file_path: &PathBuf,
    project_root: &PathBuf,
) -> Result<crate::types::ContextFile, std::io::Error> {
    let content = std::fs::read_to_string(file_path)?;
    let metadata = std::fs::metadata(file_path)?;
    let modified = metadata
        .modified()?
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let last_modified =
        chrono::DateTime::from_timestamp(modified as i64, 0).unwrap_or_else(chrono::Utc::now);

    let relative_path = file_path
        .strip_prefix(project_root)
        .unwrap_or(file_path)
        .to_string_lossy()
        .to_string();

    let name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| relative_path.clone());

    let token_count = estimate_tokens(&content);

    Ok(crate::types::ContextFile {
        name,
        path: relative_path,
        content,
        token_count,
        last_modified,
    })
}

/// Helper: Estimate token count (approximation)
fn estimate_tokens(text: &str) -> usize {
    let words = text.split_whitespace().count();
    let special_chars = text
        .chars()
        .filter(|c| !c.is_alphanumeric() && !c.is_whitespace())
        .count();
    ((words as f64 * 1.3) + (special_chars as f64 * 0.5)).ceil() as usize
}

/// Helper: Collect agent instruction files
fn collect_agent_instructions(
    project_root: &PathBuf,
) -> Result<Vec<crate::types::ContextFile>, (StatusCode, Json<ApiError>)> {
    let mut files = Vec::new();

    // Root agent files
    let root_agent_files = ["AGENTS.md", "GEMINI.md", "CLAUDE.md", "COPILOT.md"];
    for file_name in &root_agent_files {
        let file_path = project_root.join(file_name);
        if let Ok(file) = read_context_file(&file_path, project_root) {
            files.push(file);
        }
    }

    // .github/copilot-instructions.md
    let copilot_path = project_root.join(".github").join("copilot-instructions.md");
    if let Ok(file) = read_context_file(&copilot_path, project_root) {
        files.push(file);
    }

    // docs/agents/*.md
    let agents_docs_dir = project_root.join("docs").join("agents");
    if let Ok(entries) = std::fs::read_dir(&agents_docs_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("md") {
                if let Ok(file) = read_context_file(&path, project_root) {
                    files.push(file);
                }
            }
        }
    }

    Ok(files)
}

/// Helper: Collect project config
fn collect_project_config(
    project_root: &PathBuf,
) -> Result<crate::types::ProjectConfigResponse, (StatusCode, Json<ApiError>)> {
    let config_path = project_root.join(".lean-spec").join("config.json");

    if !config_path.exists() {
        return Ok(crate::types::ProjectConfigResponse {
            file: None,
            parsed: None,
        });
    }

    match read_context_file(&config_path, project_root) {
        Ok(file) => {
            let parsed = serde_json::from_str::<crate::types::LeanSpecConfig>(&file.content).ok();
            Ok(crate::types::ProjectConfigResponse {
                file: Some(file),
                parsed,
            })
        }
        Err(_) => Ok(crate::types::ProjectConfigResponse {
            file: None,
            parsed: None,
        }),
    }
}

/// Helper: Collect project documentation files
fn collect_project_docs(
    project_root: &PathBuf,
) -> Result<Vec<crate::types::ContextFile>, (StatusCode, Json<ApiError>)> {
    let mut files = Vec::new();

    let doc_files = ["README.md", "CONTRIBUTING.md", "CHANGELOG.md"];
    for file_name in &doc_files {
        let file_path = project_root.join(file_name);
        if let Ok(file) = read_context_file(&file_path, project_root) {
            files.push(file);
        }
    }

    Ok(files)
}
