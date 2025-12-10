use crate::projects::ProjectStore;
use crate::ui_server::UiServerManager;

pub struct DesktopState {
    pub project_store: ProjectStore,
    pub ui_server: UiServerManager,
}

impl DesktopState {
    pub fn new() -> Self {
        Self {
            project_store: ProjectStore::load(),
            ui_server: UiServerManager::new(),
        }
    }
}
