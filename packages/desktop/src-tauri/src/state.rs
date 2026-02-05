use crate::projects::ProjectStore;
use leanspec_core::storage::chat_config::ChatConfigStore;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct DesktopState {
    pub project_store: ProjectStore,
    pub chat_config: Arc<RwLock<ChatConfigStore>>,
}

impl DesktopState {
    pub fn new() -> Self {
        let chat_config = ChatConfigStore::load_default().expect("Failed to load chat config");
        Self {
            project_store: ProjectStore::load(),
            chat_config: Arc::new(RwLock::new(chat_config)),
        }
    }
}
