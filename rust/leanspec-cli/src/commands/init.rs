use colored::Colorize;
use dialoguer::{Confirm, Input, MultiSelect};
use serde_json::Value;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

use crate::commands::package_manager::detect_package_manager;

mod ai_tools;
mod opencode_config;
use crate::commands::skill;
use ai_tools::{
    create_symlinks, default_symlink_selection, detect_ai_tools, symlink_capable_runners,
    DetectionResult as AiDetection,
};
use leanspec_core::sessions::RunnerRegistry;
use opencode_config::configure_opencode;

// Embedded AGENTS.md templates
const AGENTS_MD_TEMPLATE_DETAILED: &str = include_str!("../../templates/AGENTS.md");
const AGENTS_MD_TEMPLATE_WITH_SKILL: &str = include_str!("../../templates/AGENTS-with-skill.md");

// Embedded spec template
const SPEC_TEMPLATE: &str = include_str!("../../templates/spec-template.md");

pub struct InitOptions {
    pub yes: bool,
    pub example: Option<String>,
    pub no_ai_tools: bool,
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
    let ai_detections = detect_ai_tools(&registry, &root, None);

    let draft_status_enabled = if options.yes {
        false
    } else {
        Confirm::new()
            .with_prompt("Enable draft status for human review workflow?")
            .default(false)
            .interact()?
    };

    // Determine if skills will be installed (before actual installation)
    let will_install_skills = decide_skill_install(&options)?;

    // Core filesystem scaffolding
    scaffold_specs(&root, &specs_path)?;
    let config_dir = root.join(".lean-spec");
    scaffold_config(&config_dir, draft_status_enabled)?;
    scaffold_templates(&config_dir)?;
    scaffold_agents(&root, &project_name, will_install_skills)?;

    // AI tool onboarding
    handle_ai_symlinks(&root, &registry, &ai_detections, &options)?;
    handle_opencode_config(&root, &ai_detections, &options)?;
    handle_skills_install(will_install_skills, &ai_detections)?;

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

    let initial_dir = root;
    std::env::set_current_dir(&target_dir)?;
    let init_result = run_standard_init(
        specs_dir,
        InitOptions {
            yes: true,
            example: None,
            no_ai_tools: options.no_ai_tools,
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

    // prefer start scripts since they map to production-like entry points.
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
                    // Treat non-UTF-8 names as real entries that prevent an empty directory.
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

fn handle_opencode_config(
    root: &Path,
    detections: &[AiDetection],
    options: &InitOptions,
) -> Result<(), Box<dyn Error>> {
    if options.no_ai_tools {
        return Ok(());
    }

    let opencode_detected = detections
        .iter()
        .find(|detection| detection.runner.id == "opencode")
        .is_some_and(|detection| detection.detected);

    if !opencode_detected {
        return Ok(());
    }

    let should_configure = if options.yes {
        true
    } else {
        Confirm::new()
            .with_prompt("Create opencode.json for OpenCode MCP integration?")
            .default(true)
            .interact()?
    };

    if !should_configure {
        return Ok(());
    }

    let result = configure_opencode(root);
    if result.created {
        println!("{} Created {}", "✓".green(), result.config_path.display());
    } else if result.merged {
        println!("{} Updated {}", "✓".green(), result.config_path.display());
    } else if result.skipped {
        println!(
            "{} {} already has LeanSpec MCP configured",
            "•".cyan(),
            result.config_path.display()
        );
    } else if let Some(error) = result.error {
        println!(
            "{} Failed to configure {}: {}",
            "✗".red(),
            result.config_path.display(),
            error
        );
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

// Use the shared mapping from skill module
use crate::commands::skill::runner_to_skills_agent;

fn handle_skills_install(
    install_skills: bool,
    detections: &[AiDetection],
) -> Result<(), Box<dyn Error>> {
    if !install_skills {
        return Ok(());
    }

    // Convert detected AI tools to skills.sh agent names
    let agents: Vec<String> = detections
        .iter()
        .filter(|d| d.detected)
        .filter_map(|d| runner_to_skills_agent(&d.runner.id))
        .map(|s| s.to_string())
        .collect();

    println!("\n{}", "Installing agent skills...".cyan());
    if !agents.is_empty() {
        println!(
            "{} Installing to detected tools: {}",
            "•".cyan(),
            agents.join(", ")
        );
    }

    // Pass None if no agents detected (will install to all), otherwise pass the list
    let agents_opt = if agents.is_empty() {
        None
    } else {
        Some(agents.as_slice())
    };

    if let Err(err) = skill::install(agents_opt, true) {
        println!("{} Failed to install agent skills: {}", "⚠".yellow(), err);
        println!(
            "{} You can retry with: npx skills add codervisor/lean-spec --skill leanspec-sdd",
            "•".cyan()
        );
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
