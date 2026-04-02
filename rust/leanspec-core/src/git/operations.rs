//! Low-level git command execution
//!
//! Wraps the system `git` binary. All operations set `GIT_TERMINAL_PROMPT=0`
//! to prevent interactive auth prompts from hanging the server.

use crate::error::{CoreError, CoreResult};
use std::path::Path;
use std::process::Command;

/// Run a git command, returning stdout on success.
pub fn run_git(args: &[&str], cwd: &Path) -> CoreResult<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                CoreError::Other(
                    "git is not installed or not on PATH. Install git to use repository sync."
                        .to_string(),
                )
            } else {
                CoreError::Other(format!("Failed to run git: {}", e))
            }
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(CoreError::Other(format!(
            "git {} failed: {}",
            args[0], stderr
        )))
    }
}

/// Run a git command in a newly-created (or not-yet-existing) directory.
/// Used for `git clone` where the cwd doesn't exist yet.
pub fn run_git_in(args: &[&str], cwd: &Path) -> CoreResult<String> {
    // Ensure parent directory exists for clone operations
    if let Some(parent) = cwd.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| CoreError::Other(format!("Failed to create directory: {}", e)))?;
    }

    let output = Command::new("git")
        .args(args)
        .current_dir(cwd.parent().unwrap_or(Path::new("/")))
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                CoreError::Other(
                    "git is not installed or not on PATH. Install git to use repository sync."
                        .to_string(),
                )
            } else {
                CoreError::Other(format!("Failed to run git: {}", e))
            }
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(CoreError::Other(format!(
            "git {} failed: {}",
            args[0], stderr
        )))
    }
}

/// Check if `git` is available on PATH.
pub fn git_available() -> bool {
    Command::new("git")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}
