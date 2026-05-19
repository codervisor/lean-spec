//! Tokens command — markdown-only.

use crate::commands::shared::require_markdown_project;
use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _path: Option<&str>,
    _verbose: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    require_markdown_project("tokens")?;
    Err("`tokens` is not yet migrated to the adapter API".into())
}
