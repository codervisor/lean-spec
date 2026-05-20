# Adapters — How LeanSpec Plugs Into Your Workflow

LeanSpec is a methodology, not a format. The methodology runs on top of an
**adapter** — a thin layer that speaks your backend's native language.
Markdown files in `specs/`, GitHub Issues, Azure DevOps Work Items, Jira,
Linear: each is a different adapter. You never have to migrate to a LeanSpec
schema; the adapter handles the translation.

## Why adapters exist

Every team already has a place where specs live. Forcing a migration to a
new format is a losing proposition. Instead, LeanSpec treats the existing
backend as the source of truth and teaches agents how to operate on it
through a uniform interface. Only the adapter knows the platform-specific
details; the skill and CLI stay platform-neutral.

## The capability contract

Every adapter declares:

- **Operations supported** — create, update, delete, search, webhooks.
- **Metadata fields** — each with a key, label, kind (text / enum / list /
  bool / number / timestamp), whether it is required, and an optional
  **semantic hint**.
- **Link types** — what kinds of relationships connect items.

### Semantic hints

A semantic hint tags the adapter-declared field that plays a universal role:

| Hint       | Markdown   | GitHub Issues        | Azure DevOps           |
|------------|------------|----------------------|------------------------|
| `status`   | `status`   | `state` + labels     | `State`                |
| `priority` | `priority` | priority labels      | `Microsoft.VSTS.Common.Priority` |
| `tags`     | `tags`     | `labels`             | `System.Tags`          |
| `assignee` | `assignee` | `assignees[0]`       | `System.AssignedTo`    |
| `due_date` | `due`      | milestone due date   | `Microsoft.VSTS.Scheduling.TargetDate` |

Agents look up the key for a semantic hint from the adapter's capabilities
and then read/write that key — no value or name is hard-coded in the skill.

## Discovering capabilities

```bash
leanspec capabilities            # pretty-printed
leanspec capabilities -o json    # machine-readable
```

The JSON shape is stable:

```json
{
  "name": "markdown",
  "supports_create": true,
  "supports_update": true,
  "supports_delete": true,
  "supports_search": true,
  "supports_webhooks": false,
  "metadata_fields": [
    { "key": "status", "label": "Status",
      "kind": { "kind": "enum", "values": ["draft","planned","in-progress","complete","archived"] },
      "required": true, "semantic": "status" },
    { "key": "priority", "label": "Priority",
      "kind": { "kind": "enum", "values": ["low","medium","high","critical"] },
      "required": false, "semantic": "priority" }
  ],
  "link_types": ["parent", "child", "depends_on"]
}
```

## Writing an SOP on top

Teams usually have a Standard Operating Procedure — "we always ship through
these phases, we always require a reviewer before marking done, etc." LeanSpec
supports that by letting the team write an SOP document alongside the skill.

A good SOP document:

- States the project's **phases** in the project's own words. (They may or
  may not match the adapter's status enum values.)
- Defines **done** unambiguously: passing tests, green CI, explicit reviewer,
  documented decisions.
- Calls out **gates** between phases (refinement completed, acceptance
  criteria tangible, etc.).
- References the adapter's declared vocabulary rather than spelling out
  specific status values.

## Adapter selection

By default, `leanspec` uses the markdown adapter rooted at `./specs/`. To
select a different adapter or specs directory, create one of:

- `leanspec.adapter.yaml`
- `.lean-spec/adapter.yaml`

```yaml
adapter: markdown
directory: docs/specs
```

Future adapters (GitHub, ADO, Jira, Linear) follow the same shape:

```yaml
adapter: github
owner: my-org
repo: my-project
token_env: GITHUB_TOKEN
```

## When the adapter matters

Most of the time it doesn't — the methodology reads the same. The places
adapter mechanics show through:

- **Initial discovery** — run `capabilities` once per session.
- **Status transitions** — use the adapter's declared enum values.
- **Linking** — use only the link types the adapter advertises.
- **Adapter-only commands** — `backfill`, `compact`, `analyze`, `split`,
  `migrate`, `tokens` operate on local markdown files and error cleanly on
  other adapters.
