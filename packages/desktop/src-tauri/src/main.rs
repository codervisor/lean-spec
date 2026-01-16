#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod projects;
mod shortcuts;
mod specs;
mod state;
mod tray;

use tauri::WindowEvent;

use commands::{
    desktop_add_project, desktop_bootstrap, desktop_check_updates, desktop_refresh_projects,
    desktop_remove_project, desktop_rename_project, desktop_switch_project,
    desktop_toggle_favorite, desktop_validate_project, desktop_version,
};
use shortcuts::register_shortcuts;
use specs::{
    get_all_tags, get_dependency_graph, get_project_stats, get_spec_dependencies_cmd,
    get_spec_detail, get_specs, get_specs_by_status, search_specs, update_spec_status,
    validate_all_specs_cmd, validate_spec_cmd,
};
use state::DesktopState;

fn main() {
    let desktop_state = DesktopState::new();
    let tray_projects = desktop_state.project_store.all();

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(desktop_state)
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if config::read_config().behavior.minimize_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .setup(move |app| {
            register_shortcuts(&app.handle());
            tray::init_tray(&app.handle(), &tray_projects)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Desktop commands
            desktop_bootstrap,
            desktop_refresh_projects,
            desktop_switch_project,
            desktop_add_project,
            desktop_check_updates,
            desktop_version,
            desktop_validate_project,
            desktop_toggle_favorite,
            desktop_remove_project,
            desktop_rename_project,
            // Spec commands (Phase 1 & 2 of spec 169)
            get_specs,
            get_spec_detail,
            get_project_stats,
            get_dependency_graph,
            get_spec_dependencies_cmd,
            search_specs,
            get_specs_by_status,
            get_all_tags,
            validate_spec_cmd,
            validate_all_specs_cmd,
            update_spec_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running LeanSpec Desktop");
}
