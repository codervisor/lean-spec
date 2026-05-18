//! Board command — migration stub.

use std::error::Error;

pub fn run(_specs_dir: &str, _group_by: &str, _output_format: &str) -> Result<(), Box<dyn Error>> {
    Err("`board` is not yet migrated to the adapter API".into())
}
