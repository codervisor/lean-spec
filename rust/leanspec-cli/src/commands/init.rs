use colored::Colorize;
use dialoguer::{Input, MultiSelect};
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

mod ai_tools;
mod mcp_config;
mod skills;

use ai_tools::{
    create_symlinks, default_ai_selection, detect_ai_tools, symlink_capable_tools, AiTool,
    DetectionResult as AiDetection,
};
use mcp_config::{
    all_tools as all_mcp_tools, configure_mcp, default_mcp_selection, detect_mcp_tools,
};
use skills::{
    build_skill_flags_from_cli, default_selection as default_skill_selection,
    discover_targets as discover_skill_targets, install_skill, SkillScope,
};

// Embedded AGENTS.md template
const AGENTS_MD_TEMPLATE: &str =
    include_str!("../../../../packages/cli/templates/standard/AGENTS.md");

// Embedded spec template
const SPEC_TEMPLATE: &str =
    include_str!("../../../../packages/cli/templates/standard/files/README.md");

pub struct InitOptions {
    pub yes: bool,
    pub template: Option<String>,
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
    let root = std::env::current_dir()?;
    let specs_path = to_absolute(&root, specs_dir);

    let detected_name = root
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("project")
        .to_string();

    let default_name = detected_name.clone();
    let _project_name = if options.yes {
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

    // Template selection is intentionally out of scope for this spec
    let _ = options.template.as_ref();

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

    // Core filesystem scaffolding
    scaffold_specs(&root, &specs_path)?;
    let config_dir = root.join(".lean-spec");
    scaffold_config(&config_dir)?;
    scaffold_templates(&config_dir)?;
    scaffold_agents(&root, &detected_name)?;

    // New: AI tool + MCP onboarding
    let ai_detections = detect_ai_tools(None);
    handle_ai_symlinks(&root, &ai_detections, &options)?;
    handle_mcp_configs(&root, &options)?;
    handle_skills_install(&root, &ai_detections, &options)?;

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

fn scaffold_config(config_dir: &Path) -> Result<(), Box<dyn Error>> {
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

fn scaffold_agents(root: &Path, detected_name: &str) -> Result<(), Box<dyn Error>> {
    let agents_path = root.join("AGENTS.md");
    if !agents_path.exists() {
        let agents_content = AGENTS_MD_TEMPLATE.replace("{project_name}", detected_name);
        fs::write(&agents_path, agents_content)?;
        println!("{} Created AGENTS.md", "✓".green());
    } else {
        println!("{} AGENTS.md already exists (preserved)", "✓".cyan());
    }
    Ok(())
}

fn handle_ai_symlinks(
    root: &Path,
    detections: &[AiDetection],
    options: &InitOptions,
) -> Result<(), Box<dyn Error>> {
    if options.no_ai_tools {
        return Ok(());
    }

    let defaults = default_ai_selection(detections);
    let symlink_candidates = symlink_capable_tools();
    let default_symlink_tools: Vec<AiTool> = defaults
        .iter()
        .copied()
        .filter(|tool| tool.uses_symlink())
        .collect();

    if symlink_candidates.is_empty() {
        return Ok(());
    }

    let selected_symlinks = if options.yes {
        default_symlink_tools
    } else {
        print_ai_detection(detections);

        let labels: Vec<String> = symlink_candidates
            .iter()
            .map(|tool| {
                let file = tool.symlink_file().unwrap_or("AGENTS.md");
                format!("{} ({})", file, tool.description())
            })
            .collect();

        let defaults_mask: Vec<bool> = symlink_candidates
            .iter()
            .map(|tool| default_symlink_tools.contains(tool))
            .collect();

        let selected_indexes = MultiSelect::new()
            .with_prompt("Create symlinks for AI tools?")
            .items(&labels)
            .defaults(&defaults_mask)
            .interact()?;

        selected_indexes
            .into_iter()
            .map(|i| symlink_candidates[i])
            .collect()
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

fn handle_skills_install(
    root: &Path,
    detections: &[AiDetection],
    options: &InitOptions,
) -> Result<(), Box<dyn Error>> {
    let flags = build_skill_flags_from_cli(
        options.skill,
        options.no_skill,
        options.skill_github,
        options.skill_claude,
        options.skill_cursor,
        options.skill_codex,
        options.skill_gemini,
        options.skill_vscode,
        options.skill_user,
    );

    if flags.skip {
        return Ok(());
    }

    let candidates = discover_skill_targets(root, None, detections);
    let default_selection = default_skill_selection(&flags, &candidates, root, None);

    let selected = if options.yes || flags.enable {
        default_selection
    } else {
        if !candidates.is_empty() {
            println!("\n{}", "Install LeanSpec agent skills?".cyan());
        }

        let labels: Vec<String> = candidates
            .iter()
            .map(|target| {
                let scope = match target.scope {
                    SkillScope::Project => "project",
                    SkillScope::User => "user",
                };

                let mut label = format!("{} ({})", target.path.display(), scope);
                if target.recommended {
                    label.push_str(" – recommended");
                } else if target.exists {
                    label.push_str(" – detected");
                }
                label
            })
            .collect();

        let defaults_mask: Vec<bool> = candidates
            .iter()
            .map(|target| {
                default_selection
                    .iter()
                    .any(|sel| sel.path == target.path && sel.scope == target.scope)
            })
            .collect();

        let selected_indexes = MultiSelect::new()
            .with_prompt("Select skill installation targets")
            .items(&labels)
            .defaults(&defaults_mask)
            .interact()?;
        selected_indexes
            .into_iter()
            .map(|i| candidates[i].clone())
            .collect()
    };

    if selected.is_empty() {
        return Ok(());
    }

    let results = install_skill(&selected);
    for result in results {
        if result.created {
            println!(
                "{} Installed leanspec-sdd to {}",
                "✓".green(),
                result.path.display()
            );
        } else if result.skipped {
            println!(
                "{} {} already has leanspec-sdd (skipped)",
                "•".cyan(),
                result.path.display()
            );
        } else if let Some(err) = result.error {
            println!(
                "{} Failed to install to {}: {}",
                "✗".red(),
                result.path.display(),
                err
            );
        }
    }

    Ok(())
}

fn print_ai_detection(detections: &[AiDetection]) {
    if detections.is_empty() {
        return;
    }

    println!("\n{}", "Detected AI tools:".cyan());
    for detection in detections.iter().filter(|d| d.detected) {
        println!("  • {}", detection.tool.description());
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
