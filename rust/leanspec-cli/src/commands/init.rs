use colored::Colorize;
use dialoguer::Input;
use std::error::Error;
use std::fs;
use std::path::PathBuf;

pub fn run(specs_dir: &str, yes: bool, _template: Option<String>) -> Result<(), Box<dyn Error>> {
    let root = std::env::current_dir()?;
    let specs_path = {
        let candidate = PathBuf::from(specs_dir);
        if candidate.is_absolute() {
            candidate
        } else {
            root.join(candidate)
        }
    };

    let detected_name = root
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("project")
        .to_string();

    let default_name = detected_name.clone();
    let _project_name = if yes {
        default_name
    } else {
        let input = Input::new()
            .with_prompt(format!("Project name (detected: {})", detected_name))
            .default(detected_name.clone())
            .interact_text()?;

        let trimmed = input.trim();
        if trimmed.is_empty() {
            detected_name.clone()
        } else {
            trimmed.to_string()
        }
    };

    // Check if already initialized
    if specs_path.exists() && specs_path.is_dir() {
        let readme_exists = specs_path.join("README.md").exists();
        if !yes && readme_exists {
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

    // Create specs directory
    if !specs_path.exists() {
        fs::create_dir_all(&specs_path)?;
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

    // Create default config file
    let config_file = config_dir.join("config.json");
    if !config_file.exists() {
        let default_config = r#"{
  "specsDir": "specs",
  "templates": {
    "default": "minimal"
  },
  "validation": {
    "maxLines": 400,
    "warnLines": 200,
    "maxTokens": 5000,
    "warnTokens": 3500
  },
  "features": {
    "tokenCounting": true,
    "dependencyGraph": true
  }
}
"#;
        fs::write(&config_file, default_config)?;
        println!("{} Created config: {}", "✓".green(), config_file.display());
    }

    // Create specs README
    let specs_readme = specs_path.join("README.md");
    if !specs_readme.exists() {
        let readme_content = r#"# Specs

This directory contains LeanSpec specifications for this project.

## Quick Start

```bash
# Create a new spec
lean-spec create my-feature

# List all specs
lean-spec list

# View the board
lean-spec board

# Validate specs
lean-spec validate
```

## Structure

Each spec lives in a numbered directory with a `README.md` file:

```
specs/
├── 001-feature-name/
│   └── README.md
├── 002-another-feature/
│   └── README.md
└── archived/
    └── old-specs...
```

## Spec Status Values

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

    // Create archived directory
    let archived_dir = specs_path.join("archived");
    if !archived_dir.exists() {
        fs::create_dir_all(&archived_dir)?;

        // Create .gitkeep
        fs::write(archived_dir.join(".gitkeep"), "")?;
        println!("{} Created archived directory", "✓".green());
    }

    println!();
    println!("{}", "LeanSpec initialized successfully! 🎉".green().bold());
    println!();
    println!("Next steps:");
    println!(
        "  1. Create your first spec: {}",
        "lean-spec create my-feature".cyan()
    );
    println!("  2. View the board: {}", "lean-spec board".cyan());
    println!("  3. Read the docs: {}", "https://leanspec.dev".cyan());

    Ok(())
}
