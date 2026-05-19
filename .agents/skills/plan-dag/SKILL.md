---
name: plan-dag
description: Render the current plan as a high-DPI PNG dependency DAG — nodes are issues / sub-issues / PRs, edges come from sub-issue links plus dependency-language prose ("Depends on", "Part of", "Blocks", "Closes") and PR / commit cross-references, and every node is color-coded done / in-progress / available-next / blocked so sequencing and critical path are obvious at a glance. Use when asked "plan as dag", "draw a dag", "dag diagram", "show the dependency graph", "what's blocking what", "what's the critical path", "what can be parallelized", "what's left for #N", or right after a `what's next` survey when sequencing the next pick is the actual question.
allowed-tools: Read, Bash(git log:*), Bash(git status:*), Bash(git branch:*), Bash(.claude/skills/plan-dag/scripts/plan-dag-render.py:*), Bash(~/.claude/skills/plan-dag/scripts/plan-dag-render.py:*), Bash(.claude/skills/plan-dag/scripts/plan-dag-render.test.sh:*), Bash(~/.claude/skills/plan-dag/scripts/plan-dag-render.test.sh:*), mcp__github__issue_read, mcp__github__list_issues, mcp__github__search_issues, mcp__github__list_pull_requests, mcp__github__pull_request_read
---

# plan-dag

Render the current plan as a dependency DAG so sequencing, the critical path, and parallelizable work are visible at a glance. Output is a high-DPI PNG with status fills, an "available next" highlight, and a double-bordered close sentinel — rasterised from a styled graphviz layout through headless Chromium, then sent to the user via `SendUserFile`.

This skill is repo-agnostic. It assumes a GitHub-backed issue tracker with sub-issue links and dependency-language prose; it makes no assumptions about specific labels, area taxonomies, or repo-specific dev-process skills.

**Why PNG and not HTML / ASCII?** PNG is the only output that survives every chat surface the skill targets. ASCII / Unicode box-drawing loses column alignment when surfaces reflow whitespace or apply syntax highlighting, and it can't carry the color/status fills that make state legible at a glance. Self-contained HTML pages don't render inline in chat — they download as attachments, which defeats the point of an at-a-glance diagram. PNG renders inline, keeps color, and doesn't depend on the host's font or rendering quirks.

## When to use

- After a `what's next` survey, to commit to a sequence.
- When asked "what's left for #N" on an umbrella spec with sub-issues.
- Before picking the next branch — to see what unblocks the most downstream work.
- When a spec fans out into N sub-issues and the dependency edges aren't all linear.

Skip when:

- A single-PR spec — the plan *is* the Plan section, not a DAG.
- An unanswered design question — drawing a DAG before alignment is theater.
- The "graph" is one linear chain of three or fewer nodes — a sentence is shorter than a diagram.

## Inputs

| Parameter | Default |
|-----------|----------|
| **Scope** | Inferred — current branch's spec, the umbrella the user named, or the open issues just surveyed. |
| **Granularity** | Spec-level; drop to sub-issue / PR level for an umbrella that has fanned out. |
| **Output** | High-DPI PNG (only target). `--out <path>` is required; emoji status indicators are on by default and can be turned off with `--emoji=off` if the rendering system lacks a color emoji font. Wide ranks (many siblings sharing a successor) are staggered across multiple chains by default via graphviz `unflatten`; tune with `--stagger N` (default 5; 0 disables). |

## Workflow

```
1. Discover    Pull issues / sub-issues / PRs in scope
2. Classify    Mark each node done / in-progress / open
3. Edge-build  Read dependencies from sub-issue links + body prose
4. Render      Emit JSON IR → PNG → SendUserFile + prose commentary
```

### 1. Discover

Resolve the scope from the conversation, not from a generic crawl. Typical triggers:

- An umbrella spec → walk its sub-issue list (`mcp__github__issue_read` with `method: get_sub_issues`).
- A track of follow-ups from a recent merge → use the priority + area filter the user implied.
- The set of issues just surveyed → reuse that list verbatim, don't refetch.

For each node, capture:

- Issue state (`open` / `closed`) and `state_reason` (`completed` vs other).
- Status labels (`in-progress`, `planned`, `draft`) and `priority:*`.
- Linked PRs — look for "merged in PR #N" in the body or comments.
- Sub-issue list (only for umbrella nodes).

### 2. Classify

Each node gets exactly one status:

| State | Definition |
|-------|------------|
| `done` | Closed + `state_reason: completed`, or merged PR. |
| `in_progress` | Open + `in-progress` label, or an open PR exists for it. |
| `open` | Open + `planned` / `draft`, no PR. |

Don't render "blocked" as a separate status — the renderer derives it from the graph (any `open` node with a non-done predecessor) and styles it with a dashed muted fill. Conversely, an `open` node whose predecessors are all `done` is dual-encoded as the "available next" highlight.

### 3. Edge-build

Edges come from three sources, in this order of trust. **Don't draw an edge you can't cite from one of these** — speculation pollutes the DAG.

1. **Sub-issue links** (`mcp__github__issue_read` + `method: get_sub_issues`). Edge direction is **child → parent** (prerequisite → dependent) — the parent closes when its children close, so the DAG flows toward closure.
2. **Explicit prose** in issue body: `Depends on #N`, `Hard depends on #N`, `Blocks #N`, `Part of #N`, `Closes #N`.
3. **PR/commit references**: `merged in PR #N`, `closed by #N`, `PR-A → PR-B` ordering inside an umbrella spec's Plan.

If a dependency is "obvious to me but uncited", the node label can hint at it; the edge stays out.

### 4. Render

Emit a JSON IR matching the schema below, then invoke the renderer. **Do not hand-draw boxes** — the renderer produces deterministically correct layout that the AI's spatial reasoning will not match, especially with cross-edges and fan-out.

**Schema:**

```json
{
  "nodes": [
    {"id": "288", "label": "MCP",    "status": "done"},
    {"id": "305", "label": "router", "status": "in_progress"},
    {"id": "306", "label": "cleanup","status": "open"}
  ],
  "edges": [
    {"from": "288", "to": "304", "source": "sub-issue"},
    {"from": "305", "to": "306", "source": "depends-on"}
  ],
  "close": "300",
  "critical_path": ["301", "305", "306", "307", "close"]
}
```

- `status` ∈ `{done, in_progress, open}`; defaults to `open`. Status is rendered as a fill color plus a leading emoji — do not embed markers in `label`.
- `edges[].source` ∈ `{sub-issue, depends-on, pr-link, closes, part-of}`, required. This is the citation rule from Conventions made enforceable: no edge without a documented source on GitHub.
- Every `from` / `to` resolves to a declared node id, or the literal `"close"`.
- `critical_path` is optional; communicate it in prose alongside the rendered PNG, not inside the image.

**Visual encoding.** Status is dual-encoded by fill and a leading emoji so the eye picks up state before reading the label:

| State | Fill | Border | Emoji |
|-------|------|--------|-------|
| Done | muted green | green | ✅ |
| In-progress | amber | thicker amber | 🟡 |
| Open + all preds done ("available next") | cool blue | thick blue | 🎯 |
| Open + blocked | near-white | grey, dashed | ⬜ |
| Close sentinel | white | double | 🏁 |

The "available next" highlight is computed from the graph (open + every predecessor is `done`) — no IR field for it. Critical-path edges are *not* bolded: which path is "the" critical path is a caller judgement, and elevating it visually would conflate the recommendation with the graph's topology. Keep the critical path in `ir.critical_path` and let prose carry the next-pick recommendation under the rendered PNG.

The `--emoji` flag controls whether status emoji are emitted: `on` (default) shows ✅ / 🟡 / 🎯 / ⬜ / 🏁 emoji; `off` falls back to trailing ✓ / … text markers. Turn `off` if the target system lacks a color emoji font and the PNG shows tofu boxes.

**Invocation.** The renderer ships inside the skill. Use the path that matches how the skill was installed:

- **Project-scope install** (default for `npx skills add onsager-ai/onsager-skills` from a repo root): `.claude/skills/plan-dag/scripts/plan-dag-render.py`
- **User-global install** (`npx skills add -g …`): `~/.claude/skills/plan-dag/scripts/plan-dag-render.py`

Pick whichever exists. If unsure, `test -x .claude/skills/plan-dag/scripts/plan-dag-render.py && echo project || echo global`.

```bash
SCRIPT=.claude/skills/plan-dag/scripts/plan-dag-render.py   # project install
# SCRIPT=~/.claude/skills/plan-dag/scripts/plan-dag-render.py  # global install

# default: high-DPI PNG with emoji status indicators
"$SCRIPT" /tmp/plan.json --out /tmp/plan-dag.png

# emoji off — falls back to ✓ / … text markers in node labels
"$SCRIPT" /tmp/plan.json --out /tmp/plan-dag.png --emoji=off

# stagger off — accept the raw `dot` layout (one rank can be 10+ nodes wide)
"$SCRIPT" /tmp/plan.json --out /tmp/plan-dag.png --stagger=0
```

The renderer needs `dot` (graphviz; `apt install graphviz` / `brew install graphviz`) on PATH for the SVG layout step, and `node` (≥18) + Playwright Chromium (`npm i -g playwright && npx playwright install chromium`) for the rasterisation step. Both checks run upfront and fail loudly with install guidance — there is no silent fallback to text or ASCII, by design (the formats removed had limitations the PNG output exists to avoid).

If the renderer aborts with `IR validation failed`, fix the IR — do not work around it by hand-drawing. The validation surface is the citation rule (`Conventions › No invented edges`) made executable.

**Response handling after running the renderer:**

- Send the PNG via `SendUserFile` so it renders inline as part of the assistant message.
- Add prose commentary below the file — critical path, next pickable node, sequencing rationale. The PNG carries the topology; the prose carries the recommendation.
- Do **not** re-render the same plan in another format and attach both — one DAG per response.
- The renderer already shrinks wide layouts (siblings that all flow into CLOSE, or fan-out from a hub) by piping DOT through `unflatten -f -l 5`, trading height for width. For *truly* wide graphs (>10 nodes with many cross-edges) where even the staggered PNG is still unwieldy, split the plan into per-track DAGs (one renderer call per track) and render the cross-edges as a final short prose list, per the existing "Cross-edges" convention in §3.

## Conventions

- **No invented edges.** If you can't cite the source (sub-issue link, body prose, PR header), don't draw it.
- **Summarize done nodes when dense.** More than ~3 done nodes in a track? Collapse to `Landed: #A #B #C ✓` in prose rather than enumerating them in the graph.
- **One DAG per response.** Don't render the same plan twice under different framings — pick the framing that answers the question that was actually asked.
- **End with the picked path.** A DAG without a recommended sequence is a wall of boxes. Close with the critical path and the next pickable node in prose, framed so the user can redirect.
- **Don't editorialize inside the diagram.** Commentary ("this looks risky", "we should reorder") goes in prose above or below, never inside a node label.

## Tests

Tests live next to the renderer at `scripts/plan-dag-render.test.sh` and exercise validation (bad IR, cycle detection, own-id-prefix boundary cases), the styled DOT structural checks (status fills, available-next, blocked-dashed, close double border), and the end-to-end PNG smoke. The PNG smoke is auto-skipped when Playwright Chromium is unavailable so the validator coverage still runs in restricted CI. Run with the same install-aware path the renderer uses:

```bash
# project-scope install
.claude/skills/plan-dag/scripts/plan-dag-render.test.sh

# user-global install
~/.claude/skills/plan-dag/scripts/plan-dag-render.test.sh
```

Both forms are in `allowed-tools` so Claude Code doesn't re-prompt for permission. The test script internally `cd`s into the skill root and invokes `scripts/plan-dag-render.py` as a child process — that child invocation runs inside the script's own shell, not through Claude Code's permission engine, so it doesn't need a separate allowlist entry.

Requires `dot` (graphviz) on PATH; the PNG smoke additionally requires `node` + Playwright Chromium.

## Related skills

- The repo's spec-driven-development loop skill (e.g. `onsager-dev-process`, `duhem-dev-process`) — the parent / child / depends-on semantics the DAG visualizes.
- The repo's `issue-spec` skill — how parent / child / depends-on edges are persisted on GitHub.
- The repo's PR-lifecycle skill — how "in-progress" status flips on PR open / merge, which drives the amber fill on the rendered PNG.
