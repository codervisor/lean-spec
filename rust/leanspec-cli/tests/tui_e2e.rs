//! E2E integration tests for TUI headless mode.

use assert_cmd::Command;

fn fixtures_dir() -> String {
    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/tui-sample")
        .to_string_lossy()
        .into_owned()
}

fn run_headless(script: &str) -> serde_json::Value {
    let output = Command::cargo_bin("lean-spec")
        .unwrap()
        .args(["tui", "--headless", script, "--specs-dir", &fixtures_dir()])
        .output()
        .expect("failed to run lean-spec tui --headless");

    assert!(
        output.status.success(),
        "headless failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    serde_json::from_slice(&output.stdout).expect("failed to parse JSON output")
}

#[test]
fn test_default_state() {
    let state = run_headless("");
    // Default view is Board (--view board is the CLI default)
    assert_eq!(state["view"], "Board");
    assert_eq!(state["mode"], "Normal");
    // 10 specs total, but archived hidden by default → 9 visible
    let spec_count = state["spec_count"].as_u64().unwrap();
    assert!(spec_count > 0, "should have specs");
    // filtered_count <= spec_count
    let filtered = state["filtered_count"].as_u64().unwrap();
    assert!(filtered <= spec_count);
}

#[test]
fn test_sort_cycles() {
    // "s" → ID ↑
    let state = run_headless("s");
    assert_eq!(state["sort"], "ID ↑");

    // "ss" → Priority ↓
    let state = run_headless("ss");
    assert_eq!(state["sort"], "Priority ↓");
}

#[test]
fn test_view_switch() {
    // "1" → Board view (keybinding: 1=Board, 2=List)
    let state = run_headless("1");
    assert_eq!(state["view"], "Board");
    assert!(!state["board_groups"].as_array().unwrap().is_empty());
}

#[test]
fn test_navigate_down() {
    // "jj" → selection should be at index 2 (0-indexed after 2 moves)
    let default_state = run_headless("");
    let nav_state = run_headless("jj");

    // selected_path should differ after 2 moves (assuming ≥3 specs)
    let default_path = default_state["selected_path"].as_str().unwrap_or("");
    let nav_path = nav_state["selected_path"].as_str().unwrap_or("");
    assert_ne!(default_path, nav_path, "selection should move after jj");
}
