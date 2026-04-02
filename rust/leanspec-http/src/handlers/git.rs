//! Git repository integration API handlers
//!
//! Uses the system `git` binary for clone/pull/push — works with any
//! Git host (GitHub, GitLab, Gitea, self-hosted, SSH).

use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use serde::{Deserialize, Serialize};

use crate::state::AppState;

use leanspec_core::git::{CloneManager, RemoteRef, SpecDetectionResult};

/// Compute a deterministic clone directory for a remote URL.
fn clone_dir_for(remote_url: &str) -> std::path::PathBuf {
    // Slug: replace non-alphanumeric with underscores
    let slug: String = remote_url
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    leanspec_core::storage::config::config_dir()
        .join("repos")
        .join(slug)
}

/// POST /api/git/detect — Detect specs in a remote Git repository.
///
/// Clones into a temp directory, scans for specs, then cleans up.
pub async fn git_detect_specs(
    State(_state): State<AppState>,
    Json(body): Json<DetectRequest>,
) -> Result<Json<DetectResponse>, (StatusCode, String)> {
    let remote_ref = RemoteRef::parse(&body.repo).ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            format!(
                "Invalid repository URL: '{}'. Use 'owner/repo', an HTTPS URL, or an SSH URL.",
                body.repo
            ),
        )
    })?;

    let branch = body.branch.clone();
    let result = tokio::task::spawn_blocking(move || {
        CloneManager::detect_specs(&remote_ref.url, branch.as_deref())
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(Json(DetectResponse { result }))
}

/// POST /api/git/import — Clone a Git repo and register it as a LeanSpec project.
pub async fn git_import_repo(
    State(state): State<AppState>,
    Json(body): Json<ImportRequest>,
) -> Result<Json<ImportResponse>, (StatusCode, String)> {
    let remote_ref = RemoteRef::parse(&body.repo).ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            format!("Invalid repository URL: '{}'", body.repo),
        )
    })?;

    let remote_url = remote_ref.url.clone();
    let display_name = remote_ref.display_name.clone();

    // Detect specs first if no specs_path provided
    let (branch, specs_path) =
        if let (Some(branch), Some(path)) = (body.branch.as_deref(), body.specs_path.as_deref()) {
            (branch.to_string(), path.to_string())
        } else {
            let url = remote_url.clone();
            let branch_clone = body.branch.clone();
            let detection = tokio::task::spawn_blocking(move || {
                CloneManager::detect_specs(&url, branch_clone.as_deref())
            })
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

            match detection {
                Some(result) => (result.branch, result.specs_dir),
                None => {
                    return Err((
                        StatusCode::NOT_FOUND,
                        format!("No specs found in repository '{}'", body.repo),
                    ))
                }
            }
        };

    // Clone the repository
    let clone_dir = clone_dir_for(&remote_url);
    let clone_url = remote_url.clone();
    let clone_branch = branch.clone();
    let clone_specs = specs_path.clone();
    let clone_target = clone_dir.clone();

    if !CloneManager::is_valid_clone(&clone_dir) {
        tokio::task::spawn_blocking(move || {
            let config = leanspec_core::git::CloneConfig {
                remote_url: clone_url,
                branch: Some(clone_branch),
                specs_path: Some(clone_specs),
                clone_dir: clone_target,
            };
            CloneManager::clone_repo(&config)
        })
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    }

    // Count specs in the clone
    let specs_dir_path = clone_dir.join(&specs_path);
    let spec_count = std::fs::read_dir(&specs_dir_path)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.file_type().map(|ft| ft.is_dir()).unwrap_or(false)
                        && e.file_name()
                            .to_str()
                            .is_some_and(|n| n.chars().next().is_some_and(|c| c.is_ascii_digit()))
                })
                .count()
        })
        .unwrap_or(0);

    // Register in project registry
    let mut registry = state.registry.write().await;
    let project = registry
        .add_git(
            &remote_url,
            &branch,
            &specs_path,
            &clone_dir,
            body.name.as_deref().or(Some(&display_name)),
        )
        .map_err(|e| (StatusCode::CONFLICT, e.to_string()))?;

    Ok(Json(ImportResponse {
        project_id: project.id,
        project_name: project.name,
        repo: display_name,
        branch,
        specs_path,
        synced_specs: spec_count,
    }))
}

/// POST /api/git/sync/{id} — Pull latest changes from remote.
pub async fn git_sync_project(
    State(state): State<AppState>,
    axum::extract::Path(project_id): axum::extract::Path<String>,
) -> Result<Json<SyncResponse>, (StatusCode, String)> {
    let registry = state.registry.read().await;
    let project = registry
        .get(&project_id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    let git_config = project.git.as_ref().ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            "Project is not a git-sourced project".to_string(),
        )
    })?;

    let clone_dir = project.path.clone();
    let specs_path = git_config.specs_path.clone();

    drop(registry);

    // Pull latest
    let pull_result = tokio::task::spawn_blocking(move || CloneManager::pull(&clone_dir))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    // Count specs after pull
    let specs_dir_path = {
        let reg = state.registry.read().await;
        let p = reg.get(&project_id).unwrap();
        p.path.join(&specs_path)
    };

    let spec_count = std::fs::read_dir(&specs_dir_path)
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| {
                    e.file_type().map(|ft| ft.is_dir()).unwrap_or(false)
                        && e.file_name()
                            .to_str()
                            .is_some_and(|n| n.chars().next().is_some_and(|c| c.is_ascii_digit()))
                })
                .count()
        })
        .unwrap_or(0);

    Ok(Json(SyncResponse {
        project_id,
        synced_specs: spec_count,
        updated: pull_result.updated,
        head_sha: pull_result.head_sha,
    }))
}

/// POST /api/git/push/{id} — Commit and push local spec changes.
pub async fn git_push_project(
    State(state): State<AppState>,
    axum::extract::Path(project_id): axum::extract::Path<String>,
    Json(body): Json<PushRequest>,
) -> Result<Json<PushResponse>, (StatusCode, String)> {
    let registry = state.registry.read().await;
    let project = registry
        .get(&project_id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    let git_config = project.git.as_ref().ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            "Project is not a git-sourced project".to_string(),
        )
    })?;

    let clone_dir = project.path.clone();
    let specs_path = git_config.specs_path.clone();

    drop(registry);

    let message = body
        .message
        .unwrap_or_else(|| "Update specs via LeanSpec".to_string());

    let result = tokio::task::spawn_blocking(move || {
        CloneManager::commit_and_push(&clone_dir, &specs_path, &message)
    })
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    Ok(Json(PushResponse {
        project_id,
        commit_sha: result.commit_sha,
    }))
}

/// GET /api/git/status/{id} — Check for uncommitted changes.
pub async fn git_status_project(
    State(state): State<AppState>,
    axum::extract::Path(project_id): axum::extract::Path<String>,
) -> Result<Json<leanspec_core::git::GitStatus>, (StatusCode, String)> {
    let registry = state.registry.read().await;
    let project = registry
        .get(&project_id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Project not found".to_string()))?;

    project.git.as_ref().ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            "Project is not a git-sourced project".to_string(),
        )
    })?;

    let clone_dir = project.path.clone();
    drop(registry);

    let status = tokio::task::spawn_blocking(move || CloneManager::status(&clone_dir))
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    Ok(Json(status))
}

// ── Request/Response types ───────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct DetectRequest {
    /// Repository URL or shorthand (owner/repo).
    pub repo: String,
    #[serde(default)]
    pub branch: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DetectResponse {
    pub result: Option<SpecDetectionResult>,
}

#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    /// Repository URL or shorthand (owner/repo).
    pub repo: String,
    #[serde(default)]
    pub branch: Option<String>,
    #[serde(default, alias = "specsPath")]
    pub specs_path: Option<String>,
    #[serde(default)]
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportResponse {
    pub project_id: String,
    pub project_name: String,
    pub repo: String,
    pub branch: String,
    pub specs_path: String,
    pub synced_specs: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncResponse {
    pub project_id: String,
    pub synced_specs: usize,
    pub updated: bool,
    pub head_sha: String,
}

#[derive(Debug, Deserialize)]
pub struct PushRequest {
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PushResponse {
    pub project_id: String,
    pub commit_sha: String,
}
