use colored::Colorize;
use dialoguer::{Confirm, Input};
use serde_json::Value;
use std::error::Error;
use std::fs;
use std::io::IsTerminal;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::WalkDir;

use crate::commands::package_manager::detect_package_manager;

// Embedded AGENTS.md templates
const AGENTS_MD_TEMPLATE_DETAILED: &str = include_str!("../../templates/AGENTS.md");
const AGENTS_MD_TEMPLATE_GENERIC: &str = include_str!("../../templates/AGENTS-generic.md");

// Embedded spec template
const SPEC_TEMPLATE: &str = include_str!("../../templates/spec-template.md");

const VALID_ADAPTERS: &[&str] = &["markdown", "github", "ado", "jira"];

pub struct InitOptions {
    pub yes: bool,
    pub example: Option<String>,
    pub adapter: String,
    pub owner_repo: Option<String>,
    /// Environment variable that holds the API token. When `None`, defaults
    /// per adapter: `GITHUB_TOKEN` for github, `JIRA_TOKEN` for jira.
    pub token_env: Option<String>,
    pub jira_host: Option<String>,
    pub jira_project: Option<String>,
    pub jira_email: Option<String>,
}

pub fn run(specs_dir: &str, options: InitOptions) -> Result<(), Box<dyn Error>> {
    if let Some(example_name) = options.example.as_deref() {
        return scaffold_example(specs_dir, &options, example_name);
    }

    match options.adapter.as_str() {
        "markdown" => run_standard_init(specs_dir, options),
        "github" => run_github_init(options),
        "ado" => run_ado_init(options),
        "jira" => run_jira_init(options),
        other => Err(format!(
            "Unknown adapter '{}'. Valid adapters: {}",
            other,
            VALID_ADAPTERS.join(", ")
        )
        .into()),
    }
}

fn resolved_token_env(options: &InitOptions, default: &str) -> String {
    options
        .token_env
        .clone()
        .unwrap_or_else(|| default.to_string())
}

#[allow(dead_code)]
fn print_coming_soon(label: &str) {
    println!("{} adapter support coming soon.", label);
    println!(
        "Run `{}` or `{}`.",
        "leanspec init --adapter github".cyan(),
        "leanspec init --adapter markdown".cyan()
    );
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
            adapter: "markdown".to_string(),
            owner_repo: None,
            token_env: None,
            jira_host: None,
            jira_project: None,
            jira_email: None,
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

    // Create .lean-spec/schemas/ for custom schema bundles (issue #275).
    let schemas_dir = config_dir.join("schemas");
    if !schemas_dir.exists() {
        fs::create_dir_all(&schemas_dir)?;
        println!(
            "{} Created custom schemas directory: {}",
            "✓".green(),
            schemas_dir.display()
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

// ─────────────────────────────────────────────────────────────────────────────
// GitHub adapter initialization
// ─────────────────────────────────────────────────────────────────────────────

fn run_github_init(options: InitOptions) -> Result<(), Box<dyn Error>> {
    println!();
    println!("{}", "Initializing GitHub Issues adapter...".bold());
    println!();

    let token_env = resolved_token_env(&options, "GITHUB_TOKEN");
    let cwd = std::env::current_dir()?;
    let root = find_project_root(&cwd);

    // 1. Detect/prompt for owner/repo.
    let (owner, repo) = resolve_owner_repo(&root, &options)?;
    println!(
        "{} Using repository: {}/{}",
        "✓".green(),
        owner.cyan(),
        repo.cyan()
    );

    // 2. Read and validate the token.
    let token = read_token(&token_env)?;
    println!(
        "{} Found {} ({} chars)",
        "✓".green(),
        token_env.cyan(),
        token.len()
    );

    print!(
        "  Validating token against {}/{}... ",
        owner.cyan(),
        repo.cyan()
    );
    // Flush so the "Validating..." line shows up *before* the synchronous HTTP
    // call rather than appearing only after the call returns.
    let _ = std::io::Write::flush(&mut std::io::stdout());
    match leanspec_core::adapters::github::validate_token(&token, None) {
        Ok(info) => {
            println!(
                "{} authenticated as {}",
                "✓".green(),
                format!("@{}", info.user_login).cyan()
            );
            if !info.scopes.is_empty() && !info.has_repo_scope() {
                println!(
                    "{} Token lacks 'repo' scope; some operations may be \
                     read-only. Scopes: {}",
                    "⚠".yellow(),
                    info.scopes.join(", ")
                );
            }
        }
        Err(err) => {
            return Err(format!(
                "GitHub token validation failed: {}\n\n\
                 Set a valid token and re-run:\n\n  \
                 export {}=ghp_...\n\n\
                 See https://docs.github.com/tokens for how to create one.",
                err, token_env
            )
            .into());
        }
    }

    // 3. Write `leanspec.adapter.yaml` to the project root.
    write_github_adapter_yaml(&root, &owner, &repo, &token_env)?;

    // 4. Write the adapter-agnostic AGENTS.md.
    let project_name = root
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("project");
    scaffold_generic_agents(&root, project_name)?;

    println!();
    println!("{}", "Done.".green().bold());
    println!(
        "Run `{}` to see available operations.",
        "leanspec capabilities".cyan()
    );

    Ok(())
}

fn resolve_owner_repo(
    root: &Path,
    options: &InitOptions,
) -> Result<(String, String), Box<dyn Error>> {
    // Explicit CLI override wins.
    if let Some(spec) = options.owner_repo.as_deref() {
        return parse_owner_repo(spec).ok_or_else(|| {
            format!("--owner-repo must be in 'owner/repo' format, got '{spec}'").into()
        });
    }

    let detected = detect_github_remote(root);
    let interactive = !options.yes && std::io::stdin().is_terminal();

    match (detected.clone(), interactive) {
        (Some((owner, repo)), true) => {
            println!(
                "{} Detected remote: github.com/{}/{}",
                "✓".green(),
                owner,
                repo
            );
            let default = format!("{}/{}", owner, repo);
            let input: String = Input::new()
                .with_prompt("Owner/repo (Enter to accept)")
                .default(default.clone())
                .allow_empty(true)
                .interact_text()?;
            let trimmed = input.trim();
            if trimmed.is_empty() {
                Ok((owner, repo))
            } else {
                parse_owner_repo(trimmed)
                    .ok_or_else(|| format!("expected 'owner/repo' format, got '{trimmed}'").into())
            }
        }
        (Some(pair), false) => Ok(pair),
        (None, true) => {
            println!("{} No GitHub remote detected.", "⚠".yellow());
            let input: String = Input::new()
                .with_prompt("Owner/repo (e.g. acme/backend)")
                .interact_text()?;
            parse_owner_repo(input.trim()).ok_or_else(|| {
                format!("expected 'owner/repo' format, got '{}'", input.trim()).into()
            })
        }
        (None, false) => Err("Could not detect a GitHub remote and no \
            --owner-repo was provided. Pass --owner-repo owner/repo or run \
            inside a git repository with a github.com remote."
            .into()),
    }
}

/// Parse `git remote get-url origin` and extract the (owner, repo) pair.
/// Supports HTTPS (`https://github.com/owner/repo.git`) and SSH
/// (`git@github.com:owner/repo.git`) URLs.
pub(crate) fn detect_github_remote(root: &Path) -> Option<(String, String)> {
    let output = Command::new("git")
        .args(["-C", &root.to_string_lossy(), "remote", "get-url", "origin"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    parse_github_url(&url)
}

/// Best-effort parser for GitHub remote URLs. Returns None on non-GitHub
/// hosts so the caller can fall back to prompting.
pub(crate) fn parse_github_url(url: &str) -> Option<(String, String)> {
    let url = url.trim();

    // SSH: git@github.com:owner/repo(.git)?
    if let Some(rest) = url.strip_prefix("git@github.com:") {
        return parse_owner_repo(rest.trim_end_matches(".git"));
    }
    if let Some(rest) = url.strip_prefix("ssh://git@github.com/") {
        return parse_owner_repo(rest.trim_end_matches(".git"));
    }

    // HTTPS: https://github.com/owner/repo(.git)?
    for prefix in [
        "https://github.com/",
        "http://github.com/",
        "https://www.github.com/",
    ] {
        if let Some(rest) = url.strip_prefix(prefix) {
            return parse_owner_repo(rest.trim_end_matches('/').trim_end_matches(".git"));
        }
    }

    None
}

pub(crate) fn parse_owner_repo(spec: &str) -> Option<(String, String)> {
    let spec = spec.trim();
    let (owner, repo) = spec.split_once('/')?;
    let owner = owner.trim();
    // Reject anything beyond a single owner/repo segment.
    let repo = repo.trim().trim_end_matches('/');
    if owner.is_empty() || repo.is_empty() || repo.contains('/') {
        return None;
    }
    Some((owner.to_string(), repo.to_string()))
}

fn read_token(token_env: &str) -> Result<String, Box<dyn Error>> {
    // Trim because shell pipelines like `export X=$(cat token.txt)` commonly
    // leave a trailing newline, which would otherwise fail at HTTP-header
    // construction with a confusing "not a valid header value" error.
    match std::env::var(token_env) {
        Ok(t) if !t.trim().is_empty() => Ok(t.trim().to_string()),
        _ => Err(format!(
            "{} not found in environment.\n\nSet it and re-run:\n\n  \
             export {}=...\n",
            token_env, token_env
        )
        .into()),
    }
}

fn run_ado_init(options: InitOptions) -> Result<(), Box<dyn Error>> {
    println!();
    println!("{}", "Initializing Azure DevOps adapter...".bold());
    println!();

    let cwd = std::env::current_dir()?;
    let root = find_project_root(&cwd);

    // When the user didn't override `--token-env`, the ADO default is
    // `ADO_TOKEN`.
    let token_env = resolved_token_env(&options, "ADO_TOKEN");

    // 1. Prompt for / parse organization + project.
    let (org, project) = resolve_ado_org_project(&options)?;
    println!(
        "{} Using ADO project: {}/{}",
        "✓".green(),
        org.cyan(),
        project.cyan()
    );

    // 2. Read and validate the PAT.
    let token = read_ado_token(&token_env)?;
    println!(
        "{} Found {} ({} chars)",
        "✓".green(),
        token_env.cyan(),
        token.len()
    );

    print!(
        "  Validating token against {}/{}... ",
        org.cyan(),
        project.cyan()
    );
    let _ = std::io::Write::flush(&mut std::io::stdout());
    match leanspec_core::adapters::ado::validate_token(&token, &org, &project, None) {
        Ok(info) => {
            println!(
                "{} ({} project{} visible)",
                "✓".green(),
                info.project_count,
                if info.project_count == 1 { "" } else { "s" }
            );
            if !info.project_found {
                println!(
                    "{} Project '{}' was not found in '{}'. Double-check the \
                     name (it is case-sensitive) and re-run.",
                    "⚠".yellow(),
                    project,
                    org
                );
            }
        }
        Err(err) => {
            return Err(format!(
                "ADO token validation failed: {}\n\n\
                 Set a valid PAT and re-run:\n\n  \
                 export {}=...\n\n\
                 The PAT needs the 'Work Items (read & write)' scope, plus \
                 'Project and Team (read)' so `leanspec capabilities` can \
                 enumerate the project's work item type states.\n\
                 See https://learn.microsoft.com/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate \
                 for how to create one.",
                err, token_env
            )
            .into());
        }
    }

    // 3. Write `leanspec.adapter.yaml`.
    write_ado_adapter_yaml(&root, &org, &project, &token_env)?;

    // 4. Write the adapter-agnostic AGENTS.md.
    let project_name = root
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("project");
    scaffold_generic_agents(&root, project_name)?;

    println!();
    println!("{}", "Done.".green().bold());
    println!(
        "Run `{}` to see available operations.",
        "leanspec capabilities".cyan()
    );

    Ok(())
}

fn resolve_ado_org_project(options: &InitOptions) -> Result<(String, String), Box<dyn Error>> {
    // Re-use the `--owner-repo` arg as `--owner-repo org/project` for ADO
    // so the CLI surface stays small; an explicit value wins.
    if let Some(spec) = options.owner_repo.as_deref() {
        return parse_owner_repo(spec).ok_or_else(|| {
            format!("--owner-repo for ADO must be in 'organization/project' format, got '{spec}'")
                .into()
        });
    }

    let interactive = !options.yes && std::io::stdin().is_terminal();
    if !interactive {
        return Err("No --owner-repo provided for ADO. Pass --owner-repo \
            organization/project (or run interactively to be prompted)."
            .into());
    }

    let org: String = Input::new()
        .with_prompt("ADO organization (e.g. myorg)")
        .interact_text()?;
    let org = org.trim().to_string();
    if org.is_empty() {
        return Err("organization must not be empty".into());
    }
    let project: String = Input::new()
        .with_prompt("ADO project (e.g. MyProject)")
        .interact_text()?;
    let project = project.trim().to_string();
    if project.is_empty() {
        return Err("project must not be empty".into());
    }
    Ok((org, project))
}

fn read_ado_token(token_env: &str) -> Result<String, Box<dyn Error>> {
    // Trim because shell pipelines commonly leave a trailing newline. The
    // adapter validates against control chars but a friendly trim here keeps
    // the error message focused on actually-missing tokens.
    match std::env::var(token_env) {
        Ok(t) if !t.trim().is_empty() => Ok(t.trim().to_string()),
        _ => Err(format!(
            "{} not found in environment.\n\nSet it and re-run, or export it now:\n\n  \
             export {}=...\n\nSee https://learn.microsoft.com/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate \
             for how to create a PAT.",
            token_env, token_env
        )
        .into()),
    }
}

fn write_ado_adapter_yaml(
    root: &Path,
    org: &str,
    project: &str,
    token_env: &str,
) -> Result<(), Box<dyn Error>> {
    let path = root.join("leanspec.adapter.yaml");
    if path.exists() {
        println!(
            "{} {} already exists (preserved)",
            "✓".cyan(),
            path.display()
        );
        return Ok(());
    }

    let mut body = String::from("# Written by leanspec init --adapter ado\n");
    body.push_str("adapter: ado\n");
    body.push_str("settings:\n");
    body.push_str(&format!("  organization: {}\n", org));
    body.push_str(&format!("  project: {}\n", project));
    if token_env == "ADO_TOKEN" {
        body.push_str(
            "  # token_env defaults to ADO_TOKEN; override if needed:\n  \
             # token_env: MY_CUSTOM_TOKEN_VAR\n",
        );
    } else {
        body.push_str(&format!("  token_env: {}\n", token_env));
    }

    fs::write(&path, body)?;
    println!("{} Wrote {}", "✓".green(), path.display());
    Ok(())
}

fn write_github_adapter_yaml(
    root: &Path,
    owner: &str,
    repo: &str,
    token_env: &str,
) -> Result<(), Box<dyn Error>> {
    let path = root.join("leanspec.adapter.yaml");
    if path.exists() {
        println!(
            "{} {} already exists (preserved)",
            "✓".cyan(),
            path.display()
        );
        return Ok(());
    }

    let mut body = String::from("# Written by leanspec init --adapter github\n");
    body.push_str("adapter: github\n");
    body.push_str("settings:\n");
    body.push_str(&format!("  owner: {}\n", owner));
    body.push_str(&format!("  repo: {}\n", repo));
    if token_env == "GITHUB_TOKEN" {
        body.push_str(
            "  # token_env defaults to GITHUB_TOKEN; override if needed:\n  \
             # token_env: MY_CUSTOM_TOKEN_VAR\n",
        );
    } else {
        body.push_str(&format!("  token_env: {}\n", token_env));
    }

    fs::write(&path, body)?;
    println!("{} Wrote {}", "✓".green(), path.display());
    Ok(())
}

fn scaffold_generic_agents(root: &Path, project_name: &str) -> Result<(), Box<dyn Error>> {
    let agents_path = root.join("AGENTS.md");
    if agents_path.exists() {
        println!("{} AGENTS.md already exists (preserved)", "✓".cyan());
        return Ok(());
    }
    let content = AGENTS_MD_TEMPLATE_GENERIC.replace("{project_name}", project_name);
    fs::write(&agents_path, content)?;
    println!("{} Created AGENTS.md", "✓".green());
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Jira adapter initialization
// ─────────────────────────────────────────────────────────────────────────────

fn run_jira_init(options: InitOptions) -> Result<(), Box<dyn Error>> {
    println!();
    println!("{}", "Initializing Jira adapter...".bold());
    println!();

    let token_env = resolved_token_env(&options, "JIRA_TOKEN");
    let cwd = std::env::current_dir()?;
    let root = find_project_root(&cwd);

    // 1. Resolve host, project, email — CLI overrides win, then prompt.
    let host = prompt_required(
        options.jira_host.clone(),
        "Jira host (e.g. mycompany.atlassian.net)",
        options.yes,
    )?;
    let project = prompt_required(
        options.jira_project.clone(),
        "Jira project key (e.g. PROJ)",
        options.yes,
    )?;
    let email = prompt_required(
        options.jira_email.clone(),
        "Authenticating account email",
        options.yes,
    )?;
    println!(
        "{} Using {} / project {} as {}",
        "✓".green(),
        host.cyan(),
        project.cyan(),
        email.cyan(),
    );

    // 2. Read and validate the token.
    let token = read_token(&token_env)?;
    println!(
        "{} Found {} ({} chars)",
        "✓".green(),
        token_env.cyan(),
        token.len()
    );

    print!("  Validating token against {}... ", host.cyan());
    let _ = std::io::Write::flush(&mut std::io::stdout());
    match leanspec_core::adapters::jira::validate_token(&host, &email, &token, 3, None) {
        Ok(info) => {
            let label = if info.display_name.is_empty() {
                info.account_id.clone()
            } else {
                info.display_name.clone()
            };
            println!("{} authenticated as {}", "✓".green(), label.cyan());
        }
        Err(err) => {
            return Err(format!(
                "Jira token validation failed: {}\n\n\
                 Set a valid token and re-run:\n\n  \
                 export {}=...\n\n\
                 See https://id.atlassian.com/manage-profile/security/api-tokens.",
                err, token_env
            )
            .into());
        }
    }

    // 3. Write `leanspec.adapter.yaml` to the project root.
    write_jira_adapter_yaml(&root, &host, &project, &email, &token_env)?;

    // 4. Write the adapter-agnostic AGENTS.md.
    let project_name = root
        .file_name()
        .and_then(|s| s.to_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("project");
    scaffold_generic_agents(&root, project_name)?;

    println!();
    println!("{}", "Done.".green().bold());
    println!(
        "Run `{}` to see available operations.",
        "leanspec capabilities".cyan()
    );

    Ok(())
}

fn prompt_required(
    cli_value: Option<String>,
    prompt: &str,
    yes: bool,
) -> Result<String, Box<dyn Error>> {
    if let Some(value) = cli_value {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            return Err(format!("{prompt} cannot be empty").into());
        }
        return Ok(trimmed);
    }
    if yes || !std::io::stdin().is_terminal() {
        return Err(format!(
            "{prompt} not provided. Pass --jira-host / --jira-project / --jira-email \
             when running non-interactively."
        )
        .into());
    }
    let input: String = Input::new().with_prompt(prompt).interact_text()?;
    let trimmed = input.trim().to_string();
    if trimmed.is_empty() {
        return Err(format!("{prompt} cannot be empty").into());
    }
    Ok(trimmed)
}

fn write_jira_adapter_yaml(
    root: &Path,
    host: &str,
    project: &str,
    email: &str,
    token_env: &str,
) -> Result<(), Box<dyn Error>> {
    let path = root.join("leanspec.adapter.yaml");
    if path.exists() {
        println!(
            "{} {} already exists (preserved)",
            "✓".cyan(),
            path.display()
        );
        return Ok(());
    }

    let mut body = String::from("# Written by leanspec init --adapter jira\n");
    body.push_str("adapter: jira\n");
    body.push_str("settings:\n");
    body.push_str(&format!("  host: {}\n", host));
    body.push_str(&format!("  project: {}\n", project));
    body.push_str(&format!("  email: {}\n", email));
    if token_env == "JIRA_TOKEN" {
        body.push_str(
            "  # token_env defaults to JIRA_TOKEN; override if needed:\n  \
             # token_env: MY_CUSTOM_TOKEN_VAR\n",
        );
    } else {
        body.push_str(&format!("  token_env: {}\n", token_env));
    }
    body.push_str("  # api_version: 3   # 3 = Cloud (default); 2 = Server / DC\n");

    fs::write(&path, body)?;
    println!("{} Wrote {}", "✓".green(), path.display());
    Ok(())
}

/// Walk up from `start` looking for a `.git` directory; fall back to `start`
/// if none is found. Matches `AdapterRegistry::from_project()` semantics.
fn find_project_root(start: &Path) -> PathBuf {
    let mut current = Some(start);
    while let Some(dir) = current {
        if dir.join(".git").exists() {
            return dir.to_path_buf();
        }
        current = dir.parent();
    }
    start.to_path_buf()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_owner_repo_accepts_simple_pair() {
        assert_eq!(
            parse_owner_repo("acme/backend"),
            Some(("acme".into(), "backend".into()))
        );
    }

    #[test]
    fn parse_owner_repo_strips_trailing_slash_and_whitespace() {
        assert_eq!(
            parse_owner_repo("  acme/backend/  "),
            Some(("acme".into(), "backend".into()))
        );
    }

    #[test]
    fn parse_owner_repo_rejects_extra_segments() {
        assert_eq!(parse_owner_repo("acme/backend/extra"), None);
    }

    #[test]
    fn parse_owner_repo_rejects_missing_repo() {
        assert_eq!(parse_owner_repo("acme/"), None);
        assert_eq!(parse_owner_repo("/backend"), None);
        assert_eq!(parse_owner_repo("acme"), None);
    }

    #[test]
    fn parse_github_url_handles_https() {
        assert_eq!(
            parse_github_url("https://github.com/acme/backend.git"),
            Some(("acme".into(), "backend".into()))
        );
        assert_eq!(
            parse_github_url("https://github.com/acme/backend"),
            Some(("acme".into(), "backend".into()))
        );
        assert_eq!(
            parse_github_url("https://github.com/acme/backend/"),
            Some(("acme".into(), "backend".into()))
        );
    }

    #[test]
    fn parse_github_url_handles_ssh() {
        assert_eq!(
            parse_github_url("git@github.com:acme/backend.git"),
            Some(("acme".into(), "backend".into()))
        );
        assert_eq!(
            parse_github_url("git@github.com:acme/backend"),
            Some(("acme".into(), "backend".into()))
        );
    }

    #[test]
    fn parse_github_url_rejects_non_github_hosts() {
        assert_eq!(
            parse_github_url("https://gitlab.com/acme/backend.git"),
            None
        );
        assert_eq!(parse_github_url("git@bitbucket.org:acme/backend.git"), None);
    }
}
