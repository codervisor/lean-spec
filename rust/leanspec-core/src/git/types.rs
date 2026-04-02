//! Git integration types

use serde::{Deserialize, Serialize};

/// Parsed remote reference — works with any git URL format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteRef {
    /// The original URL or shorthand the user provided
    pub url: String,
    /// Display name derived from the URL (e.g. "owner/repo")
    pub display_name: String,
}

impl RemoteRef {
    /// Parse any git remote reference:
    /// - `owner/repo` → treated as GitHub shorthand
    /// - `https://github.com/owner/repo`
    /// - `https://gitlab.com/owner/repo.git`
    /// - `git@github.com:owner/repo.git`
    /// - Any other valid git URL
    pub fn parse(input: &str) -> Option<Self> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return None;
        }

        // SSH format: git@host:owner/repo.git
        if trimmed.contains('@') && trimmed.contains(':') && !trimmed.contains("://") {
            let after_colon = trimmed.split(':').next_back()?;
            let display = after_colon.trim_end_matches(".git");
            if display.contains('/') && !display.is_empty() {
                return Some(Self {
                    url: trimmed.to_string(),
                    display_name: display.to_string(),
                });
            }
        }

        // HTTPS/git:// URL
        if trimmed.contains("://") {
            let stripped = trimmed.trim_end_matches('/').trim_end_matches(".git");
            // Extract path after the host
            if let Some(idx) = stripped.find("://") {
                let after_scheme = &stripped[idx + 3..];
                // Skip the host portion
                if let Some(slash_idx) = after_scheme.find('/') {
                    let path = &after_scheme[slash_idx + 1..];
                    if !path.is_empty() {
                        return Some(Self {
                            url: trimmed.to_string(),
                            display_name: path.to_string(),
                        });
                    }
                }
            }
            return None;
        }

        // Shorthand: owner/repo → expand to GitHub HTTPS
        let parts: Vec<&str> = trimmed.splitn(2, '/').collect();
        if parts.len() == 2 && !parts[0].is_empty() && !parts[1].is_empty() {
            // Ensure it looks like owner/repo, not a filesystem path
            if !parts[0].contains('.') && !trimmed.starts_with('/') {
                return Some(Self {
                    url: format!("https://github.com/{}", trimmed),
                    display_name: trimmed.to_string(),
                });
            }
        }

        None
    }

    /// Get the display name (typically owner/repo).
    pub fn name(&self) -> &str {
        &self.display_name
    }
}

/// Configuration for cloning a repo.
#[derive(Debug, Clone)]
pub struct CloneConfig {
    /// Git remote URL
    pub remote_url: String,
    /// Branch to check out (None = default branch)
    pub branch: Option<String>,
    /// Path to specs directory within the repo (e.g. "specs")
    pub specs_path: Option<String>,
    /// Local directory to clone into
    pub clone_dir: std::path::PathBuf,
}

/// Result of detecting specs in a cloned repo.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecDetectionResult {
    pub remote_url: String,
    pub branch: String,
    pub specs_dir: String,
    pub spec_count: usize,
    pub specs: Vec<DetectedSpec>,
}

/// A spec detected in a repository.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedSpec {
    pub path: String,
    pub title: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}

/// Result of a pull operation.
#[derive(Debug, Clone)]
pub struct PullResult {
    /// Whether any files changed
    pub updated: bool,
    /// Current HEAD commit (short SHA)
    pub head_sha: String,
}

/// Result of a push operation.
#[derive(Debug, Clone)]
pub struct PushResult {
    /// Commit SHA that was pushed
    pub commit_sha: String,
}

/// Status of a git working tree.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub has_changes: bool,
    pub changed_files: Vec<String>,
    pub branch: String,
    pub remote_url: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_owner_repo_shorthand() {
        let r = RemoteRef::parse("codervisor/lean-spec").unwrap();
        assert_eq!(r.url, "https://github.com/codervisor/lean-spec");
        assert_eq!(r.display_name, "codervisor/lean-spec");
    }

    #[test]
    fn parse_https_github() {
        let r = RemoteRef::parse("https://github.com/codervisor/lean-spec").unwrap();
        assert_eq!(r.url, "https://github.com/codervisor/lean-spec");
        assert_eq!(r.display_name, "codervisor/lean-spec");
    }

    #[test]
    fn parse_https_with_git_suffix() {
        let r = RemoteRef::parse("https://github.com/codervisor/lean-spec.git").unwrap();
        assert_eq!(r.display_name, "codervisor/lean-spec");
    }

    #[test]
    fn parse_ssh() {
        let r = RemoteRef::parse("git@github.com:codervisor/lean-spec.git").unwrap();
        assert_eq!(r.url, "git@github.com:codervisor/lean-spec.git");
        assert_eq!(r.display_name, "codervisor/lean-spec");
    }

    #[test]
    fn parse_gitlab_https() {
        let r = RemoteRef::parse("https://gitlab.com/myorg/myrepo").unwrap();
        assert_eq!(r.display_name, "myorg/myrepo");
    }

    #[test]
    fn parse_self_hosted() {
        let r = RemoteRef::parse("https://git.mycompany.com/team/project").unwrap();
        assert_eq!(r.display_name, "team/project");
    }

    #[test]
    fn parse_invalid() {
        assert!(RemoteRef::parse("").is_none());
        assert!(RemoteRef::parse("just-a-name").is_none());
    }
}
