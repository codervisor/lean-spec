//! Board command implementation

use colored::Colorize;
use leanspec_core::{SpecLoader, SpecPriority, SpecStatus};
use std::collections::HashMap;
use std::error::Error;

pub fn run(specs_dir: &str, group_by: &str, output_format: &str) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;

    if output_format == "json" {
        return print_json(&specs, group_by);
    }

    match group_by {
        "status" => print_by_status(&specs),
        "priority" => print_by_priority(&specs),
        "assignee" => print_by_assignee(&specs),
        "tag" => print_by_tag(&specs),
        "parent" => print_by_parent(&specs),
        _ => {
            return Err(format!(
                "Invalid group-by value: {}. Valid: status, priority, assignee, tag, parent",
                group_by
            )
            .into());
        }
    }

    Ok(())
}

fn print_json(specs: &[leanspec_core::SpecInfo], group_by: &str) -> Result<(), Box<dyn Error>> {
    #[derive(serde::Serialize)]
    struct BoardOutput {
        group_by: String,
        groups: Vec<GroupOutput>,
        total: usize,
    }

    #[derive(serde::Serialize)]
    struct GroupOutput {
        name: String,
        count: usize,
        specs: Vec<SpecBrief>,
    }

    #[derive(serde::Serialize)]
    struct SpecBrief {
        path: String,
        title: String,
        status: String,
    }

    let mut groups: HashMap<String, Vec<&leanspec_core::SpecInfo>> = HashMap::new();

    for spec in specs {
        let key = match group_by {
            "status" => spec.frontmatter.status.to_string(),
            "priority" => spec
                .frontmatter
                .priority
                .map(|p| p.to_string())
                .unwrap_or_else(|| "none".to_string()),
            "assignee" => spec
                .frontmatter
                .assignee
                .clone()
                .unwrap_or_else(|| "unassigned".to_string()),
            "tag" => {
                for tag in &spec.frontmatter.tags {
                    groups.entry(tag.clone()).or_default().push(spec);
                }
                continue;
            }
            "parent" => spec
                .frontmatter
                .parent
                .clone()
                .unwrap_or_else(|| "(no-parent)".to_string()),
            _ => "unknown".to_string(),
        };
        groups.entry(key).or_default().push(spec);
    }

    let output = BoardOutput {
        group_by: group_by.to_string(),
        total: specs.len(),
        groups: groups
            .into_iter()
            .map(|(name, group_specs)| GroupOutput {
                name,
                count: group_specs.len(),
                specs: group_specs
                    .iter()
                    .map(|s| SpecBrief {
                        path: s.path.clone(),
                        title: s.title.clone(),
                        status: s.frontmatter.status.to_string(),
                    })
                    .collect(),
            })
            .collect(),
    };

    println!("{}", serde_json::to_string_pretty(&output)?);
    Ok(())
}

fn print_by_status(specs: &[leanspec_core::SpecInfo]) {
    let statuses = [
        (SpecStatus::InProgress, "In Progress", "⏳"),
        (SpecStatus::Planned, "Planned", "📅"),
        (SpecStatus::Complete, "Complete", "✅"),
        (SpecStatus::Archived, "Archived", "📦"),
    ];

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", " PROJECT BOARD ".bold().cyan());
    println!("{}", "═".repeat(60).dimmed());

    for (status, label, emoji) in statuses {
        let group: Vec<_> = specs
            .iter()
            .filter(|s| s.frontmatter.status == status)
            .collect();

        if group.is_empty() {
            continue;
        }

        println!();
        println!("{} {} ({})", emoji, label.bold(), group.len());
        println!("{}", "─".repeat(40).dimmed());

        for spec in &group {
            let priority_indicator = match spec.frontmatter.priority {
                Some(SpecPriority::Critical) => "🔴",
                Some(SpecPriority::High) => "🟠",
                Some(SpecPriority::Medium) => "🟡",
                Some(SpecPriority::Low) => "🟢",
                None => "⚪",
            };

            println!(
                "  {} {} - {}",
                priority_indicator,
                spec.path.cyan(),
                spec.title.dimmed()
            );

            if let Some(assignee) = &spec.frontmatter.assignee {
                println!("      👤 {}", assignee.dimmed());
            }
        }
    }

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("Total: {} specs", specs.len().to_string().green());
}

fn print_by_priority(specs: &[leanspec_core::SpecInfo]) {
    let priorities = [
        (Some(SpecPriority::Critical), "Critical", "🔴"),
        (Some(SpecPriority::High), "High", "🟠"),
        (Some(SpecPriority::Medium), "Medium", "🟡"),
        (Some(SpecPriority::Low), "Low", "🟢"),
        (None, "No Priority", "⚪"),
    ];

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", " BY PRIORITY ".bold().cyan());
    println!("{}", "═".repeat(60).dimmed());

    for (priority, label, emoji) in priorities {
        let group: Vec<_> = specs
            .iter()
            .filter(|s| s.frontmatter.priority == priority)
            .collect();

        if group.is_empty() {
            continue;
        }

        println!();
        println!("{} {} ({})", emoji, label.bold(), group.len());
        println!("{}", "─".repeat(40).dimmed());

        for spec in &group {
            let status_emoji = spec.frontmatter.status_emoji();
            println!(
                "  {} {} - {}",
                status_emoji,
                spec.path.cyan(),
                spec.title.dimmed()
            );
        }
    }

    println!();
}

fn print_by_assignee(specs: &[leanspec_core::SpecInfo]) {
    let mut groups: HashMap<String, Vec<&leanspec_core::SpecInfo>> = HashMap::new();

    for spec in specs {
        let key = spec
            .frontmatter
            .assignee
            .clone()
            .unwrap_or_else(|| "Unassigned".to_string());
        groups.entry(key).or_default().push(spec);
    }

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", " BY ASSIGNEE ".bold().cyan());
    println!("{}", "═".repeat(60).dimmed());

    // Sort: Unassigned last
    let mut keys: Vec<_> = groups.keys().cloned().collect();
    keys.sort_by(|a, b| {
        if a == "Unassigned" {
            std::cmp::Ordering::Greater
        } else if b == "Unassigned" {
            std::cmp::Ordering::Less
        } else {
            a.cmp(b)
        }
    });

    for key in keys {
        let group = &groups[&key];

        println!();
        println!("👤 {} ({})", key.bold(), group.len());
        println!("{}", "─".repeat(40).dimmed());

        for spec in group {
            let status_emoji = spec.frontmatter.status_emoji();
            println!(
                "  {} {} - {}",
                status_emoji,
                spec.path.cyan(),
                spec.title.dimmed()
            );
        }
    }

    println!();
}

fn print_by_tag(specs: &[leanspec_core::SpecInfo]) {
    let mut groups: HashMap<String, Vec<&leanspec_core::SpecInfo>> = HashMap::new();

    for spec in specs {
        if spec.frontmatter.tags.is_empty() {
            groups.entry("No Tags".to_string()).or_default().push(spec);
        } else {
            for tag in &spec.frontmatter.tags {
                groups.entry(tag.clone()).or_default().push(spec);
            }
        }
    }

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", " BY TAG ".bold().cyan());
    println!("{}", "═".repeat(60).dimmed());

    // Sort by count descending
    let mut pairs: Vec<_> = groups.iter().collect();
    pairs.sort_by(|a, b| b.1.len().cmp(&a.1.len()));

    for (tag, group) in pairs {
        println!();
        println!("🏷️  {} ({})", tag.bold(), group.len());
        println!("{}", "─".repeat(40).dimmed());

        for spec in group.iter().take(10) {
            let status_emoji = spec.frontmatter.status_emoji();
            println!(
                "  {} {} - {}",
                status_emoji,
                spec.path.cyan(),
                spec.title.dimmed()
            );
        }

        if group.len() > 10 {
            println!("  ... and {} more", group.len() - 10);
        }
    }

    println!();
}

fn print_by_parent(specs: &[leanspec_core::SpecInfo]) {
    let mut groups: HashMap<String, Vec<&leanspec_core::SpecInfo>> = HashMap::new();
    let spec_map: HashMap<String, &leanspec_core::SpecInfo> =
        specs.iter().map(|s| (s.path.clone(), s)).collect();

    for spec in specs {
        let key = spec
            .frontmatter
            .parent
            .clone()
            .unwrap_or_else(|| "(no-parent)".to_string());
        groups.entry(key).or_default().push(spec);
    }

    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", " BY PARENT ".bold().cyan());
    println!("{}", "═".repeat(60).dimmed());

    let mut keys: Vec<_> = groups.keys().cloned().collect();
    keys.sort();

    for key in keys {
        let group = &groups[&key];

        let (label, icon) = if key == "(no-parent)" {
            ("No parent".to_string(), "📂")
        } else if let Some(parent) = spec_map.get(&key) {
            let umbrella_icon = if parent.frontmatter.is_umbrella.unwrap_or(false)
                || specs
                    .iter()
                    .any(|s| s.frontmatter.parent.as_deref() == Some(parent.path.as_str()))
            {
                "🌂"
            } else {
                "📁"
            };
            (format!("{} - {}", parent.path, parent.title), umbrella_icon)
        } else {
            (format!("Missing parent: {}", key), "⚠")
        };

        println!();
        println!("{} {} ({})", icon, label.bold(), group.len());
        println!("{}", "─".repeat(40).dimmed());

        for spec in group {
            let status_emoji = spec.frontmatter.status_emoji();
            println!("  {} {} - {}", status_emoji, spec.path.cyan(), spec.title.dimmed());
        }
    }

    println!();
}
