//! Archive command implementation
//!
//! Archives spec(s) by setting status to archived (no file move).

use colored::Colorize;
use leanspec_core::{SpecArchiver, SpecLoader, SpecStatus};
use std::error::Error;

pub fn run(specs_dir: &str, specs: &[String], dry_run: bool) -> Result<(), Box<dyn Error>> {
    if specs.is_empty() {
        return Err("At least one spec path is required".into());
    }

    let loader = SpecLoader::new(specs_dir);
    let archiver = SpecArchiver::new(specs_dir);

    // Collect all specs to archive with validation
    let mut specs_to_archive = Vec::new();
    let mut errors = Vec::new();

    for spec in specs {
        match loader.load_exact(spec) {
            Ok(Some(spec_info)) => {
                // Check if already archived by status
                if spec_info.frontmatter.status == SpecStatus::Archived {
                    errors.push(format!("Spec is already archived: {}", spec));
                    continue;
                }
                // Check if in archived/ folder (legacy)
                if spec_info.path.starts_with("archived/") {
                    errors.push(format!(
                        "Spec is already in archived/ folder: {}. Run 'lean-spec migrate-archived' first.",
                        spec
                    ));
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

    // Process each spec
    let mut archived_count = 0;

    if dry_run {
        println!();
        println!("{}", "Dry run - no changes will be made".yellow());
        println!();
    }

    for spec_info in specs_to_archive {
        if dry_run {
            println!("Would archive: {}", spec_info.path.cyan());
            println!(
                "  Status: {} → {}",
                spec_info.frontmatter.status.to_string().blue(),
                "archived".green()
            );
            println!();
            continue;
        }

        // Archive by setting status (no file move)
        match archiver.archive(&spec_info.path) {
            Ok(()) => {
                println!("{} Archived: {}", "✓".green(), spec_info.path.cyan());
                println!(
                    "  Status: {} → {}",
                    spec_info.frontmatter.status.to_string().dimmed(),
                    "archived".green()
                );
                println!();
                archived_count += 1;
            }
            Err(e) => {
                eprintln!("{} Failed to archive {}: {}", "✗".red(), spec_info.path, e);
            }
        }
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
