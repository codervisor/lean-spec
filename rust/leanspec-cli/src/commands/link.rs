//! Link command implementation

use colored::Colorize;
use leanspec_core::{FrontmatterParser, SpecLoader};
use std::collections::HashMap;
use std::error::Error;

pub fn run(specs_dir: &str, spec: &str, depends_on: &str) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);

    // Load source spec
    let spec_info = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    // Verify target spec exists
    let target_spec = loader
        .load(depends_on)?
        .ok_or_else(|| format!("Target spec not found: {}", depends_on))?;

    // Check if already linked
    if spec_info.frontmatter.depends_on.contains(&target_spec.path) {
        println!(
            "{} {} already depends on {}",
            "ℹ️".cyan(),
            spec_info.path,
            target_spec.path
        );
        return Ok(());
    }

    // Check for self-reference
    if spec_info.path == target_spec.path {
        return Err("Cannot link a spec to itself".into());
    }

    // Read current content
    let content = std::fs::read_to_string(&spec_info.file_path)?;

    // Add dependency
    let mut depends_on_list = spec_info.frontmatter.depends_on.clone();
    depends_on_list.push(target_spec.path.clone());

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

    println!(
        "{} Linked: {} → {}",
        "✓".green(),
        spec_info.path.cyan(),
        target_spec.path.cyan()
    );

    Ok(())
}
