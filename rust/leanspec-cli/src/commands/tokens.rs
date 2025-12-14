//! Tokens command implementation

use colored::Colorize;
use leanspec_core::{SpecLoader, TokenCounter};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: Option<String>,
    verbose: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let counter = TokenCounter::new();
    
    if let Some(spec_path) = spec {
        // Single spec
        let spec_info = loader.load(&spec_path)?
            .ok_or_else(|| format!("Spec not found: {}", spec_path))?;
        
        let full_content = std::fs::read_to_string(&spec_info.file_path)?;
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
                path: spec_info.path.clone(),
                total: result.total,
                frontmatter: result.frontmatter,
                content: result.content,
                status: format!("{:?}", result.status),
            };
            
            println!("{}", serde_json::to_string_pretty(&output)?);
            return Ok(());
        }
        
        println!();
        println!("{} {}", "📊".bold(), spec_info.path.cyan().bold());
        println!();
        println!("  {}: {} tokens {}", "Total".bold(), result.total, result.status);
        
        if verbose {
            println!("  {}: {} tokens", "Frontmatter".dimmed(), result.frontmatter);
            println!("  {}: {} tokens", "Content".dimmed(), result.content);
            println!("  {}: {} tokens", "Title".dimmed(), result.title);
        }
        
        if let Some(rec) = counter.recommendation(result.total) {
            println!();
            println!("  {} {}", "💡".yellow(), rec.yellow());
        }
        
        println!();
    } else {
        // All specs
        let specs = loader.load_all()?;
        
        let mut results: Vec<_> = specs.iter()
            .filter_map(|spec| {
                let full_content = std::fs::read_to_string(&spec.file_path).ok()?;
                let result = counter.count_spec(&full_content);
                Some((spec, result))
            })
            .collect();
        
        // Sort by token count descending
        results.sort_by(|a, b| b.1.total.cmp(&a.1.total));
        
        if output_format == "json" {
            #[derive(serde::Serialize)]
            struct TokensOutput {
                specs: Vec<SpecTokens>,
                summary: Summary,
            }
            
            #[derive(serde::Serialize)]
            struct SpecTokens {
                path: String,
                title: String,
                total: usize,
                status: String,
            }
            
            #[derive(serde::Serialize)]
            struct Summary {
                total_specs: usize,
                total_tokens: usize,
                average_tokens: usize,
                optimal_count: usize,
                warning_count: usize,
                excessive_count: usize,
            }
            
            // Count in a single pass for better performance
            let (total_tokens, optimal_count, good_count, warning_count, excessive_count) = results.iter().fold(
                (0usize, 0usize, 0usize, 0usize, 0usize),
                |(total, opt, good, warn, exc), (_, r)| {
                    use leanspec_core::utils::TokenStatus;
                    let new_opt = if matches!(r.status, TokenStatus::Optimal) { opt + 1 } else { opt };
                    let new_good = if matches!(r.status, TokenStatus::Good) { good + 1 } else { good };
                    let new_warn = if matches!(r.status, TokenStatus::Warning) { warn + 1 } else { warn };
                    let new_exc = if matches!(r.status, TokenStatus::Excessive) { exc + 1 } else { exc };
                    (total + r.total, new_opt, new_good, new_warn, new_exc)
                }
            );
            let _ = good_count; // Suppress unused warning (included in optimal_count for output)
            
            let output = TokensOutput {
                specs: results.iter().map(|(spec, result)| SpecTokens {
                    path: spec.path.clone(),
                    title: spec.title.clone(),
                    total: result.total,
                    status: format!("{:?}", result.status),
                }).collect(),
                summary: Summary {
                    total_specs: results.len(),
                    total_tokens,
                    average_tokens: if results.is_empty() { 0 } else { total_tokens / results.len() },
                    optimal_count,
                    warning_count,
                    excessive_count,
                },
            };
            
            println!("{}", serde_json::to_string_pretty(&output)?);
            return Ok(());
        }
        
        // Text output
        println!();
        println!("{}", "═".repeat(60).dimmed());
        println!("{}", " TOKEN COUNTS ".bold().cyan());
        println!("{}", "═".repeat(60).dimmed());
        println!();
        
        // Show top specs by token count
        let show_count = if verbose { results.len() } else { results.len().min(20) };
        
        for (spec, result) in results.iter().take(show_count) {
            let emoji = counter.status_emoji(result.total);
            let tokens_str = format!("{:>5}", result.total);
            
            let colored_tokens = if result.total > 5000 {
                tokens_str.red()
            } else if result.total > 3500 {
                tokens_str.yellow()
            } else {
                tokens_str.green()
            };
            
            println!(
                "  {} {} tokens - {} {}",
                emoji,
                colored_tokens,
                spec.path.cyan(),
                if verbose { &spec.title } else { "" }.dimmed()
            );
        }
        
        if !verbose && results.len() > 20 {
            println!("  ... and {} more (use --verbose to see all)", results.len() - 20);
        }
        
        // Summary
        let total_tokens: usize = results.iter().map(|(_, r)| r.total).sum();
        let avg_tokens = if results.is_empty() { 0 } else { total_tokens / results.len() };
        
        println!();
        println!("{}", "─".repeat(60).dimmed());
        println!("  {}: {} specs", "Total".bold(), results.len());
        println!("  {}: {} tokens", "Sum".bold(), total_tokens);
        println!("  {}: {} tokens/spec", "Average".bold(), avg_tokens);
        
        // Thresholds summary
        use leanspec_core::utils::TokenStatus;
        let optimal = results.iter().filter(|(_, r)| matches!(r.status, TokenStatus::Optimal | TokenStatus::Good)).count();
        let warning = results.iter().filter(|(_, r)| matches!(r.status, TokenStatus::Warning)).count();
        let excessive = results.iter().filter(|(_, r)| matches!(r.status, TokenStatus::Excessive)).count();
        
        println!();
        println!("  {} {} optimal/good", "✅", optimal);
        if warning > 0 {
            println!("  {} {} need attention", "⚠️".yellow(), warning);
        }
        if excessive > 0 {
            println!("  {} {} must split", "🔴".red(), excessive);
        }
        
        println!();
    }
    
    Ok(())
}
