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
    hierarchy: bool,
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

fn print_hierarchy(specs: &[&SpecInfo]) {
    if specs.is_empty() {
        println!("{}", "No specs found".yellow());
        return;
    }

    let mut by_path: std::collections::HashMap<&str, &SpecInfo> = std::collections::HashMap::new();
    for spec in specs {
        by_path.insert(spec.path.as_str(), *spec);
    }

    let mut children_map: std::collections::HashMap<&str, Vec<&SpecInfo>> =
        std::collections::HashMap::new();
    for spec in specs {
        if let Some(parent) = spec.frontmatter.parent.as_deref() {
            children_map.entry(parent).or_default().push(*spec);
        }
    }

    for children in children_map.values_mut() {
        children.sort_by(|a, b| {
            a.number()
                .cmp(&b.number())
                .then_with(|| a.path.cmp(&b.path))
        });
    }

    let mut roots: Vec<&SpecInfo> = specs
        .iter()
        .filter(|s| {
            s.frontmatter.parent.is_none()
                || s.frontmatter
                    .parent
                    .as_deref()
                    .map(|p| !by_path.contains_key(p))
                    .unwrap_or(false)
        })
        .copied()
        .collect();

    roots.sort_by(|a, b| {
        a.number()
            .cmp(&b.number())
            .then_with(|| a.path.cmp(&b.path))
    });

    let mut visited = std::collections::HashSet::new();
    for (idx, root) in roots.iter().enumerate() {
        let is_last = idx == roots.len() - 1;
        print_tree(root, "", is_last, &children_map, &mut visited, specs);
    }

    println!();
    println!("{} specs found", specs.len().to_string().green().bold());
}

fn print_tree(
    spec: &SpecInfo,
    prefix: &str,
    is_last: bool,
    children_map: &std::collections::HashMap<&str, Vec<&SpecInfo>>,
    visited: &mut std::collections::HashSet<String>,
    all_specs: &[&SpecInfo],
) {
    let status_icon = spec.frontmatter.status_emoji();
    let branch = if is_last { "└──" } else { "├──" };
    let umbrella_icon = if is_umbrella(spec, all_specs) {
        "🌂 "
    } else {
        ""
    };
    println!(
        "{}{} {} {}{} - {}",
        prefix,
        branch,
        status_icon,
        umbrella_icon,
        spec.path.cyan(),
        spec.title
    );

    if !visited.insert(spec.path.clone()) {
        println!("{}    ⚠ circular reference", prefix);
        return;
    }

    if let Some(children) = children_map.get(spec.path.as_str()) {
        let next_prefix = if is_last {
            format!("{}    ", prefix)
        } else {
            format!("{}│   ", prefix)
        };

        for (idx, child) in children.iter().enumerate() {
            let last_child = idx == children.len() - 1;
            print_tree(
                child,
                &next_prefix,
                last_child,
                children_map,
                visited,
                all_specs,
            );
        }
    }
}

fn is_umbrella(spec: &SpecInfo, specs: &[&SpecInfo]) -> bool {
    specs
        .iter()
        .any(|s| s.frontmatter.parent.as_deref() == Some(spec.path.as_str()))
}
