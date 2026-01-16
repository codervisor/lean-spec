use anyhow::{anyhow, Result};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_updater::UpdaterExt;

use crate::config::{mutate_config, read_config};
use crate::projects::DesktopProject;
use crate::state::DesktopState;
use crate::tray;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopBootstrapPayload {
    pub active_project_id: Option<String>,
    pub config: crate::config::DesktopConfig,
    pub projects: Vec<DesktopProject>,
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
