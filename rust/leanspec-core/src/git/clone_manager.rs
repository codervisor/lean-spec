//! Clone manager — handles shallow sparse clones, pull, commit, push.

use crate::error::{CoreError, CoreResult};
use crate::parsers::FrontmatterParser;

use super::operations::{run_git, run_git_in};
use super::types::*;

use std::path::Path;

/// Candidate directories where specs might live inside a repo.
const SPECS_DIR_CANDIDATES: &[&str] = &["specs", ".lean-spec/specs", "doc/specs", "docs/specs"];

pub struct CloneManager;

impl CloneManager {
    /// Clone a repository using shallow + sparse checkout.
    ///
    /// Only checks out the specs directory to minimize bandwidth.
    pub fn clone_repo(config: &CloneConfig) -> CoreResult<()> {
        let dir = &config.clone_dir;
        let dir_str = dir
            .to_str()
            .ok_or_else(|| CoreError::Other("Invalid clone path".to_string()))?;

        // Clone: shallow, no checkout yet
        let mut args = vec!["clone", "--depth=1", "--no-checkout"];
        let branch_str;
        if let Some(ref branch) = config.branch {
            branch_str = branch.clone();
            args.extend(&["--branch", &branch_str]);
        }
        args.push(&config.remote_url);
        args.push(dir_str);

        run_git_in(&args, dir)?;

        // Set up sparse checkout if we know the specs path
        if let Some(ref specs_path) = config.specs_path {
            run_git(&["sparse-checkout", "init", "--cone"], dir)?;
            run_git(&["sparse-checkout", "set", specs_path], dir)?;
        }

        // Checkout the files
        run_git(&["checkout"], dir)?;

        Ok(())
    }

    /// Pull latest changes from the remote.
    pub fn pull(clone_dir: &Path) -> CoreResult<PullResult> {
        let old_sha = run_git(&["rev-parse", "--short", "HEAD"], clone_dir)?;

        run_git(&["fetch", "--depth=1", "origin"], clone_dir)?;

        // Get the current branch
        let branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], clone_dir)?;
        let remote_ref = format!("origin/{}", branch);

        run_git(&["reset", "--hard", &remote_ref], clone_dir)?;

        let new_sha = run_git(&["rev-parse", "--short", "HEAD"], clone_dir)?;

        Ok(PullResult {
            updated: old_sha != new_sha,
            head_sha: new_sha,
        })
    }

    /// Detect specs in a remote repository.
    ///
    /// Clones into a temp directory, scans for specs, then cleans up.
    pub fn detect_specs(
        remote_url: &str,
        branch: Option<&str>,
    ) -> CoreResult<Option<SpecDetectionResult>> {
        let temp_dir = tempfile::tempdir()
            .map_err(|e| CoreError::Other(format!("Failed to create temp dir: {}", e)))?;

        let config = CloneConfig {
            remote_url: remote_url.to_string(),
            branch: branch.map(|s| s.to_string()),
            specs_path: None, // Clone everything (shallow) to detect
            clone_dir: temp_dir.path().to_path_buf(),
        };

        // Clone without sparse checkout so we can scan
        let dir = &config.clone_dir;
        let dir_str = dir
            .to_str()
            .ok_or_else(|| CoreError::Other("Invalid clone path".to_string()))?;

        let mut args = vec!["clone", "--depth=1"];
        let branch_str;
        if let Some(ref b) = config.branch {
            branch_str = b.clone();
            args.extend(&["--branch", &branch_str]);
        }
        args.push(&config.remote_url);
        args.push(dir_str);

        run_git_in(&args, dir)?;

        // Get the actual branch name
        let actual_branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], dir)?;

        // Scan for specs
        let result = scan_specs_in_dir(dir, remote_url, &actual_branch)?;

        // temp_dir drops and cleans up automatically
        Ok(result)
    }

    /// Detect specs in an already-cloned directory.
    pub fn detect_specs_local(
        clone_dir: &Path,
        remote_url: &str,
    ) -> CoreResult<Option<SpecDetectionResult>> {
        let branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], clone_dir)?;
        scan_specs_in_dir(clone_dir, remote_url, &branch)
    }

    /// Stage, commit, and push changes in the specs directory.
    pub fn commit_and_push(
        clone_dir: &Path,
        specs_path: &str,
        message: &str,
    ) -> CoreResult<PushResult> {
        // Stage all changes in the specs directory
        run_git(&["add", specs_path], clone_dir)?;

        // Check if there's anything to commit
        let status = run_git(&["status", "--porcelain"], clone_dir)?;
        if status.is_empty() {
            return Err(CoreError::Other("No changes to commit".to_string()));
        }

        run_git(&["commit", "-m", message], clone_dir)?;

        let sha = run_git(&["rev-parse", "--short", "HEAD"], clone_dir)?;

        run_git(&["push", "origin", "HEAD"], clone_dir)?;

        Ok(PushResult { commit_sha: sha })
    }

    /// Get the status of the working tree.
    pub fn status(clone_dir: &Path) -> CoreResult<GitStatus> {
        let branch = run_git(&["rev-parse", "--abbrev-ref", "HEAD"], clone_dir)?;
        let remote_url = run_git(&["remote", "get-url", "origin"], clone_dir)?;
        let porcelain = run_git(&["status", "--porcelain"], clone_dir)?;

        let changed_files: Vec<String> = porcelain
            .lines()
            .filter(|l| !l.is_empty())
            .map(|l| l[3..].to_string()) // skip status columns "XY "
            .collect();

        Ok(GitStatus {
            has_changes: !changed_files.is_empty(),
            changed_files,
            branch,
            remote_url,
        })
    }

    /// Check if a directory is a valid git clone.
    pub fn is_valid_clone(dir: &Path) -> bool {
        dir.join(".git").exists() && run_git(&["rev-parse", "--git-dir"], dir).is_ok()
    }
}

/// Scan a cloned directory for spec directories.
fn scan_specs_in_dir(
    dir: &Path,
    remote_url: &str,
    branch: &str,
) -> CoreResult<Option<SpecDetectionResult>> {
    for candidate in SPECS_DIR_CANDIDATES {
        let specs_dir = dir.join(candidate);
        if !specs_dir.is_dir() {
            continue;
        }

        let parser = FrontmatterParser::new();
        let mut specs = Vec::new();

        let mut entries: Vec<_> = std::fs::read_dir(&specs_dir)
            .map_err(|e| CoreError::Other(format!("Failed to read specs dir: {}", e)))?
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_type().map(|ft| ft.is_dir()).unwrap_or(false)
                    && e.file_name()
                        .to_str()
                        .is_some_and(|n| n.chars().next().is_some_and(|c| c.is_ascii_digit()))
            })
            .collect();

        entries.sort_by_key(|e| e.file_name());

        for entry in entries.iter().take(50) {
            let dir_name = entry.file_name().to_string_lossy().to_string();
            let readme = entry.path().join("README.md");

            let (title, status, priority) = if readme.exists() {
                match std::fs::read_to_string(&readme) {
                    Ok(content) => extract_spec_metadata(&parser, &content),
                    Err(_) => (None, None, None),
                }
            } else {
                (None, None, None)
            };

            specs.push(DetectedSpec {
                path: dir_name,
                title,
                status,
                priority,
            });
        }

        if specs.is_empty() {
            continue;
        }

        return Ok(Some(SpecDetectionResult {
            remote_url: remote_url.to_string(),
            branch: branch.to_string(),
            specs_dir: candidate.to_string(),
            spec_count: specs.len(),
            specs,
        }));
    }

    Ok(None)
}

/// Extract title, status, and priority from spec content.
fn extract_spec_metadata(
    parser: &FrontmatterParser,
    content: &str,
) -> (Option<String>, Option<String>, Option<String>) {
    let mut title = None;
    let mut status = None;
    let mut priority = None;

    for line in content.lines() {
        if let Some(h1) = line.strip_prefix("# ") {
            title = Some(h1.trim().to_string());
            break;
        }
    }

    if let Ok((fm, _body)) = parser.parse(content) {
        status = Some(fm.status.to_string());
        priority = fm
            .priority
            .map(|p: crate::types::SpecPriority| p.to_string());
    }

    (title, status, priority)
}
