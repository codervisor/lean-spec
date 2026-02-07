//! Tauri commands for spec operations
//!
//! These commands expose the Rust spec operations library to the UI frontend,
//! replacing legacy HTTP API routes.

use std::path::Path;
use tauri::State;

use crate::specs::{
    constants::VALID_STATUSES,
    reader::{LightweightSpec, Spec, SpecReader},
    stats::{calculate_stats, StatsResult},
    dependencies::{build_dependency_graph, get_spec_dependencies, DependencyGraph, SpecDependencies},
    validation::{validate_all_specs, validate_spec, ValidationResult},
};
use crate::state::DesktopState;

/// Get all specs for a project
#[tauri::command]
pub async fn get_specs(
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<Vec<LightweightSpec>, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let specs = reader.load_all();
    
    Ok(specs.iter().map(LightweightSpec::from).collect())
}

/// Get a single spec by ID or number
#[tauri::command]
pub async fn get_spec_detail(
    state: State<'_, DesktopState>,
    project_id: String,
    spec_id: String,
) -> Result<Spec, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    reader
        .load_spec(&spec_id)
        .ok_or_else(|| format!("Spec '{}' not found", spec_id))
}

/// Get project statistics
#[tauri::command]
pub async fn get_project_stats(
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<StatsResult, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let specs = reader.load_all();
    
    Ok(calculate_stats(&specs))
}

/// Get dependency graph for visualization
#[tauri::command]
pub async fn get_dependency_graph(
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<DependencyGraph, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let specs = reader.load_all();
    
    Ok(build_dependency_graph(&specs))
}

/// Get dependencies for a specific spec
#[tauri::command]
pub async fn get_spec_dependencies_cmd(
    state: State<'_, DesktopState>,
    project_id: String,
    spec_id: String,
) -> Result<SpecDependencies, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let specs = reader.load_all();
    
    let spec = specs
        .iter()
        .find(|s| s.spec_name == spec_id || s.id == spec_id || s.id == format!("fs-{}", spec_id))
        .ok_or_else(|| format!("Spec '{}' not found", spec_id))?;
    
    Ok(get_spec_dependencies(spec, &specs))
}

/// Search specs by query
#[tauri::command]
pub async fn search_specs(
    state: State<'_, DesktopState>,
    project_id: String,
    query: String,
) -> Result<Vec<LightweightSpec>, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let specs = reader.search(&query);
    
    Ok(specs.iter().map(LightweightSpec::from).collect())
}

/// Get specs by status
#[tauri::command]
pub async fn get_specs_by_status(
    state: State<'_, DesktopState>,
    project_id: String,
    status: String,
) -> Result<Vec<LightweightSpec>, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let specs = reader.get_by_status(&status);
    
    Ok(specs.iter().map(LightweightSpec::from).collect())
}

/// Get all unique tags
#[tauri::command]
pub async fn get_all_tags(
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<Vec<String>, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    Ok(reader.get_all_tags())
}

/// Validate a single spec
#[tauri::command]
pub async fn validate_spec_cmd(
    state: State<'_, DesktopState>,
    project_id: String,
    spec_id: String,
) -> Result<ValidationResult, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let spec = reader
        .load_spec(&spec_id)
        .ok_or_else(|| format!("Spec '{}' not found", spec_id))?;
    
    Ok(validate_spec(&spec))
}

/// Validate all specs in a project
#[tauri::command]
pub async fn validate_all_specs_cmd(
    state: State<'_, DesktopState>,
    project_id: String,
) -> Result<Vec<ValidationResult>, String> {
    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let specs = reader.load_all();
    
    Ok(validate_all_specs(&specs))
}

/// Update spec status (writes to filesystem)
#[tauri::command]
pub async fn update_spec_status(
    state: State<'_, DesktopState>,
    project_id: String,
    spec_id: String,
    new_status: String,
    force: Option<bool>,
) -> Result<Spec, String> {
    use std::fs;
    use chrono::Utc;

    // Validate status
    if !VALID_STATUSES.contains(&new_status.as_str()) {
        return Err(format!(
            "Invalid status '{}'. Must be one of: {}",
            new_status,
            VALID_STATUSES.join(", ")
        ));
    }

    let project = state
        .project_store
        .find(&project_id)
        .ok_or_else(|| "Project not found".to_string())?;

    let reader = SpecReader::new(&project.specs_dir, &project_id);
    let spec = reader
        .load_spec(&spec_id)
        .ok_or_else(|| format!("Spec '{}' not found", spec_id))?;

    let skip_force = force.unwrap_or(false);
    if spec.status == "draft"
        && (new_status == "in-progress" || new_status == "complete")
        && !skip_force
    {
        return Err("Cannot skip 'planned' stage. Use force to override.".to_string());
    }

    // Read the spec file - construct proper path from specs_dir and spec_name
    // The file_path is relative like "specs/169-name/README.md"
    // We need to join specs_dir with the spec directory and README.md
    let spec_path = Path::new(&project.specs_dir)
        .join(&spec.spec_name)
        .join("README.md");
    
    let content = fs::read_to_string(&spec_path)
        .map_err(|e| format!("Failed to read spec file: {}", e))?;

    // Update status in frontmatter
    let updated_content = update_frontmatter_field(&content, "status", &new_status)?;
    
    // Add transition record and update updated_at
    let now = Utc::now().to_rfc3339();
    let updated_content = update_frontmatter_field(&updated_content, "updated_at", &format!("'{}'", now))?;

    // Write back
    fs::write(&spec_path, &updated_content)
        .map_err(|e| format!("Failed to write spec file: {}", e))?;

    // Reload and return updated spec
    reader
        .load_spec(&spec_id)
        .ok_or_else(|| "Failed to reload spec after update".to_string())
}

/// Helper to update a field in YAML frontmatter
fn update_frontmatter_field(content: &str, field: &str, value: &str) -> Result<String, String> {
    if !content.starts_with("---") {
        return Err("No frontmatter found".to_string());
    }

    let rest = &content[3..];
    let rest = rest.strip_prefix('\n').unwrap_or(rest);
    
    if let Some(end_pos) = rest.find("\n---") {
        let yaml_content = &rest[..end_pos];
        let markdown_content = &rest[end_pos + 4..];
        
        // Simple field replacement (works for simple values)
        let field_pattern = format!("{}:", field);
        let new_line = format!("{}: {}", field, value);
        let mut lines: Vec<String> = yaml_content.lines().map(String::from).collect();
        let mut found = false;
        
        for line in lines.iter_mut() {
            if line.trim_start().starts_with(&field_pattern) {
                *line = new_line.clone();
                found = true;
                break;
            }
        }
        
        // If field not found, add it at the end
        let new_yaml = if found {
            lines.join("\n")
        } else {
            format!("{}\n{}: {}", yaml_content, field, value)
        };
        
        Ok(format!("---\n{}\n---{}", new_yaml, markdown_content))
    } else {
        Err("Malformed frontmatter".to_string())
    }
}
