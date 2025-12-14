//! UI command implementation
//!
//! Start local web UI for spec management.

use colored::Colorize;
use std::error::Error;
use std::process::{Command, Stdio};
use std::path::Path;
use std::fs;

pub fn run(
    specs_dir: &str,
    port: &str,
    no_open: bool,
    multi_project: bool,
    dev: bool,
    dry_run: bool,
) -> Result<(), Box<dyn Error>> {
    // Validate port - parse to check if it's a valid number
    let _port_num: u16 = port.parse()
        .map_err(|_| format!("Invalid port number: {}", port))?;
    
    // Port validation happens during parse - u16 range is 0-65535
    
    let cwd = std::env::current_dir()?;
    let specs_path = cwd.join(specs_dir);
    
    // Verify specs directory exists (for single-project mode)
    if !multi_project && !specs_path.exists() {
        return Err(format!(
            "Specs directory not found: {}\n\nRun `lean-spec init` to initialize LeanSpec in this directory.",
            specs_path.display()
        ).into());
    }
    
    if multi_project {
        println!("{}", "→ Multi-project mode enabled".cyan());
    }
    
    // Check if we're in the LeanSpec monorepo for dev mode
    if dev {
        let ui_dir = cwd.join("packages/ui");
        let ui_package_json = ui_dir.join("package.json");
        
        if !ui_package_json.exists() {
            return Err("Development mode only works in the LeanSpec monorepo.\nRemove --dev flag to use production mode.".into());
        }
        
        // Check if it's the @leanspec/ui package
        let package_json_content = fs::read_to_string(&ui_package_json)?;
        if !package_json_content.contains("\"name\": \"@leanspec/ui\"") {
            return Err("Development mode only works in the LeanSpec monorepo.\nRemove --dev flag to use production mode.".into());
        }
        
        return run_dev_mode(&ui_dir, specs_dir, port, !no_open, multi_project, dry_run);
    }
    
    // Production mode: use published @leanspec/ui
    run_published_ui(&cwd, specs_dir, port, !no_open, multi_project, dry_run)
}

fn run_dev_mode(
    ui_dir: &Path,
    specs_dir: &str,
    port: &str,
    open_browser: bool,
    multi_project: bool,
    dry_run: bool,
) -> Result<(), Box<dyn Error>> {
    println!("{}\n", "→ Detected LeanSpec monorepo, using local ui package".dimmed());
    
    // Detect package manager
    let package_manager = detect_package_manager(ui_dir)?;
    
    let specs_mode = if multi_project { "multi-project" } else { "filesystem" };
    
    if dry_run {
        println!("{}", "Would run:".cyan());
        println!("  cd {}", ui_dir.display().to_string().dimmed());
        println!(
            "  SPECS_MODE={} SPECS_DIR={} PORT={} {} run dev",
            specs_mode, specs_dir, port, package_manager
        );
        if open_browser {
            println!("  open http://localhost:{}", port);
        }
        return Ok(());
    }
    
    println!("{}", "Starting web UI...".cyan());
    
    // Set environment variables
    let child = Command::new(&package_manager)
        .args(["run", "dev"])
        .current_dir(ui_dir)
        .env("SPECS_MODE", specs_mode)
        .env("SPECS_DIR", specs_dir)
        .env("PORT", port)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()?;
    
    println!();
    println!("{}", format!("✨ LeanSpec UI: http://localhost:{}", port).green());
    println!();
    println!("{}", "Press Ctrl+C to stop".dimmed());
    
    if open_browser {
        open_url(&format!("http://localhost:{}", port));
    }
    
    // Wait for the process
    let output = child.wait_with_output()?;
    
    if !output.status.success() {
        return Err("Web UI process exited with error".into());
    }
    
    Ok(())
}

fn run_published_ui(
    cwd: &Path,
    specs_dir: &str,
    port: &str,
    open_browser: bool,
    multi_project: bool,
    dry_run: bool,
) -> Result<(), Box<dyn Error>> {
    println!("{}\n", "→ Using published @leanspec/ui package".dimmed());
    
    // Detect package manager
    let package_manager = detect_package_manager(cwd)?;
    
    // Build command
    let (cmd, args) = build_ui_command(&package_manager, specs_dir, port, open_browser, multi_project);
    
    if dry_run {
        println!("{}", "Would run:".cyan());
        println!("  {} {}", cmd, args.join(" "));
        return Ok(());
    }
    
    let mut child = Command::new(&cmd)
        .args(&args)
        .current_dir(cwd)
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()?;
    
    // Wait for the process
    let status = child.wait()?;
    
    if !status.success() {
        let code = status.code().unwrap_or(1);
        eprintln!();
        eprintln!("{}", format!("@leanspec/ui exited with code {}", code).red());
        eprintln!("{}", "Make sure npm can download @leanspec/ui.".dimmed());
        return Err("Web UI process exited with error".into());
    }
    
    Ok(())
}

fn build_ui_command(
    package_manager: &str,
    specs_dir: &str,
    port: &str,
    open_browser: bool,
    multi_project: bool,
) -> (String, Vec<String>) {
    let mut ui_args = vec!["@leanspec/ui".to_string()];
    
    if multi_project {
        ui_args.push("--multi-project".to_string());
    } else {
        ui_args.push("--specs".to_string());
        ui_args.push(specs_dir.to_string());
    }
    
    ui_args.push("--port".to_string());
    ui_args.push(port.to_string());
    
    if !open_browser {
        ui_args.push("--no-open".to_string());
    }
    
    match package_manager {
        "pnpm" => ("pnpm".to_string(), [vec!["dlx".to_string()], ui_args].concat()),
        "yarn" => ("yarn".to_string(), [vec!["dlx".to_string()], ui_args].concat()),
        _ => ("npx".to_string(), [vec!["--yes".to_string()], ui_args].concat()),
    }
}

fn detect_package_manager(dir: &Path) -> Result<String, Box<dyn Error>> {
    // Check for lockfiles
    if dir.join("pnpm-lock.yaml").exists() {
        return Ok("pnpm".to_string());
    }
    if dir.join("yarn.lock").exists() {
        return Ok("yarn".to_string());
    }
    if dir.join("package-lock.json").exists() {
        return Ok("npm".to_string());
    }
    
    // Check parent directories
    let mut current = dir.to_path_buf();
    while let Some(parent) = current.parent() {
        if parent.join("pnpm-lock.yaml").exists() {
            return Ok("pnpm".to_string());
        }
        if parent.join("yarn.lock").exists() {
            return Ok("yarn".to_string());
        }
        if parent.join("package-lock.json").exists() {
            return Ok("npm".to_string());
        }
        current = parent.to_path_buf();
    }
    
    // Default to npm
    Ok("npm".to_string())
}

fn open_url(url: &str) {
    #[cfg(target_os = "macos")]
    let _ = Command::new("open").arg(url).spawn();
    
    #[cfg(target_os = "linux")]
    let _ = Command::new("xdg-open").arg(url).spawn();
    
    #[cfg(target_os = "windows")]
    let _ = Command::new("cmd").args(["/C", "start", url]).spawn();
}
