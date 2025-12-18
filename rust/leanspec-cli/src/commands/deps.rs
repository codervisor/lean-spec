//! Deps command implementation

use colored::Colorize;
use leanspec_core::{DependencyGraph, SpecLoader};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: &str,
    depth: usize,
    upstream_only: bool,
    downstream_only: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let all_specs = loader.load_all()?;

    let spec_info = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let graph = DependencyGraph::new(&all_specs);

    let complete = graph
        .get_complete_graph(&spec_info.path)
        .ok_or_else(|| format!("Spec not found in graph: {}", spec_info.path))?;

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct DepsOutput {
            spec: String,
            depends_on: Vec<DepInfo>,
            required_by: Vec<DepInfo>,
            has_circular: bool,
        }

        #[derive(serde::Serialize)]
        struct DepInfo {
            path: String,
            title: String,
            status: String,
        }

        let to_dep_info = |s: &leanspec_core::SpecInfo| DepInfo {
            path: s.path.clone(),
            title: s.title.clone(),
            status: s.frontmatter.status.to_string(),
        };

        let output = DepsOutput {
            spec: spec_info.path.clone(),
            depends_on: if downstream_only {
                Vec::new()
            } else {
                graph
                    .get_upstream(&spec_info.path, depth)
                    .iter()
                    .map(to_dep_info)
                    .collect()
            },
            required_by: if upstream_only {
                Vec::new()
            } else {
                graph
                    .get_downstream(&spec_info.path, depth)
                    .iter()
                    .map(to_dep_info)
                    .collect()
            },
            has_circular: graph.has_circular_dependency(&spec_info.path),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    // Text output
    println!();
    println!("{} {}", "📦".bold(), spec_info.path.cyan().bold());
    println!("   {}", spec_info.title.dimmed());
    println!();

    // Check for circular dependencies
    if graph.has_circular_dependency(&spec_info.path) {
        println!("{} Circular dependency detected!", "⚠️".yellow());
        println!();
    }

    // Show upstream (depends on)
    if !downstream_only {
        let upstream = graph.get_upstream(&spec_info.path, depth);

        println!(
            "{} {} (what this spec needs)",
            "⬆️".bold(),
            "Depends On".bold()
        );

        if upstream.is_empty() && complete.depends_on.is_empty() {
            println!("   {}", "(none)".dimmed());
        } else {
            // Show direct dependencies first
            for dep in &complete.depends_on {
                let status_emoji = dep.frontmatter.status_emoji();
                println!(
                    "   {} {} - {}",
                    status_emoji,
                    dep.path.cyan(),
                    dep.title.dimmed()
                );
            }

            // Show transitive dependencies if depth > 1
            if depth > 1 && upstream.len() > complete.depends_on.len() {
                println!("   {}", "... (transitive)".dimmed());
                for dep in &upstream {
                    if !complete.depends_on.iter().any(|d| d.path == dep.path) {
                        let status_emoji = dep.frontmatter.status_emoji();
                        println!(
                            "     {} {} - {}",
                            status_emoji,
                            dep.path,
                            dep.title.dimmed()
                        );
                    }
                }
            }
        }

        println!();
    }

    // Show downstream (required by)
    if !upstream_only {
        let downstream = graph.get_downstream(&spec_info.path, depth);

        println!(
            "{} {} (what needs this spec)",
            "⬇️".bold(),
            "Required By".bold()
        );

        if downstream.is_empty() && complete.required_by.is_empty() {
            println!("   {}", "(none)".dimmed());
        } else {
            // Show direct dependents first
            for dep in &complete.required_by {
                let status_emoji = dep.frontmatter.status_emoji();
                println!(
                    "   {} {} - {}",
                    status_emoji,
                    dep.path.cyan(),
                    dep.title.dimmed()
                );
            }

            // Show transitive dependents if depth > 1
            if depth > 1 && downstream.len() > complete.required_by.len() {
                println!("   {}", "... (transitive)".dimmed());
                for dep in &downstream {
                    if !complete.required_by.iter().any(|d| d.path == dep.path) {
                        let status_emoji = dep.frontmatter.status_emoji();
                        println!(
                            "     {} {} - {}",
                            status_emoji,
                            dep.path,
                            dep.title.dimmed()
                        );
                    }
                }
            }
        }

        println!();
    }

    Ok(())
}
