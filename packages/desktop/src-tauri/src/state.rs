use crate::projects::ProjectStore;

pub struct DesktopState {
    pub project_store: ProjectStore,
}

impl DesktopState {
    pub fn new() -> Self {
        Self {
            project_store: ProjectStore::load(),
        }
    }
}
