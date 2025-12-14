//! MCP command implementation
//!
//! Start MCP server for AI assistants (Claude Desktop, Cline, etc.)

use colored::Colorize;
use std::error::Error;
use std::process::{Command, Stdio};
use std::path::Path;

pub fn run(
    specs_dir: &str,
) -> Result<(), Box<dyn Error>> {
    // For the Rust CLI, we launch the separate MCP server binary
    // The MCP server is a standalone binary that implements the MCP protocol
    
    let cwd = std::env::current_dir()?;
    
    // Try to find the leanspec-mcp binary
    let mcp_binary = find_mcp_binary()?;
    
    if let Some(binary_path) = mcp_binary {
        // Launch the MCP server binary
        eprintln!("{}", "Starting LeanSpec MCP Server...".cyan());
        
        let mut child = Command::new(&binary_path)
            .current_dir(&cwd)
            .env("SPECS_DIR", specs_dir)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()?;
        
        let status = child.wait()?;
        
        if !status.success() {
            return Err("MCP server exited with error".into());
        }
        
        Ok(())
    } else {
        // Fall back to TypeScript MCP server via npx
        eprintln!("{}", "Rust MCP binary not found, falling back to TypeScript MCP server...".yellow());
        eprintln!("{}", "Starting LeanSpec MCP Server via npx...".cyan());
        
        let mut child = Command::new("npx")
            .args(["--yes", "lean-spec", "mcp"])
            .current_dir(&cwd)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .spawn()?;
        
        let status = child.wait()?;
        
        if !status.success() {
            return Err("MCP server exited with error".into());
        }
        
        Ok(())
    }
}

fn find_mcp_binary() -> Result<Option<String>, Box<dyn Error>> {
    // Try several locations for the MCP binary
    
    // 1. Same directory as the current binary
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(dir) = current_exe.parent() {
            let mcp_path = dir.join("leanspec-mcp");
            if mcp_path.exists() {
                return Ok(Some(mcp_path.to_string_lossy().to_string()));
            }
            
            // Try with .exe extension on Windows
            #[cfg(target_os = "windows")]
            {
                let mcp_path = dir.join("leanspec-mcp.exe");
                if mcp_path.exists() {
                    return Ok(Some(mcp_path.to_string_lossy().to_string()));
                }
            }
        }
    }
    
    // 2. Check PATH
    if is_command_available("leanspec-mcp") {
        return Ok(Some("leanspec-mcp".to_string()));
    }
    
    // 3. Check relative paths (development)
    let dev_paths = [
        "target/release/leanspec-mcp",
        "target/debug/leanspec-mcp",
        "rust/target/release/leanspec-mcp",
        "rust/target/debug/leanspec-mcp",
    ];
    
    for path in &dev_paths {
        if Path::new(path).exists() {
            return Ok(Some(path.to_string()));
        }
    }
    
    // Not found
    Ok(None)
}

fn is_command_available(command: &str) -> bool {
    // Cross-platform command existence check
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("where")
            .arg(command)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg(command)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
}
