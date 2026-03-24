//! Git repository integration CLI commands
//!
//! Uses the system `git` binary — works with any Git host.

use colored::Colorize;
use leanspec_core::git::{CloneManager, RemoteRef};
use std::error::Error;

#[allow(dead_code)] // token fields kept for CLI backward compat
pub enum GitHubCommand {
    /// Detect specs in a Git repository
    Detect {
        repo: String,
        branch: Option<String>,
        token: Option<String>,
    },
    /// Import a Git repo as a LeanSpec project
    Import {
        repo: String,
        branch: Option<String>,
        name: Option<String>,
        token: Option<String>,
    },
    /// List user's GitHub repos (no longer supported — use the web UI)
    Repos { token: Option<String> },
}

pub fn run(cmd: GitHubCommand, output_format: &str) -> Result<(), Box<dyn Error>> {
    match cmd {
        GitHubCommand::Detect {
            repo,
            branch,
            token: _,
        } => detect(&repo, branch.as_deref(), output_format),
        GitHubCommand::Import {
            repo,
            branch,
            name,
            token: _,
        } => import(&repo, branch.as_deref(), name.as_deref(), output_format),
        GitHubCommand::Repos { .. } => {
            println!(
                "{} The 'repos' subcommand has been removed.",
                "!".yellow().bold()
            );
            println!("  Repository listing required a GitHub API token.");
            println!("  You can now import any git repo directly:");
            println!("  {}", "lean-spec github import <url-or-owner/repo>".cyan());
            Ok(())
        }
    }
}

fn detect(repo: &str, branch: Option<&str>, output_format: &str) -> Result<(), Box<dyn Error>> {
    let remote_ref = RemoteRef::parse(repo)
        .ok_or_else(|| format!("Invalid repo: '{}'. Use owner/repo or a git URL", repo))?;

    let result = CloneManager::detect_specs(&remote_ref.url, branch)?;

    if output_format == "json" {
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    match result {
        Some(detection) => {
            println!(
                "{} Found {} specs in {} (branch: {})",
                "✓".green().bold(),
                detection.spec_count,
                remote_ref.display_name.bold(),
                detection.branch
            );
            println!("  Specs directory: {}", detection.specs_dir.bold());
            println!();

            for spec in &detection.specs {
                let status = spec.status.as_deref().unwrap_or("unknown");
                let title = spec.title.as_deref().unwrap_or("(no title)");
                println!("  {} {} [{}]", spec.path.bold(), title, status.dimmed());
            }

            if detection.spec_count > detection.specs.len() {
                println!(
                    "  ... and {} more",
                    detection.spec_count - detection.specs.len()
                );
            }

            println!();
            println!(
                "To import: {}",
                format!("lean-spec github import {}", repo).cyan()
            );
        }
        None => {
            println!(
                "{} No specs found in {}",
                "✗".red().bold(),
                remote_ref.display_name
            );
            println!("  Looked for: specs/, .lean-spec/specs/, doc/specs/, docs/specs/");
        }
    }

    Ok(())
}

fn import(
    repo: &str,
    branch: Option<&str>,
    name: Option<&str>,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let remote_ref = RemoteRef::parse(repo)
        .ok_or_else(|| format!("Invalid repo: '{}'. Use owner/repo or a git URL", repo))?;

    // Detect specs
    let detection = CloneManager::detect_specs(&remote_ref.url, branch)?
        .ok_or_else(|| format!("No specs found in '{}'", repo))?;

    // Compute clone directory
    let clone_dir = {
        let slug: String = remote_ref
            .url
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' {
                    c
                } else {
                    '_'
                }
            })
            .collect();
        leanspec_core::storage::config::config_dir()
            .join("repos")
            .join(slug)
    };

    // Clone the repository
    if !CloneManager::is_valid_clone(&clone_dir) {
        let config = leanspec_core::git::CloneConfig {
            remote_url: remote_ref.url.clone(),
            branch: Some(detection.branch.clone()),
            specs_path: Some(detection.specs_dir.clone()),
            clone_dir: clone_dir.clone(),
        };
        CloneManager::clone_repo(&config)?;
    }

    // Register in project registry
    let mut registry = leanspec_core::storage::project_registry::ProjectRegistry::new()?;
    let project = registry.add_git(
        &remote_ref.url,
        &detection.branch,
        &detection.specs_dir,
        &clone_dir,
        name.or(Some(&remote_ref.display_name)),
    )?;

    if output_format == "json" {
        let result = serde_json::json!({
            "projectId": project.id,
            "projectName": project.name,
            "remoteUrl": remote_ref.url,
            "branch": detection.branch,
            "specsPath": detection.specs_dir,
            "specCount": detection.spec_count,
        });
        println!("{}", serde_json::to_string_pretty(&result)?);
        return Ok(());
    }

    println!(
        "{} Imported {} as project '{}'",
        "✓".green().bold(),
        remote_ref.display_name.bold(),
        project.name
    );
    println!("  Branch: {}", detection.branch);
    println!("  Specs dir: {}", detection.specs_dir);
    println!("  Specs: {}", detection.spec_count);
    println!("  Clone: {}", clone_dir.display().to_string().dimmed());

    Ok(())
}
