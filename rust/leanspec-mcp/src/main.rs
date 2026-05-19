//! LeanSpec MCP server entrypoint.
//!
//! Reads newline-delimited JSON-RPC requests from stdin, writes responses to
//! stdout. The adapter is resolved once at startup; per-call work happens on
//! the tokio runtime so blocking adapter operations can be moved to a
//! `spawn_blocking` pool later without changing the wire layer.

use std::io::{self, BufRead, Write};
use std::process::ExitCode;
use std::sync::Arc;

use leanspec_mcp::{
    handle_request, protocol::McpRequest, protocol::McpResponse, state::ServerState,
};
use tokio::runtime::Runtime;

fn main() -> ExitCode {
    let rt = match Runtime::new() {
        Ok(rt) => rt,
        Err(e) => {
            eprintln!("leanspec-mcp: failed to start tokio runtime: {e}");
            return ExitCode::from(1);
        }
    };

    let state = match ServerState::from_project() {
        Ok(state) => state,
        Err(err) => {
            eprintln!("leanspec-mcp: {err}");
            return ExitCode::from(1);
        }
    };

    rt.block_on(run_loop(state));
    ExitCode::SUCCESS
}

async fn run_loop(state: Arc<ServerState>) {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let input = match line {
            Ok(l) => l,
            Err(e) => {
                eprintln!("leanspec-mcp: stdin error: {e}");
                break;
            }
        };
        if input.trim().is_empty() {
            continue;
        }

        let response = match serde_json::from_str::<McpRequest>(&input) {
            Ok(request) => handle_request(Arc::clone(&state), request).await,
            Err(e) => McpResponse::error(None, -32700, format!("parse error: {e}")),
        };

        let json = serde_json::to_string(&response).unwrap_or_else(|_| {
            r#"{"jsonrpc":"2.0","error":{"code":-32603,"message":"internal error"}}"#.into()
        });

        if writeln!(stdout, "{json}").is_err() {
            break;
        }
        if stdout.flush().is_err() {
            break;
        }
    }
}
