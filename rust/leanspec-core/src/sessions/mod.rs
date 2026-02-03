//! Session management module
//!
//! Provides session types, database persistence, and runner registry.

pub mod database;
pub mod runner;
pub mod types;

pub mod manager;

pub use database::SessionDatabase;
pub use manager::{ArchiveOptions, SessionManager};
pub use runner::{
    global_runners_path, project_runners_path, DetectionConfig, DetectionResult, RunnerDefinition,
    RunnerRegistry, RunnersFile,
};
pub use types::{
    EventType, LogLevel, Session, SessionConfig, SessionEvent, SessionLog, SessionMode,
    SessionStatus,
};
