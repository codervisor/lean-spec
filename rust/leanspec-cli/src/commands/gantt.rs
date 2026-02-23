//! Gantt command implementation
//!
//! Shows timeline with dependencies in Gantt-style format.

use colored::Colorize;
use leanspec_core::{DependencyGraph, SpecLoader, SpecStatus};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    filter_status: Option<String>,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;

    let dep_graph = DependencyGraph::new(&specs);

    // Filter specs
    let filtered: Vec<_> = specs
        .iter()
        .filter(|s| {
            if let Some(ref status) = filter_status {
                s.frontmatter.status.to_string() == *status
            } else {
                // Default: show planned and in-progress
                matches!(
                    s.frontmatter.status,
                    SpecStatus::Planned | SpecStatus::InProgress
                )
            }
        })
        .collect();

    // Get topological order if possible
    let ordered_paths: Vec<String> = match dep_graph.topological_sort() {
        Some(order) => order.iter().map(|s| s.path.clone()).collect(),
        None => filtered.iter().map(|s| s.path.clone()).collect(),
    };

    // Reorder filtered specs according to topological order
    let mut sorted_specs: Vec<_> = filtered
        .iter()
        .filter_map(|s| {
            ordered_paths
                .iter()
                .position(|p| p == &s.path)
                .map(|pos| (pos, *s))
        })
        .collect();
    sorted_specs.sort_by_key(|(pos, _)| *pos);

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct Output {
            specs: Vec<GanttSpec>,
            execution_order: Vec<String>,
        }

        #[derive(serde::Serialize)]
        struct GanttSpec {
            path: String,
            title: String,
            status: String,
            depends_on: Vec<String>,
            blocked_by: Vec<String>,
            order: usize,
        }

        let output = Output {
            specs: sorted_specs
                .iter()
                .enumerate()
                .map(|(i, (_, s))| {
                    // Find incomplete dependencies that block this spec
                    let blocked_by: Vec<_> = s
                        .frontmatter
                        .depends_on
                        .iter()
                        .filter(|dep| {
                            specs
                                .iter()
                                .find(|sp| &sp.path == *dep)
                                .map(|sp| sp.frontmatter.status != SpecStatus::Complete)
                                .unwrap_or(false)
                        })
                        .cloned()
                        .collect();

                    GanttSpec {
                        path: s.path.clone(),
                        title: s.title.clone(),
                        status: s.frontmatter.status.to_string(),
                        depends_on: s.frontmatter.depends_on.clone(),
                        blocked_by,
                        order: i + 1,
                    }
                })
                .collect(),
            execution_order: sorted_specs.iter().map(|(_, s)| s.path.clone()).collect(),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    // Pretty print Gantt-style view
    println!();
    println!("{}", "Gantt View (Execution Order)".bold());
    println!("{}", "═".repeat(70).dimmed());
    println!();

    if sorted_specs.is_empty() {
        println!("{}", "No specs to display".yellow());
        return Ok(());
    }

    // Calculate max title length for alignment
    let max_title_len = sorted_specs
        .iter()
        .map(|(_, s)| s.title.len().min(30))
        .max()
        .unwrap_or(20);

    for (i, (_, spec)) in sorted_specs.iter().enumerate() {
        let order_num = format!("{:2}.", i + 1);

        // Status indicator
        let status_icon = spec.frontmatter.status_emoji();
        let status_bar = match spec.frontmatter.status {
            SpecStatus::Complete => "████████".green(),
            SpecStatus::InProgress => "████░░░░".yellow(),
            SpecStatus::Planned => "░░░░░░░░".blue(),
            SpecStatus::Draft => "░░░░░░░░".dimmed(),
            SpecStatus::Archived => "--------".dimmed(),
        };

        // Check if blocked
        let blocked_by: Vec<_> = spec
            .frontmatter
            .depends_on
            .iter()
            .filter(|dep| {
                specs
                    .iter()
                    .find(|s| &s.path == *dep)
                    .map(|s| s.frontmatter.status != SpecStatus::Complete)
                    .unwrap_or(false)
            })
            .collect();

        let blocked_indicator = if !blocked_by.is_empty() {
            format!(" {} blocked by {}", "⚠".red(), blocked_by.len())
        } else {
            String::new()
        };

        // Title (truncated)
        let title = if spec.title.len() > max_title_len {
            format!("{}...", &spec.title[..max_title_len - 3])
        } else {
            format!("{:width$}", spec.title, width = max_title_len)
        };

        println!(
            "{} {} {} │{}│{}",
            order_num.dimmed(),
            status_icon,
            title.cyan(),
            status_bar,
            blocked_indicator
        );

        // Show dependencies line if any
        if !spec.frontmatter.depends_on.is_empty() {
            let deps_str = spec
                .frontmatter
                .depends_on
                .iter()
                .map(|d: &String| {
                    // Extract number from dependency path
                    d.split('-').next().unwrap_or(d)
                })
                .collect::<Vec<_>>()
                .join(", ");
            println!("    {} deps: {}", "└".dimmed(), deps_str.dimmed());
        }
    }

    println!();
    println!("{}", "─".repeat(70).dimmed());

    // Legend
    println!();
    println!("{}", "Legend:".bold());
    println!(
        "  {} Complete  {} In Progress  {} Planned",
        "████████".green(),
        "████░░░░".yellow(),
        "░░░░░░░░".blue()
    );
    println!();

    // Summary
    let complete = sorted_specs
        .iter()
        .filter(|(_, s)| s.frontmatter.status == SpecStatus::Complete)
        .count();
    let in_progress = sorted_specs
        .iter()
        .filter(|(_, s)| s.frontmatter.status == SpecStatus::InProgress)
        .count();
    let planned = sorted_specs
        .iter()
        .filter(|(_, s)| s.frontmatter.status == SpecStatus::Planned)
        .count();
    let blocked: usize = sorted_specs
        .iter()
        .filter(|(_, s)| {
            s.frontmatter.depends_on.iter().any(|dep| {
                specs
                    .iter()
                    .find(|sp| &sp.path == dep)
                    .map(|sp| sp.frontmatter.status != SpecStatus::Complete)
                    .unwrap_or(false)
            })
        })
        .count();

    println!(
        "Summary: {} complete, {} in progress, {} planned, {} blocked",
        complete.to_string().green(),
        in_progress.to_string().yellow(),
        planned.to_string().blue(),
        blocked.to_string().red()
    );
    println!();

    Ok(())
}
