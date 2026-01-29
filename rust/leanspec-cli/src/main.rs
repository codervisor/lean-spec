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

    /// Move spec(s) to archived/
    Archive {
        /// Spec paths or numbers (supports batch operations)
        #[arg(required = true)]
        specs: Vec<String>,

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
        /// Group by: status, priority, assignee, tag, parent
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

        /// Skip AI tool configuration (symlinks)
        #[arg(long)]
        no_ai_tools: bool,

        /// Skip MCP server configuration
        #[arg(long)]
        no_mcp: bool,

        /// Install LeanSpec agent skills (project-level default)
        #[arg(long)]
        skill: bool,

        /// Install skills to .github/skills/
        #[arg(long)]
        skill_github: bool,

        /// Install skills to .claude/skills/
        #[arg(long)]
        skill_claude: bool,

        /// Install skills to .cursor/skills/
        #[arg(long)]
        skill_cursor: bool,

        /// Install skills to .codex/skills/
        #[arg(long)]
        skill_codex: bool,

        /// Install skills to .gemini/skills/
        #[arg(long)]
        skill_gemini: bool,

        /// Install skills to .vscode/skills/
        #[arg(long)]
        skill_vscode: bool,

        /// Install skills to user-level directories (e.g., ~/.copilot/skills)
        #[arg(long)]
        skill_user: bool,

        /// Skip skill installation entirely
        #[arg(long)]
        no_skill: bool,
    },

    /// Link specs together
    Link {
        /// Spec to link from
        spec: String,

        /// Spec(s) to depend on
        #[arg(long, required = true, num_args = 1..)]
        depends_on: Vec<String>,
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

        /// Show parent-child hierarchy tree
        #[arg(long)]
        hierarchy: bool,
    },

    /// List child specs for a parent
    Children {
        /// Spec path or number
        spec: String,
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

    /// Count tokens in a spec or any file
    Tokens {
        /// Spec or file path to count (omit to count all specs)
        path: Option<String>,

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

        /// Spec(s) to remove from dependencies
        #[arg(long, required = true, num_args = 1..)]
        depends_on: Vec<String>,
    },

    /// Update a spec's frontmatter
    Update {
        /// Spec path(s) or number(s)
        #[arg(required = true, num_args = 1..)]
        specs: Vec<String>,

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

    /// Manage AI coding sessions
    Session {
        #[command(subcommand)]
        action: SessionSubcommand,
    },
}

#[derive(Subcommand)]
enum SessionSubcommand {
    Create {
        #[arg(long)]
        project_path: String,

        #[arg(long)]
        spec: Option<String>,

        #[arg(long, default_value = "claude")]
        tool: String,

        #[arg(long, default_value = "autonomous")]
        mode: String,
    },
    Run {
        #[arg(long)]
        project_path: String,

        #[arg(long)]
        spec: Option<String>,

        #[arg(long, default_value = "claude")]
        tool: String,

        #[arg(long, default_value = "autonomous")]
        mode: String,
    },
    Start {
        session_id: String,
    },
    Pause {
        session_id: String,
    },
    Resume {
        session_id: String,
    },
    Stop {
        session_id: String,
    },
    Archive {
        session_id: String,

        #[arg(long)]
        output_dir: Option<String>,

        #[arg(long, default_value_t = false)]
        compress: bool,
    },
    RotateLogs {
        session_id: String,

        #[arg(long, default_value_t = 10_000)]
        keep: usize,
    },
    Delete {
        session_id: String,
    },
    View {
        session_id: String,
    },
    List {
        #[arg(long)]
        spec: Option<String>,
        #[arg(long)]
        status: Option<String>,
        #[arg(long)]
        tool: Option<String>,
    },
    Logs {
        session_id: String,
    },
    Tools,
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
        Commands::Archive { specs, dry_run } => commands::archive::run(&specs_dir, &specs, dry_run),
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
        Commands::Init {
            yes,
            no_ai_tools,
            no_mcp,
            skill,
            skill_github,
            skill_claude,
            skill_cursor,
            skill_codex,
            skill_gemini,
            skill_vscode,
            skill_user,
            no_skill,
        } => commands::init::run(
            &specs_dir,
            commands::init::InitOptions {
                yes,
                no_ai_tools,
                no_mcp,
                skill,
                skill_github,
                skill_claude,
                skill_cursor,
                skill_codex,
                skill_gemini,
                skill_vscode,
                skill_user,
                no_skill,
            },
        ),
        Commands::Link { spec, depends_on } => commands::link::run(&specs_dir, &spec, &depends_on),
        Commands::List {
            status,
            tag,
            priority,
            assignee,
            compact,
            hierarchy,
        } => commands::list::run(
            &specs_dir,
            status,
            tag,
            priority,
            assignee,
            compact,
            hierarchy,
            &cli.output,
        ),
        Commands::Children { spec } => commands::children::run(&specs_dir, &spec, &cli.output),
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
        Commands::Tokens { path, verbose } => {
            commands::tokens::run(&specs_dir, path.as_deref(), verbose, &cli.output)
        }
        Commands::Ui {
            port,
            no_open,
            multi_project: _,
            dev,
            dry_run,
        } => commands::ui::run(&specs_dir, &port, no_open, true, dev, dry_run),
        Commands::Unlink { spec, depends_on } => {
            commands::unlink::run(&specs_dir, &spec, &depends_on)
        }
        Commands::Update {
            specs,
            status,
            priority,
            assignee,
            add_tags,
            remove_tags,
            force,
        } => commands::update::run(
            &specs_dir,
            &specs,
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
        Commands::Session { action } => {
            use commands::session::SessionCommand as Cmd;
            let cmd = match action {
                SessionSubcommand::Create {
                    project_path,
                    spec,
                    tool,
                    mode,
                } => Cmd::Create {
                    project_path,
                    spec,
                    tool,
                    mode,
                },
                SessionSubcommand::Run {
                    project_path,
                    spec,
                    tool,
                    mode,
                } => Cmd::Run {
                    project_path,
                    spec,
                    tool,
                    mode,
                },
                SessionSubcommand::Start { session_id } => Cmd::Start { session_id },
                SessionSubcommand::Pause { session_id } => Cmd::Pause { session_id },
                SessionSubcommand::Resume { session_id } => Cmd::Resume { session_id },
                SessionSubcommand::Stop { session_id } => Cmd::Stop { session_id },
                SessionSubcommand::Archive {
                    session_id,
                    output_dir,
                    compress,
                } => Cmd::Archive {
                    session_id,
                    output_dir,
                    compress,
                },
                SessionSubcommand::RotateLogs { session_id, keep } => {
                    Cmd::RotateLogs { session_id, keep }
                }
                SessionSubcommand::Delete { session_id } => Cmd::Delete { session_id },
                SessionSubcommand::View { session_id } => Cmd::View { session_id },
                SessionSubcommand::List { spec, status, tool } => Cmd::List { spec, status, tool },
                SessionSubcommand::Logs { session_id } => Cmd::Logs { session_id },
                SessionSubcommand::Tools => Cmd::Tools,
            };
            commands::session::run(cmd)
        }
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
