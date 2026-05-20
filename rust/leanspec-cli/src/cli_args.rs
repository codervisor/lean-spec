use clap::{ArgAction, Parser, Subcommand, ValueEnum};

/// Output target for `leanspec crystallize`.
#[derive(Debug, Clone, Copy, ValueEnum)]
pub(crate) enum CrystallizeOutput {
    /// Write generated content to `AGENTS.md` and `.claude/skills/`.
    Files,
    /// Print generated content to stdout; don't touch the filesystem.
    Stdout,
}

#[derive(Parser)]
#[command(name = "lean-spec")]
#[command(
    author,
    version,
    about = "Lightweight spec methodology for AI-powered development"
)]
#[command(propagate_version = true)]
pub(crate) struct Cli {
    #[command(subcommand)]
    pub(crate) command: Commands,

    /// Specs directory path (default: ./specs)
    #[arg(short = 'd', long, global = true)]
    pub(crate) specs_dir: Option<String>,

    /// Output format: text, json
    #[arg(short = 'o', long, global = true, default_value = "text")]
    pub(crate) output: String,

    /// Suppress non-essential output
    #[arg(short, long, global = true)]
    pub(crate) quiet: bool,
}

#[derive(Subcommand)]
pub(crate) enum Commands {
    /// Analyze spec complexity and structure
    Analyze {
        /// Spec path or number
        spec: String,
    },

    /// Archive spec(s) by setting status to archived
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
        /// Group by field key (default: the schema's status field).
        /// Examples: status, priority, assignee, tags. Use --by-parent
        /// for parent-hierarchy grouping.
        #[arg(short, long)]
        group_by: Option<String>,

        /// Group by parent link instead of a field
        #[arg(long = "by-parent", conflicts_with = "group_by")]
        by_parent: bool,

        /// Pre-filter by status
        #[arg(short, long)]
        status: Option<String>,

        /// Pre-filter by tag (repeatable)
        #[arg(short, long)]
        tag: Option<Vec<String>>,

        /// Pre-filter by priority
        #[arg(short, long)]
        priority: Option<String>,

        /// Pre-filter by assignee
        #[arg(short, long)]
        assignee: Option<String>,

        /// Show compact output (omit per-spec details)
        #[arg(short, long)]
        compact: bool,
    },

    /// Print the active adapter's capabilities and metadata vocabulary.
    ///
    /// Agents should call this at session start to discover which fields and
    /// values the backend supports instead of assuming markdown-specific
    /// conventions.
    Capabilities {
        /// Force a fresh schema enrichment call, even when the static schema
        /// would suffice. The CLI is single-shot, so the practical effect is
        /// to surface enrichment errors (offline, bad token) loudly instead
        /// of falling back silently to the static defaults.
        #[arg(long)]
        refresh: bool,
    },

    /// Check for sequence conflicts
    Check {
        /// Attempt to fix conflicts
        #[arg(long)]
        fix: bool,
    },

    /// List child specs for a parent
    Children {
        /// Spec path or number
        spec: String,
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

    /// Scan the codebase and generate `AGENTS.md` / skill files
    Crystallize {
        /// Print everything to stdout and write nothing
        #[arg(long)]
        dry_run: bool,

        /// Output target: `files` (default) or `stdout`
        #[arg(long, value_enum, default_value_t = CrystallizeOutput::Files)]
        output_target: CrystallizeOutput,

        /// Merge with existing `AGENTS.md` instead of overwriting it
        #[arg(long)]
        update: bool,

        /// Filename to write L1 rules into (default `AGENTS.md`)
        #[arg(long, default_value = "AGENTS.md")]
        target: String,
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
        #[arg(short, long)]
        status: Option<String>,

        /// Priority level (defaults to `medium` when omitted)
        #[arg(short, long)]
        priority: Option<String>,

        /// Tags (comma-separated)
        #[arg(long)]
        tags: Option<String>,

        /// Parent umbrella spec path or number
        #[arg(long)]
        parent: Option<String>,

        /// Spec(s) this new spec depends on
        #[arg(long = "depends-on", num_args = 1..)]
        depends_on: Vec<String>,

        /// Full markdown content for the spec body (may include frontmatter)
        #[arg(long, allow_hyphen_values = true)]
        content: Option<String>,

        /// Read spec content from a file path (takes precedence over --content)
        #[arg(short, long)]
        file: Option<String>,

        /// Assignee for the spec
        #[arg(short, long)]
        assignee: Option<String>,

        /// Short description (inserted into template body under the title)
        #[arg(long)]
        description: Option<String>,

        /// Explicit slug override (markdown adapter only — e.g. `042-my-feature`)
        #[arg(long)]
        slug: Option<String>,

        /// Adapter-specific field as `key=value` (repeatable)
        #[arg(long = "field")]
        fields: Vec<String>,

        /// Schema id to apply to the new spec (e.g. `acme:sprint-story`).
        /// Falls back to the adapter's default schema when omitted.
        #[arg(long = "schema")]
        schema_id: Option<String>,
    },

    /// List example projects
    Examples,

    /// Manage spec relationships (hierarchy and dependencies)
    ///
    /// Use parent/child for hierarchy and depends-on for blockers.
    /// Never use both for the same spec pair.
    ///
    /// Examples:
    ///   lean-spec rel add 257 --parent 250
    ///   lean-spec rel add 257 --depends-on 254
    ///   lean-spec rel rm 257 --depends-on 254
    Rel {
        /// Arguments: <spec> or <action> <spec>
        #[arg(required = true, num_args = 1..=2)]
        args: Vec<String>,

        /// Set or clear parent relationship
        #[arg(long, num_args = 0..=1, default_missing_value = "")]
        parent: Option<String>,

        /// Add or remove child relationships
        #[arg(long = "child", num_args = 1..)]
        child: Vec<String>,

        /// Add or remove dependency relationships
        #[arg(long = "depends-on", num_args = 1..)]
        depends_on: Vec<String>,
    },

    /// List files in a spec directory
    Files {
        /// Spec path or number
        spec: String,

        /// Show file sizes
        #[arg(short, long)]
        size: bool,
    },

    /// Manage Git repository integration
    Git {
        #[command(subcommand)]
        action: GitSubcommand,
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

        /// Initialize an example project
        #[arg(long)]
        example: Option<String>,

        /// Backend adapter to initialize: markdown (default), github, ado, jira
        #[arg(long, default_value = "markdown")]
        adapter: String,

        /// GitHub adapter: owner/repo override (e.g. "acme/backend")
        #[arg(long = "owner-repo")]
        owner_repo: Option<String>,

        /// GitHub adapter: environment variable that holds the token.
        /// Jira adapter overrides this default to `JIRA_TOKEN` when unset.
        #[arg(long = "token-env")]
        token_env: Option<String>,

        /// Jira adapter: host (e.g. "mycompany.atlassian.net")
        #[arg(long = "jira-host")]
        jira_host: Option<String>,

        /// Jira adapter: project key (e.g. "PROJ")
        #[arg(long = "jira-project")]
        jira_project: Option<String>,

        /// Jira adapter: authenticating account email
        #[arg(long = "jira-email")]
        jira_email: Option<String>,
    },

    /// List all specs with optional filtering
    List {
        /// Filter by status: draft, planned, in-progress, complete, archived
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

    /// Migrate specs across adapters, or import from other SDD tools
    Migrate {
        /// Path to directory containing specs to migrate (legacy import mode)
        #[arg(conflicts_with = "to_adapter")]
        input_path: Option<String>,

        /// Migrate the project's specs to another adapter (e.g. `github`, `ado`, `jira`).
        /// When set, switches to cross-adapter migration mode.
        #[arg(long = "to", value_name = "ADAPTER")]
        to_adapter: Option<String>,

        /// Path to YAML config for the target adapter.
        /// Defaults to `leanspec.adapter.<adapter>.yaml` or
        /// `.lean-spec/adapter.<adapter>.yaml`.
        #[arg(long, value_name = "PATH")]
        to_config: Option<String>,

        /// Leave source files in place; only annotate with `migrated_to:`.
        #[arg(long, conflicts_with = "delete_source")]
        keep_source: bool,

        /// Delete source files after successful migration (no recovery).
        #[arg(long)]
        delete_source: bool,

        /// Only migrate at most N specs (useful for testing).
        #[arg(long, value_name = "N")]
        limit: Option<usize>,

        /// Only migrate specs whose status matches.
        #[arg(long, value_name = "STATUS")]
        filter_status: Option<String>,

        /// Automatic migration (legacy import mode only)
        #[arg(long)]
        auto: bool,

        /// AI-assisted migration (copilot, claude, gemini) — legacy import mode only
        #[arg(long = "with")]
        ai_provider: Option<String>,

        /// Preview without making changes
        #[arg(long)]
        dry_run: bool,

        /// Process N docs at a time (legacy import mode only)
        #[arg(long)]
        batch_size: Option<usize>,

        /// Don't validate after migration (legacy import mode only)
        #[arg(long)]
        skip_validation: bool,

        /// Auto-run backfill after migration (legacy import mode only)
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

    /// List, inspect, and validate schemas (built-in + custom)
    Schema {
        #[command(subcommand)]
        action: SchemaSubcommand,
    },

    /// Search specs
    Search {
        /// Search query (supports AND/OR/NOT, field filters, phrases, fuzzy)
        /// Examples: "api AND security", "tag:rust status:planned", "\"user authentication\"", "auth~2"
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

    /// Interactive terminal UI for spec management
    Tui {
        /// Initial view: board, list
        #[arg(long, default_value = "board")]
        view: String,

        /// Load a named project from the registry
        #[arg(long)]
        project: Option<String>,

        /// Run in headless mode, replay key sequence and print state as JSON
        #[arg(long)]
        headless: Option<String>,
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

        /// Replace text (repeatable: --replace "old" "new")
        #[arg(long = "replace", num_args = 2, value_names = ["OLD", "NEW"], action = ArgAction::Append)]
        replacements: Vec<String>,

        /// Replace all matches (applies to all --replace entries)
        #[arg(long, conflicts_with = "match_first")]
        match_all: bool,

        /// Replace first match only (applies to all --replace entries)
        #[arg(long, conflicts_with = "match_all")]
        match_first: bool,

        /// Check checklist item (repeatable)
        #[arg(long, action = ArgAction::Append)]
        check: Vec<String>,

        /// Uncheck checklist item (repeatable)
        #[arg(long, action = ArgAction::Append)]
        uncheck: Vec<String>,

        /// Section heading to update
        #[arg(long)]
        section: Option<String>,

        /// Replace content for section
        #[arg(long, conflicts_with_all = ["append", "prepend"])]
        section_content: Option<String>,

        /// Append content to section
        #[arg(long, conflicts_with = "section_content")]
        append: Option<String>,

        /// Prepend content to section
        #[arg(long, conflicts_with = "section_content")]
        prepend: Option<String>,

        /// Replace full body content (frontmatter preserved)
        #[arg(long)]
        content: Option<String>,

        /// Skip completion verification or stage skipping guard (draft -> in-progress/complete)
        #[arg(short, long)]
        force: bool,

        /// Expected content hash for optimistic concurrency (fails if content changed)
        #[arg(long = "expected-hash")]
        expected_hash: Option<String>,
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

#[derive(Subcommand)]
pub(crate) enum SchemaSubcommand {
    /// List every available schema (built-in + custom).
    List,

    /// Show all fields of a resolved schema.
    Show {
        /// Schema id (e.g. `leanspec:feature`, `acme:sprint-story`).
        id: String,
    },

    /// Validate a schema YAML file against the registry.
    Validate {
        /// Path to the schema YAML file.
        path: String,
    },
}

#[derive(Subcommand)]
pub(crate) enum GitSubcommand {
    /// Detect specs in a Git repository
    Detect {
        /// Repository (owner/repo or git URL)
        repo: String,

        /// Branch to check (default: repo's default branch)
        #[arg(short, long)]
        branch: Option<String>,
    },

    /// Import a Git repo as a LeanSpec project
    Import {
        /// Repository (owner/repo or git URL)
        repo: String,

        /// Branch to track (default: repo's default branch)
        #[arg(short, long)]
        branch: Option<String>,

        /// Display name for the project
        #[arg(short, long)]
        name: Option<String>,
    },
}
