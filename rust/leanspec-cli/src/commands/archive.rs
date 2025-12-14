//! Archive command implementation
//!
//! Moves a spec to the archived/ directory.

use colored::Colorize;
use leanspec_core::{SpecLoader, FrontmatterParser};
use std::collections::HashMap;
use std::error::Error;
use std::fs;
use std::path::Path;

pub fn run(
    specs_dir: &str,
    spec: &str,
    dry_run: bool,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    
    let spec_info = loader.load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;
    
    // Check if already archived
    if spec_info.path.starts_with("archived/") {
        return Err("Spec is already archived".into());
    }
    
    let specs_path = Path::new(specs_dir);
    let archived_dir = specs_path.join("archived");
    
    // Ensure archived directory exists
    if !dry_run && !archived_dir.exists() {
        fs::create_dir_all(&archived_dir)?;
    }
    
    // Get the spec directory
    let spec_dir = spec_info.file_path.parent()
        .ok_or("Invalid spec path")?;
    let spec_dir_name = spec_dir.file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid spec directory name")?;
    
    let target_dir = archived_dir.join(spec_dir_name);
    
    if dry_run {
        println!();
        println!("{}", "Dry run - no changes will be made".yellow());
        println!();
        println!("Would archive: {}", spec_info.path.cyan());
        println!("From: {}", spec_dir.display());
        println!("To: {}", target_dir.display());
        println!();
        
        // Show what status change would be made
        println!("Would update status: {} → {}", 
            spec_info.frontmatter.status.to_string().blue(),
            "archived".green()
        );
        
        return Ok(());
    }
    
    // Check if target already exists
    if target_dir.exists() {
        return Err(format!("Target already exists: {}", target_dir.display()).into());
    }
    
    // Update status to archived in the file
    let content = fs::read_to_string(&spec_info.file_path)?;
    let parser = FrontmatterParser::new();
    
    let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
    updates.insert("status".to_string(), serde_yaml::Value::String("archived".to_string()));
    
    let updated_content = parser.update_frontmatter(&content, &updates)?;
    fs::write(&spec_info.file_path, &updated_content)?;
    
    // Move the directory
    fs::rename(spec_dir, &target_dir)?;
    
    println!();
    println!("{} Archived: {}", "✓".green(), spec_info.path.cyan());
    println!("  From: {}", spec_dir.display().to_string().dimmed());
    println!("  To: {}", target_dir.display().to_string().dimmed());
    println!();
    println!("Status updated to: {}", "archived".green());
    
    Ok(())
}
