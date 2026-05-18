//! # Jira adapter
//!
//! Backend support for Atlassian Jira. Currently exposes the [`adf`] submodule
//! — a pure Rust converter between Atlassian Document Format (ADF) and
//! markdown — used by the (forthcoming) Jira issue adapter.

pub mod adf;
