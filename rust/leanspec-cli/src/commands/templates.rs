//! Templates command implementation
//!
//! Manage spec templates for creating new specs.

use colored::Colorize;
use std::error::Error;
use std::fs;
use std::path::Path;

pub fn run(
    _specs_dir: &str,
    action: Option<&str>,
    name: Option<&str>,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let config_dir = Path::new(".lean-spec");
    let templates_dir = config_dir.join("templates");
    
    match action {
        Some("list") | None => list_templates(&templates_dir, output_format),
        Some("show") => {
            let name = name.ok_or("Template name required for 'show' action")?;
            show_template(&templates_dir, name)
        }
        Some("add") => {
            let name = name.ok_or("Template name required for 'add' action")?;
            add_template(&templates_dir, name)
        }
        Some("remove") => {
            let name = name.ok_or("Template name required for 'remove' action")?;
            remove_template(&templates_dir, name)
        }
        Some(action) => Err(format!("Unknown action: {}. Use list, show, add, or remove", action).into()),
    }
}

fn list_templates(templates_dir: &Path, output_format: &str) -> Result<(), Box<dyn Error>> {
    if !templates_dir.exists() {
        println!("{}", "No templates directory found.".yellow());
        println!("Run: {}", "lean-spec init".cyan());
        return Ok(());
    }
    
    let entries: Vec<_> = fs::read_dir(templates_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            let path = e.path();
            path.is_file() && path.extension().map(|ext| ext == "md").unwrap_or(false)
        })
        .collect();
    
    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct TemplateInfo {
            name: String,
            file: String,
            size_kb: f64,
        }
        
        let templates: Vec<_> = entries
            .iter()
            .filter_map(|e| {
                let path = e.path();
                let metadata = fs::metadata(&path).ok()?;
                let name = path.file_stem()?.to_string_lossy().to_string();
                let file = path.file_name()?.to_string_lossy().to_string();
                Some(TemplateInfo {
                    name,
                    file,
                    size_kb: metadata.len() as f64 / 1024.0,
                })
            })
            .collect();
        
        println!("{}", serde_json::to_string_pretty(&templates)?);
        return Ok(());
    }
    
    if entries.is_empty() {
        println!("{}", "No templates found.".yellow());
        return Ok(());
    }
    
    println!();
    println!("{}", "=== Available Templates ===".green().bold());
    println!();
    
    for entry in &entries {
        let path = entry.path();
        if let (Some(name), Ok(metadata)) = (path.file_stem(), fs::metadata(&path)) {
            let size_kb = metadata.len() as f64 / 1024.0;
            println!("  {} ({:.1} KB)", name.to_string_lossy().cyan(), size_kb);
        }
    }
    
    println!();
    println!("Use templates with: {}", "lean-spec create <name> --template=<template-name>".dimmed());
    println!();
    
    Ok(())
}

fn show_template(templates_dir: &Path, name: &str) -> Result<(), Box<dyn Error>> {
    let template_file = if name.ends_with(".md") {
        templates_dir.join(name)
    } else {
        templates_dir.join(format!("{}.md", name))
    };
    
    if !template_file.exists() {
        return Err(format!("Template not found: {}", name).into());
    }
    
    let content = fs::read_to_string(&template_file)?;
    
    println!();
    println!("{}", format!("=== Template: {} ===", name).cyan().bold());
    println!();
    println!("{}", content);
    println!();
    
    Ok(())
}

fn add_template(templates_dir: &Path, name: &str) -> Result<(), Box<dyn Error>> {
    // Ensure templates directory exists
    if !templates_dir.exists() {
        fs::create_dir_all(templates_dir)?;
    }
    
    let template_file = if name.ends_with(".md") {
        templates_dir.join(name)
    } else {
        templates_dir.join(format!("{}.md", name))
    };
    
    if template_file.exists() {
        return Err(format!("Template already exists: {}", name).into());
    }
    
    // Create a default template
    let default_content = r#"---
status: planned
created: '{{created}}'
tags: []
---

# {{title}}

> **Status**: 🗓️ Planned · **Created**: {{created}}

## Overview

_Describe the problem being solved and the value proposition._

## Design

_Technical approach and key decisions._

## Plan

- [ ] _Task 1_
- [ ] _Task 2_

## Test

- [ ] _Test case 1_
- [ ] _Test case 2_

## Notes

_Additional context, decisions, and learnings._
"#;
    
    fs::write(&template_file, default_content)?;
    
    println!("{} Added template: {}", "✓".green(), name.cyan());
    println!("  Edit: {}", template_file.display().to_string().dimmed());
    println!("  Use with: {}", format!("lean-spec create <spec-name> --template={}", name).dimmed());
    
    Ok(())
}

fn remove_template(templates_dir: &Path, name: &str) -> Result<(), Box<dyn Error>> {
    let template_file = if name.ends_with(".md") {
        templates_dir.join(name)
    } else {
        templates_dir.join(format!("{}.md", name))
    };
    
    if !template_file.exists() {
        return Err(format!("Template not found: {}", name).into());
    }
    
    if name == "default" || name == "minimal" {
        return Err("Cannot remove default templates".into());
    }
    
    fs::remove_file(&template_file)?;
    
    println!("{} Removed template: {}", "✓".green(), name.cyan());
    
    Ok(())
}
