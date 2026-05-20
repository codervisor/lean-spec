//! CLI commands module

pub mod shared;

pub mod board;
pub mod capabilities;
pub mod children;
pub mod create;
pub mod deps;
pub mod list;
pub mod rel;
pub mod schema;
pub mod search;
pub mod stats;
pub mod tokens;
pub mod update;
pub mod validate;
pub mod view;

pub mod git_repo;

// New commands
pub mod analyze;
pub mod archive;
pub mod check;
pub mod crystallize;
pub mod examples;
pub mod files;
pub mod gantt;
pub mod init;
pub mod open;
pub mod package_manager;
pub mod timeline;

// Additional commands (spec 170)
pub mod backfill;
pub mod compact;
pub mod migrate;
pub mod split;
pub mod templates;
pub mod tui;
pub mod ui;
