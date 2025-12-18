//! Validators for spec content and structure

mod completion;
mod frontmatter;
mod line_count;
mod structure;

pub use completion::CompletionVerifier;
pub use frontmatter::FrontmatterValidator;
pub use line_count::LineCountValidator;
pub use structure::StructureValidator;
