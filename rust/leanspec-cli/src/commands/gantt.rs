//! Gantt command — markdown-only.

use crate::commands::shared::require_markdown_project;
use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _filter_status: Option<String>,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    require_markdown_project("gantt")?;
    Err("`gantt` is not yet migrated to the adapter API".into())
}
