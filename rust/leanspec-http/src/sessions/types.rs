//! Session Types
//!
//! Core types for session management including session configuration,
//! status tracking, and log/event structures.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A coding session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    /// Unique session ID (UUID)
    pub id: String,
    /// Project path where session runs
    pub project_path: String,
    /// Optional spec ID this session implements
    pub spec_id: Option<String>,
    /// AI tool used (claude, copilot, codex, opencode)
    pub tool: String,
    /// Session mode (guided, autonomous, ralph)
    pub mode: SessionMode,
    /// Current session status
    pub status: SessionStatus,
    /// Exit code (None if still running)
    pub exit_code: Option<i32>,
    /// When session started
    pub started_at: DateTime<Utc>,
    /// When session ended (None if still running)
    pub ended_at: Option<DateTime<Utc>>,
    /// Duration in milliseconds
    pub duration_ms: Option<u64>,
    /// Estimated token count
    pub token_count: Option<u64>,
    /// Additional metadata
    pub metadata: HashMap<String, String>,
    /// When session was created in database
    pub created_at: DateTime<Utc>,
    /// When session was last updated
    pub updated_at: DateTime<Utc>,
}

impl Session {
    /// Create a new session (pending status)
    pub fn new(
        id: String,
        project_path: String,
        spec_id: Option<String>,
        tool: String,
        mode: SessionMode,
    ) -> Self {
        let now = Utc::now();
        Self {
            id,
            project_path,
            spec_id,
            tool,
            mode,
            status: SessionStatus::Pending,
            exit_code: None,
            started_at: now.clone(),
            ended_at: None,
            duration_ms: None,
            token_count: None,
            metadata: HashMap::new(),
            created_at: now.clone(),
            updated_at: now,
        }
    }

    /// Check if session is currently running
    pub fn is_running(&self) -> bool {
        matches!(self.status, SessionStatus::Running | SessionStatus::Paused)
    }

    /// Check if session has completed (success, failed, or cancelled)
    pub fn is_completed(&self) -> bool {
        matches!(
            self.status,
            SessionStatus::Completed | SessionStatus::Failed | SessionStatus::Cancelled
        )
    }

    /// Calculate duration if session has ended
    pub fn calculate_duration(&self) -> Option<u64> {
        if let Some(ended) = self.ended_at {
            Some((ended - self.started_at).num_milliseconds() as u64)
        } else {
            None
        }
    }

    /// Update duration_ms if session has ended
    pub fn update_duration(&mut self) {
        if let Some(duration) = self.calculate_duration() {
            self.duration_ms = Some(duration);
        }
    }

    /// Mark session as updated
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }
}

/// Session mode - controls behavior during execution
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SessionMode {
    /// Pause between phases for user review
    Guided,
    /// Run all phases automatically
    #[default]
    Autonomous,
    /// Autonomous with quality loops (Ralph mode)
    Ralph,
}

/// Session status
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    /// Session created but not started
    #[default]
    Pending,
    /// Session is running
    Running,
    /// Session is paused
    Paused,
    /// Session completed successfully
    Completed,
    /// Session failed (non-zero exit code)
    Failed,
    /// Session was cancelled by user
    Cancelled,
}

impl SessionStatus {
    /// Check if status allows pausing
    pub fn can_pause(&self) -> bool {
        matches!(self, Self::Running)
    }

    /// Check if status allows resuming
    pub fn can_resume(&self) -> bool {
        matches!(self, Self::Paused)
    }

    /// Check if status allows stopping
    pub fn can_stop(&self) -> bool {
        matches!(self, Self::Pending | Self::Running | Self::Paused)
    }

    /// Check if status is terminal (completed, failed, cancelled)
    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Completed | Self::Failed | Self::Cancelled)
    }
}

/// Session log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionLog {
    /// Log entry ID (auto-incremented)
    pub id: i64,
    /// Session ID this log belongs to
    pub session_id: String,
    /// Timestamp when log was recorded
    pub timestamp: DateTime<Utc>,
    /// Log level
    pub level: LogLevel,
    /// Log message
    pub message: String,
}

/// Log level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    /// Standard output
    Stdout,
    /// Standard error
    Stderr,
    /// Debug information
    Debug,
    /// Informational
    Info,
    /// Warning
    Warning,
    /// Error
    Error,
}

/// Session lifecycle event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionEvent {
    /// Event ID (auto-incremented)
    pub id: i64,
    /// Session ID this event belongs to
    pub session_id: String,
    /// Event type
    pub event_type: EventType,
    /// Optional JSON data payload
    pub data: Option<String>,
    /// When event occurred
    pub timestamp: DateTime<Utc>,
}

/// Event type for session lifecycle
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EventType {
    /// Session was created
    Created,
    /// Session started
    Started,
    /// Session was paused
    Paused,
    /// Session was resumed
    Resumed,
    /// Session completed successfully
    Completed,
    /// Session failed with error
    Failed,
    /// Session was cancelled by user
    Cancelled,
    /// Session was archived
    Archived,
}

/// Configuration for creating a new session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionConfig {
    /// Project path
    pub project_path: String,
    /// Optional spec ID
    pub spec_id: Option<String>,
    /// AI tool to use
    pub tool: String,
    /// Session mode
    pub mode: SessionMode,
    /// Maximum iterations for Ralph mode
    pub max_iterations: Option<u32>,
    /// Working directory
    pub working_dir: Option<String>,
    /// Environment variables
    pub env_vars: HashMap<String, String>,
    /// Additional arguments for the tool
    pub tool_args: Vec<String>,
}

impl Default for SessionConfig {
    fn default() -> Self {
        Self {
            project_path: String::new(),
            spec_id: None,
            tool: "claude".to_string(),
            mode: SessionMode::Autonomous,
            max_iterations: None,
            working_dir: None,
            env_vars: HashMap::new(),
            tool_args: Vec::new(),
        }
    }
}
