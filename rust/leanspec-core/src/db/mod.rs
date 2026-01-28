//! Database infrastructure module
//!
//! Provides shared SQLite connection management with WAL mode,
//! connection pooling support, and common database operations.
//!
//! This module is only available when the `sessions` or `storage` feature is enabled.

#![cfg(any(feature = "sessions", feature = "storage"))]

use crate::error::{CoreError, CoreResult};
use rusqlite::{Connection, OpenFlags, OptionalExtension};
use std::path::Path;
use std::sync::Mutex;

/// Shared database connection with configuration
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Open a database at the given path with WAL mode enabled
    pub fn open<P: AsRef<Path>>(path: P) -> CoreResult<Self> {
        let conn = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_CREATE | OpenFlags::SQLITE_OPEN_READ_WRITE,
        )
        .map_err(|e| CoreError::DatabaseError(format!("Failed to open database: {}", e)))?;

        Self::configure_connection(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Create an in-memory database (useful for testing)
    pub fn open_in_memory() -> CoreResult<Self> {
        let conn = Connection::open_in_memory().map_err(|e| {
            CoreError::DatabaseError(format!("Failed to create in-memory database: {}", e))
        })?;

        Self::configure_connection(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Configure SQLite connection with optimal settings
    fn configure_connection(conn: &Connection) -> CoreResult<()> {
        // Enable WAL mode for better concurrency
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             PRAGMA busy_timeout=5000;
             PRAGMA foreign_keys=ON;",
        )
        .map_err(|e| CoreError::DatabaseError(format!("Failed to configure database: {}", e)))?;

        Ok(())
    }

    /// Get a lock on the connection
    pub fn connection(&self) -> CoreResult<std::sync::MutexGuard<'_, Connection>> {
        self.conn
            .lock()
            .map_err(|_| CoreError::DatabaseError("Database lock poisoned".to_string()))
    }

    /// Execute a query that doesn't return rows
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> CoreResult<usize> {
        let conn = self.connection()?;
        conn.execute(sql, params)
            .map_err(|e| CoreError::DatabaseError(format!("Execute failed: {}", e)))
    }

    /// Execute a batch of SQL statements
    pub fn execute_batch(&self, sql: &str) -> CoreResult<()> {
        let conn = self.connection()?;
        conn.execute_batch(sql)
            .map_err(|e| CoreError::DatabaseError(format!("Batch execute failed: {}", e)))
    }

    /// Query a single optional row
    pub fn query_row<T, F>(
        &self,
        sql: &str,
        params: &[&dyn rusqlite::ToSql],
        f: F,
    ) -> CoreResult<Option<T>>
    where
        F: FnOnce(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
    {
        let conn = self.connection()?;
        conn.query_row(sql, params, f)
            .optional()
            .map_err(|e| CoreError::DatabaseError(format!("Query failed: {}", e)))
    }

    /// Get the user_version pragma
    pub fn user_version(&self) -> CoreResult<i64> {
        self.query_row("PRAGMA user_version", &[], |row| row.get(0))?
            .ok_or_else(|| CoreError::DatabaseError("Failed to get user_version".to_string()))
    }

    /// Set the user_version pragma
    pub fn set_user_version(&self, version: i64) -> CoreResult<()> {
        self.execute(&format!("PRAGMA user_version = {}", version), &[])?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_database() {
        let db = Database::open_in_memory().unwrap();
        db.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)", &[])
            .unwrap();
        db.execute("INSERT INTO test (name) VALUES (?1)", &[&"hello"])
            .unwrap();

        let name: String = db
            .query_row("SELECT name FROM test WHERE id = 1", &[], |row| row.get(0))
            .unwrap()
            .unwrap();

        assert_eq!(name, "hello");
    }

    #[test]
    fn test_wal_mode_enabled() {
        let db = Database::open_in_memory().unwrap();
        let journal_mode: String = db
            .query_row("PRAGMA journal_mode", &[], |row| row.get(0))
            .unwrap()
            .unwrap();
        assert_eq!(journal_mode, "wal");
    }
}
