use serde_json::{json, Map, Value};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum McpTool {
    Claude,
    VsCode,
    Cursor,
    Windsurf,
}

impl McpTool {
    pub fn name(&self) -> &'static str {
        match self {
            McpTool::Claude => "Claude Code",
            McpTool::VsCode => "VS Code",
            McpTool::Cursor => "Cursor",
            McpTool::Windsurf => "Windsurf",
        }
    }

    pub fn config_path(&self) -> &'static str {
        match self {
            McpTool::Claude => ".mcp.json",
            McpTool::VsCode => ".vscode/mcp.json",
            McpTool::Cursor => ".cursor/mcp.json",
            McpTool::Windsurf => ".windsurf/mcp.json",
        }
    }

    fn servers_key(&self) -> &'static str {
        match self {
            McpTool::VsCode => "servers",
            _ => "mcpServers",
        }
    }

    fn detection_directories(&self) -> &'static [&'static str] {
        match self {
            McpTool::Claude => &[".claude"],
            McpTool::VsCode => &[".vscode"],
            McpTool::Cursor => &[".cursor"],
            McpTool::Windsurf => &[".windsurf"],
        }
    }

    fn detection_files(&self) -> &'static [&'static str] {
        match self {
            McpTool::Claude => &["CLAUDE.md", ".claude.json"],
            McpTool::VsCode => &[],
            McpTool::Cursor => &[".cursorrules"],
            McpTool::Windsurf => &[".windsurfrules"],
        }
    }
}

#[derive(Clone, Debug)]
pub struct McpDetectionResult {
    pub tool: McpTool,
    pub detected: bool,
    pub reasons: Vec<String>,
}

#[derive(Clone, Debug)]
pub struct McpConfigResult {
    pub tool: McpTool,
    pub config_path: PathBuf,
    pub created: bool,
    pub merged: bool,
    pub skipped: bool,
    pub error: Option<String>,
}

pub fn detect_mcp_tools(root: &Path) -> Vec<McpDetectionResult> {
    let mut results = Vec::new();

    for tool in all_tools() {
        let mut reasons: Vec<String> = Vec::new();

        for dir in tool.detection_directories() {
            let dir_path = root.join(dir);
            if dir_path.is_dir() {
                reasons.push(format!("{dir}/ directory found"));
            }
        }

        for file in tool.detection_files() {
            let file_path = root.join(file);
            if file_path.exists() {
                reasons.push(format!("{file} found"));
            }
        }

        results.push(McpDetectionResult {
            tool,
            detected: !reasons.is_empty(),
            reasons,
        });
    }

    results
}

pub fn default_mcp_selection(detections: &[McpDetectionResult]) -> Vec<McpTool> {
    detections
        .iter()
        .filter(|r| r.detected)
        .map(|r| r.tool)
        .collect()
}

pub fn configure_mcp(root: &Path, tools: &[McpTool]) -> Vec<McpConfigResult> {
    let mut results = Vec::new();

    for tool in tools {
        let config_relative = tool.config_path();
        let config_path = root.join(config_relative);

        let result = match write_mcp_config(&config_path, *tool) {
            Ok(McpWriteOutcome::Created) => McpConfigResult {
                tool: *tool,
                config_path: PathBuf::from(config_relative),
                created: true,
                merged: false,
                skipped: false,
                error: None,
            },
            Ok(McpWriteOutcome::Merged) => McpConfigResult {
                tool: *tool,
                config_path: PathBuf::from(config_relative),
                created: false,
                merged: true,
                skipped: false,
                error: None,
            },
            Ok(McpWriteOutcome::Skipped) => McpConfigResult {
                tool: *tool,
                config_path: PathBuf::from(config_relative),
                created: false,
                merged: false,
                skipped: true,
                error: None,
            },
            Err(e) => McpConfigResult {
                tool: *tool,
                config_path: PathBuf::from(config_relative),
                created: false,
                merged: false,
                skipped: false,
                error: Some(e.to_string()),
            },
        };

        results.push(result);
    }

    results
}

fn write_mcp_config(
    path: &Path,
    tool: McpTool,
) -> Result<McpWriteOutcome, Box<dyn std::error::Error>> {
    let parent = path.parent().ok_or("Invalid MCP config path")?;
    fs::create_dir_all(parent)?;

    let servers_key = tool.servers_key();
    let existing = read_json(path);
    let mut config = existing.clone().unwrap_or_else(|| json!({servers_key: {}}));

    let servers_map = match config.get_mut(servers_key).and_then(Value::as_object_mut) {
        Some(map) => map,
        None => {
            config[servers_key] = Value::Object(Map::new());
            config[servers_key].as_object_mut().expect("servers object")
        }
    };

    if servers_map.contains_key("lean-spec") {
        return Ok(McpWriteOutcome::Skipped);
    }

    let mcp_entry = build_mcp_entry();
    servers_map.insert("lean-spec".to_string(), mcp_entry);

    write_json(path, &config)?;

    if existing.is_some() {
        Ok(McpWriteOutcome::Merged)
    } else {
        Ok(McpWriteOutcome::Created)
    }
}

fn build_mcp_entry() -> Value {
    json!({
        "command": "npx",
        "args": ["-y", "@leanspec/mcp"]
    })
}

fn read_json(path: &Path) -> Option<Value> {
    let content = fs::read_to_string(path).ok()?;
    serde_json::from_str(&content).ok()
}

fn write_json(path: &Path, value: &Value) -> Result<(), Box<dyn std::error::Error>> {
    let content = serde_json::to_string_pretty(value)? + "\n";
    fs::write(path, content)?;
    Ok(())
}

enum McpWriteOutcome {
    Created,
    Merged,
    Skipped,
}

pub fn all_tools() -> Vec<McpTool> {
    vec![
        McpTool::Claude,
        McpTool::VsCode,
        McpTool::Cursor,
        McpTool::Windsurf,
    ]
}
