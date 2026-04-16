# LeanSpec Workflow (Detailed)

Expands the five-phase workflow from SKILL.md with concrete steps, decision
points, and checkpoints. Adapter-agnostic — every value that looks
platform-specific should be looked up from `leanspec capabilities` first.

## 0. Session start

```bash
leanspec capabilities -o json
```

Cache the response. For the rest of the session, look up:

- `metadata_fields[*].key` — the canonical field name for a concept.
- `metadata_fields[*].semantic` — the role that field plays.
- `metadata_fields[*].kind` — validation rules (enum values, list, bool, …).
- `link_types` — the legal relationship vocabulary.

## 1. Discover

**Goal:** know what already exists before touching anything.

1. `leanspec board` — current shape of the project, grouped by the adapter's
   status field.
2. `leanspec search "<keywords>"` — look for overlapping or adjacent items.
3. `leanspec view <id>` on any close match — decide whether to extend it,
   depend on it, or create a new sibling.

**Gate:** you can explain, in one sentence, how the new work fits alongside
every existing item you found.

## 2. Create

**Goal:** capture intent as a single durable artifact.

1. Pass every known field to `leanspec create`:
   - `<slug>` — kebab-case, descriptive (e.g. `user-auth-oauth`).
   - `--title` — human-readable.
   - `--content` — body.
   - Semantic fields (status, priority, tags, assignee, due) via the adapter's
     declared flag names.
   - Relationships (`--parent`, `--depends-on`) using only the link types the
     adapter understands.
2. Structure the body around:
   - **Overview** — 1–3 sentences on problem and motivation.
   - **Requirements** — `- [ ]` checklist of independently verifiable items.
   - **Non-goals** — what this explicitly does not do.
   - **Technical notes** (optional) — architecture, APIs, trade-offs.
   - **Acceptance criteria** — measurable definition of done.

**Gate:** the spec is readable by someone with no session context.

## 3. Refine

**Goal:** make the spec implementation-ready.

1. **Research the codebase:**
   - Locate every file/module the spec mentions.
   - Confirm APIs exist with the signatures the spec assumes.
   - Find existing patterns to reuse; record concrete paths and names in the
     spec.
2. **Validate dependencies:**
   - Do referenced libraries exist in the project?
   - Are there existing solutions that could replace the proposed design?
3. **Update the spec** with findings: specific paths, exact names, edge cases,
   known blockers.
4. **Readiness checklist:**
   - [ ] All referenced code paths verified.
   - [ ] Technical approach validated against the codebase.
   - [ ] Dependencies available.
   - [ ] No blocking unknowns remain.
   - [ ] Checklist items are specific and actionable.

**Gate:** if a different engineer opened this spec, they could start coding
without further research.

## 4. Implement

**Goal:** execute against the refined spec, keeping it current.

1. `leanspec view <id>` — re-read, including parent/children/dependencies.
2. Transition the spec to the adapter's "work underway" state — use
   `leanspec update <id> --status <value>` with the value the adapter declares
   for that role.
3. If the adapter has a draft-before-planned phase and draft is enabled, move
   `draft` → `planned` before `planned` → "work underway". Adapters that only
   have two states collapse this.
4. Work the checklist in order.
5. Document decisions in the spec body as they happen; out-of-scope
   discoveries become new specs linked to this one.
6. Set up relationships as they emerge:
   - `leanspec rel add <id> --parent <parent>` — decomposition.
   - `leanspec rel add <id> --depends-on <other>` — external blocker.

## 5. Verify

**Goal:** prove the work is done against reality, not the status field.

1. Run the project's quality gates:
   - `pnpm typecheck` (or language equivalent)
   - `pnpm test`
   - `pnpm lint`
   - `leanspec validate`
2. For every acceptance criterion, find a **specific** commit, file, or test
   that proves it. Tick the box only if you can point to that evidence.
3. Run `git log --oneline --since="<create-date>"` for any relevant paths and
   cross-check against the spec.
4. Transition the spec to the adapter's "done" state using the declared value.
5. Append a short implementation note (links to commits, PRs, dashboards).

**If anything fails:** stay in-progress, fix the cause, re-run. Never mark
done on red.

## Status verification — what to check

When asked "is X done?":

| Check                       | How                                       |
|-----------------------------|-------------------------------------------|
| Recent commits              | `git log --oneline --since="..."`         |
| File changes                | Inspect the workspace                     |
| Test results                | Run the project's test suite              |
| Spec checklist              | Read the spec                             |
| Backend status              | `leanspec view <id>` — **never alone**    |

Red flags: status says done but no recent commits; status says in-progress
but the code is fully implemented; checklist items unchecked but code exists;
tests missing or failing.

## Organising work

Use when specs need structure, relationships are unclear, or the board is
cluttered.

Survey first with `leanspec board`, `leanspec board --group-by parent`,
`leanspec stats`. Then apply:

| Pattern                                   | Action                                    |
|-------------------------------------------|-------------------------------------------|
| 3+ related specs with no parent           | Create an umbrella; link children to it   |
| Spec can't start without another          | Add a `depends_on` link                   |
| Completed spec still in-progress on board | Transition via `update`                   |
| Stale, low-value spec                     | Transition to the adapter's archive state |
| Spec > ~2000 tokens                       | Split into parent + children              |
| Duplicates / overlapping specs            | Merge or archive redundant one            |
