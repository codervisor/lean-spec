use tauri::{AppHandle, GlobalShortcutManager, Manager};

use crate::config::read_config;

pub fn register_shortcuts(app: &AppHandle) {
    let mut manager = app.global_shortcut_manager();
    let config = read_config();

    let _ = manager.unregister_all();

    let toggle = config.shortcuts.toggle_window.clone();
    let toggle_handle = app.clone();
    let _ = manager.register(toggle.as_str(), move || {
        if let Some(window) = toggle_handle.get_window("main") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });

    let quick = config.shortcuts.quick_switcher.clone();
    let quick_handle = app.clone();
    let _ = manager.register(quick.as_str(), move || {
        let _ = quick_handle.emit_all("desktop://shortcut-quick-switcher", ());
    });

    let new_spec = config.shortcuts.new_spec.clone();
    let new_spec_handle = app.clone();
    let _ = manager.register(new_spec.as_str(), move || {
        let _ = new_spec_handle.emit_all("desktop://shortcut-new-spec", ());
    });
}
