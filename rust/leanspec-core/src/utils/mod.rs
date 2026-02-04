//! Utility functions and structures

mod content_ops;
mod dependency_graph;
mod hash;
mod insights;
mod project_discovery;
mod spec_archiver;
mod spec_loader;
mod spec_writer;
mod stats;
mod template_loader;
mod token_counter;

pub use content_ops::{
    apply_checklist_toggles, apply_replacements, apply_section_updates, preserve_title_heading,
    rebuild_content, split_frontmatter, ChecklistToggle, ChecklistToggleResult, MatchMode,
    Replacement, ReplacementResult, SectionMode, SectionUpdate,
};
pub use dependency_graph::{CompleteDependencyGraph, DependencyGraph, ImpactRadius};
pub use hash::hash_content;
pub use insights::Insights;
pub use project_discovery::{DiscoveredProject, DiscoveryError, ProjectDiscovery};
pub use spec_archiver::{ArchiveError, SpecArchiver};
pub use spec_loader::{LoadError, SpecLoader};
pub use spec_writer::{MetadataUpdate, SpecWriter, WriteError};
pub use stats::SpecStats;
pub use template_loader::{TemplateError, TemplateLoader};
pub use token_counter::{global_token_counter, TokenCount, TokenCounter, TokenStatus};
