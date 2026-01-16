//! Update command implementation

use colored::Colorize;
use leanspec_core::{CompletionVerifier, FrontmatterParser, SpecLoader};
use std::collections::HashMap;
use std::error::Error;
use std::path::Path;

#[allow(clippy::too_many_arguments)]
pub fn run(
    specs_dir: &str,
    specs: &[String],
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
    add_tags: Option<String>,
    remove_tags: Option<String>,
    force: bool,
) -> Result<(), Box<dyn Error>> {
    if specs.is_empty() {
        return Err("At least one spec path is required".into());
    }

    if status.is_none()
        && priority.is_none()
        && assignee.is_none()
        && add_tags.is_none()
        && remove_tags.is_none()
    {
        println!("{}", "No updates specified".yellow());
        return Ok(());
    }

    let loader = SpecLoader::new(specs_dir);
    let parser = FrontmatterParser::new();
    let mut updated_count = 0;
    let mut errors = Vec::new();

    for spec in specs {
        let spec_info = match loader.load(spec) {
            Ok(Some(info)) => info,
            Ok(None) => {
                errors.push(format!("Spec not found: {}", spec));
                continue;
            }
            Err(e) => {
                errors.push(format!("Error loading spec {}: {}", spec, e));
                continue;
            }
        };

        // Check for completion verification if changing status to complete
        if let Some(new_status) = status.as_deref() {
            if new_status == "complete" && !force {
                let spec_path = Path::new(&spec_info.file_path)
                    .parent()
                    .ok_or("Invalid spec path")?;
                let verification = CompletionVerifier::verify_completion(spec_path)?;

                if !verification.is_complete {
                    println!(
                        "\n{} Spec has {} outstanding checklist items:\n",
                        "⚠️".yellow(),
                        verification.outstanding.len()
                    );

                    // Group by section
                    let mut by_section: HashMap<String, Vec<_>> = HashMap::new();
                    for item in &verification.outstanding {
                        let section = item.section.clone().unwrap_or_else(|| "Other".to_string());
                        by_section.entry(section).or_default().push(item);
                    }

                    for (section, items) in &by_section {
                        println!("  {} (line {})", section.bold(), items[0].line);
                        for item in items {
                            println!("    {} [ ] {}", "•".dimmed(), item.text);
                        }
                        println!();
                    }

                    println!(
                        "  {}: {}",
                        "Progress".dimmed(),
                        verification.progress.to_string().dimmed()
                    );
                    println!();
                    println!("{}", "Suggestions:".cyan());
                    for suggestion in &verification.suggestions {
                        println!("  • {}", suggestion);
                    }
                    println!();
                    println!("Use {} to mark complete anyway.", "--force".yellow());

                    errors.push(format!(
                        "{} has outstanding checklist items",
                        spec_info.path
                    ));
                    continue;
                }
            }
        }

        // Read current content
        let content = match std::fs::read_to_string(&spec_info.file_path) {
            Ok(c) => c,
            Err(e) => {
                errors.push(format!("Error reading {}: {}", spec_info.path, e));
                continue;
            }
        };

        // Build updates
        let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
        let mut fields_updated = Vec::new();

        if let Some(s) = status.as_ref() {
            updates.insert("status".to_string(), serde_yaml::Value::String(s.clone()));
            fields_updated.push(format!("status → {}", s));
        }

        if let Some(p) = priority.as_ref() {
            updates.insert("priority".to_string(), serde_yaml::Value::String(p.clone()));
            fields_updated.push(format!("priority → {}", p));
        }

        if let Some(a) = assignee.as_ref() {
            updates.insert("assignee".to_string(), serde_yaml::Value::String(a.clone()));
            fields_updated.push(format!("assignee → {}", a));
        }

        // Handle tag modifications
        if add_tags.is_some() || remove_tags.is_some() {
            let mut current_tags = spec_info.frontmatter.tags.clone();

            if let Some(tags_to_add) = add_tags.as_ref() {
                for tag in tags_to_add.split(',').map(|s| s.trim()) {
                    if !current_tags.contains(&tag.to_string()) {
                        current_tags.push(tag.to_string());
                        fields_updated.push(format!("+tag: {}", tag));
                    }
                }
            }

            if let Some(tags_to_remove) = remove_tags.as_ref() {
                for tag in tags_to_remove.split(',').map(|s| s.trim()) {
                    if let Some(pos) = current_tags.iter().position(|t| t == tag) {
                        current_tags.remove(pos);
                        fields_updated.push(format!("-tag: {}", tag));
                    }
                }
            }

            let tags_sequence: Vec<serde_yaml::Value> = current_tags
                .iter()
                .map(|t| serde_yaml::Value::String(t.clone()))
                .collect();
            updates.insert(
                "tags".to_string(),
                serde_yaml::Value::Sequence(tags_sequence),
            );
        }

        if updates.is_empty() {
            errors.push(format!("No updates specified for {}", spec_info.path));
            continue;
        }

        // Apply updates
        let new_content = match parser.update_frontmatter(&content, &updates) {
            Ok(c) => c,
            Err(e) => {
                errors.push(format!("Error updating {}: {}", spec_info.path, e));
                continue;
            }
        };

        // Write back
        if let Err(e) = std::fs::write(&spec_info.file_path, &new_content) {
            errors.push(format!("Error writing {}: {}", spec_info.path, e));
            continue;
        }

        println!("{} {}", "✓".green(), "Updated:".green());
        println!("  {}", spec_info.path);
        println!("  {}: {}", "Fields".bold(), fields_updated.join(", "));

        updated_count += 1;
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
        "{} Successfully updated {} spec(s), {} errors",
        "✓".green(),
        updated_count,
        errors.len()
    );

    if !errors.is_empty() {
        return Err(format!("Failed to update {} spec(s)", errors.len()).into());
    }

    Ok(())
}
