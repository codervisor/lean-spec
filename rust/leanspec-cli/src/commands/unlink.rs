//! Unlink command implementation

use colored::Colorize;
use leanspec_core::{SpecLoader, FrontmatterParser};
use std::collections::HashMap;
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: &str,
    depends_on: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    
    // Load source spec
    let spec_info = loader.load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;
    
    // Find target in depends_on (support partial matching)
    let target_path = spec_info.frontmatter.depends_on.iter()
        .find(|d| d.contains(depends_on) || depends_on.contains(d.as_str()))
        .cloned();
    
    let target_path = target_path.ok_or_else(|| {
        format!("{} does not depend on {}", spec_info.path, depends_on)
    })?;
    
    // Read current content
    let content = std::fs::read_to_string(&spec_info.file_path)?;
    
    // Remove dependency
    let depends_on_list: Vec<_> = spec_info.frontmatter.depends_on.iter()
        .filter(|d| *d != &target_path)
        .cloned()
        .collect();
    
    let tags_sequence: Vec<serde_yaml::Value> = depends_on_list
        .iter()
        .map(|t| serde_yaml::Value::String(t.clone()))
        .collect();
    
    let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
    updates.insert("depends_on".to_string(), serde_yaml::Value::Sequence(tags_sequence));
    
    // Apply updates
    let parser = FrontmatterParser::new();
    let new_content = parser.update_frontmatter(&content, &updates)?;
    
    // Write back
    std::fs::write(&spec_info.file_path, &new_content)?;
    
    println!("{} Unlinked: {} ✗ {}", 
        "✓".green(),
        spec_info.path.cyan(),
        target_path.cyan()
    );
    
    Ok(())
}
