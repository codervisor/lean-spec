//! List command implementation

use colored::Colorize;
use leanspec_core::{SpecFilterOptions, SpecInfo, SpecLoader, SpecPriority, SpecStatus};
use std::error::Error;

pub struct ListParams {
    pub specs_dir: String,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub compact: bool,
    pub hierarchy: bool,
    pub output_format: String,
}

pub fn run(params: ListParams) -> Result<(), Box<dyn Error>> {
    let specs_dir = &params.specs_dir;
    let status = params.status;
    let tags = params.tags;
    let priority = params.priority;
    let assignee = params.assignee;
    let compact = params.compact;
    let hierarchy = params.hierarchy;
    let output_format = &params.output_format;
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;

    // Build filter (exclude archived by default)
    let status_filter = status
        .map(|s| vec![s.parse().unwrap_or(SpecStatus::Planned)])
        .unwrap_or_else(|| {
            vec![
                SpecStatus::Draft,
                SpecStatus::Planned,
                SpecStatus::InProgress,
                SpecStatus::Complete,
            ]
        });
    let filter = SpecFilterOptions {
        status: Some(status_filter),
        tags,
        priority: priority.map(|p| vec![p.parse().unwrap_or(SpecPriority::Medium)]),
        assignee,
        search: None,
    };

    let filtered: Vec<_> = specs.iter().filter(|s| filter.matches(s)).collect();

    if output_format == "json" {
        print_json(&filtered)?;
    } else if hierarchy {
        print_hierarchy(&filtered);
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
        parent: &'a Option<String>,
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
            parent: &s.frontmatter.parent,
        })
        .collect();

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn print_compact(specs: &[&SpecInfo]) {
    for spec in specs {
        let status_icon = spec.frontmatter.status_emoji();
        let umbrella_icon = if is_umbrella(spec, specs) {
            "🌂 "
        } else {
            ""
        };
        println!(
            "{} {}{} - {}",
            status_icon,
            umbrella_icon,
            spec.path.cyan(),
            spec.title
        );
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
            SpecStatus::Draft => "cyan",
            SpecStatus::Planned => "blue",
            SpecStatus::InProgress => "yellow",
            SpecStatus::Complete => "green",
            SpecStatus::Archived => "white",
        };

        let umbrella_icon = if is_umbrella(spec, specs) {
            "🌂 "
        } else {
            ""
        };
        println!();
        println!(
            "{} {}{}",
            spec.path.cyan().bold(),
            umbrella_icon,
            spec.title.bold()
        );
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

        if let Some(parent) = &spec.frontmatter.parent {
            println!("   🧭 parent: {}", parent.dimmed());
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

fn is_umbrella(spec: &SpecInfo, specs: &[&SpecInfo]) -> bool {
    specs
        .iter()
        .any(|s| s.frontmatter.parent.as_deref() == Some(spec.path.as_str()))
}

fn print_hierarchy(specs: &[&SpecInfo]) {
    if specs.is_empty() {
        println!("{}", "No specs found".yellow());
        return;
    }

    let mut by_path: std::collections::HashMap<String, &SpecInfo> =
        std::collections::HashMap::new();
    let mut children_by_parent: std::collections::HashMap<String, Vec<&SpecInfo>> =
        std::collections::HashMap::new();

    for spec in specs {
        by_path.insert(spec.path.clone(), *spec);
    }

    for spec in specs {
        if let Some(parent) = &spec.frontmatter.parent {
            children_by_parent
                .entry(parent.clone())
                .or_default()
                .push(*spec);
        }
    }

    let mut roots: Vec<&SpecInfo> = specs
        .iter()
        .copied()
        .filter(|s| match &s.frontmatter.parent {
            None => true,
            Some(parent) => !by_path.contains_key(parent),
        })
        .collect();
    roots.sort_by(|a, b| a.path.cmp(&b.path));

    let mut visited = std::collections::HashSet::new();
    for root in roots {
        print_hierarchy_node(root, 0, &children_by_parent, &mut visited);
    }

    println!("\n{} specs found", specs.len().to_string().green());
}

fn print_hierarchy_node(
    spec: &SpecInfo,
    depth: usize,
    children_by_parent: &std::collections::HashMap<String, Vec<&SpecInfo>>,
    visited: &mut std::collections::HashSet<String>,
) {
    if !visited.insert(spec.path.clone()) {
        return;
    }

    let indent = "  ".repeat(depth);
    println!(
        "{}{} {} - {}",
        indent,
        spec.frontmatter.status_emoji(),
        spec.path.cyan(),
        spec.title
    );

    if let Some(children) = children_by_parent.get(&spec.path) {
        let mut sorted = children.clone();
        sorted.sort_by(|a, b| a.path.cmp(&b.path));
        for child in sorted {
            print_hierarchy_node(child, depth + 1, children_by_parent, visited);
        }
    }
}
