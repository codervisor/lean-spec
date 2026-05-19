//! Deps command — markdown-only.

use crate::commands::shared::require_markdown_project;
use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _spec: &str,
    _depth: usize,
    _upstream: bool,
    _downstream: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    require_markdown_project("deps")?;
    Err("`deps` is not yet migrated to the adapter API".into())
}
