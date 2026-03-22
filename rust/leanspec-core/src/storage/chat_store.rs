//! Chat storage

#![cfg(feature = "storage")]

use crate::error::{CoreError, CoreResult};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
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

#[derive(Debug, Clone)]
pub struct ChatStore {
    pool: SqlitePool,
    db_path: PathBuf,
}

impl ChatStore {
    /// Create a ChatStore backed by the given pool.
    pub fn new(pool: SqlitePool, db_path: PathBuf) -> Self {
        Self { pool, db_path }
    }

    /// Quick connectivity check
    pub async fn health_check(&self) -> bool {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .is_ok()
    }

    pub fn storage_info(&self) -> Result<ChatStorageInfo, String> {
        let metadata = std::fs::metadata(&self.db_path).map_err(|e| e.to_string())?;
        Ok(ChatStorageInfo {
            path: self.db_path.to_string_lossy().to_string(),
            size_bytes: metadata.len(),
        })
    }

    /// Import chat data from a legacy chat.db file into the current database.
    pub async fn migrate_from_legacy_db<P: AsRef<Path>>(
        &self,
        legacy_path: P,
    ) -> CoreResult<bool> {
        let legacy_path = legacy_path.as_ref();
        if !legacy_path.exists() || legacy_path == self.db_path.as_path() {
            return Ok(false);
        }

        let legacy_str = legacy_path.to_string_lossy().to_string();
        let attach_sql = format!("ATTACH DATABASE '{}' AS legacy_chat", legacy_str);

        sqlx::query(&attach_sql)
            .execute(&self.pool)
            .await
            .map_err(|e| CoreError::Other(e.to_string()))?;

        let mut imported = false;
        let result: CoreResult<()> = async {
            if table_exists(&self.pool, "legacy_chat", "conversations").await? {
                sqlx::query(
                    "INSERT OR IGNORE INTO conversations (
                        id, project_id, title, provider_id, model_id,
                        created_at, updated_at, message_count, last_message,
                        tags, archived, cloud_id
                    )
                    SELECT
                        id, project_id, title, provider_id, model_id,
                        created_at, updated_at, message_count, last_message,
                        tags, archived, cloud_id
                    FROM legacy_chat.conversations",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| CoreError::Other(e.to_string()))?;
                imported = true;
            }

            if table_exists(&self.pool, "legacy_chat", "messages").await? {
                sqlx::query(
                    "INSERT OR IGNORE INTO messages (
                        id, conversation_id, project_id, role, content,
                        timestamp, parts, metadata
                    )
                    SELECT
                        id, conversation_id, project_id, role, content,
                        timestamp, parts, metadata
                    FROM legacy_chat.messages",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| CoreError::Other(e.to_string()))?;
                imported = true;
            }

            if table_exists(&self.pool, "legacy_chat", "sync_metadata").await? {
                sqlx::query(
                    "INSERT OR IGNORE INTO sync_metadata (
                        conversation_id, cloud_id, last_synced_at, sync_status, version
                    )
                    SELECT
                        conversation_id, cloud_id, last_synced_at, sync_status, version
                    FROM legacy_chat.sync_metadata",
                )
                .execute(&self.pool)
                .await
                .map_err(|e| CoreError::Other(e.to_string()))?;
                imported = true;
            }

            Ok(())
        }
        .await;

        let _ = sqlx::query("DETACH DATABASE legacy_chat")
            .execute(&self.pool)
            .await;
        result?;

        Ok(imported)
    }

    pub async fn list_sessions(&self, project_id: &str) -> Result<Vec<ChatSession>, String> {
        let rows = sqlx::query_as::<_, ChatSessionRow>(
            "SELECT id, project_id, title, provider_id, model_id, created_at, updated_at, message_count, last_message
             FROM conversations
             WHERE project_id = ?
             ORDER BY updated_at DESC",
        )
        .bind(project_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    pub async fn create_session(
        &self,
        id: &str,
        project_id: &str,
        provider_id: Option<String>,
        model_id: Option<String>,
    ) -> Result<ChatSession, String> {
        let now = now_ms();
        sqlx::query(
            "INSERT INTO conversations (id, project_id, title, provider_id, model_id, created_at, updated_at, message_count, last_message)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)",
        )
        .bind(id)
        .bind(project_id)
        .bind("New Chat")
        .bind(&provider_id)
        .bind(&model_id)
        .bind(now)
        .bind(now)
        .execute(&self.pool)
        .await
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

    pub async fn get_session(&self, session_id: &str) -> Result<Option<ChatSession>, String> {
        let row = sqlx::query_as::<_, ChatSessionRow>(
            "SELECT id, project_id, title, provider_id, model_id, created_at, updated_at, message_count, last_message
             FROM conversations WHERE id = ?",
        )
        .bind(session_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(row.map(|r| r.into()))
    }

    pub async fn get_messages(&self, session_id: &str) -> Result<Vec<ChatMessage>, String> {
        let rows = sqlx::query_as::<_, ChatMessageRow>(
            "SELECT id, conversation_id, project_id, role, content, timestamp, parts, metadata
             FROM messages
             WHERE conversation_id = ?
             ORDER BY timestamp ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    pub async fn update_session(
        &self,
        session_id: &str,
        title: Option<String>,
        provider_id: Option<String>,
        model_id: Option<String>,
    ) -> Result<Option<ChatSession>, String> {
        let now = now_ms();
        sqlx::query(
            "UPDATE conversations
             SET title = COALESCE(?, title),
                 provider_id = COALESCE(?, provider_id),
                 model_id = COALESCE(?, model_id),
                 updated_at = ?
             WHERE id = ?",
        )
        .bind(&title)
        .bind(&provider_id)
        .bind(&model_id)
        .bind(now)
        .bind(session_id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        self.get_session(session_id).await
    }

    pub async fn delete_session(&self, session_id: &str) -> Result<bool, String> {
        let result = sqlx::query("DELETE FROM conversations WHERE id = ?")
            .bind(session_id)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;
        Ok(result.rows_affected() > 0)
    }

    pub async fn replace_messages(
        &self,
        session_id: &str,
        provider_id: Option<String>,
        model_id: Option<String>,
        messages: Vec<ChatMessageInput>,
    ) -> Result<Option<ChatSession>, String> {
        let now = now_ms();
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let project_id: Option<String> = sqlx::query_scalar(
            "SELECT project_id FROM conversations WHERE id = ?",
        )
        .bind(session_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let Some(project_id) = project_id else {
            return Ok(None);
        };

        sqlx::query("DELETE FROM messages WHERE conversation_id = ?")
            .bind(session_id)
            .execute(&mut *tx)
            .await
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
                .map(|v| serde_json::to_string(v).unwrap_or_default());
            let metadata = message
                .metadata
                .as_ref()
                .map(|v| serde_json::to_string(v).unwrap_or_default());
            sqlx::query(
                "INSERT INTO messages (id, conversation_id, project_id, role, content, timestamp, parts, metadata)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&id)
            .bind(session_id)
            .bind(&project_id)
            .bind(&message.role)
            .bind(&message.content)
            .bind(timestamp)
            .bind(&parts)
            .bind(&metadata)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        let last_message = messages.last().map(|msg| msg.content.clone());
        sqlx::query(
            "UPDATE conversations
             SET message_count = ?,
                 last_message = ?,
                 updated_at = ?,
                 provider_id = COALESCE(?, provider_id),
                 model_id = COALESCE(?, model_id)
             WHERE id = ?",
        )
        .bind(messages.len() as i64)
        .bind(&last_message)
        .bind(now)
        .bind(&provider_id)
        .bind(&model_id)
        .bind(session_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;
        self.get_session(session_id).await
    }

    /// Append messages to a session without deleting existing ones.
    pub async fn append_messages(
        &self,
        session_id: &str,
        provider_id: Option<String>,
        model_id: Option<String>,
        messages: Vec<ChatMessageInput>,
    ) -> Result<Option<ChatSession>, String> {
        if messages.is_empty() {
            return self.get_session(session_id).await;
        }
        let now = now_ms();
        let mut tx = self.pool.begin().await.map_err(|e| e.to_string())?;

        let project_id: Option<String> = sqlx::query_scalar(
            "SELECT project_id FROM conversations WHERE id = ?",
        )
        .bind(session_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        let Some(project_id) = project_id else {
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
                .map(|v| serde_json::to_string(v).unwrap_or_default());
            let metadata = message
                .metadata
                .as_ref()
                .map(|v| serde_json::to_string(v).unwrap_or_default());
            sqlx::query(
                "INSERT INTO messages (id, conversation_id, project_id, role, content, timestamp, parts, metadata)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&id)
            .bind(session_id)
            .bind(&project_id)
            .bind(&message.role)
            .bind(&message.content)
            .bind(timestamp)
            .bind(&parts)
            .bind(&metadata)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        }

        let last_message = messages.last().map(|msg| msg.content.clone());
        sqlx::query(
            "UPDATE conversations
             SET message_count = message_count + ?,
                 last_message = COALESCE(?, last_message),
                 updated_at = ?,
                 provider_id = COALESCE(?, provider_id),
                 model_id = COALESCE(?, model_id)
             WHERE id = ?",
        )
        .bind(messages.len() as i64)
        .bind(&last_message)
        .bind(now)
        .bind(&provider_id)
        .bind(&model_id)
        .bind(session_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;

        tx.commit().await.map_err(|e| e.to_string())?;
        self.get_session(session_id).await
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

async fn table_exists(pool: &SqlitePool, schema: &str, table: &str) -> CoreResult<bool> {
    let query = format!(
        "SELECT 1 FROM {}.sqlite_master WHERE type='table' AND name=? LIMIT 1",
        schema
    );
    let exists = sqlx::query(&query)
        .bind(table)
        .fetch_optional(pool)
        .await
        .map_err(|e| CoreError::Other(e.to_string()))?
        .is_some();
    Ok(exists)
}

// Internal row types for sqlx::FromRow

#[derive(sqlx::FromRow)]
struct ChatSessionRow {
    id: String,
    project_id: String,
    title: String,
    provider_id: Option<String>,
    model_id: Option<String>,
    created_at: i64,
    updated_at: i64,
    message_count: i64,
    last_message: Option<String>,
}

impl From<ChatSessionRow> for ChatSession {
    fn from(r: ChatSessionRow) -> Self {
        Self {
            id: r.id,
            project_id: r.project_id,
            title: r.title,
            provider_id: r.provider_id,
            model_id: r.model_id,
            created_at: r.created_at,
            updated_at: r.updated_at,
            message_count: r.message_count,
            preview: r.last_message,
        }
    }
}

#[derive(sqlx::FromRow)]
struct ChatMessageRow {
    id: String,
    conversation_id: String,
    project_id: String,
    role: String,
    content: String,
    timestamp: i64,
    parts: Option<String>,
    metadata: Option<String>,
}

impl From<ChatMessageRow> for ChatMessage {
    fn from(r: ChatMessageRow) -> Self {
        let parts = r.parts.and_then(|v| serde_json::from_str(&v).ok());
        let metadata = r.metadata.and_then(|v| serde_json::from_str(&v).ok());
        Self {
            id: r.id,
            session_id: r.conversation_id,
            project_id: r.project_id,
            role: r.role,
            content: r.content,
            timestamp: r.timestamp,
            parts,
            metadata,
        }
    }
}
