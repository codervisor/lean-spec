# Spec Format Reference

Section-by-section guide for writing lean-spec style GitHub issue specs. Based on the [lean-spec SDD methodology](https://github.com/codervisor/lean-spec), adapted to use GitHub issues as the sole spec medium.

This reference is repo-agnostic. Consumer repos overlay their area-label taxonomy, custom body sections (e.g. Provider impact, Schema impact), and additional principles via their `CLAUDE.md` and `*-dev-process` / `*-pre-push` / `*-pr-lifecycle` sister skills — read those first.

## Metadata via GitHub Issue Features

No YAML frontmatter — all metadata lives in native GitHub features:

| lean-spec field    | GitHub equivalent     | Example                                      |
|--------------------|-----------------------|----------------------------------------------|
| `status`           | Labels                | `draft`, `planned`, `in-progress`            |
| `priority`         | Labels                | `priority:high`                              |
| `tags`             | Labels                | `area:<subsystem>`, `feat`                   |
| `depends_on`       | Issue body reference  | `depends on #42`                             |
| `parent/child`     | Sub-issues            | Created via `mcp__github__sub_issue_write`   |
| `assignee`         | Issue assignee        | `@username`                                  |
| `created/updated`  | Issue timestamps      | Automatic                                    |
| `transitions`      | Issue timeline        | Automatic audit trail                        |

### Label Taxonomy

Apply labels when creating the issue:

**Required:**

- `spec` — marks this as a spec issue (always present)

**Type** (pick one):

- `feat` — new capability
- `fix` — bug fix
- `refactor` — restructuring without behavior change
- `perf` — performance improvement

**Area** (pick one or more):

Drawn from the consumer repo's area taxonomy — read the repo's `*-dev-process` sister skill (or `CLAUDE.md`) for the canonical list. Examples observed across consumer repos: `area:spine`, `area:dashboard`, `area:cli`, `area:ui`, `area:provider`, `area:schema`, `area:runtime`, `area:judge`, `area:docs`, `area:infra`. Respect each repo's architectural invariants when picking the area: a spec that crosses two areas should usually be split into per-area child specs with a shared parent.

**Priority** (pick one):

- `priority:critical` — blocks other work, needs immediate attention
- `priority:high` — important, should be next
- `priority:medium` — default
- `priority:low` — nice to have

**Status** (pick one, update as lifecycle progresses):

- `draft` — initial state, AI-generated, human review pending
- `planned` — human reviewed, decisions made, ready for implementation
- `in-progress` — actively being worked on (PR open)

**Cross-cutting (consumer-repo overlay):**

Some consumer repos define additional discoverability labels for cross-cutting concerns — e.g. `provider-impact` for specs that touch a provider seam, `schema-impact` for schema changes, `i18n` for user-visible string changes, `trivial` (PR-only) for specs-not-required. Apply the ones that exist in the target repo; the repo's CLAUDE.md / sister skill is authoritative.

### Status Lifecycle

```
open + draft  →  open + planned  →  open + in-progress  →  closed
```

The `draft → planned` transition is the **human-AI alignment gate**. Only a human moves a spec to `planned` — this confirms:

- Open questions are resolved
- Design approach is approved
- Scope and priority are accepted

`planned → in-progress` happens **automatically** on PR open in repos that ship a `pr-spec-sync.yml` workflow, and **manually** in repos that don't. Check the repo's `*-pr-lifecycle` sister skill.

`in-progress → closed` happens automatically on PR merge with a `Closes #N` keyword. `Part of #N` PRs don't close the parent; the merger ticks the parent's Plan checkboxes manually.

## Sections

### Overview

**Purpose**: Why does this work matter? What problem does it solve?

**Good overview** (note: prose, list items, and blockquote lines are *not* hard-wrapped — GitHub renders single newlines as `<br>` in issue bodies):

```markdown
## Overview

Sessions in `WAITING_INPUT` state can hang indefinitely if the user disconnects. This wastes agent capacity and leaves stale sessions in the dashboard. We need a configurable timeout that transitions idle sessions to `FAILED` after a period of inactivity.
```

**Bad overview:**

```markdown
## Overview

Add a timeout feature to sessions.
```

The bad version says *what* but not *why*. The AI has no context to make tradeoff decisions during implementation.

**Guidelines:**

- 2-4 sentences. Problem → impact → what we need.
- Reference specific code/behavior when possible.
- Don't describe the solution here — that's Design's job.

### Design

**Purpose**: How should this work? What's the technical approach?

**Write intent, not implementation:**

```markdown
## Design

Each session gets an inactivity timer that resets on any WebSocket message. When the timer expires:
1. Emit a `SessionTimeoutWarning` event 5 minutes before deadline
2. Transition state to `Failed` with reason `session_timeout`
3. Preserve all session output collected before timeout

The timeout duration is server-configurable via environment variable. Per-session overrides are out of scope for now.
```

**Guidelines:**

- Describe data flow, state changes, API surface — not line-by-line code.
- Include what's explicitly **out of scope** to prevent scope creep.
- If design is complex, create child sub-issues for subsections.
- Reference existing architecture when relevant.
- Respect the consumer repo's architectural invariants (e.g. event-bus seam rules, provider-agnostic core, holistic verification). The repo's `CLAUDE.md` is authoritative.

### Plan

**Purpose**: Concrete deliverables as a checklist. Each item is independently verifiable.

```markdown
## Plan

- [ ] Add `SESSION_TIMEOUT` env var to server config (default: 30m)
- [ ] Implement per-session inactivity timer in `SessionManager`
- [ ] Add `SessionTimeoutWarning` event type
- [ ] Emit warning event 5 minutes before timeout
- [ ] Transition `WaitingInput → Failed` on timeout expiry
- [ ] Preserve session output on timeout (no data deletion)
- [ ] Add timeout info to `GET /api/sessions/:id` response
```

**Guidelines:**

- Each item starts with a verb: Add, Implement, Update, Remove, Fix.
- Items should be small enough to verify in isolation.
- Order reflects implementation sequence.
- If a plan has more than ~10 items, the spec is too big — split into sub-issues.
- Checkboxes serve as progress tracking on the issue itself; tick them manually as `Part of #N` PRs merge (see the repo's `*-pr-lifecycle` sister skill).

### Test

**Purpose**: How to verify each plan item is done correctly.

```markdown
## Test

- [ ] Unit test: config parses valid duration strings, rejects invalid
- [ ] Unit test: timer resets on incoming message
- [ ] Integration test: session transitions to Failed after timeout
- [ ] Integration test: warning event emitted 5 minutes before timeout
- [ ] Integration test: session output preserved after timeout
- [ ] Manual: dashboard shows timeout state and warning indicator
```

**Guidelines:**

- Each test item maps to one or more plan items.
- Specify test type: unit, integration, manual, type check, lint.
- Include negative cases: "rejects invalid", "does not delete".
- For manual tests, describe what to check — not exact click paths.
- Consumer repos may require additional test classes (e.g. i18n locale parity, schema validation) — read the repo's CLAUDE.md / sister skill.

### Alignment

**Purpose**: Explicit partition of work between human and AI. This section extends the lean-spec format for human-AI collaborative development.

```markdown
## Alignment

### Human decides
- [ ] Timeout default value (proposed: 30m)
- [ ] Whether to show UI warning (toast vs. banner)
- [ ] Behavior on network partition

### AI implements
- [ ] Config parsing and validation
- [ ] Timer logic in SessionManager
- [ ] Event types and emission
- [ ] State transition + database update
- [ ] Unit and integration tests per Test section

### Open questions
> Should timed-out sessions be retryable, or must the user create a new task?
> Impact: changes whether final state is `Failed` or `Pending`.
```

**Guidelines:**

- Every Plan item maps to exactly one of: "Human decides" or "AI implements."
- Human items are decisions/tradeoffs. AI items are execution.
- Open questions block implementation — they must be resolved (via issue comments) before the `draft → planned` label transition.
- Once a human answers a question in a comment, update the Alignment section and record the decision.

### Notes

**Purpose**: Context, tradeoffs, references — anything that doesn't fit elsewhere.

```markdown
## Notes

- Considered per-session timeout overrides via API, but deferred to keep scope small. Can add in a follow-up spec.
- The timeout timer approach uses a per-session async timer. At 100+ concurrent sessions this may need optimization.
- Related: #23, #31
```

**Guidelines:**

- Tradeoffs considered and why you chose this approach.
- Performance or scalability concerns for future reference.
- Links to related issues, PRs, or external resources.
- Keep it brief — notes are context, not a second design section.
- Omit this section entirely if there's nothing to note.

### Consumer-repo overlay sections

Some consumer repos require additional sections in the issue body. Apply the ones that exist in the target repo:

- **`## Provider impact`** (lean-spec) — required whenever a change touches the provider abstraction or anything crossing the markdown / github backend seam. Captures types added/removed/renamed, trait changes, per-backend semantics, migration path, breaking?-flag.
- **`## Schema impact`** (Duhem) — required whenever a change touches the Verification Definition format, action-type catalog, runtime expressions, judge semantics, or any externally observable contract. Captures fields added/removed/renamed, semantics changes, migration path for in-flight definitions, breaking?-flag.
- **`## Worked example`** (Duhem) — required when a spec introduces or modifies user-visible product surface. A minimal Verification Definition (or link to one) that exercises the surface end-to-end.
- **Reach plan items** (Onsager) — when a spec introduces a new user-facing primitive, the Plan must include nav entry, first-run flow, empty-state CTAs, and auth gating.

The repo's CLAUDE.md / sister skill is authoritative for which extras it requires. Drop a section only if the change provably doesn't touch its surface.

## Context Economy Rules

Smaller specs produce better results — for both AI implementation and human review:

| Issue body size | Action                                            |
|-----------------|---------------------------------------------------|
| < 500 tokens    | Good for bug fixes and small changes              |
| 500–2000 tokens | Standard spec — covers most features              |
| > 2000 tokens   | **Split into parent + sub-issues**                |

**How to split:**

1. Create a parent issue with Overview + high-level Plan listing the children.
2. Create child issues via `mcp__github__sub_issue_write`, one per independent concern.
3. Each child has its own Design, Plan, Test, Alignment sections.
4. Parent tracks overall progress; children track individual concerns.

**Example:**

```
#50 spec(<area>): umbrella feature                ← parent
  ├── #51 spec(<area>): concern A                 ← sub-issue
  ├── #52 spec(<area>): concern B                 ← sub-issue
  └── #53 spec(<other-area>): UI surface for A+B  ← sub-issue
```

## Title Convention

```
spec(<area>): <short description in imperative mood>
```

`<area>` is one of the consumer repo's `area:*` labels with the `area:` prefix dropped. Examples across consumer repos:

- `spec(stiglab): add session timeout for idle sessions`
- `spec(provider): github provider — issue CRUD via MCP`
- `spec(schema): add api/observe action type`
- `spec(dashboard): show real-time node heartbeat status`
- `spec(judge): three-state verdict aggregation rules`
- `spec(infra): pin CI action versions to SHAs`
