---
status: complete
created: 2026-02-05
priority: medium
tags:
- cli
- init
- skills
- ux
created_at: 2026-02-05T05:44:32.123815471Z
updated_at: 2026-02-05T05:44:57.588077006Z
completed_at: 2026-02-05T05:44:57.588077006Z
transitions:
- status: complete
  at: 2026-02-05T05:44:57.588077006Z
---

# Align AI Runner Detection with Skills.sh Agents in Init

## Overview

When running `lean-spec init`, the skill installation via skills.sh was creating 37+ `.xxx` folders (one for every supported AI agent) even when the user only has 1-2 AI tools installed. This clutters the project with unnecessary directories.

### Problem

The `skill::install()` function called `npx skills add codervisor/lean-spec -y` without specifying target agents, causing skills.sh to install to ALL supported agents by default.

**Before (37+ folders created):**
```
.adal/  .agent/  .agents/  .augment/  .claude/  .cline/  
.codebuddy/  .codex/  .commandcode/  .continue/  .crush/  
.cursor/  .factory/  .gemini/  .github/  .goose/  .iflow/  
.junie/  .kilocode/  .kiro/  .kode/  .mcpjam/  .mux/  
.neovate/  .openclaude/  .opencode/  .openhands/  .pi/  
.pochi/  .qoder/  .qwen/  .roo/  .trae/  .vibe/  
.windsurf/  .zencoder/  ...
```

**After (only detected tools):**
```
.agents/  .claude/  .codex/  .cursor/  .gemini/  .github/  .opencode/
```

## Design

### 1. Extend skill::install() to Accept Agent List

Modified `skill.rs` to accept an optional list of agent names:

```rust
pub fn install(agents: Option<&[String]>) -> Result<(), Box<dyn Error>> {
    let mut args = vec!["skills", "add", "codervisor/lean-spec", "-y"];
    if let Some(agent_list) = agents {
        for agent in agent_list {
            args.push("--agent");
            args.push(agent);
        }
    }
    run_npx(&args)
}
```

### 2. Map Runner IDs to Skills.sh Agent Names

Added mapping function in `init.rs`:

```rust
fn runner_to_skills_agent(runner_id: &str) -> Option<&'static str> {
    match runner_id {
        "claude" => Some("claude-code"),
        "copilot" => Some("github-copilot"),
        "cursor" => Some("cursor"),
        "gemini" => Some("gemini-cli"),
        "codex" => Some("codex"),
        "cline" => Some("cline"),
        "continue" => Some("continue"),
        "windsurf" => Some("windsurf"),
        "aider" => Some("aider"),
        "opencode" => Some("opencode"),
        _ => None,
    }
}
```

### 3. Filter Detected Tools for Skill Installation

Modified `handle_skills_install()` to:
1. Take AI detections as parameter
2. Filter to only detected tools
3. Map runner IDs to skills.sh agent names
4. Pass the agent list to `skill::install()`

## Plan

- [x] Modify `skill.rs` to accept optional agents list
- [x] Add `runner_to_skills_agent()` mapping function
- [x] Update `handle_skills_install()` to pass detected agents
- [x] Update call site in `run_standard_init()`
- [x] Test with `lean-spec init -y`

## Test

- [x] Run `lean-spec init -y` in fresh directory
- [x] Verify only detected AI tool folders are created (7 vs 37+)
- [x] Output shows: "Installing to detected tools: claude-code, codex, ..."

## Notes

The mapping between LeanSpec runner IDs and skills.sh agent names may need updates as new tools are added. The current mapping covers the most common AI coding tools.