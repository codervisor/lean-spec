//! LeanSpec HTTP Server
//!
//! Command-line binary for running the HTTP server.

use clap::Parser;
use leanspec_http::{
    load_config, load_config_from_path, start_server_with_config, ProjectRegistry, ServerConfig,
};
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// LeanSpec HTTP Server
#[derive(Parser, Debug)]
#[command(name = "leanspec-http")]
#[command(about = "HTTP server for LeanSpec web UI")]
#[command(version)]
struct Args {
    /// Host to bind to
    #[arg(short = 'H', long, default_value = "127.0.0.1", env = "LEANSPEC_HOST")]
    host: String,

    /// Port to listen on
    #[arg(short, long, default_value = "3000", env = "PORT")]
    port: u16,

    /// Project directory (auto-add and select)
    #[arg(short = 'P', long, env = "LEANSPEC_PROJECT")]
    project: Option<PathBuf>,

    /// Config file path
    #[arg(short = 'c', long, env = "LEANSPEC_CONFIG")]
    config: Option<PathBuf>,

    /// Skip loading config file
    #[arg(long)]
    no_config: bool,

    /// Enable verbose logging
    #[arg(short, long)]
    verbose: bool,

    /// Log level (trace, debug, info, warn, error)
    #[arg(long, default_value = "info")]
    log_level: String,

    /// Auto-open browser on start
    #[arg(long, default_value_t = true)]
    open: bool,

    /// Do not auto-open browser
    #[arg(long = "no-open")]
    no_open: bool,

    /// Browser to open (firefox, chrome, safari, default)
    #[arg(long)]
    browser: Option<String>,

    /// Read-only mode (prevent modifications)
    #[arg(long)]
    readonly: bool,

    /// UI dist directory override
    #[arg(long, env = "LEANSPEC_UI_DIST")]
    ui_dist: Option<PathBuf>,

    /// CORS allowed origins (comma-separated)
    #[arg(long, value_delimiter = ',', env = "LEANSPEC_CORS_ORIGINS")]
    cors_origins: Vec<String>,

    /// Disable CORS entirely
    #[arg(long)]
    no_cors: bool,

    /// Force UI theme (light, dark, auto)
    #[arg(long)]
    theme: Option<String>,

    /// Force UI locale (en, zh-CN)
    #[arg(long)]
    locale: Option<String>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Initialize tracing
    let mut level = args.log_level.clone();
    if args.verbose && args.log_level == "info" {
        level = "debug".to_string();
    }

    let filter = format!("leanspec_http={level},tower_http={level}");

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| filter.into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let mut config = load_server_config(&args);

    // Apply CLI overrides
    if args.host != "127.0.0.1" {
        config.server.host = args.host;
    }

    if args.port != 3000 {
        config.server.port = args.port;
    }

    if let Some(ui_dist) = args.ui_dist {
        config.server.ui_dist = Some(ui_dist);
    }

    if let Some(theme) = args.theme {
        config.ui.theme = theme;
    }

    if let Some(locale) = args.locale {
        config.ui.locale = locale;
    }

    if args.readonly {
        config.security.readonly = true;
    }

    if args.no_cors {
        config.server.cors.enabled = false;
    } else if !args.cors_origins.is_empty() {
        config.server.cors.enabled = true;
        config.server.cors.origins = args.cors_origins;
    }

    let should_open_browser = if args.no_open { false } else { args.open };
    config.server.open_browser = should_open_browser;
    if let Some(browser) = args.browser {
        config.server.browser = Some(browser);
    }

    // Auto-register project if requested
    if let Some(project_path) = args.project {
        if let Ok(mut registry) = ProjectRegistry::new() {
            if registry.all().iter().all(|p| p.path != project_path) {
                if let Err(err) = registry.add(&project_path) {
                    tracing::warn!("Failed to add project {}: {}", project_path.display(), err);
                }
            }
        }
        std::env::set_var("LEANSPEC_PROJECT_PATH", project_path);
    }

    let host = config.server.host.clone();
    let port = config.server.port;

    println!("🚀 LeanSpec HTTP Server");
    println!("   Listening on http://{}:{}", host, port);
    println!("   Press Ctrl+C to stop");
    println!();

    if config.server.open_browser {
        let url = format!("http://{}:{}", host, port);
        let browser = config.server.browser.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(400)).await;
            open_browser(&url, browser.as_deref());
        });
    }

    start_server_with_config(&host, port, config).await?;

    Ok(())
}

fn load_server_config(args: &Args) -> ServerConfig {
    if args.no_config {
        return ServerConfig::default();
    }

    if let Some(path) = &args.config {
        return load_config_from_path(path).unwrap_or_default();
    }

    load_config().unwrap_or_default()
}

fn open_browser(url: &str, browser: Option<&str>) {
    if let Some(browser) = browser {
        let browser = browser.trim();
        if browser.is_empty() || browser.eq_ignore_ascii_case("default") {
            let _ = webbrowser::open(url);
            return;
        }

        let launched = if cfg!(target_os = "macos") {
            Command::new("open")
                .args(["-a", browser, url])
                .status()
                .is_ok()
        } else if cfg!(target_os = "windows") {
            Command::new("cmd")
                .args(["/C", "start", "", browser, url])
                .status()
                .is_ok()
        } else {
            Command::new(browser).arg(url).status().is_ok()
        };

        if launched {
            return;
        }
    }

    let _ = webbrowser::open(url);
}
