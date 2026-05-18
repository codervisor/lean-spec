//! TUI — migration stub.
//!
//! The terminal UI is tightly coupled to the legacy `SpecLoader` path and is
//! awaiting migration to the adapter API. The submodules (`board`, `detail`,
//! `keybindings`, etc.) remain in the tree but are not wired up here so the
//! binary builds while the migration is in progress.

use std::error::Error;

pub fn run(
    _specs_dir: Option<&str>,
    _view: &str,
    _project_name: Option<&str>,
    _headless: Option<&str>,
) -> Result<(), Box<dyn Error>> {
    Err("`tui` is not yet migrated to the adapter API".into())
}
