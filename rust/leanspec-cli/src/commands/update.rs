//! Update command implementation

use colored::Colorize;
use leanspec_core::{SpecLoader, FrontmatterParser};
use std::collections::HashMap;
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: &str,
    status: Option<String>,
    priority: Option<String>,
    assignee: Option<String>,
    add_tags: Option<String>,
    remove_tags: Option<String>,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    
    let spec_info = loader.load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;
    
    // Read current content
    let content = std::fs::read_to_string(&spec_info.file_path)?;
    
    // Build updates
    let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
    let mut fields_updated = Vec::new();
    
    if let Some(s) = status {
        updates.insert("status".to_string(), serde_yaml::Value::String(s.clone()));
        fields_updated.push(format!("status → {}", s));
    }
    
    if let Some(p) = priority {
        updates.insert("priority".to_string(), serde_yaml::Value::String(p.clone()));
        fields_updated.push(format!("priority → {}", p));
    }
    
    if let Some(a) = assignee {
        updates.insert("assignee".to_string(), serde_yaml::Value::String(a.clone()));
        fields_updated.push(format!("assignee → {}", a));
    }
    
    // Handle tag modifications
    if add_tags.is_some() || remove_tags.is_some() {
        let mut current_tags = spec_info.frontmatter.tags.clone();
        
        if let Some(tags_to_add) = add_tags {
            for tag in tags_to_add.split(',').map(|s| s.trim()) {
                if !current_tags.contains(&tag.to_string()) {
                    current_tags.push(tag.to_string());
                    fields_updated.push(format!("+tag: {}", tag));
                }
            }
        }
        
        if let Some(tags_to_remove) = remove_tags {
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
        updates.insert("tags".to_string(), serde_yaml::Value::Sequence(tags_sequence));
    }
    
    if updates.is_empty() {
        println!("{}", "No updates specified".yellow());
        return Ok(());
    }
    
    // Apply updates
    let parser = FrontmatterParser::new();
    let new_content = parser.update_frontmatter(&content, &updates)?;
    
    // Write back
    std::fs::write(&spec_info.file_path, &new_content)?;
    
    println!("{} {}", "✓".green(), "Updated:".green());
    println!("  {}", spec_info.path);
    println!("  {}: {}", "Fields".bold(), fields_updated.join(", "));
    
    Ok(())
}
