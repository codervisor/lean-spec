//! Link command implementation

use super::deprecation::warn_deprecated;
use colored::Colorize;
use leanspec_core::{FrontmatterParser, SpecLoader};
use std::collections::HashMap;
use std::error::Error;

pub fn run(specs_dir: &str, spec: &str, depends_on: &[String]) -> Result<(), Box<dyn Error>> {
    warn_deprecated("lean-spec link", "lean-spec rel add --depends-on");
    if depends_on.is_empty() {
        return Err("At least one dependency is required".into());
    }

    let loader = SpecLoader::new(specs_dir);

    // Load source spec
    let spec_info = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let mut errors = Vec::new();
    let mut added = Vec::new();
    let mut skipped = Vec::new();
    let mut depends_on_list = spec_info.frontmatter.depends_on.clone();

    for dep in depends_on {
        let target_spec = match loader.load(dep) {
            Ok(Some(info)) => info,
            Ok(None) => {
                errors.push(format!("Target spec not found: {}", dep));
                continue;
            }
            Err(e) => {
                errors.push(format!("Error loading target spec {}: {}", dep, e));
                continue;
            }
        };

        // Check for self-reference
        if spec_info.path == target_spec.path {
            errors.push("Cannot link a spec to itself".to_string());
            continue;
        }

        // Check if already linked
        if depends_on_list.contains(&target_spec.path) {
            skipped.push(target_spec.path.clone());
            continue;
        }

        depends_on_list.push(target_spec.path.clone());
        added.push(target_spec.path.clone());
    }

    if !added.is_empty() {
        // Read current content
        let content = std::fs::read_to_string(&spec_info.file_path)?;

        let tags_sequence: Vec<serde_yaml::Value> = depends_on_list
            .iter()
            .map(|t| serde_yaml::Value::String(t.clone()))
            .collect();

        let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
        updates.insert(
            "depends_on".to_string(),
            serde_yaml::Value::Sequence(tags_sequence),
        );

        // Apply updates
        let parser = FrontmatterParser::new();
        let new_content = parser.update_frontmatter(&content, &updates)?;

        // Write back
        std::fs::write(&spec_info.file_path, &new_content)?;

        for target in &added {
            println!(
                "{} Linked: {} → {}",
                "✓".green(),
                spec_info.path.cyan(),
                target.cyan()
            );
        }
    }

    for target in &skipped {
        println!(
            "{} {} already depends on {}",
            "ℹ️".cyan(),
            spec_info.path,
            target
        );
    }

    if !errors.is_empty() {
        println!();
        println!("{} Errors encountered:", "⚠️".yellow());
        for error in &errors {
            println!("  • {}", error);
        }
        println!();
    }

    println!(
        "{} Successfully linked {} dependency(ies), {} errors",
        "✓".green(),
        added.len(),
        errors.len()
    );

    if !errors.is_empty() {
        return Err(format!("Failed to link {} dependency(ies)", errors.len()).into());
    }

    Ok(())
}
