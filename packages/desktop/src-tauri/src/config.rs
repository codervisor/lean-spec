use std::{fs, path::PathBuf};

use dirs::home_dir;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};

static CONFIG: Lazy<RwLock<DesktopConfig>> = Lazy::new(|| RwLock::new(DesktopConfig::load_or_default()));

const CONFIG_DIR: &str = ".lean-spec";
const CONFIG_FILE: &str = "desktop.yaml";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopConfig {
    pub window: WindowPreferences,
    pub behavior: BehaviorPreferences,
    pub shortcuts: ShortcutPreferences,
    pub updates: UpdatePreferences,
    pub appearance: AppearancePreferences,
    #[serde(default)]
    pub active_project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowPreferences {
    pub width: u32,
    pub height: u32,
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub maximized: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BehaviorPreferences {
    pub start_minimized: bool,
    pub minimize_to_tray: bool,
    pub launch_at_login: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortcutPreferences {
    pub toggle_window: String,
    pub quick_switcher: String,
    pub new_spec: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePreferences {
    pub auto_check: bool,
    pub auto_install: bool,
    pub channel: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearancePreferences {
    pub theme: String,
}

impl Default for DesktopConfig {
    fn default() -> Self {
        Self {
            window: WindowPreferences {
                width: 1400,
                height: 900,
                x: None,
                y: None,
                maximized: false,
            },
            behavior: BehaviorPreferences {
                start_minimized: false,
                minimize_to_tray: true,
                launch_at_login: false,
            },
            shortcuts: ShortcutPreferences {
                toggle_window: "CommandOrControl+Shift+L".into(),
                quick_switcher: "CommandOrControl+Shift+K".into(),
                new_spec: "CommandOrControl+Shift+N".into(),
            },
            updates: UpdatePreferences {
                auto_check: true,
                auto_install: false,
                channel: "stable".into(),
            },
            appearance: AppearancePreferences {
                theme: "system".into(),
            },
            active_project_id: None,
        }
    }
}

impl DesktopConfig {
    fn load_or_default() -> Self {
        let path = config_file_path();
        match fs::read_to_string(&path) {
            Ok(raw) => match serde_yaml::from_str::<DesktopConfig>(&raw) {
                Ok(mut config) => {
                    normalize_config(&mut config);
                    config
                }
                Err(error) => {
                    eprintln!("Failed to parse desktop config: {error}");
                    Self::default()
                }
            },
            Err(_) => Self::default(),
        }
    }

    fn persist(&self) {
        if let Some(dir) = config_dir() {
            if fs::create_dir_all(&dir).is_ok() {
                let file = dir.join(CONFIG_FILE);
                if let Ok(serialized) = serde_yaml::to_string(self) {
                    if let Err(error) = fs::write(file, serialized) {
                        eprintln!("Unable to write desktop config: {error}");
                    }
                }
            }
        }
    }
}

fn normalize_config(config: &mut DesktopConfig) {
    if !matches!(config.appearance.theme.as_str(), "light" | "dark" | "system") {
        config.appearance.theme = "system".into();
    }

    if !matches!(config.updates.channel.as_str(), "stable" | "beta") {
        config.updates.channel = "stable".into();
    }
}

pub fn config_dir() -> Option<PathBuf> {
    home_dir().map(|home| home.join(CONFIG_DIR))
}

pub fn config_file_path() -> PathBuf {
    config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(CONFIG_FILE)
}

pub fn read_config() -> DesktopConfig {
    CONFIG.read().clone()
}

#[allow(dead_code)]
pub fn update_config(update: DesktopConfig) {
    {
        let mut guard = CONFIG.write();
        *guard = update.clone();
    }
    CONFIG.read().persist();
}

pub fn mutate_config<F>(mutator: F)
where
    F: FnOnce(&mut DesktopConfig),
{
    let mut guard = CONFIG.write();
    mutator(&mut guard);
    guard.persist();
}
