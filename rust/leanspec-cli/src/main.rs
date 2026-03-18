//! LeanSpec CLI - Command-line interface for spec management

mod cli_args;
mod commands;

use clap::Parser;
use colored::Colorize;
use std::process::ExitCode;

use crate::cli_args::{Cli, Commands, RunnerSubcommand, SessionSubcommand};

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
        Commands::Children { spec } => commands::children::run(&specs_dir, &spec, &cli.output),
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
            parent,
            depends_on,
            content,
            file,
            assignee,
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
        Commands::Gantt { status } => commands::gantt::run(&specs_dir, status, &cli.output),
        Commands::Init {
            yes,
            example,
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
                example,
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
        Commands::Skill { action } => commands::skill::run(&action),
        Commands::Run {
            prompt,
            spec,
            runner,
            model,
            dry_run,
            acp,
            worktree,
            parallel,
            merge_strategy,
        } => {
            let project_path = std::env::current_dir()
                .map_err(|e| Box::<dyn std::error::Error>::from(e.to_string()))
                .and_then(|path| {
                    commands::session::run_direct(commands::session::RunDirectRequest {
                        project_path: path.to_string_lossy().into_owned(),
                        specs: spec,
                        prompt,
                        runner,
                        model,
                        dry_run,
                        acp,
                        worktree,
                        parallel,
                        merge_strategy,
                    })
                });
            project_path
        }
        Commands::List {
            status,
            tag,
            priority,
            assignee,
            compact,
            hierarchy,
        } => commands::list::run(commands::list::ListParams {
            specs_dir: specs_dir.clone(),
            status,
            tags: tag,
            priority,
            assignee,
            compact,
            hierarchy,
            output_format: cli.output.clone(),
        }),
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
        Commands::MigrateArchived { dry_run } => {
            commands::migrate_archived::run(&specs_dir, dry_run)
        }
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
                    prompt,
                    runner,
                    model,
                    acp,
                    worktree,
                    merge_strategy,
                    mode,
                } => Cmd::Create {
                    project_path,
                    specs: spec,
                    prompt,
                    runner,
                    model,
                    acp,
                    worktree,
                    merge_strategy,
                    mode,
                },
                SessionSubcommand::Run {
                    project_path,
                    spec,
                    prompt,
                    runner,
                    model,
                    acp,
                    worktree,
                    parallel,
                    merge_strategy,
                    mode,
                } => Cmd::Run {
                    project_path,
                    specs: spec,
                    prompt,
                    runner,
                    model,
                    acp,
                    worktree,
                    parallel,
                    merge_strategy,
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
                SessionSubcommand::List {
                    spec,
                    status,
                    runner,
                } => Cmd::List {
                    spec,
                    status,
                    runner,
                },
                SessionSubcommand::Logs { session_id } => Cmd::Logs { session_id },
                SessionSubcommand::Worktrees { all } => Cmd::Worktrees { all },
                SessionSubcommand::Merge {
                    session_id,
                    strategy,
                    resolve,
                } => Cmd::Merge {
                    session_id,
                    strategy,
                    resolve,
                },
                SessionSubcommand::Cleanup {
                    session_id,
                    keep_branch,
                } => Cmd::Cleanup {
                    session_id,
                    keep_branch,
                },
                SessionSubcommand::Gc => Cmd::Gc,
            };
            commands::session::run(cmd)
        }
        Commands::Runner { action } => {
            use commands::runner::RunnerCommand as Cmd;
            let cmd = match action {
                RunnerSubcommand::List { project_path } => Cmd::List { project_path },
                RunnerSubcommand::Show {
                    runner_id,
                    project_path,
                } => Cmd::Show {
                    runner_id,
                    project_path,
                },
                RunnerSubcommand::Validate {
                    runner_id,
                    project_path,
                } => Cmd::Validate {
                    runner_id,
                    project_path,
                },
                RunnerSubcommand::Config {
                    global,
                    project_path,
                } => Cmd::Config {
                    global,
                    project_path,
                },
            };
            commands::runner::run(cmd)
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
