//! View command implementation

use colored::Colorize;
use leanspec_core::SpecLoader;
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: &str,
    raw: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);

    let spec_info = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let all_specs = loader.load_all()?;
    let children: Vec<&leanspec_core::SpecInfo> = all_specs
        .iter()
        .filter(|s| s.frontmatter.parent.as_deref() == Some(spec_info.path.as_str()))
        .collect();

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct SpecOutput {
            path: String,
            title: String,
            status: String,
            created: String,
            priority: Option<String>,
            tags: Vec<String>,
            depends_on: Vec<String>,
            assignee: Option<String>,
            parent: Option<String>,
            children: Vec<String>,
            is_umbrella: Option<bool>,
            content: String,
        }

        let output = SpecOutput {
            path: spec_info.path.clone(),
            title: spec_info.title.clone(),
            status: spec_info.frontmatter.status.to_string(),
            created: spec_info.frontmatter.created.clone(),
            priority: spec_info.frontmatter.priority.map(|p| p.to_string()),
            tags: spec_info.frontmatter.tags.clone(),
            depends_on: spec_info.frontmatter.depends_on.clone(),
            assignee: spec_info.frontmatter.assignee.clone(),
            parent: spec_info.frontmatter.parent.clone(),
            children: children.iter().map(|s| s.path.clone()).collect(),
            is_umbrella: spec_info.frontmatter.is_umbrella,
            content: spec_info.content.clone(),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    if raw {
        // Read and print raw file content
        let content = std::fs::read_to_string(&spec_info.file_path)?;
        println!("{}", content);
        return Ok(());
    }

    // Pretty print spec details
    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", spec_info.title.bold().cyan());
    println!("{}", "═".repeat(60).dimmed());
    println!();

    // Metadata
    println!(
        "{}: {} {}",
        "Status".bold(),
        spec_info.frontmatter.status_emoji(),
        spec_info.frontmatter.status_label()
    );

    println!("{}: {}", "Created".bold(), spec_info.frontmatter.created);

    if let Some(priority) = spec_info.frontmatter.priority {
        println!("{}: {:?}", "Priority".bold(), priority);
    }

    if !spec_info.frontmatter.tags.is_empty() {
        println!(
            "{}: {}",
            "Tags".bold(),
            spec_info.frontmatter.tags.join(", ")
        );
    }

    if let Some(assignee) = &spec_info.frontmatter.assignee {
        println!("{}: {}", "Assignee".bold(), assignee);
    }

    if let Some(parent) = &spec_info.frontmatter.parent {
        println!("{}: {}", "Parent".bold(), parent);
    }

    if !children.is_empty() {
        println!(
            "{}: {}",
            "Children".bold(),
            children
                .iter()
                .map(|s| s.path.clone())
                .collect::<Vec<_>>()
                .join(", ")
        );
    }

    if !spec_info.frontmatter.depends_on.is_empty() {
        println!(
            "{}: {}",
            "Depends on".bold(),
            spec_info.frontmatter.depends_on.join(", ")
        );
    }

    println!();
    println!("{}", "─".repeat(60).dimmed());
    println!();

    // Content (first 50 lines or so)
    let lines: Vec<_> = spec_info.content.lines().take(50).collect();
    for line in &lines {
        println!("{}", line);
    }

    if spec_info.content.lines().count() > 50 {
        println!();
        println!("{}", "... (truncated, use --raw for full content)".dimmed());
    }

    println!();
    println!("{}", "─".repeat(60).dimmed());
    println!("{}: {}", "File".dimmed(), spec_info.file_path.display());

    Ok(())
}
