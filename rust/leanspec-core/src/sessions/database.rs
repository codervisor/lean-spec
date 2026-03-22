//! Session Database
//!
//! Async SQLite persistence layer for session management via sqlx.
//! Handles CRUD operations and queries.

#![cfg(feature = "sessions")]

use crate::error::{CoreError, CoreResult};
use crate::sessions::runner::{global_runners_path, read_runners_file};
use crate::sessions::types::*;
use chrono::{DateTime, Utc};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::path::Path;

/// Manages session persistence in SQLite via sqlx
#[derive(Clone)]
pub struct SessionDatabase {
    pool: SqlitePool,
}

impl SessionDatabase {
    /// Create a SessionDatabase backed by the given pool
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Insert a new session
    pub async fn insert_session(&self, session: &Session) -> CoreResult<()> {
        let mode = format!("{:?}", session.mode).to_lowercase();
        let status = format!("{:?}", session.status).to_snake_case();
        let started_at = session.started_at.to_rfc3339();
        let ended_at = session.ended_at.map(|t| t.to_rfc3339());
        let duration_ms = session.duration_ms.map(|d| d as i64);
        let token_count = session.token_count.map(|t| t as i64);
        let created_at = session.created_at.to_rfc3339();
        let updated_at = session.updated_at.to_rfc3339();

        sqlx::query(
            "INSERT INTO sessions (
                id, project_path, prompt, runner, mode, status,
                exit_code, started_at, ended_at, duration_ms, token_count,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&session.id)
        .bind(&session.project_path)
        .bind(&session.prompt)
        .bind(&session.runner)
        .bind(&mode)
        .bind(&status)
        .bind(session.exit_code)
        .bind(&started_at)
        .bind(&ended_at)
        .bind(duration_ms)
        .bind(token_count)
        .bind(&created_at)
        .bind(&updated_at)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to insert session: {}", e)))?;

        // Save spec IDs
        self.insert_spec_ids(&session.id, &session.spec_ids).await?;

        // Save metadata
        for (key, value) in &session.metadata {
            self.insert_metadata(&session.id, key, value).await?;
        }

        // Log created event
        self.insert_event_inner(&session.id, EventType::Created, None)
            .await?;

        Ok(())
    }

    /// Import session data from a legacy sessions.db file
    pub async fn migrate_from_legacy_db<P: AsRef<Path>>(&self, legacy_path: P) -> CoreResult<bool> {
        let legacy_path = legacy_path.as_ref();
        if !legacy_path.exists() {
            return Ok(false);
        }

        let legacy_str = legacy_path.to_string_lossy().to_string();
        let attach_sql = format!("ATTACH DATABASE '{}' AS legacy_sessions", legacy_str);

        sqlx::query(&attach_sql)
            .execute(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to attach legacy DB: {}", e)))?;

        let mut imported = false;
        let result: CoreResult<()> = async {
            if table_exists(&self.pool, "legacy_sessions", "sessions").await? {
                let prompt_expr =
                    if column_exists(&self.pool, "legacy_sessions", "sessions", "prompt").await? {
                        "prompt"
                    } else {
                        "NULL"
                    };
                let exit_code_expr = if column_exists(
                    &self.pool,
                    "legacy_sessions",
                    "sessions",
                    "exit_code",
                )
                .await?
                {
                    "exit_code"
                } else {
                    "NULL"
                };
                let ended_at_expr = if column_exists(
                    &self.pool,
                    "legacy_sessions",
                    "sessions",
                    "ended_at",
                )
                .await?
                {
                    "ended_at"
                } else {
                    "NULL"
                };
                let duration_ms_expr = if column_exists(
                    &self.pool,
                    "legacy_sessions",
                    "sessions",
                    "duration_ms",
                )
                .await?
                {
                    "duration_ms"
                } else {
                    "NULL"
                };
                let token_count_expr = if column_exists(
                    &self.pool,
                    "legacy_sessions",
                    "sessions",
                    "token_count",
                )
                .await?
                {
                    "token_count"
                } else {
                    "NULL"
                };
                let created_at_expr = if column_exists(
                    &self.pool,
                    "legacy_sessions",
                    "sessions",
                    "created_at",
                )
                .await?
                {
                    "created_at"
                } else {
                    "started_at"
                };
                let updated_at_expr = if column_exists(
                    &self.pool,
                    "legacy_sessions",
                    "sessions",
                    "updated_at",
                )
                .await?
                {
                    "updated_at"
                } else {
                    "started_at"
                };

                let sql = format!(
                    "INSERT OR IGNORE INTO sessions (
                        id, project_path, prompt, runner, mode, status,
                        exit_code, started_at, ended_at, duration_ms, token_count,
                        created_at, updated_at
                    )
                    SELECT
                        id, project_path, {}, runner, mode, status,
                        {}, started_at, {}, {}, {},
                        {}, {}
                    FROM legacy_sessions.sessions",
                    prompt_expr,
                    exit_code_expr,
                    ended_at_expr,
                    duration_ms_expr,
                    token_count_expr,
                    created_at_expr,
                    updated_at_expr
                );
                sqlx::query(&sql)
                    .execute(&self.pool)
                    .await
                    .map_err(|e| {
                        CoreError::DatabaseError(format!("Failed to import sessions: {}", e))
                    })?;
                imported = true;
            }

            if table_exists(&self.pool, "legacy_sessions", "session_specs").await? {
                sqlx::query(
                    "INSERT OR IGNORE INTO session_specs (session_id, spec_id, position)
                     SELECT session_id, spec_id, position FROM legacy_sessions.session_specs",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| {
                    CoreError::DatabaseError(format!("Failed to import session_specs: {}", e))
                })?;
                imported = true;
            } else if table_exists(&self.pool, "legacy_sessions", "sessions").await?
                && column_exists(&self.pool, "legacy_sessions", "sessions", "spec_id").await?
            {
                sqlx::query(
                    "INSERT OR IGNORE INTO session_specs (session_id, spec_id, position)
                     SELECT id, spec_id, 0 FROM legacy_sessions.sessions WHERE spec_id IS NOT NULL",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| {
                    CoreError::DatabaseError(format!(
                        "Failed to import legacy spec_id links: {}",
                        e
                    ))
                })?;
                imported = true;
            }

            if table_exists(&self.pool, "legacy_sessions", "session_metadata").await? {
                sqlx::query(
                    "INSERT OR IGNORE INTO session_metadata (session_id, key, value)
                     SELECT session_id, key, value FROM legacy_sessions.session_metadata",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| {
                    CoreError::DatabaseError(format!("Failed to import session_metadata: {}", e))
                })?;
                imported = true;
            }

            if table_exists(&self.pool, "legacy_sessions", "session_logs").await? {
                sqlx::query(
                    "INSERT OR IGNORE INTO session_logs (id, session_id, timestamp, level, message)
                     SELECT id, session_id, timestamp, level, message FROM legacy_sessions.session_logs",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| {
                    CoreError::DatabaseError(format!("Failed to import session_logs: {}", e))
                })?;
                imported = true;
            }

            if table_exists(&self.pool, "legacy_sessions", "session_events").await? {
                sqlx::query(
                    "INSERT OR IGNORE INTO session_events (id, session_id, event_type, data, timestamp)
                     SELECT id, session_id, event_type, data, timestamp FROM legacy_sessions.session_events",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| {
                    CoreError::DatabaseError(format!("Failed to import session_events: {}", e))
                })?;
                imported = true;
            }

            Ok(())
        }
        .await;

        let _ = sqlx::query("DETACH DATABASE legacy_sessions")
            .execute(&self.pool)
            .await;
        result?;
        Ok(imported)
    }

    /// Import global runners.json into the unified runners table.
    pub async fn migrate_from_legacy_runners_json(&self) -> CoreResult<bool> {
        let legacy_path = global_runners_path();
        let Some(file) = read_runners_file(&legacy_path)? else {
            return Ok(false);
        };

        let now = Utc::now().to_rfc3339();
        let default_runner = file.default.clone();

        for (runner_id, config) in file.runners {
            let config_json = serde_json::to_string(&config).map_err(|e| {
                CoreError::DatabaseError(format!("Failed to serialize runner: {}", e))
            })?;

            sqlx::query(
                "INSERT INTO runners (scope, project_path, runner_id, config_json, is_default, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(scope, project_path, runner_id) DO UPDATE SET
                    config_json = excluded.config_json,
                    is_default = excluded.is_default,
                    updated_at = excluded.updated_at",
            )
            .bind("global")
            .bind("")
            .bind(&runner_id)
            .bind(&config_json)
            .bind(0i32)
            .bind(&now)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to import runner: {}", e)))?;
        }

        if let Some(default_runner_id) = default_runner {
            sqlx::query(
                "UPDATE runners
                 SET is_default = CASE WHEN runner_id = ? THEN 1 ELSE 0 END,
                     updated_at = ?
                 WHERE scope = 'global' AND project_path = ''",
            )
            .bind(&default_runner_id)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|e| {
                CoreError::DatabaseError(format!("Failed to set default runner: {}", e))
            })?;
        } else {
            let _ = sqlx::query(
                "UPDATE runners
                 SET is_default = 0,
                     updated_at = ?
                 WHERE scope = 'global' AND project_path = ''",
            )
            .bind(&now)
            .execute(&self.pool)
            .await;
        }

        Ok(true)
    }

    /// Update an existing session
    pub async fn update_session(&self, session: &Session) -> CoreResult<()> {
        let mode = format!("{:?}", session.mode).to_lowercase();
        let status = format!("{:?}", session.status).to_snake_case();
        let started_at = session.started_at.to_rfc3339();
        let ended_at = session.ended_at.map(|t| t.to_rfc3339());
        let duration_ms = session.duration_ms.map(|d| d as i64);
        let token_count = session.token_count.map(|t| t as i64);
        let updated_at = session.updated_at.to_rfc3339();

        sqlx::query(
            "UPDATE sessions SET
                project_path = ?,
                prompt = ?,
                runner = ?,
                mode = ?,
                status = ?,
                exit_code = ?,
                started_at = ?,
                ended_at = ?,
                duration_ms = ?,
                token_count = ?,
                updated_at = ?
            WHERE id = ?",
        )
        .bind(&session.project_path)
        .bind(&session.prompt)
        .bind(&session.runner)
        .bind(&mode)
        .bind(&status)
        .bind(session.exit_code)
        .bind(&started_at)
        .bind(&ended_at)
        .bind(duration_ms)
        .bind(token_count)
        .bind(&updated_at)
        .bind(&session.id)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to update session: {}", e)))?;

        // Update spec IDs
        let _ = sqlx::query("DELETE FROM session_specs WHERE session_id = ?")
            .bind(&session.id)
            .execute(&self.pool)
            .await;
        self.insert_spec_ids(&session.id, &session.spec_ids).await?;

        // Update metadata
        let _ = sqlx::query("DELETE FROM session_metadata WHERE session_id = ?")
            .bind(&session.id)
            .execute(&self.pool)
            .await;
        for (key, value) in &session.metadata {
            self.insert_metadata(&session.id, key, value).await?;
        }

        Ok(())
    }

    /// Delete a session and all related data
    pub async fn delete_session(&self, session_id: &str) -> CoreResult<()> {
        sqlx::query("DELETE FROM sessions WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to delete session: {}", e)))?;
        Ok(())
    }

    /// Get a session by ID
    pub async fn get_session(&self, session_id: &str) -> CoreResult<Option<Session>> {
        let row = sqlx::query_as::<_, SessionRow>(
            "SELECT
                id, project_path, runner, mode, status,
                exit_code, started_at, ended_at, duration_ms, token_count,
                prompt, created_at, updated_at
            FROM sessions WHERE id = ?",
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to get session: {}", e)))?;

        if let Some(row) = row {
            let mut session = row.into_session();
            session.spec_ids = self.load_spec_ids(session_id).await?;
            session.metadata = self.load_metadata(session_id).await?;
            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    /// List sessions with optional filters
    pub async fn list_sessions(
        &self,
        project_path: Option<&str>,
        spec_id: Option<&str>,
        status: Option<SessionStatus>,
        runner: Option<&str>,
    ) -> CoreResult<Vec<Session>> {
        let mut query = String::from(
            "SELECT
                id, project_path, runner, mode, status,
                exit_code, started_at, ended_at, duration_ms, token_count,
                prompt, created_at, updated_at
            FROM sessions WHERE 1=1",
        );
        let mut binds: Vec<String> = Vec::new();

        if let Some(path) = project_path {
            query.push_str(" AND project_path = ?");
            binds.push(path.to_string());
        }
        if let Some(spec) = spec_id {
            query.push_str(" AND EXISTS (SELECT 1 FROM session_specs ss WHERE ss.session_id = id AND ss.spec_id = ?)");
            binds.push(spec.to_string());
        }
        if let Some(status) = status {
            query.push_str(" AND status = ?");
            binds.push(format!("{:?}", status).to_snake_case());
        }
        if let Some(runner) = runner {
            query.push_str(" AND runner = ?");
            binds.push(runner.to_string());
        }
        query.push_str(" ORDER BY created_at DESC");

        // Build and execute query with dynamic binds
        let mut q = sqlx::query_as::<_, SessionRow>(&query);
        for bind in &binds {
            q = q.bind(bind);
        }

        let rows = q
            .fetch_all(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to list sessions: {}", e)))?;

        let mut sessions: Vec<Session> = rows.into_iter().map(|r| r.into_session()).collect();

        for session in &mut sessions {
            session.spec_ids = self.load_spec_ids(&session.id).await?;
            session.metadata = self.load_metadata(&session.id).await?;
        }

        Ok(sessions)
    }

    /// Insert a log entry
    pub async fn insert_log(&self, log: &SessionLog) -> CoreResult<()> {
        sqlx::query(
            "INSERT INTO session_logs (session_id, timestamp, level, message)
             VALUES (?, ?, ?, ?)",
        )
        .bind(&log.session_id)
        .bind(log.timestamp.to_rfc3339())
        .bind(format!("{:?}", log.level).to_lowercase())
        .bind(&log.message)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to insert log: {}", e)))?;
        Ok(())
    }

    /// Insert a log entry (convenience method)
    pub async fn log_message(
        &self,
        session_id: &str,
        level: LogLevel,
        message: &str,
    ) -> CoreResult<()> {
        let log = SessionLog {
            id: 0,
            session_id: session_id.to_string(),
            timestamp: Utc::now(),
            level,
            message: message.to_string(),
        };
        self.insert_log(&log).await
    }

    /// Get logs for a session
    pub async fn get_logs(
        &self,
        session_id: &str,
        limit: Option<usize>,
    ) -> CoreResult<Vec<SessionLog>> {
        let mut query = String::from(
            "SELECT id, session_id, timestamp, level, message
             FROM session_logs WHERE session_id = ? ORDER BY id DESC",
        );
        if let Some(limit) = limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }

        let rows = sqlx::query_as::<_, SessionLogRow>(&query)
            .bind(session_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to get logs: {}", e)))?;

        let mut logs: Vec<SessionLog> = rows.into_iter().map(|r| r.into()).collect();
        logs.reverse();
        Ok(logs)
    }

    /// Prune logs to keep only the most recent entries
    pub async fn prune_logs(&self, session_id: &str, keep: usize) -> CoreResult<usize> {
        let result = sqlx::query(
            "DELETE FROM session_logs
             WHERE session_id = ?
             AND id NOT IN (
               SELECT id FROM session_logs
               WHERE session_id = ?
               ORDER BY id DESC
               LIMIT ?
             )",
        )
        .bind(session_id)
        .bind(session_id)
        .bind(keep as i64)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to prune logs: {}", e)))?;

        Ok(result.rows_affected() as usize)
    }

    /// Insert a session event
    pub async fn insert_event(
        &self,
        session_id: &str,
        event_type: EventType,
        data: Option<String>,
    ) -> CoreResult<()> {
        self.insert_event_inner(session_id, event_type, data).await
    }

    async fn insert_event_inner(
        &self,
        session_id: &str,
        event_type: EventType,
        data: Option<String>,
    ) -> CoreResult<()> {
        sqlx::query(
            "INSERT INTO session_events (session_id, event_type, data, timestamp)
             VALUES (?, ?, ?, ?)",
        )
        .bind(session_id)
        .bind(format!("{:?}", event_type).to_snake_case())
        .bind(&data)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to insert event: {}", e)))?;
        Ok(())
    }

    /// Get events for a session
    pub async fn get_events(&self, session_id: &str) -> CoreResult<Vec<SessionEvent>> {
        let rows = sqlx::query_as::<_, SessionEventRow>(
            "SELECT id, session_id, event_type, data, timestamp
             FROM session_events WHERE session_id = ? ORDER BY id ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to get events: {}", e)))?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    // Internal helpers

    async fn insert_spec_ids(&self, session_id: &str, spec_ids: &[String]) -> CoreResult<()> {
        for (position, spec_id) in spec_ids.iter().enumerate() {
            sqlx::query(
                "INSERT OR IGNORE INTO session_specs (session_id, spec_id, position) VALUES (?, ?, ?)",
            )
            .bind(session_id)
            .bind(spec_id)
            .bind(position as i64)
            .execute(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to insert spec ID: {}", e)))?;
        }
        Ok(())
    }

    async fn load_spec_ids(&self, session_id: &str) -> CoreResult<Vec<String>> {
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT spec_id FROM session_specs WHERE session_id = ? ORDER BY position ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| CoreError::DatabaseError(format!("Failed to load spec IDs: {}", e)))?;

        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    async fn insert_metadata(&self, session_id: &str, key: &str, value: &str) -> CoreResult<()> {
        sqlx::query("INSERT INTO session_metadata (session_id, key, value) VALUES (?, ?, ?)")
            .bind(session_id)
            .bind(key)
            .bind(value)
            .execute(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to insert metadata: {}", e)))?;
        Ok(())
    }

    async fn load_metadata(&self, session_id: &str) -> CoreResult<HashMap<String, String>> {
        let rows: Vec<(String, String)> =
            sqlx::query_as("SELECT key, value FROM session_metadata WHERE session_id = ?")
                .bind(session_id)
                .fetch_all(&self.pool)
                .await
                .map_err(|e| CoreError::DatabaseError(format!("Failed to load metadata: {}", e)))?;

        Ok(rows.into_iter().collect())
    }
}

// Row types for sqlx::FromRow

#[derive(sqlx::FromRow)]
struct SessionRow {
    id: String,
    project_path: String,
    runner: String,
    mode: String,
    status: String,
    exit_code: Option<i32>,
    started_at: String,
    ended_at: Option<String>,
    duration_ms: Option<i64>,
    token_count: Option<i64>,
    prompt: Option<String>,
    created_at: String,
    updated_at: String,
}

impl SessionRow {
    fn into_session(self) -> Session {
        Session {
            id: self.id,
            project_path: self.project_path,
            spec_ids: Vec::new(),
            prompt: self.prompt,
            runner: self.runner,
            mode: parse_mode(&self.mode),
            status: parse_status(&self.status),
            exit_code: self.exit_code,
            started_at: parse_datetime(self.started_at),
            ended_at: self.ended_at.map(parse_datetime),
            duration_ms: self.duration_ms.map(|v| v as u64),
            token_count: self.token_count.map(|v| v as u64),
            metadata: HashMap::new(),
            created_at: parse_datetime(self.created_at),
            updated_at: parse_datetime(self.updated_at),
        }
    }
}

#[derive(sqlx::FromRow)]
struct SessionLogRow {
    id: i64,
    session_id: String,
    timestamp: String,
    level: String,
    message: String,
}

impl From<SessionLogRow> for SessionLog {
    fn from(r: SessionLogRow) -> Self {
        Self {
            id: r.id,
            session_id: r.session_id,
            timestamp: parse_datetime(r.timestamp),
            level: parse_log_level(&r.level),
            message: r.message,
        }
    }
}

#[derive(sqlx::FromRow)]
struct SessionEventRow {
    id: i64,
    session_id: String,
    event_type: String,
    data: Option<String>,
    timestamp: String,
}

impl From<SessionEventRow> for SessionEvent {
    fn from(r: SessionEventRow) -> Self {
        Self {
            id: r.id,
            session_id: r.session_id,
            event_type: parse_event_type(&r.event_type),
            data: r.data,
            timestamp: parse_datetime(r.timestamp),
        }
    }
}

async fn table_exists(pool: &SqlitePool, schema: &str, table: &str) -> CoreResult<bool> {
    let query = format!(
        "SELECT 1 FROM {}.sqlite_master WHERE type='table' AND name=? LIMIT 1",
        schema
    );
    let exists = sqlx::query(&query)
        .bind(table)
        .fetch_optional(pool)
        .await
        .map_err(|e| CoreError::DatabaseError(e.to_string()))?
        .is_some();
    Ok(exists)
}

async fn column_exists(
    pool: &SqlitePool,
    schema: &str,
    table: &str,
    column: &str,
) -> CoreResult<bool> {
    let query = format!("PRAGMA {}.table_info({})", schema, table);
    let rows: Vec<(i64, String, String, i64, Option<String>, i64)> = sqlx::query_as(&query)
        .fetch_all(pool)
        .await
        .unwrap_or_default();
    Ok(rows.iter().any(|r| r.1 == column))
}

// Helper functions for parsing

fn parse_mode(s: &str) -> SessionMode {
    match s {
        "guided" => SessionMode::Guided,
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
    use crate::db::Database;

    async fn test_db() -> SessionDatabase {
        let db = Database::connect_in_memory().await.unwrap();
        SessionDatabase::new(db.pool().clone())
    }

    #[tokio::test]
    async fn test_session_crud() {
        let db = test_db().await;

        let session = Session::new(
            "test-id-1".to_string(),
            "/test/project".to_string(),
            vec!["spec-001".to_string()],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );

        db.insert_session(&session).await.unwrap();

        let retrieved = db.get_session("test-id-1").await.unwrap().unwrap();
        assert_eq!(retrieved.id, "test-id-1");
        assert_eq!(retrieved.project_path, "/test/project");
        assert_eq!(retrieved.runner, "claude");

        let mut session = session;
        session.status = SessionStatus::Running;
        db.update_session(&session).await.unwrap();

        let updated = db.get_session("test-id-1").await.unwrap().unwrap();
        assert!(matches!(updated.status, SessionStatus::Running));

        let sessions = db.list_sessions(None, None, None, None).await.unwrap();
        assert_eq!(sessions.len(), 1);

        db.delete_session("test-id-1").await.unwrap();
        assert!(db.get_session("test-id-1").await.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_logs() {
        let db = test_db().await;

        let session = Session::new(
            "test-session".to_string(),
            "/test/project".to_string(),
            vec![],
            None,
            "claude".to_string(),
            SessionMode::Autonomous,
        );
        db.insert_session(&session).await.unwrap();

        db.log_message("test-session", LogLevel::Stdout, "Hello world")
            .await
            .unwrap();
        db.log_message("test-session", LogLevel::Info, "Info message")
            .await
            .unwrap();
        db.log_message("test-session", LogLevel::Error, "Error message")
            .await
            .unwrap();

        let logs = db.get_logs("test-session", None).await.unwrap();
        assert_eq!(logs.len(), 3);
        assert_eq!(logs[0].message, "Hello world");
        assert_eq!(logs[2].message, "Error message");
    }

    #[tokio::test]
    async fn test_spec_ids_multiple() {
        let db = test_db().await;

        let session = Session::new(
            "test-multi-spec".to_string(),
            "/test/project".to_string(),
            vec!["028-cli".to_string(), "320-redesign".to_string()],
            Some("Fix all lint errors".to_string()),
            "claude".to_string(),
            SessionMode::Autonomous,
        );
        db.insert_session(&session).await.unwrap();

        let retrieved = db.get_session("test-multi-spec").await.unwrap().unwrap();
        assert_eq!(retrieved.spec_ids.len(), 2);
        assert!(retrieved.spec_ids.contains(&"028-cli".to_string()));
        assert!(retrieved.spec_ids.contains(&"320-redesign".to_string()));
        assert_eq!(retrieved.prompt, Some("Fix all lint errors".to_string()));
    }
}
