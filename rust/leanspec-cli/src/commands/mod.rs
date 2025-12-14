//! CLI commands module

pub mod list;
pub mod view;
pub mod create;
pub mod update;
pub mod validate;
pub mod deps;
pub mod link;
pub mod unlink;
pub mod search;
pub mod board;
pub mod tokens;
pub mod stats;

// New commands
pub mod init;
pub mod open;
pub mod files;
pub mod check;
pub mod archive;
pub mod analyze;
pub mod timeline;
pub mod gantt;
pub mod examples;

// Additional commands (spec 170)
pub mod templates;
pub mod backfill;
pub mod compact;
pub mod split;
pub mod migrate;
pub mod agent;
pub mod ui;
pub mod mcp;
