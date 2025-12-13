//! LeanSpec CLI - Command-line interface for spec management

mod commands;

use clap::{Parser, Subcommand};
use colored::Colorize;
use std::process::ExitCode;

#[derive(Parser)]
#[command(name = "lean-spec")]
#[command(author, version, about = "Lightweight spec methodology for AI-powered development")]
#[command(propagate_version = true)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    /// Specs directory path (default: ./specs)
    #[arg(short = 'd', long, global = true)]
    specs_dir: Option<String>,
    
    /// Output format: text, json
    #[arg(short = 'o', long, global = true, default_value = "text")]
    output: String,
    
    /// Suppress non-essential output
    #[arg(short, long, global = true)]
    quiet: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// List all specs with optional filtering
    List {
        /// Filter by status: planned, in-progress, complete, archived
        #[arg(short, long)]
        status: Option<String>,
        
        /// Filter by tag
        #[arg(short, long)]
        tag: Option<Vec<String>>,
        
        /// Filter by priority: low, medium, high, critical
        #[arg(short, long)]
        priority: Option<String>,
        
        /// Filter by assignee
        #[arg(short, long)]
        assignee: Option<String>,
        
        /// Show compact output
        #[arg(short, long)]
        compact: bool,
    },
    
    /// View a spec's details
    View {
        /// Spec path or number
        spec: String,
        
        /// Show raw markdown
        #[arg(long)]
        raw: bool,
    },
    
    /// Create a new spec
    Create {
        /// Spec name (e.g., "my-feature")
        name: String,
        
        /// Spec title
        #[arg(short, long)]
        title: Option<String>,
        
        /// Template to use
        #[arg(short = 'T', long)]
        template: Option<String>,
        
        /// Initial status
        #[arg(short, long, default_value = "planned")]
        status: String,
        
        /// Priority
        #[arg(short, long)]
        priority: Option<String>,
        
        /// Tags (comma-separated)
        #[arg(long)]
        tags: Option<String>,
    },
    
    /// Update a spec's frontmatter
    Update {
        /// Spec path or number
        spec: String,
        
        /// New status
        #[arg(short, long)]
        status: Option<String>,
        
        /// New priority
        #[arg(short, long)]
        priority: Option<String>,
        
        /// New assignee
        #[arg(short, long)]
        assignee: Option<String>,
        
        /// Add tags
        #[arg(long)]
        add_tags: Option<String>,
        
        /// Remove tags
        #[arg(long)]
        remove_tags: Option<String>,
    },
    
    /// Validate specs for issues
    Validate {
        /// Specific spec to validate (validates all if not provided)
        spec: Option<String>,
        
        /// Check dependency alignment
        #[arg(long)]
        check_deps: bool,
        
        /// Treat warnings as errors
        #[arg(long)]
        strict: bool,
        
        /// Only show warnings (exit 0)
        #[arg(long)]
        warnings_only: bool,
    },
    
    /// Show spec dependency graph
    Deps {
        /// Spec path or number
        spec: String,
        
        /// Maximum depth to traverse
        #[arg(short = 'D', long, default_value = "3")]
        depth: usize,
        
        /// Show upstream dependencies only
        #[arg(long)]
        upstream: bool,
        
        /// Show downstream dependents only
        #[arg(long)]
        downstream: bool,
    },
    
    /// Link specs together
    Link {
        /// Spec to link from
        spec: String,
        
        /// Spec to depend on
        #[arg(long)]
        depends_on: String,
    },
    
    /// Remove a dependency link
    Unlink {
        /// Spec to unlink from
        spec: String,
        
        /// Spec to remove from dependencies
        #[arg(long)]
        depends_on: String,
    },
    
    /// Search specs
    Search {
        /// Search query
        query: String,
        
        /// Maximum results
        #[arg(short, long, default_value = "10")]
        limit: usize,
    },
    
    /// Show project board view
    Board {
        /// Group by: status, priority, assignee, tag
        #[arg(short, long, default_value = "status")]
        group_by: String,
    },
    
    /// Count tokens in spec(s)
    Tokens {
        /// Specific spec (counts all if not provided)
        spec: Option<String>,
        
        /// Show detailed breakdown
        #[arg(short, long)]
        verbose: bool,
    },
    
    /// Show spec statistics
    Stats {
        /// Show detailed statistics
        #[arg(short, long)]
        detailed: bool,
    },
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    
    // Determine specs directory
    let specs_dir = cli.specs_dir.unwrap_or_else(|| "specs".to_string());
    
    let result = match cli.command {
        Commands::List { status, tag, priority, assignee, compact } => {
            commands::list::run(&specs_dir, status, tag, priority, assignee, compact, &cli.output)
        }
        Commands::View { spec, raw } => {
            commands::view::run(&specs_dir, &spec, raw, &cli.output)
        }
        Commands::Create { name, title, template, status, priority, tags } => {
            commands::create::run(&specs_dir, &name, title, template, &status, priority, tags)
        }
        Commands::Update { spec, status, priority, assignee, add_tags, remove_tags } => {
            commands::update::run(&specs_dir, &spec, status, priority, assignee, add_tags, remove_tags)
        }
        Commands::Validate { spec, check_deps, strict, warnings_only } => {
            commands::validate::run(&specs_dir, spec, check_deps, strict, warnings_only, &cli.output)
        }
        Commands::Deps { spec, depth, upstream, downstream } => {
            commands::deps::run(&specs_dir, &spec, depth, upstream, downstream, &cli.output)
        }
        Commands::Link { spec, depends_on } => {
            commands::link::run(&specs_dir, &spec, &depends_on)
        }
        Commands::Unlink { spec, depends_on } => {
            commands::unlink::run(&specs_dir, &spec, &depends_on)
        }
        Commands::Search { query, limit } => {
            commands::search::run(&specs_dir, &query, limit, &cli.output)
        }
        Commands::Board { group_by } => {
            commands::board::run(&specs_dir, &group_by, &cli.output)
        }
        Commands::Tokens { spec, verbose } => {
            commands::tokens::run(&specs_dir, spec, verbose, &cli.output)
        }
        Commands::Stats { detailed } => {
            commands::stats::run(&specs_dir, detailed, &cli.output)
        }
    };
    
    match result {
        Ok(_) => ExitCode::SUCCESS,
        Err(e) => {
            if !cli.quiet {
                eprintln!("{} {}", "Error:".red().bold(), e);
            }
            ExitCode::FAILURE
        }
    }
}
