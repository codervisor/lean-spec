//! Naming convention scanner.
//!
//! Samples Rust and TypeScript file/identifier names and emits signals when
//! a consistent pattern dominates (snake_case modules, PascalCase types, etc.).

use std::path::Path;

use walkdir::WalkDir;

use crate::commands::crystallize::signals::{Category, Signal};

const SOURCE: &str = "naming";

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
    let mut rust_mods_snake = 0usize;
    let mut rust_mods_other = 0usize;
    let mut ts_files_camel = 0usize;
    let mut ts_files_kebab = 0usize;
    let mut ts_files_other = 0usize;
    let mut rust_types_pascal = 0usize;
    let mut rust_types_other = 0usize;
    let mut adapter_suffix_types = 0usize;

    let walker = WalkDir::new(root).into_iter().filter_entry(|e| {
        let name = e.file_name().to_string_lossy();
        !(e.depth() > 0 && SKIP_DIRS.iter().any(|d| name == *d))
    });

    for entry in walker.flatten() {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default();
        if stem.is_empty() {
            continue;
        }

        match ext {
            "rs" => {
                if is_snake(stem) {
                    rust_mods_snake += 1;
                } else if stem != "mod" && stem != "lib" && stem != "main" {
                    rust_mods_other += 1;
                }
                if let Ok(content) = std::fs::read_to_string(path) {
                    inspect_rust_types(
                        &content,
                        &mut rust_types_pascal,
                        &mut rust_types_other,
                        &mut adapter_suffix_types,
                    );
                }
            }
            "ts" | "tsx" => {
                if stem.contains('-') {
                    ts_files_kebab += 1;
                } else if is_camel_or_pascal(stem) {
                    ts_files_camel += 1;
                } else if !is_snake(stem) {
                    ts_files_other += 1;
                }
            }
            _ => {}
        }
    }

    let mut signals = Vec::new();

    let rust_total = rust_mods_snake + rust_mods_other;
    if rust_total >= 20 && rust_mods_snake * 10 >= rust_total * 9 {
        signals.push(Signal::new(
            Category::Naming,
            "Rust module files use `snake_case` (e.g. `git_repo.rs`)",
            0.8,
            SOURCE,
        ));
    }

    let ts_total = ts_files_camel + ts_files_kebab + ts_files_other;
    if ts_total >= 20 {
        if ts_files_kebab >= ts_files_camel && ts_files_kebab * 2 >= ts_total {
            signals.push(Signal::new(
                Category::Naming,
                "TypeScript filenames use `kebab-case`",
                0.7,
                SOURCE,
            ));
        } else if ts_files_camel >= ts_files_kebab && ts_files_camel * 2 >= ts_total {
            signals.push(Signal::new(
                Category::Naming,
                "TypeScript filenames use `camelCase` / `PascalCase`",
                0.7,
                SOURCE,
            ));
        }
    }

    let type_total = rust_types_pascal + rust_types_other;
    if type_total >= 20 && rust_types_pascal * 10 >= type_total * 9 {
        signals.push(Signal::new(
            Category::Naming,
            "Rust types are `PascalCase` (`struct`, `enum`, `trait`)",
            0.7,
            SOURCE,
        ));
    }

    if adapter_suffix_types >= 3 {
        signals.push(Signal::new(
            Category::Naming,
            format!(
                "Adapter implementations use the `Adapter` suffix ({} types: e.g. `MarkdownAdapter`)",
                adapter_suffix_types
            ),
            0.8,
            SOURCE,
        ));
    }

    signals
}

fn inspect_rust_types(
    content: &str,
    pascal: &mut usize,
    other: &mut usize,
    adapter_suffix: &mut usize,
) {
    for line in content.lines() {
        let line = line.trim_start();
        let rest = line
            .strip_prefix("pub struct ")
            .or_else(|| line.strip_prefix("struct "))
            .or_else(|| line.strip_prefix("pub enum "))
            .or_else(|| line.strip_prefix("enum "))
            .or_else(|| line.strip_prefix("pub trait "))
            .or_else(|| line.strip_prefix("trait "));
        let Some(rest) = rest else {
            continue;
        };
        let name: String = rest
            .chars()
            .take_while(|c| c.is_alphanumeric() || *c == '_')
            .collect();
        if name.is_empty() {
            continue;
        }
        if is_pascal(&name) {
            *pascal += 1;
        } else {
            *other += 1;
        }
        if name.ends_with("Adapter") && name.len() > "Adapter".len() {
            *adapter_suffix += 1;
        }
    }
}

fn is_snake(s: &str) -> bool {
    !s.is_empty()
        && s.chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_')
}

fn is_pascal(s: &str) -> bool {
    s.chars().next().is_some_and(|c| c.is_ascii_uppercase())
        && s.chars().all(|c| c.is_ascii_alphanumeric())
}

fn is_camel_or_pascal(s: &str) -> bool {
    s.chars().next().is_some_and(|c| c.is_ascii_alphabetic())
        && s.chars().all(|c| c.is_ascii_alphanumeric())
        && s.chars().any(|c| c.is_ascii_uppercase())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn empty_dir_no_panic() {
        let tmp = TempDir::new().unwrap();
        assert!(scan(tmp.path()).is_empty());
    }

    #[test]
    fn detects_adapter_suffix() {
        let tmp = TempDir::new().unwrap();
        let src = tmp.path().join("rust/src");
        fs::create_dir_all(&src).unwrap();
        for name in &["foo_adapter", "bar_adapter", "baz_adapter"] {
            fs::write(
                src.join(format!("{name}.rs")),
                format!("pub struct {}Adapter;\n", name.split('_').next().unwrap()),
            )
            .unwrap();
        }
        let signals = scan(tmp.path());
        assert!(
            signals.iter().any(|s| s.text.contains("`Adapter` suffix")),
            "expected adapter suffix signal: {:?}",
            signals.iter().map(|s| &s.text).collect::<Vec<_>>()
        );
    }
}
