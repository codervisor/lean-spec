//! API Handlers
//!
//! Route handlers for the HTTP API.

mod health;
mod local_projects;
mod projects;
mod specs;

pub use health::*;
pub use local_projects::*;
pub use projects::*;
pub use specs::*;
