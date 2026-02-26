//! Children command implementation

use colored::Colorize;
use leanspec_core::SpecLoader;
use std::error::Error;

pub fn run(specs_dir: &str, spec: &str, output_format: &str) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let parent = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let all_specs = loader.load_all()?;
    let children: Vec<_> = all_specs
        .iter()
        .filter(|s| s.frontmatter.parent.as_deref() == Some(parent.path.as_str()))
        .collect();

    if output_format == "json" {
        let output = serde_json::json!({
            "parent": {
                "path": parent.path,
                "title": parent.title,
                "status": parent.frontmatter.status.to_string(),
            },
            "children": children.iter().map(|s| {
                serde_json::json!({
                    "path": s.path,
                    "title": s.title,
                    "status": s.frontmatter.status.to_string(),
                })
            }).collect::<Vec<_>>(),
            "count": children.len(),
        });
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    println!("\n{} {}", "Parent:".bold(), parent.path.cyan());

    if children.is_empty() {
        println!("{}", "No child specs found".yellow());
        return Ok(());
    }

    println!("{}", "Children:".bold());
    for child in children {
        println!(
            "  {} {} - {}",
            child.frontmatter.status_emoji(),
            child.path.cyan(),
            child.title
        );
    }

    Ok(())
}
