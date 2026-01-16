//! Archive command implementation
//!
//! Moves spec(s) to the archived/ directory.

use colored::Colorize;
use leanspec_core::{FrontmatterParser, SpecLoader};
use std::collections::HashMap;
use std::error::Error;
use std::fs;
use std::path::Path;

pub fn run(specs_dir: &str, specs: &[String], dry_run: bool) -> Result<(), Box<dyn Error>> {
    if specs.is_empty() {
        return Err("At least one spec path is required".into());
    }

    let loader = SpecLoader::new(specs_dir);
    let specs_path = Path::new(specs_dir);
    let archived_dir = specs_path.join("archived");

    // Collect all specs to archive with validation
    let mut specs_to_archive = Vec::new();
    let mut errors = Vec::new();

    for spec in specs {
        match loader.load_exact(spec) {
            Ok(Some(spec_info)) => {
                // Check if already archived
                if spec_info.path.starts_with("archived/") {
                    errors.push(format!("Spec is already archived: {}", spec));
                    continue;
                }
                specs_to_archive.push(spec_info);
            }
            Ok(None) => {
                errors.push(format!("Spec not found: {}", spec));
            }
            Err(e) => {
                errors.push(format!("Error loading spec {}: {}", spec, e));
            }
        }
    }

    // Report errors
    if !errors.is_empty() {
        println!();
        println!("{} Errors encountered:", "⚠️".yellow());
        for error in &errors {
            println!("  • {}", error);
        }
        println!();
    }

    if specs_to_archive.is_empty() {
        return Err("No valid specs to archive".into());
    }

    // Ensure archived directory exists
    if !dry_run && !archived_dir.exists() {
        fs::create_dir_all(&archived_dir)?;
    }

    // Process each spec
    let parser = FrontmatterParser::new();
    let mut archived_count = 0;

    if dry_run {
        println!();
        println!("{}", "Dry run - no changes will be made".yellow());
        println!();
    }

    for spec_info in specs_to_archive {
        // Get the spec directory
        let spec_dir = spec_info.file_path.parent().ok_or("Invalid spec path")?;
        let spec_dir_name = spec_dir
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid spec directory name")?;

        let target_dir = archived_dir.join(spec_dir_name);

        if dry_run {
            println!("Would archive: {}", spec_info.path.cyan());
            println!("  From: {}", spec_dir.display().to_string().dimmed());
            println!("  To: {}", target_dir.display().to_string().dimmed());
            println!(
                "  Status: {} → {}",
                spec_info.frontmatter.status.to_string().blue(),
                "archived".green()
            );
            println!();
            continue;
        }

        // Check if target already exists
        if target_dir.exists() {
            eprintln!(
                "{} Target already exists for {}: {}",
                "⚠️".yellow(),
                spec_info.path,
                target_dir.display()
            );
            continue;
        }

        // Move the directory first to avoid race condition
        fs::rename(spec_dir, &target_dir)?;

        // Now update status to archived in the file at the new location
        let new_file_path = target_dir.join("README.md");
        let content = fs::read_to_string(&new_file_path)?;

        let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
        updates.insert(
            "status".to_string(),
            serde_yaml::Value::String("archived".to_string()),
        );

        let updated_content = parser.update_frontmatter(&content, &updates)?;
        fs::write(&new_file_path, &updated_content)?;

        println!("{} Archived: {}", "✓".green(), spec_info.path.cyan());
        println!("  From: {}", spec_dir.display().to_string().dimmed());
        println!("  To: {}", target_dir.display().to_string().dimmed());
        println!();

        archived_count += 1;
    }

    if !dry_run {
        println!(
            "{} Successfully archived {} spec(s)",
            "✓".green(),
            archived_count
        );
    }

    // Return error if there were any errors during processing
    if !errors.is_empty() {
        return Err(format!("Failed to archive {} spec(s)", errors.len()).into());
    }

    Ok(())
}
