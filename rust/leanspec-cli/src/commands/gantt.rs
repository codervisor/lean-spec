//! Gantt command — migration stub.

use std::error::Error;

pub fn run(
    _specs_dir: &str,
    _filter_status: Option<String>,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    Err("`gantt` is not yet migrated to the adapter API".into())
}
