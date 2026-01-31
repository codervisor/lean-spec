//! Validators for spec content and structure

use once_cell::sync::Lazy;

mod completion;
mod frontmatter;
mod line_count;
mod structure;

pub use completion::CompletionVerifier;
pub use frontmatter::FrontmatterValidator;
pub use line_count::LineCountValidator;
pub use structure::StructureValidator;

static GLOBAL_FRONTMATTER_VALIDATOR: Lazy<FrontmatterValidator> =
    Lazy::new(FrontmatterValidator::new);
static GLOBAL_STRUCTURE_VALIDATOR: Lazy<StructureValidator> = Lazy::new(StructureValidator::new);
static GLOBAL_LINE_COUNT_VALIDATOR: Lazy<LineCountValidator> = Lazy::new(LineCountValidator::new);

/// Global frontmatter validator instance
pub fn global_frontmatter_validator() -> &'static FrontmatterValidator {
    &GLOBAL_FRONTMATTER_VALIDATOR
}

/// Global structure validator instance
pub fn global_structure_validator() -> &'static StructureValidator {
    &GLOBAL_STRUCTURE_VALIDATOR
}

/// Global line count validator instance
pub fn global_line_count_validator() -> &'static LineCountValidator {
    &GLOBAL_LINE_COUNT_VALIDATOR
}
