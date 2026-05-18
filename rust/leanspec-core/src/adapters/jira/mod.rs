//! # Jira adapter
//!
//! Backend support for Atlassian Jira Cloud (and self-hosted Server / Data
//! Center where the REST API is compatible). Exposes:
//!
//! - [`adf`] — pure Rust converter between Atlassian Document Format and
//!   markdown (always available; pulls in no extra dependencies).
//! - [`JiraAdapter`] — full [`Adapter`](super::Adapter) implementation
//!   behind the `jira` cargo feature, mirroring the GitHub adapter's shape.
//!
//! Each spec corresponds to one Jira issue: `SpecDoc::id` is the issue key
//! (e.g. `PROJ-42`), `title` and `content` map to `summary` and `description`,
//! and the metadata fields (`status`, `tags`, `assignee`, `priority`, `due`)
//! are projected from the Jira issue fields.

pub mod adf;

#[cfg(feature = "jira")]
mod adapter;

#[cfg(feature = "jira")]
pub use adapter::{
    field, link, validate_token, JiraAdapter, TokenValidation, ADAPTER_NAME, SCHEMA_ID,
};
