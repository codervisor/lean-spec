use colored::Colorize;
use dialoguer::{Confirm, Input, MultiSelect};
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

mod ai_tools;
mod mcp_config;

use crate::commands::skill;
use ai_tools::{
    create_symlinks, default_symlink_selection, detect_ai_tools, symlink_capable_runners,
    DetectionResult as AiDetection,
};
use leanspec_core::sessions::RunnerRegistry;
use mcp_config::{
    all_tools as all_mcp_tools, configure_mcp, default_mcp_selection, detect_mcp_tools,
};

// Embedded AGENTS.md templates
const AGENTS_MD_TEMPLATE_DETAILED: &str = include_str!("../../templates/AGENTS.md");
const AGENTS_MD_TEMPLATE_WITH_SKILL: &str = include_str!("../../templates/AGENTS-with-skill.md");

// Embedded spec template
const SPEC_TEMPLATE: &str = include_str!("../../templates/spec-template.md");

pub struct InitOptions {
    pub yes: bool,
    pub example: Option<String>,
    pub no_ai_tools: bool,
    pub no_mcp: bool,
    pub skill: bool,
    pub skill_github: bool,
    pub skill_claude: bool,
    pub skill_cursor: bool,
    pub skill_codex: bool,
    pub skill_gemini: bool,
    pub skill_vscode: bool,
    pub skill_user: bool,
    pub no_skill: bool,
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

    // Detect AI tools first (needed for skills and symlinks)
    let registry =
        RunnerRegistry::load(&root).map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    let ai_detections = detect_ai_tools(&registry, None);

    // Determine if skills will be installed (before actual installation)
    let will_install_skills = decide_skill_install(&options)?;

    // Core filesystem scaffolding
    scaffold_specs(&root, &specs_path)?;
    let config_dir = root.join(".lean-spec");
    scaffold_config(&config_dir)?;
    scaffold_templates(&config_dir)?;
    scaffold_agents(&root, &project_name, will_install_skills)?;

    // New: AI tool + MCP onboarding
    handle_ai_symlinks(&root, &registry, &ai_detections, &options)?;
    handle_mcp_configs(&root, &options)?;
    handle_skills_install(will_install_skills)?;

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

fn scaffold_example(
    specs_dir: &str,
    options: &InitOptions,
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

    let original_dir = root;
    std::env::set_current_dir(&target_dir)?;
    let init_result = run_standard_init(
        specs_dir,
        InitOptions {
            yes: true,
            example: None,
            no_ai_tools: options.no_ai_tools,
            no_mcp: options.no_mcp,
            skill: options.skill,
            skill_github: options.skill_github,
            skill_claude: options.skill_claude,
            skill_cursor: options.skill_cursor,
            skill_codex: options.skill_codex,
            skill_gemini: options.skill_gemini,
            skill_vscode: options.skill_vscode,
            skill_user: options.skill_user,
            no_skill: options.no_skill,
        },
    );
    std::env::set_current_dir(&original_dir)?;
    init_result?;

    println!();
    println!("Next steps:");
    println!("  1. cd {}", example_name.cyan());
    println!("  2. npm install");
    println!("  3. npm start");

    Ok(())
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
        fs::write(archived_dir.join(".gitkeep"), "")?;
        println!("{} Created archived directory", "✓".green());
    }

    Ok(())
}

fn resolve_examples_dir() -> Result<PathBuf, Box<dyn Error>> {
    let exe_path = std::env::current_exe()?;
    let exe_dir = exe_path
        .parent()
        .ok_or("Unable to resolve CLI binary directory")?;

    let mut current = Some(exe_dir);
    while let Some(dir) = current {
        let candidate = dir.join("templates").join("examples");
        if candidate.exists() {
            return Ok(candidate);
        }

        let workspace_candidate = dir
            .join("packages")
            .join("cli")
            .join("templates")
            .join("examples");
        if workspace_candidate.exists() {
            return Ok(workspace_candidate);
        }

        current = dir.parent();
    }

    Err("Example templates directory not found.".into())
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
                    .unwrap_or(false)
            })
            .peekable();

        if entries.peek().is_some() {
            return Err("Target directory must be empty.".into());
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

fn scaffold_config(config_dir: &Path) -> Result<(), Box<dyn Error>> {
    let config_file = config_dir.join("config.json");
    if !config_file.exists() {
        let default_config = r#"{
  "specsDir": "specs",
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

fn scaffold_agents(
    root: &Path,
    project_name: &str,
    skills_installed: bool,
) -> Result<(), Box<dyn Error>> {
    let agents_path = root.join("AGENTS.md");
    if !agents_path.exists() {
        // Use with-skill template when skills are installed (SKILL.md provides SDD workflow)
        let template = if skills_installed {
            AGENTS_MD_TEMPLATE_WITH_SKILL
        } else {
            AGENTS_MD_TEMPLATE_DETAILED
        };
        let agents_content = template.replace("{project_name}", project_name);
        fs::write(&agents_path, agents_content)?;
        let msg = if skills_installed {
            "Created AGENTS.md (SKILL.md provides SDD workflow)"
        } else {
            "Created AGENTS.md"
        };
        println!("{} {}", "✓".green(), msg);
    } else {
        println!("{} AGENTS.md already exists (preserved)", "✓".cyan());
    }
    Ok(())
}

fn handle_ai_symlinks(
    root: &Path,
    registry: &RunnerRegistry,
    detections: &[AiDetection],
    options: &InitOptions,
) -> Result<(), Box<dyn Error>> {
    if options.no_ai_tools {
        return Ok(());
    }

    let defaults = default_symlink_selection(detections);
    let symlink_candidates = symlink_capable_runners(registry);
    let default_ids: std::collections::HashSet<String> = defaults.into_iter().collect();

    let selected_symlinks = if options.yes {
        symlink_candidates
            .iter()
            .filter(|runner| default_ids.contains(&runner.id))
            .cloned()
            .collect()
    } else {
        print_ai_detection(detections);

        if symlink_candidates.is_empty() {
            // No symlink-capable tools available, skip prompt
            vec![]
        } else {
            let labels: Vec<String> = symlink_candidates
                .iter()
                .map(|runner| {
                    let file = runner.symlink_file.as_deref().unwrap_or("AGENTS.md");
                    format!("{} ({})", file, runner.display_name())
                })
                .collect();

            let defaults_mask: Vec<bool> = symlink_candidates
                .iter()
                .map(|runner| default_ids.contains(&runner.id))
                .collect();

            let selected_indexes = MultiSelect::new()
                .with_prompt("Create symlinks for AI tools?")
                .items(&labels)
                .defaults(&defaults_mask)
                .interact()?;

            selected_indexes
                .into_iter()
                .map(|i| symlink_candidates[i].clone())
                .collect()
        }
    };

    if selected_symlinks.is_empty() {
        return Ok(());
    }

    let results = create_symlinks(root, &selected_symlinks);
    for result in results {
        if result.created {
            if let Some(err) = result.error {
                println!(
                    "{} {} ({}): {}",
                    "✓".green(),
                    result.file,
                    "copy".yellow(),
                    err
                );
            } else {
                println!("{} Created {} → AGENTS.md", "✓".green(), result.file);
            }
        } else if result.skipped {
            println!("{} {} already exists (skipped)", "•".cyan(), result.file);
        } else if let Some(err) = result.error {
            println!("{} Failed to create {}: {}", "✗".red(), result.file, err);
        }
    }

    Ok(())
}

fn handle_mcp_configs(root: &Path, options: &InitOptions) -> Result<(), Box<dyn Error>> {
    if options.no_mcp {
        return Ok(());
    }

    let detections = detect_mcp_tools(root);
    let defaults = default_mcp_selection(&detections);
    let available = all_mcp_tools();

    let selected = if options.yes {
        defaults
    } else {
        if detections.iter().any(|d| d.detected) {
            println!("\n{}", "Detected MCP-compatible tools:".cyan());
            for detection in detections.iter().filter(|d| d.detected) {
                println!(
                    "  • {}: {}",
                    detection.tool.name(),
                    detection
                        .reasons
                        .join(", ")
                        .if_empty(|| "detected".to_string())
                );
            }
        } else {
            println!("\n{}", "No MCP-compatible tools detected".yellow());
        }

        let labels: Vec<String> = available
            .iter()
            .map(|tool| tool.name().to_string())
            .collect();
        let defaults_mask: Vec<bool> = available
            .iter()
            .map(|tool| defaults.contains(tool))
            .collect();

        let selected_indexes = MultiSelect::new()
            .with_prompt("Configure MCP server entries for which tools?")
            .items(&labels)
            .defaults(&defaults_mask)
            .interact()?;
        selected_indexes.into_iter().map(|i| available[i]).collect()
    };

    if selected.is_empty() {
        return Ok(());
    }

    let results = configure_mcp(root, &selected);
    for result in results {
        let path_display = result.config_path.display();
        if result.created {
            println!(
                "{} {}: Created {}",
                "✓".green(),
                result.tool.name(),
                path_display
            );
        } else if result.merged {
            println!(
                "{} {}: Added lean-spec to {}",
                "✓".green(),
                result.tool.name(),
                path_display
            );
        } else if result.skipped {
            println!(
                "{} {}: Already configured in {}",
                "•".cyan(),
                result.tool.name(),
                path_display
            );
        } else if let Some(err) = result.error {
            println!("{} {}: {}", "✗".red(), result.tool.name(), err);
        }
    }

    Ok(())
}

/// Determines if skills will be installed based on options and detections
fn decide_skill_install(options: &InitOptions) -> Result<bool, Box<dyn Error>> {
    if options.no_skill {
        return Ok(false);
    }

    let location_flags = options.skill_github
        || options.skill_claude
        || options.skill_cursor
        || options.skill_codex
        || options.skill_gemini
        || options.skill_vscode
        || options.skill_user;

    if location_flags {
        println!(
            "{} Skill location flags are ignored when using skills.sh.",
            "⚠".yellow()
        );
    }

    if options.skill || location_flags {
        return Ok(true);
    }

    if options.yes {
        return Ok(true);
    }

    let confirm = Confirm::new()
        .with_prompt("Install LeanSpec agent skills? (recommended)")
        .default(true)
        .interact()?;

    Ok(confirm)
}

fn handle_skills_install(install_skills: bool) -> Result<(), Box<dyn Error>> {
    if !install_skills {
        return Ok(());
    }

    println!("\n{}", "Installing agent skills...".cyan());
    if let Err(err) = skill::install() {
        println!("{} Failed to install agent skills: {}", "⚠".yellow(), err);
        println!("{} You can retry with: lean-spec skill install", "•".cyan());
    }

    Ok(())
}

fn print_ai_detection(detections: &[AiDetection]) {
    let detected_tools: Vec<_> = detections.iter().filter(|d| d.detected).collect();

    if detected_tools.is_empty() {
        println!("\n{}", "No AI tools detected".yellow());
        return;
    }

    println!("\n{}", "Detected AI tools:".cyan());
    for detection in detected_tools {
        if let Some(file) = &detection.runner.symlink_file {
            println!("  • {} ({})", detection.runner.display_name(), file);
        } else {
            println!("  • {}", detection.runner.display_name());
        }
        for reason in &detection.reasons {
            println!("    └─ {}", reason);
        }
    }
}

trait IfEmpty {
    fn if_empty(self, alt: impl FnOnce() -> Self) -> Self;
}

impl IfEmpty for String {
    fn if_empty(self, alt: impl FnOnce() -> Self) -> Self {
        if self.is_empty() {
            alt()
        } else {
            self
        }
    }
}
