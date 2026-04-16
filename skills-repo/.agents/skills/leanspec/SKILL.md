---
name: leanspec
description: The spec-coding methodology for AI-assisted development. Use when planning features, creating/refining/implementing/verifying specs, or organising a project. Works with whatever spec backend your team already uses — local markdown, GitHub Issues, Azure DevOps, Jira — by delegating platform-specific details to a LeanSpec adapter.
---

# LeanSpec — Spec Coding Skill

Teach agents **spec coding**: the practice of treating specs as durable
artifacts that drive development, not ephemeral planning notes. LeanSpec
provides the methodology and the `leanspec` CLI; each **adapter** (markdown,
GitHub Issues, ADO, Jira, …) speaks its backend's native language. The skill
is deliberately adapter-agnostic — never hard-code a status value, priority
name, or field key here.

## Start every session with capability discovery

Before reading, writing, or linking any specs, run:

```bash
leanspec capabilities -o json
```

The output is your source of truth. It tells you:

- The active adapter's name (`markdown`, `github`, `ado`, …).
- Which metadata fields exist and their types/enum values.
- Which field plays each **semantic role** (`status`, `priority`, `tags`,
  `assignee`, `due_date`) on this adapter.
- Which link types the backend understands (`parent`, `depends_on`, …).

Use the returned enum values as the only valid vocabulary. If you want to move
a spec into the "working" state, look up the semantic `status` field, pick the
value the adapter calls "work is underway," and send that — don't assume it's
called `in-progress`.

## Core principles

1. **Specs are durable artifacts.** They persist beyond the session, they are
   reviewable, and they link to code. They are not plan-mode scratch pads.
2. **Methodology, not mechanics.** The five phases below apply whether your
   backend is a markdown folder, a GitHub repo, or a Jira project.
3. **Discovery first.** Always read what exists before writing anything new.
4. **Intent before implementation.** Capture *why* first, *how* second.
5. **Verify against reality.** Never trust a status field alone — check code,
   commits, tests, CI.
6. **Use the adapter's vocabulary.** No hard-coded field names or values.

## The five phases

### 1. Discover

Understand the current state of the project before touching anything.

1. Run `leanspec capabilities -o json` (session start).
2. Run `leanspec board` to see the current shape of the project.
3. Run `leanspec search "<keywords>"` to find related items.
4. If a close match exists, consider extending or linking to it rather than
   creating a new item.

### 2. Create

Capture intent as a new, durable artifact.

1. Run `leanspec create <short-name>` with every known field in a single call
   (title, body, semantic fields like status/priority, tags, parent,
   dependencies). Never create an empty item and then patch it.
2. Write the body with:
   - **Overview** — what problem this solves and why it matters.
   - **Requirements** — a checklist of independently verifiable items.
   - **Non-goals** — what's explicitly out of scope.
   - **Acceptance criteria** — measurable definition of done.
3. Link relationships as they emerge. Use the adapter's declared link types
   (typically `parent` for hierarchy and `depends_on` for blockers — confirm
   via `capabilities`).

### 3. Refine

Make the spec implementation-ready before coding starts.

1. Locate files, modules, and APIs referenced in the spec; verify they exist.
2. Find existing patterns to reuse; note concrete paths and function signatures
   in the spec.
3. Validate dependencies are available.
4. Gate: no blocking unknowns; every checklist item is specific and actionable.

### 4. Implement

Execute against the refined spec.

1. Read the spec (`leanspec view <id>`), including parent, children, and
   dependencies.
2. Transition the spec into its "work underway" state via
   `leanspec update <id>` using the adapter's declared status value.
3. Work the checklist in order; stay inside the scope boundaries; document
   decisions and discoveries inside the spec as they happen.
4. If you find out-of-scope work, create a **new** spec and link it rather
   than expanding the current one.

### 5. Verify

Close the loop against reality, not status.

1. Run the project's quality gates (tests, typecheck, lint, build).
2. Re-read the spec's acceptance criteria and tick each one only if you can
   point to the commit, test, or file that proves it.
3. Transition the spec to its adapter-declared "done" state, and append a
   short implementation note.
4. If anything failed, stay in-progress, fix the cause, and re-run.

## Relationship types

Relationships are adapter-declared. Check `capabilities.link_types`. The two
most common shapes:

- **Parent / child** — an umbrella decomposed into child items. A child
  doesn't make sense without its parent; the parent completes when all its
  children do.
- **Depends on** — a blocker. Both items are independent work; one just has
  to ship first.

**Decision flowchart:**

1. Is item B part of item A's scope? → parent/child.
2. Does item B just need item A finished first? → depends-on.
3. Never use both for the same pair.

**Litmus test:** "If item A didn't exist, would item B still make sense?"
**No** → B is A's child. **Yes** → B depends on A.

## Managing evolving work

- **Content changes** — use `leanspec update --content` or edit the item body.
- **Metadata changes** — use the supported `leanspec update` flags
  (`--status`, `--priority`, `--assignee`, `--add-tags`, `--remove-tags`,
  etc.) for adapter-declared fields. Each flag accepts values from the
  adapter's capabilities. The skill never writes raw frontmatter or YAML.
- **Scope creep** — split. Create a sibling spec and link it; update the
  original's non-goals to reference the split.
- **Obsolete work** — transition to the adapter's "closed/archived" state
  rather than deleting; history matters.

## Context economy

- Keep each item under ~2000 tokens. Split if larger.
- Favour bullet lists over prose.
- Use references to external docs rather than copying them.
- Checklists are for actionable items only — plain lists for everything else.

## Best practices — at a glance

- **Never create items manually.** Always use `leanspec create`.
- **Never edit raw metadata.** Use `leanspec update`.
- **Always discover first.** Run `board` / `search` before `create`.
- **Always pass every known field to `create`.** No empty-then-patch.
- **Always verify before closing.** Tests, typecheck, lint, build.
- **Trust the adapter's vocabulary.** Re-run `capabilities` if anything feels
  ambiguous.

## References

- [references/adapters.md](./references/adapters.md) — how adapters work and
  how to write your SOP on top of them.
- [references/workflow.md](./references/workflow.md) — the five-phase workflow
  with examples.
- [references/commands.md](./references/commands.md) — CLI reference.
- [references/best-practices.md](./references/best-practices.md) — detailed
  patterns and anti-patterns.
- [references/examples.md](./references/examples.md) — end-to-end scenarios
  on markdown, GitHub Issues, and Azure DevOps backends.
