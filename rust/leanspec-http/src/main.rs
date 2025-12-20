//! LeanSpec HTTP Server
//!
//! Command-line binary for running the HTTP server.

use clap::Parser;
use leanspec_http::{load_config, start_server_with_config};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// LeanSpec HTTP Server
#[derive(Parser, Debug)]
#[command(name = "leanspec-http")]
#[command(about = "HTTP server for LeanSpec web UI")]
#[command(version)]
struct Args {
    /// Host to bind to
    #[arg(short = 'H', long, default_value = "127.0.0.1")]
    host: String,

    /// Port to listen on
    #[arg(short, long, default_value = "3333")]
    port: u16,

    /// Enable verbose logging
    #[arg(short, long)]
    verbose: bool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    // Initialize tracing
    let filter = if args.verbose {
        "leanspec_http=debug,tower_http=debug"
    } else {
        "leanspec_http=info,tower_http=info"
    };

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| filter.into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = load_config().unwrap_or_default();

    // Use CLI args or config values
    let host = if args.host != "127.0.0.1" {
        args.host
    } else {
        config.server.host.clone()
    };

    let port = if args.port != 3333 {
        args.port
    } else {
        config.server.port
    };

    println!("🚀 LeanSpec HTTP Server");
    println!("   Listening on http://{}:{}", host, port);
    println!("   Press Ctrl+C to stop");
    println!();

    start_server_with_config(&host, port, config).await?;

    Ok(())
}
