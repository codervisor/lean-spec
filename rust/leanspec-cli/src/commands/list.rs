//! List command implementation

use colored::Colorize;
use leanspec_core::{SpecFilterOptions, SpecInfo, SpecLoader, SpecPriority, SpecStatus};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    status: Option<String>,
    tags: Option<Vec<String>>,
    priority: Option<String>,
    assignee: Option<String>,
    compact: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;

    // Build filter
    let filter = SpecFilterOptions {
        status: status.map(|s| vec![s.parse().unwrap_or(SpecStatus::Planned)]),
        tags,
        priority: priority.map(|p| vec![p.parse().unwrap_or(SpecPriority::Medium)]),
        assignee,
        search: None,
    };

    let filtered: Vec<_> = specs.iter().filter(|s| filter.matches(s)).collect();

    if output_format == "json" {
        print_json(&filtered)?;
    } else if compact {
        print_compact(&filtered);
    } else {
        print_detailed(&filtered);
    }

    Ok(())
}

fn print_json(specs: &[&SpecInfo]) -> Result<(), Box<dyn Error>> {
    #[derive(serde::Serialize)]
    struct SpecOutput<'a> {
        path: &'a str,
        title: &'a str,
        status: String,
        priority: Option<String>,
        tags: &'a Vec<String>,
        assignee: &'a Option<String>,
    }

    let output: Vec<_> = specs
        .iter()
        .map(|s| SpecOutput {
            path: &s.path,
            title: &s.title,
            status: s.frontmatter.status.to_string(),
            priority: s.frontmatter.priority.map(|p| p.to_string()),
            tags: &s.frontmatter.tags,
            assignee: &s.frontmatter.assignee,
        })
        .collect();

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn print_compact(specs: &[&SpecInfo]) {
    for spec in specs {
        let status_icon = spec.frontmatter.status_emoji();
        println!("{} {} - {}", status_icon, spec.path.cyan(), spec.title);
    }

    println!("\n{} specs found", specs.len().to_string().green());
}

fn print_detailed(specs: &[&SpecInfo]) {
    if specs.is_empty() {
        println!("{}", "No specs found".yellow());
        return;
    }

    for spec in specs {
        let status_icon = spec.frontmatter.status_emoji();
        let status_color = match spec.frontmatter.status {
            SpecStatus::Planned => "blue",
            SpecStatus::InProgress => "yellow",
            SpecStatus::Complete => "green",
            SpecStatus::Archived => "white",
        };

        println!();
        println!("{} {}", spec.path.cyan().bold(), spec.title.bold());
        println!(
            "   {} {}",
            status_icon,
            format!("{:?}", spec.frontmatter.status).color(status_color)
        );

        if let Some(priority) = spec.frontmatter.priority {
            let priority_color = match priority {
                SpecPriority::Low => "white",
                SpecPriority::Medium => "cyan",
                SpecPriority::High => "yellow",
                SpecPriority::Critical => "red",
            };
            println!("   📊 {}", format!("{:?}", priority).color(priority_color));
        }

        if !spec.frontmatter.tags.is_empty() {
            println!("   🏷️  {}", spec.frontmatter.tags.join(", ").dimmed());
        }

        if let Some(assignee) = &spec.frontmatter.assignee {
            println!("   👤 {}", assignee);
        }

        if !spec.frontmatter.depends_on.is_empty() {
            println!(
                "   🔗 depends on: {}",
                spec.frontmatter.depends_on.join(", ").dimmed()
            );
        }
    }

    println!();
    println!("{} specs found", specs.len().to_string().green().bold());
}
