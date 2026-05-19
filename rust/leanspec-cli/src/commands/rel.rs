//! Rel command — markdown-only.
//!
//! `RelArgs` is preserved because `main.rs` constructs it; the body awaits
//! migration to the adapter API in a downstream spec.

use crate::commands::shared::require_markdown_project;
use std::error::Error;

#[allow(dead_code)]
pub struct RelArgs {
    pub args: Vec<String>,
    pub parent: Option<String>,
    pub children: Vec<String>,
    pub depends_on: Vec<String>,
}

pub fn run(
    _specs_dir: &str,
    _rel_args: RelArgs,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    require_markdown_project("rel")?;
    Err("`rel` is not yet migrated to the adapter API".into())
}
