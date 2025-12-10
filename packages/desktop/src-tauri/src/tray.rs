use tauri::{AppHandle, CustomMenuItem, Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

use crate::projects::DesktopProject;

const TRAY_ID_OPEN: &str = "tray-open";
const TRAY_ID_ADD_PROJECT: &str = "tray-add";
const TRAY_ID_REFRESH: &str = "tray-refresh";
const TRAY_ID_QUIT: &str = "tray-quit";
const TRAY_ID_PREFERENCES: &str = "tray-preferences";
const TRAY_ID_CHECK_UPDATES: &str = "tray-updates";

pub fn system_tray(projects: &[DesktopProject]) -> SystemTray {
    SystemTray::new().with_menu(build_menu(projects))
}

pub fn rebuild_tray(app: &AppHandle, projects: &[DesktopProject]) {
    let handle = app.tray_handle();
    let _ = handle.set_menu(build_menu(projects));
}

fn build_menu(projects: &[DesktopProject]) -> SystemTrayMenu {
    let mut menu = SystemTrayMenu::new();
    menu = menu.add_item(CustomMenuItem::new(TRAY_ID_OPEN, "Open LeanSpec"));

    if !projects.is_empty() {
        menu = menu.add_native_item(SystemTrayMenuItem::Separator);
        for project in projects.iter().take(5) {
            let title = format!("{}", project.name);
            menu = menu.add_item(CustomMenuItem::new(project_menu_id(&project.id), title));
        }
    }

    menu = menu.add_native_item(SystemTrayMenuItem::Separator);
    menu = menu.add_item(CustomMenuItem::new(TRAY_ID_ADD_PROJECT, "Add project…"));
    menu = menu.add_item(CustomMenuItem::new(TRAY_ID_REFRESH, "Refresh projects"));
    menu = menu.add_item(CustomMenuItem::new(TRAY_ID_PREFERENCES, "Preferences"));
    menu = menu.add_item(CustomMenuItem::new(TRAY_ID_CHECK_UPDATES, "Check for updates"));
    menu = menu.add_native_item(SystemTrayMenuItem::Separator);
    menu.add_item(CustomMenuItem::new(TRAY_ID_QUIT, "Quit"))
}

pub fn handle_event(app: &AppHandle, event: SystemTrayEvent) {
    if let SystemTrayEvent::MenuItemClick { id, .. } = event {
        match id.as_str() {
            TRAY_ID_OPEN => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            TRAY_ID_ADD_PROJECT => {
                let _ = app.emit_all("desktop://tray-add-project", ());
            }
            TRAY_ID_REFRESH => {
                let _ = app.emit_all("desktop://tray-refresh-projects", ());
            }
            TRAY_ID_PREFERENCES => {
                let _ = app.emit_all("desktop://tray-preferences", ());
            }
            TRAY_ID_CHECK_UPDATES => {
                let _ = app.emit_all("desktop://tray-check-updates", ());
            }
            TRAY_ID_QUIT => {
                std::process::exit(0);
            }
            other if other.starts_with("project-") => {
                let project_id = other.trim_start_matches("project-");
                let _ = app.emit_all("desktop://tray-switch-project", project_id.to_string());
            }
            _ => {}
        }
    }
}

fn project_menu_id(project_id: &str) -> String {
    format!("project-{project_id}")
}
