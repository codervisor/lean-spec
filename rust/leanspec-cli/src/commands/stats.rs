//! Stats command — migration stub.

use std::error::Error;

pub fn run(_specs_dir: &str, _detailed: bool, _output_format: &str) -> Result<(), Box<dyn Error>> {
    Err("`stats` is not yet migrated to the adapter API".into())
}
