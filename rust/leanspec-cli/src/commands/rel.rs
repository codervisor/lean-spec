//! Unified relationships command

use colored::Colorize;
use leanspec_core::{DependencyGraph, FrontmatterParser, SpecLoader};
use std::collections::HashMap;
use std::error::Error;

const ACTION_VIEW: &str = "view";
const ACTION_ADD: &str = "add";
const ACTION_REMOVE: &str = "rm";
const ACTION_REMOVE_ALIAS: &str = "remove";

pub struct RelArgs {
    pub args: Vec<String>,
    pub parent: Option<String>,
    pub children: Vec<String>,
    pub depends_on: Vec<String>,
}

pub fn run(specs_dir: &str, rel_args: RelArgs, output_format: &str) -> Result<(), Box<dyn Error>> {
    let (action, spec) = parse_action_and_spec(&rel_args.args)?;
    let normalized_action = if action == ACTION_REMOVE_ALIAS {
        ACTION_REMOVE.to_string()
    } else {
        action
    };

    match normalized_action.as_str() {
        ACTION_VIEW => view_relationships(specs_dir, &spec, output_format),
        ACTION_ADD => update_relationships(specs_dir, &spec, rel_args, true),
        ACTION_REMOVE => update_relationships(specs_dir, &spec, rel_args, false),
        _ => Err(format!("Unknown action: {}", normalized_action).into()),
    }
}

fn parse_action_and_spec(args: &[String]) -> Result<(String, String), Box<dyn Error>> {
    if args.is_empty() {
        return Err("Usage: lean-spec rel <spec> OR lean-spec rel <action> <spec>".into());
    }

    let first = args[0].as_str();
    let action = match first {
        ACTION_VIEW | ACTION_ADD | ACTION_REMOVE | ACTION_REMOVE_ALIAS => first.to_string(),
        _ => ACTION_VIEW.to_string(),
    };

    let spec = if action == ACTION_VIEW && args.len() == 1 {
        args[0].clone()
    } else {
        args.get(1)
            .cloned()
            .ok_or("Spec is required for this action")?
    };

    Ok((action, spec))
}

fn view_relationships(
    specs_dir: &str,
    spec: &str,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let spec_info = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let all_specs = loader.load_all()?;
    let children: Vec<&leanspec_core::SpecInfo> = all_specs
        .iter()
        .filter(|s| s.frontmatter.parent.as_deref() == Some(spec_info.path.as_str()))
        .collect();

    let graph = DependencyGraph::new(&all_specs);
    let complete = graph.get_complete_graph(&spec_info.path);
    let depends_on = complete
        .as_ref()
        .map(|g| {
            g.depends_on
                .iter()
                .map(|s| s.path.clone())
                .collect::<Vec<_>>()
        })
        .unwrap_or_else(|| spec_info.frontmatter.depends_on.clone());
    let required_by = complete
        .as_ref()
        .map(|g| {
            g.required_by
                .iter()
                .map(|s| s.path.clone())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    if output_format == "json" {
        let output = serde_json::json!({
            "spec": spec_info.path,
            "title": spec_info.title,
            "hierarchy": {
                "parent": spec_info.frontmatter.parent,
                "children": children.iter().map(|s| s.path.clone()).collect::<Vec<_>>()
            },
            "dependencies": {
                "depends_on": depends_on,
                "required_by": required_by,
            }
        });
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    println!();
    println!("# Relationships for {}", spec_info.title.bold().cyan());
    println!();

    println!("{}", "Hierarchy".bold());
    match &spec_info.frontmatter.parent {
        Some(parent) => println!("├── Parent: {}", parent.cyan()),
        None => println!("├── Parent: (none)"),
    }

    if children.is_empty() {
        println!("└── Children: (none)");
    } else {
        println!("└── Children:");
        for child in &children {
            println!("    ├── {}", child.path.cyan());
        }
    }

    println!();
    println!("{}", "Dependencies".bold());
    if depends_on.is_empty() {
        println!("├── Depends On: (none)");
    } else {
        println!("├── Depends On:");
        for dep in &depends_on {
            println!("│   ├── {}", dep.cyan());
        }
    }

    if required_by.is_empty() {
        println!("└── Required By: (none)");
    } else {
        println!("└── Required By:");
        for req in &required_by {
            println!("    ├── {}", req.cyan());
        }
    }

    Ok(())
}

fn update_relationships(
    specs_dir: &str,
    spec: &str,
    rel_args: RelArgs,
    is_add: bool,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let spec_info = loader
        .load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;

    let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
    let mut depends_on = spec_info.frontmatter.depends_on.clone();

    if let Some(parent) = rel_args.parent {
        if is_add {
            if parent.is_empty() {
                return Err("Parent spec is required for add".into());
            }
            if parent == spec_info.path {
                return Err("Spec cannot be its own parent".into());
            }
            updates.insert("parent".to_string(), serde_yaml::Value::String(parent));
        } else {
            updates.insert("parent".to_string(), serde_yaml::Value::Null);
        }
    }

    if !rel_args.depends_on.is_empty() {
        if is_add {
            for dep in rel_args.depends_on {
                if dep == spec_info.path {
                    return Err("Spec cannot depend on itself".into());
                }
                if !depends_on.contains(&dep) {
                    depends_on.push(dep);
                }
            }
        } else {
            depends_on.retain(|dep| !rel_args.depends_on.contains(dep));
        }
        let deps_seq = depends_on
            .iter()
            .map(|dep| serde_yaml::Value::String(dep.clone()))
            .collect::<Vec<_>>();
        updates.insert(
            "depends_on".to_string(),
            serde_yaml::Value::Sequence(deps_seq),
        );
    }

    let mut updated_children = false;

    if !rel_args.children.is_empty() {
        for child in &rel_args.children {
            let child_info = loader
                .load(child)?
                .ok_or_else(|| format!("Child spec not found: {}", child))?;
            if is_add {
                set_parent_for(specs_dir, &child_info.path, Some(spec_info.path.clone()))?;
            } else {
                set_parent_for(specs_dir, &child_info.path, None)?;
            }
            updated_children = true;
        }
    }

    if updates.is_empty() && !updated_children {
        return Err("No relationship changes specified".into());
    }

    if !updates.is_empty() {
        let content = std::fs::read_to_string(&spec_info.file_path)?;
        let parser = FrontmatterParser::new();
        let new_content = parser.update_frontmatter(&content, &updates)?;
        std::fs::write(&spec_info.file_path, &new_content)?;
    }

    println!(
        "{} Updated relationships for {}",
        "✓".green(),
        spec_info.path.cyan()
    );
    Ok(())
}

fn set_parent_for(
    specs_dir: &str,
    child_spec: &str,
    parent: Option<String>,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let spec_info = loader
        .load(child_spec)?
        .ok_or_else(|| format!("Spec not found: {}", child_spec))?;

    let content = std::fs::read_to_string(&spec_info.file_path)?;
    let mut updates: HashMap<String, serde_yaml::Value> = HashMap::new();
    if let Some(parent) = parent {
        updates.insert("parent".to_string(), serde_yaml::Value::String(parent));
    } else {
        updates.insert("parent".to_string(), serde_yaml::Value::Null);
    }

    let parser = FrontmatterParser::new();
    let new_content = parser.update_frontmatter(&content, &updates)?;
    std::fs::write(&spec_info.file_path, &new_content)?;
    Ok(())
}
