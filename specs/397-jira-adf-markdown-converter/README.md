---
status: planned
created: 2026-05-14
priority: high
tags:
- jira
- adf
- markdown
- rust
- converter
depends_on: []
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Jira ADF ↔ Markdown Converter

## Overview

Jira stores issue descriptions in Atlassian Document Format (ADF) — a JSON
tree format. LeanSpec works in markdown. This spec implements a pure Rust
bidirectional converter with no Node.js dependency, handling the common ADF
node types used in real-world Jira descriptions.

This spec is standalone — it has no dependency on other pivot specs and can be
implemented in parallel. It is a prerequisite for spec 398 (Jira adapter).

Done when: the converter correctly round-trips common ADF documents through
markdown and back, with comprehensive tests for all supported node types.

## Design

### ADF structure overview

ADF is a JSON tree:

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [
      { "type": "text", "text": "Hello ", "marks": [{ "type": "strong" }] },
      { "type": "text", "text": "world" }
    ]},
    { "type": "heading", "attrs": { "level": 2 }, "content": [
      { "type": "text", "text": "Section" }
    ]},
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [
        { "type": "paragraph", "content": [{ "type": "text", "text": "Item" }] }
      ]}
    ]}
  ]
}
```

### Supported node types

**Block nodes:**

| ADF type | Markdown equivalent |
|---|---|
| `doc` | Root container |
| `paragraph` | Paragraph (blank line before/after) |
| `heading` | `## Heading` (level from attrs) |
| `bulletList` | `- item` |
| `orderedList` | `1. item` |
| `listItem` | List item (recursive) |
| `codeBlock` | ` ```lang\ncode\n``` ` |
| `blockquote` | `> text` |
| `rule` | `---` |
| `taskList` | Checklist (`- [ ] item` / `- [x] item`) |
| `taskItem` | Checklist item (state from `attrs.state`) |
| `table` | GFM table (basic, no merged cells) |
| `tableRow` | Table row |
| `tableCell` / `tableHeader` | Table cell |

**Inline nodes (marks):**

| ADF mark | Markdown |
|---|---|
| `strong` | `**text**` |
| `em` | `_text_` |
| `code` | `` `text` `` |
| `link` | `[text](href)` |
| `strike` | `~~text~~` |
| `underline` | ignored (no markdown equivalent) |
| `textColor` | ignored |
| `subsup` | ignored |

**Special inline nodes:**

| ADF type | Markdown |
|---|---|
| `hardBreak` | `\n` |
| `mention` | `@accountId` (display name if available in context) |
| `emoji` | `:emoji-name:` |
| `inlineCard` | `[url](url)` |
| `mediaInline` | `![alt](url)` if resolvable, else omitted |

### API

```rust
pub mod adf {
    /// Convert an ADF JSON value to a markdown string.
    /// Returns an error if the JSON is not valid ADF.
    pub fn to_markdown(adf: &serde_json::Value) -> Result<String, AdfError>;

    /// Convert a markdown string to ADF JSON.
    pub fn from_markdown(markdown: &str) -> serde_json::Value;
}

#[derive(Debug, thiserror::Error)]
pub enum AdfError {
    #[error("invalid ADF structure: {0}")]
    InvalidStructure(String),
    #[error("unsupported node type: {0}")]
    UnsupportedNode(String),
}
```

`from_markdown` never returns an error — unknown constructs become plain text
paragraphs. `to_markdown` returns an error only for structurally invalid ADF
(missing required fields).

### Handling unknown node types

When `to_markdown` encounters an unknown block node type, it renders its `text`
content children as a plain paragraph with a comment:
```markdown
<!-- unsupported ADF node: expand -->
fallback text content
```

This ensures no content is silently dropped.

### Round-trip fidelity

Perfect round-trip is not a goal. Priorities:
1. ADF → markdown: all text content preserved, common formatting preserved
2. markdown → ADF: valid ADF that Jira can display

Formatting that has no markdown equivalent (underline, text color, subsup) is
dropped in ADF → markdown. On markdown → ADF, these are not reconstructed.

### Implementation approach

Two-pass recursive descent:
- `adf_node_to_md(node: &Value, ctx: &mut RenderCtx) -> String`
- `md_to_adf(markdown: &str) -> Value`

For markdown → ADF, use `pulldown_cmark` (already likely a dependency, or add it)
to parse markdown into events, then emit ADF nodes. No custom markdown parser.

## Plan

- [ ] Create `rust/leanspec-core/src/adapters/jira/adf.rs`
  - [ ] Define `AdfError` enum
  - [ ] `to_markdown(adf: &Value) -> Result<String, AdfError>`
    - [ ] `render_doc(node)` — root
    - [ ] `render_block(node, ctx)` — all block types
    - [ ] `render_inline(node)` — text with marks
    - [ ] `render_marks(text, marks)` — apply inline formatting
    - [ ] `render_task_list(node)` — checklist
    - [ ] `render_table(node)` — GFM table
  - [ ] `from_markdown(markdown: &str) -> Value`
    - [ ] Parse with `pulldown_cmark`
    - [ ] `emit_paragraph(events) -> Value`
    - [ ] `emit_heading(level, events) -> Value`
    - [ ] `emit_list(events, ordered) -> Value`
    - [ ] `emit_code_block(lang, text) -> Value`
    - [ ] `emit_table(events) -> Value`
- [ ] Add `pulldown_cmark` to `leanspec-core/Cargo.toml` if not present
- [ ] Comprehensive unit tests — one test per supported node type
- [ ] Round-trip tests: ADF → markdown → ADF → confirm text content preserved
- [ ] Edge cases: empty document, nested lists, code in lists, tables with alignment

## Test

- [ ] `paragraph` with plain text: `"Hello world"` → `"Hello world\n"`
- [ ] `heading` level 2: `"## Section\n"`
- [ ] `bulletList` with 3 items: `"- a\n- b\n- c\n"`
- [ ] `orderedList`: `"1. a\n2. b\n"`
- [ ] `codeBlock` with language: ` ```rust\nfn main() {}\n``` `
- [ ] `strong` mark: `"**bold**"`
- [ ] `em` mark: `"_italic_"`
- [ ] `link` mark: `"[text](https://example.com)"`
- [ ] `taskList` with checked/unchecked: `"- [x] done\n- [ ] todo\n"`
- [ ] `table` 2×2: correct GFM format
- [ ] `underline` mark: dropped (plain text only)
- [ ] Unknown node type: fallback with comment, no panic
- [ ] `from_markdown("# Title\n\nParagraph")` → valid ADF doc
- [ ] Round-trip: `to_markdown(from_markdown(md))` preserves all text content

## Notes

### pulldown_cmark

Already a standard Rust markdown parsing crate. Lightweight, no unsafe code.
Use the `pulldown_cmark::Parser` events API to drive ADF emission.

### Tables

GFM table output requires alignment markers: `| --- |`. Use left-align for all
columns by default. Column widths are not preserved — normalization is acceptable.

### Mention nodes

ADF `mention` nodes have `attrs.id` (account ID) and `attrs.text` (display name).
Use `attrs.text` if present, else `@{id}`. The Jira adapter can pass a lookup
map for display names via `RenderCtx` if needed.
