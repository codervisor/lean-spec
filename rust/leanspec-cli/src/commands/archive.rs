//! Archive command — migration stub.

use std::error::Error;

pub fn run(_specs_dir: &str, _specs: &[String], _dry_run: bool) -> Result<(), Box<dyn Error>> {
    Err("`archive` is not yet migrated to the adapter API".into())
}
