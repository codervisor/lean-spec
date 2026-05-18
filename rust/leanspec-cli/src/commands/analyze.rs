//! Analyze command — migration stub.
//!
//! Awaiting migration to the adapter API (tracked in the subsequent CLI
//! migration specs). Replaced as part of the broader adapter rollout.

use std::error::Error;

pub fn run(_specs_dir: &str, _spec: &str, _output_format: &str) -> Result<(), Box<dyn Error>> {
    Err("`analyze` is not yet migrated to the adapter API".into())
}
