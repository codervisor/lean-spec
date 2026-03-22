//! Session manager query methods

#![cfg(feature = "sessions")]

use crate::error::{CoreError, CoreResult};
use crate::sessions::database::SessionDatabase;
use crate::sessions::runner::RunnerRegistry;
use crate::sessions::types::*;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::broadcast;

use super::SessionManager;

impl SessionManager {
    pub async fn get_session(&self, session_id: &str) -> CoreResult<Option<Session>> {
        self.db.get_session(session_id).await
    }

    /// Update a session record in the database
    pub async fn update_session(&self, session: &Session) -> CoreResult<()> {
        self.db.update_session(session).await
    }

    /// List sessions with optional filters
    pub async fn list_sessions(
        &self,
        project_path: Option<&str>,
        spec_id: Option<&str>,
        status: Option<SessionStatus>,
        runner: Option<&str>,
    ) -> CoreResult<Vec<Session>> {
        self.db.list_sessions(project_path, spec_id, status, runner).await
    }

    /// Get session logs
    pub async fn get_logs(
        &self,
        session_id: &str,
        limit: Option<usize>,
    ) -> CoreResult<Vec<SessionLog>> {
        self.db.get_logs(session_id, limit).await
    }

    /// Rotate logs to keep only the most recent entries
    pub async fn rotate_logs(&self, session_id: &str, keep: usize) -> CoreResult<usize> {
        if self.db.get_session(session_id).await?.is_none() {
            return Err(CoreError::NotFound(format!(
                "Session not found: {}",
                session_id
            )));
        }

        let deleted = self.db.prune_logs(session_id, keep).await?;
        if deleted > 0 {
            self.db.insert_event(
                session_id,
                EventType::Archived,
                Some(format!("pruned_logs:{}", deleted)),
            ).await?;
        }

        Ok(deleted)
    }

    /// Get session events
    pub async fn get_events(&self, session_id: &str) -> CoreResult<Vec<SessionEvent>> {
        self.db.get_events(session_id).await
    }

    /// Delete a session
    pub async fn delete_session(&self, session_id: &str) -> CoreResult<()> {
        // Stop if running
        if let Some(session) = self.db.get_session(session_id).await? {
            if session.is_running() {
                self.stop_session(session_id).await?;
            }
        }

        self.db.delete_session(session_id).await
    }

    /// Get logs in real-time (returns receiver)
    pub async fn subscribe_to_logs(
        &self,
        session_id: &str,
    ) -> CoreResult<broadcast::Receiver<SessionLog>> {
        // Check session exists
        if self.db.get_session(session_id).await?.is_none() {
            return Err(CoreError::NotFound(format!(
                "Session not found: {}",
                session_id
            )));
        }

        let mut broadcasts = self.log_broadcasts.write().await;
        let sender = broadcasts
            .entry(session_id.to_string())
            .or_insert_with(|| {
                let (sender, _) = broadcast::channel::<SessionLog>(1000);
                sender
            })
            .clone();

        Ok(sender.subscribe())
    }

    /// List available runners
    pub async fn list_available_runners(
        &self,
        project_path: Option<&str>,
    ) -> CoreResult<Vec<String>> {
        let registry = match project_path {
            Some(path) => RunnerRegistry::load(PathBuf::from(path).as_path())?,
            None => RunnerRegistry::load(PathBuf::from(".").as_path())?,
        };

        Ok(registry
            .list_available()
            .into_iter()
            .map(|runner| runner.id.clone())
            .collect())
    }
}
