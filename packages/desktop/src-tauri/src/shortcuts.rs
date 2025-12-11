use serde::Serialize;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::config::read_config;

pub fn register_shortcuts(app: &AppHandle) {
    let shortcuts = app.global_shortcut();
    let config = read_config();

    let _ = shortcuts.unregister_all();

    let toggle = config.shortcuts.toggle_window.clone();
    let _ = shortcuts.on_shortcut(toggle.as_str(), move |handle, _, event| {
        if event.state == ShortcutState::Pressed {
            if let Some(window) = handle.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
    });

    let quick = config.shortcuts.quick_switcher.clone();
    let quick_handle = app.clone();
    let _ = shortcuts.on_shortcut(quick.as_str(), move |_, _, event| {
        if event.state == ShortcutState::Pressed {
            emit_to_main(&quick_handle, "desktop://shortcut-quick-switcher", ());
        }
    });

    let new_spec = config.shortcuts.new_spec.clone();
    let new_spec_handle = app.clone();
    let _ = shortcuts.on_shortcut(new_spec.as_str(), move |_, _, event| {
        if event.state == ShortcutState::Pressed {
            emit_to_main(&new_spec_handle, "desktop://shortcut-new-spec", ());
        }
    });
}

fn emit_to_main<T: Serialize>(app: &AppHandle, event: &str, payload: T) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit(event, payload);
    }
}
