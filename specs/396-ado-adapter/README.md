---
status: planned
created: 2026-05-14
priority: high
tags:
- adapter
- ado
- azure-devops
- rust
depends_on:
- "385-adapter-compliance-test-harness"
- "388-init-command-redesign"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Azure DevOps Adapter

## Overview

Implement `AdoAdapter` — an `Adapter` implementation backed by Azure DevOps
Work Items. ADO is the primary enterprise alternative to GitHub Issues and has
unique challenges: project-defined state values, integer priority (1–4),
semicolon-delimited tags, and a PAT-based auth model.

Done when: `leanspec list/view/create/update/search/archive` work against an ADO
project, and the adapter passes the compliance test suite from spec 385.

## Design

### Authentication

Personal Access Token (PAT) via HTTP Basic auth: base64-encode `:{token}` and
send as `Authorization: Basic {encoded}` header. Token read from env var
(configurable, default `ADO_TOKEN`).

```yaml
# leanspec.adapter.yaml
adapter: ado
settings:
  organization: myorg
  project: MyProject
  token_env: ADO_TOKEN
```

### ADO REST API base

```
https://dev.azure.com/{organization}/{project}/_apis/wit/workitems
```

API version: `?api-version=7.1`

### Field mapping

| ADO field | `SpecDoc` key | Semantic | Notes |
|---|---|---|---|
| `System.Title` | `title` | — | Stored in `SpecDoc.title` |
| `System.State` | `status` | `status` | Project-defined values |
| `Microsoft.VSTS.Common.Priority` | `priority` | `priority` | Integer 1–4 |
| `System.Tags` | `tags` | `tags` | Semicolon-delimited string |
| `System.AssignedTo.displayName` | `assignee` | `assignee` | Display name |
| `Microsoft.VSTS.Scheduling.DueDate` | `due` | `due_date` | ISO date |
| `System.Description` | `content` | — | HTML — treat as plain text |
| `System.Id` | — | — | `SpecDoc.id` as string |
| `System.WorkItemType` | — | — | `SpecDoc.schema_id` (mapped to `leanspec:feature`, `leanspec:bug`, etc.) |
| `_links.html.href` | — | — | `SpecDoc.url` |

**Priority mapping** (integer → string):

| ADO | SpecDoc |
|---|---|
| 1 | `critical` |
| 2 | `high` |
| 3 | `medium` |
| 4 | `low` |

**Tags**: split by `; ` (semicolon + space), trim each value.

**Description**: ADO stores description as HTML. Strip HTML tags to produce
plain text for the `content` field. Use a minimal HTML-to-text function — no
full DOM parser needed. When writing back, wrap plain text in `<p>` tags.

### `resolve_schema()` — dynamic state values

ADO State values are project-defined (not universal like GitHub's open/closed).
`resolve_schema()` queries the process definition to get valid states:

```
GET https://dev.azure.com/{org}/_apis/work/processes/{processId}/workItemTypes/{witRefName}/states
```

The process ID is obtained from the project properties. Cache the resolved states
in the schema's status field enum options. This makes `leanspec capabilities`
show the project's actual state names (e.g. "Active", "Resolved", "Closed").

### Work item type → schema mapping

ADO has multiple work item types (Epic, Feature, User Story, Bug, Task). Map to
LeanSpec schema IDs:

| ADO Type | Schema ID |
|---|---|
| Feature / User Story | `leanspec:feature` |
| Bug | `leanspec:bug` |
| Epic | `leanspec:base` |
| Task / anything else | `leanspec:base` |

`create()` maps `CreateRequest.schema_id` back to an ADO type:
- `leanspec:bug` → `Bug`
- `leanspec:feature` → `User Story`
- `leanspec:base` / nil → `Task`

### `delete()` semantics

ADO has no hard delete for work items via the standard API. `delete()` sets
`System.State` to the first "closed/done" state found in the resolved state
list (e.g. "Closed", "Done", "Resolved"). This matches archive semantics.

### Pagination

ADO Work Items API returns results via WIQL queries. Use:
```
POST /_apis/wit/wiql?api-version=7.1
{ "query": "SELECT [System.Id] FROM WorkItems WHERE …" }
```
Returns IDs only; then batch-fetch details with:
```
GET /_apis/wit/workitems?ids=1,2,3,…&$expand=all
```
Batch size: max 200 IDs per request.

### `init --adapter ado` (stub upgrade)

Replace the "coming soon" stub from spec 388 with the full ADO init flow:
- Prompt for organization and project
- Validate `ADO_TOKEN` by calling `GET /_apis/projects`
- Write `leanspec.adapter.yaml`

## Plan

- [ ] Create `rust/leanspec-core/src/adapters/ado.rs`
  - [ ] `AdoAdapter` struct: `org`, `project`, `token`, `client`
  - [ ] Constructor: `new(org, project, token_env) -> Result<Self, AdapterError>`
  - [ ] Implement `capabilities()` — declare ADO capabilities
  - [ ] Implement `schema()` — static schema with status, priority, tags, assignee, due, content
  - [ ] Implement `resolve_schema()` — fetch project states, populate status enum
  - [ ] Implement `list(filter)` — WIQL query + batch fetch
  - [ ] Implement `get(id)` — single work item fetch
  - [ ] Implement `create(req)` — POST new work item with PATCH body
  - [ ] Implement `update(id, req)` — PATCH work item fields
  - [ ] Implement `delete(id)` — set state to closed
  - [ ] Implement `search(query, opts)` — WIQL full-text search
  - [ ] Helper: `work_item_to_doc(json) -> SpecDoc`
  - [ ] Helper: `priority_int_to_str(n: u8) -> &str` and reverse
  - [ ] Helper: `strip_html(s: &str) -> String` (minimal, no external crate)
  - [ ] Helper: `map_ado_error(status, body) -> AdapterError`
- [ ] Add `"ado"` arm to `AdapterRegistry::create()` factory
- [ ] Add `reqwest` feature for ADO in `Cargo.toml` (can share `github` feature or add `ado`)
- [ ] Update `leanspec init --adapter ado` flow in `commands/init.rs`
- [ ] Unit tests with canned JSON fixtures
- [ ] Integration test scaffold (guarded on `ADO_TOKEN`, `TEST_ADO_ORG`, `TEST_ADO_PROJECT`)
- [ ] Plug ADO adapter into compliance test harness (spec 385)

## Test

- [ ] `cargo test -p leanspec-core` (ADO unit tests with mocked responses) pass
- [ ] ADO compliance suite passes (via spec 385 harness)
- [ ] `leanspec capabilities` on ADO project shows project-specific state names
- [ ] `leanspec list --status Active` filters by ADO state name
- [ ] `leanspec create "My Story"` creates a User Story in ADO
- [ ] Priority round-trip: int 2 in ADO → "high" in SpecDoc → int 2 on update
- [ ] Tags round-trip: semicolon-delimited in ADO → Vec in SpecDoc → semicolon on update
- [ ] `leanspec init --adapter ado` flow (with mock HTTP): writes correct config

## Notes

### HTML description field

ADO's `System.Description` is HTML. A minimal `strip_html` function handles
`<p>`, `<br>`, `<ul>/<li>`, `<b>/<strong>`, `<i>/<em>`, `<code>`. Other tags
are stripped (text content preserved). When writing back, wrap in `<p>` only —
no full markdown-to-HTML conversion. Teams using rich formatting in ADO should
not migrate to LeanSpec CLI; that's an acceptable limitation.

### Process definition API

The process definition API requires the `vso.work` scope in the PAT. Document
this in `leanspec init --adapter ado` output.
