---
status: planned
created: 2026-01-12
priority: medium
tags:
- templates
- config
- ui
- dx
- mcp
- cli
depends_on:
- 132-ui-edit-capabilities
created_at: 2026-01-12T13:42:18.642426Z
updated_at: 2026-01-12T13:42:30.773693Z
---

## Overview

**Problem**: Spec templates are currently plain markdown files with hardcoded structure. This limits flexibility and makes it difficult to:
- Configure which sections require mandatory checkboxes
- Update templates through UI (web/desktop)
- Provide context-aware guidance in MCP/CLI tools
- Validate section completeness programmatically

**Solution**: Define template structure using JSON schema, generate markdown from config. This enables composable sections, validation rules, and UI-based template management.

**Why Now**: As UI editing capabilities (spec 132) and advanced validation expand, a structured template system becomes critical infrastructure.

## High-Level Approach

Replace plain markdown templates with JSON-based template definitions:

| Current (Markdown)                      | Proposed (JSON → Markdown)                    |
| --------------------------------------- | --------------------------------------------- |
| `.lean-spec/templates/spec-template.md` | `.lean-spec/templates/default.json`           |
| Static markdown content                 | JSON schema defining sections + rules         |
| No validation rules                     | Configurable mandatory sections & checkboxes  |
| CLI/MCP reads raw markdown              | Tools understand structure & provide guidance |

### Template Config Schema

```json
{
  "name": "default",
  "description": "Standard LeanSpec template",
  "sections": [
    {
      "id": "overview",
      "title": "Overview",
      "required": true,
      "placeholder": "What are we solving? Why now?",
      "type": "markdown"
    },
    {
      "id": "design",
      "title": "Design",
      "required": false,
      "placeholder": "Technical approach, architecture decisions",
      "type": "markdown"
    },
    {
      "id": "plan",
      "title": "Plan",
      "required": true,
      "placeholder": "Break down implementation into steps",
      "type": "checklist",
      "checkboxRequired": true,
      "minItems": 1
    },
    {
      "id": "test",
      "title": "Test",
      "required": true,
      "placeholder": "How will we verify this works?",
      "type": "checklist",
      "checkboxRequired": true,
      "minItems": 1
    },
    {
      "id": "notes",
      "title": "Notes",
      "required": false,
      "placeholder": "Research findings, alternatives, open questions",
      "type": "markdown"
    }
  ],
  "validation": {
    "mandatoryCheckboxes": {
      "sections": ["plan", "test"],
      "enforceCompletion": false
    }
  }
}
```

### Backward Compatibility

Support both formats during transition:
- **Phase 1**: JSON templates preferred, fallback to `.md`
- **Phase 2**: Auto-migrate existing `.md` to JSON
- **Phase 3**: Deprecate plain markdown templates

## Utilities Enabled

### 1. Configurable Mandatory Checkboxes

Validate specs have required checklist items:
```typescript
// Validation rule from template config
if (section.type === "checklist" && section.checkboxRequired) {
  const checkboxes = extractCheckboxes(content);
  if (checkboxes.length < section.minItems) {
    errors.push(`Section '${section.title}' requires at least ${section.minItems} checkbox(es)`);
  }
}
```

### 2. UI-Based Template Updates

In web/desktop UI:
- Visual template editor (drag sections, edit placeholders)
- Live markdown preview
- Save changes to `.lean-spec/templates/*.json`
- No CLI/terminal needed

### 3. Context-Aware MCP/CLI

```typescript
// MCP create tool with template structure context
tool.inputSchema = {
  content: {
    description: generateTemplateGuide(template),
    // "Your spec should include: Overview (required), Design (optional), ..."
  }
};
```

AI agents get clear guidance on expected structure.

### 4. Structured Content Editing in MCP

Instead of plain markdown strings, enable structural edits:
```json
// MCP create with structured content
{
  "name": "my-feature",
  "sections": {
    "overview": "What we're solving...",
    "design": "Technical approach...",
    "plan": ["Task 1", "Task 2", "Task 3"],
    "test": ["Test 1", "Test 2"]
  }
}

// MCP update sections individually
{
  "specPath": "045-feature",
  "updateSections": {
    "plan": {
      "add": ["Task 4"],
      "complete": [0, 1]  // Mark first 2 items complete
    }
  }
}
```

This provides better AI agent control over spec structure.

## Technical Design

### Architecture

    Template JSON → Parser → Markdown Generator
                          ↓
                    Validation Engine
                          ↓
                    MCP/CLI/UI Tools

### Core Components

| Component                 | Responsibility                            |
| ------------------------- | ----------------------------------------- |
| `TemplateParser`          | Load and validate template JSON           |
| `MarkdownGenerator`       | Convert JSON structure to markdown        |
| `TemplateValidator`       | Check spec against template rules         |
| `TemplateEditor` (UI)     | Visual template management                |
| `StructuredContentParser` | Parse structured section objects from MCP |
| `SectionUpdater`          | Apply granular section updates            |

### File Structure

    .lean-spec/
      templates/
        default.json         # Default template (replaces spec-template.md)
        minimal.json         # Minimal template
        detailed.json        # Detailed template
        legacy/
          spec-template.md   # Backward compatibility
      schemas/
        template.schema.json # JSON schema for validation

## Acceptance Criteria

### Template System
- [ ] Define and document template JSON schema
- [ ] Implement `TemplateParser` in Rust core
- [ ] Implement `MarkdownGenerator` to convert JSON → markdown
- [ ] Support backward compatibility (`.md` templates still work)
- [ ] Migration guide for existing `.md` templates

### CLI Integration
- [ ] Update `lean-spec create` to use JSON templates
- [ ] Add template validation to `lean-spec validate`
- [ ] CLI shows helpful section guidance during creation

### MCP Tool Enhancements
- [ ] Update MCP `create` tool with template structure context
- [ ] Add MCP `create` structured content mode (sections object)
- [ ] Add MCP `update-section` tool for granular edits
- [ ] Support checklist item management (add, complete, reorder)
- [ ] Validation feedback in MCP responses (missing required sections)
- [ ] Test with AI agents (Claude, etc.) to verify structure understanding

### Documentation
- [ ] MCP structured editing guide for AI agents
- [ ] Examples of structured vs plain markdown mode
- [ ] Migration path for existing MCP integrations

## Out of Scope

- Full WYSIWYG template editor (Phase 1 focuses on JSON editing)
- Custom frontmatter fields in templates (handle separately)
- Template marketplace/sharing (future consideration)
- Template versioning/inheritance
- Real-time collaborative editing
- Rich text editing (Markdown only in Phase 1)
- Template marketplace/sharing (future consideration)
- Template versioning/inheritance
- Real-time collaborative editing
- Rich text editing (Markdown only in Phase 1)

## Dependencies

**Depends on:**
- [132-ui-edit-capabilities](../132-ui-edit-capabilities/README.md) - UI editing foundation

**Enables:**
- [160-ui-tokens-validation-display](../160-ui-tokens-validation-display/README.md) - Enhanced validation
- Template updates via UI (new capability)

## Implementation Notes

### Migration Strategy

Auto-migrate existing markdown templates:
```bash
lean-spec migrate-templates
# Converts .md → .json, preserves in legacy/ folder
```

### MCP Tool Design

Two modes for `create` tool:
1. **Plain Mode** (backward compatible): Single `content` string parameter
2. **Structured Mode** (new): `sections` object parameter

```rust
// Detection logic
if args.contains_key("sections") {
    // Structured mode - validate against template
    let sections = parse_structured_sections(args)?;
    let content = generate_from_sections(template, sections)?;
} else if args.contains_key("content") {
    // Plain mode - existing behavior
    let content = args.get("content")?;
}
```

New MCP tool: `update-section`
```json
{
  "name": "update-section",
  "description": "Update specific sections of a spec",
  "input_schema": {
    "specPath": { "type": "string", "required": true },
    "section": { "type": "string", "enum": ["overview", "design", "plan", "test", "notes"] },
    "operation": {
      "type": "string",
      "enum": ["replace", "append", "prepend"]
    },
    "content": { "type": "string" },
    "checklistItems": {
      "add": ["array of new items"],
      "complete": ["array of item indices"],
      "remove": ["array of item indices"]
    }
  }
}
```

### Performance Considerations

- Cache parsed JSON templates (reload on file change)
- Lazy-load templates (only parse when needed)
- Keep JSON schema simple (avoid deep nesting)
- Structured content parsing should be O(n) where n = number of sections

### UI Template Editor (Future)

JSON editing in Phase 1, visual editor in Phase 2:
- Monaco editor for JSON
- Section drag-and-drop reordering
- Live markdown preview
- Validation feedback

### Section Types

| Type        | Description               | Example           |
| ----------- | ------------------------- | ----------------- |
| `markdown`  | Freeform content          | Overview, Design  |
| `checklist` | Task list with checkboxes | Plan, Test        |
| `table`     | Structured data           | Comparison tables |
| `code`      | Code snippets             | Examples          |

## Open Questions

1. Should templates support conditional sections (e.g., "Test" only if status=in-progress)?
2. Allow nested section structures (subsections)?
3. Support template inheritance (extend base template)?
4. How to handle custom sections added by users?

## Success Metrics

- Templates remain <200 lines (JSON + generated markdown)
- Validation catches 90%+ incomplete specs before completion
- MCP agents create well-structured specs on first try
- UI template updates take <5 minutes (vs manual CLI editing)