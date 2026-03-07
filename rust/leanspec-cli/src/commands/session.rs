use colored::Colorize;
use leanspec_core::sessions::{
    manager::build_context_prompt, worktree_enabled, ArchiveOptions, CreateSessionOptions,
    GitWorktreeManager, MergeStrategy, RunnerProtocol, RunnerRegistry, SessionConfig,
    SessionDatabase, SessionManager, SessionMode, SessionStatus, WorktreeStatus,
    WORKTREE_CLEANED_AT_KEY, WORKTREE_CONFLICT_FILES_KEY, WORKTREE_STATUS_KEY,
};
use leanspec_core::storage::config::config_dir;
use std::collections::HashMap;
use std::error::Error;
use std::path::PathBuf;
use std::time::Duration;

fn build_manager() -> Result<SessionManager, Box<dyn Error>> {
    let sessions_dir = config_dir();
    std::fs::create_dir_all(&sessions_dir).map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    let unified_db_path = sessions_dir.join("leanspec.db");
    let db = SessionDatabase::new(&unified_db_path)
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

    let legacy_sessions_path = sessions_dir.join("sessions.db");
    if db
        .migrate_from_legacy_db(&legacy_sessions_path)
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
    {
        let migrated = legacy_sessions_path.with_extension("db.migrated");
        let _ = std::fs::rename(&legacy_sessions_path, migrated);
    }

    Ok(SessionManager::new(db))
}

fn parse_mode(mode: &str) -> Result<SessionMode, Box<dyn Error>> {
    match mode.to_lowercase().as_str() {
        "guided" => Ok(SessionMode::Guided),
        "autonomous" => Ok(SessionMode::Autonomous),
        _ => Err(Box::<dyn Error>::from(format!(
            "Invalid mode: {} (expected guided, autonomous)",
            mode
        ))),
    }
}

fn parse_status(status: &str) -> Result<SessionStatus, Box<dyn Error>> {
    match status.to_lowercase().as_str() {
        "pending" => Ok(SessionStatus::Pending),
        "running" => Ok(SessionStatus::Running),
        "paused" => Ok(SessionStatus::Paused),
        "completed" => Ok(SessionStatus::Completed),
        "failed" => Ok(SessionStatus::Failed),
        "cancelled" | "canceled" => Ok(SessionStatus::Cancelled),
        _ => Err(Box::<dyn Error>::from(format!(
            "Invalid status: {} (expected pending, running, paused, completed, failed, cancelled)",
            status
        ))),
    }
}

pub fn run(command: SessionCommand) -> Result<(), Box<dyn Error>> {
    match command {
        SessionCommand::Create {
            project_path,
            specs,
            prompt,
            runner,
            model,
            acp,
            worktree,
            merge_strategy,
            mode,
        } => create_session(CreateSessionRequest {
            project_path,
            specs,
            prompt,
            runner,
            model,
            acp,
            worktree,
            parallel: false,
            merge_strategy,
            mode,
            start: false,
        }),
        SessionCommand::Run {
            project_path,
            specs,
            prompt,
            runner,
            model,
            acp,
            worktree,
            parallel,
            merge_strategy,
            mode,
        } => create_session(CreateSessionRequest {
            project_path,
            specs,
            prompt,
            runner,
            model,
            acp,
            worktree,
            parallel,
            merge_strategy,
            mode,
            start: true,
        }),
        SessionCommand::Start { session_id } => start_session(&session_id),
        SessionCommand::Pause { session_id } => pause_session(&session_id),
        SessionCommand::Resume { session_id } => resume_session(&session_id),
        SessionCommand::Stop { session_id } => stop_session(&session_id),
        SessionCommand::Archive {
            session_id,
            output_dir,
            compress,
        } => archive_session(&session_id, output_dir, compress),
        SessionCommand::RotateLogs { session_id, keep } => rotate_logs(&session_id, keep),
        SessionCommand::Delete { session_id } => delete_session(&session_id),
        SessionCommand::View { session_id } => view_session(&session_id),
        SessionCommand::List {
            spec,
            status,
            runner,
        } => list_sessions(spec, status, runner),
        SessionCommand::Logs { session_id } => show_logs(&session_id),
        SessionCommand::Worktrees { all } => list_worktrees(all),
        SessionCommand::Merge {
            session_id,
            strategy,
            resolve,
        } => merge_session_worktree(&session_id, strategy, resolve),
        SessionCommand::Cleanup {
            session_id,
            keep_branch,
        } => cleanup_session_worktree(&session_id, keep_branch),
        SessionCommand::Gc => gc_worktrees(),
    }
}

pub enum SessionCommand {
    Create {
        project_path: String,
        specs: Vec<String>,
        prompt: Option<String>,
        runner: Option<String>,
        model: Option<String>,
        acp: bool,
        worktree: bool,
        merge_strategy: Option<String>,
        mode: String,
    },
    Run {
        project_path: String,
        specs: Vec<String>,
        prompt: Option<String>,
        runner: Option<String>,
        model: Option<String>,
        acp: bool,
        worktree: bool,
        parallel: bool,
        merge_strategy: Option<String>,
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
        output_dir: Option<String>,
        compress: bool,
    },
    RotateLogs {
        session_id: String,
        keep: usize,
    },
    Delete {
        session_id: String,
    },
    View {
        session_id: String,
    },
    List {
        spec: Option<String>,
        status: Option<String>,
        runner: Option<String>,
    },
    Logs {
        session_id: String,
    },
    Worktrees {
        all: bool,
    },
    Merge {
        session_id: String,
        strategy: Option<String>,
        resolve: bool,
    },
    Cleanup {
        session_id: String,
        keep_branch: bool,
    },
    Gc,
}

struct CreateSessionRequest {
    project_path: String,
    specs: Vec<String>,
    prompt: Option<String>,
    runner: Option<String>,
    model: Option<String>,
    acp: bool,
    worktree: bool,
    parallel: bool,
    merge_strategy: Option<String>,
    mode: String,
    start: bool,
}

pub struct RunDirectRequest {
    pub project_path: String,
    pub specs: Vec<String>,
    pub prompt: Option<String>,
    pub runner: Option<String>,
    pub model: Option<String>,
    pub dry_run: bool,
    pub acp: bool,
    pub worktree: bool,
    pub parallel: bool,
    pub merge_strategy: Option<String>,
}

struct ParallelRunRequest {
    manager: SessionManager,
    project_path: String,
    specs: Vec<String>,
    prompt: Option<String>,
    runner: Option<String>,
    model: Option<String>,
    acp: bool,
    merge_strategy: Option<MergeStrategy>,
    mode: SessionMode,
}

fn create_session(request: CreateSessionRequest) -> Result<(), Box<dyn Error>> {
    let CreateSessionRequest {
        project_path,
        specs,
        prompt,
        runner,
        model,
        acp,
        worktree,
        parallel,
        merge_strategy,
        mode,
        start,
    } = request;
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let mode = parse_mode(&mode)?;
        let merge_strategy = parse_merge_strategy(merge_strategy)?;

        if parallel {
            let _ = worktree;
            return run_parallel_sessions(ParallelRunRequest {
                manager,
                project_path,
                specs,
                prompt,
                runner,
                model,
                acp,
                merge_strategy,
                mode,
            })
            .await;
        }

        let session = manager
            .create_session_with_options(CreateSessionOptions {
                project_path,
                spec_ids: specs,
                prompt,
                runner,
                mode,
                model_override: model,
                protocol_override: acp.then_some(RunnerProtocol::Acp),
                use_worktree: worktree,
                merge_strategy,
                auto_merge_on_completion: worktree,
            })
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        println!(
            "{} Created session {} ({})",
            "✓".green(),
            session.id.bold(),
            session.runner
        );

        if start {
            start_and_wait(manager, &session.id).await?;
        }

        Ok(())
    })
}

pub fn run_direct(request: RunDirectRequest) -> Result<(), Box<dyn Error>> {
    let RunDirectRequest {
        project_path,
        specs,
        prompt,
        runner,
        model,
        dry_run,
        acp,
        worktree,
        parallel,
        merge_strategy,
    } = request;
    let missing_prompt = prompt
        .as_deref()
        .map(|value| value.trim().is_empty())
        .unwrap_or(true);
    if missing_prompt && specs.is_empty() {
        return Err(Box::<dyn Error>::from(
            "Provide a prompt with -p/--prompt or attach at least one --spec",
        ));
    }

    if dry_run {
        return print_dry_run_command(RunDirectRequest {
            project_path,
            specs,
            prompt,
            runner,
            model,
            dry_run,
            acp,
            worktree,
            parallel,
            merge_strategy,
        });
    }

    create_session(CreateSessionRequest {
        project_path,
        specs,
        prompt,
        runner,
        model,
        acp,
        worktree,
        parallel,
        merge_strategy,
        mode: "autonomous".to_string(),
        start: true,
    })
}

fn print_dry_run_command(request: RunDirectRequest) -> Result<(), Box<dyn Error>> {
    let RunDirectRequest {
        project_path,
        specs,
        prompt,
        runner,
        model,
        dry_run: _,
        acp,
        worktree,
        parallel,
        merge_strategy,
    } = request;
    let project_path_buf = std::path::PathBuf::from(&project_path);
    let registry = RunnerRegistry::load(project_path_buf.as_path())
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    let runner_id = match runner {
        Some(value) if !value.trim().is_empty() => value,
        _ => registry
            .default()
            .map(|value| value.to_string())
            .ok_or_else(|| Box::<dyn Error>::from("No default runner configured"))?,
    };
    let runner_definition = registry
        .get(&runner_id)
        .ok_or_else(|| Box::<dyn Error>::from(format!("Unknown runner: {}", runner_id)))?;
    let protocol = runner_definition
        .resolve_protocol(acp.then_some(RunnerProtocol::Acp))
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    let resolved_prompt = build_context_prompt(&project_path, &specs, prompt.as_deref());
    let mut runner_args = if protocol == RunnerProtocol::Acp {
        vec!["--acp".to_string()]
    } else {
        Vec::new()
    };
    let selected_model = model
        .filter(|value| !value.trim().is_empty())
        .or_else(|| runner_definition.model.clone());
    if let Some(model) = selected_model {
        runner_args.extend(
            runner_definition
                .build_model_args(&model)
                .map_err(|e| Box::<dyn Error>::from(e.to_string()))?,
        );
    }
    let config = SessionConfig {
        project_path: project_path.clone(),
        spec_ids: specs.clone(),
        prompt: if protocol == RunnerProtocol::Acp {
            None
        } else {
            resolved_prompt.clone()
        },
        runner: runner_id.clone(),
        mode: SessionMode::Autonomous,
        max_iterations: None,
        working_dir: Some(project_path.clone()),
        env_vars: HashMap::new(),
        runner_args,
    };

    println!("{}", "Dry run".bold());
    println!("  Runner: {}", runner_id);
    println!("  Protocol: {}", protocol);
    println!(
        "  Worktree: {}",
        if worktree || parallel {
            "enabled"
        } else {
            "disabled"
        }
    );
    if parallel {
        println!("  Parallel: enabled");
    }
    if let Some(strategy) = merge_strategy {
        println!("  Merge Strategy: {}", strategy);
    }
    if !specs.is_empty() {
        println!("  Specs: {}", specs.join(", "));
    }
    if let Some(prompt) = resolved_prompt {
        println!("  Prompt: {}", prompt);
    }
    println!("  Command: {}", runner_definition.command_preview(&config));
    Ok(())
}

fn start_session(session_id: &str) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        start_and_wait(manager, &session_id).await
    })
}

fn pause_session(session_id: &str) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        manager
            .pause_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        let session = manager
            .get_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;

        println!(
            "{} Session {} paused (status: {:?})",
            "✓".green(),
            session.id.bold(),
            session.status
        );
        Ok(())
    })
}

fn resume_session(session_id: &str) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        manager
            .resume_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        let session = manager
            .get_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;

        println!(
            "{} Session {} resumed (status: {:?})",
            "✓".green(),
            session.id.bold(),
            session.status
        );
        Ok(())
    })
}

fn stop_session(session_id: &str) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        manager
            .stop_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        let session = manager
            .get_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;

        println!(
            "{} Session {} stopped (status: {:?})",
            "✓".green(),
            session.id.bold(),
            session.status
        );
        Ok(())
    })
}

fn archive_session(
    session_id: &str,
    output_dir: Option<String>,
    compress: bool,
) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let archive_path = manager
            .archive_session(
                &session_id,
                ArchiveOptions {
                    output_dir: output_dir.map(std::path::PathBuf::from),
                    compress,
                },
            )
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        println!(
            "{} Session {} archived to {}",
            "✓".green(),
            session_id.bold(),
            archive_path.display()
        );
        Ok(())
    })
}

fn rotate_logs(session_id: &str, keep: usize) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let deleted = manager
            .rotate_logs(&session_id, keep)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        println!(
            "{} Pruned {} log entries for session {}",
            "✓".green(),
            deleted,
            session_id.bold()
        );
        Ok(())
    })
}

fn delete_session(session_id: &str) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        manager
            .delete_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
        println!("{} Session deleted", "✓".green());
        Ok(())
    })
}

fn view_session(session_id: &str) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let session = manager
            .get_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;

        println!();
        println!("{}", "Session".bold());
        println!("  ID: {}", session.id);
        println!("  Runner: {}", session.runner);
        println!("  Mode: {:?}", session.mode);
        println!("  Status: {:?}", session.status);
        println!(
            "  Spec: {}",
            if session.spec_ids.is_empty() {
                "-".to_string()
            } else {
                session.spec_ids.join(", ")
            }
        );
        if let Some(ref prompt) = session.prompt {
            println!("  Prompt: {}", prompt);
        }
        println!("  Project Path: {}", session.project_path);
        println!("  Started: {}", session.started_at);
        println!(
            "  Ended: {}",
            session
                .ended_at
                .map(|t| t.to_rfc3339())
                .unwrap_or_else(|| "-".to_string())
        );
        println!(
            "  Duration: {}",
            session
                .duration_ms
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string())
        );
        println!(
            "  Tokens: {}",
            session
                .token_count
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string())
        );
        println!();
        Ok(())
    })
}

fn list_sessions(
    spec: Option<String>,
    status: Option<String>,
    runner: Option<String>,
) -> Result<(), Box<dyn Error>> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let status_filter = match status {
            Some(value) => Some(parse_status(&value)?),
            None => None,
        };
        let sessions = manager
            .list_sessions(None, spec.as_deref(), status_filter, runner.as_deref())
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        println!();
        println!("{}", "Sessions".bold());
        for s in sessions {
            println!(
                "  {} {} • {:?} • {}",
                s.id.bold(),
                s.runner,
                s.status,
                if s.spec_ids.is_empty() {
                    "-".to_string()
                } else {
                    s.spec_ids.join(", ")
                }
            );
        }
        println!();
        Ok(())
    })
}

fn show_logs(session_id: &str) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let logs = manager
            .get_logs(&session_id, Some(1000))
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        for log in logs {
            println!(
                "[{}] {:?} {}",
                log.timestamp.to_rfc3339(),
                log.level,
                log.message
            );
        }

        Ok(())
    })
}

fn parse_merge_strategy(value: Option<String>) -> Result<Option<MergeStrategy>, Box<dyn Error>> {
    value
        .map(|strategy| strategy.parse::<MergeStrategy>())
        .transpose()
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))
}

async fn run_parallel_sessions(request: ParallelRunRequest) -> Result<(), Box<dyn Error>> {
    let ParallelRunRequest {
        manager,
        project_path,
        specs,
        prompt,
        runner,
        model,
        acp,
        merge_strategy,
        mode,
    } = request;
    if specs.len() < 2 {
        return Err(Box::<dyn Error>::from(
            "Parallel execution requires at least two --spec values",
        ));
    }

    if acp {
        return Err(Box::<dyn Error>::from(
            "Parallel worktree sessions do not support --acp yet",
        ));
    }

    let mut sessions = Vec::new();
    for spec_id in &specs {
        let session = manager
            .create_session_with_options(CreateSessionOptions {
                project_path: project_path.clone(),
                spec_ids: vec![spec_id.clone()],
                prompt: prompt.clone(),
                runner: runner.clone(),
                mode,
                model_override: model.clone(),
                protocol_override: None,
                use_worktree: true,
                merge_strategy,
                auto_merge_on_completion: false,
            })
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
        println!(
            "{} Created session {} ({}) for spec {}",
            "✓".green(),
            session.id.bold(),
            session.runner,
            spec_id
        );
        sessions.push(session);
    }

    for session in &sessions {
        start_only(&manager, &session.id).await?;
    }

    loop {
        let mut remaining = 0usize;
        for session in &sessions {
            let current = manager
                .get_session(&session.id)
                .await
                .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
                .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;
            if !current.is_completed() {
                remaining += 1;
            }
        }

        if remaining == 0 {
            break;
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    let mut failures = Vec::new();
    for session in &sessions {
        let mut current = manager
            .get_session(&session.id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;

        if matches!(current.status, SessionStatus::Completed) && worktree_enabled(&current) {
            merge_worktree_record(&manager, &mut current, merge_strategy, false, true).await?;
            current = manager
                .get_session(&session.id)
                .await
                .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
                .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;
        }

        println!(
            "{} Session {} finished with status {:?}",
            if matches!(current.status, SessionStatus::Completed) {
                "✓".green()
            } else {
                "✗".red()
            },
            current.id.bold(),
            current.status
        );

        if !matches!(current.status, SessionStatus::Completed) {
            failures.push(current.id.clone());
        }
    }

    if failures.is_empty() {
        Ok(())
    } else {
        Err(Box::<dyn Error>::from(format!(
            "One or more parallel sessions failed: {}",
            failures.join(", ")
        )))
    }
}

fn list_worktrees(all: bool) -> Result<(), Box<dyn Error>> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let sessions = manager
            .list_sessions(None, None, None, None)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        println!();
        println!("{}", "Worktree Sessions".bold());
        for session in sessions {
            if !worktree_enabled(&session) {
                continue;
            }
            let worktree_status = session
                .metadata
                .get(WORKTREE_STATUS_KEY)
                .cloned()
                .unwrap_or_else(|| "unknown".to_string());
            if !all && matches!(worktree_status.as_str(), "merged" | "abandoned") {
                continue;
            }
            let branch = session
                .metadata
                .get("worktree_branch")
                .cloned()
                .unwrap_or_else(|| "-".to_string());
            println!(
                "  {} {} • session={:?} • worktree={} • {}",
                session.id.bold(),
                session.runner,
                session.status,
                worktree_status,
                branch
            );
        }
        println!();
        Ok(())
    })
}

fn merge_session_worktree(
    session_id: &str,
    strategy: Option<String>,
    resolve: bool,
) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let strategy = parse_merge_strategy(strategy)?;
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let mut session = manager
            .get_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;

        merge_worktree_record(&manager, &mut session, strategy, resolve, true).await
    })
}

fn cleanup_session_worktree(session_id: &str, keep_branch: bool) -> Result<(), Box<dyn Error>> {
    let session_id = session_id.to_string();
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let mut session = manager
            .get_session(&session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;
        let worktree_manager = GitWorktreeManager::for_project(&session.project_path)
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
        worktree_manager
            .cleanup_session(&session_id, keep_branch)
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
        session.metadata.insert(
            WORKTREE_STATUS_KEY.to_string(),
            WorktreeStatus::Abandoned.to_string(),
        );
        session.metadata.insert(
            WORKTREE_CLEANED_AT_KEY.to_string(),
            chrono::Utc::now().to_rfc3339(),
        );
        session.touch();
        manager
            .update_session(&session)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
        println!(
            "{} Cleaned worktree for session {}",
            "✓".green(),
            session.id.bold()
        );
        Ok(())
    })
}

fn gc_worktrees() -> Result<(), Box<dyn Error>> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let sessions = manager
            .list_sessions(None, None, None, None)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
        let mut projects = std::collections::BTreeSet::<PathBuf>::new();
        for session in sessions {
            if worktree_enabled(&session) {
                projects.insert(PathBuf::from(session.project_path));
            }
        }

        let mut pruned_entries = 0usize;
        let mut removed_worktrees = 0usize;
        let mut removed_branches = 0usize;
        for project in projects {
            let gc = GitWorktreeManager::for_project(&project)
                .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
                .gc()
                .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
            pruned_entries += gc.pruned_entries;
            removed_worktrees += gc.removed_worktrees;
            removed_branches += gc.removed_branches;
        }

        println!(
            "{} GC pruned {} registry entries, removed {} worktrees, removed {} branches",
            "✓".green(),
            pruned_entries,
            removed_worktrees,
            removed_branches
        );
        Ok(())
    })
}

async fn merge_worktree_record(
    manager: &SessionManager,
    session: &mut leanspec_core::sessions::Session,
    strategy: Option<MergeStrategy>,
    resolve: bool,
    cleanup_on_success: bool,
) -> Result<(), Box<dyn Error>> {
    let worktree_manager = GitWorktreeManager::for_project(&session.project_path)
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    let outcome = worktree_manager
        .merge_session(&session.id, strategy, resolve)
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

    session
        .metadata
        .insert(WORKTREE_STATUS_KEY.to_string(), outcome.status.to_string());
    session.metadata.remove(WORKTREE_CONFLICT_FILES_KEY);

    if !outcome.conflicted_files.is_empty() {
        session.metadata.insert(
            WORKTREE_CONFLICT_FILES_KEY.to_string(),
            serde_json::to_string(&outcome.conflicted_files)
                .map_err(|e| Box::<dyn Error>::from(e.to_string()))?,
        );
        session.status = SessionStatus::Failed;
        println!(
            "{} Merge conflict for session {}: {}",
            "✗".red(),
            session.id.bold(),
            outcome.conflicted_files.join(", ")
        );
    } else if outcome.merged {
        if cleanup_on_success {
            worktree_manager
                .cleanup_session(&session.id, false)
                .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
            session.metadata.insert(
                WORKTREE_CLEANED_AT_KEY.to_string(),
                chrono::Utc::now().to_rfc3339(),
            );
        }
        println!(
            "{} Merged session {} back into {}",
            "✓".green(),
            session.id.bold(),
            outcome.base_branch
        );
    } else {
        println!(
            "{} Session {} is ready on branch {}",
            "✓".green(),
            session.id.bold(),
            outcome.branch_name
        );
    }

    session.touch();
    manager
        .update_session(session)
        .await
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    Ok(())
}

async fn start_and_wait(manager: SessionManager, session_id: &str) -> Result<(), Box<dyn Error>> {
    start_only(&manager, session_id).await?;

    loop {
        let session = manager
            .get_session(session_id)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?
            .ok_or_else(|| Box::<dyn Error>::from("Session not found"))?;

        if session.is_completed() {
            println!(
                "{} Session {} completed with status {:?}",
                "✓".green(),
                session.id.bold(),
                session.status
            );
            break;
        }

        tokio::time::sleep(Duration::from_millis(500)).await;
    }

    Ok(())
}

async fn start_only(manager: &SessionManager, session_id: &str) -> Result<(), Box<dyn Error>> {
    manager
        .start_session(session_id)
        .await
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

    println!("{} Session {} started", "✓".green(), session_id.bold());

    Ok(())
}
