//! Relationship management tools

use leanspec_core::{validate_dependency_addition, validate_parent_assignment, SpecLoader};
use serde_json::{json, Value};

/// Internal helper to link specs (add dependency)
fn link_specs(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let depends_on = args
        .get("dependsOn")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: dependsOn")?;

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    let target = loader
        .load(depends_on)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Target spec not found: {}", depends_on))?;

    let all_specs = loader.load_all().map_err(|e| e.to_string())?;

    if spec.frontmatter.depends_on.contains(&target.path) {
        return Ok(format!("{} already depends on {}", spec.path, target.path));
    }

    validate_dependency_addition(&spec.path, &target.path, &all_specs)
        .map_err(|e| e.to_string())?;

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;

    let mut depends_on_list = spec.frontmatter.depends_on.clone();
    depends_on_list.push(target.path.clone());

    let deps_seq: Vec<serde_yaml::Value> = depends_on_list
        .iter()
        .map(|t| serde_yaml::Value::String(t.clone()))
        .collect();

    let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
        std::collections::HashMap::new();
    updates.insert(
        "depends_on".to_string(),
        serde_yaml::Value::Sequence(deps_seq),
    );

    let parser = leanspec_core::FrontmatterParser::new();
    let new_content = parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| e.to_string())?;

    std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;

    Ok(format!("Linked: {} → {}", spec.path, target.path))
}

/// Internal helper to unlink specs (remove dependency)
fn unlink_specs(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let depends_on = args
        .get("dependsOn")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: dependsOn")?;

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    let target_path = spec
        .frontmatter
        .depends_on
        .iter()
        .find(|d| d.contains(depends_on) || depends_on.contains(d.as_str()))
        .cloned()
        .ok_or_else(|| format!("{} does not depend on {}", spec.path, depends_on))?;

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;

    let depends_on_list: Vec<_> = spec
        .frontmatter
        .depends_on
        .iter()
        .filter(|d| *d != &target_path)
        .cloned()
        .collect();

    let deps_seq: Vec<serde_yaml::Value> = depends_on_list
        .iter()
        .map(|t| serde_yaml::Value::String(t.clone()))
        .collect();

    let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
        std::collections::HashMap::new();
    updates.insert(
        "depends_on".to_string(),
        serde_yaml::Value::Sequence(deps_seq),
    );

    let parser = leanspec_core::FrontmatterParser::new();
    let new_content = parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| e.to_string())?;

    std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;

    Ok(format!("Unlinked: {} ✗ {}", spec.path, target_path))
}

/// Internal helper to set parent relationship
fn set_parent(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let parent = args.get("parent").and_then(|v| v.as_str());

    let loader = SpecLoader::new(specs_dir);
    let spec = loader
        .load(spec_path)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

    if let Some(parent_path) = parent {
        let parent_spec = loader
            .load(parent_path)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| format!("Parent spec not found: {}", parent_path))?;

        let all_specs = loader.load_all().map_err(|e| e.to_string())?;
        validate_parent_assignment(&spec.path, &parent_spec.path, &all_specs)
            .map_err(|e| e.to_string())?;

        let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
            std::collections::HashMap::new();
        updates.insert(
            "parent".to_string(),
            serde_yaml::Value::String(parent_spec.path.clone()),
        );

        let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;
        let parser = leanspec_core::FrontmatterParser::new();
        let new_content = parser
            .update_frontmatter(&content, &updates)
            .map_err(|e| e.to_string())?;

        std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;
        return Ok(format!("Set parent: {} → {}", spec.path, parent_spec.path));
    }

    let mut updates: std::collections::HashMap<String, serde_yaml::Value> =
        std::collections::HashMap::new();
    updates.insert("parent".to_string(), serde_yaml::Value::Null);

    let content = std::fs::read_to_string(&spec.file_path).map_err(|e| e.to_string())?;
    let parser = leanspec_core::FrontmatterParser::new();
    let new_content = parser
        .update_frontmatter(&content, &updates)
        .map_err(|e| e.to_string())?;

    std::fs::write(&spec.file_path, &new_content).map_err(|e| e.to_string())?;
    Ok(format!("Cleared parent for {}", spec.path))
}

pub(crate) fn tool_relationships(specs_dir: &str, args: Value) -> Result<String, String> {
    let spec_path = args
        .get("specPath")
        .and_then(|v| v.as_str())
        .ok_or("Missing required parameter: specPath")?;

    let action = args
        .get("action")
        .and_then(|v| v.as_str())
        .unwrap_or("view");

    let rel_type = args.get("type").and_then(|v| v.as_str());
    let target = args.get("target").and_then(|v| v.as_str());

    match action {
        "view" => {
            let loader = SpecLoader::new(specs_dir);
            let spec = loader
                .load(spec_path)
                .map_err(|e| e.to_string())?
                .ok_or_else(|| format!("Spec not found: {}", spec_path))?;

            let all_specs = loader.load_all().map_err(|e| e.to_string())?;
            let children: Vec<_> = all_specs
                .iter()
                .filter(|s| s.frontmatter.parent.as_deref() == Some(spec.path.as_str()))
                .collect();
            let required_by: Vec<_> = all_specs
                .iter()
                .filter(|s| s.frontmatter.depends_on.contains(&spec.path))
                .collect();

            let to_summary = |s: &leanspec_core::SpecInfo| {
                json!({
                    "path": s.path,
                    "title": s.title,
                    "status": s.frontmatter.status.to_string()
                })
            };

            let output = json!({
                "spec": {
                    "path": spec.path,
                    "title": spec.title,
                    "status": spec.frontmatter.status.to_string(),
                },
                "hierarchy": {
                    "parent": spec.frontmatter.parent,
                    "children": children.iter().map(|s| to_summary(s)).collect::<Vec<_>>()
                },
                "dependencies": {
                    "depends_on": spec.frontmatter.depends_on.iter().map(|path| {
                        all_specs
                            .iter()
                            .find(|s| s.path == *path)
                            .map(to_summary)
                            .unwrap_or_else(|| json!({ "path": path }))
                    }).collect::<Vec<_>>(),
                    "required_by": required_by.iter().map(|s| to_summary(s)).collect::<Vec<_>>()
                }
            });

            serde_json::to_string_pretty(&output).map_err(|e| e.to_string())
        }
        "add" | "remove" => {
            let rel_type = rel_type.ok_or("Missing required parameter: type")?;
            let target = target.ok_or("Missing required parameter: target")?;

            match rel_type {
                "parent" => {
                    if action == "add" {
                        set_parent(
                            specs_dir,
                            json!({ "specPath": spec_path, "parent": target }),
                        )
                    } else {
                        set_parent(specs_dir, json!({ "specPath": spec_path, "parent": null }))
                    }
                }
                "child" => {
                    if action == "add" {
                        set_parent(
                            specs_dir,
                            json!({ "specPath": target, "parent": spec_path }),
                        )
                    } else {
                        set_parent(specs_dir, json!({ "specPath": target, "parent": null }))
                    }
                }
                "depends_on" => {
                    if action == "add" {
                        link_specs(
                            specs_dir,
                            json!({ "specPath": spec_path, "dependsOn": target }),
                        )
                    } else {
                        unlink_specs(
                            specs_dir,
                            json!({ "specPath": spec_path, "dependsOn": target }),
                        )
                    }
                }
                _ => Err("Invalid relationship type".to_string()),
            }
        }
        _ => Err("Invalid action".to_string()),
    }
}

/// Get tool definitions for relationship management tools
pub(crate) fn get_definitions() -> Vec<crate::protocol::ToolDefinition> {
    use crate::protocol::ToolDefinition;

    vec![ToolDefinition {
        name: "relationships".to_string(),
        description: "Manage spec relationships (hierarchy and dependencies)".to_string(),
        input_schema: json!({
            "type": "object",
            "properties": {
                "specPath": {
                    "type": "string",
                    "description": "Spec path or number"
                },
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": ["view", "add", "remove"],
                    "default": "view"
                },
                "type": {
                    "type": "string",
                    "description": "Relationship type",
                    "enum": ["parent", "child", "depends_on"]
                },
                "target": {
                    "type": "string",
                    "description": "Target spec path or number"
                }
            },
            "required": ["specPath"],
            "additionalProperties": false
        }),
    }]
}
