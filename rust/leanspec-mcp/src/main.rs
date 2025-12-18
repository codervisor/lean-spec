//! LeanSpec MCP Server
//!
//! Model Context Protocol server for LeanSpec spec management.
//! Communicates over stdio using JSON-RPC.

use leanspec_mcp::{handle_request, McpRequest, McpResponse};
use std::io::{self, BufRead, Write};
use tokio::runtime::Runtime;

fn main() {
    let rt = Runtime::new().expect("Failed to create Tokio runtime");

    rt.block_on(async {
        run_server().await;
    });
}

async fn run_server() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    // Read requests from stdin, write responses to stdout
    for line in stdin.lock().lines() {
        match line {
            Ok(input) => {
                if input.trim().is_empty() {
                    continue;
                }

                let response = match serde_json::from_str::<McpRequest>(&input) {
                    Ok(request) => handle_request(request).await,
                    Err(e) => McpResponse::error(-32700, &format!("Parse error: {}", e)),
                };

                let response_json = serde_json::to_string(&response).unwrap_or_else(|_| {
                    r#"{"jsonrpc":"2.0","error":{"code":-32603,"message":"Internal error"}}"#
                        .to_string()
                });

                writeln!(stdout, "{}", response_json).ok();
                stdout.flush().ok();
            }
            Err(e) => {
                eprintln!("Error reading input: {}", e);
                break;
            }
        }
    }
}
