//! `stats` command — adapter-aware project statistics.
//!
//! Lists every doc, groups by the schema's status and priority semantic
//! fields, and counts tags. Token totals come from each doc's `content`
//! field, which the markdown adapter exposes and which non-markdown adapters
//! may or may not populate. Adapters without a status semantic field still
//! get a total count.

use crate::commands::shared::resolve_adapter;
use colored::Colorize;
use leanspec_core::adapters::ListFilter;
use leanspec_core::model::{semantic, FieldKind, FieldValue, SpecDoc, SpecSchema};
use leanspec_core::TokenCounter;
use std::collections::HashMap;
use std::error::Error;

pub fn run(specs_dir: &str, detailed: bool, output_format: &str) -> Result<(), Box<dyn Error>> {
    let adapter = resolve_adapter(specs_dir)?;
    let schema = adapter.schema().clone();

    let filter = ListFilter {
        include_archived: true,
        ..Default::default()
    };
    let docs = adapter.list(&filter)?;

    let stats = compute_stats(&docs, &schema);

    match output_format {
        "json" => print_json(&stats, detailed),
        _ => {
            print_text(&stats, &schema, detailed);
            Ok(())
        }
    }
}

struct Stats {
    total: usize,
    by_status: HashMap<String, usize>,
    by_priority: HashMap<String, usize>,
    no_priority: usize,
    by_tag: HashMap<String, usize>,
    total_tokens: usize,
    status_key: Option<String>,
    priority_key: Option<String>,
    tags_key: Option<String>,
    with_parent: usize,
    with_depends_on: usize,
}

fn compute_stats(docs: &[SpecDoc], schema: &SpecSchema) -> Stats {
    let status_key = schema
        .key_for_semantic(semantic::STATUS)
        .map(str::to_string);
    let priority_key = schema
        .key_for_semantic(semantic::PRIORITY)
        .map(str::to_string);
    let tags_key = schema.key_for_semantic(semantic::TAGS).map(str::to_string);

    let mut by_status: HashMap<String, usize> = HashMap::new();
    let mut by_priority: HashMap<String, usize> = HashMap::new();
    let mut no_priority = 0;
    let mut by_tag: HashMap<String, usize> = HashMap::new();
    let mut with_parent = 0;
    let mut with_depends_on = 0;

    let counter = TokenCounter::new();
    let mut total_tokens = 0;

    for doc in docs {
        if let Some(key) = &status_key {
            if let Some(FieldValue::String(s)) = doc.fields.get(key) {
                *by_status.entry(s.clone()).or_insert(0) += 1;
            }
        }

        if let Some(key) = &priority_key {
            match doc.fields.get(key) {
                Some(FieldValue::String(s)) => {
                    *by_priority.entry(s.clone()).or_insert(0) += 1;
                }
                _ => no_priority += 1,
            }
        }

        if let Some(key) = &tags_key {
            if let Some(values) = doc.fields.get(key).and_then(|v| v.as_strings()) {
                for tag in values {
                    *by_tag.entry(tag.clone()).or_insert(0) += 1;
                }
            }
        }

        if let Some(FieldValue::String(s)) = doc.fields.get("content") {
            total_tokens += counter.count(s);
        }

        if doc.links.iter().any(|l| l.link_type == "parent") {
            with_parent += 1;
        }
        if doc.links.iter().any(|l| l.link_type == "depends_on") {
            with_depends_on += 1;
        }
    }

    Stats {
        total: docs.len(),
        by_status,
        by_priority,
        no_priority,
        by_tag,
        total_tokens,
        status_key,
        priority_key,
        tags_key,
        with_parent,
        with_depends_on,
    }
}

fn print_text(stats: &Stats, schema: &SpecSchema, detailed: bool) {
    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", " SPEC STATISTICS ".bold().cyan());
    println!("{}", "═".repeat(60).dimmed());
    println!();

    println!(
        "{} {} specs",
        "📊".bold(),
        stats.total.to_string().green().bold()
    );
    println!();

    // Status breakdown (in schema-declared option order, plus any unrecognised
    // values that turn up at the end).
    if stats.status_key.is_some() && !stats.by_status.is_empty() {
        println!("{}", "By Status".bold());
        println!("{}", "─".repeat(30).dimmed());
        for value in ordered_enum_values(schema, semantic::STATUS, &stats.by_status) {
            let count = stats.by_status.get(&value).copied().unwrap_or(0);
            let bar_len = bar_length(count, stats.total);
            let bar = "█".repeat(bar_len);
            println!("  {:14} {:>4} {}", value, count, bar.cyan());
        }
        println!();

        // Progress requires knowing which status values count as "done".
        // The schema doesn't expose a `terminal` flag on enum options yet,
        // so until that lands we approximate: scan declared options for
        // values that case-insensitively match well-known terminal names
        // (`complete`, `closed`, `done`, `resolved`). If none match, we
        // skip the line rather than print a misleading number on adapters
        // whose workflow uses different terminology.
        let terminal_values = terminal_status_values(schema);
        if !terminal_values.is_empty() && stats.total > 0 {
            let completion: usize = stats
                .by_status
                .iter()
                .filter(|(k, _)| terminal_values.iter().any(|t| t.eq_ignore_ascii_case(k)))
                .map(|(_, v)| *v)
                .sum();
            let pct = completion as f64 / stats.total as f64 * 100.0;
            let bar_len = (pct / 100.0 * 30.0) as usize;
            let bar = "█".repeat(bar_len);
            let empty = "░".repeat(30 - bar_len);
            println!(
                "{} {:.1}% {}{}",
                "Progress:".bold(),
                pct,
                bar.green(),
                empty.dimmed()
            );
            println!();
        }
    }

    // Priority breakdown.
    if stats.priority_key.is_some() && !stats.by_priority.is_empty() {
        println!("{}", "By Priority".bold());
        println!("{}", "─".repeat(30).dimmed());
        for value in ordered_enum_values(schema, semantic::PRIORITY, &stats.by_priority) {
            let count = stats.by_priority.get(&value).copied().unwrap_or(0);
            println!("  {:14} {:>4}", value, count);
        }
        if stats.no_priority > 0 {
            println!("  {:14} {:>4}", "(none)", stats.no_priority);
        }
        println!();
    }

    // Top tags.
    if stats.tags_key.is_some() && !stats.by_tag.is_empty() {
        let mut tags: Vec<(&String, &usize)> = stats.by_tag.iter().collect();
        tags.sort_by(|a, b| b.1.cmp(a.1).then_with(|| a.0.cmp(b.0)));
        let top: Vec<_> = tags.iter().take(10).collect();
        println!("{}", "Top Tags".bold());
        println!("{}", "─".repeat(30).dimmed());
        for (tag, count) in top {
            println!("  🏷️  {:20} {:>4}", tag, count);
        }
        println!();
    }

    if detailed {
        println!("{}", "Relationships".bold());
        println!("{}", "─".repeat(30).dimmed());
        println!("  With parent:       {}", stats.with_parent);
        println!("  With dependencies: {}", stats.with_depends_on);
        println!();

        if stats.total_tokens > 0 {
            println!("{}", "Content".bold());
            println!("{}", "─".repeat(30).dimmed());
            println!("  Total tokens: {}", stats.total_tokens);
            println!();
        }
    }
}

fn print_json(stats: &Stats, detailed: bool) -> Result<(), Box<dyn Error>> {
    #[derive(serde::Serialize)]
    struct Out<'a> {
        total: usize,
        by_status: &'a HashMap<String, usize>,
        by_priority: &'a HashMap<String, usize>,
        no_priority: usize,
        by_tag: &'a HashMap<String, usize>,
        total_tokens: Option<usize>,
        with_parent: Option<usize>,
        with_depends_on: Option<usize>,
    }
    let out = Out {
        total: stats.total,
        by_status: &stats.by_status,
        by_priority: &stats.by_priority,
        no_priority: stats.no_priority,
        by_tag: &stats.by_tag,
        total_tokens: if detailed {
            Some(stats.total_tokens)
        } else {
            None
        },
        with_parent: if detailed {
            Some(stats.with_parent)
        } else {
            None
        },
        with_depends_on: if detailed {
            Some(stats.with_depends_on)
        } else {
            None
        },
    };
    println!("{}", serde_json::to_string_pretty(&out)?);
    Ok(())
}

/// Order values for display: enum options declared by the schema first (in
/// declaration order), then any value that appeared but isn't in the schema
/// in alphabetic order.
fn ordered_enum_values(
    schema: &SpecSchema,
    semantic_key: &str,
    counts: &HashMap<String, usize>,
) -> Vec<String> {
    let mut declared: Vec<String> = Vec::new();
    if let Some(field) = schema.field_with_semantic(semantic_key) {
        if let FieldKind::Enum { options, .. } = &field.kind {
            for opt in options {
                if counts.contains_key(&opt.value) {
                    declared.push(opt.value.clone());
                }
            }
        }
    }
    let mut extras: Vec<String> = counts
        .keys()
        .filter(|k| !declared.contains(k))
        .cloned()
        .collect();
    extras.sort();
    declared.extend(extras);
    declared
}

/// Status enum values from the schema that look like a terminal "done"
/// state. Used to compute the Progress percentage without hardcoding a
/// fixed vocabulary at the CLI layer.
fn terminal_status_values(schema: &SpecSchema) -> Vec<String> {
    const TERMINAL_HINTS: &[&str] = &["complete", "closed", "done", "resolved"];
    let Some(field) = schema.field_with_semantic(semantic::STATUS) else {
        return Vec::new();
    };
    match &field.kind {
        FieldKind::Enum { options, .. } => options
            .iter()
            .filter(|opt| {
                let v = opt.value.to_ascii_lowercase();
                TERMINAL_HINTS.iter().any(|hint| v == *hint)
            })
            .map(|opt| opt.value.clone())
            .collect(),
        _ => Vec::new(),
    }
}

fn bar_length(count: usize, total: usize) -> usize {
    if total == 0 {
        return 0;
    }
    (count as f64 / total as f64 * 30.0) as usize
}
