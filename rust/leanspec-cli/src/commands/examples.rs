//! Examples command implementation
//!
//! Lists example projects for tutorials.

use colored::Colorize;
use std::error::Error;

pub fn run(output_format: &str) -> Result<(), Box<dyn Error>> {
    let examples = get_example_projects();

    if output_format == "json" {
        println!("{}", serde_json::to_string_pretty(&examples)?);
        return Ok(());
    }

    println!();
    println!("{}", "Example Projects".bold());
    println!("{}", "═".repeat(60).dimmed());
    println!();

    for example in &examples {
        println!("{} {}", "📁".to_string(), example.name.cyan().bold());
        println!("   {}", example.description);
        println!("   URL: {}", example.url.dimmed());
        println!("   Tags: {}", example.tags.join(", ").dimmed());
        println!();
    }

    println!("{}", "─".repeat(60).dimmed());
    println!();
    println!("To clone an example:");
    println!("  {}", "git clone <url> <directory>".cyan());
    println!();
    println!("Learn more at: {}", "https://leanspec.dev/examples".cyan());

    Ok(())
}

fn get_example_projects() -> Vec<ExampleProject> {
    vec![
        ExampleProject {
            name: "leanspec-starter".to_string(),
            description: "Basic LeanSpec setup for new projects".to_string(),
            url: "https://github.com/leanspec/leanspec-starter".to_string(),
            tags: vec!["starter".to_string(), "minimal".to_string()],
        },
        ExampleProject {
            name: "lean-spec (this project)".to_string(),
            description: "The LeanSpec tool itself - a complex real-world example".to_string(),
            url: "https://github.com/leanspec/lean-spec".to_string(),
            tags: vec![
                "monorepo".to_string(),
                "rust".to_string(),
                "typescript".to_string(),
            ],
        },
        ExampleProject {
            name: "sdd-tutorial".to_string(),
            description: "Step-by-step tutorial for Spec-Driven Development".to_string(),
            url: "https://leanspec.dev/tutorials/getting-started".to_string(),
            tags: vec!["tutorial".to_string(), "beginner".to_string()],
        },
    ]
}

#[derive(serde::Serialize)]
struct ExampleProject {
    name: String,
    description: String,
    url: String,
    tags: Vec<String>,
}
