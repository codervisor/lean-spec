//! GitHub API types

use serde::{Deserialize, Serialize};

/// Parsed owner/repo reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoRef {
    pub owner: String,
    pub repo: String,
}

impl RepoRef {
    pub fn parse(input: &str) -> Option<Self> {
        // Accept "owner/repo" or "https://github.com/owner/repo"
        let stripped = input.trim().trim_end_matches('/').trim_end_matches(".git");

        let parts: Vec<&str> = if stripped.contains("github.com") {
            stripped
                .split("github.com/")
                .last()?
                .splitn(2, '/')
                .collect()
        } else {
            stripped.splitn(2, '/').collect()
        };

        if parts.len() == 2 && !parts[0].is_empty() && !parts[1].is_empty() {
            Some(Self {
                owner: parts[0].to_string(),
                repo: parts[1].to_string(),
            })
        } else {
            None
        }
    }

    pub fn full_name(&self) -> String {
        format!("{}/{}", self.owner, self.repo)
    }
}

/// GitHub repository metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRepo {
    pub full_name: String,
    pub description: Option<String>,
    pub default_branch: String,
    pub private: bool,
    pub html_url: String,
}

/// Result of detecting specs in a GitHub repo
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecDetectionResult {
    pub repo: String,
    pub branch: String,
    pub specs_dir: String,
    pub spec_count: usize,
    pub specs: Vec<DetectedSpec>,
}

/// A spec detected in a GitHub repo
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedSpec {
    pub path: String,
    pub title: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}

/// GitHub content item from the Contents API
#[derive(Debug, Clone, Deserialize)]
pub struct GitHubContentItem {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub sha: String,
}

/// GitHub file content response (single file)
#[derive(Debug, Clone, Deserialize)]
pub struct GitHubFileContent {
    pub content: Option<String>,
    pub encoding: Option<String>,
    pub sha: String,
}

/// GitHub Git Tree API response
#[derive(Debug, Clone, Deserialize)]
pub struct GitHubTreeResponse {
    pub sha: String,
    pub tree: Vec<GitHubTreeItem>,
    pub truncated: bool,
}

/// A single item in a Git tree
#[derive(Debug, Clone, Deserialize)]
pub struct GitHubTreeItem {
    pub path: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub sha: String,
    pub size: Option<u64>,
}

/// GitHub Git Blob API response
#[derive(Debug, Clone, Deserialize)]
pub struct GitHubBlobResponse {
    pub content: String,
    pub encoding: String,
    pub sha: String,
    pub size: u64,
}

/// GitHub repository response (minimal fields we need)
#[derive(Debug, Clone, Deserialize)]
pub struct GitHubRepoResponse {
    pub full_name: String,
    pub description: Option<String>,
    pub default_branch: String,
    pub private: bool,
    pub html_url: String,
}

/// GitHub project configuration stored in the project registry
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubProjectConfig {
    /// Repository reference (owner/repo)
    pub repo: String,

    /// Branch to track (default: repo's default branch)
    pub branch: String,

    /// Path to specs directory within the repo
    pub specs_path: String,

    /// Last sync timestamp
    pub last_synced: Option<chrono::DateTime<chrono::Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_owner_repo() {
        let r = RepoRef::parse("codervisor/lean-spec").unwrap();
        assert_eq!(r.owner, "codervisor");
        assert_eq!(r.repo, "lean-spec");
    }

    #[test]
    fn parse_github_url() {
        let r = RepoRef::parse("https://github.com/codervisor/lean-spec").unwrap();
        assert_eq!(r.owner, "codervisor");
        assert_eq!(r.repo, "lean-spec");
    }

    #[test]
    fn parse_github_url_with_git_suffix() {
        let r = RepoRef::parse("https://github.com/codervisor/lean-spec.git").unwrap();
        assert_eq!(r.owner, "codervisor");
        assert_eq!(r.repo, "lean-spec");
    }

    #[test]
    fn parse_invalid() {
        assert!(RepoRef::parse("just-a-name").is_none());
        assert!(RepoRef::parse("").is_none());
    }
}
