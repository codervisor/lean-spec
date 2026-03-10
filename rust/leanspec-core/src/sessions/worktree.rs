//! Git worktree lifecycle support for session isolation.

#![cfg(feature = "sessions")]

use crate::error::{CoreError, CoreResult};
use crate::sessions::types::Session;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub const WORKTREE_ENABLED_KEY: &str = "worktree_enabled";
pub const WORKTREE_PATH_KEY: &str = "worktree_path";
pub const WORKTREE_BRANCH_KEY: &str = "worktree_branch";
pub const WORKTREE_BASE_BRANCH_KEY: &str = "worktree_base_branch";
pub const WORKTREE_BASE_COMMIT_KEY: &str = "worktree_base_commit";
pub const WORKTREE_STATUS_KEY: &str = "worktree_status";
pub const WORKTREE_MERGE_STRATEGY_KEY: &str = "worktree_merge_strategy";
pub const WORKTREE_AUTO_MERGE_KEY: &str = "worktree_auto_merge";
pub const WORKTREE_CONFLICT_FILES_KEY: &str = "worktree_conflict_files";
pub const WORKTREE_CLEANED_AT_KEY: &str = "worktree_cleaned_at";

const REGISTRY_DIR_NAME: &str = ".leanspec-worktrees";
const REGISTRY_FILE_NAME: &str = "registry.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorktreeStatus {
    Created,
    Running,
    Completed,
    Failed,
    Merging,
    Merged,
    Conflict,
    Abandoned,
}

impl WorktreeStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Created => "created",
            Self::Running => "running",
            Self::Completed => "completed",
            Self::Failed => "failed",
            Self::Merging => "merging",
            Self::Merged => "merged",
            Self::Conflict => "conflict",
            Self::Abandoned => "abandoned",
        }
    }

    pub fn is_active(self) -> bool {
        matches!(
            self,
            Self::Created
                | Self::Running
                | Self::Completed
                | Self::Failed
                | Self::Merging
                | Self::Conflict
        )
    }
}

impl std::fmt::Display for WorktreeStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for WorktreeStatus {
    type Err = CoreError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_lowercase().as_str() {
            "created" => Ok(Self::Created),
            "running" => Ok(Self::Running),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            "merging" => Ok(Self::Merging),
            "merged" => Ok(Self::Merged),
            "conflict" => Ok(Self::Conflict),
            "abandoned" => Ok(Self::Abandoned),
            other => Err(CoreError::ConfigError(format!(
                "Unknown worktree status: {}",
                other
            ))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MergeStrategy {
    AutoMerge,
    Squash,
    PullRequest,
    Manual,
}

impl MergeStrategy {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::AutoMerge => "auto_merge",
            Self::Squash => "squash",
            Self::PullRequest => "pr",
            Self::Manual => "manual",
        }
    }
}

impl std::fmt::Display for MergeStrategy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for MergeStrategy {
    type Err = CoreError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value.trim().to_lowercase().as_str() {
            "auto" | "merge" | "auto_merge" | "auto-merge" => Ok(Self::AutoMerge),
            "squash" => Ok(Self::Squash),
            "pr" | "pull_request" | "pull-request" => Ok(Self::PullRequest),
            "manual" => Ok(Self::Manual),
            other => Err(CoreError::ConfigError(format!(
                "Unknown merge strategy: {}",
                other
            ))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeSession {
    pub session_id: String,
    pub worktree_path: PathBuf,
    pub branch_name: String,
    pub base_branch: String,
    pub base_commit: String,
    pub status: WorktreeStatus,
    pub merge_strategy: MergeStrategy,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub merged_at: Option<DateTime<Utc>>,
    pub spec_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct WorktreeRegistry {
    version: u32,
    sessions: Vec<WorktreeSession>,
}

impl Default for WorktreeRegistry {
    fn default() -> Self {
        Self {
            version: 1,
            sessions: Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct MergeOutcome {
    pub merged: bool,
    pub status: WorktreeStatus,
    pub strategy: MergeStrategy,
    pub conflicted_files: Vec<String>,
    pub branch_name: String,
    pub base_branch: String,
    pub worktree_path: PathBuf,
}

#[derive(Debug, Clone, Default)]
pub struct GcResult {
    pub pruned_entries: usize,
    pub removed_worktrees: usize,
    pub removed_branches: usize,
}

pub struct GitWorktreeManager {
    repo_root: PathBuf,
    registry_path: PathBuf,
    worktree_root: PathBuf,
}

impl GitWorktreeManager {
    pub fn for_project<P: AsRef<Path>>(project_path: P) -> CoreResult<Self> {
        let project_path = project_path.as_ref().to_path_buf();
        let repo_root = resolve_repo_root(&project_path)?;
        let registry_path = resolve_git_common_dir(&repo_root)?
            .join(REGISTRY_DIR_NAME)
            .join(REGISTRY_FILE_NAME);
        let worktree_root = env::var("LEANSPEC_WORKTREE_ROOT")
            .map(PathBuf::from)
            .unwrap_or_else(|_| env::temp_dir().join("leanspec-worktrees"));
        Ok(Self {
            repo_root,
            registry_path,
            worktree_root,
        })
    }

    pub fn create_for_session(
        &self,
        session_id: &str,
        spec_ids: &[String],
        merge_strategy: MergeStrategy,
    ) -> CoreResult<WorktreeSession> {
        if let Some(existing) = self.get_session(session_id)? {
            return Ok(existing);
        }

        let base_branch = current_branch(&self.repo_root)?;
        let base_commit = git_output(&self.repo_root, &["rev-parse", "HEAD"])?;
        let branch_name = build_branch_name(session_id, spec_ids);

        fs::create_dir_all(&self.worktree_root)?;
        let worktree_path = self.worktree_root.join(format!(
            "{}-session-{}",
            repo_slug(&self.repo_root),
            short_session_id(session_id)
        ));

        if worktree_path.exists() {
            fs::remove_dir_all(&worktree_path)?;
        }

        git_run(
            &self.repo_root,
            &[
                "worktree",
                "add",
                "-b",
                &branch_name,
                &worktree_path.to_string_lossy(),
                &base_branch,
            ],
        )?;

        let worktree_session = WorktreeSession {
            session_id: session_id.to_string(),
            worktree_path: worktree_path.clone(),
            branch_name,
            base_branch,
            base_commit,
            status: WorktreeStatus::Created,
            merge_strategy,
            created_at: Utc::now(),
            completed_at: None,
            merged_at: None,
            spec_ids: spec_ids.to_vec(),
        };

        let mut registry = self.load_registry()?;
        registry.sessions.push(worktree_session.clone());
        self.save_registry(&registry)?;

        Ok(worktree_session)
    }

    pub fn get_session(&self, session_id: &str) -> CoreResult<Option<WorktreeSession>> {
        let registry = self.load_registry()?;
        Ok(registry
            .sessions
            .into_iter()
            .find(|session| session.session_id == session_id))
    }

    pub fn list_sessions(&self) -> CoreResult<Vec<WorktreeSession>> {
        Ok(self.load_registry()?.sessions)
    }

    pub fn set_status(
        &self,
        session_id: &str,
        status: WorktreeStatus,
    ) -> CoreResult<Option<WorktreeSession>> {
        let mut registry = self.load_registry()?;
        let mut updated = None;

        for session in &mut registry.sessions {
            if session.session_id == session_id {
                session.status = status;
                if matches!(status, WorktreeStatus::Completed | WorktreeStatus::Failed) {
                    session.completed_at = Some(Utc::now());
                }
                if matches!(status, WorktreeStatus::Merged) {
                    session.merged_at = Some(Utc::now());
                }
                updated = Some(session.clone());
                break;
            }
        }

        self.save_registry(&registry)?;
        Ok(updated)
    }

    pub fn merge_session(
        &self,
        session_id: &str,
        strategy: Option<MergeStrategy>,
        _resolve: bool,
    ) -> CoreResult<MergeOutcome> {
        let mut worktree = self.get_session(session_id)?.ok_or_else(|| {
            CoreError::NotFound(format!("Worktree session not found: {}", session_id))
        })?;

        let strategy = strategy.unwrap_or(worktree.merge_strategy);

        self.commit_worktree_changes(&worktree)?;

        if matches!(strategy, MergeStrategy::PullRequest | MergeStrategy::Manual) {
            worktree.status = WorktreeStatus::Completed;
            self.upsert_session(&worktree)?;
            return Ok(MergeOutcome {
                merged: false,
                status: worktree.status,
                strategy,
                conflicted_files: Vec::new(),
                branch_name: worktree.branch_name,
                base_branch: worktree.base_branch,
                worktree_path: worktree.worktree_path,
            });
        }

        ensure_clean_branch_worktree(&self.repo_root, &worktree.base_branch)?;
        self.set_status(session_id, WorktreeStatus::Merging)?;

        let dry_run = git_run_allow_failure(
            &self.repo_root,
            &["merge", "--no-commit", "--no-ff", &worktree.branch_name],
        )?;

        if !dry_run.success {
            let conflicted_files = conflicted_files(&self.repo_root)?;
            let _ = git_run_allow_failure(&self.repo_root, &["merge", "--abort"]);
            worktree.status = WorktreeStatus::Conflict;
            self.upsert_session(&worktree)?;
            return Ok(MergeOutcome {
                merged: false,
                status: WorktreeStatus::Conflict,
                strategy,
                conflicted_files,
                branch_name: worktree.branch_name,
                base_branch: worktree.base_branch,
                worktree_path: worktree.worktree_path,
            });
        }

        let abort = git_run_allow_failure(&self.repo_root, &["merge", "--abort"])?;
        if !abort.success && !abort.stderr.contains("MERGE_HEAD missing") {
            return Err(CoreError::ToolError(format!(
                "git merge --abort failed: {}",
                abort.stderr.trim()
            )));
        }

        match strategy {
            MergeStrategy::AutoMerge => {
                git_run(
                    &self.repo_root,
                    &["merge", "--no-edit", &worktree.branch_name],
                )?;
            }
            MergeStrategy::Squash => {
                git_run(
                    &self.repo_root,
                    &["merge", "--squash", &worktree.branch_name],
                )?;
                git_run(
                    &self.repo_root,
                    &[
                        "commit",
                        "-m",
                        &format!("Merge LeanSpec session {}", session_id),
                    ],
                )?;
            }
            MergeStrategy::PullRequest | MergeStrategy::Manual => {}
        }

        worktree.status = WorktreeStatus::Merged;
        worktree.merge_strategy = strategy;
        worktree.merged_at = Some(Utc::now());
        self.upsert_session(&worktree)?;

        Ok(MergeOutcome {
            merged: true,
            status: WorktreeStatus::Merged,
            strategy,
            conflicted_files: Vec::new(),
            branch_name: worktree.branch_name,
            base_branch: worktree.base_branch,
            worktree_path: worktree.worktree_path,
        })
    }

    pub fn cleanup_session(&self, session_id: &str, preserve_branch: bool) -> CoreResult<()> {
        let worktree = self.get_session(session_id)?.ok_or_else(|| {
            CoreError::NotFound(format!("Worktree session not found: {}", session_id))
        })?;

        if worktree.worktree_path.exists() {
            git_run(
                &self.repo_root,
                &[
                    "worktree",
                    "remove",
                    "--force",
                    &worktree.worktree_path.to_string_lossy(),
                ],
            )?;
        }

        git_run_allow_failure(&self.repo_root, &["worktree", "prune"])?;

        if !preserve_branch {
            let _ =
                git_run_allow_failure(&self.repo_root, &["branch", "-D", &worktree.branch_name]);
        }

        let mut registry = self.load_registry()?;
        registry
            .sessions
            .retain(|session| session.session_id != session_id);
        self.save_registry(&registry)?;

        Ok(())
    }

    pub fn gc(&self) -> CoreResult<GcResult> {
        let mut registry = self.load_registry()?;
        let mut result = GcResult::default();
        let mut retained = Vec::new();

        for session in registry.sessions {
            let removable = matches!(
                session.status,
                WorktreeStatus::Merged | WorktreeStatus::Abandoned
            ) || !session.worktree_path.exists();

            if removable {
                if session.worktree_path.exists() {
                    let _ = git_run_allow_failure(
                        &self.repo_root,
                        &[
                            "worktree",
                            "remove",
                            "--force",
                            &session.worktree_path.to_string_lossy(),
                        ],
                    );
                    result.removed_worktrees += 1;
                }

                if !matches!(session.status, WorktreeStatus::Conflict)
                    && git_run_allow_failure(
                        &self.repo_root,
                        &["branch", "-D", &session.branch_name],
                    )?
                    .success
                {
                    result.removed_branches += 1;
                }

                result.pruned_entries += 1;
            } else {
                retained.push(session);
            }
        }

        registry.sessions = retained;
        self.save_registry(&registry)?;
        let _ = git_run_allow_failure(&self.repo_root, &["worktree", "prune"]);
        Ok(result)
    }

    pub fn sync_session_metadata(&self, session: &mut Session, worktree: &WorktreeSession) {
        session
            .metadata
            .insert(WORKTREE_ENABLED_KEY.to_string(), "true".to_string());
        session.metadata.insert(
            WORKTREE_PATH_KEY.to_string(),
            worktree.worktree_path.to_string_lossy().into_owned(),
        );
        session.metadata.insert(
            WORKTREE_BRANCH_KEY.to_string(),
            worktree.branch_name.clone(),
        );
        session.metadata.insert(
            WORKTREE_BASE_BRANCH_KEY.to_string(),
            worktree.base_branch.clone(),
        );
        session.metadata.insert(
            WORKTREE_BASE_COMMIT_KEY.to_string(),
            worktree.base_commit.clone(),
        );
        session
            .metadata
            .insert(WORKTREE_STATUS_KEY.to_string(), worktree.status.to_string());
        session.metadata.insert(
            WORKTREE_MERGE_STRATEGY_KEY.to_string(),
            worktree.merge_strategy.to_string(),
        );
    }

    fn upsert_session(&self, updated: &WorktreeSession) -> CoreResult<()> {
        let mut registry = self.load_registry()?;
        let mut replaced = false;

        for session in &mut registry.sessions {
            if session.session_id == updated.session_id {
                *session = updated.clone();
                replaced = true;
                break;
            }
        }

        if !replaced {
            registry.sessions.push(updated.clone());
        }

        self.save_registry(&registry)
    }

    fn commit_worktree_changes(&self, worktree: &WorktreeSession) -> CoreResult<()> {
        if !has_uncommitted_changes(&worktree.worktree_path)? {
            return Ok(());
        }

        git_run(&worktree.worktree_path, &["add", "-A"])?;
        git_run(
            &worktree.worktree_path,
            &[
                "commit",
                "-m",
                &format!("LeanSpec session {}", worktree.session_id),
            ],
        )?;
        Ok(())
    }

    fn load_registry(&self) -> CoreResult<WorktreeRegistry> {
        if !self.registry_path.exists() {
            return Ok(WorktreeRegistry::default());
        }

        let content = fs::read_to_string(&self.registry_path)?;
        Ok(serde_json::from_str(&content)?)
    }

    fn save_registry(&self, registry: &WorktreeRegistry) -> CoreResult<()> {
        let parent = self.registry_path.parent().ok_or_else(|| {
            CoreError::ConfigError("Worktree registry parent missing".to_string())
        })?;
        fs::create_dir_all(parent)?;
        fs::write(&self.registry_path, serde_json::to_vec_pretty(registry)?)?;
        Ok(())
    }
}

pub fn worktree_enabled(session: &Session) -> bool {
    session
        .metadata
        .get(WORKTREE_ENABLED_KEY)
        .map(|value| value == "true")
        .unwrap_or(false)
}

fn build_branch_name(session_id: &str, spec_ids: &[String]) -> String {
    let suffix = if spec_ids.is_empty() {
        "session".to_string()
    } else {
        sanitize_branch_component(&spec_ids.join("-"))
    };
    format!(
        "leanspec/session/{}-{}",
        short_session_id(session_id),
        suffix.trim_matches('-')
    )
}

fn short_session_id(session_id: &str) -> String {
    session_id.chars().take(8).collect()
}

fn repo_slug(repo_root: &Path) -> String {
    sanitize_branch_component(
        repo_root
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("project"),
    )
}

fn sanitize_branch_component(value: &str) -> String {
    let mut rendered = String::new();
    let mut last_dash = false;

    for ch in value.chars() {
        let normalized = if ch.is_ascii_alphanumeric() {
            ch.to_ascii_lowercase()
        } else {
            '-'
        };
        if normalized == '-' {
            if !last_dash {
                rendered.push('-');
            }
            last_dash = true;
        } else {
            rendered.push(normalized);
            last_dash = false;
        }
    }

    rendered.trim_matches('-').to_string()
}

fn resolve_repo_root(project_path: &Path) -> CoreResult<PathBuf> {
    let output = git_output(project_path, &["rev-parse", "--show-toplevel"])?;
    Ok(PathBuf::from(output))
}

fn current_branch(repo_root: &Path) -> CoreResult<String> {
    let branch = git_output(repo_root, &["branch", "--show-current"])?;
    if branch.trim().is_empty() {
        return Err(CoreError::ValidationError(
            "Worktree sessions require a named git branch, not detached HEAD".to_string(),
        ));
    }
    Ok(branch)
}

fn resolve_git_common_dir(repo_root: &Path) -> CoreResult<PathBuf> {
    let git_dir = PathBuf::from(git_output(repo_root, &["rev-parse", "--git-common-dir"])?);
    if git_dir.is_absolute() {
        Ok(git_dir)
    } else {
        Ok(repo_root.join(git_dir))
    }
}

fn has_uncommitted_changes(repo_root: &Path) -> CoreResult<bool> {
    let status = git_output_allow_failure(repo_root, &["status", "--porcelain"])?;
    if !status.success {
        return Err(CoreError::ToolError(format!(
            "git status --porcelain failed: {}",
            status.stderr.trim()
        )));
    }

    Ok(!status.stdout.trim().is_empty())
}

fn ensure_clean_branch_worktree(repo_root: &Path, expected_branch: &str) -> CoreResult<()> {
    let branch = current_branch(repo_root)?;
    if branch != expected_branch {
        return Err(CoreError::ValidationError(format!(
            "Merge requires current branch '{}' but found '{}'",
            expected_branch, branch
        )));
    }

    if has_uncommitted_changes(repo_root)? {
        return Err(CoreError::ValidationError(
            "Merge requires a clean target branch worktree".to_string(),
        ));
    }

    Ok(())
}

fn conflicted_files(repo_root: &Path) -> CoreResult<Vec<String>> {
    let output = git_output_allow_failure(repo_root, &["diff", "--name-only", "--diff-filter=U"])?;
    Ok(output
        .stdout
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect())
}

fn git_output(repo_root: &Path, args: &[&str]) -> CoreResult<String> {
    let output = git_output_allow_failure(repo_root, args)?;
    if !output.success {
        return Err(CoreError::ToolError(format!(
            "git {} failed: {}",
            args.join(" "),
            output.stderr.trim()
        )));
    }
    Ok(output.stdout.trim().to_string())
}

fn git_run(repo_root: &Path, args: &[&str]) -> CoreResult<()> {
    let output = git_output_allow_failure(repo_root, args)?;
    if !output.success {
        return Err(CoreError::ToolError(format!(
            "git {} failed: {}",
            args.join(" "),
            output.stderr.trim()
        )));
    }
    Ok(())
}

fn git_run_allow_failure(repo_root: &Path, args: &[&str]) -> CoreResult<GitCommandOutput> {
    git_output_allow_failure(repo_root, args)
}

struct GitCommandOutput {
    success: bool,
    stdout: String,
    stderr: String,
}

fn git_output_allow_failure(repo_root: &Path, args: &[&str]) -> CoreResult<GitCommandOutput> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo_root)
        .args(args)
        .output()?;

    Ok(GitCommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_branch_component() {
        assert_eq!(
            sanitize_branch_component("Spec 101/Fix Auth"),
            "spec-101-fix-auth"
        );
        assert_eq!(sanitize_branch_component("already-clean"), "already-clean");
    }
}
