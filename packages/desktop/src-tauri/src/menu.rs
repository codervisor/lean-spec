use tauri::{
    menu::{Menu, MenuBuilder, MenuEvent, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    AppHandle, Emitter, Manager, Runtime,
};
use tauri_plugin_opener::OpenerExt;

pub fn build_native_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let new_spec = MenuItemBuilder::with_id("new_spec", "New Spec...")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let open_project = MenuItemBuilder::with_id("open_project", "Open Project...")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let switch_project = MenuItemBuilder::with_id("switch_project", "Switch Project...")
        .accelerator("CmdOrCtrl+Shift+K")
        .build(app)?;
    let close_window = PredefinedMenuItem::close_window(app, None)?;
    let quit = PredefinedMenuItem::quit(app, None)?;

    let find = MenuItemBuilder::with_id("find", "Find in Specs...")
        .accelerator("CmdOrCtrl+F")
        .build(app)?;
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;

    let refresh = MenuItemBuilder::with_id("refresh", "Refresh Projects")
        .accelerator("CmdOrCtrl+R")
        .build(app)?;
    let toggle_sidebar = MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
        .accelerator("CmdOrCtrl+B")
        .build(app)?;
    let fullscreen = PredefinedMenuItem::fullscreen(app, None)?;

    let docs = MenuItemBuilder::with_id("docs", "Documentation").build(app)?;
    let shortcuts = MenuItemBuilder::with_id("shortcuts", "Keyboard Shortcuts").build(app)?;
    let updates = MenuItemBuilder::with_id("updates", "Check for Updates").build(app)?;
    let logs = MenuItemBuilder::with_id("logs", "View Logs").build(app)?;
    let about = MenuItemBuilder::with_id("about", "About LeanSpec").build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .items(&[&new_spec, &open_project, &switch_project])
        .separator()
        .item(&close_window)
        .item(&quit)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .items(&[&cut, &copy, &paste])
        .separator()
        .item(&find)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&refresh)
        .separator()
        .item(&toggle_sidebar)
        .separator()
        .item(&fullscreen)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .items(&[&docs, &shortcuts])
        .separator()
        .items(&[&updates, &logs, &about])
        .build()?;

    MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &help_menu])
        .build()
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
    match event.id().as_ref() {
        "new_spec" => emit_to_main(app, "desktop://menu-new-spec"),
        "open_project" => emit_to_main(app, "desktop://menu-open-project"),
        "switch_project" => emit_to_main(app, "desktop://menu-switch-project"),
        "find" => emit_to_main(app, "desktop://menu-find"),
        "refresh" => emit_to_main(app, "desktop://menu-refresh"),
        "toggle_sidebar" => emit_to_main(app, "desktop://menu-toggle-sidebar"),
        "shortcuts" => emit_to_main(app, "desktop://menu-shortcuts"),
        "logs" => emit_to_main(app, "desktop://menu-logs"),
        "about" => emit_to_main(app, "desktop://menu-about"),
        "docs" => {
            let _ = app.opener().open_url("https://lean-spec.dev/docs", None::<&str>);
        }
        "updates" => emit_to_main(app, "desktop://menu-updates"),
        _ => {}
    }
}

fn emit_to_main<R: Runtime>(app: &AppHandle<R>, event: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(event, ());
    }
}
