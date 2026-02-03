---
status: planned
created: 2026-02-03
priority: high
tags:
- cli
- runners
- refactor
- architecture
parent: 168-leanspec-orchestration-platform
created_at: 2026-02-03T06:30:00.000000000Z
updated_at: 2026-02-03T06:30:00.000000000Z
---
# Runner Registry Consolidation

> **Status**: planned · **Priority**: high · **Created**: 2026-02-03

## Overview

Consolidate the two separate AI tool registries (`runner.rs` and `ai_tools.rs`) into a single unified `RunnerDefinition` that includes detection and symlink metadata. This eliminates duplication and provides a single source of truth for all AI coding assistants.

### Current State

**Runners (`runner.rs` in leanspec-core)**: claude, copilot, codex, opencode, aider, cline (6 tools)
- Purpose: Execution config (command, args, env)
- Used by: `lean-spec run`, session management

**AI Tools (`ai_tools.rs` in leanspec-cli)**: Copilot, Claude, Gemini, Cursor, Windsurf, Aider, Codex, Droid (8 tools)
- Purpose: Detection config (commands, config dirs, env vars, symlinks)
- Used by: `lean-spec init` wizard

### Problem

1. Two files maintain overlapping but inconsistent tool lists
2. Adding a new tool requires updating both files
3. Tools in one registry may be missing from the other (e.g., Gemini in ai_tools but not runners)
4. No way for user-defined runners to participate in init detection

## Design

### Extended RunnerDefinition

Add detection and symlink fields to `RunnerDefinition`:

```rust
// In runner.rs (leanspec-core)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerDefinition {
    pub id: String,
    pub name: Option<String>,
    pub command: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    // New fields for detection/init
    #[serde(default)]
    pub detection: Option<DetectionConfig>,
    #[serde(default)]
    pub symlink_file: Option<String>,  // e.g., "CLAUDE.md" -> symlinks to AGENTS.md
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DetectionConfig {
    #[serde(default)]
    pub config_dirs: Vec<String>,      // e.g., [".claude", ".cursor"]
    #[serde(default)]
    pub env_vars: Vec<String>,         // e.g., ["ANTHROPIC_API_KEY"]
    #[serde(default)]
    pub extensions: Vec<String>,       // VS Code extension prefixes
}
```

### Updated Builtins

Each builtin runner includes detection config:

```rust
runners.insert(
    "claude".to_string(),
    RunnerDefinition {
        id: "claude".to_string(),
        name: Some("Claude Code".to_string()),
        command: "claude".to_string(),
        args: vec!["--dangerously-skip-permissions".to_string(), "--print".to_string()],
        env: HashMap::from([
            ("ANTHROPIC_API_KEY".to_string(), "${ANTHROPIC_API_KEY}".to_string()),
        ]),
        detection: Some(DetectionConfig {
            config_dirs: vec![".claude".to_string()],
            env_vars: vec!["ANTHROPIC_API_KEY".to_string()],
            extensions: vec![],
        }),
        symlink_file: Some("CLAUDE.md".to_string()),
    },
);
```

### Init Integration

Update `lean-spec init` to use `RunnerRegistry`:

```rust
// In init command
let registry = RunnerRegistry::load(project_path)?;
let detections = registry.detect_available();  // New method

for runner in detections {
    if runner.detected {
        println!("✓ {} detected: {}", runner.definition.display_name(), runner.reasons.join(", "));
    }
}
```

### New RunnerRegistry Methods

```rust
impl RunnerRegistry {
    /// Detect which runners are available based on detection config
    pub fn detect_available(&self) -> Vec<DetectionResult> {
        self.runners.values()
            .filter(|r| r.detection.is_some())
            .map(|r| self.detect_runner(r))
            .collect()
    }
    
    /// Get runners that require symlinks
    pub fn symlink_runners(&self) -> Vec<&RunnerDefinition> {
        self.runners.values()
            .filter(|r| r.symlink_file.is_some())
            .collect()
    }
}
```

## Plan

- [ ] **Phase 1: Extend RunnerDefinition**
  - [ ] Add `DetectionConfig` struct to runner.rs
  - [ ] Add `detection` and `symlink_file` fields to `RunnerDefinition`
  - [ ] Update serde derives with `#[serde(default)]` for backward compatibility
  
- [ ] **Phase 2: Migrate Builtin Detection Config**
  - [ ] Add detection config to claude runner
  - [ ] Add detection config to copilot runner
  - [ ] Add detection config to codex runner
  - [ ] Add detection config to opencode runner
  - [ ] Add detection config to aider runner
  - [ ] Add detection config to cline runner
  - [ ] Add symlink_file to claude and gemini runners
  
- [ ] **Phase 3: Add Detection Methods to RunnerRegistry**
  - [ ] Implement `detect_runner()` method
  - [ ] Implement `detect_available()` method
  - [ ] Implement `symlink_runners()` method
  - [ ] Add detection logic (command exists, config dir exists, env var set)
  
- [ ] **Phase 4: Update Init Command**
  - [ ] Import `RunnerRegistry` in init module
  - [ ] Replace `detect_ai_tools()` with `registry.detect_available()`
  - [ ] Replace `create_symlinks()` to use `registry.symlink_runners()`
  - [ ] Update prompts to use runner definitions
  
- [ ] **Phase 5: Deprecate ai_tools.rs**
  - [ ] Mark `AiTool` enum as deprecated
  - [ ] Remove duplicate detection logic
  - [ ] Keep only symlink creation utility (or move to runner.rs)
  
- [ ] **Phase 6: Documentation**
  - [ ] Update runners.json schema to include detection fields
  - [ ] Document how user-defined runners can include detection config

## Test

- [ ] Existing runner tests pass
- [ ] Detection works for all builtin runners
- [ ] `RunnerRegistry::detect_available()` returns correct results
- [ ] Symlink creation works via `symlink_runners()`
- [ ] `lean-spec init` wizard shows detected tools correctly
- [ ] User-defined runners in `runners.json` with detection config are detected
- [ ] Backward compatibility: runners.json without detection fields still works

## Notes

### Benefits

1. **Single Source of Truth**: All AI tool metadata in one place
2. **Extensibility**: User-defined runners can participate in init detection
3. **Consistency**: No more out-of-sync tool lists
4. **Maintainability**: Adding new tools requires one file change

### Migration Path

The migration is backward compatible:
- `detection` and `symlink_file` are optional fields with defaults
- Existing `runners.json` files continue to work
- `ai_tools.rs` can be deprecated gradually

### Schema Update

The `runners.json` schema should be updated to allow detection config:

```json
{
  "$schema": "https://leanspec.dev/schemas/runners.json",
  "runners": {
    "my-custom-agent": {
      "name": "My Custom Agent",
      "command": "my-agent",
      "detection": {
        "config_dirs": [".my-agent"],
        "env_vars": ["MY_AGENT_API_KEY"]
      }
    }
  }
}
```
