//! Migrate command implementation
//!
//! Migrate specs from other SDD tools (OpenSpec, spec-kit, etc.)

use colored::Colorize;
use std::error::Error;
use std::fs;
use std::path::Path;

#[allow(clippy::too_many_arguments)]
pub fn run(
    specs_dir: &str,
    input_path: &str,
    auto: bool,
    ai_provider: Option<String>,
    dry_run: bool,
    _batch_size: Option<usize>,
    _skip_validation: bool,
    backfill: bool,
    _output_format: &str,
) -> Result<(), Box<dyn Error>> {
    // Validate input path exists
    let input = Path::new(input_path);
    if !input.exists() || !input.is_dir() {
        return Err(format!("Path not found or not a directory: {}", input_path).into());
    }

    println!("{} {}\n", "Scanning:".cyan(), input_path);

    // Scan for documents
    let documents = scan_documents(input)?;

    if documents.is_empty() {
        return Err(format!("No documents found in {}", input_path).into());
    }

    println!(
        "{} Found {} document{}\n",
        "✓".green(),
        documents.len(),
        if documents.len() == 1 { "" } else { "s" }
    );

    // Detect source format
    let format = detect_source_format(&documents);
    println!("{} {}\n", "Detected format:".cyan(), format);

    // Auto mode
    if auto {
        return migrate_auto(specs_dir, &documents, &format, dry_run, backfill);
    }

    // AI-assisted mode
    if let Some(provider) = ai_provider {
        return migrate_with_ai(input_path, &documents, &provider);
    }

    // Default: output manual migration instructions
    output_manual_instructions(input_path, &documents, specs_dir, &format);

    Ok(())
}

#[allow(dead_code)]
struct DocumentInfo {
    path: String,
    name: String,
    size: u64,
}

fn scan_documents(dir: &Path) -> Result<Vec<DocumentInfo>, Box<dyn Error>> {
    let mut documents = Vec::new();
    scan_recursive(dir, &mut documents)?;
    Ok(documents)
}

fn scan_recursive(dir: &Path, documents: &mut Vec<DocumentInfo>) -> Result<(), Box<dyn Error>> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') || name == "node_modules" {
            continue;
        }

        if path.is_dir() {
            scan_recursive(&path, documents)?;
        } else if path.is_file() {
            let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
            if ext == "md" || ext == "markdown" {
                let metadata = fs::metadata(&path)?;
                documents.push(DocumentInfo {
                    path: path.to_string_lossy().to_string(),
                    name,
                    size: metadata.len(),
                });
            }
        }
    }

    Ok(())
}

fn detect_source_format(documents: &[DocumentInfo]) -> String {
    // Check for spec-kit pattern
    let has_spec_kit = documents
        .iter()
        .any(|d| d.path.contains(".specify") || d.name == "spec.md");
    if has_spec_kit {
        return "spec-kit".to_string();
    }

    // Check for OpenSpec pattern
    let has_openspec = documents.iter().any(|d| d.path.contains("openspec/"));
    if has_openspec {
        return "openspec".to_string();
    }

    "generic".to_string()
}

fn migrate_auto(
    specs_dir: &str,
    documents: &[DocumentInfo],
    format: &str,
    dry_run: bool,
    _backfill: bool,
) -> Result<(), Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);

    println!("{}", "═".repeat(70));
    println!("{}", "🚀 Auto Migration".cyan().bold());
    println!("{}", "═".repeat(70));
    println!();

    if dry_run {
        println!("{}", "⚠️  DRY RUN - No changes will be made".yellow());
        println!();
    }

    // Ensure specs directory exists
    if !dry_run {
        fs::create_dir_all(specs_path)?;
    }

    // Get next sequence number
    let mut next_seq = get_next_spec_number(specs_dir)?;

    let mut migrated_count = 0;
    let skipped_count = 0;

    println!("{}\n", format!("Migrating {} format...", format).cyan());

    for doc in documents {
        // Extract a reasonable name from the document path
        let doc_path = Path::new(&doc.path);
        let parent_name = doc_path
            .parent()
            .and_then(|p| p.file_name())
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| doc.name.replace(".md", ""));

        // Skip container folders
        if ["specs", "archive", "changes", "openspec", "node_modules"]
            .contains(&parent_name.as_str())
        {
            continue;
        }

        let target_name = format!("{:03}-{}", next_seq, normalize_name(&parent_name));
        let target_dir = specs_path.join(&target_name);

        if dry_run {
            println!("  {} {} → {}/", "→".cyan(), doc.name, target_name);
        } else {
            fs::create_dir_all(&target_dir)?;

            // Copy the file
            let target_file = if doc.name == "spec.md" || doc.name == "README.md" {
                target_dir.join("README.md")
            } else {
                target_dir.join(&doc.name)
            };

            fs::copy(&doc.path, &target_file)?;

            println!("  {} {} → {}/", "✓".green(), doc.name, target_name);
        }

        migrated_count += 1;
        next_seq += 1;
    }

    println!();
    println!("{}", "═".repeat(70));
    println!("{}", "✓ Migration complete!".green());
    println!("  Migrated: {} specs", migrated_count);
    if skipped_count > 0 {
        println!("  Skipped: {} files", skipped_count);
    }
    println!("{}", "═".repeat(70));
    println!();
    println!("Next steps:");
    println!("  {}      # View your specs", "lean-spec board".cyan());
    println!("  {}   # Check for issues", "lean-spec validate".cyan());

    Ok(())
}

fn migrate_with_ai(
    _input_path: &str,
    _documents: &[DocumentInfo],
    provider: &str,
) -> Result<(), Box<dyn Error>> {
    if !["copilot", "claude", "gemini"].contains(&provider) {
        return Err(format!(
            "Invalid AI provider: {}. Use: copilot, claude, or gemini",
            provider
        )
        .into());
    }

    println!("{} {}\n", "🤖 AI-Assisted Migration:".cyan(), provider);

    // AI-assisted mode is a placeholder
    println!(
        "{}",
        "⚠ AI-assisted migration is not yet fully implemented".yellow()
    );
    println!("  This feature will automatically execute migration via AI CLI tools.");
    println!();
    println!("  For now, use {} for auto migration.", "--auto".cyan());
    println!();

    Ok(())
}

fn output_manual_instructions(
    input_path: &str,
    documents: &[DocumentInfo],
    _specs_dir: &str,
    format: &str,
) {
    println!("{}", "═".repeat(70));
    println!("{}", "📋 LeanSpec Migration Instructions".cyan().bold());
    println!("{}", "═".repeat(70));
    println!();
    println!("{}", "Source Location:".bold());
    println!("  {} ({} documents found)", input_path, documents.len());
    println!("  Detected format: {}", format);
    println!();
    println!("{}", "💡 Quick Option:".bold());
    println!(
        "  {}",
        format!("lean-spec migrate {} --auto", input_path).cyan()
    );
    println!("  This will automatically restructure in one shot.");
    println!();
    println!("{}", "Manual Migration Steps:".bold());
    println!();
    println!("1. For each document, create a spec:");
    println!("   {}", "lean-spec create <name>".cyan());
    println!();
    println!("2. Set metadata (NEVER edit frontmatter manually):");
    println!("   {}", "lean-spec update <name> --status <status>".cyan());
    println!(
        "   {}",
        "lean-spec update <name> --priority <priority>".cyan()
    );
    println!();
    println!("3. Copy content and map sections:");
    println!("   - Overview: Problem statement and context");
    println!("   - Design: Technical approach");
    println!("   - Plan: Implementation steps");
    println!("   - Test: Validation criteria");
    println!();
    println!("4. After migration, validate:");
    println!("   {}", "lean-spec validate".cyan());
    println!("   {}", "lean-spec board".cyan());
    println!();
    println!("{}", "─".repeat(70));
    println!();
    println!(
        "{} Use {} for automated migration",
        "ℹ".cyan(),
        "--auto".cyan()
    );
    println!();
}

fn get_next_spec_number(specs_dir: &str) -> Result<u32, Box<dyn Error>> {
    let specs_path = Path::new(specs_dir);

    if !specs_path.exists() {
        return Ok(1);
    }

    let mut max_number = 0u32;

    for entry in fs::read_dir(specs_path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();

            if let Some(num_str) = name_str.split('-').next() {
                if let Ok(num) = num_str.parse::<u32>() {
                    max_number = max_number.max(num);
                }
            }
        }
    }

    Ok(max_number + 1)
}

fn normalize_name(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' {
                c
            } else {
                '-'
            }
        })
        .collect::<String>()
        .trim_matches('-')
        .to_string()
}
