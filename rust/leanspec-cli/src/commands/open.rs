//! Open command implementation
//!
//! Opens a spec in the default editor.

use colored::Colorize;
use leanspec_core::SpecLoader;
use std::error::Error;
use std::process::Command;

pub fn run(
    specs_dir: &str,
    spec: &str,
    editor: Option<String>,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    
    let spec_info = loader.load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;
    
    let file_path = spec_info.file_path.to_string_lossy().to_string();
    
    // Determine editor to use
    let editor_cmd = editor
        .or_else(|| std::env::var("EDITOR").ok())
        .or_else(|| std::env::var("VISUAL").ok())
        .unwrap_or_else(|| {
            // Platform-specific defaults
            if cfg!(target_os = "macos") {
                "open".to_string()
            } else if cfg!(target_os = "windows") {
                "notepad".to_string()
            } else {
                "xdg-open".to_string()
            }
        });
    
    println!("Opening {} in {}...", spec_info.path.cyan(), editor_cmd.cyan());
    
    let status = Command::new(&editor_cmd)
        .arg(&file_path)
        .status();
    
    match status {
        Ok(exit_status) => {
            if exit_status.success() {
                Ok(())
            } else {
                Err(format!("Editor exited with status: {}", exit_status).into())
            }
        }
        Err(e) => {
            // Try alternative editors
            if editor_cmd == "xdg-open" {
                // Try common editors
                for alt in &["code", "vim", "nano", "vi"] {
                    if let Ok(s) = Command::new(alt).arg(&file_path).status() {
                        if s.success() {
                            return Ok(());
                        }
                    }
                }
            }
            
            Err(format!("Failed to open editor '{}': {}", editor_cmd, e).into())
        }
    }
}
