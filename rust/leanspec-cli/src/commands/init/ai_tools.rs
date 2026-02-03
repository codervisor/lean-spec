pub use leanspec_core::sessions::DetectionResult;
use leanspec_core::sessions::{RunnerDefinition, RunnerRegistry};
use std::collections::HashSet;
use std::path::Path;

#[derive(Clone, Debug)]
pub struct SymlinkResult {
    pub file: String,
    pub created: bool,
    pub skipped: bool,
    pub error: Option<String>,
}

pub fn detect_ai_tools(
    registry: &RunnerRegistry,
    home_override: Option<&Path>,
) -> Vec<DetectionResult> {
    registry.detect_available(home_override)
}

pub fn symlink_capable_runners(registry: &RunnerRegistry) -> Vec<RunnerDefinition> {
    registry.symlink_runners().into_iter().cloned().collect()
}

pub fn default_symlink_selection(detections: &[DetectionResult]) -> Vec<String> {
    detections
        .iter()
        .filter(|result| result.detected)
        .filter_map(|result| {
            if result.runner.symlink_file.is_some() {
                Some(result.runner.id.clone())
            } else {
                None
            }
        })
        .collect()
}

pub fn create_symlinks(root: &Path, runners: &[RunnerDefinition]) -> Vec<SymlinkResult> {
    let mut files: HashSet<String> = HashSet::new();
    for runner in runners {
        if let Some(file) = &runner.symlink_file {
            files.insert(file.clone());
        }
    }

    let mut results = Vec::new();
    for file in files {
        let target_path = root.join(&file);
        if target_path.exists() {
            results.push(SymlinkResult {
                file,
                created: false,
                skipped: true,
                error: None,
            });
            continue;
        }

        #[cfg(unix)]
        {
            let outcome = std::os::unix::fs::symlink("AGENTS.md", &target_path)
                .map(|_| SymlinkResult {
                    file: file.clone(),
                    created: true,
                    skipped: false,
                    error: None,
                })
                .unwrap_or_else(|e| SymlinkResult {
                    file: file.clone(),
                    created: false,
                    skipped: false,
                    error: Some(e.to_string()),
                });
            results.push(outcome);
        }

        #[cfg(not(unix))]
        {
            let outcome = std::fs::copy(root.join("AGENTS.md"), &target_path)
                .map(|_| SymlinkResult {
                    file: file.clone(),
                    created: true,
                    skipped: false,
                    error: Some("created as copy (Windows)".to_string()),
                })
                .unwrap_or_else(|e| SymlinkResult {
                    file: file.clone(),
                    created: false,
                    skipped: false,
                    error: Some(e.to_string()),
                });
            results.push(outcome);
        }
    }

    results
}
