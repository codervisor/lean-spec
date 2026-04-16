use colored::Colorize;
use dialoguer::{Confirm, Input};
use serde_json::Value;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::commands::package_manager::detect_package_manager;

// Embedded AGENTS.md templates
const AGENTS_MD_TEMPLATE_DETAILED: &str = include_str!("../../templates/AGENTS.md");

// Embedded spec template
const SPEC_TEMPLATE: &str = include_str!("../../templates/spec-template.md");

pub struct InitOptions {
    pub yes: bool,
    pub example: Option<String>,
}

pub fn run(specs_dir: &str, options: InitOptions) -> Result<(), Box<dyn Error>> {
    if let Some(example_name) = options.example.as_deref() {
        return scaffold_example(specs_dir, &options, example_name);
    }
    run_standard_init(specs_dir, options)
}

fn run_standard_init(specs_dir: &str, options: InitOptions) -> Result<(), Box<dyn Error>> {
    let root = std::env::current_dir()?;
    let specs_path = to_absolute(&root, specs_dir);

    // Detect project name for AGENTS.md template substitution
    let project_name = if options.yes {
        root.file_name()
            .and_then(|s| s.to_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("project")
            .to_string()
    } else {
        let detected = root
            .file_name()
            .and_then(|s| s.to_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or("project")
            .to_string();

        let input = Input::new()
            .with_prompt(format!("Project name (detected: {})", detected))
            .default(detected.clone())
            .interact_text()?;

        let trimmed = input.trim();
        if trimmed.is_empty() {
            detected
        } else {
            trimmed.to_string()
        }
    };

    // Check if already initialized
    if specs_path.exists() && specs_path.is_dir() {
        let readme_exists = specs_path.join("README.md").exists();
        if !options.yes && readme_exists {
            println!(
                "{}",
                "LeanSpec already initialized in this directory.".yellow()
            );
            println!(
                "Specs directory: {}",
                specs_path.display().to_string().cyan()
            );
            return Ok(());
        }
    }

    let draft_status_enabled = if options.yes {
        false
    } else {
        Confirm::new()
            .with_prompt("Enable draft status for human review workflow?")
            .default(false)
            .interact()?
    };

    // Core filesystem scaffolding
    scaffold_specs(&root, &specs_path)?;
    let config_dir = root.join(".lean-spec");
    scaffold_config(&config_dir, draft_status_enabled)?;
    scaffold_templates(&config_dir)?;
    scaffold_agents(&root, &project_name)?;

    println!();
    println!("{}", "LeanSpec initialized successfully!".green().bold());
    println!();
    println!("Next steps:");
    println!(
        "  1. Create your first spec: {}",
        "leanspec create my-feature".cyan()
    );
    println!("  2. View the board: {}", "leanspec board".cyan());
    println!("  3. Read the docs: {}", "https://leanspec.dev".cyan());

    Ok(())
}

fn scaffold_example(
    specs_dir: &str,
    _options: &InitOptions,
    example_name: &str,
) -> Result<(), Box<dyn Error>> {
    let root = std::env::current_dir()?;
    let examples_dir = resolve_examples_dir()?;
    let template_dir = examples_dir.join(example_name);

    if !template_dir.exists() {
        return Err(format!("Example not found: {}", example_name).into());
    }

    let target_dir = root.join(example_name);
    ensure_empty_directory(&target_dir)?;
    if !target_dir.exists() {
        fs::create_dir_all(&target_dir)?;
    }

    copy_example_template(&template_dir, &target_dir)?;
    println!(
        "{} Created example project: {}",
        "✓".green(),
        target_dir.display()
    );

    let initial_dir = root;
    std::env::set_current_dir(&target_dir)?;
    let init_result = run_standard_init(
        specs_dir,
        InitOptions {
            yes: true,
            example: None,
        },
    );
    std::env::set_current_dir(&initial_dir)?;
    init_result?;

    print_example_next_steps(example_name, &target_dir);

    Ok(())
}

fn print_example_next_steps(example_name: &str, target_dir: &Path) {
    println!();
    println!("Next steps:");
    println!("  1. cd {}", example_name.cyan());

    if let Some(command) = resolve_example_run_command(target_dir) {
        let package_manager = match detect_package_manager(target_dir) {
            Ok(manager) => manager,
            Err(err) => {
                println!(
                    "{} Failed to detect package manager (defaulting to npm): {}",
                    "⚠".yellow(),
                    err
                );
                "npm".to_string()
            }
        };
        println!("  2. {} install", package_manager);
        println!("  3. {}", build_run_command(&package_manager, &command));
    } else {
        println!("  2. Review the README.md for setup instructions");
    }
}

fn resolve_example_run_command(target_dir: &Path) -> Option<String> {
    let package_json = target_dir.join("package.json");
    let content = fs::read_to_string(package_json).ok()?;
    let json: Value = serde_json::from_str(&content).ok()?;
    let scripts = json.get("scripts")?.as_object()?;

    if scripts.contains_key("start") {
        return Some("start".to_string());
    }

    if scripts.contains_key("dev") {
        return Some("dev".to_string());
    }

    None
}

fn build_run_command(package_manager: &str, script: &str) -> String {
    if is_builtin_script(script) {
        format!("{} {}", package_manager, script)
    } else {
        format!("{} run {}", package_manager, script)
    }
}

fn is_builtin_script(script: &str) -> bool {
    matches!(script, "start" | "test")
}

fn to_absolute(root: &Path, path: &str) -> PathBuf {
    let candidate = PathBuf::from(path);
    if candidate.is_absolute() {
        candidate
    } else {
        root.join(candidate)
    }
}

fn scaffold_specs(root: &Path, specs_path: &Path) -> Result<(), Box<dyn Error>> {
    if !specs_path.exists() {
        fs::create_dir_all(specs_path)?;
        println!(
            "{} Created specs directory: {}",
            "✓".green(),
            specs_path.display()
        );
    }

    // Create .lean-spec directory for configuration
    let config_dir = root.join(".lean-spec");
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)?;
        println!(
            "{} Created configuration directory: {}",
            "✓".green(),
            config_dir.display()
        );
    }

    // Create specs README
    let specs_readme = specs_path.join("README.md");
    if !specs_readme.exists() {
        let readme_content = r#"# Specs

This directory contains LeanSpec specifications for this project.

## Quick Start

```bash
# Create a new spec
leanspec create my-feature

# List all specs
leanspec list

# View the board
leanspec board

# Validate specs
leanspec validate
```

## Structure

Each spec lives in a numbered directory with a `README.md` file:

```
├── 001-feature-name/
│   └── README.md
└── 002-another-feature/
    └── README.md
```

## Spec Status Values

- `draft` - Being authored or refined
- `planned` - Not yet started
- `in-progress` - Currently being worked on
- `complete` - Finished
- `archived` - No longer relevant

## Learn More

Visit [leanspec.dev](https://leanspec.dev) for documentation.
"#;
        fs::write(&specs_readme, readme_content)?;
        println!("{} Created specs README", "✓".green());
    }

    Ok(())
}

fn resolve_examples_dir() -> Result<PathBuf, Box<dyn Error>> {
    let exe_path = std::env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .ok_or("Unable to resolve CLI binary directory")?;

    let mut searched = Vec::new();
    let mut current = Some(exe_dir);
    while let Some(dir) = current {
        let candidate = dir.join("templates").join("examples");
        searched.push(candidate.display().to_string());
        if candidate.exists() {
            return Ok(candidate);
        }

        let workspace_candidate = dir
            .join("packages")
            .join("cli")
            .join("templates")
            .join("examples");
        searched.push(workspace_candidate.display().to_string());
        if workspace_candidate.exists() {
            return Ok(workspace_candidate);
        }

        current = dir.parent();
    }

    Err(format!(
        "Example templates directory not found. Searched: {}. Ensure the CLI installation includes templates or rebuild the binary from the repository.",
        searched.join(", ")
    )
    .into())
}

fn ensure_empty_directory(target_dir: &Path) -> Result<(), Box<dyn Error>> {
    if target_dir.exists() {
        let mut entries = fs::read_dir(target_dir)?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                entry
                    .file_name()
                    .to_str()
                    .map(|name| name != ".git")
                    .unwrap_or(true)
            })
            .peekable();

        if entries.peek().is_some() {
            return Err(format!(
                "Target directory must be empty (except for .git): {}",
                target_dir.display()
            )
            .into());
        }
    }

    Ok(())
}

fn copy_example_template(from: &Path, to: &Path) -> Result<(), Box<dyn Error>> {
    for entry in WalkDir::new(from) {
        let entry = entry?;
        let path = entry.path();
        let relative_path = path.strip_prefix(from)?;
        let target_path = to.join(relative_path);

        if entry.file_type().is_dir() {
            fs::create_dir_all(&target_path)?;
        } else if entry.file_type().is_file() {
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::copy(path, &target_path)?;
        }
    }

    Ok(())
}

fn scaffold_config(config_dir: &Path, draft_status_enabled: bool) -> Result<(), Box<dyn Error>> {
    let config_file = config_dir.join("config.json");
    if !config_file.exists() {
        let default_config = format!(
            r#"{{
  "specsDir": "specs",
    "draftStatus": {{
        "enabled": {}
    }},
  "validation": {{
    "maxLines": 400,
    "warnLines": 200,
    "maxTokens": 5000,
    "warnTokens": 3500
  }},
  "features": {{
    "tokenCounting": true,
    "dependencyGraph": true
  }}
}}
"#,
            draft_status_enabled
        );
        fs::write(&config_file, default_config)?;
        println!("{} Created config: {}", "✓".green(), config_file.display());
    }
    Ok(())
}

fn scaffold_templates(config_dir: &Path) -> Result<(), Box<dyn Error>> {
    let templates_dir = config_dir.join("templates");
    if !templates_dir.exists() {
        fs::create_dir_all(&templates_dir)?;
        println!(
            "{} Created templates directory: {}",
            "✓".green(),
            templates_dir.display()
        );
    }

    let spec_template_path = templates_dir.join("spec-template.md");
    if !spec_template_path.exists() {
        fs::write(&spec_template_path, SPEC_TEMPLATE)?;
        println!("{} Created spec template", "✓".green());
    }
    Ok(())
}

fn scaffold_agents(root: &Path, project_name: &str) -> Result<(), Box<dyn Error>> {
    let agents_path = root.join("AGENTS.md");
    if !agents_path.exists() {
        let agents_content = AGENTS_MD_TEMPLATE_DETAILED.replace("{project_name}", project_name);
        fs::write(&agents_path, agents_content)?;
        println!("{} Created AGENTS.md", "✓".green());
    } else {
        println!("{} AGENTS.md already exists (preserved)", "✓".cyan());
    }
    Ok(())
}
