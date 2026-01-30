//! Deprecation helpers for CLI commands

pub fn warn_deprecated(command: &str, replacement: &str) {
    eprintln!("Deprecated: {}. Use {} instead.", command, replacement);
}
