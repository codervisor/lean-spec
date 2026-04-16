//! Storage module
//!
//! Provides shared persistence for project registry and configuration.

pub mod config;
pub mod project_registry;

pub use config::{
    config_dir, config_path, load_config, load_config_from_path, projects_path, save_config,
    ServerConfig,
};
pub use project_registry::{Project, ProjectOptions, ProjectRegistry, ProjectUpdate};
