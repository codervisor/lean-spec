//! Search command implementation
//!
//! Uses leanspec_core::search for cross-field multi-term search with relevance scoring.

use colored::Colorize;
use leanspec_core::{find_content_snippet, parse_query_terms, search_specs, SpecLoader};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    query: &str,
    limit: usize,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;

    let terms = parse_query_terms(query);
    if terms.is_empty() {
        println!("{} Empty search query", "⚠️".yellow());
        return Ok(());
    }

    // Use core search module
    let results = search_specs(&specs, query, limit);

    if output_format == "json" {
        println!("{}", serde_json::to_string_pretty(&results)?);
        return Ok(());
    }

    // Text output
    if results.is_empty() {
        println!("{} No specs found matching '{}'", "ℹ️".cyan(), query);
        return Ok(());
    }

    println!();
    println!(
        "{} results for '{}':",
        results.len().to_string().green(),
        query.cyan()
    );
    println!();

    for result in &results {
        // Find the original spec for additional info
        let spec = specs.iter().find(|s| s.path == result.path);
        let status_emoji = spec.map(|s| s.frontmatter.status_emoji()).unwrap_or("📄");

        // Highlight query terms in title
        let highlighted_title = highlight_match(&result.title, &terms);

        println!(
            "{} {} - {}",
            status_emoji,
            result.path.cyan(),
            highlighted_title
        );

        if !result.tags.is_empty() {
            println!("   🏷️  {}", result.tags.join(", ").dimmed());
        }

        // Show snippet if content matched any term
        if let Some(spec) = spec {
            if let Some(snippet) = find_content_snippet(&spec.content, &terms, 100) {
                println!("   {}", snippet.dimmed());
            }
        }

        println!();
    }

    Ok(())
}

fn highlight_match(text: &str, terms: &[String]) -> String {
    let text_lower = text.to_lowercase();

    // Find the first matching term in the text
    for term in terms {
        if let Some(pos) = text_lower.find(term) {
            let before = &text[..pos];
            let matched = &text[pos..pos + term.len()];
            let after = &text[pos + term.len()..];
            return format!("{}{}{}", before, matched.yellow().bold(), after);
        }
    }
    text.to_string()
}
