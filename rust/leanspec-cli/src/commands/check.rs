//! Check command — migration stub.

use std::error::Error;

pub fn run(_specs_dir: &str, _fix: bool, _output_format: &str) -> Result<(), Box<dyn Error>> {
    Err("`check` is not yet migrated to the adapter API".into())
}
