---
status: planned
created: 2026-05-14
priority: high
tags:
- adapter
- jira
- rust
depends_on:
- "385-adapter-compliance-test-harness"
- "388-init-command-redesign"
- "397-jira-adf-markdown-converter"
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
---

# Jira Adapter

## Overview

Implement `JiraAdapter` — an `Adapter` implementation backed by Jira Cloud
(and self-hosted Jira Server / Data Center where the REST API is compatible).
Jira's complexity comes from ADF body format (handled by spec 397), project-
specific issue statuses, and its API token + email auth scheme.

Done when: `leanspec list/view/create/update/search/archive` work against a
Jira project, ADF body is correctly converted to/from markdown, and the adapter
passes the compliance test suite.

## Design

### Authentication

API token + email via HTTP Basic: base64-encode `{email}:{token}` as the
`Authorization: Basic {encoded}` header.

```yaml
# leanspec.adapter.yaml
adapter: jira
settings:
  host: mycompany.atlassian.net
  project: PROJ
  email: alice@example.com
  token_env: JIRA_TOKEN
```

The API base is `https://{host}/rest/api/3/`.

### Field mapping

| Jira field | `SpecDoc` key | Semantic | Notes |
|---|---|---|---|
| `summary` | `title` | — | `SpecDoc.title` |
| `status.name` | `status` | `status` | Project-defined |
| `priority.name` | `priority` | `priority` | Project-defined |
| `labels[]` | `tags` | `tags` | String array |
| `assignee.displayName` | `assignee` | `assignee` | |
| `duedate` | `due` | `due_date` | `YYYY-MM-DD` |
| `description` (ADF) | `content` | — | Via spec 397 converter |
| `key` | — | — | `SpecDoc.id` (e.g. `PROJ-42`) |
| `self` URL | — | — | `SpecDoc.url` |
| `issuetype.name` | — | — | Maps to `SpecDoc.schema_id` |
| Full JSON | — | — | `SpecDoc.raw` |

**Priority**: Jira priority names are project-configured (default: Highest,
High, Medium, Low, Lowest). Map to LeanSpec values:
- Highest / Critical → `critical`
- High → `high`
- Medium → `medium`
- Low / Lowest → `low`
- Unknown → use as-is (lowercase)

**Issue type → schema ID mapping:**

| Jira type | Schema ID |
|---|---|
| Story / Feature | `leanspec:feature` |
| Bug | `leanspec:bug` |
| Epic / anything else | `leanspec:base` |

### `resolve_schema()` — dynamic status and priority

Fetch project statuses:
```
GET /rest/api/3/project/{projectKey}/statuses
```

Fetch priority scheme for the project:
```
GET /rest/api/3/priority
```

Populate status and priority enum options from the live API. This makes
`leanspec capabilities` show real Jira status names (e.g. "To Do", "In Progress",
"Done") rather than generic placeholders.

### ADF ↔ markdown (via spec 397)

```rust
// Reading: ADF → markdown
let content = adf::to_markdown(&issue["fields"]["description"])
    .unwrap_or_default();

// Writing: markdown → ADF
let description_adf = adf::from_markdown(&content_str);
```

### `create()` and `update()` API shape

Jira uses a PATCH-like body for issue creation:
```json
POST /rest/api/3/issue
{
  "fields": {
    "project": { "key": "PROJ" },
    "summary": "Title",
    "issuetype": { "name": "Story" },
    "status": { "name": "To Do" },
    "description": { … ADF … },
    "labels": ["tag1", "tag2"],
    "priority": { "name": "High" }
  }
}
```

Update: `PUT /rest/api/3/issue/{issueKey}` with the same `fields` structure.

### `delete()` semantics

Jira has hard delete but it requires admin permissions and is destructive.
`delete()` transitions the issue to the first "done/closed" status in the
resolved status list. Use the Transitions API:
```
GET /rest/api/3/issue/{key}/transitions
POST /rest/api/3/issue/{key}/transitions
{ "transition": { "id": "{transitionId}" } }
```

Find the transition whose `to.statusCategory.key == "done"`.

### `search()` — JQL

```
GET /rest/api/3/search?jql={query}&maxResults=50&startAt=0
```

Translate free-text query to JQL:
```
text ~ "{query}" AND project = {project}
```

Paginate using `startAt` and `total` from the response.

### Pagination for `list()`

```
GET /rest/api/3/search?jql=project={project} {filter}&maxResults=100&startAt=0
```

Paginate until `startAt + len(issues) >= total`.

### `leanspec init --adapter jira` (stub upgrade from spec 388)

Full flow:
- Prompt for host, project key, email
- Validate `JIRA_TOKEN` via `GET /rest/api/3/myself`
- Write `leanspec.adapter.yaml`

## Plan

- [ ] Create `rust/leanspec-core/src/adapters/jira/mod.rs`
  - [ ] `JiraAdapter` struct: `host`, `project`, `email`, `token`, `client`
  - [ ] Constructor: `new(host, project, email, token_env) -> Result<Self, AdapterError>`
  - [ ] `capabilities()` and `schema()` implementations
  - [ ] `resolve_schema()` — fetch project statuses and priorities
  - [ ] `list(filter)` — JQL search with pagination
  - [ ] `get(id)` — single issue fetch
  - [ ] `create(req)` — POST new issue, map schema_id to issue type
  - [ ] `update(id, req)` — PUT issue fields
  - [ ] `delete(id)` — transition to done status
  - [ ] `search(query, opts)` — JQL text search
  - [ ] Helper: `issue_to_doc(json) -> SpecDoc`
  - [ ] Helper: `priority_name_to_value(name: &str) -> String`
  - [ ] Helper: `map_jira_error(status, body) -> AdapterError`
  - [ ] Helper: `find_done_transition(transitions_json) -> Option<String>`
- [ ] Add `"jira"` arm to `AdapterRegistry::create()` factory
- [ ] Update `leanspec init --adapter jira` flow in `commands/init.rs`
- [ ] Unit tests with canned JSON fixtures (including ADF body fixtures)
- [ ] Integration test scaffold (guarded on `JIRA_TOKEN`, `TEST_JIRA_HOST`,
  `TEST_JIRA_PROJECT`, `TEST_JIRA_EMAIL`)
- [ ] Plug Jira adapter into compliance test harness (spec 385)

## Test

- [ ] `cargo test -p leanspec-core` (Jira unit tests with mocked responses) pass
- [ ] Jira compliance suite passes (via spec 385 harness)
- [ ] ADF body round-trip: issue with formatted description → SpecDoc.content is markdown → update → ADF preserved
- [ ] `leanspec capabilities` shows project-specific Jira status names
- [ ] `leanspec list --status "In Progress"` filters by Jira status name
- [ ] `leanspec create "My Story"` creates a Jira Story issue
- [ ] Priority mapping: "High" Jira priority → "high" in SpecDoc
- [ ] `leanspec init --adapter jira` (mock HTTP) writes correct config

## Notes

### Jira Cloud vs Server

The REST API v3 (used here) is Jira Cloud only. Jira Server / Data Center uses
API v2 with slightly different field names. Add a `api_version: 2 | 3` setting
with default `3`. The main difference is that v2 uses wiki markup instead of
ADF for description. For v2, skip the ADF converter and use the raw text field.

### Rate limiting

Jira Cloud rate limits: ~300 requests/10 seconds per OAuth token. The
`X-RateLimit-*` headers are similar to GitHub's. Expose as
`AdapterError::RateLimit` when HTTP 429 is received.

### Attachment and media nodes

ADF `media` and `mediaSingle` nodes reference Jira file attachments. These
cannot be converted to markdown meaningfully. Render as:
```markdown
![attachment](jira-attachment-id)
```
This is handled by the ADF converter (spec 397) — document the limitation.
