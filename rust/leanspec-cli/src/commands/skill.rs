use colored::Colorize;
use std::error::Error;
use std::process::Command;

pub fn run(action: &str) -> Result<(), Box<dyn Error>> {
    match action {
        "install" => install(None),
        "update" => update(),
        "list" => list(),
        "help" | "-h" | "--help" => {
            print_help();
            Ok(())
        }
        _ => Err(format!("Unknown skill action: {action}").into()),
    }
}

/// Install skills, optionally limited to specific agents.
/// If agents is None or empty, installs to all detected agents.
pub fn install(agents: Option<&[String]>) -> Result<(), Box<dyn Error>> {
    let mut args = vec!["skills", "add", "codervisor/lean-spec", "-y"];

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

fn update() -> Result<(), Box<dyn Error>> {
    run_npx(&["skills", "update"])
}

fn list() -> Result<(), Box<dyn Error>> {
    run_npx(&["skills", "list"])
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

fn print_help() {
    println!("{}", "Skill management (skills.sh)".bold());
    println!();
    println!("Usage:");
    println!("  lean-spec skill install   # Install leanspec-sdd via skills.sh");
    println!("  lean-spec skill update    # Update installed skills");
    println!("  lean-spec skill list      # List installed skills");
}
