//! Search command implementation

use colored::Colorize;
use leanspec_core::SpecLoader;
use std::error::Error;

pub fn run(
    specs_dir: &str,
    query: &str,
    limit: usize,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;
    
    let query_lower = query.to_lowercase();
    
    // Search and score specs
    let mut results: Vec<_> = specs.iter()
        .filter_map(|spec| {
            let mut score = 0.0;
            
            // Title match (highest weight)
            if spec.title.to_lowercase().contains(&query_lower) {
                score += 10.0;
            }
            
            // Path match
            if spec.path.to_lowercase().contains(&query_lower) {
                score += 5.0;
            }
            
            // Tag match
            for tag in &spec.frontmatter.tags {
                if tag.to_lowercase().contains(&query_lower) {
                    score += 3.0;
                }
            }
            
            // Content match (lowest weight)
            let content_lower = spec.content.to_lowercase();
            let content_matches = content_lower.matches(&query_lower).count();
            if content_matches > 0 {
                score += (content_matches as f64).min(5.0);
            }
            
            if score > 0.0 {
                Some((spec, score))
            } else {
                None
            }
        })
        .collect();
    
    // Sort by score descending
    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    
    // Limit results
    results.truncate(limit);
    
    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct SearchResult {
            path: String,
            title: String,
            status: String,
            score: f64,
            tags: Vec<String>,
        }
        
        let output: Vec<_> = results.iter().map(|(spec, score)| SearchResult {
            path: spec.path.clone(),
            title: spec.title.clone(),
            status: spec.frontmatter.status.to_string(),
            score: *score,
            tags: spec.frontmatter.tags.clone(),
        }).collect();
        
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }
    
    // Text output
    if results.is_empty() {
        println!("{} No specs found matching '{}'", "ℹ️".cyan(), query);
        return Ok(());
    }
    
    println!();
    println!("{} results for '{}':", results.len().to_string().green(), query.cyan());
    println!();
    
    for (spec, _score) in &results {
        let status_emoji = spec.frontmatter.status_emoji();
        
        // Highlight query in title
        let highlighted_title = highlight_match(&spec.title, query);
        
        println!(
            "{} {} - {}",
            status_emoji,
            spec.path.cyan(),
            highlighted_title
        );
        
        if !spec.frontmatter.tags.is_empty() {
            println!("   🏷️  {}", spec.frontmatter.tags.join(", ").dimmed());
        }
        
        // Show snippet if content matched
        if let Some(snippet) = find_content_snippet(&spec.content, query, 100) {
            println!("   {}", snippet.dimmed());
        }
        
        println!();
    }
    
    Ok(())
}

fn highlight_match(text: &str, query: &str) -> String {
    let query_lower = query.to_lowercase();
    let text_lower = text.to_lowercase();
    
    if let Some(pos) = text_lower.find(&query_lower) {
        let before = &text[..pos];
        let matched = &text[pos..pos + query.len()];
        let after = &text[pos + query.len()..];
        format!("{}{}{}", before, matched.yellow().bold(), after)
    } else {
        text.to_string()
    }
}

fn find_content_snippet(content: &str, query: &str, max_len: usize) -> Option<String> {
    let content_lower = content.to_lowercase();
    let query_lower = query.to_lowercase();
    
    if let Some(pos) = content_lower.find(&query_lower) {
        // Find start of line
        let start = content[..pos].rfind('\n').map(|p| p + 1).unwrap_or(0);
        
        // Get the line
        let line_end = content[pos..].find('\n').map(|p| pos + p).unwrap_or(content.len());
        let line = &content[start..line_end];
        
        // Truncate if too long
        if line.len() > max_len {
            let truncated = &line[..max_len];
            Some(format!("{}...", truncated.trim()))
        } else {
            Some(format!("\"{}\"", line.trim()))
        }
    } else {
        None
    }
}
