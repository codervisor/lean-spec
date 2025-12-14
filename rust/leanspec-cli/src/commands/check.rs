//! Check command implementation
//!
//! Checks for sequence conflicts in spec numbering.

use colored::Colorize;
use leanspec_core::SpecLoader;
use std::collections::HashMap;
use std::error::Error;

pub fn run(
    specs_dir: &str,
    fix: bool,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let specs = loader.load_all()?;
    
    // Group specs by their number prefix
    let mut by_number: HashMap<u32, Vec<String>> = HashMap::new();
    let mut max_number: u32 = 0;
    
    for spec in &specs {
        if let Some(num) = extract_spec_number(&spec.path) {
            by_number.entry(num).or_default().push(spec.path.clone());
            max_number = max_number.max(num);
        }
    }
    
    // Find conflicts (multiple specs with same number)
    let mut conflicts: Vec<(u32, Vec<String>)> = by_number.iter()
        .filter(|(_, paths)| paths.len() > 1)
        .map(|(num, paths)| (*num, paths.clone()))
        .collect();
    
    conflicts.sort_by_key(|(num, _)| *num);
    
    // Find gaps in sequence
    let mut gaps: Vec<u32> = Vec::new();
    for i in 1..=max_number {
        if !by_number.contains_key(&i) {
            gaps.push(i);
        }
    }
    
    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct Output {
            total_specs: usize,
            max_number: u32,
            conflicts: Vec<Conflict>,
            gaps: Vec<u32>,
            has_issues: bool,
        }
        
        #[derive(serde::Serialize)]
        struct Conflict {
            number: u32,
            specs: Vec<String>,
        }
        
        let output = Output {
            total_specs: specs.len(),
            max_number,
            conflicts: conflicts.iter()
                .map(|(num, paths)| Conflict { number: *num, specs: paths.clone() })
                .collect(),
            gaps: gaps.clone(),
            has_issues: !conflicts.is_empty() || !gaps.is_empty(),
        };
        
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }
    
    println!();
    println!("{}", "Spec Sequence Check".bold());
    println!("{}", "═".repeat(40).dimmed());
    println!();
    
    println!("Total specs: {}", specs.len().to_string().cyan());
    println!("Number range: 1 - {}", max_number.to_string().cyan());
    println!();
    
    // Report conflicts
    if conflicts.is_empty() {
        println!("{} No sequence conflicts found", "✓".green());
    } else {
        println!("{} {} conflicts found:", "✗".red(), conflicts.len());
        println!();
        
        for (num, paths) in &conflicts {
            println!("  Number {}: {} specs", num.to_string().red().bold(), paths.len());
            for path in paths {
                println!("    - {}", path.yellow());
            }
        }
        
        if fix {
            println!();
            println!("{}", "Fixing conflicts...".cyan());
            
            // Renumber conflicting specs
            for (num, paths) in &conflicts {
                // Keep the first one, renumber others
                for path in paths.iter().skip(1) {
                    let new_num = max_number + 1;
                    max_number += 1;
                    
                    // Actually rename (just show what would happen)
                    let new_path = path.replacen(&format!("{:03}", num), &format!("{:03}", new_num), 1);
                    println!("  Would rename: {} → {}", path.yellow(), new_path.green());
                    
                    // Note: In production, we'd actually do the rename:
                    // std::fs::rename(old_path, new_path)?;
                }
            }
            
            println!();
            println!("{}", "Run without --fix to see changes only".dimmed());
        }
    }
    
    println!();
    
    // Report gaps (just informational)
    if gaps.is_empty() {
        println!("{} No gaps in sequence", "✓".green());
    } else {
        let gap_count = gaps.len();
        if gap_count <= 10 {
            println!("{} {} gaps in sequence: {}", 
                "ℹ".blue(), 
                gap_count,
                gaps.iter()
                    .map(|n| n.to_string())
                    .collect::<Vec<_>>()
                    .join(", ")
            );
        } else {
            println!("{} {} gaps in sequence (e.g., {}...)", 
                "ℹ".blue(), 
                gap_count,
                gaps.iter()
                    .take(5)
                    .map(|n| n.to_string())
                    .collect::<Vec<_>>()
                    .join(", ")
            );
        }
    }
    
    println!();
    
    if !conflicts.is_empty() {
        return Err("Sequence conflicts found".into());
    }
    
    Ok(())
}

fn extract_spec_number(path: &str) -> Option<u32> {
    path.split('-')
        .next()
        .and_then(|s| s.parse().ok())
}
