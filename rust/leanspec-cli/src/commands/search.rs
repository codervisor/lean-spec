//! Search command — migration stub.

use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _query: &str,
    _limit: usize,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    Err("`search` is not yet migrated to the adapter API".into())
}
