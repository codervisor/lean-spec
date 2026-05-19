//! Backfill command — markdown-only.

use crate::commands::shared::require_markdown_project;
use std::error::Error;

#[allow(clippy::too_many_arguments)]
pub fn run(
    _specs_dir: &str,
    _specs: Option<Vec<String>>,
    _dry_run: bool,
    _force: bool,
    _include_assignee: bool,
    _include_transitions: bool,
    _bootstrap: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    require_markdown_project("backfill")?;
    Err("`backfill` is not yet migrated to the adapter API".into())
}
