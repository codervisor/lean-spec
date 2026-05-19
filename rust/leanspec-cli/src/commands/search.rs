//! `search` command — adapter-aware full-text search.
//!
//! Delegates to [`Adapter::search`] and renders each hit alongside the
//! adapter-supplied snippet. [`SearchHit`] doesn't currently carry a title,
//! so we fall back to `adapter.get(&hit.id)` to fetch one — fine for the
//! in-memory markdown adapter, but on remote adapters (GitHub, Jira, ADO)
//! this is N+1: one search request followed by up to `limit` per-hit HTTP
//! round-trips. When the adapter populates `hit.snippet` we skip the
//! per-hit fetch and avoid the round-trips entirely. A follow-up should
//! extend `SearchHit` with a `title` field so remote adapters can fill it
//! in once.

use crate::commands::shared::resolve_adapter;
use colored::Colorize;
use leanspec_core::adapters::SearchHit;
use leanspec_core::model::{semantic, FieldValue};
use leanspec_core::AdapterSearchOptions;
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

    let snippet_present = hits
        .iter()
        .any(|h| h.snippet.as_ref().is_some_and(|s| !s.trim().is_empty()));

    for hit in &hits {
        // If the adapter already returned a usable snippet, skip the per-hit
        // `adapter.get` fetch — that's the escape hatch remote adapters use
        // to avoid N+1 once their `search` implementation packs enough
        // context into the response.
        let (title, tags) = if snippet_present {
            (hit.id.clone(), Vec::new())
        } else {
            match adapter.get(&hit.id) {
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
                // If the doc disappeared between search and read, fall back
                // to the id so the result row still renders.
                Err(_) => (hit.id.clone(), Vec::new()),
            }
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
