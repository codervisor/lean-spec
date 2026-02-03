use colored::Colorize;
use leanspec_core::sessions::{
    global_runners_path, project_runners_path, RunnerRegistry, RunnersFile,
};
use std::collections::HashMap;
use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

pub enum RunnerCommand {
    List {
        project_path: Option<String>,
    },
    Show {
        runner_id: String,
        project_path: Option<String>,
    },
    Validate {
        runner_id: Option<String>,
        project_path: Option<String>,
    },
    Config {
        global: bool,
        project_path: Option<String>,
    },
}

pub fn run(command: RunnerCommand) -> Result<(), Box<dyn Error>> {
    match command {
        RunnerCommand::List { project_path } => list_runners(project_path),
        RunnerCommand::Show {
            runner_id,
            project_path,
        } => show_runner(&runner_id, project_path),
        RunnerCommand::Validate {
            runner_id,
            project_path,
        } => validate_runners(runner_id.as_deref(), project_path),
        RunnerCommand::Config {
            global,
            project_path,
        } => open_config(global, project_path),
    }
}

fn resolve_project_path(project_path: Option<String>) -> Result<PathBuf, Box<dyn Error>> {
    match project_path {
        Some(path) => Ok(PathBuf::from(path)),
        None => Ok(std::env::current_dir()?),
    }
}

fn load_registry(project_path: Option<String>) -> Result<RunnerRegistry, Box<dyn Error>> {
    let resolved = resolve_project_path(project_path)?;
    RunnerRegistry::load(&resolved).map_err(|e| Box::<dyn Error>::from(e.to_string()))
}

fn list_runners(project_path: Option<String>) -> Result<(), Box<dyn Error>> {
    let registry = load_registry(project_path)?;
    let default_runner = registry.default();

    let runners = registry.list();

    println!();
    println!("{}", "Runners".bold());
    for runner in runners {
        let status = if runner.validate_command().is_ok() {
            "available".green()
        } else {
            "missing".red()
        };
        let default_marker = if Some(runner.id.as_str()) == default_runner {
            " (default)".dimmed().to_string()
        } else {
            String::new()
        };
        println!(
            "  • {}{} - {}",
            runner.display_name(),
            default_marker,
            status
        );
    }
    println!();
    Ok(())
}

fn show_runner(runner_id: &str, project_path: Option<String>) -> Result<(), Box<dyn Error>> {
    let registry = load_registry(project_path)?;
    let runner = registry
        .get(runner_id)
        .ok_or_else(|| format!("Runner not found: {}", runner_id))?;

    println!();
    println!("{}", "Runner".bold());
    println!("  ID: {}", runner.id);
    println!("  Name: {}", runner.display_name());
    println!("  Command: {}", runner.command);
    if !runner.args.is_empty() {
        println!("  Args: {}", runner.args.join(" "));
    }
    if !runner.env.is_empty() {
        println!("  Env:");
        for (key, value) in &runner.env {
            println!("    {} = {}", key, value);
        }
    }
    println!();
    Ok(())
}

fn validate_runners(
    runner_id: Option<&str>,
    project_path: Option<String>,
) -> Result<(), Box<dyn Error>> {
    let registry = load_registry(project_path)?;

    let mut failures = 0;
    let runners: Vec<&str> = match runner_id {
        Some(id) => vec![id],
        None => registry.list_ids(),
    };

    for id in runners {
        let result = registry.validate(id);
        match result {
            Ok(_) => println!("{} {}", "✓".green(), id),
            Err(err) => {
                failures += 1;
                println!("{} {} - {}", "✗".red(), id, err);
            }
        }
    }

    if failures > 0 {
        return Err(format!("{} runner(s) failed validation", failures).into());
    }

    Ok(())
}

fn open_config(global: bool, project_path: Option<String>) -> Result<(), Box<dyn Error>> {
    let path = if global {
        global_runners_path()
    } else {
        let resolved = resolve_project_path(project_path)?;
        project_runners_path(&resolved)
    };

    ensure_config_file(&path)?;
    open_path(&path)
}

fn ensure_config_file(path: &Path) -> Result<(), Box<dyn Error>> {
    if path.exists() {
        return Ok(());
    }

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let template = RunnersFile {
        schema: Some("https://leanspec.dev/schemas/runners.json".to_string()),
        runners: HashMap::new(),
        default: None,
    };
    let content = serde_json::to_string_pretty(&template)?;
    fs::write(path, content)?;

    Ok(())
}

fn open_path(path: &Path) -> Result<(), Box<dyn Error>> {
    let editor_cmd = std::env::var("EDITOR")
        .or_else(|_| std::env::var("VISUAL"))
        .unwrap_or_else(|_| {
            if cfg!(target_os = "macos") {
                "open".to_string()
            } else if cfg!(target_os = "windows") {
                "notepad".to_string()
            } else {
                "xdg-open".to_string()
            }
        });

    let status = Command::new(&editor_cmd).arg(path).status();

    match status {
        Ok(exit_status) => {
            if exit_status.success() {
                Ok(())
            } else {
                Err(format!("Editor exited with status: {}", exit_status).into())
            }
        }
        Err(err) => Err(format!("Failed to open editor '{}': {}", editor_cmd, err).into()),
    }
}
