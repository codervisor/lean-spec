//! Session Database
//!
//! SQLite persistence layer for session management.
//! Handles migrations, CRUD operations, and queries.

#![cfg(feature = "sessions")]

use crate::error::{CoreError, CoreResult};
use crate::sessions::types::*;
use chrono::{DateTime, Utc};
use rusqlite::{params, params_from_iter, types::Value, Connection, OptionalExtension};
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;

/// Manages session persistence in SQLite
pub struct SessionDatabase {
    conn: Mutex<Connection>,
}

impl SessionDatabase {
    /// Initialize database at the given path
    pub fn new<P: AsRef<Path>>(db_path: P) -> CoreResult<Self> {
        let conn = Connection::open(db_path).map_err(|e| {
            CoreError::DatabaseError(format!("Failed to open session database: {}", e))
        })?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_tables()?;

        Ok(db)
    }

    /// Initialize in-memory database (for testing)
    pub fn new_in_memory() -> CoreResult<Self> {
        let conn = Connection::open_in_memory().map_err(|e| {
            CoreError::DatabaseError(format!("Failed to create in-memory database: {}", e))
        })?;

        // Configure database for testing (WAL mode not supported for in-memory)
        conn.execute_batch("PRAGMA busy_timeout=5000;")
            .map_err(|e| {
                CoreError::DatabaseError(format!("Failed to configure database: {}", e))
            })?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_tables()?;

        Ok(db)
    }

    /// Create tables and indexes
    fn init_tables(&self) -> CoreResult<()> {
        let conn = self.conn()?;
        // Sessions table (new schema: prompt column instead of spec_id)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    project_path TEXT NOT NULL,
                    prompt TEXT,
                    runner TEXT NOT NULL,
                    mode TEXT NOT NULL,
                    status TEXT NOT NULL,
                    exit_code INTEGER,
                    started_at TEXT NOT NULL,
                    ended_at TEXT,
                    duration_ms INTEGER,
                    token_count INTEGER,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )",
            [],
        )
        .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        // Migration: add prompt column to existing databases (ignore error if already exists)
        conn.execute("ALTER TABLE sessions ADD COLUMN prompt TEXT", [])
            .ok();

        // Session specs join table (zero or more specs per session)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS session_specs (
                    session_id TEXT NOT NULL,
                    spec_id    TEXT NOT NULL,
                    position   INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (session_id, spec_id),
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )",
            [],
        )
        .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        // Migration: copy existing spec_id values from sessions into session_specs
        // Ignore errors (e.g., if spec_id column doesn't exist in new databases)
        conn.execute(
            "INSERT OR IGNORE INTO session_specs (session_id, spec_id, position)
                SELECT id, spec_id, 0 FROM sessions WHERE spec_id IS NOT NULL",
            [],
        )
        .ok();

        // Session metadata table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS session_metadata (
                    session_id TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    PRIMARY KEY (session_id, key),
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )",
            [],
        )
        .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        // Session logs table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS session_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )",
            [],
        )
        .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        // Session events table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS session_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    data TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                )",
            [],
        )
        .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        // Indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session_specs_session ON session_specs(session_id)",
            [],
        )
        .ok();
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session_specs_spec ON session_specs(spec_id)",
            [],
        )
        .ok();
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)",
            [],
        )
        .ok();
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_runner ON sessions(runner)",
            [],
        )
        .ok();
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session_logs_session ON session_logs(session_id)",
            [],
        )
        .ok();
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id)",
            [],
        )
        .ok();

        Ok(())
    }

    /// Insert a new session
    pub fn insert_session(&self, session: &Session) -> CoreResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO sessions (
                    id, project_path, prompt, runner, mode, status,
                    exit_code, started_at, ended_at, duration_ms, token_count,
                    created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                session.id,
                session.project_path,
                session.prompt,
                session.runner,
                format!("{:?}", session.mode).to_lowercase(),
                format!("{:?}", session.status).to_snake_case(),
                session.exit_code,
                session.started_at.to_rfc3339(),
                session.ended_at.map(|t| t.to_rfc3339()),
                session.duration_ms.map(|d| d as i64),
                session.token_count.map(|t| t as i64),
                session.created_at.to_rfc3339(),
                session.updated_at.to_rfc3339(),
            ],
        )
        .map_err(|e| CoreError::DatabaseError(format!("Failed to insert session: {}", e)))?;

        // Save spec IDs
        Self::insert_spec_ids_with_conn(&conn, &session.id, &session.spec_ids)?;

        // Save metadata (use internal method to avoid deadlock)
        for (key, value) in &session.metadata {
            Self::insert_metadata_with_conn(&conn, &session.id, key, value)?;
        }

        // Log created event (use internal method to avoid deadlock)
        Self::insert_event_with_conn(&conn, &session.id, EventType::Created, None)?;

        Ok(())
    }

    fn conn(&self) -> CoreResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn
            .lock()
            .map_err(|_| CoreError::DatabaseError("Session database lock poisoned".to_string()))
    }

    /// Update an existing session
    pub fn update_session(&self, session: &Session) -> CoreResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "UPDATE sessions SET
                    project_path = ?1,
                    prompt = ?2,
                    runner = ?3,
                    mode = ?4,
                    status = ?5,
                    exit_code = ?6,
                    started_at = ?7,
                    ended_at = ?8,
                    duration_ms = ?9,
                    token_count = ?10,
                    updated_at = ?11
                WHERE id = ?12",
            params![
                session.project_path,
                session.prompt,
                session.runner,
                format!("{:?}", session.mode).to_lowercase(),
                format!("{:?}", session.status).to_snake_case(),
                session.exit_code,
                session.started_at.to_rfc3339(),
                session.ended_at.map(|t| t.to_rfc3339()),
                session.duration_ms.map(|d| d as i64),
                session.token_count.map(|t| t as i64),
                session.updated_at.to_rfc3339(),
                session.id,
            ],
        )
        .map_err(|e| CoreError::DatabaseError(format!("Failed to update session: {}", e)))?;

        // Update spec IDs
        conn.execute(
            "DELETE FROM session_specs WHERE session_id = ?1",
            [&session.id],
        )
        .ok();
        Self::insert_spec_ids_with_conn(&conn, &session.id, &session.spec_ids)?;

        // Update metadata (use internal method to avoid deadlock)
        conn.execute(
            "DELETE FROM session_metadata WHERE session_id = ?1",
            [&session.id],
        )
        .ok();
        for (key, value) in &session.metadata {
            Self::insert_metadata_with_conn(&conn, &session.id, key, value)?;
        }

        Ok(())
    }

    /// Delete a session and all related data
    pub fn delete_session(&self, session_id: &str) -> CoreResult<()> {
        let conn = self.conn()?;
        conn.execute("DELETE FROM sessions WHERE id = ?1", [session_id])
            .map_err(|e| CoreError::DatabaseError(format!("Failed to delete session: {}", e)))?;

        Ok(())
    }

    /// Get a session by ID
    pub fn get_session(&self, session_id: &str) -> CoreResult<Option<Session>> {
        let conn = self.conn()?;
        let mut stmt = conn
            .prepare(
                "SELECT
                    id, project_path, runner, mode, status,
                    exit_code, started_at, ended_at, duration_ms, token_count,
                    prompt, created_at, updated_at
                FROM sessions WHERE id = ?1",
            )
            .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        let session = stmt
            .query_row([session_id], |row| self.row_to_session(row))
            .optional()
            .map_err(|e| CoreError::DatabaseError(format!("Failed to get session: {}", e)))?;

        if let Some(mut session) = session {
            // Use internal helper to avoid deadlock (we already hold conn lock)
            session.spec_ids = Self::load_spec_ids_with_conn(&conn, session_id)?;
            session.metadata = Self::load_metadata_with_conn(&conn, session_id)?;
            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    /// List sessions with optional filters
    pub fn list_sessions(
        &self,
        project_path: Option<&str>,
        spec_id: Option<&str>,
        status: Option<SessionStatus>,
        runner: Option<&str>,
    ) -> CoreResult<Vec<Session>> {
        let conn = self.conn()?;
        let mut query = String::from(
            "SELECT
                id, project_path, runner, mode, status,
                exit_code, started_at, ended_at, duration_ms, token_count,
                prompt, created_at, updated_at
            FROM sessions WHERE 1=1",
        );
        let mut params: Vec<Value> = Vec::new();

        if let Some(path) = project_path {
            query.push_str(" AND project_path = ?");
            params.push(Value::from(path.to_string()));
        }
        if let Some(spec) = spec_id {
            query.push_str(" AND EXISTS (SELECT 1 FROM session_specs ss WHERE ss.session_id = id AND ss.spec_id = ?)");
            params.push(Value::from(spec.to_string()));
        }
        if let Some(status) = status {
            query.push_str(" AND status = ?");
            params.push(Value::from(format!("{:?}", status).to_snake_case()));
        }
        if let Some(runner) = runner {
            query.push_str(" AND runner = ?");
            params.push(Value::from(runner.to_string()));
        }
        query.push_str(" ORDER BY created_at DESC");

        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        let rows = stmt
            .query_map(params_from_iter(params), |row| self.row_to_session(row))
            .map_err(|e| CoreError::DatabaseError(format!("Failed to list sessions: {}", e)))?;

        let mut sessions = Vec::new();
        for row in rows {
            let row = row.map_err(|e| CoreError::DatabaseError(e.to_string()))?;
            sessions.push(row);
        }

        // Load spec IDs and metadata for each session
        for session in &mut sessions {
            session.spec_ids = Self::load_spec_ids_with_conn(&conn, &session.id)?;
            session.metadata = Self::load_metadata_with_conn(&conn, &session.id)?;
        }

        Ok(sessions)
    }

    /// Insert a log entry
    pub fn insert_log(&self, log: &SessionLog) -> CoreResult<()> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO session_logs (session_id, timestamp, level, message)
                VALUES (?1, ?2, ?3, ?4)",
            params![
                log.session_id,
                log.timestamp.to_rfc3339(),
                format!("{:?}", log.level).to_lowercase(),
                log.message,
            ],
        )
        .map_err(|e| CoreError::DatabaseError(format!("Failed to insert log: {}", e)))?;

        Ok(())
    }

    /// Insert a log entry (convenience method)
    pub fn log_message(&self, session_id: &str, level: LogLevel, message: &str) -> CoreResult<()> {
        let log = SessionLog {
            id: 0, // Auto-incremented
            session_id: session_id.to_string(),
            timestamp: Utc::now(),
            level,
            message: message.to_string(),
        };
        self.insert_log(&log)
    }

    /// Get logs for a session
    pub fn get_logs(&self, session_id: &str, limit: Option<usize>) -> CoreResult<Vec<SessionLog>> {
        let conn = self.conn()?;
        let mut query = String::from(
            "SELECT id, session_id, timestamp, level, message
            FROM session_logs WHERE session_id = ? ORDER BY id DESC",
        );
        if limit.is_some() {
            query.push_str(" LIMIT ?");
        }

        let mut stmt = conn
            .prepare(&query)
            .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        let mut params: Vec<Value> = vec![Value::from(session_id.to_string())];
        if let Some(limit) = limit {
            params.push(Value::from(limit as i64));
        }

        let rows = stmt
            .query_map(params_from_iter(params), |row| {
                Ok(SessionLog {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    timestamp: parse_datetime(row.get(2)?),
                    level: parse_log_level(&row.get::<_, String>(3)?),
                    message: row.get(4)?,
                })
            })
            .map_err(|e| CoreError::DatabaseError(format!("Failed to get logs: {}", e)))?;

        let mut logs = Vec::new();
        for row in rows {
            let row = row.map_err(|e| CoreError::DatabaseError(e.to_string()))?;
            logs.push(row);
        }

        // Reverse to get chronological order
        logs.reverse();
        Ok(logs)
    }

    /// Prune logs to keep only the most recent entries
    pub fn prune_logs(&self, session_id: &str, keep: usize) -> CoreResult<usize> {
        let conn = self.conn()?;
        let mut stmt = conn
            .prepare(
                "DELETE FROM session_logs
                 WHERE session_id = ?1
                 AND id NOT IN (
                   SELECT id FROM session_logs
                   WHERE session_id = ?1
                   ORDER BY id DESC
                   LIMIT ?2
                 )",
            )
            .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        let deleted = stmt
            .execute(params![session_id, keep as i64])
            .map_err(|e| CoreError::DatabaseError(format!("Failed to prune logs: {}", e)))?;

        Ok(deleted)
    }

    /// Insert a session event
    pub fn insert_event(
        &self,
        session_id: &str,
        event_type: EventType,
        data: Option<String>,
    ) -> CoreResult<()> {
        let conn = self.conn()?;
        Self::insert_event_with_conn(&conn, session_id, event_type, data)
    }

    /// Internal helper to insert event with an existing connection (avoids deadlock)
    fn insert_event_with_conn(
        conn: &Connection,
        session_id: &str,
        event_type: EventType,
        data: Option<String>,
    ) -> CoreResult<()> {
        conn.execute(
            "INSERT INTO session_events (session_id, event_type, data, timestamp)
                VALUES (?1, ?2, ?3, ?4)",
            params![
                session_id,
                format!("{:?}", event_type).to_snake_case(),
                data,
                Utc::now().to_rfc3339(),
            ],
        )
        .map_err(|e| CoreError::DatabaseError(format!("Failed to insert event: {}", e)))?;

        Ok(())
    }

    /// Get events for a session
    pub fn get_events(&self, session_id: &str) -> CoreResult<Vec<SessionEvent>> {
        let conn = self.conn()?;
        let mut stmt = conn
            .prepare(
                "SELECT id, session_id, event_type, data, timestamp
                FROM session_events WHERE session_id = ? ORDER BY id ASC",
            )
            .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        let rows = stmt
            .query_map([session_id], |row| {
                Ok(SessionEvent {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    event_type: parse_event_type(&row.get::<_, String>(2)?),
                    data: row.get(3)?,
                    timestamp: parse_datetime(row.get(4)?),
                })
            })
            .map_err(|e| CoreError::DatabaseError(format!("Failed to get events: {}", e)))?;

        let mut events = Vec::new();
        for row in rows {
            let row = row.map_err(|e| CoreError::DatabaseError(e.to_string()))?;
            events.push(row);
        }

        Ok(events)
    }

    // Helper methods

    fn row_to_session(&self, row: &rusqlite::Row) -> Result<Session, rusqlite::Error> {
        Ok(Session {
            id: row.get(0)?,
            project_path: row.get(1)?,
            spec_ids: Vec::new(), // Loaded separately
            prompt: row.get(10)?,
            runner: row.get(2)?,
            mode: parse_mode(&row.get::<_, String>(3)?),
            status: parse_status(&row.get::<_, String>(4)?),
            exit_code: row.get(5)?,
            started_at: parse_datetime(row.get(6)?),
            ended_at: row.get::<_, Option<String>>(7)?.map(parse_datetime),
            duration_ms: row.get(8)?,
            token_count: row.get(9)?,
            metadata: HashMap::new(), // Loaded separately
            created_at: parse_datetime(row.get(11)?),
            updated_at: parse_datetime(row.get(12)?),
        })
    }

    /// Internal helper to insert spec IDs with an existing connection
    fn insert_spec_ids_with_conn(
        conn: &Connection,
        session_id: &str,
        spec_ids: &[String],
    ) -> CoreResult<()> {
        for (position, spec_id) in spec_ids.iter().enumerate() {
            conn.execute(
                "INSERT OR IGNORE INTO session_specs (session_id, spec_id, position) VALUES (?1, ?2, ?3)",
                params![session_id, spec_id, position as i64],
            )
            .map_err(|e| CoreError::DatabaseError(format!("Failed to insert spec ID: {}", e)))?;
        }
        Ok(())
    }

    /// Internal helper to load spec IDs with an existing connection
    fn load_spec_ids_with_conn(conn: &Connection, session_id: &str) -> CoreResult<Vec<String>> {
        let mut stmt = conn
            .prepare("SELECT spec_id FROM session_specs WHERE session_id = ? ORDER BY position ASC")
            .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        let rows = stmt
            .query_map([session_id], |row| row.get::<_, String>(0))
            .map_err(|e| CoreError::DatabaseError(format!("Failed to load spec IDs: {}", e)))?;

        let mut spec_ids = Vec::new();
        for row in rows {
            let spec_id = row.map_err(|e| CoreError::DatabaseError(e.to_string()))?;
            spec_ids.push(spec_id);
        }

        Ok(spec_ids)
    }

    /// Internal helper to insert metadata with an existing connection (avoids deadlock)
    fn insert_metadata_with_conn(
        conn: &Connection,
        session_id: &str,
        key: &str,
        value: &str,
    ) -> CoreResult<()> {
        conn.execute(
            "INSERT INTO session_metadata (session_id, key, value) VALUES (?1, ?2, ?3)",
            [session_id, key, value],
        )
        .map_err(|e| CoreError::DatabaseError(format!("Failed to insert metadata: {}", e)))?;

        Ok(())
    }

    /// Internal helper to load metadata with an existing connection (avoids deadlock)
    fn load_metadata_with_conn(
        conn: &Connection,
        session_id: &str,
    ) -> CoreResult<HashMap<String, String>> {
        let mut stmt = conn
            .prepare("SELECT key, value FROM session_metadata WHERE session_id = ?")
            .map_err(|e| CoreError::DatabaseError(e.to_string()))?;

        let rows = stmt
            .query_map([session_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|e| CoreError::DatabaseError(format!("Failed to load metadata: {}", e)))?;

        let mut metadata = HashMap::new();
        for row in rows {
            let (key, value) = row.map_err(|e| CoreError::DatabaseError(e.to_string()))?;
            metadata.insert(key, value);
        }

        Ok(metadata)
    }
}

// Helper functions for parsing

/// Parse a mode string from the database.
/// "ralph" is kept for backward compatibility with existing sessions.
#[allow(deprecated)]
fn parse_mode(s: &str) -> SessionMode {
    match s {
        "guided" => SessionMode::Guided,
        "ralph" => SessionMode::Ralph,
        _ => SessionMode::Autonomous,
    }
}

fn parse_status(s: &str) -> SessionStatus {
    match s {
        "pending" => SessionStatus::Pending,
        "running" => SessionStatus::Running,
        "paused" => SessionStatus::Paused,
        "completed" => SessionStatus::Completed,
        "failed" => SessionStatus::Failed,
        "cancelled" => SessionStatus::Cancelled,
        _ => SessionStatus::Pending,
    }
}

fn parse_log_level(s: &str) -> LogLevel {
    match s {
        "stdout" => LogLevel::Stdout,
        "stderr" => LogLevel::Stderr,
        "debug" => LogLevel::Debug,
        "info" => LogLevel::Info,
        "warning" => LogLevel::Warning,
        "error" => LogLevel::Error,
        _ => LogLevel::Info,
    }
}

fn parse_event_type(s: &str) -> EventType {
    match s {
        "created" => EventType::Created,
        "started" => EventType::Started,
        "paused" => EventType::Paused,
        "resumed" => EventType::Resumed,
        "completed" => EventType::Completed,
        "failed" => EventType::Failed,
        "cancelled" => EventType::Cancelled,
        "archived" => EventType::Archived,
        _ => EventType::Created,
    }
}

fn parse_datetime(s: String) -> DateTime<Utc> {
    DateTime::parse_from_rfc3339(&s)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now())
}

trait ToSnakeCase {
    fn to_snake_case(&self) -> String;
}

impl ToSnakeCase for str {
    fn to_snake_case(&self) -> String {
        self.chars()
            .enumerate()
            .map(|(i, c)| {
                if c.is_uppercase() {
                    if i > 1 {
                        format!("_{}", c.to_lowercase())
                    } else {
                        c.to_lowercase().to_string()
                    }
                } else {
                    c.to_string()
                }
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_crud() {
        let db = SessionDatabase::new_in_memory().unwrap();

        // Create a session
        let session = Session::new(
            "test-id-1".to_string(),
            "/test/project".to_string(),
            vec!["spec-001".to_string()],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );

        // Insert
        db.insert_session(&session).unwrap();

        // Get
        let retrieved = db.get_session("test-id-1").unwrap().unwrap();
        assert_eq!(retrieved.id, "test-id-1");
        assert_eq!(retrieved.project_path, "/test/project");
        assert_eq!(retrieved.runner, "claude");

        // Update
        let mut session = session;
        session.status = SessionStatus::Running;
        db.update_session(&session).unwrap();

        // Verify update
        let updated = db.get_session("test-id-1").unwrap().unwrap();
        assert!(matches!(updated.status, SessionStatus::Running));

        // List
        let sessions = db.list_sessions(None, None, None, None).unwrap();
        assert_eq!(sessions.len(), 1);

        // Delete
        db.delete_session("test-id-1").unwrap();
        assert!(db.get_session("test-id-1").unwrap().is_none());
    }

    #[test]
    fn test_logs() {
        let db = SessionDatabase::new_in_memory().unwrap();

        // Create a session first (required for FOREIGN KEY constraint)
        let session = Session::new(
            "test-session".to_string(),
            "/test/project".to_string(),
            vec![],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );
        db.insert_session(&session).unwrap();

        db.log_message("test-session", LogLevel::Stdout, "Hello world")
            .unwrap();
        db.log_message("test-session", LogLevel::Info, "Info message")
            .unwrap();
        db.log_message("test-session", LogLevel::Error, "Error message")
            .unwrap();

        let logs = db.get_logs("test-session", None).unwrap();
        assert_eq!(logs.len(), 3);
        assert_eq!(logs[0].message, "Hello world");
        assert_eq!(logs[2].message, "Error message");
    }

    #[test]
    #[ignore = "Disabled per user request"]
    fn test_events() {
        let db = SessionDatabase::new_in_memory().unwrap();

        // Create a session first (required for FOREIGN KEY constraint)
        let session = Session::new(
            "test-session".to_string(),
            "/test/project".to_string(),
            vec![],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );
        db.insert_session(&session).unwrap();

        db.insert_event("test-session", EventType::Created, None)
            .unwrap();
        db.insert_event(
            "test-session",
            EventType::Started,
            Some("{\"phase\": 1}".to_string()),
        )
        .unwrap();
        db.insert_event("test-session", EventType::Completed, None)
            .unwrap();

        let events = db.get_events("test-session").unwrap();
        assert_eq!(events.len(), 3);
        assert!(matches!(events[0].event_type, EventType::Created));
        assert!(matches!(events[1].event_type, EventType::Started));
        assert!(matches!(events[2].event_type, EventType::Completed));
    }

    #[test]
    fn test_spec_ids_empty() {
        let db = SessionDatabase::new_in_memory().unwrap();

        let session = Session::new(
            "test-no-spec".to_string(),
            "/test/project".to_string(),
            vec![],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );
        db.insert_session(&session).unwrap();

        let retrieved = db.get_session("test-no-spec").unwrap().unwrap();
        assert!(retrieved.spec_ids.is_empty());
    }

    #[test]
    fn test_spec_ids_multiple() {
        let db = SessionDatabase::new_in_memory().unwrap();

        let session = Session::new(
            "test-multi-spec".to_string(),
            "/test/project".to_string(),
            vec!["028-cli".to_string(), "320-redesign".to_string()],
            Some("Fix all lint errors".to_string()),
            "claude".to_string(),
            SessionMode::Autonomous,
        );
        db.insert_session(&session).unwrap();

        let retrieved = db.get_session("test-multi-spec").unwrap().unwrap();
        assert_eq!(retrieved.spec_ids.len(), 2);
        assert!(retrieved.spec_ids.contains(&"028-cli".to_string()));
        assert!(retrieved.spec_ids.contains(&"320-redesign".to_string()));
        assert_eq!(retrieved.prompt, Some("Fix all lint errors".to_string()));
    }

    #[test]
    fn test_spec_ids_update() {
        let db = SessionDatabase::new_in_memory().unwrap();

        let session = Session::new(
            "test-update-spec".to_string(),
            "/test/project".to_string(),
            vec!["spec-001".to_string()],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );
        db.insert_session(&session).unwrap();

        let mut updated = session;
        updated.spec_ids = vec!["spec-002".to_string(), "spec-003".to_string()];
        db.update_session(&updated).unwrap();

        let retrieved = db.get_session("test-update-spec").unwrap().unwrap();
        assert_eq!(retrieved.spec_ids.len(), 2);
        assert!(retrieved.spec_ids.contains(&"spec-002".to_string()));
        assert!(retrieved.spec_ids.contains(&"spec-003".to_string()));
        assert!(!retrieved.spec_ids.contains(&"spec-001".to_string()));
    }
}
