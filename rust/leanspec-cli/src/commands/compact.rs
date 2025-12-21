//! Compact command implementation
//!
//! Remove specified line ranges from a spec.

use colored::Colorize;
use std::error::Error;
use std::fs;
use std::path::Path;

pub fn run(
    specs_dir: &str,
    spec: &str,
    removes: Vec<String>,
    dry_run: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    if removes.is_empty() {
        return Err("At least one --remove option is required".into());
    }

    // Resolve spec path
    let spec_path = resolve_spec_path(specs_dir, spec)?;
    let readme_path = spec_path.join("README.md");

    if !readme_path.exists() {
        return Err(format!("Spec not found: {}", spec).into());
    }

    let content = fs::read_to_string(&readme_path)?;
    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len();

    // Parse and validate remove specifications
    let parsed_removes = parse_removes(&removes)?;
    validate_ranges(&parsed_removes, total_lines)?;

    if dry_run {
        display_dry_run(spec, &content, &parsed_removes)?;
        return Ok(());
    }

    // Execute the compaction
    execute_compact(&readme_path, spec, &content, &parsed_removes, output_format)?;

    Ok(())
}

struct RemoveSpec {
    start: usize,
    end: usize,
}

fn parse_removes(removes: &[String]) -> Result<Vec<RemoveSpec>, Box<dyn Error>> {
    let mut parsed = Vec::new();

    for remove in removes {
        // Format: "145-153" or "234-256"
        let parts: Vec<&str> = remove.split('-').collect();
        if parts.len() != 2 {
            return Err(format!(
                "Invalid line range format: {}. Expected format: '145-153'",
                remove
            )
            .into());
        }

        let start: usize = parts[0]
            .parse()
            .map_err(|_| format!("Invalid start line number: {}", parts[0]))?;
        let end: usize = parts[1]
            .parse()
            .map_err(|_| format!("Invalid end line number: {}", parts[1]))?;

        if start < 1 {
            return Err("Line numbers must be >= 1".into());
        }

        if end < start {
            return Err(format!("End line {} must be >= start line {}", end, start).into());
        }

        parsed.push(RemoveSpec { start, end });
    }

    // Sort by start line (descending for removal)
    parsed.sort_by(|a, b| b.start.cmp(&a.start));

    Ok(parsed)
}

fn validate_ranges(removes: &[RemoveSpec], total_lines: usize) -> Result<(), Box<dyn Error>> {
    for remove in removes {
        if remove.end > total_lines {
            return Err(format!(
                "Line range {}-{} exceeds file length ({})",
                remove.start, remove.end, total_lines
            )
            .into());
        }
    }

    // Check for overlaps
    let mut sorted: Vec<_> = removes.iter().collect();
    sorted.sort_by_key(|r| r.start);

    for i in 0..sorted.len().saturating_sub(1) {
        let current = sorted[i];
        let next = sorted[i + 1];

        if current.end >= next.start {
            return Err(format!(
                "Overlapping line ranges: {}-{} overlaps with {}-{}",
                current.start, current.end, next.start, next.end
            )
            .into());
        }
    }

    Ok(())
}

fn display_dry_run(
    spec: &str,
    content: &str,
    removes: &[RemoveSpec],
) -> Result<(), Box<dyn Error>> {
    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len();

    println!("{}", format!("📋 Compact Preview: {}", spec).cyan().bold());
    println!();
    println!("{}", "Would remove:".bold());
    println!();

    let mut total_removed = 0;

    for remove in removes {
        let line_count = remove.end - remove.start + 1;
        total_removed += line_count;

        println!(
            "  Lines {}-{} ({} lines)",
            remove.start, remove.end, line_count
        );

        // Show preview
        let preview_end = (remove.start - 1 + 3).min(remove.end - 1);
        println!("    {}:", "Preview".dimmed());

        for i in (remove.start - 1)..=preview_end {
            if i < lines.len() {
                let line = lines[i];
                let truncated = if line.len() > 60 {
                    format!("{}...", &line[..60])
                } else {
                    line.to_string()
                };
                println!("      {}", truncated.dimmed());
            }
        }

        if remove.end - remove.start + 1 > 3 {
            println!(
                "      {} ({} more lines)",
                "...".dimmed(),
                remove.end - remove.start - 2
            );
        }
        println!();
    }

    let remaining = total_lines - total_removed;
    let percentage = (total_removed * 100) / total_lines;

    println!("{}", "Summary:".bold());
    println!("  Original lines:  {}", total_lines.to_string().cyan());
    println!(
        "  Removing:        {} lines ({}%)",
        total_removed.to_string().yellow(),
        percentage
    );
    println!("  Remaining lines: {}", remaining.to_string().cyan());
    println!();
    println!("{}", "No files modified (dry run)".dimmed());
    println!("{}", "Run without --dry-run to apply changes".dimmed());

    Ok(())
}

fn execute_compact(
    path: &Path,
    spec: &str,
    content: &str,
    removes: &[RemoveSpec],
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    println!("{}", format!("🗜️  Compacting: {}", spec).cyan().bold());
    println!();

    let lines: Vec<&str> = content.lines().collect();
    let original_count = lines.len();

    // Create a set of lines to remove
    let mut lines_to_remove = std::collections::HashSet::new();
    for remove in removes {
        for line_num in remove.start..=remove.end {
            lines_to_remove.insert(line_num);
        }
    }

    // Build new content
    let new_lines: Vec<&str> = lines
        .iter()
        .enumerate()
        .filter(|(i, _)| !lines_to_remove.contains(&(i + 1)))
        .map(|(_, line)| *line)
        .collect();

    let new_content = new_lines.join("\n");
    let new_count = new_lines.len();
    let removed_count = original_count - new_count;

    // Write back
    fs::write(path, &new_content)?;

    for remove in removes {
        let line_count = remove.end - remove.start + 1;
        println!(
            "{} Removed lines {}-{} ({} lines)",
            "✓".green(),
            remove.start,
            remove.end,
            line_count
        );
    }

    let percentage = (removed_count * 100) / original_count;

    println!();
    println!("{}", "Compaction complete!".green().bold());
    println!(
        "Removed {} lines ({}%)",
        removed_count.to_string().dimmed(),
        percentage
    );
    println!("{} → {} lines", original_count, new_count);

    Ok(())
}

fn resolve_spec_path(specs_dir: &str, spec: &str) -> Result<std::path::PathBuf, Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);

    // First try direct path
    let direct = specs_path.join(spec);
    if direct.exists() && direct.is_dir() {
        return Ok(direct);
    }

    // Try to find by number prefix
    if let Ok(entries) = fs::read_dir(specs_path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            // Match by number prefix (e.g., "045" matches "045-feature")
            if (name_str.starts_with(spec) || name_str.contains(spec)) && entry.path().is_dir() {
                return Ok(entry.path());
            }
        }
    }

    Err(format!("Spec not found: {}", spec).into())
}
