//! Database infrastructure module
//!
//! Provides an async SQLite connection pool via sqlx with WAL mode,
//! automatic migrations, and common database operations.
//!
//! This module is only available when the `sessions` or `storage` feature is enabled.

#![cfg(any(feature = "sessions", feature = "storage"))]

use crate::error::{CoreError, CoreResult};
use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous};
use sqlx::SqlitePool;
use std::path::Path;
use std::str::FromStr;
use std::time::Duration;

/// Shared async database backed by a SqlitePool
#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Open a database at the given path with WAL mode and run migrations
    pub async fn connect<P: AsRef<Path>>(path: P) -> CoreResult<Self> {
        let path = path.as_ref();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                CoreError::DatabaseError(format!("Failed to create database directory: {}", e))
            })?;
        }

        let url = format!("sqlite:{}", path.display());
        let options = SqliteConnectOptions::from_str(&url)
            .map_err(|e| CoreError::DatabaseError(format!("Invalid database URL: {}", e)))?
            .journal_mode(SqliteJournalMode::Wal)
            .busy_timeout(Duration::from_secs(5))
            .foreign_keys(true)
            .synchronous(SqliteSynchronous::Normal)
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Failed to connect: {}", e)))?;

        let db = Self { pool };
        db.migrate().await?;
        Ok(db)
    }

    /// Create an in-memory database (useful for testing)
    pub async fn connect_in_memory() -> CoreResult<Self> {
        let options = SqliteConnectOptions::from_str("sqlite::memory:")
            .map_err(|e| CoreError::DatabaseError(format!("Invalid memory URL: {}", e)))?
            .foreign_keys(true)
            .busy_timeout(Duration::from_secs(5));

        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .map_err(|e| {
                CoreError::DatabaseError(format!("Failed to create in-memory database: {}", e))
            })?;

        let db = Self { pool };
        db.migrate().await?;
        Ok(db)
    }

    /// Run sqlx migrations
    async fn migrate(&self) -> CoreResult<()> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| CoreError::DatabaseError(format!("Migration failed: {}", e)))?;
        Ok(())
    }

    /// Get a reference to the connection pool
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Quick connectivity check
    pub async fn health_check(&self) -> bool {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await
            .is_ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_in_memory_database() {
        let db = Database::connect_in_memory().await.unwrap();
        let result = sqlx::query("SELECT 1 as val")
            .fetch_one(db.pool())
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_file_database() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db = Database::connect(&db_path).await.unwrap();
        assert!(db.health_check().await);
    }

    #[tokio::test]
    async fn test_migrations_create_tables() {
        let db = Database::connect_in_memory().await.unwrap();
        // Verify key tables exist after migration
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('conversations', 'messages', 'sessions', 'runners')"
        )
        .fetch_one(db.pool())
        .await
        .unwrap();
        assert_eq!(row.0, 4);
    }
}
