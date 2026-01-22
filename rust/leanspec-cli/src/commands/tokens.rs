//! Tokens command implementation

use colored::Colorize;
use leanspec_core::{SpecLoader, TokenCounter};
use std::error::Error;
use std::path::Path;

pub fn run(
    specs_dir: &str,
    path: Option<&str>,
    verbose: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let counter = TokenCounter::new();

    // If no path provided, count all specs
    if path.is_none() {
        return count_all_specs(&loader, &counter, verbose, output_format);
    }

    let path = path.unwrap();

    // Check if it's a file path or spec reference
    let path_ref = Path::new(path);

    // First, try as a spec reference
    if let Ok(Some(spec_info)) = loader.load(path) {
        return count_spec(
            &counter,
            spec_info.file_path.to_str().unwrap(),
            &spec_info.path,
            verbose,
            output_format,
        );
    }

    // Then try as a file path
    if path_ref.exists() && path_ref.is_file() {
        return count_file(&counter, path_ref, verbose, output_format);
    }

    // Not found
    Err(format!("File or spec not found: {}", path).into())
}

fn count_all_specs(
    loader: &SpecLoader,
    counter: &TokenCounter,
    _verbose: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let specs = loader.load_all()?;

    if specs.is_empty() {
        if output_format == "json" {
            println!("{{\"total\": 0, \"specs\": []}}");
        } else {
            println!("No specs found");
        }
        return Ok(());
    }

    let mut total = 0;
    let mut spec_counts = Vec::new();

    for spec in &specs {
        let content = std::fs::read_to_string(&spec.file_path)?;
        let result = counter.count_spec(&content);
        total += result.total;
        spec_counts.push((spec.path.clone(), result.total));
    }

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct AllTokenOutput {
            total: usize,
            count: usize,
            specs: Vec<SpecCount>,
        }

        #[derive(serde::Serialize)]
        struct SpecCount {
            path: String,
            tokens: usize,
        }

        let output = AllTokenOutput {
            total,
            count: specs.len(),
            specs: spec_counts
                .into_iter()
                .map(|(path, tokens)| SpecCount { path, tokens })
                .collect(),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    println!();
    println!("{} {}", "📊".bold(), "All Specs Token Count".cyan().bold());
    println!();
    println!(
        "  {}: {} tokens across {} specs",
        "Total".bold(),
        total,
        specs.len()
    );

    if let Some(rec) = counter.recommendation(total) {
        println!();
        println!("  {} {}", "💡".yellow(), rec.yellow());
    }

    println!();
    Ok(())
}

fn count_file(
    counter: &TokenCounter,
    path: &Path,
    _verbose: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let content = std::fs::read_to_string(path)?;
    let result = counter.count_file(&content);

    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct TokenOutput {
            path: String,
            total: usize,
            status: String,
        }

        let output = TokenOutput {
            path: path.to_string_lossy().to_string(),
            total: result.total,
            status: format!("{:?}", result.status),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    println!();
    println!("{} {}", "📊".bold(), file_name.cyan().bold());
    println!();
    println!(
        "  {}: {} tokens {}",
        "Total".bold(),
        result.total,
        result.status
    );

    if let Some(rec) = counter.recommendation(result.total) {
        println!();
        println!("  {} {}", "💡".yellow(), rec.yellow());
    }

    println!();
    Ok(())
}

fn count_spec(
    counter: &TokenCounter,
    file_path: &str,
    spec_path: &str,
    verbose: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let full_content = std::fs::read_to_string(file_path)?;
    let result = counter.count_spec(&full_content);

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct TokenOutput {
            path: String,
            total: usize,
            frontmatter: usize,
            content: usize,
            status: String,
        }

        let output = TokenOutput {
            path: spec_path.to_string(),
            total: result.total,
            frontmatter: result.frontmatter,
            content: result.content,
            status: format!("{:?}", result.status),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    println!();
    println!("{} {}", "📊".bold(), spec_path.cyan().bold());
    println!();
    println!(
        "  {}: {} tokens {}",
        "Total".bold(),
        result.total,
        result.status
    );

    if verbose {
        println!(
            "  {}: {} tokens",
            "Frontmatter".dimmed(),
            result.frontmatter
        );
        println!("  {}: {} tokens", "Content".dimmed(), result.content);
        println!("  {}: {} tokens", "Title".dimmed(), result.title);
    }

    if let Some(rec) = counter.recommendation(result.total) {
        println!();
        println!("  {} {}", "💡".yellow(), rec.yellow());
    }

    println!();
    Ok(())
}
