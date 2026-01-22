//! Create command implementation

use chrono::Utc;
use colored::Colorize;
use std::error::Error;
use std::fs;
use std::path::Path;

// Embedded spec template
const SPEC_TEMPLATE: &str = include_str!("../../templates/spec-template.md");

pub fn run(
    specs_dir: &str,
    name: &str,
    title: Option<String>,
    _template: Option<String>,
    status: &str,
    priority: Option<String>,
    tags: Option<String>,
) -> Result<(), Box<dyn Error>> {
    // Generate spec number
    let next_number = get_next_spec_number(specs_dir)?;
    let spec_name = format!("{:03}-{}", next_number, name);
    let spec_dir = Path::new(specs_dir).join(&spec_name);

    if spec_dir.exists() {
        return Err(format!("Spec directory already exists: {}", spec_dir.display()).into());
    }

    // Create directory
    fs::create_dir_all(&spec_dir)?;

    // Generate title
    let title = title.unwrap_or_else(|| {
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
    });

    // Parse tags
    let tags_vec: Vec<String> = tags
        .map(|t| t.split(',').map(|s| s.trim().to_string()).collect())
        .unwrap_or_default();

    // Generate content from template
    let content = load_and_populate_template(&title, status, priority.as_deref(), &tags_vec)?;

    // Write file
    let readme_path = spec_dir.join("README.md");
    fs::write(&readme_path, &content)?;

    println!("{} {}", "✓".green(), "Created spec:".green());
    println!("  {}: {}", "Path".bold(), spec_name);
    println!("  {}: {}", "Title".bold(), title);
    println!("  {}: {}", "Status".bold(), status);
    if let Some(p) = &priority {
        println!("  {}: {}", "Priority".bold(), p);
    }
    if !tags_vec.is_empty() {
        println!("  {}: {}", "Tags".bold(), tags_vec.join(", "));
    }
    println!("  {}: {}", "File".dimmed(), readme_path.display());

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

fn load_and_populate_template(
    title: &str,
    status: &str,
    priority: Option<&str>,
    tags: &[String],
) -> Result<String, Box<dyn Error>> {
    let now = Utc::now();
    let created_date = now.format("%Y-%m-%d").to_string();
    let created_at = now.to_rfc3339();

    let mut content = SPEC_TEMPLATE.to_string();

    // Replace template variables
    content = content.replace("{name}", title);
    content = content.replace("{date}", &created_date);
    content = content.replace("{status}", status);
    content = content.replace("{priority}", priority.unwrap_or("medium"));

    // Handle frontmatter replacements
    // Replace status in frontmatter
    content = content.replace("status: planned", &format!("status: {}", status));

    // Replace priority in frontmatter if provided
    if let Some(p) = priority {
        content = content.replace("priority: medium", &format!("priority: {}", p));
    }

    // Replace tags in frontmatter
    if !tags.is_empty() {
        let tags_yaml = tags
            .iter()
            .map(|t| format!("  - {}", t))
            .collect::<Vec<_>>()
            .join("\n");
        content = content.replace("tags: []", &format!("tags:\n{}", tags_yaml));
    }

    // Add created_at timestamp to frontmatter (after priority line)
    let frontmatter_end = content.find("---\n\n").ok_or("Invalid template format")?;
    content.insert_str(frontmatter_end, &format!("created_at: '{}'\n", created_at));

    Ok(content)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_and_populate_template_basic() {
        let result = load_and_populate_template("Test Feature", "planned", None, &[]);
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

        // Check template sections are preserved
        assert!(content.contains("## Overview"), "should contain Overview");
        assert!(content.contains("## Design"), "should contain Design");
        assert!(content.contains("## Plan"), "should contain Plan");
        assert!(content.contains("## Test"), "should contain Test");
        assert!(content.contains("## Notes"), "should contain Notes");
    }

    #[test]
    fn test_load_and_populate_template_with_priority() {
        let result = load_and_populate_template("Test", "in-progress", Some("high"), &[]);
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
    fn test_load_and_populate_template_with_tags() {
        let tags = vec!["feature".to_string(), "backend".to_string()];
        let result = load_and_populate_template("Test", "planned", None, &tags);
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
    fn test_load_and_populate_template_all_options() {
        let tags = vec!["api".to_string(), "v2".to_string()];
        let result =
            load_and_populate_template("Complete Feature", "complete", Some("critical"), &tags);
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
    fn test_load_and_populate_template_preserves_structure() {
        let result = load_and_populate_template("Test", "planned", None, &[]);
        let content = result.unwrap();

        // Check template comments are preserved
        assert!(
            content.contains("<!-- What are we solving? Why now? -->"),
            "should preserve Overview comment"
        );
        assert!(
            content.contains("<!-- Technical approach, architecture decisions -->"),
            "should preserve Design comment"
        );
        assert!(
            content.contains("<!-- How will we verify this works? -->"),
            "should preserve Test comment"
        );

        // Check template hints
        assert!(
            content.contains("💡 TIP:"),
            "should preserve tip about sub-specs"
        );

        // Check checklist items
        assert!(content.contains("- [ ] Task 1"), "should have task 1");
        assert!(content.contains("- [ ] Task 2"), "should have task 2");
        assert!(content.contains("- [ ] Task 3"), "should have task 3");
    }

    #[test]
    fn test_get_next_spec_number_nonexistent_dir() {
        let result = get_next_spec_number("/nonexistent/path/specs");
        assert!(result.is_ok(), "should succeed for nonexistent dir");
        assert_eq!(result.unwrap(), 1, "should return 1 for new directory");
    }
}
