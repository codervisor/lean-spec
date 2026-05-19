//! Server state: the active [`Adapter`] resolved once at startup, plus the
//! markdown specs directory used by the markdown-only tools.
//!
//! Adapters with network-backed schemas (GitHub, ADO, Jira) call
//! `resolve_inline` in their constructor — caching the resolved schema here
//! avoids paying that network cost on every tool call.

use std::env;
use std::path::PathBuf;
use std::sync::Arc;

use leanspec_core::adapters::{Adapter, AdapterError, AdapterRegistry};

use crate::error::McpToolError;

/// Adapter and project context shared across all tool calls.
pub struct ServerState {
    pub adapter: Box<dyn Adapter>,
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
            adapter,
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
            adapter,
            project_root,
            specs_dir,
        })
    }

    pub fn adapter_name(&self) -> &str {
        &self.adapter.capabilities().name
    }

    pub fn is_markdown(&self) -> bool {
        self.adapter_name() == "markdown"
    }
}

fn adapter_init_err(err: AdapterError) -> McpToolError {
    McpToolError::AdapterInit(err.to_string())
}
