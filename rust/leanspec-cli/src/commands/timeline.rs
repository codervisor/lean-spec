//! Timeline command implementation
//!
//! Shows creation/completion timeline of specs.

use chrono::NaiveDate;
use colored::Colorize;
use leanspec_core::{SpecLoader, SpecStatus};
use std::collections::BTreeMap;
use std::error::Error;

pub fn run(specs_dir: &str, months: usize, output_format: &str) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;

    // Group specs by month
    let mut by_month: BTreeMap<String, MonthStats> = BTreeMap::new();

    for spec in &specs {
        let created = &spec.frontmatter.created;

        // Parse date properly using chrono
        let month = NaiveDate::parse_from_str(created, "%Y-%m-%d")
            .map(|d| d.format("%Y-%m").to_string())
            .unwrap_or_else(|_| "unknown".to_string());

        let entry = by_month.entry(month).or_insert(MonthStats::default());
        entry.created += 1;

        // Count completed specs
        if spec.frontmatter.status == SpecStatus::Complete {
            entry.completed += 1;
        }

        // Check if completed this month based on transitions
        for transition in &spec.frontmatter.transitions {
            if transition.status == SpecStatus::Complete {
                // Use chrono format for year-month extraction
                let completed_month = transition.at.format("%Y-%m").to_string();
                let completed_entry = by_month
                    .entry(completed_month)
                    .or_insert(MonthStats::default());
                completed_entry.completed_this_month += 1;
            }
        }
    }

    // Take last N months
    let months_vec: Vec<_> = by_month.iter().rev().take(months).collect();

    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct Output {
            total_specs: usize,
            months: Vec<MonthOutput>,
        }

        #[derive(serde::Serialize)]
        struct MonthOutput {
            month: String,
            created: usize,
            completed: usize,
            completed_this_month: usize,
        }

        let output = Output {
            total_specs: specs.len(),
            months: months_vec
                .iter()
                .map(|(month, stats)| MonthOutput {
                    month: (*month).clone(),
                    created: stats.created,
                    completed: stats.completed,
                    completed_this_month: stats.completed_this_month,
                })
                .collect(),
        };

        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }

    // Pretty print timeline
    println!();
    println!("{}", "Spec Timeline".bold());
    println!("{}", "═".repeat(60).dimmed());
    println!();

    // Find max for bar scaling
    let max_created = months_vec.iter().map(|(_, s)| s.created).max().unwrap_or(1);
    let bar_width = 30;

    for (month, stats) in months_vec.iter().rev() {
        let bar_len = (stats.created as f64 / max_created as f64 * bar_width as f64) as usize;
        let bar = "█".repeat(bar_len);
        let bar_empty = "░".repeat(bar_width - bar_len);

        println!(
            "{} │{}{} {} created, {} completed",
            month.cyan(),
            bar.green(),
            bar_empty.dimmed(),
            stats.created.to_string().bold(),
            stats.completed_this_month.to_string().yellow()
        );
    }

    println!();
    println!("{}", "─".repeat(60).dimmed());

    // Summary
    let total_created: usize = months_vec.iter().map(|(_, s)| s.created).sum();
    let total_completed: usize = months_vec.iter().map(|(_, s)| s.completed_this_month).sum();

    println!();
    println!("Summary (last {} months):", months);
    println!(
        "  Specs created: {}",
        total_created.to_string().green().bold()
    );
    println!(
        "  Specs completed: {}",
        total_completed.to_string().green().bold()
    );

    if total_created > 0 {
        let completion_rate = total_completed as f64 / total_created as f64 * 100.0;
        println!("  Completion rate: {:.1}%", completion_rate);
    }

    println!();

    Ok(())
}

#[derive(Default)]
struct MonthStats {
    created: usize,
    completed: usize,
    completed_this_month: usize,
}
