//! Session Management Module
//!
//! Provides session lifecycle management for AI coding tools.
//! Handles session creation, storage, monitoring, and lifecycle control.

pub mod adapter;
pub mod db;
pub mod manager;
pub mod types;

pub use adapter::{
    ClaudeAdapter, CodexAdapter, CopilotAdapter, OpenCodeAdapter, ToolAdapter, ToolManager,
};
pub use db::SessionDatabase;
pub use manager::SessionManager;
pub use types::{
    EventType, LogLevel, Session, SessionConfig, SessionEvent, SessionLog, SessionMode,
    SessionStatus,
};
