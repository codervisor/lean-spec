//! GitHub API client for spec detection and management
//!
//! Uses the GitHub REST API v3 to interact with repositories.
//! Authentication via `GITHUB_TOKEN` or `LEANSPEC_GITHUB_TOKEN` env var.

use crate::error::{CoreError, CoreResult};
use crate::parsers::FrontmatterParser;

use super::types::*;

const GITHUB_API_BASE: &str = "https://api.github.com";
const USER_AGENT: &str = "leanspec";

/// Candidate directories where specs might live
const SPECS_DIR_CANDIDATES: &[&str] = &["specs", ".lean-spec/specs", "doc/specs", "docs/specs"];

/// GitHub API client
pub struct GitHubClient {
    client: reqwest::blocking::Client,
    token: Option<String>,
}

impl GitHubClient {
    /// Create a new client, auto-detecting token from env vars.
    pub fn new() -> Self {
        let token = std::env::var("LEANSPEC_GITHUB_TOKEN")
            .or_else(|_| std::env::var("GITHUB_TOKEN"))
            .ok()
            .filter(|t| !t.is_empty());

        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::ACCEPT,
            "application/vnd.github.v3+json".parse().unwrap(),
        );
        headers.insert(reqwest::header::USER_AGENT, USER_AGENT.parse().unwrap());
        if let Some(ref token) = token {
            headers.insert(
                reqwest::header::AUTHORIZATION,
                format!("Bearer {}", token).parse().unwrap(),
            );
        }

        let client = reqwest::blocking::Client::builder()
            .default_headers(headers)
            .build()
            .expect("Failed to build HTTP client");

        Self { client, token }
    }
}

impl Default for GitHubClient {
    fn default() -> Self {
        Self::new()
    }
}

impl GitHubClient {
    /// Create a client with an explicit token.
    pub fn with_token(token: &str) -> Self {
        let mut c = Self::new();
        c.token = Some(token.to_string());
        // Rebuild client with the explicit token
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::ACCEPT,
            "application/vnd.github.v3+json".parse().unwrap(),
        );
        headers.insert(reqwest::header::USER_AGENT, USER_AGENT.parse().unwrap());
        headers.insert(
            reqwest::header::AUTHORIZATION,
            format!("Bearer {}", token).parse().unwrap(),
        );
        c.client = reqwest::blocking::Client::builder()
            .default_headers(headers)
            .build()
            .expect("Failed to build HTTP client");
        c
    }

    /// Check if the client has authentication configured.
    pub fn is_authenticated(&self) -> bool {
        self.token.is_some()
    }

    /// Get repository metadata.
    pub fn get_repo(&self, repo_ref: &RepoRef) -> CoreResult<GitHubRepo> {
        let url = format!(
            "{}/repos/{}/{}",
            GITHUB_API_BASE, repo_ref.owner, repo_ref.repo
        );

        let resp = self
            .client
            .get(&url)
            .send()
            .map_err(|e| CoreError::Other(format!("GitHub API request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(CoreError::Other(format!(
                "GitHub API error {}: {}",
                resp.status(),
                resp.text().unwrap_or_default()
            )));
        }

        let repo: GitHubRepoResponse = resp
            .json()
            .map_err(|e| CoreError::Other(format!("Failed to parse GitHub response: {}", e)))?;

        Ok(GitHubRepo {
            full_name: repo.full_name,
            description: repo.description,
            default_branch: repo.default_branch,
            private: repo.private,
            html_url: repo.html_url,
        })
    }

    /// List contents of a directory in a repo.
    pub fn list_contents(
        &self,
        repo_ref: &RepoRef,
        path: &str,
        branch: Option<&str>,
    ) -> CoreResult<Vec<GitHubContentItem>> {
        let url = format!(
            "{}/repos/{}/{}/contents/{}",
            GITHUB_API_BASE, repo_ref.owner, repo_ref.repo, path
        );

        let mut req = self.client.get(&url);
        if let Some(branch) = branch {
            req = req.query(&[("ref", branch)]);
        }

        let resp = req
            .send()
            .map_err(|e| CoreError::Other(format!("GitHub API request failed: {}", e)))?;

        if resp.status().as_u16() == 404 {
            return Ok(vec![]);
        }

        if !resp.status().is_success() {
            return Err(CoreError::Other(format!(
                "GitHub API error {}: {}",
                resp.status(),
                resp.text().unwrap_or_default()
            )));
        }

        resp.json()
            .map_err(|e| CoreError::Other(format!("Failed to parse contents response: {}", e)))
    }

    /// Get raw file content from a repo.
    pub fn get_file_content(
        &self,
        repo_ref: &RepoRef,
        path: &str,
        branch: Option<&str>,
    ) -> CoreResult<String> {
        let url = format!(
            "{}/repos/{}/{}/contents/{}",
            GITHUB_API_BASE, repo_ref.owner, repo_ref.repo, path
        );

        let mut req = self.client.get(&url);
        if let Some(branch) = branch {
            req = req.query(&[("ref", branch)]);
        }

        let resp = req
            .send()
            .map_err(|e| CoreError::Other(format!("GitHub API request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(CoreError::Other(format!(
                "GitHub API error {} for {}: {}",
                resp.status(),
                path,
                resp.text().unwrap_or_default()
            )));
        }

        let file: GitHubFileContent = resp
            .json()
            .map_err(|e| CoreError::Other(format!("Failed to parse file response: {}", e)))?;

        // GitHub returns base64-encoded content
        let content = file.content.unwrap_or_default();
        let cleaned: String = content.chars().filter(|c| !c.is_whitespace()).collect();

        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&cleaned)
            .map_err(|e| CoreError::Other(format!("Failed to decode base64 content: {}", e)))?;

        String::from_utf8(bytes)
            .map_err(|e| CoreError::Other(format!("File content is not valid UTF-8: {}", e)))
    }

    /// Fetch the full recursive tree for a branch in a single API call.
    ///
    /// This is much faster than calling `list_contents` + `get_file_content`
    /// repeatedly, as it replaces N+1 API calls with just one.
    pub fn get_tree_recursive(
        &self,
        repo_ref: &RepoRef,
        branch: &str,
    ) -> CoreResult<Vec<GitHubTreeItem>> {
        let url = format!(
            "{}/repos/{}/{}/git/trees/{}",
            GITHUB_API_BASE, repo_ref.owner, repo_ref.repo, branch
        );

        let resp = self
            .client
            .get(&url)
            .query(&[("recursive", "1")])
            .send()
            .map_err(|e| CoreError::Other(format!("GitHub API request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(CoreError::Other(format!(
                "GitHub API error {}: {}",
                resp.status(),
                resp.text().unwrap_or_default()
            )));
        }

        let tree: GitHubTreeResponse = resp
            .json()
            .map_err(|e| CoreError::Other(format!("Failed to parse tree response: {}", e)))?;

        Ok(tree.tree)
    }

    /// Fetch a blob's content by SHA.
    pub fn get_blob_content(&self, repo_ref: &RepoRef, sha: &str) -> CoreResult<String> {
        let url = format!(
            "{}/repos/{}/{}/git/blobs/{}",
            GITHUB_API_BASE, repo_ref.owner, repo_ref.repo, sha
        );

        let resp = self
            .client
            .get(&url)
            .send()
            .map_err(|e| CoreError::Other(format!("GitHub API request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(CoreError::Other(format!(
                "GitHub API error {} for blob {}: {}",
                resp.status(),
                sha,
                resp.text().unwrap_or_default()
            )));
        }

        let blob: GitHubBlobResponse = resp
            .json()
            .map_err(|e| CoreError::Other(format!("Failed to parse blob response: {}", e)))?;

        let cleaned: String = blob
            .content
            .chars()
            .filter(|c| !c.is_whitespace())
            .collect();

        use base64::Engine;
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&cleaned)
            .map_err(|e| CoreError::Other(format!("Failed to decode base64 blob: {}", e)))?;

        String::from_utf8(bytes)
            .map_err(|e| CoreError::Other(format!("Blob content is not valid UTF-8: {}", e)))
    }

    /// Fetch multiple blobs in parallel using thread scoping.
    ///
    /// Returns a Vec of (path, content) pairs for successfully fetched blobs.
    /// Fetches up to `max_concurrent` blobs simultaneously.
    pub fn get_blobs_parallel(
        &self,
        repo_ref: &RepoRef,
        items: &[(String, String)], // (path, sha) pairs
        max_concurrent: usize,
    ) -> Vec<(String, CoreResult<String>)> {
        let mut results = Vec::with_capacity(items.len());

        for chunk in items.chunks(max_concurrent) {
            let chunk_results: Vec<_> = std::thread::scope(|s| {
                let handles: Vec<_> = chunk
                    .iter()
                    .map(|(path, sha)| {
                        let path = path.clone();
                        s.spawn(move || {
                            let content = self.get_blob_content(repo_ref, sha);
                            (path, content)
                        })
                    })
                    .collect();

                handles
                    .into_iter()
                    .map(|h| h.join().expect("blob fetch thread panicked"))
                    .collect()
            });
            results.extend(chunk_results);
        }

        results
    }

    /// Detect specs in a GitHub repository.
    ///
    /// Uses the Git Trees API to fetch the repo tree in a single call, then
    /// identifies spec directories and fetches their README.md blobs in parallel.
    pub fn detect_specs(
        &self,
        repo_ref: &RepoRef,
        branch: Option<&str>,
    ) -> CoreResult<Option<SpecDetectionResult>> {
        let repo = self.get_repo(repo_ref)?;
        let branch = branch.unwrap_or(&repo.default_branch);

        // Fetch the full tree in one API call instead of N+1 calls
        let tree_items = self.get_tree_recursive(repo_ref, branch)?;

        // Try each candidate directory
        for candidate in SPECS_DIR_CANDIDATES {
            let prefix = format!("{}/", candidate);

            // Find numbered spec directories by looking for README.md files
            // that match the pattern: {candidate}/{digit*}/README.md
            let mut spec_readmes: Vec<(String, String)> = Vec::new(); // (dir_name, sha)
            let mut spec_dir_names: std::collections::HashSet<String> =
                std::collections::HashSet::new();

            for item in &tree_items {
                if item.item_type != "blob" {
                    continue;
                }
                if let Some(rest) = item.path.strip_prefix(&prefix) {
                    let parts: Vec<&str> = rest.splitn(2, '/').collect();
                    if parts.len() == 2
                        && parts[1] == "README.md"
                        && parts[0].chars().next().is_some_and(|c| c.is_ascii_digit())
                    {
                        spec_readmes.push((parts[0].to_string(), item.sha.clone()));
                        spec_dir_names.insert(parts[0].to_string());
                    }
                }
            }

            // Also count spec dirs that might not have a README.md
            for item in &tree_items {
                if item.item_type == "tree" {
                    if let Some(rest) = item.path.strip_prefix(&prefix) {
                        if !rest.contains('/')
                            && rest.chars().next().is_some_and(|c| c.is_ascii_digit())
                        {
                            spec_dir_names.insert(rest.to_string());
                        }
                    }
                }
            }

            if spec_dir_names.is_empty() {
                continue;
            }

            // Fetch README.md blobs in parallel (up to 50, 10 concurrent)
            let items_to_fetch: Vec<(String, String)> = spec_readmes.into_iter().take(50).collect();
            let blob_results = self.get_blobs_parallel(repo_ref, &items_to_fetch, 10);

            let parser = FrontmatterParser::new();
            let mut specs = Vec::new();

            // Build a map of fetched results
            let fetched: std::collections::HashMap<String, String> = blob_results
                .into_iter()
                .filter_map(|(path, result)| result.ok().map(|content| (path, content)))
                .collect();

            // Build specs list for all known directories
            let mut sorted_dirs: Vec<_> = spec_dir_names.into_iter().collect();
            sorted_dirs.sort();

            for dir_name in sorted_dirs.iter().take(50) {
                if let Some(content) = fetched.get(dir_name) {
                    let (title, status, priority) = extract_spec_metadata(&parser, content);
                    specs.push(DetectedSpec {
                        path: dir_name.clone(),
                        title,
                        status,
                        priority,
                    });
                } else {
                    specs.push(DetectedSpec {
                        path: dir_name.clone(),
                        title: None,
                        status: None,
                        priority: None,
                    });
                }
            }

            return Ok(Some(SpecDetectionResult {
                repo: repo_ref.full_name(),
                branch: branch.to_string(),
                specs_dir: candidate.to_string(),
                spec_count: sorted_dirs.len(),
                specs,
            }));
        }

        Ok(None)
    }

    /// List repositories accessible to the authenticated user.
    pub fn list_user_repos(&self, limit: usize) -> CoreResult<Vec<GitHubRepo>> {
        if !self.is_authenticated() {
            return Err(CoreError::Other(
                "GitHub token required. Set GITHUB_TOKEN or LEANSPEC_GITHUB_TOKEN".to_string(),
            ));
        }

        let url = format!("{}/user/repos", GITHUB_API_BASE);
        let resp = self
            .client
            .get(&url)
            .query(&[
                ("sort", "updated"),
                ("per_page", &limit.to_string()),
                ("type", "all"),
            ])
            .send()
            .map_err(|e| CoreError::Other(format!("GitHub API request failed: {}", e)))?;

        if !resp.status().is_success() {
            return Err(CoreError::Other(format!(
                "GitHub API error {}: {}",
                resp.status(),
                resp.text().unwrap_or_default()
            )));
        }

        let repos: Vec<GitHubRepoResponse> = resp
            .json()
            .map_err(|e| CoreError::Other(format!("Failed to parse repos response: {}", e)))?;

        Ok(repos
            .into_iter()
            .map(|r| GitHubRepo {
                full_name: r.full_name,
                description: r.description,
                default_branch: r.default_branch,
                private: r.private,
                html_url: r.html_url,
            })
            .collect())
    }
}

/// Extract title, status, and priority from spec content.
fn extract_spec_metadata(
    parser: &FrontmatterParser,
    content: &str,
) -> (Option<String>, Option<String>, Option<String>) {
    let mut title = None;
    let mut status = None;
    let mut priority = None;

    // Extract title from first H1 heading
    for line in content.lines() {
        if let Some(h1) = line.strip_prefix("# ") {
            title = Some(h1.trim().to_string());
            break;
        }
    }

    // Parse frontmatter (returns (SpecFrontmatter, body_content))
    if let Ok((fm, _body)) = parser.parse(content) {
        status = Some(fm.status.to_string());
        priority = fm
            .priority
            .map(|p: crate::types::SpecPriority| p.to_string());
    }

    (title, status, priority)
}
