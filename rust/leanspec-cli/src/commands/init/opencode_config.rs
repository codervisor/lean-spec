use serde_json::{json, Map, Value};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug)]
pub struct OpencodeConfigResult {
    pub config_path: PathBuf,
    pub created: bool,
    pub merged: bool,
    pub skipped: bool,
    pub error: Option<String>,
}

pub fn configure_opencode(root: &Path) -> OpencodeConfigResult {
    let config_path = root.join("opencode.json");

    match write_opencode_config(&config_path) {
        Ok(OpencodeWriteOutcome::Created) => OpencodeConfigResult {
            config_path: PathBuf::from("opencode.json"),
            created: true,
            merged: false,
            skipped: false,
            error: None,
        },
        Ok(OpencodeWriteOutcome::Merged) => OpencodeConfigResult {
            config_path: PathBuf::from("opencode.json"),
            created: false,
            merged: true,
            skipped: false,
            error: None,
        },
        Ok(OpencodeWriteOutcome::Skipped) => OpencodeConfigResult {
            config_path: PathBuf::from("opencode.json"),
            created: false,
            merged: false,
            skipped: true,
            error: None,
        },
        Err(err) => OpencodeConfigResult {
            config_path: PathBuf::from("opencode.json"),
            created: false,
            merged: false,
            skipped: false,
            error: Some(err.to_string()),
        },
    }
}

fn write_opencode_config(path: &Path) -> Result<OpencodeWriteOutcome, Box<dyn std::error::Error>> {
    let existing = read_json(path)?;
    let mut config = existing.clone().unwrap_or_else(|| {
        json!({
            "$schema": "https://opencode.ai/config.json",
            "mcp": {}
        })
    });

    if config.get("$schema").is_none() {
        config["$schema"] = Value::String("https://opencode.ai/config.json".to_string());
    }

    let mcp_map = match config.get_mut("mcp").and_then(Value::as_object_mut) {
        Some(map) => map,
        None => {
            config["mcp"] = Value::Object(Map::new());
            config["mcp"].as_object_mut().expect("mcp object")
        }
    };

    if mcp_map.contains_key("leanspec") {
        return Ok(OpencodeWriteOutcome::Skipped);
    }

    mcp_map.insert(
        "leanspec".to_string(),
        json!({
            "type": "local",
            "command": ["npx", "-y", "@leanspec/mcp"]
        }),
    );

    write_json(path, &config)?;

    if existing.is_some() {
        Ok(OpencodeWriteOutcome::Merged)
    } else {
        Ok(OpencodeWriteOutcome::Created)
    }
}

fn read_json(path: &Path) -> Result<Option<Value>, Box<dyn std::error::Error>> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path)?;
    let parsed = serde_json::from_str(&content)?;
    Ok(Some(parsed))
}

fn write_json(path: &Path, value: &Value) -> Result<(), Box<dyn std::error::Error>> {
    let content = serde_json::to_string_pretty(value)? + "\n";
    fs::write(path, content)?;
    Ok(())
}

enum OpencodeWriteOutcome {
    Created,
    Merged,
    Skipped,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_configure_opencode_creates_config() {
        let temp_dir = tempfile::tempdir().expect("tempdir");

        let result = configure_opencode(temp_dir.path());
        assert!(result.created, "expected created result");

        let content = fs::read_to_string(temp_dir.path().join("opencode.json")).expect("config");
        let parsed: Value = serde_json::from_str(&content).expect("valid json");
        assert_eq!(
            parsed["mcp"]["leanspec"]["command"],
            json!(["npx", "-y", "@leanspec/mcp"])
        );
    }

    #[test]
    fn test_configure_opencode_merges_existing_config() {
        let temp_dir = tempfile::tempdir().expect("tempdir");
        fs::write(
            temp_dir.path().join("opencode.json"),
            r#"{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "custom": {
      "type": "local",
      "command": ["custom"]
    }
  }
}
"#,
        )
        .expect("write config");

        let result = configure_opencode(temp_dir.path());
        assert!(result.merged, "expected merge result");

        let content = fs::read_to_string(temp_dir.path().join("opencode.json")).expect("config");
        let parsed: Value = serde_json::from_str(&content).expect("valid json");
        assert!(
            parsed["mcp"]["custom"].is_object(),
            "existing config should remain"
        );
        assert!(
            parsed["mcp"]["leanspec"].is_object(),
            "lean spec config should be added"
        );
    }

    #[test]
    fn test_configure_opencode_reports_invalid_existing_config() {
        let temp_dir = tempfile::tempdir().expect("tempdir");
        fs::write(temp_dir.path().join("opencode.json"), "{ invalid json").expect("write config");

        let result = configure_opencode(temp_dir.path());
        assert!(
            result.error.is_some(),
            "invalid existing config should return an error"
        );

        let content = fs::read_to_string(temp_dir.path().join("opencode.json")).expect("config");
        assert_eq!(content, "{ invalid json");
    }
}
