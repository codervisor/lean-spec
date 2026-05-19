//! `archive` command — adapter-aware spec archival.
//!
//! Delegates to [`Adapter::delete`], which on the markdown adapter flips the
//! spec's status to `archived` (no file move) and on issue-tracker adapters
//! closes the underlying issue.

use crate::commands::shared::resolve_adapter;
use colored::Colorize;
use std::error::Error;

pub fn run(specs_dir: &str, specs: &[String], dry_run: bool) -> Result<(), Box<dyn Error>> {
    if specs.is_empty() {
        return Err("At least one spec path is required".into());
    }

    let adapter = resolve_adapter(specs_dir)?;
    let caps_name = adapter.capabilities().name.clone();

    if dry_run {
        println!();
        println!("{}", "Dry run - no changes will be made".yellow());
        println!();
    }

    let mut archived = 0;
    let mut errors: Vec<String> = Vec::new();

    for id in specs {
        // Validate existence up front so the dry-run output mirrors the real
        // run's would-be behaviour, and so a single bad id doesn't poison the
        // whole batch's output ordering.
        let doc = match adapter.get(id) {
            Ok(doc) => doc,
            Err(e) => {
                errors.push(format!("{id}: {e}"));
                continue;
            }
        };

        // Archive is destructive — reject fuzzy substring matches that the
        // markdown adapter's `get` is happy to resolve. Allow exact-id or
        // numeric-prefix forms; everything else must spell the spec out.
        if caps_name == "markdown" && !is_exact_match(id, &doc.id) {
            errors.push(format!(
                "{id}: requires an exact spec id or numeric prefix (got fuzzy match: {})",
                doc.id
            ));
            continue;
        }

        let action_label = archive_verb(&caps_name);

        if dry_run {
            println!(
                "{} {}: {}",
                "Would".dimmed(),
                action_label.dimmed(),
                doc.id.cyan()
            );
            continue;
        }

        match adapter.delete(&doc.id) {
            Ok(()) => {
                println!(
                    "{} {} {} {}",
                    "✓".green(),
                    action_label.green(),
                    doc.id.cyan(),
                    format!("(via {caps_name} adapter)").dimmed()
                );
                archived += 1;
            }
            Err(e) => {
                errors.push(format!("{}: {e}", doc.id));
            }
        }
    }

    if !errors.is_empty() {
        println!();
        println!("{} Errors encountered:", "⚠️".yellow());
        for error in &errors {
            println!("  • {}", error);
        }
        println!();
    }

    if !dry_run {
        println!(
            "{} {} {} spec(s)",
            "✓".green(),
            past_tense(&caps_name),
            archived
        );
    }

    if !errors.is_empty() {
        return Err(format!("Failed to archive {} spec(s)", errors.len()).into());
    }

    Ok(())
}

/// Verb shown to the user. Issue trackers don't "archive" — they close — so
/// surface the actual action the backend takes.
fn archive_verb(adapter_name: &str) -> &'static str {
    match adapter_name {
        "markdown" => "Archive",
        _ => "Close",
    }
}

fn past_tense(adapter_name: &str) -> &'static str {
    match adapter_name {
        "markdown" => "Archived",
        _ => "Closed",
    }
}

/// Accept `input` as a match for `resolved_id` only if it equals the id
/// exactly, equals the id with an implicit numeric-prefix zero-pad (e.g.
/// `1` → `001-foo`), or includes the nested path (e.g. `001-foo/002-bar`).
fn is_exact_match(input: &str, resolved_id: &str) -> bool {
    if input == resolved_id {
        return true;
    }
    // Numeric prefix form: input is all digits and id starts with that
    // number padded out.
    if input.chars().all(|c| c.is_ascii_digit()) && !input.is_empty() {
        // Resolved IDs look like `NNN-slug` or `NNN-parent/NNN-child`. Pull
        // the leading number from the leaf directory and compare values.
        let leaf = resolved_id.rsplit('/').next().unwrap_or(resolved_id);
        if let Some(idx) = leaf.find('-') {
            let leaf_num = &leaf[..idx];
            if leaf_num.parse::<u32>().ok() == input.parse::<u32>().ok() {
                return true;
            }
        }
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_exact_match_accepts_exact_id() {
        assert!(is_exact_match("001-foo", "001-foo"));
    }

    #[test]
    fn is_exact_match_accepts_numeric_prefix() {
        assert!(is_exact_match("001", "001-foo"));
        assert!(is_exact_match("1", "001-foo"));
    }

    #[test]
    fn is_exact_match_rejects_substring() {
        assert!(!is_exact_match("foo", "001-my-foo-bar"));
        assert!(!is_exact_match("feature", "001-my-feature-spec"));
    }
}
