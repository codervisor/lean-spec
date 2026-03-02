//! Runner management handlers

use axum::extract::Path;
use axum::extract::State;
use axum::Json;
use std::collections::HashSet;
use std::path::PathBuf;

use crate::error::{internal_error, ApiError, ApiResult};
use crate::state::AppState;
use crate::types::{
    ListRunnersRequest, RunnerCreateRequest, RunnerDefaultRequest, RunnerDeleteRequest,
    RunnerInfoResponse, RunnerListResponse, RunnerPatchQuery, RunnerScope, RunnerUpdateRequest,
    RunnerValidateResponse, RunnerVersionResponse,
};
use leanspec_core::sessions::runner::{
    default_runners_file, global_runners_path, project_runners_path, read_runners_file,
    write_runners_file, RunnerConfig, RunnerDefinition, RunnerRegistry,
};

pub async fn list_available_runners(
    State(state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<Vec<String>>> {
    let runners = state
        .session_manager
        .list_available_runners(req.project_path.as_deref())
        .await
        .map_err(internal_error)?;

    Ok(Json(runners))
}

pub async fn list_runners(
    State(_state): State<AppState>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());

    let response = build_runner_list_response(&project_path).map_err(internal_error)?;

    Ok(Json(response))
}

pub async fn get_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerInfoResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let runner = registry.get(&runner_id).ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        )
    })?;

    let sources = load_runner_sources(&project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(build_runner_info(runner, &sources)))
}

pub async fn create_runner(
    State(_state): State<AppState>,
    Json(req): Json<RunnerCreateRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    if let Some(command) = &req.runner.command {
        if command.trim().is_empty() {
            return Err((
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Runner command is required")),
            ));
        }
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    file.runners.insert(
        req.runner.id.clone(),
        RunnerConfig {
            name: req.runner.name,
            command: req.runner.command,
            args: req.runner.args,
            env: req.runner.env,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
        },
    );

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
}

pub async fn update_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    Json(req): Json<RunnerUpdateRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    if let Some(command) = &req.runner.command {
        if command.trim().is_empty() {
            return Err((
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Runner command is required")),
            ));
        }
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    file.runners.insert(
        runner_id,
        RunnerConfig {
            name: req.runner.name,
            command: req.runner.command,
            args: req.runner.args,
            env: req.runner.env,
            detection: None,
            symlink_file: None,
            prompt_flag: None,
        },
    );

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
}

pub async fn patch_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(query): axum::extract::Query<RunnerPatchQuery>,
    Json(req): Json<RunnerUpdateRequest>,
) -> ApiResult<Json<RunnerInfoResponse>> {
    if let Some(command) = &req.runner.command {
        if command.trim().is_empty() {
            return Err((
                axum::http::StatusCode::BAD_REQUEST,
                Json(ApiError::invalid_request("Runner command is required")),
            ));
        }
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let existing = file.runners.get(&runner_id).cloned().unwrap_or_default();

    file.runners.insert(
        runner_id.clone(),
        RunnerConfig {
            name: req.runner.name.or(existing.name),
            command: req.runner.command.or(existing.command),
            args: req.runner.args.or(existing.args),
            env: req.runner.env.or(existing.env),
            detection: existing.detection,
            symlink_file: existing.symlink_file,
            prompt_flag: existing.prompt_flag,
        },
    );

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let registry =
        RunnerRegistry::load(PathBuf::from(&req.project_path).as_path()).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    let runner = registry.get(&runner_id).ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        )
    })?;

    let sources = load_runner_sources(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let mut response = build_runner_info(runner, &sources);
    if query.minimal {
        response.available = None;
    }

    Ok(Json(response))
}

pub async fn delete_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    Json(req): Json<RunnerDeleteRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    if file.runners.remove(&runner_id).is_none() {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        ));
    }

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
}

pub async fn get_runner_version(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerVersionResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let runner = registry.get(&runner_id).ok_or_else(|| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        )
    })?;

    let runner = runner.clone();
    let version = tokio::task::spawn_blocking(move || runner.detect_version())
        .await
        .unwrap_or(None);

    Ok(Json(RunnerVersionResponse { version }))
}

pub async fn validate_runner(
    State(_state): State<AppState>,
    Path(runner_id): Path<String>,
    axum::extract::Query(req): axum::extract::Query<ListRunnersRequest>,
) -> ApiResult<Json<RunnerValidateResponse>> {
    let project_path = req.project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path()).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    match registry.validate(&runner_id) {
        Ok(()) => Ok(Json(RunnerValidateResponse {
            valid: true,
            error: None,
        })),
        Err(err) => Ok(Json(RunnerValidateResponse {
            valid: false,
            error: Some(err.to_string()),
        })),
    }
}

pub async fn set_default_runner(
    State(_state): State<AppState>,
    Json(req): Json<RunnerDefaultRequest>,
) -> ApiResult<Json<RunnerListResponse>> {
    if req.runner_id.trim().is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(ApiError::invalid_request("Runner id is required")),
        ));
    }

    let registry =
        RunnerRegistry::load(PathBuf::from(&req.project_path).as_path()).map_err(|e| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiError::internal_error(&e.to_string())),
            )
        })?;

    if registry.get(&req.runner_id).is_none() {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(ApiError::not_found("Runner")),
        ));
    }

    let scope = req.scope.unwrap_or_default();
    let path = resolve_scope_path(&req.project_path, scope);
    let mut file = load_or_default_runners_file(&path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    file.default = Some(req.runner_id);

    write_runners_file(&path, &file).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    let response = build_runner_list_response(&req.project_path).map_err(|e| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(ApiError::internal_error(&e.to_string())),
        )
    })?;

    Ok(Json(response))
}

fn resolve_scope_path(project_path: &str, scope: RunnerScope) -> PathBuf {
    match scope {
        RunnerScope::Project => project_runners_path(PathBuf::from(project_path).as_path()),
        RunnerScope::Global => global_runners_path(),
    }
}

fn load_or_default_runners_file(
    path: &std::path::Path,
) -> leanspec_core::CoreResult<leanspec_core::sessions::runner::RunnersFile> {
    match read_runners_file(path)? {
        Some(file) => Ok(file),
        None => Ok(default_runners_file()),
    }
}

fn load_runner_sources(
    project_path: &str,
) -> leanspec_core::CoreResult<(HashSet<String>, HashSet<String>)> {
    let global = read_runners_file(&global_runners_path())?
        .map(|file| file.runners.keys().cloned().collect::<HashSet<_>>())
        .unwrap_or_default();
    let project = read_runners_file(&project_runners_path(PathBuf::from(project_path).as_path()))?
        .map(|file| file.runners.keys().cloned().collect::<HashSet<_>>())
        .unwrap_or_default();

    Ok((global, project))
}

fn build_runner_info(
    runner: &RunnerDefinition,
    sources: &(HashSet<String>, HashSet<String>),
) -> RunnerInfoResponse {
    let (global_sources, project_sources) = sources;
    let source = if project_sources.contains(&runner.id) {
        "project"
    } else if global_sources.contains(&runner.id) {
        "global"
    } else {
        "builtin"
    };

    // Check availability (fast PATH lookup), but never detect version here.
    // Version detection spawns child processes and is done via a separate API.
    let available = runner
        .command
        .as_ref()
        .map(|_| runner.validate_command().is_ok());

    RunnerInfoResponse {
        id: runner.id.clone(),
        name: runner.name.clone(),
        command: runner.command.clone(),
        args: runner.args.clone(),
        env: runner.env.clone(),
        available,
        version: None,
        source: source.to_string(),
    }
}

fn build_runner_list_response(project_path: &str) -> leanspec_core::CoreResult<RunnerListResponse> {
    let registry = RunnerRegistry::load(PathBuf::from(project_path).as_path())?;
    let sources = load_runner_sources(project_path)?;
    let runners = registry
        .list()
        .into_iter()
        .map(|runner| build_runner_info(runner, &sources))
        .collect::<Vec<_>>();

    Ok(RunnerListResponse {
        default: registry.default().map(|value| value.to_string()),
        runners,
    })
}
