//! Git integration for LeanSpec
//!
//! Clone, pull, and push specs from any Git remote.
//! Uses the system `git` binary — supports any host (GitHub, GitLab, Gitea, SSH, etc.)
//! and delegates authentication to the user's existing Git credentials.

pub mod clone_manager;
pub mod operations;
pub mod types;

pub use clone_manager::CloneManager;
pub use types::*;
