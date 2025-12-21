//! Backfill command implementation
//!
//! Backfill timestamps from git history for specs.

use colored::Colorize;
use leanspec_core::SpecLoader;
use std::error::Error;
use std::fs;
use std::path::Path;
use std::process::Command;

#[allow(clippy::too_many_arguments)]
pub fn run(
    specs_dir: &str,
    specs: Option<Vec<String>>,
    dry_run: bool,
    force: bool,
    include_assignee: bool,
    _include_transitions: bool,
    _bootstrap: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    // Check if we're in a git repository
    if !is_git_repository() {
        return Err(
            "Not in a git repository. Git history is required for backfilling timestamps.".into(),
        );
    }

    let loader = SpecLoader::new(specs_dir);
    let all_specs = loader.load_all()?;

    // Filter to specific specs if provided
    let specs_to_process: Vec<_> = if let Some(ref target_specs) = specs {
        all_specs
            .iter()
            .filter(|s| {
                target_specs
                    .iter()
                    .any(|t| s.path.contains(t) || s.name().contains(t))
            })
            .collect()
    } else {
        all_specs.iter().collect()
    };

    if specs_to_process.is_empty() {
        println!("No specs found to backfill");
        return Ok(());
    }

    if dry_run {
        println!("{}", "🔍 Dry run mode - no changes will be made".cyan());
        println!();
    }

    println!(
        "Analyzing git history for {} spec{}...\n",
        specs_to_process.len(),
        if specs_to_process.len() == 1 { "" } else { "s" }
    );

    let mut updated_count = 0;
    let mut skipped_count = 0;

    #[derive(serde::Serialize)]
    struct BackfillResult {
        spec_path: String,
        spec_name: String,
        created_at: Option<String>,
        updated_at: Option<String>,
        assignee: Option<String>,
        source: String,
    }

    let mut results = Vec::new();

    for spec in &specs_to_process {
        let spec_readme = spec.file_path.clone();

        if !spec_readme.exists() {
            skipped_count += 1;
            continue;
        }

        // Check if file is tracked in git
        if !file_exists_in_git(&spec_readme) {
            if output_format != "json" {
                println!("{} {} - Not in git history", "⊘".yellow(), spec.name());
            }
            results.push(BackfillResult {
                spec_path: spec.path.clone(),
                spec_name: spec.name().to_string(),
                created_at: None,
                updated_at: None,
                assignee: None,
                source: "skipped".to_string(),
            });
            skipped_count += 1;
            continue;
        }

        // Get git timestamps
        let git_data = extract_git_timestamps(&spec_readme, include_assignee);

        // Check if spec already has timestamps (unless force)
        let has_created_at = spec.frontmatter.created_at.is_some();
        let has_updated_at = spec.frontmatter.updated_at.is_some();

        if !force && has_created_at && has_updated_at {
            if output_format != "json" {
                println!("{} {} - Already complete", "✓".dimmed(), spec.name());
            }
            results.push(BackfillResult {
                spec_path: spec.path.clone(),
                spec_name: spec.name().to_string(),
                created_at: spec.frontmatter.created_at.map(|dt| dt.to_rfc3339()),
                updated_at: spec.frontmatter.updated_at.map(|dt| dt.to_rfc3339()),
                assignee: spec.frontmatter.assignee.clone(),
                source: "existing".to_string(),
            });
            continue;
        }

        // Prepare updates
        let mut result = BackfillResult {
            spec_path: spec.path.clone(),
            spec_name: spec.name().to_string(),
            created_at: None,
            updated_at: None,
            assignee: None,
            source: "git".to_string(),
        };

        if let Some(created_at) = &git_data.created_at {
            if force || !has_created_at {
                result.created_at = Some(created_at.clone());
            }
        }

        if let Some(updated_at) = &git_data.updated_at {
            if force || !has_updated_at {
                result.updated_at = Some(updated_at.clone());
            }
        }

        if include_assignee {
            if let Some(assignee) = &git_data.assignee {
                result.assignee = Some(assignee.clone());
            }
        }

        if dry_run {
            if output_format != "json" {
                println!("{} {} - Would update", "→".cyan(), spec.name());
                if let Some(ref created_at) = result.created_at {
                    println!("  created_at:   {} (git)", created_at);
                }
                if let Some(ref updated_at) = result.updated_at {
                    println!("  updated_at:   {} (git)", updated_at);
                }
                if let Some(ref assignee) = result.assignee {
                    println!("  assignee:     {} (git)", assignee);
                }
            }
            updated_count += 1;
        } else {
            // Actually update the file
            if update_frontmatter_timestamps(
                &spec_readme,
                result.created_at.as_ref(),
                result.updated_at.as_ref(),
                result.assignee.as_ref(),
            )
            .is_ok()
            {
                if output_format != "json" {
                    println!("{} {} - Updated", "✓".green(), spec.name());
                }
                updated_count += 1;
            } else {
                if output_format != "json" {
                    println!("{} {} - Failed to update", "✗".red(), spec.name());
                }
                skipped_count += 1;
            }
        }

        results.push(result);
    }

    if output_format == "json" {
        println!("{}", serde_json::to_string_pretty(&results)?);
        return Ok(());
    }

    println!();
    println!("{}", "─".repeat(60));
    println!("{}", "Summary:".bold());
    println!();
    println!("  {} specs analyzed", specs_to_process.len());
    if dry_run {
        println!("  {} would be updated", updated_count);
    } else {
        println!("  {} updated", updated_count);
    }
    println!("  {} skipped", skipped_count);

    if dry_run {
        println!();
        println!("{}", "ℹ  Run without --dry-run to apply changes".cyan());
    }

    Ok(())
}

struct GitTimestampData {
    created_at: Option<String>,
    updated_at: Option<String>,
    assignee: Option<String>,
}

fn is_git_repository() -> bool {
    Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn file_exists_in_git(path: &Path) -> bool {
    Command::new("git")
        .args(["ls-files", "--error-unmatch"])
        .arg(path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn extract_git_timestamps(path: &Path, include_assignee: bool) -> GitTimestampData {
    let mut data = GitTimestampData {
        created_at: None,
        updated_at: None,
        assignee: None,
    };

    // Get first commit date (created_at)
    if let Ok(output) = Command::new("git")
        .args(["log", "--follow", "--format=%aI", "--diff-filter=A", "--"])
        .arg(path)
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = stdout.lines().last() {
                data.created_at = Some(line.trim().to_string());
            }
        }
    }

    // Fallback: get oldest commit date
    if data.created_at.is_none() {
        if let Ok(output) = Command::new("git")
            .args(["log", "--follow", "--format=%aI", "--reverse", "--"])
            .arg(path)
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(line) = stdout.lines().next() {
                    data.created_at = Some(line.trim().to_string());
                }
            }
        }
    }

    // Get last commit date (updated_at)
    if let Ok(output) = Command::new("git")
        .args(["log", "-1", "--format=%aI", "--"])
        .arg(path)
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = stdout.lines().next() {
                data.updated_at = Some(line.trim().to_string());
            }
        }
    }

    // Get first commit author (assignee)
    if include_assignee {
        if let Ok(output) = Command::new("git")
            .args(["log", "--follow", "--format=%an", "--reverse", "--"])
            .arg(path)
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(line) = stdout.lines().next() {
                    data.assignee = Some(line.trim().to_string());
                }
            }
        }
    }

    data
}

#[allow(dead_code)]
struct TimestampUpdates {
    created_at: Option<String>,
    updated_at: Option<String>,
    assignee: Option<String>,
}

fn update_frontmatter_timestamps(
    path: &Path,
    created_at: Option<&String>,
    updated_at: Option<&String>,
    assignee: Option<&String>,
) -> Result<(), Box<dyn Error>> {
    // This is a simplified implementation
    // In production, we would properly parse and update YAML frontmatter

    let content = fs::read_to_string(path)?;

    // Check if file has frontmatter
    if !content.starts_with("---") {
        return Err("No frontmatter found".into());
    }

    // Find the end of frontmatter
    let rest = &content[3..];
    if let Some(end_idx) = rest.find("---") {
        let frontmatter = &rest[..end_idx];
        let body = &rest[end_idx + 3..];

        // Parse frontmatter as YAML-like and add/update fields
        // For now, just append timestamps if not present
        let mut new_frontmatter = frontmatter.trim().to_string();

        // This is a simplified approach - a real implementation would use serde_yaml
        if !frontmatter.contains("created_at:") {
            if let Some(created_at_val) = created_at {
                new_frontmatter.push_str(&format!("\ncreated_at: '{}'", created_at_val));
            }
        }

        if !frontmatter.contains("updated_at:") {
            if let Some(updated_at_val) = updated_at {
                new_frontmatter.push_str(&format!("\nupdated_at: '{}'", updated_at_val));
            }
        }

        if !frontmatter.contains("assignee:") {
            if let Some(assignee_val) = assignee {
                new_frontmatter.push_str(&format!("\nassignee: '{}'", assignee_val));
            }
        }

        let new_content = format!("---\n{}\n---{}", new_frontmatter, body);
        fs::write(path, new_content)?;

        return Ok(());
    }

    Err("Invalid frontmatter format".into())
}
