//! Files command implementation
//!
//! Lists files in a spec directory.

use colored::Colorize;
use leanspec_core::SpecLoader;
use std::error::Error;
use std::path::Path;
use walkdir::WalkDir;

pub fn run(
    specs_dir: &str,
    spec: &str,
    show_size: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    
    let spec_info = loader.load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;
    
    // Get the spec directory (parent of README.md)
    let spec_dir = spec_info.file_path.parent()
        .ok_or("Invalid spec path")?;
    
    let mut files: Vec<FileInfo> = Vec::new();
    
    // Collect all files in the spec directory
    for entry in WalkDir::new(spec_dir)
        .min_depth(1)
        .max_depth(5)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            let path = entry.path();
            let rel_path = path.strip_prefix(spec_dir)
                .unwrap_or(path)
                .to_string_lossy()
                .to_string();
            
            let size = if show_size {
                path.metadata().map(|m| m.len()).ok()
            } else {
                None
            };
            
            let file_type = get_file_type(path);
            
            files.push(FileInfo {
                path: rel_path,
                size,
                file_type,
            });
        }
    }
    
    // Sort files by path
    files.sort_by(|a, b| a.path.cmp(&b.path));
    
    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct Output {
            spec: String,
            directory: String,
            files: Vec<FileInfo>,
        }
        
        let output = Output {
            spec: spec_info.path.clone(),
            directory: spec_dir.to_string_lossy().to_string(),
            files,
        };
        
        println!("{}", serde_json::to_string_pretty(&output)?);
    } else {
        println!();
        println!("{}: {}", "Spec".bold(), spec_info.path.cyan());
        println!("{}: {}", "Directory".bold(), spec_dir.display());
        println!();
        
        if files.is_empty() {
            println!("{}", "No files found (except README.md)".yellow());
        } else {
            for file in &files {
                let icon = match file.file_type.as_str() {
                    "markdown" => "📄",
                    "image" => "🖼️",
                    "diagram" => "📊",
                    "code" => "💻",
                    "config" => "⚙️",
                    _ => "📁",
                };
                
                if let Some(size) = file.size {
                    let size_str = format_size(size);
                    println!("  {} {} {}", icon, file.path.cyan(), size_str.dimmed());
                } else {
                    println!("  {} {}", icon, file.path.cyan());
                }
            }
        }
        
        println!();
        println!("{} files found", files.len().to_string().green());
    }
    
    Ok(())
}

#[derive(serde::Serialize)]
struct FileInfo {
    path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    size: Option<u64>,
    file_type: String,
}

fn get_file_type(path: &Path) -> String {
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    match ext.as_str() {
        "md" | "markdown" => "markdown".to_string(),
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" => "image".to_string(),
        "mermaid" | "plantuml" | "puml" => "diagram".to_string(),
        "rs" | "ts" | "js" | "py" | "go" | "java" | "rb" | "c" | "cpp" => "code".to_string(),
        "json" | "yaml" | "yml" | "toml" => "config".to_string(),
        _ => "other".to_string(),
    }
}

fn format_size(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    
    if bytes >= MB {
        format!("({:.1} MB)", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("({:.1} KB)", bytes as f64 / KB as f64)
    } else {
        format!("({} bytes)", bytes)
    }
}
