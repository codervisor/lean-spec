//! Tokens command — migration stub.

use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _path: Option<&str>,
    _verbose: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    Err("`tokens` is not yet migrated to the adapter API".into())
}
