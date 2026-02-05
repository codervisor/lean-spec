//! CLI commands module

pub mod board;
pub mod create;
pub mod list;
pub mod rel;
pub mod runner;
pub mod search;
pub mod session;
pub mod stats;
pub mod tokens;
pub mod update;
pub mod validate;
pub mod view;

// New commands
pub mod analyze;
pub mod archive;
pub mod check;
pub mod examples;
pub mod files;
pub mod gantt;
pub mod init;
pub mod open;
pub mod package_manager;
pub mod skill;
pub mod timeline;

// Additional commands (spec 170)
pub mod agent;
pub mod backfill;
pub mod compact;
pub mod mcp;
pub mod migrate;
pub mod migrate_archived;
pub mod split;
pub mod templates;
pub mod ui;
