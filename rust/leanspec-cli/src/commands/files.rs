//! Files command — migration stub.

use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _spec: &str,
    _show_size: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    Err("`files` is not yet migrated to the adapter API".into())
}
