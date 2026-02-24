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
use leanspec_core::models_registry::{
    get_configured_providers, get_providers_with_availability, load_bundled_registry,
    load_registry, registry_to_chat_config, ModelCache, ModelsDevClient, ProviderWithAvailability,
};
use leanspec_core::sessions::runner::{
    default_runners_file, global_runners_path, project_runners_path, read_runners_file,
    write_runners_file, RunnerConfig, RunnerDefinition, RunnerRegistry,
};
use leanspec_core::sessions::{Session, SessionDatabase, SessionManager, SessionStatus};
use leanspec_core::storage::config::config_dir;
use leanspec_core::storage::chat_config::{
    resolve_api_key, ChatConfigClient, ChatConfigUpdate, ChatModel, ChatProvider,
};
use leanspec_core::storage::{ChatStorageInfo, ChatStore};

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
    /// None means validation hasn't been performed yet (pending state)
    pub available: Option<bool>,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopListSessionsRequest {
    pub spec_id: Option<String>,
    pub status: Option<String>,
    pub runner: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSessionResponse {
    pub id: String,
    pub project_path: String,
    pub spec_id: Option<String>,
    pub runner: String,
    pub mode: leanspec_core::sessions::SessionMode,
    pub status: SessionStatus,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub duration_ms: Option<u64>,
    pub token_count: Option<u64>,
}

impl From<Session> for DesktopSessionResponse {
    fn from(session: Session) -> Self {
        Self {
            id: session.id,
            project_path: session.project_path,
            spec_id: session.spec_id,
            runner: session.runner,
            mode: session.mode,
            status: session.status,
            started_at: session.started_at.to_rfc3339(),
            ended_at: session.ended_at.map(|value| value.to_rfc3339()),
            duration_ms: session.duration_ms,
            token_count: session.token_count,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelsRegistryResponse {
    pub providers: Vec<ProviderWithAvailability>,
    pub configured_provider_ids: Vec<String>,
    pub total: usize,
    pub configured_count: usize,
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
pub async fn desktop_list_runners(
    project_path: Option<String>,
    skip_validation: Option<bool>,
) -> Result<RunnerListResponse, String> {
    let path = project_path.unwrap_or_else(|| ".".to_string());
    build_runner_list_response(&path, skip_validation.unwrap_or(false))
}

#[tauri::command]
pub async fn desktop_get_runner(
    runner_id: String,
    project_path: Option<String>,
    skip_validation: Option<bool>,
) -> Result<RunnerInfoResponse, String> {
    let path = project_path.unwrap_or_else(|| ".".to_string());
    let registry = RunnerRegistry::load(PathBuf::from(&path).as_path()).map_err(|e| e.to_string())?;
    let runner = registry
        .get(&runner_id)
        .ok_or_else(|| "Runner not found".to_string())?;
    let sources = load_runner_sources(&path)?;

    Ok(build_runner_info(runner, &sources, skip_validation.unwrap_or(false)))
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

    build_runner_list_response(&project_path, false)
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

    build_runner_list_response(&project_path, false)
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

    build_runner_list_response(&project_path, false)
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

    build_runner_list_response(&project_path, false)
}

#[tauri::command]
pub async fn desktop_get_chat_config(
    state: State<'_, DesktopState>,
) -> Result<ChatConfigClient, String> {
    let store = state.chat_config.read().await;
    Ok(store.client_config())
}

#[tauri::command]
pub async fn desktop_update_chat_config(
    state: State<'_, DesktopState>,
    config: ChatConfigUpdate,
) -> Result<ChatConfigClient, String> {
    let mut store = state.chat_config.write().await;
    store.update(config).map_err(|e| e.to_string())?;
    Ok(store.client_config())
}

#[tauri::command]
pub async fn desktop_get_chat_storage_info() -> Result<ChatStorageInfo, String> {
    let store = ChatStore::new().map_err(|e| e.to_string())?;
    store.storage_info().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn desktop_list_sessions(
    params: Option<DesktopListSessionsRequest>,
) -> Result<Vec<DesktopSessionResponse>, String> {
    let sessions_dir = config_dir();
    std::fs::create_dir_all(&sessions_dir)
        .map_err(|error| format!("Failed to create sessions dir: {error}"))?;

    let session_db = SessionDatabase::new(sessions_dir.join("sessions.db"))
        .map_err(|error| error.to_string())?;
    let manager = SessionManager::new(session_db);

    let parsed_status = match params.as_ref().and_then(|value| value.status.as_deref()) {
        Some("pending") => Some(SessionStatus::Pending),
        Some("running") => Some(SessionStatus::Running),
        Some("paused") => Some(SessionStatus::Paused),
        Some("completed") => Some(SessionStatus::Completed),
        Some("failed") => Some(SessionStatus::Failed),
        Some("cancelled") => Some(SessionStatus::Cancelled),
        Some(other) => {
            return Err(format!("Invalid session status filter: {other}"));
        }
        None => None,
    };

    let sessions = manager
        .list_sessions(
            params.as_ref().and_then(|value| value.spec_id.as_deref()),
            parsed_status,
            params.as_ref().and_then(|value| value.runner.as_deref()),
        )
        .await
        .map_err(|error| error.to_string())?;

    Ok(sessions
        .into_iter()
        .map(DesktopSessionResponse::from)
        .collect())
}

#[tauri::command]
pub async fn desktop_get_models_providers(
    state: State<'_, DesktopState>,
    agentic_only: Option<bool>,
) -> Result<ModelsRegistryResponse, String> {
    let registry = load_registry().await.map_err(|e| e.to_string())?;
    let mut providers = get_providers_with_availability(&registry);

    let config = state.chat_config.read().await.config();
    let configured_from_config: HashSet<String> = config
        .providers
        .iter()
        .filter(|provider| !resolve_api_key(&provider.api_key).is_empty())
        .map(|provider| provider.id.clone())
        .collect();

    for provider_entry in providers.iter_mut() {
        if configured_from_config.contains(&provider_entry.provider.id) {
            provider_entry.is_configured = true;
        }
    }

    if agentic_only.unwrap_or(false) {
        providers.retain(|p| {
            p.provider
                .models
                .values()
                .any(|model| model.tool_call.unwrap_or(false))
        });
    }

    let mut configured_ids: HashSet<String> = get_configured_providers().into_iter().collect();
    configured_ids.extend(configured_from_config);
    let configured_count = providers.iter().filter(|p| p.is_configured).count();

    Ok(ModelsRegistryResponse {
        total: providers.len(),
        configured_count,
        configured_provider_ids: configured_ids.into_iter().collect(),
        providers,
    })
}

#[tauri::command]
pub async fn desktop_refresh_models_registry() -> Result<(), String> {
    let client = ModelsDevClient::new();
    match client.fetch().await {
        Ok(registry) => {
            if let Ok(cache) = ModelCache::new() {
                let _ = cache.save(&registry);
            }
            Ok(())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn desktop_set_provider_api_key(
    state: State<'_, DesktopState>,
    provider_id: String,
    api_key: String,
    base_url: Option<String>,
) -> Result<(), String> {
    let registry = load_bundled_registry().map_err(|e| e.to_string())?;
    let registry_provider = registry.providers.get(&provider_id);

    let mut store = state.chat_config.write().await;
    let current_config = store.config();

    let existing_provider_idx = current_config
        .providers
        .iter()
        .position(|p| p.id == provider_id);

    let new_providers = if let Some(idx) = existing_provider_idx {
        let mut providers = current_config.providers.clone();
        providers[idx].api_key = api_key.clone();
        if let Some(base_url) = &base_url {
            providers[idx].base_url = Some(base_url.clone());
        }
        providers
    } else if let Some(reg_provider) = registry_provider {
        let mut providers = current_config.providers.clone();
        let chat_config_from_registry = registry_to_chat_config(&registry);
        if let Some(reg_chat_provider) = chat_config_from_registry
            .providers
            .iter()
            .find(|p| p.id == provider_id)
        {
            let mut new_provider = reg_chat_provider.clone();
            new_provider.api_key = api_key.clone();
            if let Some(base_url) = &base_url {
                new_provider.base_url = Some(base_url.clone());
            }
            providers.push(new_provider);
        } else {
            let final_base_url = base_url.clone().or_else(|| reg_provider.api.clone());
            providers.push(ChatProvider {
                id: provider_id.clone(),
                name: reg_provider.name.clone(),
                base_url: final_base_url,
                api_key: api_key.clone(),
                models: reg_provider
                    .models
                    .values()
                    .filter(|model| model.tool_call.unwrap_or(false))
                    .map(|model| ChatModel {
                        id: model.id.clone(),
                        name: model.name.clone(),
                        max_tokens: model.limit.as_ref().and_then(|l| l.output.map(|o| o as u32)),
                        default: None,
                    })
                    .collect(),
            });
        }
        providers
    } else {
        return Err(format!(
            "Provider '{}' not found in registry. Use custom provider endpoint for non-registry providers.",
            provider_id
        ));
    };

    let update = leanspec_core::storage::chat_config::ChatConfigUpdate {
        version: current_config.version.clone(),
        settings: current_config.settings.clone(),
        providers: new_providers
            .into_iter()
            .map(|provider| leanspec_core::storage::chat_config::ChatProviderUpdate {
                id: provider.id,
                name: provider.name,
                base_url: provider.base_url,
                api_key: Some(provider.api_key),
                models: provider.models,
                has_api_key: None,
            })
            .collect(),
    };

    store.update(update).map_err(|e| e.to_string())?;
    Ok(())
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
    skip_validation: bool,
) -> RunnerInfoResponse {
    let (global_sources, project_sources) = sources;
    let source = if project_sources.contains(&runner.id) {
        "project"
    } else if global_sources.contains(&runner.id) {
        "global"
    } else {
        "builtin"
    };

    // When skip_validation is true, return availability as None (pending)
    // to indicate validation hasn't been performed yet
    let (available, version) = if skip_validation {
        (None, None)
    } else {
        let is_available = runner.validate_command().is_ok();
        let ver = if is_available {
            runner.detect_version()
        } else {
            None
        };
        (Some(is_available), ver)
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

fn build_runner_list_response(
    project_path: &str,
    skip_validation: bool,
) -> Result<RunnerListResponse, String> {
    let registry =
        RunnerRegistry::load(PathBuf::from(project_path).as_path()).map_err(|e| e.to_string())?;
    let sources = load_runner_sources(project_path)?;
    let runners = registry
        .list()
        .into_iter()
        .map(|runner| build_runner_info(runner, &sources, skip_validation))
        .collect::<Vec<_>>();

    Ok(RunnerListResponse {
        default: registry.default().map(|value| value.to_string()),
        runners,
    })
}
