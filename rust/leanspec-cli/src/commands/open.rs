//! Open command — migration stub.

use std::error::Error;

pub fn run(_specs_dir: &str, _spec: &str, _editor: Option<String>) -> Result<(), Box<dyn Error>> {
    Err("`open` is not yet migrated to the adapter API".into())
}
