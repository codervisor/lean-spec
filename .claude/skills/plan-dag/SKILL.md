---
name: plan-dag
description: Render the current plan as a monospace-safe text dependency DAG (Unicode box-drawing glyphs) — nodes are issues / sub-issues / PRs, edges come from sub-issue links plus dependency-language prose ("Depends on", "Part of", "Blocks", "Closes") and PR / commit cross-references, and every node carries a done / in-progress / open marker so sequencing and critical path are obvious at a glance. Use when asked "plan as dag", "draw a dag", "dag diagram", "show the dependency graph", "what's blocking what", "what's the critical path", "what can be parallelized", "what's left for #N", or right after a `what's next` survey when sequencing the next pick is the actual question.
allowed-tools: Read, Bash(git log:*), Bash(git status:*), Bash(git branch:*), Bash(.claude/skills/plan-dag/scripts/plan-dag-render.py:*), Bash(~/.claude/skills/plan-dag/scripts/plan-dag-render.py:*), Bash(.claude/skills/plan-dag/scripts/plan-dag-render.test.sh:*), Bash(~/.claude/skills/plan-dag/scripts/plan-dag-render.test.sh:*), mcp__github__issue_read, mcp__github__list_issues, mcp__github__search_issues, mcp__github__list_pull_requests, mcp__github__pull_request_read
---

# plan-dag

Render the current plan as a dependency DAG so sequencing, the critical path, and parallelizable work are visible at a glance. Default output is monospace text using Unicode box-drawing glyphs (`─`, `►`, `┐ ├ ┤ └`) so it lands cleanly in chat, terminals, and PR descriptions.

This skill is repo-agnostic. It assumes a GitHub-backed issue tracker with sub-issue links and dependency-language prose; it makes no assumptions about specific labels, area taxonomies, or repo-specific dev-process skills.

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
| **Output format** | Monospace text (Unicode box-drawing) laid out top-to-bottom via graphviz (default). `--as=png --out <path>` for a high-DPI image (preferred on image-capable chat surfaces — see below); `--as=ascii` for a pure-ASCII tree; `--as=dot` for raw DOT. |

## Workflow

```
1. Discover    Pull issues / sub-issues / PRs in scope
2. Classify    Mark each node done / in-progress / open
3. Edge-build  Read dependencies from sub-issue links + body prose
4. Render      Group by track; cross-edges last; critical path callout
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

Each node gets exactly one marker:

| State | Marker | Definition |
|-------|--------|------------|
| Done | `✓` | Closed + `state_reason: completed`, or merged PR. |
| In-progress | `…` | Open + `in-progress` label, or an open PR exists for it. |
| Open | _(none)_ | Open + `planned` / `draft`, no PR. |

Don't render "blocked" as a separate marker — the inbound edge to a non-done node already shows it. The marker is for the reader's eye, not the graph topology.

### 3. Edge-build

Edges come from three sources, in this order of trust. **Don't draw an edge you can't cite from one of these** — speculation pollutes the DAG.

1. **Sub-issue links** (`mcp__github__issue_read` + `method: get_sub_issues`). Edge direction is **child → parent** (prerequisite → dependent) — the parent closes when its children close, so the DAG flows toward closure.
2. **Explicit prose** in issue body: `Depends on #N`, `Hard depends on #N`, `Blocks #N`, `Part of #N`, `Closes #N`.
3. **PR/commit references**: `merged in PR #N`, `closed by #N`, `PR-A → PR-B` ordering inside an umbrella spec's Plan.

If a dependency is "obvious to me but uncited", the node label can hint at it; the edge stays out.

### 4. Render

Emit a JSON IR matching the schema below, then invoke the renderer. **Do not hand-draw ASCII boxes** — the renderer produces deterministically correct layout that the AI's spatial reasoning will not match, especially with cross-edges and fan-out.

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

- `status` ∈ `{done, in_progress, open}`; defaults to `open`. Status markers (`✓`, `…` in box-drawing mode; `[done]` / `[wip]` / `[open]` in ASCII mode) are added by the renderer — do not embed them in `label`.
- `edges[].source` ∈ `{sub-issue, depends-on, pr-link, closes, part-of}`, required. This is the citation rule from Conventions made enforceable: no edge without a documented source on GitHub.
- Every `from` / `to` resolves to a declared node id, or the literal `"close"`.
- `critical_path` is optional; renderer appends it as a callout under the box-drawing and ASCII targets.

**Invocation.** Default emits top-to-bottom box-drawing via graphviz (requires `dot` on PATH — `apt install graphviz`, or `brew install graphviz`) and is the right choice for terminal-only surfaces. `--as=png --out <path>` rasterises the same DOT through `dot -Tsvg` and a headless Chromium screenshot at deviceScaleFactor=2 — sharper than `dot -Tpng` and the preferred output when the chat surface can show inline images (see Response handling below). Needs `dot`, `node`, and Playwright Chromium on PATH. `--as=ascii` produces a pure-ASCII indented tree with no external dependency — used explicitly for restricted terminals, and selected automatically (with a stderr note) when `dot` is missing. `--as=dot` emits raw DOT source for piping or debugging.

**Visual encoding (PNG / DOT targets only).** Status is dual-encoded by fill and a leading emoji so the eye picks up state before reading the label:

| State | Fill | Border | Emoji |
|-------|------|--------|-------|
| Done | muted green | green | ✅ |
| In-progress | amber | thicker amber | 🟡 |
| Open + all preds done ("available next") | cool blue | thick blue | 🎯 |
| Open + blocked | near-white | grey, dashed | ⬜ |
| Close sentinel | white | double | 🏁 |

The "available next" highlight is computed from the graph (open + every predecessor is `done`) — no IR field for it. Critical-path edges are *not* bolded: which path is "the" critical path is a caller judgement, and elevating it visually would conflate the recommendation with the graph's topology. Keep the critical path in `ir.critical_path` and let the renderer print it as a footer / let prose carry the next-pick recommendation.

The text box-drawing and ASCII targets stay glyph-only (`✓` / `…` markers) because their layout math counts characters, not visual columns, and emoji are East Asian Wide. The `--emoji` flag controls whether emoji are emitted in DOT/PNG labels: `auto` (default) is on for image targets, off for text targets; `on` / `off` force it. Turn `off` if a target system lacks a color emoji font and you see tofu boxes in the PNG.

The renderer ships inside the skill. Use the path that matches how the skill was installed:

- **Project-scope install** (default for `npx skills add onsager-ai/onsager-skills` from a repo root): `.claude/skills/plan-dag/scripts/plan-dag-render.py`
- **User-global install** (`npx skills add -g …`): `~/.claude/skills/plan-dag/scripts/plan-dag-render.py`

Pick whichever exists. If unsure, `test -x .claude/skills/plan-dag/scripts/plan-dag-render.py && echo project || echo global`.

```bash
SCRIPT=.claude/skills/plan-dag/scripts/plan-dag-render.py   # project install
# SCRIPT=~/.claude/skills/plan-dag/scripts/plan-dag-render.py  # global install

# default: top-to-bottom box-drawing via graphviz
"$SCRIPT" /tmp/plan.json

# high-DPI PNG (preferred on image-capable surfaces; then SendUserFile)
"$SCRIPT" /tmp/plan.json --as=png --out /tmp/plan-dag.png

# pure ASCII tree (no external deps; auto-selected when `dot` is missing)
"$SCRIPT" /tmp/plan.json --as=ascii

# raw DOT for piping / debugging (styled by default; --emoji=off for portability)
"$SCRIPT" /tmp/plan.json --as=dot
"$SCRIPT" /tmp/plan.json --as=dot --emoji=off
```

If the renderer aborts with `IR validation failed`, fix the IR — do not work around it by hand-drawing. The validation surface is the citation rule (`Conventions › No invented edges`) made executable.

**Response handling after running the renderer:**

- Wrap the renderer's stdout in a fenced block tagged ` ```text ` — never `bash` or unlabeled. Syntax highlighting recolors box-drawing characters (`─`, `│`, `┌`, `►`) and breaks the visual.
- Do **not** retype or paraphrase the renderer output. Copy the tool result verbatim. A single shifted character destroys column alignment, and the AI's spatial reasoning is the failure mode the script was introduced to eliminate.
- Surface rules:
  - **Claude Code (terminal runtime):** the stdout is already visible in the terminal pane. Do not duplicate it in the reply. Add commentary only — critical path summary, next pickable node, sequencing rationale.
  - **claude.ai web / mobile, Claude Code on the web (image-capable, no real terminal pane):** prefer the PNG path. Render with `--as=png --out /tmp/plan-dag.png` and send the file via `SendUserFile` so the user sees a rasterised image instead of a wall of glyphs that may reflow under proportional fonts. Add prose commentary below the file — critical path, next pickable node — but don't echo the text-art version too.
  - **No image surface available (raw terminals, restricted runtimes):** the default stdout box-drawing remains the right output. PR descriptions also prefer the text version since GitHub renders ` ```text ` blocks faithfully.
- For very wide graphs (>10 nodes with cross-edges) where the default box-drawing is unwieldy, split the plan into per-track DAGs (one renderer call per track) and render the cross-edges as a final short prose list, per the existing "Cross-edges" convention in §3. The PNG target scales further before it becomes unwieldy than the text target does.

## Conventions

- **No invented edges.** If you can't cite the source (sub-issue link, body prose, PR header), don't draw it.
- **Summarize done nodes when dense.** More than ~3 done nodes in a track? Collapse to `Landed: #A #B #C ✓` rather than enumerating.
- **One DAG per response.** Don't render the same plan twice under different framings — pick the framing that answers the question that was actually asked.
- **End with the picked path.** A DAG without a recommended sequence is a wall of boxes. Close with the critical path and the next pickable node, framed so the user can redirect.
- **Don't editorialize inside the diagram.** Commentary ("this looks risky", "we should reorder") goes in prose above or below, never inside a node label.

## Tests

Golden tests live next to the renderer at `scripts/plan-dag-render.test.sh` and exercise the validator, both render targets, and the auto-fallback path against fixtures in `fixtures/`. Run with the same install-aware path the renderer uses:

```bash
# project-scope install
.claude/skills/plan-dag/scripts/plan-dag-render.test.sh

# user-global install
~/.claude/skills/plan-dag/scripts/plan-dag-render.test.sh
```

Both forms are in `allowed-tools` so Claude Code doesn't re-prompt for permission. The test script internally `cd`s into the skill root and invokes `scripts/plan-dag-render.py` as a child process — that child invocation runs inside the script's own shell, not through Claude Code's permission engine, so it doesn't need a separate allowlist entry.

Requires `dot` (graphviz) on PATH.

## Related skills

- The repo's spec-driven-development loop skill (e.g. `onsager-dev-process`, `duhem-dev-process`) — the parent / child / depends-on semantics the DAG visualizes.
- The repo's `issue-spec` skill — how parent / child / depends-on edges are persisted on GitHub.
- The repo's PR-lifecycle skill — how "in-progress" status flips on PR open / merge, which drives the `…` marker.
