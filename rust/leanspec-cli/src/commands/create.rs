//! Create command — migration stub.
//!
//! `CreateParams` is preserved because `main.rs` constructs it; the body
//! awaits migration to the adapter API in a downstream spec.

use std::error::Error;

#[allow(dead_code)]
pub struct CreateParams {
    pub specs_dir: String,
    pub name: String,
    pub title: Option<String>,
    pub template: Option<String>,
    pub status: Option<String>,
    pub priority: String,
    pub tags: Option<String>,
    pub parent: Option<String>,
    pub depends_on: Vec<String>,
    pub content: Option<String>,
    pub file: Option<String>,
    pub assignee: Option<String>,
    pub description: Option<String>,
}

pub fn run(_params: CreateParams) -> Result<(), Box<dyn Error>> {
    Err("`create` is not yet migrated to the adapter API".into())
}
