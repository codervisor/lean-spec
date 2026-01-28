//! Session management module
//!
//! Provides session types, database persistence, and tool adapters.

#![cfg(feature = "sessions")]

pub mod adapter;
pub mod database;
pub mod types;

pub mod manager;

pub use adapter::{
    ClaudeAdapter, CodexAdapter, CopilotAdapter, OpenCodeAdapter, ToolAdapter, ToolManager,
};
pub use database::SessionDatabase;
pub use manager::SessionManager;
pub use types::{
    EventType, LogLevel, Session, SessionConfig, SessionEvent, SessionLog, SessionMode,
    SessionStatus,
};
