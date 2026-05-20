//! Spec intent scanner.
//!
//! Loads the project's specs via the configured adapter and extracts
//! short imperative rules from their `Notes`, `Design`, and `Constraints`
//! sections. Silent / empty when there are no specs.

use leanspec_core::adapters::{Adapter, ListFilter};

use crate::commands::crystallize::signals::{Category, Signal};

const SOURCE: &str = "specs";

/// Section keys we mine for rules. Specs in this repo use either the field
/// `key` (snake_case) or the section header text. We probe a few common ones.
const RULE_FIELDS: &[&str] = &["notes", "design", "constraints", "plan", "overview"];

/// Substrings that signal an imperative rule worth surfacing.
const RULE_HINTS: &[&str] = &[
    "must ",
    "never ",
    "always ",
    "should ",
    "do not ",
    "don't ",
    "required ",
    "forbidden",
];

const FORBIDDEN_HINTS: &[&str] = &["never ", "do not ", "don't ", "forbidden"];

pub fn scan(adapter: &dyn Adapter) -> Vec<Signal> {
    let filter = ListFilter::default();
    let specs = match adapter.list(&filter) {
        Ok(s) => s,
        Err(_) => return Vec::new(),
    };

    let mut signals = Vec::new();
    for spec in specs {
        let title = spec.title.clone();
        let id = spec.id.clone();
        for field in RULE_FIELDS {
            let Some(value) = spec.field_str(field) else {
                continue;
            };
            for sentence in split_sentences(value) {
                let trimmed = sentence.trim();
                if trimmed.len() < 20 || trimmed.len() > 200 {
                    continue;
                }
                let lower = trimmed.to_ascii_lowercase();
                if !RULE_HINTS.iter().any(|h| lower.contains(h)) {
                    continue;
                }
                let category = if FORBIDDEN_HINTS.iter().any(|h| lower.contains(h)) {
                    Category::Forbidden
                } else {
                    Category::Arch
                };
                let attribution = format!("{} (spec `{}` — {})", trimmed, id, title);
                signals.push(Signal::new(category, attribution, 0.6, SOURCE));
            }
        }
    }

    // Cap per-category to avoid the section getting overwhelmed by one verbose spec.
    cap_per_category(signals, 8)
}

fn split_sentences(s: &str) -> Vec<String> {
    let mut out = Vec::new();
    // Pull only sentence-ish lines (bullets, lines), drop fenced code.
    let mut in_fence = false;
    for raw in s.lines() {
        let line = raw.trim();
        if line.starts_with("```") {
            in_fence = !in_fence;
            continue;
        }
        if in_fence || line.is_empty() || line.starts_with('#') {
            continue;
        }
        let line = line
            .trim_start_matches('-')
            .trim_start_matches('*')
            .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.')
            .trim();
        for piece in line.split(['.', '!', '?']) {
            let piece = piece.trim();
            if !piece.is_empty() {
                out.push(piece.to_string());
            }
        }
    }
    out
}

fn cap_per_category(signals: Vec<Signal>, cap: usize) -> Vec<Signal> {
    let mut by_cat: std::collections::HashMap<Category, Vec<Signal>> =
        std::collections::HashMap::new();
    for s in signals {
        by_cat.entry(s.category).or_default().push(s);
    }
    let mut out = Vec::new();
    for (_cat, mut list) in by_cat {
        list.truncate(cap);
        out.extend(list);
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_sentences_strips_code_fences() {
        let input =
            "Some intro\n\n```rust\nfn foo() {}\n```\n\n- Never import `X` from outside `y`.\n";
        let pieces = split_sentences(input);
        assert!(
            pieces.iter().any(|p| p.contains("Never import")),
            "got: {pieces:?}"
        );
        assert!(
            !pieces.iter().any(|p| p.contains("fn foo")),
            "code fence content should be skipped: {pieces:?}"
        );
    }
}
