//! Server state: the active [`Adapter`] resolved once at startup, plus the
//! markdown specs directory used by the markdown-only tools.
//!
//! Adapters with network-backed schemas (GitHub, ADO, Jira) call
//! `resolve_inline` in their constructor — caching the resolved schema here
//! avoids paying that network cost on every tool call. The adapter is kept
//! behind a [`RwLock`] so the `reload_schema` tool can swap in a freshly-
//! resolved adapter without restarting the server.

use std::env;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

use leanspec_core::adapters::{Adapter, AdapterError, AdapterRegistry};

use crate::error::McpToolError;

/// Adapter and project context shared across all tool calls.
pub struct ServerState {
    adapter: RwLock<Arc<dyn Adapter>>,
    pub project_root: PathBuf,
    /// Specs directory for markdown-only tools. For non-markdown adapters
    /// this is still populated (defaulting to `<project>/specs`) but the
    /// markdown-only guards will refuse before it is read.
    pub specs_dir: PathBuf,
}

impl ServerState {
    /// Resolve the adapter from the project's `leanspec.adapter.yaml` (or
    /// fall back to a markdown adapter rooted at `LEANSPEC_SPECS_DIR` /
    /// `<cwd>/specs`).
    pub fn from_project() -> Result<Arc<Self>, McpToolError> {
        let project_root = env::current_dir()
            .map_err(|e| McpToolError::Internal(format!("cannot resolve cwd: {e}")))?;

        let specs_dir = env::var("LEANSPEC_SPECS_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| project_root.join("specs"));

        let adapter = AdapterRegistry::from_project().map_err(adapter_init_err)?;

        Ok(Arc::new(Self {
            adapter: RwLock::new(Arc::from(adapter)),
            project_root,
            specs_dir,
        }))
    }

    /// Construct a state with a pre-built adapter (used by tests).
    pub fn with_adapter(
        adapter: Box<dyn Adapter>,
        project_root: PathBuf,
        specs_dir: PathBuf,
    ) -> Arc<Self> {
        Arc::new(Self {
            adapter: RwLock::new(Arc::from(adapter)),
            project_root,
            specs_dir,
        })
    }

    /// Snapshot of the active adapter. The returned [`Arc`] keeps the adapter
    /// alive even if `reload_schema` swaps in a new one mid-call.
    pub fn adapter(&self) -> Arc<dyn Adapter> {
        self.adapter.read().expect("adapter lock poisoned").clone()
    }

    /// Re-resolve the adapter from the project config and replace the cached
    /// instance. Used by the `reload_schema` MCP tool to pick up live changes
    /// to backend vocabularies (new GitHub labels, renamed Jira statuses)
    /// without restarting the server.
    pub fn reload_adapter(&self) -> Result<Arc<dyn Adapter>, McpToolError> {
        let new_adapter = AdapterRegistry::from_project().map_err(adapter_init_err)?;
        let new_arc: Arc<dyn Adapter> = Arc::from(new_adapter);
        *self.adapter.write().expect("adapter lock poisoned") = new_arc.clone();
        Ok(new_arc)
    }

    pub fn adapter_name(&self) -> String {
        self.adapter().capabilities().name.clone()
    }

    pub fn is_markdown(&self) -> bool {
        self.adapter_name() == "markdown"
    }
}

fn adapter_init_err(err: AdapterError) -> McpToolError {
    McpToolError::AdapterInit(err.to_string())
}
