//! API Handlers
//!
//! Route handlers for the HTTP API.

mod adapter;
mod capabilities;
mod events;
mod files;
mod git;
mod health;
mod local_projects;
mod projects;
mod specs;

pub use adapter::*;
pub use capabilities::*;
pub use events::*;
pub use files::*;
pub use git::*;
pub use health::{health_check, health_live, health_ready};
pub use local_projects::*;
pub use projects::*;
pub use specs::*;
