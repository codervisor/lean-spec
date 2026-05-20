//! Architecture pattern scanner.
//!
//! Walks the repo's Rust and TypeScript sources and extracts coarse
//! structural signals: module layout, trait-impl relationships, and error
//! type usage. Heuristic — no AST parsing.

use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use walkdir::WalkDir;

use crate::commands::crystallize::signals::{Category, Signal};

const SOURCE: &str = "arch";

const SKIP_DIRS: &[&str] = &[
    "node_modules",
    "target",
    "dist",
    "build",
    ".git",
    ".turbo",
    ".next",
    "coverage",
    "out",
];

pub fn scan(root: &Path) -> Vec<Signal> {
    let mut signals = Vec::new();

    let walker = WalkDir::new(root).into_iter().filter_entry(|e| {
        let name = e.file_name().to_string_lossy();
        !(e.depth() > 0 && SKIP_DIRS.iter().any(|d| name == *d))
    });

    // Group source files by top-level "area" (first 2 path components).
    let mut area_to_files: BTreeMap<String, Vec<String>> = BTreeMap::new();
    let mut trait_impls: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();
    let mut thiserror_count = 0usize;
    let mut anyhow_count = 0usize;
    let mut rust_file_count = 0usize;

    for entry in walker.flatten() {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if !matches!(ext, "rs" | "ts" | "tsx") {
            continue;
        }

        // Record area key — first one or two path segments below the root.
        let rel = match path.strip_prefix(root) {
            Ok(p) => p,
            Err(_) => continue,
        };
        let segs: Vec<&str> = rel.iter().filter_map(|s| s.to_str()).collect();
        if segs.len() < 2 {
            continue;
        }
        let area_key = if segs[0] == "rust" || segs[0] == "packages" {
            // crate / package level
            format!("{}/{}", segs[0], segs[1])
        } else {
            segs[0].to_string()
        };
        area_to_files
            .entry(area_key)
            .or_default()
            .push(rel.display().to_string());

        if ext == "rs" {
            rust_file_count += 1;
            if let Ok(content) = std::fs::read_to_string(path) {
                scan_rust_file(
                    &content,
                    &mut trait_impls,
                    &mut thiserror_count,
                    &mut anyhow_count,
                );
            }
        }
    }

    // 1) Area / module layout signals — only emit areas with enough mass to
    //    look architectural, not "incidentally has 2 files".
    for (area, files) in &area_to_files {
        if files.len() < 4 {
            continue;
        }
        // Find a representative deeper subdirectory inside this area if one
        // dominates (e.g. "rust/leanspec-core/src/adapters").
        if let Some(common) = dominant_subdir(files) {
            signals.push(Signal::new(
                Category::Arch,
                format!("`{common}/` holds the {area} implementation"),
                0.7,
                SOURCE,
            ));
        } else {
            signals.push(Signal::new(
                Category::Arch,
                format!("`{area}/` is a top-level area ({} files)", files.len()),
                0.4,
                SOURCE,
            ));
        }
    }

    // 2) Trait/impl relationships — promote traits with multiple implementors.
    for (trait_name, impls) in &trait_impls {
        if impls.len() >= 2 {
            let sample: Vec<&str> = impls.iter().take(3).map(|s| s.as_str()).collect();
            signals.push(Signal::new(
                Category::Arch,
                format!(
                    "`{trait_name}` is implemented by {} types ({})",
                    impls.len(),
                    sample.join(", ")
                ),
                0.8,
                SOURCE,
            ));
        }
    }

    // 3) Error type usage — emit only when there is clear signal.
    if rust_file_count > 0 && (thiserror_count > 0 || anyhow_count > 0) {
        if thiserror_count >= anyhow_count {
            signals.push(Signal::new(
                Category::Arch,
                "Rust errors use `thiserror` for library errors (`#[derive(Error)]`)",
                0.6,
                SOURCE,
            ));
        }
        if anyhow_count > 0 && anyhow_count >= thiserror_count / 2 {
            signals.push(Signal::new(
                Category::Arch,
                "Application-level error handling uses `anyhow`",
                0.5,
                SOURCE,
            ));
        }
    }

    signals
}

fn scan_rust_file(
    content: &str,
    trait_impls: &mut BTreeMap<String, BTreeSet<String>>,
    thiserror_count: &mut usize,
    anyhow_count: &mut usize,
) {
    if content.contains("thiserror::Error") || content.contains("#[derive(Error") {
        *thiserror_count += 1;
    }
    if content.contains("anyhow::") || content.contains("anyhow!") {
        *anyhow_count += 1;
    }
    for line in content.lines() {
        let line = line.trim();
        // Match `impl <Trait> for <Type> {` — skip generic / where-clause forms
        // beyond the simple case.
        if let Some(rest) = line.strip_prefix("impl ") {
            if let Some(idx) = rest.find(" for ") {
                let trait_part = rest[..idx].trim();
                let type_part = rest[idx + 5..]
                    .trim_end_matches(" {")
                    .trim_end_matches('{')
                    .trim();
                if let (Some(tr), Some(ty)) = (clean_ident(trait_part), clean_ident(type_part)) {
                    trait_impls.entry(tr).or_default().insert(ty);
                }
            }
        }
    }
}

fn clean_ident(s: &str) -> Option<String> {
    // Strip generic args and lifetimes — keep just the leading identifier.
    let head = s.split(['<', ' ', '\t']).next()?.trim();
    if head.is_empty()
        || head
            .chars()
            .any(|c| !(c.is_alphanumeric() || c == '_' || c == ':'))
    {
        return None;
    }
    let last = head.rsplit("::").next()?;
    if last.is_empty() {
        None
    } else {
        Some(last.to_string())
    }
}

/// If a strong majority of files share a common subdirectory prefix beyond
/// the area key, return that prefix (without trailing slash). The prefix is
/// always a *directory* — the file's basename is excluded so we never claim
/// something like `rust/foo/src/lib.rs/` "holds the implementation".
fn dominant_subdir(files: &[String]) -> Option<String> {
    if files.len() < 4 {
        return None;
    }
    let mut counts: BTreeMap<String, usize> = BTreeMap::new();
    for f in files {
        let parts: Vec<&str> = f.split('/').collect();
        // Drop the trailing basename and require at least 4 directory
        // components above it (e.g. `rust/<crate>/src/<area>/<file>`).
        let dir_parts: &[&str] = if parts.len() > 1 {
            &parts[..parts.len() - 1]
        } else {
            &[]
        };
        if dir_parts.len() >= 4 {
            let prefix = dir_parts[..4].join("/");
            *counts.entry(prefix).or_default() += 1;
        }
    }
    let total = files.len();
    counts
        .into_iter()
        .filter(|(_, c)| *c * 2 >= total)
        .max_by_key(|(_, c)| *c)
        .map(|(p, _)| p)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn no_panic_on_empty_dir() {
        let tmp = TempDir::new().unwrap();
        let signals = scan(tmp.path());
        assert!(signals.is_empty());
    }

    #[test]
    fn dominant_subdir_never_returns_a_filename() {
        // Files at the area boundary (4 path segments — `rust/<crate>/src/<file>`)
        // must not produce a "prefix" that ends in a filename.
        let files: Vec<String> = (0..5).map(|i| format!("rust/foo/src/file{i}.rs")).collect();
        let result = dominant_subdir(&files);
        // None is fine; what's *not* fine is returning something ending in
        // a `.rs` file.
        if let Some(p) = result {
            assert!(
                !p.ends_with(".rs"),
                "dominant_subdir returned a filename: {p}"
            );
        }
    }

    #[test]
    fn detects_trait_impls() {
        let tmp = TempDir::new().unwrap();
        let src = tmp.path().join("rust/crate/src");
        fs::create_dir_all(&src).unwrap();
        fs::write(
            src.join("a.rs"),
            "impl Adapter for FooAdapter {}\nimpl Adapter for BarAdapter {}\n",
        )
        .unwrap();
        let signals = scan(tmp.path());
        assert!(
            signals
                .iter()
                .any(|s| s.text.contains("Adapter") && s.text.contains("implemented")),
            "expected trait impl signal, got {:?}",
            signals.iter().map(|s| &s.text).collect::<Vec<_>>()
        );
    }
}
