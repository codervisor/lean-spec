#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod projects;
mod shortcuts;
mod state;
mod tray;
mod ui_server;

use tauri::WindowEvent;

use commands::{
    desktop_add_project,
    desktop_bootstrap,
    desktop_check_updates,
    desktop_refresh_projects,
    desktop_switch_project,
};
use shortcuts::register_shortcuts;
use state::DesktopState;

fn main() {
    let desktop_state = DesktopState::new();
    let initial_projects = desktop_state.project_store.all();

    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .system_tray(tray::system_tray(&initial_projects))
        .on_system_tray_event(tray::handle_event)
        .manage(desktop_state)
        .on_window_event(|event| {
            if let WindowEvent::CloseRequested { api, .. } = event.event() {
                if config::read_config().behavior.minimize_to_tray {
                    api.prevent_close();
                    let _ = event.window().hide();
                }
            }
        })
        .setup(|app| {
            register_shortcuts(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop_bootstrap,
            desktop_refresh_projects,
            desktop_switch_project,
            desktop_add_project,
            desktop_check_updates
        ])
        .run(tauri::generate_context!())
        .expect("error while running LeanSpec Desktop");
}
