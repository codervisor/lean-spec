use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

use crate::config::{mutate_config, read_config};
use crate::keychain;
use crate::projects::DesktopProject;
use crate::state::DesktopState;
use crate::tray;
use leanspec_core::sessions::runner::{
    default_runners_file, global_runners_path, project_runners_path, read_runners_file,
    write_runners_file, RunnerConfig, RunnerDefinition, RunnerRegistry,
};

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopBootstrapPayload {
    pub active_project_id: Option<String>,
    pub config: crate::config::DesktopConfig,
    pub projects: Vec<DesktopProject>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum RunnerScope {
    Project,
    Global,
}

impl Default for RunnerScope {
    fn default() -> Self {
        RunnerScope::Project
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerConfigPayload {
    pub id: String,
    pub name: Option<String>,
    pub command: String,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerUpdatePayload {
    pub name: Option<String>,
    pub command: String,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerInfoResponse {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub available: bool,
    pub version: Option<String>,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerListResponse {
    pub default: Option<String>,
    pub runners: Vec<RunnerInfoResponse>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunnerValidateResponse {
    pub valid: bool,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn desktop_bootstrap(app: AppHandle, state: State<'_, DesktopState>) -> Result<DesktopBootstrapPayload, String> {
    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_refresh_projects(app: AppHandle, state: State<'_, DesktopState>) -> Result<DesktopBootstrapPayload, String> {
    state.project_store.refresh();
    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_switch_project(
    app: AppHandle,
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<DesktopBootstrapPayload, String> {
    if state.project_store.find(&project_id).is_none() {
        return Err("Unknown project".into());
    }

    let project = state.project_store.set_active(&project_id);
    mutate_config(|config| {
        config.active_project_id = Some(project_id.clone());
    });

    if let Some(project) = project {
        notify(&app, "Active project switched", &format!("Now tracking {}", project.name));
    }

    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_add_project(app: AppHandle, state: State<'_, DesktopState>) -> Result<DesktopBootstrapPayload, String> {
    if let Some(folder) = app.dialog().file().set_title("Add LeanSpec Project").blocking_pick_folder() {
        if let Ok(path) = folder.into_path() {
            let project = state
                .project_store
                .add_project(path.as_path())
                .map_err(|error| error.to_string())?;

            state.project_store.set_active(&project.id);

            mutate_config(|config| {
                config.active_project_id = Some(project.id.clone());
            });

            notify(&app, "Project added", &format!("{} is now available", project.name));
        }
    }

    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_check_updates(app: AppHandle) -> Result<(), String> {
    app.updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_validate_project(
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<bool, String> {
    let project = state.project_store.find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;
    
    let path = std::path::Path::new(&project.path);
    let specs_path = std::path::Path::new(&project.specs_dir);
    
    Ok(path.exists() && specs_path.exists())
}

#[tauri::command]
pub async fn desktop_toggle_favorite(
    app: AppHandle,
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<DesktopBootstrapPayload, String> {
    state.project_store.toggle_favorite(&project_id)
        .map_err(|error| error.to_string())?;
    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_remove_project(
    app: AppHandle,
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<DesktopBootstrapPayload, String> {
    state.project_store.remove_project(&project_id)
        .map_err(|error| error.to_string())?;
    
    // If we removed the active project, clear it
    let config = read_config();
    if config.active_project_id.as_deref() == Some(project_id.as_str()) {
        mutate_config(|config| {
            config.active_project_id = None;
        });
    }
    
    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_rename_project(
    app: AppHandle,
    state: State<'_, DesktopState>,
    project_id: String,
    new_name: String,
) -> Result<DesktopBootstrapPayload, String> {
    state.project_store.rename_project(&project_id, &new_name)
        .map_err(|error| error.to_string())?;
    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

#[tauri::command]
pub async fn desktop_store_chat_api_key(
    app: AppHandle,
    provider_id: String,
    api_key: String,
) -> Result<(), String> {
    keychain::store_api_key(&app, &provider_id, &api_key)
}

#[tauri::command]
pub async fn desktop_get_chat_api_key(
    app: AppHandle,
    provider_id: String,
) -> Result<Option<String>, String> {
    keychain::get_api_key(&app, &provider_id)
}

#[tauri::command]
pub async fn desktop_delete_chat_api_key(
    app: AppHandle,
    provider_id: String,
) -> Result<(), String> {
    keychain::delete_api_key(&app, &provider_id)
}

#[tauri::command]
pub async fn desktop_list_runners(project_path: Option<String>) -> Result<RunnerListResponse, String> {
    let path = project_path.unwrap_or_else(|| ".".to_string());
    build_runner_list_response(&path)
}

#[tauri::command]
pub async fn desktop_get_runner(
    runner_id: String,
    project_path: Option<String>,
) -> Result<RunnerInfoResponse, String> {
    let path = project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&path).as_path()).map_err(|e| e.to_string())?;
    let runner = registry
        .get(&runner_id)
        .ok_or_else(|| "Runner not found".to_string())?;
    let sources = load_runner_sources(&path)?;

    Ok(build_runner_info(runner, &sources))
}

#[tauri::command]
pub async fn desktop_create_runner(
    project_path: String,
    runner: RunnerConfigPayload,
    scope: Option<RunnerScope>,
) -> Result<RunnerListResponse, String> {
    if runner.command.trim().is_empty() {
        return Err("Runner command is required".to_string());
    }

    let path = resolve_scope_path(&project_path, scope.unwrap_or_default());
    let mut file = load_or_default_runners_file(&path)?;
    file.runners.insert(
        runner.id.clone(),
        RunnerConfig {
            name: runner.name,
            command: Some(runner.command),
            args: runner.args,
            env: runner.env,
        },
    );
    write_runners_file(&path, &file).map_err(|e| e.to_string())?;

    build_runner_list_response(&project_path)
}

#[tauri::command]
pub async fn desktop_update_runner(
    runner_id: String,
    project_path: String,
    runner: RunnerUpdatePayload,
    scope: Option<RunnerScope>,
) -> Result<RunnerListResponse, String> {
    if runner.command.trim().is_empty() {
        return Err("Runner command is required".to_string());
    }

    let path = resolve_scope_path(&project_path, scope.unwrap_or_default());
    let mut file = load_or_default_runners_file(&path)?;
    file.runners.insert(
        runner_id,
        RunnerConfig {
            name: runner.name,
            command: Some(runner.command),
            args: runner.args,
            env: runner.env,
        },
    );
    write_runners_file(&path, &file).map_err(|e| e.to_string())?;

    build_runner_list_response(&project_path)
}

#[tauri::command]
pub async fn desktop_delete_runner(
    runner_id: String,
    project_path: String,
    scope: Option<RunnerScope>,
) -> Result<RunnerListResponse, String> {
    let path = resolve_scope_path(&project_path, scope.unwrap_or_default());
    let mut file = load_or_default_runners_file(&path)?;
    if file.runners.remove(&runner_id).is_none() {
        return Err("Runner not found".to_string());
    }
    write_runners_file(&path, &file).map_err(|e| e.to_string())?;

    build_runner_list_response(&project_path)
}

#[tauri::command]
pub async fn desktop_validate_runner(
    runner_id: String,
    project_path: Option<String>,
) -> Result<RunnerValidateResponse, String> {
    let path = project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&path).as_path()).map_err(|e| e.to_string())?;

    match registry.validate(&runner_id) {
        Ok(()) => Ok(RunnerValidateResponse {
            valid: true,
            error: None,
        }),
        Err(err) => Ok(RunnerValidateResponse {
            valid: false,
            error: Some(err.to_string()),
        }),
    }
}

#[tauri::command]
pub async fn desktop_set_default_runner(
    project_path: String,
    runner_id: String,
    scope: Option<RunnerScope>,
) -> Result<RunnerListResponse, String> {
    if runner_id.trim().is_empty() {
        return Err("Runner id is required".to_string());
    }

    let registry = RunnerRegistry::load(PathBuf::from(&project_path).as_path()).map_err(|e| e.to_string())?;
    if registry.get(&runner_id).is_none() {
        return Err("Runner not found".to_string());
    }

    let path = resolve_scope_path(&project_path, scope.unwrap_or_default());
    let mut file = load_or_default_runners_file(&path)?;
    file.default = Some(runner_id);
    write_runners_file(&path, &file).map_err(|e| e.to_string())?;

    build_runner_list_response(&project_path)
}

fn build_and_publish(app: &AppHandle, state: &DesktopState) -> Result<DesktopBootstrapPayload> {
    let payload = build_payload(app, state)?;
    tray::rebuild_tray(app, &payload.projects)
        .map_err(|error| anyhow!(error.to_string()))?;
    if let Some(window) = app.get_webview_window("main") {
        window
            .emit("desktop://state-updated", payload.clone())
            .map_err(|error| anyhow!(error.to_string()))?;
    } else {
        app.emit("desktop://state-updated", payload.clone())
            .map_err(|error| anyhow!(error.to_string()))?;
    }
    Ok(payload)
}

fn build_payload(app: &AppHandle, state: &DesktopState) -> Result<DesktopBootstrapPayload> {
    let config = read_config();
    let projects = state.project_store.all();
    let active_project = config
        .active_project_id
        .as_deref()
        .and_then(|id| state.project_store.find(id));
    let active_project_id = active_project.as_ref().map(|project| project.id.clone());

    Ok(DesktopBootstrapPayload {
        active_project_id,
        config,
        projects,
    })
}

fn notify(app: &AppHandle, title: &str, body: &str) {
    let _ = app
        .notification()
        .builder()
        .title(title)
        .body(body)
        .show();
}

fn resolve_scope_path(project_path: &str, scope: RunnerScope) -> PathBuf {
    match scope {
        RunnerScope::Project => project_runners_path(PathBuf::from(project_path).as_path()),
        RunnerScope::Global => global_runners_path(),
    }
}

fn load_or_default_runners_file(path: &PathBuf) -> Result<leanspec_core::sessions::runner::RunnersFile, String> {
    match read_runners_file(path).map_err(|e| e.to_string())? {
        Some(file) => Ok(file),
        None => Ok(default_runners_file()),
    }
}

fn load_runner_sources(project_path: &str) -> Result<(HashSet<String>, HashSet<String>), String> {
    let global = read_runners_file(&global_runners_path())
        .map_err(|e| e.to_string())?
        .map(|file| file.runners.keys().cloned().collect::<HashSet<_>>())
        .unwrap_or_default();
    let project = read_runners_file(&project_runners_path(PathBuf::from(project_path).as_path()))
        .map_err(|e| e.to_string())?
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

    let available = runner.validate_command().is_ok();
    let version = if available {
        runner.detect_version()
    } else {
        None
    };

    RunnerInfoResponse {
        id: runner.id.clone(),
        name: runner.name.clone(),
        command: runner.command.clone(),
        args: runner.args.clone(),
        env: runner.env.clone(),
        available,
        version,
        source: source.to_string(),
    }
}

fn build_runner_list_response(project_path: &str) -> Result<RunnerListResponse, String> {
    let registry = RunnerRegistry::load(PathBuf::from(project_path).as_path()).map_err(|e| e.to_string())?;
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
