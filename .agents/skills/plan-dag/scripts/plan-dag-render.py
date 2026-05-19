#!/usr/bin/env python3
"""plan-dag-render — JSON DAG IR → high-DPI PNG.

Single output target: PNG, rasterised from a styled graphviz SVG through
headless Chromium at deviceScaleFactor=2. PNG is the only format that
ships reliably on every surface the skill targets — chat clients render
it inline, status fills/emoji survive, and there's no column-alignment
fragility the way text/ASCII targets had.
"""

import argparse
import json
import shutil
import subprocess
import sys
from collections import deque
from pathlib import Path

STATUS_MARKER = {"done": " ✓", "in_progress": " …", "open": ""}
VALID_STATUS = set(STATUS_MARKER.keys())
VALID_SOURCES = {"sub-issue", "depends-on", "pr-link", "closes", "part-of"}
FORBIDDEN_LABEL_CHARS = ('"', "\\", "[", "]", "\n", "\r")

# Visual vocabulary. Fills encode status; an additional "available next"
# highlight is computed from the graph (open + all preds done).
_STYLE_DONE = {"fillcolor": "#d4edda", "color": "#52a566"}
_STYLE_IN_PROGRESS = {"fillcolor": "#fff3cd", "color": "#d39e00", "penwidth": "2.0"}
_STYLE_OPEN_BLOCKED = {
    "fillcolor": "#f8f9fa", "color": "#adb5bd",
    "style": "filled,rounded,dashed",
}
_STYLE_OPEN_AVAILABLE = {
    "fillcolor": "#cfe2ff", "color": "#0d6efd", "penwidth": "2.5",
}
_STYLE_CLOSE = {"peripheries": "2", "fillcolor": "#ffffff", "color": "#495057"}

_EMOJI = {
    "done": "✅",
    "in_progress": "🟡",
    "open_blocked": "⬜",
    "open_available": "🎯",
    "close": "🏁",
}


def _dot_escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def validate(ir):
    errors = []
    if not isinstance(ir, dict):
        return [f"ir must be a JSON object, got {type(ir).__name__}"]
    nodes = ir.get("nodes", [])
    if not isinstance(nodes, list) or not nodes:
        return ["ir.nodes is missing or empty"]
    ids = set()
    for i, n in enumerate(nodes):
        if not isinstance(n, dict):
            errors.append(f"nodes[{i}] must be an object, got {type(n).__name__}")
            continue
        if "id" not in n:
            errors.append(f"nodes[{i}] missing id")
            continue
        nid = str(n["id"])
        if nid == "close":
            errors.append(
                f"nodes[{i}].id={nid!r} is reserved for the synthetic CLOSE sentinel; "
                f"use a different id and set ir.close instead"
            )
            continue
        if nid in ids:
            errors.append(f"duplicate node id: {nid}")
        ids.add(nid)
        status = n.get("status", "open")
        if status not in VALID_STATUS:
            errors.append(f"node #{nid}: invalid status {status!r}")
        label = n.get("label")
        if not label:
            errors.append(f"node #{nid}: missing label")
        elif not isinstance(label, str):
            errors.append(f"node #{nid}: label must be a string, got {type(label).__name__}")
        else:
            for ch in FORBIDDEN_LABEL_CHARS:
                if ch in label:
                    errors.append(
                        f"node #{nid}: label contains forbidden character {ch!r} "
                        f"(any of {FORBIDDEN_LABEL_CHARS} can break output rendering)"
                    )
                    break
            # The renderer always prepends "#<id> " to the label. A label that
            # already starts with "#<own-id>" (followed by non-digit or end of
            # string) renders as "#288 #288 MCP" — a common mistake when
            # pasting GitHub titles verbatim. References to *other* issue
            # numbers in the label are fine.
            nid_prefix = f"#{nid}"
            if label.startswith(nid_prefix) and (
                len(label) == len(nid_prefix)
                or not label[len(nid_prefix)].isdigit()
            ):
                stripped = label[len(nid_prefix):].lstrip(" :-\t") or "<title>"
                errors.append(
                    f"node #{nid}: label {label!r} starts with own id; "
                    f"the renderer prepends '#{nid} ' automatically — "
                    f"use just the bare title (e.g. {stripped!r})"
                )
    ids.add("close")
    edges = ir.get("edges", [])
    if not isinstance(edges, list):
        errors.append(f"ir.edges must be a list, got {type(edges).__name__}")
        return errors
    references_close = False
    for i, e in enumerate(edges):
        if not isinstance(e, dict):
            errors.append(f"edges[{i}] must be an object, got {type(e).__name__}")
            continue
        for end in ("from", "to"):
            if end not in e:
                errors.append(f"edges[{i}] missing {end}")
            else:
                val = str(e[end])
                if val == "close":
                    references_close = True
                if val not in ids:
                    errors.append(f"edges[{i}].{end}={e[end]!r} not in declared nodes")
        if not e.get("source"):
            errors.append(f"edges[{i}] missing source (citation required)")
        elif e["source"] not in VALID_SOURCES:
            errors.append(
                f"edges[{i}].source={e['source']!r} not in {sorted(VALID_SOURCES)}"
            )
    close = ir.get("close")
    if references_close and close is None:
        errors.append(
            "edges reference the CLOSE sentinel but ir.close is missing "
            "(set ir.close to the closing issue id, e.g. 'ir.close': '300')"
        )
    if close is not None:
        if not isinstance(close, (str, int)):
            errors.append(
                f"ir.close must be a string or int, got {type(close).__name__}"
            )
        elif isinstance(close, str) and not close.strip():
            errors.append(
                "ir.close is an empty string; set it to the closing issue id, "
                "or omit the key entirely"
            )
    cp = ir.get("critical_path")
    if cp is not None:
        if not isinstance(cp, list):
            errors.append(
                f"ir.critical_path must be a list, got {type(cp).__name__}"
            )
        else:
            for i, node_id in enumerate(cp):
                if not isinstance(node_id, (str, int)):
                    errors.append(
                        f"critical_path[{i}]: must be a string or int, "
                        f"got {type(node_id).__name__}"
                    )
                elif str(node_id) not in ids:
                    errors.append(
                        f"critical_path[{i}]={node_id!r} not in declared nodes"
                    )

    # Cycle check — only run if edges are structurally sound, so we don't
    # walk over malformed entries already reported above.
    if not errors:
        indeg = {nid: 0 for nid in ids}
        adj = {nid: [] for nid in ids}
        for e in edges:
            u, v = str(e["from"]), str(e["to"])
            adj[u].append(v)
            indeg[v] += 1
        queue = deque(n for n, d in indeg.items() if d == 0)
        visited = 0
        while queue:
            u = queue.popleft()
            visited += 1
            for v in adj[u]:
                indeg[v] -= 1
                if indeg[v] == 0:
                    queue.append(v)
        if visited < len(ids):
            cyclic = sorted(n for n, d in indeg.items() if d > 0)
            errors.append(
                f"graph contains a cycle; nodes still in-degree>0 after topo sort: "
                f"{', '.join(cyclic)}"
            )

    return errors


def _available_next(ir):
    """Open nodes whose predecessors are all `done` — i.e. unblocked picks."""
    status_by_id = {str(n["id"]): n.get("status", "open") for n in ir["nodes"]}
    preds = {nid: [] for nid in status_by_id}
    for e in ir.get("edges", []):
        v = str(e["to"])
        if v in preds:
            preds[v].append(str(e["from"]))
    return {
        nid for nid, st in status_by_id.items()
        if st == "open" and all(status_by_id.get(p) == "done" for p in preds[nid])
    }


def _attrs_str(attrs):
    return ", ".join(f'{k}="{v}"' for k, v in attrs.items())


def render_dot(ir, emoji=True):
    """Emit styled DOT source for the SVG/PNG pipeline.

    emoji=True (default): prepend a status emoji to each label.
    emoji=False: append the legacy `✓` / `…` marker instead. Use when the
        target system lacks a color emoji font.
    """
    lines = [
        "digraph plan {",
        "  rankdir=TB;",
        '  bgcolor="white";',
        '  node [shape=box, style="filled,rounded", fontname="Helvetica", '
        'fontsize=12, penwidth=1.2, color="#495057", fillcolor="#ffffff"];',
        '  edge [color="#6c757d", penwidth=1.0, arrowsize=0.8];',
        "",
    ]

    available = _available_next(ir)

    for n in ir["nodes"]:
        nid = str(n["id"])
        status = n.get("status", "open")
        if status == "done":
            attrs, em_key = _STYLE_DONE, "done"
        elif status == "in_progress":
            attrs, em_key = _STYLE_IN_PROGRESS, "in_progress"
        elif nid in available:
            attrs, em_key = _STYLE_OPEN_AVAILABLE, "open_available"
        else:
            attrs, em_key = _STYLE_OPEN_BLOCKED, "open_blocked"
        if emoji:
            label_text = f'{_EMOJI[em_key]}  #{nid} {n["label"]}'
        else:
            label_text = f'#{nid} {n["label"]}{STATUS_MARKER[status]}'
        label = _dot_escape(label_text)
        lines.append(
            f'  "{_dot_escape(nid)}" [label="{label}", {_attrs_str(attrs)}];'
        )

    if ir.get("close") is not None:
        close_text = (
            f'{_EMOJI["close"]}  close #{ir["close"]}'
            if emoji else f'close #{ir["close"]}'
        )
        close_label = _dot_escape(close_text)
        lines.append(
            f'  "close" [label="{close_label}", {_attrs_str(_STYLE_CLOSE)}];'
        )
    lines.append("")
    for e in ir.get("edges", []):
        lines.append(f'  "{_dot_escape(str(e["from"]))}" -> "{_dot_escape(str(e["to"]))}";')
    lines.append("}")
    return "\n".join(lines)


def _unflatten_dot(dot_src, stagger):
    """Stagger wide ranks across multiple levels via graphviz `unflatten`.

    `unflatten -f -l N` adds invisible edges so siblings that share a
    successor (typical for many specs all flowing into CLOSE) get pushed
    onto chains up to N deep, trading height for width. Without it, a plan
    with N parallel sub-issues renders as one rank N nodes wide — readable
    at N=3 but a horizontal scroll bar by N=8.

    `stagger=0` disables. If `unflatten` is missing from PATH (older or
    stripped graphviz), fall through to the original DOT — the diagram
    still renders, just wider.
    """
    if stagger <= 0 or shutil.which("unflatten") is None:
        return dot_src
    try:
        res = subprocess.run(
            ["unflatten", "-f", "-l", str(stagger)],
            input=dot_src, capture_output=True, text=True, timeout=5,
            encoding="utf-8",
        )
    except subprocess.TimeoutExpired:
        return dot_src
    if res.returncode != 0 or not res.stdout.strip():
        return dot_src
    return res.stdout


def _dot_to_svg(ir, emoji=True, stagger=5):
    """Run `dot -Tsvg` on the styled DOT for this IR. Returns SVG source."""
    if shutil.which("dot") is None:
        sys.exit(
            "plan-dag-render requires `dot` (graphviz) on PATH. "
            "Install: apt install graphviz, or brew install graphviz."
        )
    dot_src = _unflatten_dot(render_dot(ir, emoji=emoji), stagger)
    try:
        svg_res = subprocess.run(
            ["dot", "-Tsvg"], input=dot_src,
            capture_output=True, text=True, timeout=10,
            encoding="utf-8",
        )
    except subprocess.TimeoutExpired:
        sys.exit("`dot -Tsvg` timed out after 10s.")
    if svg_res.returncode != 0:
        sys.stderr.write(svg_res.stderr)
        sys.exit(svg_res.returncode or 1)
    return svg_res.stdout


def render_png(ir, out_path, emoji=True, stagger=5):
    """Render the IR as a high-quality PNG.

    Pipeline: dot -Tsvg → headless Chromium (via Playwright) → PNG. Going
    through the browser instead of `dot -Tpng` gives sharper text and
    correct anti-aliasing at high DPI, which matters when the PNG is
    surfaced to the user as an inline chat image.
    """
    # _dot_to_svg checks dot first (the upstream tool); after that we need
    # node + Playwright for the rasterisation step.
    svg = _dot_to_svg(ir, emoji=emoji, stagger=stagger)
    if shutil.which("node") is None:
        sys.exit(
            "plan-dag-render requires Node (node ≥18) on PATH for Playwright."
        )
    script_dir = Path(__file__).resolve().parent
    svg_to_png = script_dir / "svg-to-png.mjs"
    if not svg_to_png.exists():
        sys.exit(f"plan-dag-render: missing helper {svg_to_png}")

    try:
        png_res = subprocess.run(
            ["node", str(svg_to_png), out_path],
            input=svg, capture_output=True, text=True, timeout=30,
        )
    except subprocess.TimeoutExpired:
        sys.exit("svg-to-png.mjs timed out after 30s.")
    if png_res.returncode != 0:
        sys.stderr.write(png_res.stderr)
        sys.exit(png_res.returncode or 1)
    sys.stderr.write(png_res.stderr)


def main():
    ap = argparse.ArgumentParser(
        description="Render plan DAG IR as a high-DPI PNG."
    )
    ap.add_argument("ir", help="path to JSON IR, or '-' for stdin")
    ap.add_argument(
        "--out", required=True,
        help="output PNG file path (required).",
    )
    ap.add_argument(
        "--emoji", default="on", choices=["on", "off"],
        help="emoji status indicators in node labels. on (default) shows "
             "✅ / 🟡 / 🎯 / ⬜ / 🏁 status emoji; off falls back to ✓ / … "
             "text markers. Turn off if the rendering system lacks a color "
             "emoji font and you see tofu boxes.",
    )
    ap.add_argument(
        "--stagger", type=int, default=5, metavar="N",
        help="cap the horizontal width of wide ranks by piping DOT through "
             "graphviz `unflatten -f -l N`. Siblings that share a successor "
             "get pushed onto chains up to N deep, trading height for width "
             "so the rendered PNG fits readable aspect ratios. Default 5; "
             "use 0 to disable and accept the raw `dot` layout (wider).",
    )
    args = ap.parse_args()
    if args.stagger < 0:
        ap.error("--stagger must be >= 0")

    text = sys.stdin.read() if args.ir == "-" else Path(args.ir).read_text()
    try:
        ir = json.loads(text)
    except json.JSONDecodeError as e:
        sys.exit(f"invalid JSON: {e}")

    errors = validate(ir)
    if errors:
        sys.stderr.write("IR validation failed:\n")
        for err in errors:
            sys.stderr.write(f"  - {err}\n")
        sys.exit(1)

    render_png(ir, args.out, emoji=(args.emoji == "on"), stagger=args.stagger)


if __name__ == "__main__":
    main()
