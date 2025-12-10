use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

use crate::projects::DesktopProject;

const TRAY_ICON_ID: &str = "leanspec-desktop-tray";
const TRAY_ID_OPEN: &str = "tray-open";
const TRAY_ID_ADD_PROJECT: &str = "tray-add";
const TRAY_ID_REFRESH: &str = "tray-refresh";
const TRAY_ID_QUIT: &str = "tray-quit";
const TRAY_ID_PREFERENCES: &str = "tray-preferences";
const TRAY_ID_CHECK_UPDATES: &str = "tray-updates";

pub fn init_tray(app: &AppHandle, projects: &[DesktopProject]) -> tauri::Result<()> {
    let menu = build_menu(app, projects)?;

    TrayIconBuilder::with_id(TRAY_ICON_ID)
        .menu(&menu)
        .on_menu_event(|app_handle, event| handle_menu_selection(app_handle, event.id().as_ref()))
        .build(app)?;

    Ok(())
}

pub fn rebuild_tray(app: &AppHandle, projects: &[DesktopProject]) -> tauri::Result<()> {
    let menu = build_menu(app, projects)?;

    if let Some(tray) = app.tray_by_id(TRAY_ICON_ID) {
        tray.set_menu(Some(menu))?;
    } else {
        init_tray(app, projects)?;
    }

    Ok(())
}

fn build_menu(app: &AppHandle, projects: &[DesktopProject]) -> tauri::Result<Menu> {
    let open = MenuItemBuilder::with_id(TRAY_ID_OPEN, "Open LeanSpec").build(app)?;
    let add_project = MenuItemBuilder::with_id(TRAY_ID_ADD_PROJECT, "Add project…").build(app)?;
    let refresh = MenuItemBuilder::with_id(TRAY_ID_REFRESH, "Refresh projects").build(app)?;
    let preferences = MenuItemBuilder::with_id(TRAY_ID_PREFERENCES, "Preferences").build(app)?;
    let updates = MenuItemBuilder::with_id(TRAY_ID_CHECK_UPDATES, "Check for updates").build(app)?;
    let quit = MenuItemBuilder::with_id(TRAY_ID_QUIT, "Quit").build(app)?;

    let mut project_items = Vec::new();
    for project in projects.iter().take(5) {
        let item = MenuItemBuilder::with_id(project_menu_id(&project.id), project.name.clone())
            .build(app)?;
        project_items.push(item);
    }

    let mut builder = MenuBuilder::new(app).item(&open);

    if !project_items.is_empty() {
        builder = builder.separator();
        for item in &project_items {
            builder = builder.item(item);
        }
    }

    builder = builder.separator();
    builder = builder.items(&[&add_project, &refresh, &preferences, &updates]);
    builder = builder.separator();
    builder = builder.item(&quit);

    builder.build()
}

fn handle_menu_selection(app: &AppHandle, id: &str) {
    match id {
        TRAY_ID_OPEN => {
            if let Some(window) = app.get_webview_window("main") {
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
        project if project.starts_with("project-") => {
            let project_id = project.trim_start_matches("project-");
            let _ = app.emit_all("desktop://tray-switch-project", project_id.to_string());
        }
        _ => {}
    }
}

fn project_menu_id(project_id: &str) -> String {
    format!("project-{project_id}")
}
