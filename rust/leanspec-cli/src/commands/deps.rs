//! Deps command implementation

use colored::Colorize;
use leanspec_core::{DependencyGraph, SpecLoader};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: &str,
    depth: usize,
    upstream: bool,
    downstream: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let root = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let all_specs = loader.load_all()?;
    let graph = DependencyGraph::new(&all_specs);

    let upstream_specs = if downstream {
        Vec::new()
    } else {
        graph.get_upstream(&root.path, depth)
    };

    let downstream_specs = if upstream {
        Vec::new()
    } else {
        graph.get_downstream(&root.path, depth)
    };

    if output_format == "json" {
        let output = serde_json::json!({
            "spec": {
                "path": root.path,
                "title": root.title,
                "status": root.frontmatter.status.to_string(),
            },
            "depth": depth,
            "upstream": upstream_specs.iter().map(|s| {
                serde_json::json!({
                    "path": s.path,
                    "title": s.title,
                    "status": s.frontmatter.status.to_string(),
                })
            }).collect::<Vec<_>>(),
            "downstream": downstream_specs.iter().map(|s| {
                serde_json::json!({
                    "path": s.path,
                    "title": s.title,
                    "status": s.frontmatter.status.to_string(),
                })
            }).collect::<Vec<_>>(),
        });
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    println!("\n{} {}", "Dependency graph for".bold(), root.path.cyan());

    if !downstream {
        if upstream_specs.is_empty() {
            println!("{}", "Upstream: (none)".dimmed());
        } else {
            println!("{}", "Upstream:".bold());
            for s in upstream_specs {
                println!(
                    "  {} {} - {}",
                    s.frontmatter.status_emoji(),
                    s.path.cyan(),
                    s.title
                );
            }
        }
    }

    if !upstream {
        if downstream_specs.is_empty() {
            println!("{}", "Downstream: (none)".dimmed());
        } else {
            println!("{}", "Downstream:".bold());
            for s in downstream_specs {
                println!(
                    "  {} {} - {}",
                    s.frontmatter.status_emoji(),
                    s.path.cyan(),
                    s.title
                );
            }
        }
    }

    Ok(())
}
