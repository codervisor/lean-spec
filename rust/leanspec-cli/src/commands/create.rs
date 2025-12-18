//! Create command implementation

use chrono::Utc;
use colored::Colorize;
use std::error::Error;
use std::fs;
use std::path::Path;

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

    // Generate content
    let content = generate_spec_content(&title, status, priority.as_deref(), &tags_vec);

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

fn generate_spec_content(
    title: &str,
    status: &str,
    priority: Option<&str>,
    tags: &[String],
) -> String {
    let now = Utc::now();
    let created_date = now.format("%Y-%m-%d").to_string();
    let created_at = now.to_rfc3339();

    let mut frontmatter = format!(
        r#"---
status: {}
created: '{}'
"#,
        status, created_date
    );

    if !tags.is_empty() {
        frontmatter.push_str("tags:\n");
        for tag in tags {
            frontmatter.push_str(&format!("  - {}\n", tag));
        }
    }

    if let Some(p) = priority {
        frontmatter.push_str(&format!("priority: {}\n", p));
    }

    frontmatter.push_str(&format!("created_at: '{}'\n", created_at));
    frontmatter.push_str("---\n");

    let status_emoji = match status {
        "planned" => "🗓️",
        "in-progress" => "⏳",
        "complete" => "✅",
        "archived" => "📦",
        _ => "📄",
    };

    let priority_text = priority
        .map(|p| format!(" · **Priority**: {}", capitalize(p)))
        .unwrap_or_default();
    let tags_text = if tags.is_empty() {
        String::new()
    } else {
        format!(" · **Tags**: {}", tags.join(", "))
    };

    format!(
        r#"{}
# {}

> **Status**: {} {} · **Created**: {}{}{}

## Overview

_Describe the problem being solved and the value proposition._

## Design

_Technical approach and key decisions._

## Plan

- [ ] _Task 1_
- [ ] _Task 2_
- [ ] _Task 3_

## Test

- [ ] _Test case 1_
- [ ] _Test case 2_

## Notes

_Additional context, decisions, and learnings._
"#,
        frontmatter,
        title,
        status_emoji,
        capitalize(status),
        created_date,
        priority_text,
        tags_text
    )
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}
