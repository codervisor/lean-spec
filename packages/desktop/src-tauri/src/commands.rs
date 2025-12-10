use anyhow::{anyhow, Result};
use serde::Serialize;
use tauri::{
    api::{dialog::blocking::FileDialogBuilder, notification::Notification},
    AppHandle, Manager, State,
};

use crate::config::{mutate_config, read_config};
use crate::projects::DesktopProject;
use crate::state::DesktopState;
use crate::tray;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopBootstrapPayload {
    pub ui_url: String,
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
    state.ui_server.stop();

    if let Some(project) = project {
        notify(&app, "Active project switched", &format!("Now tracking {}", project.name));
    }

    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_add_project(app: AppHandle, state: State<'_, DesktopState>) -> Result<DesktopBootstrapPayload, String> {
    let selection = FileDialogBuilder::new().set_title("Add LeanSpec Project").pick_folder();

    if let Some(folder) = selection {
        let project = state
            .project_store
            .add_project(folder.as_path())
            .map_err(|error| error.to_string())?;

        state.project_store.set_active(&project.id);

        mutate_config(|config| {
            config.active_project_id = Some(project.id.clone());
        });
        state.ui_server.stop();

        notify(&app, "Project added", &format!("{} is now available", project.name));
    }

    build_and_publish(&app, &state).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn desktop_check_updates(app: AppHandle) -> Result<(), String> {
    app.updater()
        .check()
    .await
    .map(|_| ())
    .map_err(|error| error.to_string())
}

fn build_and_publish(app: &AppHandle, state: &DesktopState) -> Result<DesktopBootstrapPayload> {
    let payload = build_payload(app, state)?;
    tray::rebuild_tray(app, &payload.projects);
    app.emit_all("desktop://state-updated", payload.clone())
        .map_err(|error| anyhow!(error.to_string()))?;
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

    let ui_url = state
        .ui_server
        .ensure_running(app, active_project.as_ref())
        .map_err(|error| anyhow!(error.to_string()))?;

    Ok(DesktopBootstrapPayload {
        ui_url,
        active_project_id,
        config,
        projects,
    })
}

fn notify(app: &AppHandle, title: &str, body: &str) {
    let identifier = app.config().tauri.bundle.identifier.clone();
    let _ = Notification::new(&identifier).title(title).body(body).show();
}
