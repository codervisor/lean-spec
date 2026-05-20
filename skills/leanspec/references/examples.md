# Examples

Three end-to-end scenarios showing the **same methodology** on three
different adapters. Each scenario uses the adapter's own vocabulary — notice
how the methodology is identical; only the surface detail changes.

---

## Scenario A — Markdown adapter (local `specs/` folder)

Default setup. Specs live as `specs/NNN-name/README.md` with YAML
frontmatter. Status values are `draft`, `planned`, `in-progress`, `complete`,
`archived`; priority values are `low`, `medium`, `high`, `critical`.

### Discovery

```bash
leanspec capabilities -o json
leanspec board
leanspec search "search index"
```

### Create

```bash
leanspec create cached-search \
  --title "Cached search for large spec repositories" \
  --priority high \
  --tags search,performance \
  --depends-on 069
```

Body outline:

- **Overview** — large repos make search cost O(n·m). Cache the parsed index.
- **Requirements** — `- [ ]` list of checkable items.
- **Non-goals** — fuzzy ranking changes are out of scope.
- **Acceptance criteria** — p50 search < 50ms on 10k-spec repo.

### Implement

```bash
leanspec update 210 --status in-progress
# ... code, tests ...
leanspec validate
leanspec update 210 --status complete
```

### Umbrella with children

```bash
leanspec create cli-ux-overhaul --title "CLI UX Overhaul"   # e.g. 250
leanspec create help-system --title "Improved Help System"  # 251
leanspec create error-messages --title "Better Error Messages"  # 252

leanspec rel add 251 --parent 250
leanspec rel add 252 --parent 250
leanspec children 250
```

---

## Scenario B — GitHub Issues adapter (future)

A team that tracks specs as GitHub Issues in a dedicated `/specs` label. The
adapter exposes GitHub's native vocabulary:

- Semantic `status` → the issue's `state` (`open`, `closed`) combined with a
  status label (`status:planned`, `status:in-progress`).
- Semantic `priority` → `priority:*` labels.
- Semantic `tags` → labels.
- Semantic `assignee` → `assignees[0]`.
- Link types: `parent` (GitHub task-list relationship), `depends_on` (closes
  + referenced-by).

### Discovery

```bash
leanspec capabilities -o json
leanspec board            # renders "Open" / "In Progress" / "Closed" columns
leanspec search "index"
```

### Create

```bash
leanspec create cached-search \
  --title "Cached search for large spec repositories" \
  --priority high \
  --tags search,performance \
  --depends-on 69
```

Behind the scenes the adapter opens a GitHub issue titled
"Cached search for large spec repositories" with labels
`priority:high`, `search`, `performance`, and a "Depends on #69" task-list
entry. Frontmatter never enters the picture — the body is plain markdown.

### Implement

```bash
leanspec update 210 --status in-progress
# ... code, tests ...
leanspec validate
leanspec update 210 --status complete      # closes the issue
```

The CLI translates `in-progress` into `status:in-progress` label application;
`complete` closes the issue and removes the in-progress label.

---

## Scenario C — Azure DevOps adapter (future)

A team using ADO Work Items. The adapter maps:

- Semantic `status` → `System.State` (`New` / `Active` / `Resolved` /
  `Closed`).
- Semantic `priority` → `Microsoft.VSTS.Common.Priority` (`1`–`4`).
- Semantic `tags` → `System.Tags`.
- Semantic `assignee` → `System.AssignedTo`.
- Link types: `parent` (ADO parent-child link), `depends_on` (Predecessor /
  Successor links).

### Discovery

```bash
leanspec capabilities -o json
leanspec board
leanspec search "telemetry"
```

### Create

```bash
leanspec create add-otel-tracing \
  --title "Add OpenTelemetry tracing to ingestion pipeline" \
  --priority 2 \
  --tags telemetry,ingestion \
  --depends-on 12345
```

The adapter creates a Work Item with those values in ADO; `priority 2` maps
to ADO's numeric priority; `depends_on 12345` creates a Predecessor link.

### Implement

```bash
leanspec update 23456 --status Active
# ... code, tests ...
leanspec validate
leanspec update 23456 --status Closed
```

---

## Scenario D — Choosing between parent and depends_on

Identical on every adapter.

**A.** "Search UI" is one piece of the "Search Feature" umbrella.
→ **parent/child**: `leanspec rel add search-ui --parent search-feature`

**B.** "Search Feature" cannot ship until "Database Indexing" ships.
→ **depends_on**: `leanspec rel add search-feature --depends-on database-indexing`

Litmus test: *"If the other spec didn't exist, would this one still make
sense?"*

- "Search UI" without "Search Feature" → No → child of Search Feature.
- "Search Feature" without "Database Indexing" → Yes, just blocked → depends.

---

## Example — Minimal AGENTS.md (with skill)

```markdown
# AI Agent Instructions

## Project: Example

Core spec-coding methodology is defined in the leanspec skill.

Install: `npx skills add codervisor/skills@leanspec`

At session start, run `leanspec capabilities -o json` to learn the active
adapter's vocabulary. Then follow the five-phase methodology from SKILL.md.

## Project-Specific Rules

- Use pnpm instead of npm.
- Update both en and zh-CN locales for UI text.
- All PRs require a linked spec via the `closes-spec` label.
```
