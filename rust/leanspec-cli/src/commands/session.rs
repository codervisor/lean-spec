use colored::Colorize;
use leanspec_core::sessions::{
    ArchiveOptions, SessionDatabase, SessionManager, SessionMode, SessionStatus,
};
use leanspec_core::storage::config::config_dir;
use std::error::Error;
use std::time::Duration;

fn build_manager() -> Result<SessionManager, Box<dyn Error>> {
    let sessions_dir = config_dir();
    std::fs::create_dir_all(&sessions_dir).map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    let db = SessionDatabase::new(sessions_dir.join("sessions.db"))
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;
    Ok(SessionManager::new(db))
}

fn parse_mode(mode: &str) -> Result<SessionMode, Box<dyn Error>> {
    match mode.to_lowercase().as_str() {
        "guided" => Ok(SessionMode::Guided),
        "autonomous" => Ok(SessionMode::Autonomous),
        "ralph" => Ok(SessionMode::Ralph),
        _ => Err(Box::<dyn Error>::from(format!(
            "Invalid mode: {} (expected guided, autonomous, ralph)",
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
            spec,
            tool,
            mode,
        } => create_session(project_path, spec, tool, mode, false),
        SessionCommand::Run {
            project_path,
            spec,
            tool,
            mode,
        } => create_session(project_path, spec, tool, mode, true),
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
        SessionCommand::List { spec, status, tool } => list_sessions(spec, status, tool),
        SessionCommand::Logs { session_id } => show_logs(&session_id),
        SessionCommand::Tools => list_tools(),
    }
}

pub enum SessionCommand {
    Create {
        project_path: String,
        spec: Option<String>,
        tool: String,
        mode: String,
    },
    Run {
        project_path: String,
        spec: Option<String>,
        tool: String,
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
        tool: Option<String>,
    },
    Logs {
        session_id: String,
    },
    Tools,
}

fn create_session(
    project_path: String,
    spec: Option<String>,
    tool: String,
    mode: String,
    start: bool,
) -> Result<(), Box<dyn Error>> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let mode = parse_mode(&mode)?;
        let session = manager
            .create_session(project_path, spec, tool, mode)
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        println!(
            "{} Created session {} ({})",
            "✓".green(),
            session.id.bold(),
            session.tool
        );

        if start {
            start_and_wait(manager, &session.id).await?;
        }

        Ok(())
    })
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
        println!("  Tool: {}", session.tool);
        println!("  Mode: {:?}", session.mode);
        println!("  Status: {:?}", session.status);
        println!(
            "  Spec: {}",
            session.spec_id.unwrap_or_else(|| "-".to_string())
        );
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
    tool: Option<String>,
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
            .list_sessions(spec.as_deref(), status_filter, tool.as_deref())
            .await
            .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

        println!();
        println!("{}", "Sessions".bold());
        for s in sessions {
            println!(
                "  {} {} • {:?} • {}",
                s.id.bold(),
                s.tool,
                s.status,
                s.spec_id.unwrap_or_else(|| "-".to_string())
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

fn list_tools() -> Result<(), Box<dyn Error>> {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;
    rt.block_on(async move {
        let manager = build_manager()?;
        let tools = manager.list_available_tools().await;

        println!();
        println!("{}", "Available Tools".bold());
        for tool in tools {
            println!("  • {}", tool);
        }
        println!();

        Ok(())
    })
}

async fn start_and_wait(manager: SessionManager, session_id: &str) -> Result<(), Box<dyn Error>> {
    manager
        .start_session(session_id)
        .await
        .map_err(|e| Box::<dyn Error>::from(e.to_string()))?;

    println!("{} Session {} started", "✓".green(), session_id.bold());

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
