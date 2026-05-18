//! Update command — migration stub.

use std::error::Error;

#[allow(clippy::too_many_arguments)]
pub fn run(
    _specs_dir: &str,
    _specs: &[String],
    _status: Option<String>,
    _priority: Option<String>,
    _assignee: Option<String>,
    _add_tags: Option<String>,
    _remove_tags: Option<String>,
    _replacements: Vec<String>,
    _match_all: bool,
    _match_first: bool,
    _check: Vec<String>,
    _uncheck: Vec<String>,
    _section: Option<String>,
    _section_content: Option<String>,
    _append: Option<String>,
    _prepend: Option<String>,
    _content_override: Option<String>,
    _force: bool,
    _expected_hash: Option<String>,
) -> Result<(), Box<dyn Error>> {
    Err("`update` is not yet migrated to the adapter API".into())
}
