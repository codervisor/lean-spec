//! Deps command — migration stub.

use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _spec: &str,
    _depth: usize,
    _upstream: bool,
    _downstream: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    Err("`deps` is not yet migrated to the adapter API".into())
}
