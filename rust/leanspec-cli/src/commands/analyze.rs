//! Analyze command implementation
//!
//! Analyzes spec complexity and structure.

use colored::Colorize;
use leanspec_core::{SpecLoader, TokenCounter, TokenStatus, DependencyGraph};
use std::error::Error;

pub fn run(
    specs_dir: &str,
    spec: &str,
    output_format: &str,
) -> Result<(), Box<dyn Error>> {
    let loader = SpecLoader::new(specs_dir);
    let all_specs = loader.load_all()?;
    
    let spec_info = loader.load(spec)?
        .ok_or_else(|| format!("Spec not found: {}", spec))?;
    
    // Read full content for analysis
    let content = std::fs::read_to_string(&spec_info.file_path)?;
    
    // Token counting
    let token_counter = TokenCounter::new();
    let token_result = token_counter.count_spec(&content);
    
    // Dependency analysis
    let dep_graph = DependencyGraph::new(&all_specs);
    let complete_deps = dep_graph.get_complete_graph(&spec_info.path);
    
    // Structure analysis
    let lines: Vec<&str> = content.lines().collect();
    let total_lines = lines.len();
    
    // Count sections (h2 headers)
    let sections: Vec<(String, usize)> = lines.iter()
        .enumerate()
        .filter(|(_, line)| line.starts_with("## "))
        .map(|(i, line)| {
            let title = line.trim_start_matches("## ").to_string();
            // Count lines until next section
            let next_section = lines.iter()
                .skip(i + 1)
                .position(|l| l.starts_with("## ") || l.starts_with("# "))
                .map(|p| p)
                .unwrap_or(lines.len() - i - 1);
            (title, next_section)
        })
        .collect();
    
    // Code block analysis
    let code_blocks: Vec<(&str, usize)> = {
        let mut blocks = Vec::new();
        let mut in_block = false;
        let mut block_lang = "";
        let mut block_lines = 0;
        
        for line in &lines {
            if line.starts_with("```") {
                if in_block {
                    blocks.push((block_lang, block_lines));
                    in_block = false;
                    block_lines = 0;
                } else {
                    in_block = true;
                    block_lang = line.trim_start_matches("```").split_whitespace().next().unwrap_or("");
                }
            } else if in_block {
                block_lines += 1;
            }
        }
        blocks
    };
    
    // Checklist analysis
    let checkboxes: (usize, usize) = {
        let completed = lines.iter().filter(|l| l.contains("[x]") || l.contains("[X]")).count();
        let incomplete = lines.iter().filter(|l| l.contains("[ ]")).count();
        (completed, completed + incomplete)
    };
    
    // Calculate complexity score (0-100)
    let complexity_score = calculate_complexity(
        total_lines,
        token_result.total,
        sections.len(),
        complete_deps.as_ref().map(|d| d.depends_on.len()).unwrap_or(0),
        code_blocks.len(),
    );
    
    let complexity_label = match complexity_score {
        0..=30 => "Low",
        31..=60 => "Medium",
        61..=80 => "High",
        _ => "Very High",
    };
    
    if output_format == "json" {
        #[derive(serde::Serialize)]
        struct Output {
            spec: String,
            title: String,
            complexity: ComplexityOutput,
            tokens: TokenOutput,
            structure: StructureOutput,
            dependencies: DependencyOutput,
        }
        
        #[derive(serde::Serialize)]
        struct ComplexityOutput {
            score: u32,
            label: String,
        }
        
        #[derive(serde::Serialize)]
        struct TokenOutput {
            total: usize,
            frontmatter: usize,
            content: usize,
            status: String,
        }
        
        #[derive(serde::Serialize)]
        struct StructureOutput {
            total_lines: usize,
            sections: Vec<SectionOutput>,
            code_blocks: usize,
            code_lines: usize,
            checkboxes_completed: usize,
            checkboxes_total: usize,
        }
        
        #[derive(serde::Serialize)]
        struct SectionOutput {
            title: String,
            lines: usize,
        }
        
        #[derive(serde::Serialize)]
        struct DependencyOutput {
            depends_on_count: usize,
            required_by_count: usize,
            has_circular: bool,
        }
        
        let output = Output {
            spec: spec_info.path.clone(),
            title: spec_info.title.clone(),
            complexity: ComplexityOutput {
                score: complexity_score,
                label: complexity_label.to_string(),
            },
            tokens: TokenOutput {
                total: token_result.total,
                frontmatter: token_result.frontmatter,
                content: token_result.content,
                status: format!("{:?}", token_result.status),
            },
            structure: StructureOutput {
                total_lines,
                sections: sections.iter()
                    .map(|(t, l)| SectionOutput { title: t.clone(), lines: *l })
                    .collect(),
                code_blocks: code_blocks.len(),
                code_lines: code_blocks.iter().map(|(_, l)| l).sum(),
                checkboxes_completed: checkboxes.0,
                checkboxes_total: checkboxes.1,
            },
            dependencies: DependencyOutput {
                depends_on_count: complete_deps.as_ref().map(|d| d.depends_on.len()).unwrap_or(0),
                required_by_count: complete_deps.as_ref().map(|d| d.required_by.len()).unwrap_or(0),
                has_circular: dep_graph.has_circular_dependency(&spec_info.path),
            },
        };
        
        println!("{}", serde_json::to_string_pretty(&output)?);
        return Ok(());
    }
    
    // Pretty print
    println!();
    println!("{}", "═".repeat(60).dimmed());
    println!("{}", format!("Spec Analysis: {}", spec_info.path).bold().cyan());
    println!("{}", "═".repeat(60).dimmed());
    println!();
    
    // Complexity
    let complexity_color = match complexity_score {
        0..=30 => "green",
        31..=60 => "yellow",
        61..=80 => "red",
        _ => "red",
    };
    println!("{}", "Complexity".bold());
    println!("  Score: {} ({})", 
        format!("{}/100", complexity_score).color(complexity_color).bold(),
        complexity_label.color(complexity_color)
    );
    println!();
    
    // Tokens
    println!("{}", "Tokens".bold());
    let token_status_color = match token_result.status {
        TokenStatus::Optimal => "green",
        TokenStatus::Good => "cyan",
        TokenStatus::Warning => "yellow",
        TokenStatus::Excessive => "red",
    };
    println!("  Total: {} ({:?})", 
        token_result.total.to_string().color(token_status_color).bold(),
        token_result.status
    );
    println!("  Frontmatter: {}", token_result.frontmatter);
    println!("  Content: {}", token_result.content);
    println!();
    
    // Structure
    println!("{}", "Structure".bold());
    println!("  Lines: {}", total_lines);
    println!("  Sections: {}", sections.len());
    for (title, lines) in &sections {
        println!("    • {} ({} lines)", title.cyan(), lines);
    }
    println!("  Code blocks: {} ({} lines)", code_blocks.len(), 
        code_blocks.iter().map(|(_, l)| l).sum::<usize>());
    if checkboxes.1 > 0 {
        let checkbox_pct = (checkboxes.0 as f64 / checkboxes.1 as f64 * 100.0) as usize;
        println!("  Checkboxes: {}/{} ({}%)", checkboxes.0, checkboxes.1, checkbox_pct);
    }
    println!();
    
    // Dependencies
    println!("{}", "Dependencies".bold());
    if let Some(deps) = complete_deps {
        println!("  Depends on: {}", deps.depends_on.len());
        for dep in &deps.depends_on {
            println!("    → {}", dep.path.dimmed());
        }
        println!("  Required by: {}", deps.required_by.len());
        for req in &deps.required_by {
            println!("    ← {}", req.path.dimmed());
        }
        
        if dep_graph.has_circular_dependency(&spec_info.path) {
            println!("  {} Circular dependency detected!", "⚠".yellow());
        }
    } else {
        println!("  No dependencies");
    }
    
    println!();
    println!("{}", "─".repeat(60).dimmed());
    
    // Recommendations
    let mut recommendations: Vec<String> = Vec::new();
    
    if token_result.total > 3500 {
        recommendations.push("Consider splitting spec - token count is high".to_string());
    }
    if total_lines > 400 {
        recommendations.push("Spec is quite long - consider focusing content".to_string());
    }
    if code_blocks.iter().map(|(_, l)| l).sum::<usize>() > 100 {
        recommendations.push("Many code lines - move examples to separate files?".to_string());
    }
    if complexity_score > 70 {
        recommendations.push("High complexity - consider breaking into sub-specs".to_string());
    }
    
    if !recommendations.is_empty() {
        println!("{}", "Recommendations".bold());
        for rec in &recommendations {
            println!("  {} {}", "→".yellow(), rec);
        }
    } else {
        println!("{} Spec looks well-structured", "✓".green());
    }
    
    println!();
    
    Ok(())
}

fn calculate_complexity(
    lines: usize,
    tokens: usize,
    sections: usize,
    dependencies: usize,
    code_blocks: usize,
) -> u32 {
    let mut score = 0u32;
    
    // Lines contribution (0-25 points)
    score += match lines {
        0..=100 => 0,
        101..=200 => 5,
        201..=300 => 10,
        301..=400 => 15,
        401..=500 => 20,
        _ => 25,
    };
    
    // Tokens contribution (0-30 points)
    score += match tokens {
        0..=1500 => 0,
        1501..=2500 => 5,
        2501..=3500 => 10,
        3501..=4500 => 20,
        _ => 30,
    };
    
    // Sections contribution (0-15 points)
    score += match sections {
        0..=3 => 0,
        4..=6 => 5,
        7..=10 => 10,
        _ => 15,
    };
    
    // Dependencies contribution (0-15 points)
    score += match dependencies {
        0..=2 => 0,
        3..=5 => 5,
        6..=10 => 10,
        _ => 15,
    };
    
    // Code blocks contribution (0-15 points)
    score += match code_blocks {
        0..=2 => 0,
        3..=5 => 5,
        6..=10 => 10,
        _ => 15,
    };
    
    score.min(100)
}
