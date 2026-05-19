//! `search` command — adapter-aware full-text search.
//!
//! Delegates to [`Adapter::search`] and renders each hit with the doc's title
//! (resolved via `adapter.get` per hit, which is cheap for the bounded result
//! set) plus the adapter-supplied snippet.

use crate::commands::shared::resolve_adapter;
use colored::Colorize;
use leanspec_core::adapters::SearchHit;
use leanspec_core::AdapterSearchOptions;
use leanspec_core::model::{semantic, FieldValue};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    query: &str,
    limit: usize,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let query_trimmed = query.trim();
    if query_trimmed.is_empty() {
        println!("{} Empty search query", "⚠️".yellow());
        return Ok(());
    }

    let adapter = resolve_adapter(specs_dir)?;

    let opts = AdapterSearchOptions::default().with_limit(limit);
    let hits = adapter.search(query_trimmed, &opts)?;

    if output_format == "json" {
        return print_json(&hits);
    }

    if hits.is_empty() {
        println!(
            "{} No specs found matching '{}'",
            "ℹ️".cyan(),
            query_trimmed
        );
        return Ok(());
    }

    println!();
    println!(
        "{} results for '{}':",
        hits.len().to_string().green(),
        query_trimmed.cyan()
    );
    println!();

    for hit in &hits {
        // Title isn't part of the hit struct; pull it from the adapter so the
        // user sees something more meaningful than a bare id. If the doc
        // disappeared between search and read, fall back to the id.
        let (title, tags) = match adapter.get(&hit.id) {
            Ok(doc) => {
                let title = doc.title.clone();
                let tags = doc
                    .fields
                    .get(
                        adapter
                            .schema()
                            .key_for_semantic(semantic::TAGS)
                            .unwrap_or("tags"),
                    )
                    .and_then(|v| match v {
                        FieldValue::Strings(s) => Some(s.clone()),
                        _ => None,
                    })
                    .unwrap_or_default();
                (title, tags)
            }
            Err(_) => (hit.id.clone(), Vec::new()),
        };

        println!("📄 {} - {}", hit.id.cyan(), title);
        if !tags.is_empty() {
            println!("   🏷️  {}", tags.join(", ").dimmed());
        }
        if let Some(snippet) = &hit.snippet {
            if !snippet.trim().is_empty() {
                println!("   {}", snippet.dimmed());
            }
        }
        println!();
    }

    Ok(())
}

fn print_json(hits: &[SearchHit]) -> Result<(), Box<dyn Error>> {
    println!("{}", serde_json::to_string_pretty(hits)?);
    Ok(())
}
