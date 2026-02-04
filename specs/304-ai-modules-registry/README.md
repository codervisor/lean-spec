---
status: complete
created: 2026-02-04
priority: high
tags:
- architecture
- ai-native
- runners
- extensibility
parent: 291-cli-runtime-web-orchestrator
created_at: 2026-02-04T06:22:55.298373Z
updated_at: 2026-02-04T07:03:34.612020Z
completed_at: 2026-02-04T07:00:23.134125Z
transitions:
- status: in-progress
  at: 2026-02-04T06:58:33.604551Z
- status: complete
  at: 2026-02-04T07:00:23.134125Z
---
# AI Module Registry

## Overview

Add mainstream AI coding tools as builtin runners in LeanSpec. List sourced from `npx skills` (vercel-labs/skills) which supports 38+ tools.

## Current Runners (16)
claude, copilot, codex, opencode, aider, cline, gemini, cursor, windsurf, droid, kiro, kimi, qodo, amp, trae, qwen-code

## New Runners Added (8)

### CLI Tools (runnable)
| ID        | Name      | Command     | Config Dir   | Env Var |
| --------- | --------- | ----------- | ------------ | ------- |
| goose     | Goose     | `goose`     | `.goose`     | -       |
| openhands | OpenHands | `openhands` | `.openhands` | -       |
| continue  | Continue  | `continue`  | `.continue`  | -       |
| crush     | Crush     | `crush`     | `.crush`     | -       |

### IDE Extensions (detection only)
| ID        | Name      | Config Dir   | Extension ID                 |
| --------- | --------- | ------------ | ---------------------------- |
| roo       | Roo Code  | `.roo`       | `rooveterinaryinc.roo-cline` |
| codebuddy | CodeBuddy | `.codebuddy` | `codebuddy.codebuddy`        |
| kilo      | Kilo Code | `.kilocode`  | `kilocode.kilo-code`         |
| augment   | Augment   | `.augment`   | `augment.vscode-augment`     |

## Plan

- [x] Add goose runner definition
- [x] Add openhands runner definition
- [x] Add continue runner definition
- [x] Add crush runner definition
- [x] Add roo runner definition (detection only)
- [x] Add codebuddy runner definition (detection only)
- [x] Add kilo runner definition (detection only)
- [x] Add augment runner definition (detection only)
- [x] Update tests for new runners

## Test

- [x] All new runners appear in registry
- [x] Tests pass: `cargo test --all-features -- sessions::runner::tests`

## Notes

Reference: https://github.com/vercel-labs/skills/blob/main/src/agents.ts

Total runners: 24 (16 existing + 8 new)