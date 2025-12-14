//! Split command implementation
//!
//! Split a spec into multiple files by line ranges.

use colored::Colorize;
use std::error::Error;
use std::fs;
use std::path::Path;

pub fn run(
    specs_dir: &str,
    spec: &str,
    outputs: Vec<String>,
    update_refs: bool,
    dry_run: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    if outputs.is_empty() {
        return Err("At least one --output option is required".into());
    }
    
    // Resolve spec path
    let spec_path = resolve_spec_path(specs_dir, spec)?;
    let readme_path = spec_path.join("README.md");
    
    if !readme_path.exists() {
        return Err(format!("Spec not found: {}", spec).into());
    }
    
    let content = fs::read_to_string(&readme_path)?;
    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len();
    
    // Parse output specifications
    let parsed_outputs = parse_outputs(&outputs)?;
    validate_output_ranges(&parsed_outputs, total_lines)?;
    
    // Extract content for each output
    let extractions: Vec<Extraction> = parsed_outputs
        .iter()
        .map(|output| {
            let extracted_lines: Vec<&str> = lines[(output.start - 1)..output.end]
                .iter()
                .copied()
                .collect();
            
            Extraction {
                file: output.file.clone(),
                content: extracted_lines.join("\n"),
                line_count: extracted_lines.len(),
            }
        })
        .collect();
    
    if dry_run {
        display_dry_run(spec, &extractions)?;
        return Ok(());
    }
    
    // Execute the split
    execute_split(&spec_path, spec, &extractions, update_refs)?;
    
    Ok(())
}

struct OutputSpec {
    file: String,
    start: usize,
    end: usize,
}

struct Extraction {
    file: String,
    content: String,
    line_count: usize,
}

fn parse_outputs(outputs: &[String]) -> Result<Vec<OutputSpec>, Box<dyn Error>> {
    let mut parsed = Vec::new();
    
    for output in outputs {
        // Format: "file.md:1-150" or "design.md:151-300"
        let parts: Vec<&str> = output.split(':').collect();
        if parts.len() != 2 {
            return Err(format!(
                "Invalid output format: {}. Expected format: 'file.md:1-150'",
                output
            ).into());
        }
        
        let file = parts[0].to_string();
        let range_parts: Vec<&str> = parts[1].split('-').collect();
        
        if range_parts.len() != 2 {
            return Err(format!(
                "Invalid line range format: {}. Expected format: '1-150'",
                parts[1]
            ).into());
        }
        
        let start: usize = range_parts[0].parse()
            .map_err(|_| format!("Invalid start line number: {}", range_parts[0]))?;
        let end: usize = range_parts[1].parse()
            .map_err(|_| format!("Invalid end line number: {}", range_parts[1]))?;
        
        if start < 1 {
            return Err("Line numbers must be >= 1".into());
        }
        
        if end < start {
            return Err(format!("End line {} must be >= start line {}", end, start).into());
        }
        
        parsed.push(OutputSpec { file, start, end });
    }
    
    Ok(parsed)
}

fn validate_output_ranges(outputs: &[OutputSpec], total_lines: usize) -> Result<(), Box<dyn Error>> {
    for output in outputs {
        if output.end > total_lines {
            return Err(format!(
                "Line range {}-{} exceeds file length ({})",
                output.start, output.end, total_lines
            ).into());
        }
    }
    
    // Check for overlaps
    let mut sorted: Vec<_> = outputs.iter().collect();
    sorted.sort_by_key(|o| o.start);
    
    for i in 0..sorted.len().saturating_sub(1) {
        let current = sorted[i];
        let next = sorted[i + 1];
        
        if current.end >= next.start {
            return Err(format!(
                "Overlapping line ranges: {} ({}-{}) overlaps with {} ({}-{})",
                current.file, current.start, current.end,
                next.file, next.start, next.end
            ).into());
        }
    }
    
    Ok(())
}

fn display_dry_run(spec: &str, extractions: &[Extraction]) -> Result<(), Box<dyn Error>> {
    println!("{}", format!("📋 Split Preview: {}", spec).cyan().bold());
    println!();
    println!("{}", "Would create:".bold());
    println!();
    
    for ext in extractions {
        println!("  {}", ext.file.cyan());
        println!("    Lines: {}", ext.line_count);
        
        // Show preview
        let preview_lines: Vec<&str> = ext.content.lines().take(3).collect();
        println!("    {}:", "Preview".dimmed());
        for line in &preview_lines {
            let truncated = if line.len() > 60 {
                format!("{}...", &line[..60])
            } else {
                line.to_string()
            };
            println!("      {}", truncated.dimmed());
        }
        
        let total_content_lines = ext.content.lines().count();
        if total_content_lines > 3 {
            println!("      {} ({} more lines)", "...".dimmed(), total_content_lines - 3);
        }
        println!();
    }
    
    println!("{}", "No files modified (dry run)".dimmed());
    println!("{}", "Run without --dry-run to apply changes".dimmed());
    
    Ok(())
}

fn execute_split(
    spec_path: &Path,
    spec: &str,
    extractions: &[Extraction],
    update_refs: bool,
) -> Result<(), Box<dyn Error>> {
    println!("{}", format!("✂️  Splitting: {}", spec).cyan().bold());
    println!();
    
    for ext in extractions {
        let output_path = spec_path.join(&ext.file);
        fs::write(&output_path, &ext.content)?;
        
        println!("{} Created {} ({} lines)", "✓".green(), ext.file, ext.line_count);
    }
    
    // Update README with sub-spec links if requested
    if update_refs {
        let sub_specs: Vec<&str> = extractions
            .iter()
            .filter(|e| e.file != "README.md")
            .map(|e| e.file.as_str())
            .collect();
        
        if !sub_specs.is_empty() {
            let readme_path = spec_path.join("README.md");
            if readme_path.exists() {
                let readme_content = fs::read_to_string(&readme_path)?;
                let updated = add_sub_spec_links(&readme_content, &sub_specs);
                fs::write(&readme_path, updated)?;
                println!("{} Updated README.md with sub-spec links", "✓".green());
            }
        }
    }
    
    println!();
    println!("{}", "Split complete!".green().bold());
    println!("Created {} files in {}", extractions.len().to_string().dimmed(), spec);
    
    Ok(())
}

fn add_sub_spec_links(content: &str, sub_specs: &[&str]) -> String {
    if sub_specs.is_empty() {
        return content.to_string();
    }
    
    // Check if sub-specs section already exists
    if content.contains("## Sub-Specs") || content.contains("## Sub-specs") {
        return content.to_string();
    }
    
    // Find a good place to insert (before Implementation, Plan, or Test)
    let lines: Vec<&str> = content.lines().collect();
    let mut insert_index = lines.len();
    
    for (i, line) in lines.iter().enumerate() {
        let lower = line.to_lowercase();
        if lower.contains("## implementation") || 
           lower.contains("## plan") || 
           lower.contains("## test") {
            insert_index = i;
            break;
        }
    }
    
    // Build sub-specs section
    let mut section_lines: Vec<String> = vec![
        "".to_string(),
        "## Sub-Specs".to_string(),
        "".to_string(),
        "This spec is organized using sub-spec files:".to_string(),
        "".to_string(),
    ];
    
    for file in sub_specs {
        let name = file.replace(".md", "");
        let description = get_file_description(file);
        section_lines.push(format!("- **[{}](./{})** - {}", name, file, description));
    }
    
    section_lines.push("".to_string());
    
    // Insert section
    let mut result: Vec<String> = lines[..insert_index].iter().map(|s| s.to_string()).collect();
    result.extend(section_lines);
    result.extend(lines[insert_index..].iter().map(|s| s.to_string()));
    
    result.join("\n")
}

fn get_file_description(file: &str) -> &'static str {
    let lower = file.to_lowercase();
    
    if lower.contains("design") { return "Architecture and design details"; }
    if lower.contains("implementation") { return "Implementation plan and phases"; }
    if lower.contains("testing") || lower.contains("test") { return "Test strategy and cases"; }
    if lower.contains("rationale") { return "Design rationale and decisions"; }
    if lower.contains("api") { return "API specification"; }
    if lower.contains("migration") { return "Migration plan and strategy"; }
    if lower.contains("context") { return "Context and research"; }
    
    "Additional documentation"
}

fn resolve_spec_path(specs_dir: &str, spec: &str) -> Result<std::path::PathBuf, Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);
    
    // First try direct path
    let direct = specs_path.join(spec);
    if direct.exists() && direct.is_dir() {
        return Ok(direct);
    }
    
    // Try to find by number prefix
    if let Ok(entries) = fs::read_dir(specs_path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            
            if name_str.starts_with(spec) || name_str.contains(spec) {
                if entry.path().is_dir() {
                    return Ok(entry.path());
                }
            }
        }
    }
    
    Err(format!("Spec not found: {}", spec).into())
}
