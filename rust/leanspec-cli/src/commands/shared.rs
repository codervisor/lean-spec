//! Shared helpers for adapter-aware commands.
//!
//! Centralises:
//! - `resolve_adapter`: instantiate the project adapter, honouring an explicit
//!   `--specs-dir` override only for markdown projects.
//! - `require_markdown_project`: a pre-flight guard that inspects the
//!   project's configured adapter *name* without constructing the adapter, so
//!   markdown-only commands can refuse work on remote projects without
//!   needing valid backend credentials.
//! - `require_markdown_adapter`: same guard but operating on already-resolved
//!   capabilities, for commands that need the adapter anyway.

use leanspec_core::adapters::markdown::MarkdownAdapter;
use leanspec_core::adapters::{Adapter, AdapterCapabilities, AdapterRegistry};
use std::error::Error;

/// Resolve the active adapter for a CLI command.
///
/// The `specs_dir` argument is the legacy positional override that older
/// commands threaded through `&str`. For markdown projects it picks the
/// directory; for non-markdown projects it is ignored (the adapter reads its
/// config from `leanspec.adapter.yaml`).
pub fn resolve_adapter(specs_dir: &str) -> Result<Box<dyn Adapter>, Box<dyn Error>> {
    let config = AdapterRegistry::project_config()?;
    if config.adapter == "markdown" {
        Ok(Box::new(MarkdownAdapter::new(specs_dir)))
    } else {
        Ok(AdapterRegistry::create(&config)?)
    }
}

/// Reject the command if the project's configured adapter is not markdown.
///
/// Inspects [`AdapterRegistry::project_config`] without instantiating the
/// adapter — important for remote adapters (GitHub, Jira, ADO) that perform
/// authentication at construction. A markdown-only command must surface its
/// markdown-only-ness before the backend's auth check eats the error.
pub fn require_markdown_project(command: &str) -> Result<(), Box<dyn Error>> {
    let config = AdapterRegistry::project_config()?;
    if config.adapter != "markdown" {
        return Err(markdown_only_error(command, &config.adapter));
    }
    Ok(())
}

/// Reject the command if the resolved adapter is not the markdown adapter.
///
/// Use this when the command already has an adapter handle in scope; prefer
/// [`require_markdown_project`] if the adapter hasn't been constructed yet.
#[allow(dead_code)]
pub fn require_markdown_adapter(
    command: &str,
    caps: &AdapterCapabilities,
) -> Result<(), Box<dyn Error>> {
    if caps.name != "markdown" {
        return Err(markdown_only_error(command, &caps.name));
    }
    Ok(())
}

fn markdown_only_error(command: &str, adapter_name: &str) -> Box<dyn Error> {
    format!(
        "`{command}` requires a markdown adapter.\n\
         Active adapter: {adapter_name}\n\n\
         Run `leanspec capabilities` to see what operations are available."
    )
    .into()
}
