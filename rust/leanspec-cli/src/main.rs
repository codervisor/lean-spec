//! LeanSpec CLI - Command-line interface for spec management

mod cli_args;
mod commands;

use clap::Parser;
use colored::Colorize;
use std::process::ExitCode;

use crate::cli_args::{Cli, Commands, CrystallizeOutput, GitSubcommand, SchemaSubcommand};

fn main() -> ExitCode {
    let cli = Cli::parse();

    // Determine specs directory (for non-TUI commands that use specs_dir directly).
    // We keep `cli.specs_dir` intact so TUI can detect whether it was explicitly set.
    let specs_dir = cli.specs_dir.clone().unwrap_or_else(|| "specs".to_string());

    let result = match cli.command {
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
        Commands::Board {
            group_by,
            by_parent,
            status,
            tag,
            priority,
            assignee,
            compact,
        } => commands::board::run(commands::board::BoardParams {
            specs_dir: cli.specs_dir.clone(),
            group_by,
            by_parent,
            status,
            tags: tag,
            priority,
            assignee,
            compact,
            output_format: cli.output.clone(),
        }),
        Commands::Capabilities { refresh } => {
            commands::capabilities::run(commands::capabilities::CapabilitiesParams {
                // Pass through only when the user explicitly overrode specs
                // dir; otherwise the command resolves the adapter from the
                // project's own configuration.
                specs_dir: cli.specs_dir.clone(),
                output_format: cli.output.clone(),
                refresh,
            })
        }
        Commands::Check { fix } => commands::check::run(&specs_dir, fix, &cli.output),
        Commands::Children { spec } => commands::children::run(&specs_dir, &spec, &cli.output),
        Commands::Compact {
            spec,
            removes,
            dry_run,
        } => commands::compact::run(&specs_dir, &spec, removes, dry_run, &cli.output),
        Commands::Crystallize {
            dry_run,
            output_target,
            update,
            target,
        } => {
            use commands::crystallize::{run as crystallize_run, CrystallizeOptions};
            let mode = if dry_run {
                commands::crystallize::WriteMode::DryRun
            } else {
                match output_target {
                    CrystallizeOutput::Stdout => commands::crystallize::WriteMode::Stdout,
                    CrystallizeOutput::Files if update => commands::crystallize::WriteMode::Update,
                    CrystallizeOutput::Files => commands::crystallize::WriteMode::Write,
                }
            };
            let root = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            crystallize_run(CrystallizeOptions {
                root,
                specs_dir: specs_dir.clone(),
                target,
                mode,
            })
        }
        Commands::Create {
            name,
            title,
            template,
            status,
            priority,
            tags,
            parent,
            depends_on,
            content,
            file,
            assignee,
            description,
            slug,
            fields,
            schema_id,
        } => commands::create::run(commands::create::CreateParams {
            specs_dir: specs_dir.clone(),
            name,
            title,
            template,
            status,
            priority,
            tags,
            parent,
            depends_on,
            content,
            file,
            assignee,
            description,
            slug,
            fields,
            schema_id,
        }),
        Commands::Rel {
            args,
            parent,
            child,
            depends_on,
        } => commands::rel::run(
            &specs_dir,
            commands::rel::RelArgs {
                args,
                parent,
                children: child,
                depends_on,
            },
            &cli.output,
        ),
        Commands::Examples => commands::examples::run(&cli.output),
        Commands::Deps {
            spec,
            depth,
            upstream,
            downstream,
        } => commands::deps::run(&specs_dir, &spec, depth, upstream, downstream, &cli.output),
        Commands::Files { spec, size } => {
            commands::files::run(&specs_dir, &spec, size, &cli.output)
        }
        Commands::Git { action } => {
            use commands::git_repo::GitRepoCommand as Cmd;
            let cmd = match action {
                GitSubcommand::Detect { repo, branch } => Cmd::Detect { repo, branch },
                GitSubcommand::Import { repo, branch, name } => Cmd::Import { repo, branch, name },
            };
            commands::git_repo::run(cmd, &cli.output)
        }
        Commands::Gantt { status } => commands::gantt::run(&specs_dir, status, &cli.output),
        Commands::Init {
            yes,
            example,
            adapter,
            owner_repo,
            token_env,
            jira_host,
            jira_project,
            jira_email,
        } => commands::init::run(
            &specs_dir,
            commands::init::InitOptions {
                yes,
                example,
                adapter,
                owner_repo,
                token_env,
                jira_host,
                jira_project,
                jira_email,
            },
        ),
        Commands::List {
            status,
            tag,
            priority,
            assignee,
            compact,
            hierarchy,
        } => commands::list::run(commands::list::ListParams {
            // Pass through only when the user explicitly overrode specs
            // dir; otherwise the command resolves the adapter from the
            // project's own configuration.
            specs_dir: cli.specs_dir.clone(),
            status,
            tags: tag,
            priority,
            assignee,
            compact,
            hierarchy,
            output_format: cli.output.clone(),
        }),
        Commands::Migrate {
            input_path,
            to_adapter,
            to_config,
            keep_source,
            delete_source,
            limit,
            filter_status,
            auto,
            ai_provider,
            dry_run,
            batch_size,
            skip_validation,
            backfill,
        } => commands::migrate::run(commands::migrate::MigrateParams {
            specs_dir: specs_dir.clone(),
            input_path,
            to_adapter,
            to_config,
            keep_source,
            delete_source,
            limit,
            filter_status,
            auto,
            ai_provider,
            dry_run,
            batch_size,
            skip_validation,
            backfill,
            output_format: cli.output.clone(),
        }),
        Commands::Open { spec, editor } => commands::open::run(&specs_dir, &spec, editor),
        Commands::Schema { action } => match action {
            SchemaSubcommand::List => commands::schema::list(&cli.output),
            SchemaSubcommand::Show { id } => commands::schema::show(&id, &cli.output),
            SchemaSubcommand::Validate { path } => commands::schema::validate(&path, &cli.output),
        },
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
        Commands::Tui {
            view,
            project,
            headless,
        } => commands::tui::run(
            // Pass None when --specs-dir not provided so TUI can use the project registry.
            cli.specs_dir.as_deref(),
            &view,
            project.as_deref(),
            headless.as_deref(),
        ),
        Commands::Ui {
            port,
            no_open,
            multi_project: _,
            dev,
            dry_run,
        } => commands::ui::run(&specs_dir, &port, no_open, true, dev, dry_run),
        Commands::Update {
            specs,
            status,
            priority,
            assignee,
            add_tags,
            remove_tags,
            replacements,
            match_all,
            match_first,
            check,
            uncheck,
            section,
            section_content,
            append,
            prepend,
            content,
            force,
            expected_hash,
        } => commands::update::run(
            &specs_dir,
            &specs,
            status,
            priority,
            assignee,
            add_tags,
            remove_tags,
            replacements,
            match_all,
            match_first,
            check,
            uncheck,
            section,
            section_content,
            append,
            prepend,
            content,
            force,
            expected_hash,
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
