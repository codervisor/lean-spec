//! Validate command — migration stub.

use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _spec: Option<String>,
    _check_deps: bool,
    _strict: bool,
    _warnings_only: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    Err("`validate` is not yet migrated to the adapter API".into())
}
