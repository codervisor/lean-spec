//! API Handlers
//!
//! Route handlers for the HTTP API.

mod chat_config;
#[cfg(feature = "ai")]
mod chat_handler;
mod chat_sessions;
mod events;
mod files;
mod health;
mod local_projects;
#[cfg(feature = "ai")]
mod models_registry;
mod projects;
mod sessions;
mod specs;
mod sync;

pub use chat_config::*;
#[cfg(feature = "ai")]
pub use chat_handler::*;
pub use chat_sessions::*;
pub use events::*;
pub use files::*;
pub use health::*;
pub use local_projects::*;
#[cfg(feature = "ai")]
pub use models_registry::*;
pub use projects::*;
pub use sessions::*;
pub use specs::*;
pub use sync::*;
