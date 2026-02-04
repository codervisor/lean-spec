---
status: complete
created: 2026-02-03
priority: high
tags:
- cli
- runners
- refactor
- architecture
parent: 168-leanspec-orchestration-platform
created_at: 2026-02-03T06:30:00Z
updated_at: 2026-02-04T03:52:53.340203Z
completed_at: 2026-02-04T03:52:53.340203Z
transitions:
- status: in-progress
  at: 2026-02-03T07:09:25.347923577Z
- status: complete
  at: 2026-02-04T03:52:53.340203Z
---

# Runner Registry Consolidation

> **Status**: planned · **Priority**: high · **Created**: 2026-02-03

## Overview

Consolidate the two separate AI tool registries (`runner.rs` and `ai_tools.rs`) into a single unified `RunnerDefinition` that includes detection and symlink metadata. This eliminates duplication and provides a single source of truth for all AI coding assistants.

### Current State

**Runners ([rust/leanspec-core/src/sessions/runner.rs](rust/leanspec-core/src/sessions/runner.rs))**: claude, copilot, codex, opencode, aider, cline (6 CLI tools)
- Purpose: Execution config (command, args, env)
- Used by: `lean-spec run`, session management
- `RunnerDefinition.command` is required (non-optional)
- `runners.json` schema requires `command`

**AI Tools ([rust/leanspec-cli/src/commands/init/ai_tools.rs](rust/leanspec-cli/src/commands/init/ai_tools.rs))**: Copilot, Claude, Gemini, Cursor, Windsurf, Aider, Codex, Droid (8 tools)
- Purpose: Detection config (commands, config dirs, env vars, extensions, symlinks)
- Used by: `lean-spec init` wizard
- Detection checks commands via `which/where`, config dirs in $HOME (or LEAN_SPEC_HOME), env vars, and IDE extension folders
- Symlinks only for Claude + Gemini (CLAUDE.md, GEMINI.md)
- Includes IDE-based tools (Cursor, Windsurf) not in runner.rs

**Known mismatches today**
- Copilot runner executes `gh copilot suggest`, but detection looks for `copilot` command
- Gemini/Cursor/Windsurf/Droid exist only in `ai_tools.rs` (not in runner registry)
- `ai_tools.rs` has detection fields (commands, extensions) not represented in `RunnerDefinition`

### Problem

1. Two files maintain overlapping but inconsistent tool lists
2. Adding a new tool requires updating both files
3. Tools in one registry may be missing from the other (e.g., Gemini, Cursor, Windsurf in ai_tools but not runners)
4. No way for user-defined runners to participate in init detection

## Design

### Extended RunnerDefinition

Add detection and symlink fields to `RunnerDefinition`. Make `command` optional to support IDE-based tools (Cursor, Windsurf) that are detected but not executed via CLI:

```rust
// In runner.rs (leanspec-core)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerDefinition {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,       // None for IDE-only tools (Cursor, Windsurf)
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default)]
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
    pub commands: Vec<String>,         // e.g., ["claude", "copilot"]
    #[serde(default)]
    pub config_dirs: Vec<String>,      // e.g., [".claude", ".cursor"]
    #[serde(default)]
    pub env_vars: Vec<String>,         // e.g., ["ANTHROPIC_API_KEY"]
    #[serde(default)]
    pub extensions: Vec<String>,       // VS Code extension prefixes
}
```

### Updated Builtins

Each builtin runner includes detection config. CLI runners have a command; IDE-based tools have `command: None`:

```rust
// CLI runner example
runners.insert(
    "claude".to_string(),
    RunnerDefinition {
        id: "claude".to_string(),
        name: Some("Claude Code".to_string()),
        command: Some("claude".to_string()),
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

// IDE-only example (detection only, not runnable)
runners.insert(
    "cursor".to_string(),
    RunnerDefinition {
        id: "cursor".to_string(),
        name: Some("Cursor".to_string()),
        command: None,  // IDE - not executable via lean-spec run
        args: vec![],
        env: HashMap::new(),
        detection: Some(DetectionConfig {
            config_dirs: vec![".cursor".to_string(), ".cursorules".to_string()],
            env_vars: vec![],
            extensions: vec![],
        }),
        symlink_file: None,  // Uses AGENTS.md directly
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
    
    /// Get only runnable runners (excludes IDE-only tools)
    pub fn runnable_runners(&self) -> Vec<&RunnerDefinition> {
        self.runners.values()
            .filter(|r| r.command.is_some())
            .collect()
    }
}

impl RunnerDefinition {
    /// Returns true if this runner can be executed via `lean-spec run`
    pub fn is_runnable(&self) -> bool {
        self.command.is_some()
    }
}
```

## Plan

- [x] **Phase 1: Extend RunnerDefinition + schema**
  - [x] Add `DetectionConfig` struct to runner.rs
  - [x] Add `detection` and `symlink_file` fields to `RunnerDefinition`
  - [x] Add `commands` field to `DetectionConfig` (for parity with init detection)
  - [x] Update serde derives with `#[serde(default)]` for backward compatibility
  - [x] Make `command` optional in `RunnerDefinition`, `RunnerConfig`, and schema
  
- [x] **Phase 2: Migrate Builtin Detection Config**
  - [x] Add detection config to claude runner
  - [x] Add detection config to copilot runner
  - [x] Add detection config to codex runner
  - [x] Add detection config to opencode runner
  - [x] Add detection config to aider runner
  - [x] Add detection config to cline runner
  - [x] Add gemini runner with detection config
  - [x] Add cursor as IDE-only runner (command: None)
  - [x] Add windsurf as IDE-only runner (command: None)
  - [x] Add droid runner with detection config
  - [x] Add symlink_file to claude and gemini runners
  - [x] Align copilot detection to `copilot` (document assumptions if needed)
  
- [x] **Phase 3: Add Detection Methods to RunnerRegistry**
  - [x] Implement `detect_runner()` method
  - [x] Implement `detect_available()` method
  - [x] Implement `symlink_runners()` method
  - [x] Add detection logic (command exists, config dir exists, env var set, extension installed)
  - [x] Use $HOME or LEAN_SPEC_HOME for config/extension detection (to match current init behavior)
  
- [x] **Phase 4: Update Init Command**
  - [x] Import `RunnerRegistry` in init module
  - [x] Replace `detect_ai_tools()` with `registry.detect_available()`
  - [x] Replace `create_symlinks()` to use `registry.symlink_runners()`
  - [x] Update prompts to use runner definitions
  
- [x] **Phase 5: Deprecate ai_tools.rs**
  - [x] Mark `AiTool` enum as deprecated
  - [x] Remove duplicate detection logic
  - [x] Keep only symlink creation utility (or move to runner.rs)
  
- [x] **Phase 6: Documentation**
  - [x] Update runners.json schema to include detection fields
  - [x] Document how user-defined runners can include detection config

## Test

- [x] Existing runner tests pass
- [x] Detection works for all builtin runners (CLI and IDE)
- [x] `RunnerRegistry::detect_available()` returns correct results
- [x] IDE-only runners (cursor, windsurf) are detected but not runnable
- [x] `lean-spec run cursor` returns appropriate error for IDE-only tools
- [x] Symlink creation works via `symlink_runners()`
- [x] `lean-spec init` wizard shows detected tools correctly
- [x] User-defined runners in `runners.json` with detection config are detected
- [x] Backward compatibility: runners.json without detection fields still works
- [x] Command/extension detection uses $HOME (or LEAN_SPEC_HOME) to match current behavior

## Notes

### Benefits

1. **Single Source of Truth**: All AI tool metadata in one place
2. **Extensibility**: User-defined runners can participate in init detection
3. **Consistency**: No more out-of-sync tool lists
4. **Maintainability**: Adding new tools requires one file change
5. **IDE Support**: IDE-based tools (Cursor, Windsurf) are detected even though they're not runnable

### IDE-Only Tools

Tools like Cursor and Windsurf are IDEs, not CLI executables. They're included in the registry with `command: None`:
- Detected during `lean-spec init` via config dirs (`.cursor`, `.windsurf`)
- Shown in init wizard for AGENTS.md setup
- Not runnable via `lean-spec run` (returns error if attempted)
- Use AGENTS.md directly (no symlink needed)

### Migration Path

The migration is backward compatible:
- `detection` and `symlink_file` are optional fields with defaults
- Existing `runners.json` files continue to work
- `ai_tools.rs` can be deprecated gradually

### Schema Update

The `runners.json` schema should be updated to allow detection config and optional command:

```json
{
  "$schema": "https://leanspec.dev/schemas/runners.json",
  "runners": {
    "my-custom-agent": {
      "name": "My Custom Agent",
      "command": "my-agent",
      "detection": {
        "commands": ["my-agent"],
        "config_dirs": [".my-agent"],
        "env_vars": ["MY_AGENT_API_KEY"]
      }
    },
    "my-ide-extension": {
      "name": "My IDE Extension",
      "detection": {
        "config_dirs": [".my-ide"],
        "extensions": ["my-ide.extension-name"]
      }
    }
  }
}
```
