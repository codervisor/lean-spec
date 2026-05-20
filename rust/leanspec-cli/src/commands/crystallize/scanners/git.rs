//! Git history scanner.
//!
//! Shells out to `git log` to extract:
//! - the conventional-commit-style type prefixes the project actually uses,
//! - clusters of files that frequently change together.
//!
//! No-op (returns empty) if the directory isn't a git repo or `git` is
//! missing.

use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

use crate::commands::crystallize::signals::{Category, Signal};

const SOURCE: &str = "git";

const COMMIT_LIMIT: usize = 500;
const KNOWN_TYPES: &[&str] = &[
    "feat", "fix", "refactor", "test", "docs", "chore", "ci", "perf", "build", "style", "revert",
];

pub fn scan(root: &Path) -> Vec<Signal> {
    if !is_git_repo(root) {
        return Vec::new();
    }

    let mut signals = Vec::new();
    if let Some(types) = collect_commit_types(root) {
        if !types.is_empty() {
            signals.push(Signal::new(
                Category::Convention,
                format!("Commit message types in use: {}", types.join(", ")),
                0.9,
                SOURCE,
            ));
        }
    }

    for cluster in cochange_clusters(root) {
        signals.push(Signal::new(
            Category::Arch,
            format!(
                "`{}` and `{}` are frequently changed together ({} commits)",
                cluster.a, cluster.b, cluster.count
            ),
            0.5,
            SOURCE,
        ));
    }

    signals
}

fn is_git_repo(root: &Path) -> bool {
    Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(root)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn collect_commit_types(root: &Path) -> Option<Vec<String>> {
    let output = Command::new("git")
        .args([
            "log",
            &format!("-n{COMMIT_LIMIT}"),
            "--pretty=format:%s",
            "--no-merges",
        ])
        .current_dir(root)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut counts: HashMap<&str, usize> = HashMap::new();
    for line in stdout.lines() {
        if let Some(idx) = line.find(':') {
            let prefix = line[..idx].trim();
            // Strip optional `(scope)` suffix and `!` (breaking).
            let prefix = prefix
                .split('(')
                .next()
                .unwrap_or(prefix)
                .trim_end_matches('!');
            if let Some(known) = KNOWN_TYPES.iter().find(|t| **t == prefix) {
                *counts.entry(*known).or_default() += 1;
            }
        }
    }
    if counts.is_empty() {
        return Some(Vec::new());
    }
    let mut found: Vec<(&str, usize)> = counts.into_iter().collect();
    found.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(b.0)));
    // Keep only types with at least 2 occurrences to filter one-offs.
    Some(
        found
            .into_iter()
            .filter(|(_, c)| *c >= 2)
            .map(|(t, _)| t.to_string())
            .collect(),
    )
}

struct CoChange {
    a: String,
    b: String,
    count: usize,
}

fn cochange_clusters(root: &Path) -> Vec<CoChange> {
    let output = match Command::new("git")
        .args([
            "log",
            &format!("-n{COMMIT_LIMIT}"),
            "--name-only",
            "--pretty=format:--commit--",
            "--no-merges",
        ])
        .current_dir(root)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
    {
        Ok(o) if o.status.success() => o,
        _ => return Vec::new(),
    };
    let stdout = String::from_utf8_lossy(&output.stdout);

    let mut pair_counts: HashMap<(String, String), usize> = HashMap::new();
    let mut current: Vec<String> = Vec::new();

    let flush = |current: &mut Vec<String>, pair_counts: &mut HashMap<(String, String), usize>| {
        // Reduce each file to a coarse "area" — first 2 path components.
        let mut areas: Vec<String> = current
            .iter()
            .filter_map(|f| {
                let parts: Vec<&str> = f.split('/').collect();
                if parts.len() < 2 {
                    None
                } else {
                    Some(parts[..2].join("/"))
                }
            })
            .collect();
        areas.sort();
        areas.dedup();
        for i in 0..areas.len() {
            for j in (i + 1)..areas.len() {
                let key = (areas[i].clone(), areas[j].clone());
                *pair_counts.entry(key).or_default() += 1;
            }
        }
        current.clear();
    };

    for line in stdout.lines() {
        if line == "--commit--" {
            flush(&mut current, &mut pair_counts);
        } else if !line.trim().is_empty() {
            current.push(line.to_string());
        }
    }
    flush(&mut current, &mut pair_counts);

    let mut pairs: Vec<((String, String), usize)> =
        pair_counts.into_iter().filter(|(_, c)| *c >= 10).collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    pairs
        .into_iter()
        .take(3)
        .map(|((a, b), count)| CoChange { a, b, count })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn non_git_dir_returns_empty() {
        let tmp = TempDir::new().unwrap();
        let signals = scan(tmp.path());
        assert!(signals.is_empty());
    }
}
