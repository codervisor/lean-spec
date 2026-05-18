//! Children command — migration stub.

use std::error::Error;

pub fn run(_specs_dir: &str, _spec: &str, _output_format: &str) -> Result<(), Box<dyn Error>> {
    Err("`children` is not yet migrated to the adapter API".into())
}
