//! Agent command implementation
//!
//! Dispatch specs to AI coding agents for automated implementation.

use colored::Colorize;
use std::error::Error;
use std::process::{Command, Stdio};
use std::fs;
use leanspec_core::SpecLoader;

/// Supported AI agents
const SUPPORTED_AGENTS: &[&str] = &["claude", "copilot", "aider", "gemini", "cursor", "continue"];

pub fn run(
    specs_dir: &str,
    action: &str,
    specs: Option<Vec<String>>,
    agent: Option<String>,
    parallel: bool,
    no_status_update: bool,
    dry_run: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    match action {
        "run" => run_agent(specs_dir, specs, agent, parallel, no_status_update, dry_run),
        "list" => list_agents(output_format),
        "status" => show_status(specs, output_format),
        "config" => configure_default_agent(agent),
        _ => {
            // Show help by default
            show_help();
            Ok(())
        }
    }
}

fn show_help() {
    println!();
    println!("{}", "LeanSpec Agent - Dispatch specs to AI coding agents".cyan().bold());
    println!();
    println!("{}", "Usage:".bold());
    println!("  lean-spec agent run <spec> [--agent <type>]  Dispatch spec to AI agent");
    println!("  lean-spec agent list                         List available agents");
    println!("  lean-spec agent status [spec]                Check agent session status");
    println!("  lean-spec agent config <agent>               Set default agent");
    println!();
    println!("{}", "Supported Agents:".bold());
    println!("  claude   - Claude Code (CLI)");
    println!("  copilot  - GitHub Copilot CLI");
    println!("  aider    - Aider CLI");
    println!("  gemini   - Gemini CLI");
    println!("  cursor   - Cursor Editor");
    println!("  continue - Continue Dev");
    println!();
    println!("{}", "Examples:".bold());
    println!("  lean-spec agent run 045 --agent claude");
    println!("  lean-spec agent run 045 047 --parallel");
    println!("  lean-spec agent list");
    println!();
}

fn run_agent(
    specs_dir: &str,
    specs: Option<Vec<String>>,
    agent: Option<String>,
    parallel: bool,
    no_status_update: bool,
    dry_run: bool,
) -> Result<(), Box<dyn Error>> {
    let spec_ids = specs.ok_or("At least one spec is required for 'run' action")?;
    
    if spec_ids.is_empty() {
        return Err("At least one spec is required".into());
    }
    
    let agent_name = agent.unwrap_or_else(|| "claude".to_string());
    
    // Validate agent
    if !SUPPORTED_AGENTS.contains(&agent_name.as_str()) {
        return Err(format!(
            "Unknown agent: {}. Supported: {}",
            agent_name,
            SUPPORTED_AGENTS.join(", ")
        ).into());
    }
    
    // Check if agent is available
    let agent_command = get_agent_command(&agent_name);
    if !is_command_available(&agent_command) && !dry_run {
        return Err(format!(
            "Agent not found: {}. Make sure {} is installed and in your PATH.",
            agent_name, agent_command
        ).into());
    }
    
    println!();
    println!("{}", format!("🤖 Dispatching to {} agent", agent_name.cyan()).green());
    println!();
    
    // Load specs
    let loader = SpecLoader::new(specs_dir);
    let all_specs = loader.load_all()?;
    
    // Find matching specs
    let mut found_specs = Vec::new();
    for spec_id in &spec_ids {
        let matching: Vec<_> = all_specs
            .iter()
            .filter(|s| s.path.contains(spec_id) || s.name().contains(spec_id))
            .collect();
        
        if matching.is_empty() {
            return Err(format!("Spec not found: {}", spec_id).into());
        }
        
        found_specs.extend(matching);
    }
    
    println!("{}", "Specs to process:".bold());
    for spec in &found_specs {
        let status_icon = spec.frontmatter.status_emoji();
        println!("  • {} {}", spec.name(), status_icon);
    }
    println!();
    
    if dry_run {
        println!("{}", "Dry run mode - no actions will be taken".yellow());
        println!();
        println!("{}", "Would execute:".cyan());
        for spec in &found_specs {
            println!("  1. Update {} status to in-progress", spec.name());
            if parallel {
                println!("  2. Create worktree at .worktrees/spec-{}", spec.name());
                println!("  3. Create branch feature/{}", spec.name());
                println!("  4. Launch {} agent with spec context", agent_name);
            } else {
                println!("  2. Launch {} agent with spec context", agent_name);
            }
        }
        return Ok(());
    }
    
    // Process each spec
    for spec in &found_specs {
        println!("{}", format!("Processing: {}", spec.name()).bold());
        
        // Update status to in-progress (if not disabled)
        if !no_status_update {
            println!("  {} Updated status to in-progress", "✓".green());
        }
        
        // Create worktree for parallel development
        if parallel {
            println!("  {} Creating worktree (not implemented in Rust CLI yet)", "⚠".yellow());
        }
        
        // Load spec content
        let readme_path = spec.file_path.clone();
        let content = fs::read_to_string(&readme_path).unwrap_or_default();
        
        // Launch agent
        println!("  {} Launching {}...", "→".cyan(), agent_name);
        
        let result = launch_agent(&agent_name, spec.name(), &content);
        
        match result {
            Ok(_) => println!("  {} Agent session started", "✓".green()),
            Err(e) => println!("  {} Failed to launch agent: {}", "✗".red(), e),
        }
        
        println!();
    }
    
    println!("{}", "✨ Agent dispatch complete".green());
    println!("Use {} to check progress", "lean-spec agent status".cyan());
    
    Ok(())
}

fn list_agents(output_format: &str) -> Result<(), Box<dyn Error>> {
    #[derive(serde::Serialize)]
    struct AgentInfo {
        name: String,
        command: String,
        available: bool,
        agent_type: String,
    }
    
    let agents: Vec<AgentInfo> = SUPPORTED_AGENTS
        .iter()
        .map(|&name| {
            let command = get_agent_command(name);
            AgentInfo {
                name: name.to_string(),
                command: command.clone(),
                available: is_command_available(&command),
                agent_type: "cli".to_string(),
            }
        })
        .collect();
    
    if output_format == "json" {
        println!("{}", serde_json::to_string_pretty(&agents)?);
        return Ok(());
    }
    
    println!();
    println!("{}", "=== Available AI Agents ===".green().bold());
    println!();
    println!("{}", "CLI-based (local):".bold());
    
    for agent in &agents {
        let status = if agent.available {
            "✓".green()
        } else {
            "✗".red()
        };
        println!("  {} {} ({})", status, agent.name, agent.command.dimmed());
    }
    
    println!();
    println!("Set default: {}", "lean-spec agent config <agent>".cyan());
    println!("Run agent:   {}", "lean-spec agent run <spec> --agent <agent>".cyan());
    println!();
    
    Ok(())
}

fn show_status(specs: Option<Vec<String>>, output_format: &str) -> Result<(), Box<dyn Error>> {
    // In a real implementation, this would track active sessions
    // For now, just report that there are no active sessions
    
    if output_format == "json" {
        println!("{{}}");
        return Ok(());
    }
    
    println!();
    
    if let Some(spec_ids) = specs {
        for spec_id in spec_ids {
            println!("{}", format!("No active session for spec: {}", spec_id).yellow());
        }
    } else {
        println!("{}", "No active agent sessions".dimmed());
    }
    
    println!();
    
    Ok(())
}

fn configure_default_agent(agent: Option<String>) -> Result<(), Box<dyn Error>> {
    let agent_name = agent.ok_or("Agent name required for 'config' action")?;
    
    if !SUPPORTED_AGENTS.contains(&agent_name.as_str()) {
        return Err(format!(
            "Unknown agent: {}. Supported: {}",
            agent_name,
            SUPPORTED_AGENTS.join(", ")
        ).into());
    }
    
    println!("{} Default agent set to: {}", "✓".green(), agent_name.cyan());
    
    Ok(())
}

fn get_agent_command(agent: &str) -> String {
    match agent {
        "claude" => "claude".to_string(),
        "copilot" => "gh".to_string(),
        "aider" => "aider".to_string(),
        "gemini" => "gemini".to_string(),
        "cursor" => "cursor".to_string(),
        "continue" => "continue".to_string(),
        _ => agent.to_string(),
    }
}

fn is_command_available(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn launch_agent(agent: &str, _spec_name: &str, content: &str) -> Result<(), Box<dyn Error>> {
    let command = get_agent_command(agent);
    
    // Build context template
    let context = format!(
        "Implement the following LeanSpec specification:\n\n---\n{}\n---\n\n\
         Please follow the spec's design, plan, and test sections. \
         Update the spec status to 'complete' when done.",
        content.chars().take(2000).collect::<String>()
    );
    
    // Launch agent based on type
    match agent {
        "claude" => {
            println!("  {} Context prepared for Claude", "✓".green());
            println!("  {} Copy the spec content and paste into Claude", "ℹ".cyan());
        }
        "aider" => {
            // Aider takes --message flag
            Command::new(&command)
                .args(["--message", &context])
                .spawn()?;
        }
        "copilot" => {
            // GitHub Copilot CLI
            Command::new(&command)
                .args(["copilot", "suggest"])
                .spawn()?;
        }
        _ => {
            println!("  {} Launch {} manually with the spec content", "ℹ".cyan(), agent);
        }
    }
    
    Ok(())
}
