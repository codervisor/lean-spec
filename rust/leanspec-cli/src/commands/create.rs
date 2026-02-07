//! Create command implementation

use chrono::Utc;
use colored::Colorize;
use leanspec_core::types::LeanSpecConfig;
use leanspec_core::utils::TemplateLoader;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

pub fn run(
    specs_dir: &str,
    name: &str,
    title: Option<String>,
    template: Option<String>,
    status: &str,
    priority: &str,
    tags: Option<String>,
) -> Result<(), Box<dyn Error>> {
    // 1. Find project root and load config
    let project_root = find_project_root(specs_dir)?;
    let config = load_config(&project_root)?;

    // 2. Load template from filesystem
    let template_loader = TemplateLoader::with_config(&project_root, config);
    let template_content = template_loader
        .load(template.as_deref())
        .map_err(|e| format!("Failed to load template: {}", e))?;
    // 3. Generate spec details
    let next_number = get_next_spec_number(specs_dir)?;
    let spec_name = format!("{:03}-{}", next_number, name);
    let spec_dir = Path::new(specs_dir).join(&spec_name);

    if spec_dir.exists() {
        return Err(format!("Spec directory already exists: {}", spec_dir.display()).into());
    }

    fs::create_dir_all(&spec_dir)?;

    // 4. Generate title and parse tags
    let title = title.unwrap_or_else(|| generate_title(name));
    let tags_vec: Vec<String> = parse_tags(tags);

    // 5. Apply variable substitution
    let content = apply_variables(&template_content, &title, status, priority, &tags_vec)?;

    // 6. Write file
    let readme_path = spec_dir.join("README.md");
    fs::write(&readme_path, &content)?;

    // 7. Output success message
    print_success(
        &spec_name,
        &title,
        status,
        priority,
        &tags_vec,
        &readme_path,
    );

    Ok(())
}

fn get_next_spec_number(specs_dir: &str) -> Result<u32, Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);

    if !specs_path.exists() {
        return Ok(1);
    }

    let mut max_number = 0u32;

    for entry in fs::read_dir(specs_path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            // Parse number from start of directory name
            if let Some(num_str) = name_str.split('-').next() {
                if let Ok(num) = num_str.parse::<u32>() {
                    max_number = max_number.max(num);
                }
            }
        }
    }

    Ok(max_number + 1)
}

fn find_project_root(specs_dir: &str) -> Result<PathBuf, Box<dyn Error>> {
    // Walk up from specs_dir to find .lean-spec/
    let specs_path = Path::new(specs_dir).canonicalize().unwrap_or_else(|_| {
        // If specs_dir doesn't exist yet, use current dir
        std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
    });
    let mut current = Some(specs_path.as_path());

    while let Some(path) = current {
        if path.join(".lean-spec").exists() {
            return Ok(path.to_path_buf());
        }
        current = path.parent();
    }

    Err("Could not find .lean-spec directory. Run 'lean-spec init' first.".into())
}

fn load_config(project_root: &Path) -> Result<LeanSpecConfig, Box<dyn Error>> {
    // Try to load config.yaml first (new format)
    let yaml_path = project_root.join(".lean-spec/config.yaml");
    if yaml_path.exists() {
        let content = fs::read_to_string(&yaml_path)?;
        return Ok(serde_yaml::from_str(&content)?);
    }

    // Try config.json (legacy format) - parse as JSON and convert
    let json_path = project_root.join(".lean-spec/config.json");
    if json_path.exists() {
        let content = fs::read_to_string(&json_path)?;
        let json_value: serde_json::Value = serde_json::from_str(&content)?;

        // Extract default_template from legacy format
        let default_template = json_value
            .get("templates")
            .and_then(|t| t.get("default"))
            .and_then(|d| d.as_str())
            .or_else(|| json_value.get("template").and_then(|t| t.as_str()))
            .map(String::from);

        // Create LeanSpecConfig with extracted values
        return Ok(LeanSpecConfig {
            default_template,
            ..Default::default()
        });
    }

    // No config found, use defaults
    Ok(LeanSpecConfig::default())
}

fn apply_variables(
    template: &str,
    title: &str,
    status: &str,
    priority: &str,
    tags: &[String],
) -> Result<String, Box<dyn Error>> {
    let now = Utc::now();
    let created_date = now.format("%Y-%m-%d").to_string();
    let created_at = now.to_rfc3339();

    let mut content = template.to_string();

    // Replace template variables
    content = content.replace("{name}", title);
    content = content.replace("{title}", title);
    content = content.replace("{date}", &created_date);
    content = content.replace("{status}", status);
    content = content.replace("{priority}", priority);

    // Handle frontmatter replacements
    content = content.replace("status: planned", &format!("status: {}", status));
    content = content.replace("priority: medium", &format!("priority: {}", priority));

    // Replace tags in frontmatter
    if !tags.is_empty() {
        let tags_yaml = tags
            .iter()
            .map(|t| format!("  - {}", t))
            .collect::<Vec<_>>()
            .join("\n");
        content = content.replace("tags: []", &format!("tags:\n{}", tags_yaml));
    }

    // Add created_at timestamp to frontmatter
    let frontmatter_end = content.find("---\n\n").ok_or("Invalid template format")?;
    content.insert_str(frontmatter_end, &format!("created_at: '{}'\n", created_at));

    Ok(content)
}

fn generate_title(name: &str) -> String {
    name.split('-')
        .map(|w| {
            let mut chars = w.chars();
            match chars.next() {
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
                None => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn parse_tags(tags: Option<String>) -> Vec<String> {
    tags.map(|t| t.split(',').map(|s| s.trim().to_string()).collect())
        .unwrap_or_default()
}

fn print_success(
    spec_name: &str,
    title: &str,
    status: &str,
    priority: &str,
    tags: &[String],
    readme_path: &Path,
) {
    println!("{} {}", "✓".green(), "Created spec:".green());
    println!("  {}: {}", "Path".bold(), spec_name);
    println!("  {}: {}", "Title".bold(), title);
    println!("  {}: {}", "Status".bold(), status);
    println!("  {}: {}", "Priority".bold(), priority);
    if !tags.is_empty() {
        println!("  {}: {}", "Tags".bold(), tags.join(", "));
    }
    println!("  {}: {}", "File".dimmed(), readme_path.display());
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_variables_basic() {
        // Use a minimal template for testing
        let template = r#"---
status: planned
priority: medium
tags: []
---

# {name}

Created: {date}
"#;
        let result = apply_variables(template, "Test Feature", "planned", "medium", &[]);
        assert!(result.is_ok(), "should successfully populate template");

        let content = result.unwrap();

        // Check title replacement
        assert!(
            content.contains("# Test Feature"),
            "should replace title placeholder"
        );

        // Check frontmatter
        assert!(
            content.starts_with("---\n"),
            "should start with frontmatter"
        );
        assert!(
            content.contains("status: planned"),
            "should have correct status"
        );
        assert!(
            content.contains("priority: medium"),
            "should have default priority"
        );
        assert!(content.contains("tags: []"), "should have empty tags array");
        assert!(
            content.contains("created_at:"),
            "should have created_at timestamp"
        );
    }

    #[test]
    fn test_apply_variables_with_priority() {
        let template = r#"---
status: planned
priority: medium
tags: []
---

# {name}
"#;
        let result = apply_variables(template, "Test", "in-progress", "high", &[]);
        assert!(result.is_ok(), "should succeed with priority");

        let content = result.unwrap();
        assert!(
            content.contains("priority: high"),
            "should replace priority"
        );
        assert!(
            content.contains("status: in-progress"),
            "should have correct status"
        );
    }

    #[test]
    fn test_apply_variables_with_tags() {
        let template = r#"---
status: planned
priority: medium
tags: []
---

# {name}
"#;
        let tags = vec!["feature".to_string(), "backend".to_string()];
        let result = apply_variables(template, "Test", "planned", "medium", &tags);
        assert!(result.is_ok(), "should succeed with tags");

        let content = result.unwrap();
        assert!(content.contains("  - feature"), "should contain first tag");
        assert!(content.contains("  - backend"), "should contain second tag");
        assert!(
            !content.contains("tags: []"),
            "should not have empty tags array"
        );
    }

    #[test]
    fn test_apply_variables_all_options() {
        let template = r#"---
status: planned
priority: medium
tags: []
---

# {name}
"#;
        let tags = vec!["api".to_string(), "v2".to_string()];
        let result = apply_variables(template, "Complete Feature", "complete", "critical", &tags);
        assert!(result.is_ok(), "should succeed with all options");

        let content = result.unwrap();
        assert!(content.contains("# Complete Feature"), "should have title");
        assert!(content.contains("status: complete"), "should have status");
        assert!(
            content.contains("priority: critical"),
            "should have priority"
        );
        assert!(content.contains("  - api"), "should have first tag");
        assert!(content.contains("  - v2"), "should have second tag");
    }

    #[test]
    fn test_generate_title() {
        assert_eq!(generate_title("test-feature"), "Test Feature");
        assert_eq!(generate_title("api-v2"), "Api V2");
        assert_eq!(generate_title("simple"), "Simple");
    }

    #[test]
    fn test_parse_tags() {
        assert_eq!(
            parse_tags(Some("feature,backend".to_string())),
            vec!["feature", "backend"]
        );
        assert_eq!(
            parse_tags(Some("api, v2, test".to_string())),
            vec!["api", "v2", "test"]
        );
        assert_eq!(parse_tags(None), Vec::<String>::new());
    }

    #[test]
    fn test_get_next_spec_number_nonexistent_dir() {
        let result = get_next_spec_number("/nonexistent/path/specs");
        assert!(result.is_ok(), "should succeed for nonexistent dir");
        assert_eq!(result.unwrap(), 1, "should return 1 for new directory");
    }
}
