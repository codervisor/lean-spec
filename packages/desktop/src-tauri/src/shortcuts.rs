use tauri::{AppHandle, GlobalShortcutManager, Manager};

use crate::config::read_config;

pub fn register_shortcuts(app: &AppHandle) {
    let mut manager = app.global_shortcut_manager();
    let config = read_config();

    let _ = manager.unregister_all();

    let toggle = config.shortcuts.toggle_window.clone();
    let _ = manager.register(toggle.as_str(), move || {
        if let Some(window) = app.get_window("main") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });

    let quick = config.shortcuts.quick_switcher.clone();
    let emitter = app.clone();
    let _ = manager.register(quick.as_str(), move || {
        let _ = emitter.emit_all("desktop://shortcut-quick-switcher", ());
    });

    let new_spec = config.shortcuts.new_spec.clone();
    let emitter = app.clone();
    let _ = manager.register(new_spec.as_str(), move || {
        let _ = emitter.emit_all("desktop://shortcut-new-spec", ());
    });
}
