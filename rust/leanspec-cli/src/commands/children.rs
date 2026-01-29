//! Children command implementation

use colored::Colorize;
use leanspec_core::{SpecInfo, SpecLoader};
use std::error::Error;

pub fn run(specs_dir: &str, spec: &str, output_format: &str) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let parent_spec = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let all_specs = loader.load_all()?;
    let children: Vec<&SpecInfo> = all_specs
        .iter()
        .filter(|s| s.frontmatter.parent.as_deref() == Some(parent_spec.path.as_str()))
        .collect();

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct ChildOutput<'a> {
            path: &'a str,
            title: &'a str,
            status: String,
        }

        #[derive(serde::Serialize)]
        struct Output<'a> {
            parent: &'a str,
            title: &'a str,
            count: usize,
            children: Vec<ChildOutput<'a>>,
        }

        let output = Output {
            parent: &parent_spec.path,
            title: &parent_spec.title,
            count: children.len(),
            children: children
                .iter()
                .map(|s| ChildOutput {
                    path: &s.path,
                    title: &s.title,
                    status: s.frontmatter.status.to_string(),
                })
                .collect(),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    println!();
    println!(
        "{} {}",
        "Children of".bold(),
        parent_spec.path.cyan().bold()
    );
    println!("{}", "─".repeat(40).dimmed());

    if children.is_empty() {
        println!("{}", "No child specs found".yellow());
        return Ok(());
    }

    for child in &children {
        let status_icon = child.frontmatter.status_emoji();
        println!("  {} {} - {}", status_icon, child.path.cyan(), child.title);
    }

    println!();
    println!("{} child spec(s)", children.len().to_string().green());
    Ok(())
}
