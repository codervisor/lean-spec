//! Chat storage

#![cfg(feature = "storage")]

use crate::error::{CoreError, CoreResult};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatSession {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub provider_id: Option<String>,
    pub model_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub message_count: i64,
    pub preview: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub session_id: String,
    pub project_id: String,
    pub role: String,
    pub content: String,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parts: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessageInput {
    pub id: Option<String>,
    pub role: String,
    pub content: String,
    pub timestamp: Option<i64>,
    pub parts: Option<Value>,
    pub metadata: Option<Value>,
}

#[derive(Debug)]
pub struct ChatStore {
    conn: Mutex<Connection>,
    db_path: PathBuf,
}

impl ChatStore {
    pub fn new() -> CoreResult<Self> {
        let db_path = resolve_db_path()?;
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| CoreError::Other(e.to_string()))?;
        }

        let conn = Connection::open(&db_path).map_err(|e| CoreError::Other(e.to_string()))?;
        conn.execute_batch("PRAGMA journal_mode=WAL;\n             PRAGMA busy_timeout=5000;")
            .map_err(|e| CoreError::Other(e.to_string()))?;

        let store = Self {
            conn: Mutex::new(conn),
            db_path,
        };

        store.init_schema()?;
        Ok(store)
    }

    pub fn storage_info(&self) -> Result<ChatStorageInfo, String> {
        let metadata = std::fs::metadata(&self.db_path).map_err(|e| e.to_string())?;
        Ok(ChatStorageInfo {
            path: self.db_path.to_string_lossy().to_string(),
            size_bytes: metadata.len(),
        })
    }

    pub fn list_sessions(&self, project_id: &str) -> Result<Vec<ChatSession>, String> {
        let conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, title, provider_id, model_id, created_at, updated_at, message_count, last_message\n                 FROM conversations\n                 WHERE project_id = ?1\n                 ORDER BY updated_at DESC",
            )
            .map_err(|e| e.to_string())?;

        let sessions = stmt
            .query_map(params![project_id], |row| {
                Ok(ChatSession {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    provider_id: row.get(3)?,
                    model_id: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    message_count: row.get(7)?,
                    preview: row.get(8)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(sessions)
    }

    pub fn create_session(
        &self,
        id: &str,
        project_id: &str,
        provider_id: Option<String>,
        model_id: Option<String>,
    ) -> Result<ChatSession, String> {
        let now = now_ms();
        let conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        conn.execute(
            "INSERT INTO conversations (id, project_id, title, provider_id, model_id, created_at, updated_at, message_count, last_message)\n             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, NULL)",
            params![id, project_id, "New Chat", provider_id, model_id, now, now],
        )
        .map_err(|e| e.to_string())?;

        Ok(ChatSession {
            id: id.to_string(),
            project_id: project_id.to_string(),
            title: "New Chat".to_string(),
            provider_id,
            model_id,
            created_at: now,
            updated_at: now,
            message_count: 0,
            preview: None,
        })
    }

    pub fn get_session(&self, session_id: &str) -> Result<Option<ChatSession>, String> {
        let conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        conn.query_row(
            "SELECT id, project_id, title, provider_id, model_id, created_at, updated_at, message_count, last_message\n             FROM conversations WHERE id = ?1",
            params![session_id],
            |row| {
                Ok(ChatSession {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    title: row.get(2)?,
                    provider_id: row.get(3)?,
                    model_id: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    message_count: row.get(7)?,
                    preview: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())
    }

    pub fn get_messages(&self, session_id: &str) -> Result<Vec<ChatMessage>, String> {
        let conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        let mut stmt = conn
            .prepare(
                "SELECT id, conversation_id, project_id, role, content, timestamp, parts, metadata\n                 FROM messages\n                 WHERE conversation_id = ?1\n                 ORDER BY timestamp ASC",
            )
            .map_err(|e| e.to_string())?;

        let messages = stmt
            .query_map(params![session_id], |row| {
                let parts: Option<String> = row.get(6)?;
                let parts = match parts {
                    Some(value) => serde_json::from_str(&value).ok(),
                    None => None,
                };
                let metadata: Option<String> = row.get(7)?;
                let metadata = match metadata {
                    Some(value) => serde_json::from_str(&value).ok(),
                    None => None,
                };
                Ok(ChatMessage {
                    id: row.get(0)?,
                    session_id: row.get(1)?,
                    project_id: row.get(2)?,
                    role: row.get(3)?,
                    content: row.get(4)?,
                    timestamp: row.get(5)?,
                    parts,
                    metadata,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        Ok(messages)
    }

    pub fn update_session(
        &self,
        session_id: &str,
        title: Option<String>,
        provider_id: Option<String>,
        model_id: Option<String>,
    ) -> Result<Option<ChatSession>, String> {
        let now = now_ms();
        let conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        conn.execute(
            "UPDATE conversations\n             SET title = COALESCE(?2, title),\n                 provider_id = COALESCE(?3, provider_id),\n                 model_id = COALESCE(?4, model_id),\n                 updated_at = ?5\n             WHERE id = ?1",
            params![session_id, title, provider_id, model_id, now],
        )
        .map_err(|e| e.to_string())?;
        drop(conn);
        self.get_session(session_id)
    }

    pub fn delete_session(&self, session_id: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        let deleted = conn
            .execute(
                "DELETE FROM conversations WHERE id = ?1",
                params![session_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(deleted > 0)
    }

    pub fn replace_messages(
        &self,
        session_id: &str,
        provider_id: Option<String>,
        model_id: Option<String>,
        messages: Vec<ChatMessageInput>,
    ) -> Result<Option<ChatSession>, String> {
        let now = now_ms();
        let mut conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let session_project_id: Option<String> = tx
            .query_row(
                "SELECT project_id FROM conversations WHERE id = ?1",
                params![session_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        let Some(project_id) = session_project_id else {
            return Ok(None);
        };

        tx.execute(
            "DELETE FROM messages WHERE conversation_id = ?1",
            params![session_id],
        )
        .map_err(|e| e.to_string())?;

        for message in &messages {
            let id = message
                .id
                .clone()
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let timestamp = message.timestamp.unwrap_or_else(now_ms);
            let parts = message
                .parts
                .as_ref()
                .map(|value| serde_json::to_string(value).unwrap_or_default());
            let metadata = message
                .metadata
                .as_ref()
                .map(|value| serde_json::to_string(value).unwrap_or_default());
            tx.execute(
                "INSERT INTO messages (id, conversation_id, project_id, role, content, timestamp, parts, metadata)\n                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    id,
                    session_id,
                    project_id,
                    message.role,
                    message.content,
                    timestamp,
                    parts,
                    metadata
                ],
            )
            .map_err(|e| e.to_string())?;
        }

        let last_message = messages.last().map(|msg| msg.content.clone());
        tx.execute(
            "UPDATE conversations\n             SET message_count = ?2,\n                 last_message = ?3,\n                 updated_at = ?4,\n                 provider_id = COALESCE(?5, provider_id),\n                 model_id = COALESCE(?6, model_id)\n             WHERE id = ?1",
            params![
                session_id,
                messages.len() as i64,
                last_message,
                now,
                provider_id,
                model_id
            ],
        )
        .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        drop(conn);
        self.get_session(session_id)
    }

    /// Append messages to a session without deleting existing ones.
    pub fn append_messages(
        &self,
        session_id: &str,
        provider_id: Option<String>,
        model_id: Option<String>,
        messages: Vec<ChatMessageInput>,
    ) -> Result<Option<ChatSession>, String> {
        if messages.is_empty() {
            return self.get_session(session_id);
        }
        let now = now_ms();
        let mut conn = self.conn.lock().map_err(|_| "Failed to lock database")?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;

        let session_project_id: Option<String> = tx
            .query_row(
                "SELECT project_id FROM conversations WHERE id = ?1",
                params![session_id],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;

        let Some(project_id) = session_project_id else {
            return Ok(None);
        };

        for message in &messages {
            let id = message
                .id
                .clone()
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let timestamp = message.timestamp.unwrap_or_else(now_ms);
            let parts = message
                .parts
                .as_ref()
                .map(|value| serde_json::to_string(value).unwrap_or_default());
            let metadata = message
                .metadata
                .as_ref()
                .map(|value| serde_json::to_string(value).unwrap_or_default());
            tx.execute(
                "INSERT INTO messages (id, conversation_id, project_id, role, content, timestamp, parts, metadata)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    id,
                    session_id,
                    project_id,
                    message.role,
                    message.content,
                    timestamp,
                    parts,
                    metadata
                ],
            )
            .map_err(|e| e.to_string())?;
        }

        let last_message = messages.last().map(|msg| msg.content.clone());
        tx.execute(
            "UPDATE conversations
             SET message_count = message_count + ?2,
                 last_message = COALESCE(?3, last_message),
                 updated_at = ?4,
                 provider_id = COALESCE(?5, provider_id),
                 model_id = COALESCE(?6, model_id)
             WHERE id = ?1",
            params![
                session_id,
                messages.len() as i64,
                last_message,
                now,
                provider_id,
                model_id
            ],
        )
        .map_err(|e| e.to_string())?;

        tx.commit().map_err(|e| e.to_string())?;
        drop(conn);
        self.get_session(session_id)
    }

    fn init_schema(&self) -> CoreResult<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| CoreError::Other("Failed to lock database".to_string()))?;
        let current_version: i64 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .map_err(|e| CoreError::Other(e.to_string()))?;

        if current_version < 1 {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    provider_id TEXT,
                    model_id TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    message_count INTEGER DEFAULT 0,
                    last_message TEXT,
                    tags TEXT,
                    archived INTEGER DEFAULT 0,
                    cloud_id TEXT
                );
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    project_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    parts TEXT,
                    metadata TEXT,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS sync_metadata (
                    conversation_id TEXT PRIMARY KEY,
                    cloud_id TEXT,
                    last_synced_at INTEGER,
                    sync_status TEXT CHECK(sync_status IN ('local-only', 'synced', 'conflict', 'pending')),
                    version INTEGER DEFAULT 1,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id);
                CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
                CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
                CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
                CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);",
            )
            .map_err(|e| CoreError::Other(e.to_string()))?;

            conn.execute("PRAGMA user_version = 1", [])
                .map_err(|e| CoreError::Other(e.to_string()))?;
        }

        ensure_column(&conn, "conversations", "provider_id", "provider_id TEXT")?;
        ensure_column(&conn, "conversations", "model_id", "model_id TEXT")?;
        ensure_column(&conn, "messages", "parts", "parts TEXT")?;

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatStorageInfo {
    pub path: String,
    pub size_bytes: u64,
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn resolve_db_path() -> CoreResult<PathBuf> {
    if let Some(xdg) = std::env::var_os("XDG_DATA_HOME") {
        let mut path = PathBuf::from(xdg);
        path.push("lean-spec");
        path.push("chat.db");
        return Ok(path);
    }

    if let Some(dir) = dirs::data_dir() {
        let mut path = dir;
        path.push("lean-spec");
        path.push("chat.db");
        return Ok(path);
    }

    Ok(super::config::config_dir().join("chat.db"))
}

fn ensure_column(conn: &Connection, table: &str, column: &str, definition: &str) -> CoreResult<()> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({})", table))
        .map_err(|e| CoreError::Other(e.to_string()))?;
    let existing: Vec<String> = stmt
        .query_map([], |row| row.get(1))
        .map_err(|e| CoreError::Other(e.to_string()))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| CoreError::Other(e.to_string()))?;

    if !existing.iter().any(|col| col == column) {
        conn.execute(
            &format!("ALTER TABLE {} ADD COLUMN {}", table, definition),
            [],
        )
        .map_err(|e| CoreError::Other(e.to_string()))?;
    }
    Ok(())
}
