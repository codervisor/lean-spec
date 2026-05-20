//! Test pattern scanner.
//!
//! Walks `tests/` directories and looks for shared helpers / feature-flag
//! guards / `#[ignore]` patterns. Output is intentionally narrow — we only
//! emit a signal when something genuinely dominates.

use std::path::Path;

use walkdir::WalkDir;

use crate::commands::crystallize::signals::{Category, Signal};

const SOURCE: &str = "tests";

const SKIP_DIRS: &[&str] = &["node_modules", "target", ".git", "dist", "build"];

pub fn scan(root: &Path) -> Vec<Signal> {
    let mut rust_tests = 0usize;
    let mut uses_test_context = 0usize;
    let mut feature_guarded = 0usize;
    let mut ignored = 0usize;
    let mut ts_tests = 0usize;
    let mut vitest_imports = 0usize;

    let walker = WalkDir::new(root).into_iter().filter_entry(|e| {
        let name = e.file_name().to_string_lossy();
        !(e.depth() > 0 && SKIP_DIRS.iter().any(|d| name == *d))
    });

    for entry in walker.flatten() {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let p_str = path.to_string_lossy();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let in_tests_dir = p_str.contains("/tests/") || p_str.contains("\\tests\\");
        let is_test_file = path
            .file_name()
            .and_then(|s| s.to_str())
            .is_some_and(|n| n.contains(".test.") || n.ends_with("_test.rs"));

        if ext == "rs" && (in_tests_dir || is_test_file) {
            rust_tests += 1;
            if let Ok(content) = std::fs::read_to_string(path) {
                if content.contains("TestContext") {
                    uses_test_context += 1;
                }
                if content.contains("#[cfg(feature") {
                    feature_guarded += 1;
                }
                if content.contains("#[ignore]") {
                    ignored += 1;
                }
            }
        }

        if matches!(ext, "ts" | "tsx") && is_test_file {
            ts_tests += 1;
            if let Ok(content) = std::fs::read_to_string(path) {
                if content.contains("from 'vitest'") || content.contains("from \"vitest\"") {
                    vitest_imports += 1;
                }
            }
        }
    }

    let mut signals = Vec::new();

    if rust_tests >= 5 && uses_test_context * 2 >= rust_tests {
        signals.push(Signal::new(
            Category::Testing,
            "Rust integration tests use a shared `TestContext` helper under the crate's `tests/common/` module",
            0.8,
            SOURCE,
        ));
    }

    if feature_guarded > 0 && feature_guarded > ignored {
        signals.push(Signal::new(
            Category::Testing,
            "Tests that need optional capabilities are gated with `#[cfg(feature = \"...\")]`, not `#[ignore]`",
            0.6,
            SOURCE,
        ));
    }

    if ts_tests >= 5 && vitest_imports * 2 >= ts_tests {
        signals.push(Signal::new(
            Category::Testing,
            "TypeScript tests use Vitest (`describe` / `it` / `expect`)",
            0.7,
            SOURCE,
        ));
    }

    signals
}

#[cfg(test)]
#[allow(clippy::module_inception)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn empty_dir_no_panic() {
        let tmp = TempDir::new().unwrap();
        assert!(scan(tmp.path()).is_empty());
    }
}
