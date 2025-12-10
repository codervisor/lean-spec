use tauri::{
    api::shell,
    CustomMenuItem,
    Manager,
    Menu,
    MenuItem,
    Submenu,
    WindowMenuEvent,
};

pub fn build_native_menu() -> Menu {
    let file_menu = Submenu::new(
        "File",
        Menu::new()
            .add_item(CustomMenuItem::new("new_spec", "New Spec...").accelerator("CmdOrCtrl+N"))
            .add_item(CustomMenuItem::new("open_project", "Open Project...").accelerator("CmdOrCtrl+O"))
            .add_item(
                CustomMenuItem::new("switch_project", "Switch Project...")
                    .accelerator("CmdOrCtrl+Shift+K"),
            )
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::CloseWindow)
            .add_native_item(MenuItem::Quit),
    );

    let edit_menu = Submenu::new(
        "Edit",
        Menu::new()
            .add_native_item(MenuItem::Cut)
            .add_native_item(MenuItem::Copy)
            .add_native_item(MenuItem::Paste)
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("find", "Find in Specs...").accelerator("CmdOrCtrl+F")),
    );

    let view_menu = Submenu::new(
        "View",
        Menu::new()
            .add_item(CustomMenuItem::new("refresh", "Refresh Projects").accelerator("CmdOrCtrl+R"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("toggle_sidebar", "Toggle Sidebar").accelerator("CmdOrCtrl+B"))
            .add_native_item(MenuItem::Separator)
            .add_native_item(MenuItem::EnterFullScreen),
    );

    let help_menu = Submenu::new(
        "Help",
        Menu::new()
            .add_item(CustomMenuItem::new("docs", "Documentation"))
            .add_item(CustomMenuItem::new("shortcuts", "Keyboard Shortcuts"))
            .add_native_item(MenuItem::Separator)
            .add_item(CustomMenuItem::new("updates", "Check for Updates"))
            .add_item(CustomMenuItem::new("logs", "View Logs"))
            .add_item(CustomMenuItem::new("about", "About LeanSpec")),
    );

    Menu::new()
        .add_submenu(file_menu)
        .add_submenu(edit_menu)
        .add_submenu(view_menu)
        .add_submenu(help_menu)
}

pub fn handle_menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "new_spec" => {
            let _ = event.window().emit("desktop://menu-new-spec", ());
        }
        "open_project" => {
            let _ = event
                .window()
                .app_handle()
                .emit_all("desktop://tray-add-project", ());
        }
        "switch_project" => {
            let _ = event
                .window()
                .emit("desktop://shortcut-quick-switcher", ());
        }
        "find" => {
            let _ = event.window().emit("desktop://menu-find", ());
        }
        "refresh" => {
            let _ = event
                .window()
                .app_handle()
                .emit_all("desktop://tray-refresh-projects", ());
        }
        "toggle_sidebar" => {
            let _ = event.window().emit("desktop://menu-toggle-sidebar", ());
        }
        "docs" => {
            let _ = shell::open(
                &event.window().shell_scope(),
                "https://lean-spec.dev/docs",
                None,
            );
        }
        "shortcuts" => {
            let _ = event.window().emit("desktop://menu-shortcuts", ());
        }
        "updates" => {
            let _ = event
                .window()
                .app_handle()
                .emit_all("desktop://tray-check-updates", ());
        }
        "logs" => {
            let _ = event.window().emit("desktop://menu-logs", ());
        }
        "about" => {
            let _ = event.window().emit("desktop://menu-about", ());
        }
        _ => {}
    }
}
