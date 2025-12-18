//! LeanSpec CLI - Command-line interface for spec management

mod commands;

use clap::{Parser, Subcommand};
use colored::Colorize;
use std::process::ExitCode;

#[derive(Parser)]
#[command(name = "lean-spec")]
#[command(
    author,
    version,
    about = "Lightweight spec methodology for AI-powered development"
)]
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
    /// Dispatch specs to AI coding agents
    Agent {
        /// Action: run, list, status, config
        #[arg(default_value = "help")]
        action: String,

        /// Specs to dispatch (for run action)
        specs: Option<Vec<String>>,

        /// Agent type (claude, copilot, aider, gemini, cursor, continue)
        #[arg(long, default_value = "claude")]
        agent: Option<String>,

        /// Create worktrees for parallel implementation
        #[arg(long)]
        parallel: bool,

        /// Do not update spec status to in-progress
        #[arg(long)]
        no_status_update: bool,

        /// Preview without making changes
        #[arg(long)]
        dry_run: bool,
    },

    /// Analyze spec complexity and structure
    Analyze {
        /// Spec path or number
        spec: String,
    },

    /// Move spec to archived/
    Archive {
        /// Spec path or number
        spec: String,

        /// Preview changes without applying
        #[arg(long)]
        dry_run: bool,
    },

    /// Backfill timestamps from git history
    Backfill {
        /// Specific specs to backfill
        specs: Option<Vec<String>>,

        /// Preview without making changes
        #[arg(long)]
        dry_run: bool,

        /// Overwrite existing values
        #[arg(long)]
        force: bool,

        /// Include assignee from git author
        #[arg(long)]
        assignee: bool,

        /// Include status transitions
        #[arg(long)]
        transitions: bool,

        /// Include all optional fields
        #[arg(long)]
        all: bool,

        /// Create frontmatter for files without it
        #[arg(long)]
        bootstrap: bool,
    },

    /// Show project board view
    Board {
        /// Group by: status, priority, assignee, tag
        #[arg(short, long, default_value = "status")]
        group_by: String,
    },

    /// Check for sequence conflicts
    Check {
        /// Attempt to fix conflicts
        #[arg(long)]
        fix: bool,
    },

    /// Remove specified line ranges from spec
    Compact {
        /// Spec to compact
        spec: String,

        /// Line range to remove (e.g., 145-153)
        #[arg(long = "remove")]
        removes: Vec<String>,

        /// Preview without making changes
        #[arg(long)]
        dry_run: bool,
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

    /// List example projects
    Examples,

    /// List files in a spec directory
    Files {
        /// Spec path or number
        spec: String,

        /// Show file sizes
        #[arg(short, long)]
        size: bool,
    },

    /// Show timeline with dependencies
    Gantt {
        /// Filter by status
        #[arg(short, long)]
        status: Option<String>,
    },

    /// Initialize LeanSpec in current directory
    Init {
        /// Skip prompts and use defaults
        #[arg(short, long)]
        yes: bool,

        /// Template to use for initialization
        #[arg(short, long)]
        template: Option<String>,
    },

    /// Link specs together
    Link {
        /// Spec to link from
        spec: String,

        /// Spec to depend on
        #[arg(long)]
        depends_on: String,
    },

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

    /// Start MCP server for AI assistants
    Mcp,

    /// Migrate specs from other SDD tools
    Migrate {
        /// Path to directory containing specs to migrate
        input_path: String,

        /// Automatic migration
        #[arg(long)]
        auto: bool,

        /// AI-assisted migration (copilot, claude, gemini)
        #[arg(long = "with")]
        ai_provider: Option<String>,

        /// Preview without making changes
        #[arg(long)]
        dry_run: bool,

        /// Process N docs at a time
        #[arg(long)]
        batch_size: Option<usize>,

        /// Don't validate after migration
        #[arg(long)]
        skip_validation: bool,

        /// Auto-run backfill after migration
        #[arg(long)]
        backfill: bool,
    },

    /// Open spec in editor
    Open {
        /// Spec path or number
        spec: String,

        /// Editor to use (default: $EDITOR or platform default)
        #[arg(short, long)]
        editor: Option<String>,
    },

    /// Search specs
    Search {
        /// Search query
        query: String,

        /// Maximum results
        #[arg(short, long, default_value = "10")]
        limit: usize,
    },

    /// Split spec into multiple files
    Split {
        /// Spec to split
        spec: String,

        /// Output file with line range (e.g., README.md:1-150)
        #[arg(long = "output")]
        outputs: Vec<String>,

        /// Update cross-references in README
        #[arg(long)]
        update_refs: bool,

        /// Preview without making changes
        #[arg(long)]
        dry_run: bool,
    },

    /// Show spec statistics
    Stats {
        /// Show detailed statistics
        #[arg(long)]
        detailed: bool,
    },

    /// Manage spec templates
    Templates {
        /// Action: list, show, add, remove
        #[arg(short, long)]
        action: Option<String>,

        /// Template name (for show, add, remove)
        name: Option<String>,
    },

    /// Show creation/completion timeline
    Timeline {
        /// Number of months to show
        #[arg(short, long, default_value = "6")]
        months: usize,
    },

    /// Count tokens in spec(s)
    Tokens {
        /// Specific spec (counts all if not provided)
        spec: Option<String>,

        /// Show detailed breakdown
        #[arg(short, long)]
        verbose: bool,
    },

    /// Start local web UI for spec management
    Ui {
        /// Port to run on
        #[arg(short, long, default_value = "3000")]
        port: String,

        /// Don't open browser automatically
        #[arg(long)]
        no_open: bool,

        /// Enable multi-project mode
        #[arg(long)]
        multi_project: bool,

        /// Run in development mode (LeanSpec monorepo only)
        #[arg(long)]
        dev: bool,

        /// Preview without running
        #[arg(long)]
        dry_run: bool,
    },

    /// Remove a dependency link
    Unlink {
        /// Spec to unlink from
        spec: String,

        /// Spec to remove from dependencies
        #[arg(long)]
        depends_on: String,
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

        /// Skip completion verification when setting status to complete
        #[arg(short, long)]
        force: bool,
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

    /// View a spec's details
    View {
        /// Spec path or number
        spec: String,

        /// Show raw markdown
        #[arg(long)]
        raw: bool,
    },
}

fn main() -> ExitCode {
    let cli = Cli::parse();

    // Determine specs directory
    let specs_dir = cli.specs_dir.unwrap_or_else(|| "specs".to_string());

    let result = match cli.command {
        Commands::Agent {
            action,
            specs,
            agent,
            parallel,
            no_status_update,
            dry_run,
        } => commands::agent::run(
            &specs_dir,
            &action,
            specs,
            agent,
            parallel,
            no_status_update,
            dry_run,
            &cli.output,
        ),
        Commands::Analyze { spec } => commands::analyze::run(&specs_dir, &spec, &cli.output),
        Commands::Archive { spec, dry_run } => commands::archive::run(&specs_dir, &spec, dry_run),
        Commands::Backfill {
            specs,
            dry_run,
            force,
            assignee,
            transitions,
            all,
            bootstrap,
        } => commands::backfill::run(
            &specs_dir,
            specs,
            dry_run,
            force,
            assignee || all,
            transitions || all,
            bootstrap,
            &cli.output,
        ),
        Commands::Board { group_by } => commands::board::run(&specs_dir, &group_by, &cli.output),
        Commands::Check { fix } => commands::check::run(&specs_dir, fix, &cli.output),
        Commands::Compact {
            spec,
            removes,
            dry_run,
        } => commands::compact::run(&specs_dir, &spec, removes, dry_run, &cli.output),
        Commands::Create {
            name,
            title,
            template,
            status,
            priority,
            tags,
        } => commands::create::run(&specs_dir, &name, title, template, &status, priority, tags),
        Commands::Deps {
            spec,
            depth,
            upstream,
            downstream,
        } => commands::deps::run(&specs_dir, &spec, depth, upstream, downstream, &cli.output),
        Commands::Examples => commands::examples::run(&cli.output),
        Commands::Files { spec, size } => {
            commands::files::run(&specs_dir, &spec, size, &cli.output)
        }
        Commands::Gantt { status } => commands::gantt::run(&specs_dir, status, &cli.output),
        Commands::Init { yes, template } => commands::init::run(&specs_dir, yes, template),
        Commands::Link { spec, depends_on } => commands::link::run(&specs_dir, &spec, &depends_on),
        Commands::List {
            status,
            tag,
            priority,
            assignee,
            compact,
        } => commands::list::run(
            &specs_dir,
            status,
            tag,
            priority,
            assignee,
            compact,
            &cli.output,
        ),
        Commands::Mcp => commands::mcp::run(&specs_dir),
        Commands::Migrate {
            input_path,
            auto,
            ai_provider,
            dry_run,
            batch_size,
            skip_validation,
            backfill,
        } => commands::migrate::run(
            &specs_dir,
            &input_path,
            auto,
            ai_provider,
            dry_run,
            batch_size,
            skip_validation,
            backfill,
            &cli.output,
        ),
        Commands::Open { spec, editor } => commands::open::run(&specs_dir, &spec, editor),
        Commands::Search { query, limit } => {
            commands::search::run(&specs_dir, &query, limit, &cli.output)
        }
        Commands::Split {
            spec,
            outputs,
            update_refs,
            dry_run,
        } => commands::split::run(
            &specs_dir,
            &spec,
            outputs,
            update_refs,
            dry_run,
            &cli.output,
        ),
        Commands::Stats { detailed } => commands::stats::run(&specs_dir, detailed, &cli.output),
        Commands::Templates { action, name } => {
            commands::templates::run(&specs_dir, action.as_deref(), name.as_deref(), &cli.output)
        }
        Commands::Timeline { months } => commands::timeline::run(&specs_dir, months, &cli.output),
        Commands::Tokens { spec, verbose } => {
            commands::tokens::run(&specs_dir, spec, verbose, &cli.output)
        }
        Commands::Ui {
            port,
            no_open,
            multi_project,
            dev,
            dry_run,
        } => commands::ui::run(&specs_dir, &port, no_open, multi_project, dev, dry_run),
        Commands::Unlink { spec, depends_on } => {
            commands::unlink::run(&specs_dir, &spec, &depends_on)
        }
        Commands::Update {
            spec,
            status,
            priority,
            assignee,
            add_tags,
            remove_tags,
            force,
        } => commands::update::run(
            &specs_dir,
            &spec,
            status,
            priority,
            assignee,
            add_tags,
            remove_tags,
            force,
        ),
        Commands::Validate {
            spec,
            check_deps,
            strict,
            warnings_only,
        } => commands::validate::run(
            &specs_dir,
            spec,
            check_deps,
            strict,
            warnings_only,
            &cli.output,
        ),
        Commands::View { spec, raw } => commands::view::run(&specs_dir, &spec, raw, &cli.output),
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
