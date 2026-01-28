//! Storage module
//!
//! Provides shared persistence for chat sessions, project registry, and configuration.

pub mod chat_config;
pub mod chat_store;
pub mod config;
pub mod project_registry;

pub use chat_config::{
    ChatConfig, ChatConfigClient, ChatConfigStore, ChatConfigUpdate, ChatModel, ChatProvider,
    ChatProviderClient, ChatProviderUpdate, ChatSettings,
};
pub use chat_store::{ChatMessage, ChatMessageInput, ChatSession, ChatStorageInfo, ChatStore};
pub use config::{
    config_dir, config_path, load_config, load_config_from_path, projects_path, save_config,
    ServerConfig,
};
pub use project_registry::{Project, ProjectOptions, ProjectRegistry, ProjectUpdate};
