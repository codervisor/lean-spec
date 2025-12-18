---
status: in-progress
created: 2025-12-18
priority: high
tags:
- cli
- mcp
- validation
- ai-agents
- quality
- workflow
depends_on:
- 018-spec-validation
- 170-cli-mcp-core-rust-migration-evaluation
created_at: 2025-12-18T02:47:39.011Z
updated_at: 2025-12-18T08:03:55.590537344Z
completed_at: 2025-12-18T08:03:49.261830554Z
transitions:
- status: in-progress
  at: 2025-12-18T02:51:49.673Z
---

# Completion Status Verification Hook

> **Status**: ⏳ In progress · **Priority**: High · **Created**: 2025-12-18 · **Tags**: cli, mcp, validation, ai-agents, quality, workflow

## Overview

### Problem

When AI agents complete work on a spec, they often update `status: complete` prematurely without verifying all tasks are done. This leads to:

1. **Incomplete implementations** - Spec marked complete but TODOs remain in README checkboxes
2. **Workflow friction** - Humans must manually verify completion vs. spec requirements
3. **Quality gaps** - No automated enforcement to ensure spec fulfillment before completion
4. **Lost context** - Outstanding items discovered later when context is lost

### Solution

Add a **verification checkpoint** in the `update` command/tool (CLI & MCP) that:
- Triggers when `status` changes to `complete`
- Parses spec README for unchecked checkboxes (`- [ ]`)
- Provides actionable feedback to AI agents about outstanding items
- Allows agents to self-correct before marking complete

This creates a **feedback loop** where agents learn to verify their work before declaring completion.

## Design

### Architecture

```
┌─────────────────────────────────────────────────┐
│  AI Agent: lean-spec update 174 --status complete│
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Update Command/Tool (Rust CLI/MCP)            │
│  1. Detect status change to "complete"          │
│  2. Call leanspec_core::CompletionVerifier      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  leanspec-core::validators::CompletionVerifier  │
│  1. Read spec README.md                         │
│  2. Parse checkbox items (- [ ] / - [x])        │
│  3. Extract section context                     │
│  4. Return verification result                  │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐   ┌─────────────────┐
│ All checked? │   │ Has unchecked?  │
│   ✓ Success  │   │   ⚠ Warning     │
└──────┬───────┘   └─────────┬───────┘
       │                     │
       ▼                     ▼
  Update status      Return VerificationResult:
  to complete        - outstanding: Vec<CheckboxItem>
                     - progress: Progress
                     - suggestions: Vec<String>
```

### Detection Logic

**When to trigger:**
- Status transition: `planned|in-progress → complete`
- Command: `lean-spec update <spec> --status complete`
- MCP tool: `update` with status field change

**What to check:**
```rust
use leanspec_core::validators::CompletionVerifier;
use leanspec_core::types::{VerificationResult, CheckboxItem};

pub struct CompletionVerifier;

impl CompletionVerifier {
    pub fn verify_completion(spec_path: &Path) -> Result<VerificationResult> {
        let content = fs::read_to_string(spec_path.join("README.md"))?;
        let checkboxes = Self::parse_checkboxes(&content)?;
        let unchecked: Vec<CheckboxItem> = checkboxes
            .into_iter()
            .filter(|cb| !cb.checked)
            .collect();
        
        Ok(VerificationResult {
            is_complete: unchecked.is_empty(),
            outstanding: unchecked,
            progress: Progress::calculate(&checkboxes),
            suggestions: Self::generate_suggestions(&unchecked),
        })
    }
}
```

### Feedback Format

**CLI Output:**
```
⚠️  Spec has 3 outstanding checklist items:

  Plan (line 42)
    • [ ] Update MCP prompts with validation step
  
  Test (line 78)
    • [ ] Test CLI verification with unchecked items
    • [ ] Test MCP verification behavior

❓ Mark complete anyway? (y/N)
```

**MCP Tool Response:**
```json
{
  "error": "INCOMPLETE_CHECKLIST",
  "message": "Cannot mark spec complete: 3 outstanding checklist items",
  "details": {
    "outstanding": [
      {
        "section": "Plan",
        "line": 42,
        "text": "Update MCP prompts with validation step"
      },
      {
        "section": "Test",
        "line": 78,
        "text": "Test CLI verification with unchecked items"
      },
      {
        "section": "Test",
        "line": 79,
        "text": "Test MCP verification behavior"
      }
    ],
    "progress": "12/15 items complete (80%)",
    "suggestions": [
      "Review outstanding items and complete them",
      "Update checkboxes: lean-spec view 174",
      "Or mark as work-in-progress: --status in-progress"
    ]
  }
}
```

### Configuration

Add optional config to allow/bypass:
```json
// .leanspec/config.json
{
  "validation": {
    "enforceCompletionChecklist": true,  // Default: true
    "allowCompletionOverride": false      // Default: false (require --force)
  }
}
```

**Override flag:**
```bash
lean-spec update 174 --status complete --force  # Skip verification
```

## Plan

### Phase 1: Core Verification Logic (Rust)

- [x] Add types to `rust/leanspec-core/src/types/validation.rs`
  - [x] `CheckboxItem` struct (line, text, section, checked)
  - [x] `Progress` struct (completed, total, percentage)
  - [x] `VerificationResult` struct (is_complete, outstanding, progress, suggestions)
  - [ ] `VerificationError` enum

- [x] Create `rust/leanspec-core/src/validators/completion.rs`
  - [x] `CompletionVerifier::parse_checkboxes()` - Regex-based checkbox extraction
  - [x] `CompletionVerifier::get_section_context()` - Parse markdown headers
  - [x] `CompletionVerifier::verify_completion()` - Main entry point
  - [x] `CompletionVerifier::generate_suggestions()` - Context-aware guidance

- [x] Update `rust/leanspec-core/src/validators/mod.rs`
  - [x] Add `mod completion;`
  - [x] Export `pub use completion::CompletionVerifier;`

- [x] Update `rust/leanspec-core/src/lib.rs`
  - [x] Re-export `CompletionVerifier` in public API

- [x] Add unit tests in `rust/leanspec-core/tests/completion_tests.rs`
  - [x] Parse mixed checked/unchecked items
  - [x] Handle nested checkboxes (indented)
  - [x] Extract line numbers and text correctly
  - [x] Identify section headers (Plan, Test, etc.)
  - [x] Calculate progress accurately

### Phase 2: CLI Integration (Rust)

- [x] Update `rust/leanspec-cli/src/commands/update.rs`
  - [x] Import `CompletionVerifier` from leanspec-core
  - [x] Detect status change to `complete` in execute logic
  - [x] Call `CompletionVerifier::verify_completion()` before applying
  - [x] Format and display warning using colored output
  - [ ] Add interactive prompt (Y/n) using `dialoguer` crate
  - [x] Support `--force` flag in CLI args

- [x] Update `rust/leanspec-cli/src/cli.rs`
  - [x] Add `force: bool` field to `UpdateArgs` struct
  - [x] Document `--force` flag in help text

- [ ] Add CLI integration tests
  - [ ] Test verification triggers on status change
  - [ ] Test warning display format
  - [ ] Test interactive prompt behavior
  - [ ] Test `--force` flag bypass

### Phase 3: MCP Integration (Rust)

- [x] Update `rust/leanspec-mcp/src/tools/update.rs`
  - [x] Import `CompletionVerifier` from leanspec-core
  - [x] Call `CompletionVerifier::verify_completion()` before status change
  - [x] Return structured error via MCP protocol with outstanding items
  - [x] Include progress metrics (X/Y complete) in error details
  - [x] Provide actionable suggestions in response content

- [x] Update MCP schema in `rust/leanspec-mcp/src/tools/schemas.rs`
  - [x] Add `force: Option<bool>` to UpdateInput struct
  - [x] Document verification behavior in tool description
  - [ ] Add example error response to schema docs

- [ ] Update MCP prompts (`rust/leanspec-mcp/prompts/` or embedded)
  - [ ] Add checkpoint guidance before marking complete
  - [ ] Teach pattern: verify → fix outstanding → mark complete
  - [ ] Include example of handling verification feedback

### Phase 4: Configuration & Docs

- [ ] Add config options to `rust/leanspec-core/src/types/config.rs`
  - [ ] Add `ValidationConfig` struct with fields:
    - [ ] `enforce_completion_checklist: bool` (default: true)
    - [ ] `allow_completion_override: bool` (default: false)
  - [ ] Update `LeanSpecConfig` to include `validation: Option<ValidationConfig>`
  - [ ] Add serde serialization/deserialization

- [ ] Update documentation
  - [ ] Add to CLI reference (update command)
  - [ ] Add to MCP tools reference
  - [ ] Add to AGENTS.md workflow guidance
  - [ ] Add to best practices
  - [ ] Document Rust implementation approach

- [ ] Update locales (if applicable)
  - [ ] CLI error messages in Rust code (english by default)
  - [ ] Consider i18n strategy for Rust crates (future)

## Test

### Unit Tests

- [x] Parser correctly identifies unchecked items
- [x] Section detection works for all heading levels
- [x] Line numbers are accurate
- [x] Nested checkboxes handled properly
- [x] Edge cases: no checkboxes, all checked, mixed

### Integration Tests

- [x] CLI: Verification triggers on status→complete
- [x] CLI: Warning displays with correct formatting
- [ ] CLI: Interactive prompt works correctly
- [x] CLI: `--force` flag bypasses verification
- [x] MCP: Returns structured error with details
- [x] MCP: `force` parameter bypasses verification

### E2E Workflow Tests

- [x] AI agent completes spec with outstanding items → receives feedback
- [ ] Agent reviews feedback, completes items, marks complete → success
- [x] Human uses `--force` to override → succeeds with warning
- [x] Spec with no checkboxes → completes without verification

### Real-World Validation

- [x] Test with actual spec during implementation
- [x] Verify feedback is actionable for AI agents
- [x] Confirm workflow feels natural, not burdensome
- [ ] Validate performance impact is negligible (<50ms)

## Notes

### Design Decisions

**Why checkboxes only?**
- Structured, unambiguous signal of completion criteria
- Already widely used in specs (Plan, Test sections)
- Easy to parse reliably without AI/NLP

**Why warning instead of hard block?**
- Humans may have valid reasons to mark complete (e.g., deferred items)
- Flexibility reduces friction while maintaining awareness
- `--force` flag provides escape hatch

**Why not validate during status update in any direction?**
- Only `→ complete` transition matters for quality gate
- Other transitions (planned→in-progress) don't require verification
- Keeps feedback focused and actionable

### Future Enhancements

- [ ] **Codebase verification**: Check if files mentioned in checkboxes exist
- [ ] **Test execution**: Run tests before allowing completion
- [ ] **Dependency checks**: Verify `depends_on` specs are complete
- [ ] **Quality metrics**: Token count, validation pass before complete
- [ ] **Sub-spec coordination**: Check sub-specs completion status

### Related Specs

- [018-spec-validation](../018-spec-validation/README.md) - Existing validation infrastructure
- [122-ai-agent-deps-management-fix](../122-ai-agent-deps-management-fix/README.md) - Workflow validation patterns
