//! Check command — markdown-only.

use crate::commands::shared::require_markdown_project;
use std::error::Error;

pub fn run(_specs_dir: &str, _fix: bool, _output_format: &str) -> Result<(), Box<dyn Error>> {
    require_markdown_project("check")?;
    Err("`check` is not yet migrated to the adapter API".into())
}
