//! Timeline command — migration stub.

use std::error::Error;

pub fn run(_specs_dir: &str, _months: usize, _output_format: &str) -> Result<(), Box<dyn Error>> {
    Err("`timeline` is not yet migrated to the adapter API".into())
}
