# Best Practices

Principles for spec-coding with LeanSpec. Adapter-agnostic — every value that
looks like a status or priority should be looked up from `leanspec
capabilities` rather than hard-coded in agent behaviour.

## Do

- **Discover first.** Run `leanspec capabilities` and `leanspec board` at the
  start of every session.
- **Use the CLI for every operation.** Never edit frontmatter, YAML, or the
  backend's UI by hand.
- **Keep specs short.** Target under ~2000 tokens. Split when larger.
- **Write intent first.** Problem, motivation, desired outcome come before
  design; design comes before plan.
- **Pass every known field to `create`.** No empty-then-patch.
- **Transition status early.** Move into the adapter's "work underway" state
  before coding, not after.
- **Document decisions in the spec** as they happen — not in chat, not in
  commit messages alone.
- **Link dependencies** once you discover them. Use the adapter's declared
  link types.
- **Use parent/child for decomposition.** Don't use `depends_on` for children
  of an umbrella.
- **Verify before closing.** Tests, typecheck, lint, build must all be green.
- **Verify against reality.** Code, commits, CI — not the status field.
- **Keep AGENTS.md minimal and project-specific.** Shared methodology lives
  here in the skill.

## Avoid

- **Hard-coding status or priority values** in agent behaviour. They come from
  the adapter's capabilities.
- **Creating spec files or backend items manually.** Use `leanspec create`.
- **Leaving specs in "planned" state after coding starts.** Transition them
  as soon as work begins.
- **Skipping discovery.** Duplicates and contradictory specs are worse than
  missing ones.
- **Writing implementation-only specs.** Without intent, the spec decays.
- **Letting specs drift from actual work.** Update as decisions happen.
- **Using `depends_on` for children of an umbrella.** Use parent/child.
- **Using parent/child for unrelated blockers.** Use `depends_on`.
- **Trusting status alone.** Always verify via code/commits/tests.
- **Marking specs done without verifying.** Every acceptance-criteria check
  needs a concrete artifact.

## Context economy

- Split large specs into separate files (e.g., `DESIGN.md`, `TESTING.md`) or
  into child specs linked via `parent`.
- Favour bullet lists over prose.
- Drop redundant narrative and filler.
- Checklists are for actionable items only; use plain lists for
  non-actionable enumerations.

## Status verification

When asked "is X done?", "what's the progress on Y?", or "is this complete?":

### Always check

1. **Git history** — recent commits touching the relevant paths.
2. **File changes** — actual code modifications on disk.
3. **Test results** — passing tests verifying the implementation.
4. **Spec checklist** — all items ticked with evidence.
5. **Documentation** — updated docs, if applicable.

### Never rely solely on

- The spec's status field.
- Old spec content you haven't re-read.
- Your memory of previous conversations.

### Red flags

- Status says done but no commits in the window.
- Status says in-progress but the code is fully landed.
- Checklist items unchecked while matching code exists.
- Tests missing or failing.

## When to create a new spec

Create one when:

- The change spans multiple packages, subsystems, or teams.
- You need cross-team alignment or approval.
- The implementation requires decisions with trade-offs worth preserving.
- The work will take more than one focused coding session.

Skip a spec for:

- Small bug fixes with an obvious cause.
- Typos, trivial refactors, dependency bumps.
- Work whose scope is smaller than the ceremony of writing the spec.

## Relationship choices

- **Parent / child** — umbrella decomposition; a child doesn't make sense
  without its parent. The parent completes when all its children do.
- **Depends on** — technical blocker; both items are independent work with
  separate goals.
- **Litmus test:** "If the other spec didn't exist, would this one still make
  sense?" No → child. Yes → depends on.
- **Never use both** for the same pair.

## SOP layering

A team's Standard Operating Procedure sits **on top of** the adapter and the
methodology. The SOP can add:

- Project-specific phases that map to adapter status values.
- Reviewer/approval gates between phases.
- Checklists for what "ready for refine," "ready for implement," and "done"
  look like in this project.
- Domain-specific link-type usage (e.g., "always link the PR to the spec
  that motivated it").

The SOP should reference the adapter's declared vocabulary rather than
hard-coding values. That way, migrating from markdown to GitHub Issues to ADO
does not rewrite the SOP — it just reloads capabilities.
