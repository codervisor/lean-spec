//! View command — migration stub.

use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _spec: &str,
    _raw: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    Err("`view` is not yet migrated to the adapter API".into())
}
