---
status: planned
created: 2026-05-14
priority: high
tags:
- mcp
- adapter
- ai-native
- generalization
depends_on:
- "392-update-search-archive-stats-migration"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# MCP Layer Generalization

## Overview

The MCP server (`rust/leanspec-mcp/` and `packages/mcp/`) currently bypasses
the adapter layer — it imports from `leanspec-core` directly and only works
with markdown projects. This spec wires it through `AdapterRegistry`, making
the MCP server adapter-agnostic.

After this spec, an AI agent using the LeanSpec MCP server can manage GitHub
Issues, ADO work items, or Jira tickets through the same tools as markdown specs
— with no backend-specific knowledge required in the prompt.

Done when: all MCP tools route through the adapter, a `get_schema` tool
exposes the active adapter's schema, and the MCP server works against both
markdown and GitHub projects.

## Design

### Tools to expose

| Tool | Description |
|---|---|
| `list_specs` | List specs with optional filters (status, tags, assignee, text) |
| `get_spec` | Get a single spec by ID — full content and fields |
| `create_spec` | Create a new spec |
| `update_spec` | Update title, fields, or content of a spec |
| `search_specs` | Full-text search across all specs |
| `get_schema` | Return the active adapter's schema (fields, types, enum options) |
| `get_capabilities` | Return adapter name, supported operations, schema ID |

Tools `validate_spec`, `get_dependencies`, `get_stats` remain markdown-only
and are guarded accordingly.

### `get_schema` tool

This is the key addition. It returns the full `SpecSchema` as a JSON object,
enabling AI agents to discover available fields dynamically:

```json
{
  "schema_id": "leanspec:feature",
  "fields": [
    {
      "key": "status",
      "label": "Status",
      "kind": "enum",
      "options": [
        { "value": "open", "label": "Open" },
        { "value": "closed", "label": "Closed" }
      ],
      "semantic": "status",
      "required": true
    },
    …
  ]
}
```

AI agents call `get_schema` at the start of a session and use the result to
construct valid field values in subsequent `create_spec` and `update_spec` calls.

### Tool descriptions from schema

Tool parameter descriptions are generated from the active schema's `ai_hint`
fields at server startup. Example: the `create_spec` tool's `status` parameter
description becomes the `ai_hint` declared in the schema's status field.

This means tool descriptions adapt to the active adapter without code changes.

### `AdapterRegistry` in MCP server

```rust
// On server startup (or per-request for multi-project mode):
let adapter = AdapterRegistry::from_project(&project_root)?;
let schema = adapter.schema();
```

For the Rust MCP server (`rust/leanspec-mcp/`): the adapter is instantiated
once at startup, stored in the server state.

For the Node.js MCP package (`packages/mcp/`): the adapter is accessed via
the Rust HTTP server's `/api/*` endpoints (already adapter-aware after spec 386).
No Rust code changes needed in the Node.js package — it just gains the new
`get_schema` and `get_capabilities` endpoints.

### Markdown-only MCP tools

`validate_spec`, `get_dependencies`, `get_gantt`, `analyze_spec` remain
markdown-only. When called on a non-markdown project, return:

```json
{
  "error": "This tool requires a markdown adapter",
  "active_adapter": "github",
  "suggestion": "Use get_spec and get_schema to explore this project's spec structure"
}
```

### Tool input schema

`create_spec` and `update_spec` tools declare dynamic input schemas based on
the adapter's field definitions. For enum fields, the input schema includes an
`enum` constraint listing valid values:

```json
{
  "name": "create_spec",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": { "type": "string", "description": "Spec title" },
      "status": {
        "type": "string",
        "enum": ["open", "closed"],
        "description": "Current status"
      }
    },
    "required": ["title"]
  }
}
```

## Plan

**Rust MCP server (`rust/leanspec-mcp/src/`):**
- [ ] Add `AdapterRegistry::from_project()` at server startup; store in state
- [ ] `list_specs` tool: build `ListFilter` from tool parameters, call `adapter.list()`
- [ ] `get_spec` tool: call `adapter.get(id)`, return `SpecDoc` as JSON
- [ ] `create_spec` tool: build `CreateRequest` from params, call `adapter.create()`
- [ ] `update_spec` tool: build `UpdateRequest`, call `adapter.update()`
- [ ] `search_specs` tool: call `adapter.search()`
- [ ] `get_schema` tool: return `adapter.schema()` serialized to JSON
- [ ] `get_capabilities` tool: return `adapter.capabilities()` as JSON
- [ ] Markdown-only guards on `validate_spec`, `get_dependencies`, `get_gantt`
- [ ] Generate tool `inputSchema` from `SpecSchema` field definitions
- [ ] Remove `SpecLoader`, `SpecInfo`, `SpecStatus` imports from Rust MCP server

**Node.js MCP package (`packages/mcp/`):**
- [ ] Add `get_schema` tool: `GET /api/schema` → forward response
- [ ] Add `get_capabilities` tool: `GET /api/capabilities` → forward response
- [ ] Update `list_specs`, `get_spec` etc. to handle `SpecDoc` JSON shape
- [ ] Update tool descriptions to use schema `ai_hint` when available

**Documentation:**
- [ ] Update `.agents/skills/leanspec-development/references/CI-COMMANDS.md`
  to reflect adapter-aware MCP tools
- [ ] Add `get_schema` usage example to MCP tool documentation

## Test

- [ ] MCP `list_specs` on markdown project: returns correct spec list
- [ ] MCP `list_specs` on GitHub project: returns GitHub issues as specs
- [ ] MCP `get_schema` returns full field definitions including enum options
- [ ] MCP `create_spec` with invalid status value: returns validation error
- [ ] MCP `validate_spec` on GitHub project: returns markdown-only error
- [ ] Tool `inputSchema` for `create_spec` includes `status` enum constraint
- [ ] No `SpecLoader`, `SpecInfo`, `SpecStatus` imports in Rust MCP server

## Notes

### Multi-project MCP mode

The current MCP server may support multiple projects (each with their own
adapter). The `from_project()` call should use the project root associated with
the current request context, not a global singleton.

### `get_schema` caching

`resolve_schema()` makes network calls (to fetch GitHub labels, etc.). Cache
the resolved schema at server startup; invalidate on `leanspec reload` command
or after a configurable TTL (default: 5 minutes).

### Schema-driven tool descriptions as a differentiator

The `ai_hint` field on `FieldDef` was designed for exactly this purpose. An AI
agent working with a GitHub-backed project sees:

> `status`: "GitHub issue state. Use 'open' for active work, 'closed' for completed or cancelled work."

This is far more useful than a generic "The status field." Document this as a
first-class feature in the LeanSpec skill and README.
