use std::error::Error;
use std::process::Command;

/// Maps runner IDs to skills.sh agent names
pub fn runner_to_skills_agent(runner_id: &str) -> Option<&'static str> {
    match runner_id {
        "claude" => Some("claude-code"),
        "copilot" => Some("github-copilot"),
        "cursor" => Some("cursor"),
        "gemini" => Some("gemini-cli"),
        "codex" => Some("codex"),
        "cline" => Some("cline"),
        "continue" => Some("continue"),
        "windsurf" => Some("windsurf"),
        "aider" => Some("aider"),
        "opencode" => Some("opencode"),
        _ => None,
    }
}

/// Install skills, optionally limited to specific agents.
/// If agents is None or empty, installs to all agents (fallback).
/// If skip_confirm is true, passes -y to skip interactive prompts.
pub fn install(agents: Option<&[String]>, skip_confirm: bool) -> Result<(), Box<dyn Error>> {
    let mut args = vec![
        "skills",
        "add",
        "codervisor/skills@leanspec",
    ];
    if skip_confirm {
        args.push("-y");
    }

    // Build agent flags if specific agents are provided
    let agent_args: Vec<String>;
    if let Some(agent_list) = agents {
        if !agent_list.is_empty() {
            agent_args = agent_list
                .iter()
                .flat_map(|a| vec!["--agent".to_string(), a.clone()])
                .collect();
            for arg in &agent_args {
                args.push(arg.as_str());
            }
        }
    }

    run_npx(&args)
}

fn run_npx(args: &[&str]) -> Result<(), Box<dyn Error>> {
    let status = Command::new("npx")
        .args(args)
        .status()
        .map_err(|err| format!("Failed to run npx (is Node.js installed?): {err}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(format!("npx {} exited with {status}", args.join(" ")).into())
    }
}
