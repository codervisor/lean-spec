#!/usr/bin/env python3
"""plan-dag-render — JSON DAG IR → graphviz box-drawing / raw ASCII tree / DOT / SVG / HTML / PNG."""

import argparse
import json
import math
import shlex
import shutil
import subprocess
import sys
from collections import deque
from html import escape as html_escape
from pathlib import Path

STATUS_MARKER = {"done": " ✓", "in_progress": " …", "open": ""}
STATUS_WORD = {"done": "done", "in_progress": "wip", "open": "open"}
VALID_STATUS = set(STATUS_MARKER.keys())
VALID_SOURCES = {"sub-issue", "depends-on", "pr-link", "closes", "part-of"}
FORBIDDEN_LABEL_CHARS = ('"', "\\", "[", "]", "\n", "\r")

# Styled-DOT visual vocabulary. Fills encode status; an additional "available
# next" highlight is computed from the graph (open + all preds done). Used by
# --as=dot and --as=png only — text/ascii paths stay glyph-only because the
# layout math counts characters, not visual columns.
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
    if close is not None and not isinstance(close, (str, int)):
        errors.append(
            f"ir.close must be a string or int, got {type(close).__name__}"
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
    """Open nodes whose predecessors are all `done` — i.e. unblocked picks.

    Used by the styled DOT path to highlight the next pickable node(s).
    The close sentinel is excluded; it isn't a pickable task.
    """
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


def render_dot(ir, rankdir="TB", extra_graph_attrs=(), styled=False, emoji=False):
    """Emit DOT source.

    styled=False: plain boxes with `✓`/`…` status markers — keeps the
        `dot -Tplain` geometry that render_tb_boxart parses, and matches
        the existing tb/ascii golden output.
    styled=True: status fills, available-next highlight, double-bordered
        close sentinel. Used by --as=dot and --as=png.
    emoji=True (only meaningful with styled=True): prepend a status emoji
        to each label and drop the `✓`/`…` marker. Requires a color emoji
        font on the rendering system.
    """
    lines = ["digraph plan {", f"  rankdir={rankdir};"]
    for attr in extra_graph_attrs:
        lines.append(f"  {attr};")
    if styled:
        lines += [
            '  bgcolor="white";',
            '  node [shape=box, style="filled,rounded", fontname="Helvetica", '
            'fontsize=12, penwidth=1.2, color="#495057", fillcolor="#ffffff"];',
            '  edge [color="#6c757d", penwidth=1.0, arrowsize=0.8];',
            "",
        ]
    else:
        lines += ["  node [shape=box];", ""]

    available = _available_next(ir) if styled else set()

    for n in ir["nodes"]:
        nid = str(n["id"])
        status = n.get("status", "open")
        if styled:
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
        else:
            label = _dot_escape(f'#{nid} {n["label"]}{STATUS_MARKER[status]}')
            lines.append(f'  "{_dot_escape(nid)}" [label="{label}"];')

    if ir.get("close"):
        if styled:
            close_text = (
                f'{_EMOJI["close"]}  close #{ir["close"]}'
                if emoji else f'close #{ir["close"]}'
            )
            close_label = _dot_escape(close_text)
            lines.append(
                f'  "close" [label="{close_label}", {_attrs_str(_STYLE_CLOSE)}];'
            )
        else:
            close_label = _dot_escape(f'close #{ir["close"]}')
            lines.append(f'  "close" [label="{close_label}"];')
    lines.append("")
    for e in ir.get("edges", []):
        lines.append(f'  "{_dot_escape(str(e["from"]))}" -> "{_dot_escape(str(e["to"]))}";')
    lines.append("}")
    return "\n".join(lines)


def render_dot_ortho(ir):
    """Like render_dot but with rectilinear edge routing for grid rendering."""
    return render_dot(ir, extra_graph_attrs=("splines=ortho",))


_TB_XS = 14.0
_TB_YS = 5.0
_TB_N, _TB_S, _TB_E, _TB_W = 1, 2, 4, 8
_TB_GLYPHS = {
    _TB_N | _TB_S: "│", _TB_E | _TB_W: "─",
    _TB_N | _TB_E: "└", _TB_N | _TB_W: "┘",
    _TB_S | _TB_E: "┌", _TB_S | _TB_W: "┐",
    _TB_N | _TB_S | _TB_E: "├", _TB_N | _TB_S | _TB_W: "┤",
    _TB_N | _TB_E | _TB_W: "┴", _TB_S | _TB_E | _TB_W: "┬",
    _TB_N | _TB_S | _TB_E | _TB_W: "┼",
    _TB_N: "│", _TB_S: "│", _TB_E: "─", _TB_W: "─",
}


def _parse_plain(text):
    g = {"w": 0.0, "h": 0.0, "nodes": [], "edges": []}
    for line in text.splitlines():
        toks = shlex.split(line)
        if not toks:
            continue
        if toks[0] == "graph":
            g["w"], g["h"] = float(toks[2]), float(toks[3])
        elif toks[0] == "node":
            g["nodes"].append({
                "id": toks[1],
                "cx": float(toks[2]), "cy": float(toks[3]),
                "w": float(toks[4]), "h": float(toks[5]),
                "label": toks[6],
            })
        elif toks[0] == "edge":
            n = int(toks[3])
            pts = [(float(toks[4 + 2 * i]), float(toks[5 + 2 * i])) for i in range(n)]
            g["edges"].append({"from": toks[1], "to": toks[2], "pts": pts})
    return g


def _dedupe(seq):
    out = []
    for p in seq:
        if not out or out[-1] != p:
            out.append(p)
    return out


def render_tb_boxart(ir):
    """Render the IR as a top-to-bottom box-drawing DAG via real graphviz layout."""
    dot = render_dot_ortho(ir)
    try:
        res = subprocess.run(
            ["dot", "-Tplain"], input=dot,
            capture_output=True, text=True, timeout=10,
        )
    except subprocess.TimeoutExpired:
        sys.exit("`dot -Tplain` timed out after 10s. Try a smaller IR, or --as=ascii.")
    if res.returncode != 0:
        sys.stderr.write(res.stderr)
        sys.exit(res.returncode)
    g = _parse_plain(res.stdout)

    Wt = int(math.ceil(g["w"] * _TB_XS)) + 4
    Ht = int(math.ceil(g["h"] * _TB_YS)) + 2

    def px(x): return int(round(x * _TB_XS)) + 2
    def py(y): return int(round((g["h"] - y) * _TB_YS)) + 1

    canvas = [[None] * Wt for _ in range(Ht)]
    edge_dirs = [[0] * Wt for _ in range(Ht)]
    arrows = {}

    boxes = {}
    for n in g["nodes"]:
        cx, cy = px(n["cx"]), py(n["cy"])
        bw = max(len(n["label"]) + 4, int(round(n["w"] * _TB_XS)))
        if (bw - len(n["label"])) % 2:
            bw += 1
        left = cx - bw // 2
        right = left + bw - 1
        top, bot = cy - 1, cy + 1
        boxes[n["id"]] = (top, left, bot, right)
        canvas[top][left] = "┌"
        canvas[top][right] = "┐"
        canvas[bot][left] = "└"
        canvas[bot][right] = "┘"
        for c in range(left + 1, right):
            canvas[top][c] = "─"
            canvas[bot][c] = "─"
        canvas[cy][left] = "│"
        canvas[cy][right] = "│"
        label = n["label"]
        lpad = (bw - 2 - len(label)) // 2
        for i, ch in enumerate(label):
            canvas[cy][left + 1 + lpad + i] = ch

    def is_box_cell(r, c):
        return 0 <= r < Ht and 0 <= c < Wt and canvas[r][c] is not None

    def add(r, c, bit):
        if 0 <= r < Ht and 0 <= c < Wt and canvas[r][c] is None:
            edge_dirs[r][c] |= bit

    for e in g["edges"]:
        pts = _dedupe(e["pts"])
        if len(pts) < 2:
            continue
        grid_pts = _dedupe([(py(y), px(x)) for x, y in pts])
        if len(grid_pts) < 2:
            continue
        for i in range(len(grid_pts) - 1):
            r1, c1 = grid_pts[i]
            r2, c2 = grid_pts[i + 1]
            if r1 == r2:
                lo, hi = sorted([c1, c2])
                for c in range(lo, hi + 1):
                    if c > lo:
                        add(r1, c, _TB_W)
                    if c < hi:
                        add(r1, c, _TB_E)
            elif c1 == c2:
                lo, hi = sorted([r1, r2])
                for r in range(lo, hi + 1):
                    if r > lo:
                        add(r, c1, _TB_N)
                    if r < hi:
                        add(r, c1, _TB_S)

        head_top, head_left, head_bot, head_right = boxes[e["to"]]
        last_r, last_c = grid_pts[-1]
        arrow = arrow_r = arrow_c = mask_bit = None
        if last_r < head_top:
            arrow, arrow_r = "▼", head_top - 1
            arrow_c = max(head_left + 1, min(head_right - 1, last_c))
            for r in range(last_r, arrow_r):
                add(r, last_c, _TB_S); add(r + 1, last_c, _TB_N)
            mask_bit = _TB_S
        elif last_r > head_bot:
            arrow, arrow_r = "▲", head_bot + 1
            arrow_c = max(head_left + 1, min(head_right - 1, last_c))
            for r in range(arrow_r, last_r):
                add(r, last_c, _TB_S); add(r + 1, last_c, _TB_N)
            mask_bit = _TB_N
        elif last_c < head_left:
            arrow, arrow_c = "►", head_left - 1
            arrow_r = max(head_top + 1, min(head_bot - 1, last_r))
            for c in range(last_c, arrow_c):
                add(last_r, c, _TB_E); add(last_r, c + 1, _TB_W)
            mask_bit = _TB_E
        elif last_c > head_right:
            arrow, arrow_c = "◄", head_right + 1
            arrow_r = max(head_top + 1, min(head_bot - 1, last_r))
            for c in range(arrow_c, last_c):
                add(last_r, c, _TB_E); add(last_r, c + 1, _TB_W)
            mask_bit = _TB_W
        if arrow and 0 <= arrow_r < Ht and 0 <= arrow_c < Wt and not is_box_cell(arrow_r, arrow_c):
            arrows[(arrow_r, arrow_c)] = arrow
            edge_dirs[arrow_r][arrow_c] |= mask_bit

    for r in range(Ht):
        for c in range(Wt):
            if canvas[r][c] is not None:
                continue
            if (r, c) in arrows:
                canvas[r][c] = arrows[(r, c)]
            elif edge_dirs[r][c]:
                canvas[r][c] = _TB_GLYPHS.get(edge_dirs[r][c], "·")

    return "\n".join(
        "".join(ch if ch is not None else " " for ch in row).rstrip()
        for row in canvas
    )


def render_ascii(ir):
    """Render the IR as a pure-ASCII indented tree plus cross-edges and critical path.

    Tree shape: each non-root node hangs off the predecessor that lies on its longest
    path. Remaining edges are listed under `Cross-edges:`. Critical path printed last.
    """
    nodes_by_id = {str(n["id"]): n for n in ir["nodes"]}
    node_order = [str(n["id"]) for n in ir["nodes"]]
    close_id = ir.get("close")
    has_close = close_id is not None

    all_ids = list(node_order)
    if has_close:
        all_ids.append("close")
    id_pos = {nid: i for i, nid in enumerate(all_ids)}

    raw_edges = [(str(e["from"]), str(e["to"]), e["source"]) for e in ir.get("edges", [])]

    successors = {nid: [] for nid in all_ids}
    predecessors = {nid: [] for nid in all_ids}
    for u, v, _ in raw_edges:
        successors[u].append(v)
        predecessors[v].append(u)

    indeg = {nid: len(predecessors[nid]) for nid in all_ids}
    queue = deque(nid for nid in all_ids if indeg[nid] == 0)
    topo = []
    seen = set()
    while queue:
        u = queue.popleft()
        if u in seen:
            continue
        seen.add(u)
        topo.append(u)
        for v in successors[u]:
            indeg[v] -= 1
            if indeg[v] == 0:
                queue.append(v)
    for nid in all_ids:
        if nid not in seen:
            topo.append(nid)

    depth = {nid: 0 for nid in all_ids}
    for u in topo:
        for v in successors[u]:
            if depth[u] + 1 > depth[v]:
                depth[v] = depth[u] + 1

    cp = ir.get("critical_path") or []
    cp_strs = [str(x) for x in cp]
    cp_pairs = set(zip(cp_strs[:-1], cp_strs[1:]))
    cp_nodes = set(cp_strs)

    # Parent selection: max depth wins; tie-break by critical-path membership,
    # then by declaration order. This keeps the critical chain as the tree spine.
    parent = {}
    for nid in all_ids:
        if not predecessors[nid]:
            continue
        parent[nid] = min(
            predecessors[nid],
            key=lambda p: (-depth[p], 0 if (p, nid) in cp_pairs else 1, id_pos[p]),
        )

    tree_edges = {(par, child) for child, par in parent.items()}
    cross_edges = [(u, v, src) for u, v, src in raw_edges if (u, v) not in tree_edges]

    tree_children = {nid: [] for nid in all_ids}
    for par, child in tree_edges:
        tree_children[par].append(child)
    for nid in tree_children:
        tree_children[nid].sort(
            key=lambda c: (0 if (nid, c) in cp_pairs else 1, -depth[c], id_pos[c]),
        )

    roots = sorted(
        (nid for nid in all_ids if not predecessors[nid]),
        key=lambda r: (0 if r in cp_nodes else 1, id_pos[r]),
    )

    def fmt(nid):
        if nid == "close":
            return f"close #{close_id}"
        n = nodes_by_id[nid]
        return f"#{nid} {n['label']} [{STATUS_WORD[n.get('status', 'open')]}]"

    def walk(nid, level, acc):
        if level == 0:
            acc.append(fmt(nid))
        else:
            acc.append(f"{'     ' * (level - 1)}  +- {fmt(nid)}")
        for child in tree_children[nid]:
            walk(child, level + 1, acc)

    chunks = []
    for root in roots:
        acc = []
        walk(root, 0, acc)
        chunks.append("\n".join(acc))
    out = "\n\n".join(chunks)

    if cross_edges:
        ce_lines = ["Cross-edges:"]
        for u, v, src in cross_edges:
            ulab = "close" if u == "close" else f"#{u}"
            vlab = "close" if v == "close" else f"#{v}"
            ce_lines.append(f"  {ulab} -> {vlab} ({src})")
        out += "\n\n" + "\n".join(ce_lines)

    if cp_strs:
        path = " -> ".join("close" if n == "close" else f"#{n}" for n in cp_strs)
        out += f"\n\nCritical path: {path}"

    return out


def _dot_to_svg(ir, emoji=True):
    """Run `dot -Tsvg` on the styled DOT for this IR. Returns SVG source.

    Shared by --as=svg, --as=html, and --as=png.
    """
    if shutil.which("dot") is None:
        sys.exit(
            "SVG / HTML / PNG targets require `dot` (graphviz) on PATH. "
            "Install: apt install graphviz, or brew install graphviz."
        )
    dot_src = render_dot(ir, styled=True, emoji=emoji)
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


def render_svg(ir, emoji=True):
    """Render the IR as inline SVG: graphviz output with the XML decl +
    DOCTYPE stripped, so the result pastes cleanly into HTML / markdown /
    GitHub without producing invalid markup. Scalable, embeddable, a few KB.
    """
    return _strip_svg_prolog(_dot_to_svg(ir, emoji=emoji))


_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
    margin: 2rem auto; max-width: 900px; padding: 0 1rem;
    background: #ffffff; color: #212529;
  }}
  h1 {{ font-size: 1.1rem; font-weight: 600; margin: 0 0 1rem; color: #495057; }}
  .dag {{ border: 1px solid #dee2e6; border-radius: 6px; padding: 1rem; background: #ffffff; }}
  .dag svg {{ max-width: 100%; height: auto; display: block; margin: 0 auto; }}
  .cp {{ font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
         font-size: 0.85rem; color: #495057; margin-top: 1rem; }}
  .cp b {{ color: #212529; }}
  /* Dark mode. Status tile fills stay bright enough on the dark card that
     graphviz's default-black tile text remains readable, so we only swap
     page chrome, the card bg, the SVG's white background polygon, and the
     muted-grey edge lines (which would otherwise vanish on dark). */
  @media (prefers-color-scheme: dark) {{
    body {{ background: #1a1a1a; color: #e9ecef; }}
    h1 {{ color: #adb5bd; }}
    .dag {{ background: #2a2a2a; border-color: #404040; }}
    .dag svg polygon[fill="white"] {{ fill: transparent; }}
    .dag svg path[stroke="#6c757d"] {{ stroke: #adb5bd; }}
    .dag svg polygon[fill="#6c757d"] {{ fill: #adb5bd; stroke: #adb5bd; }}
    .cp {{ color: #adb5bd; }}
    .cp b {{ color: #e9ecef; }}
  }}
</style>
</head>
<body>
<h1>{heading}</h1>
<div class="dag">
{svg}</div>
{footer}</body>
</html>
"""


def _strip_svg_prolog(svg):
    """Drop the XML decl + DOCTYPE so the SVG embeds cleanly under HTML5."""
    start = svg.find("<svg")
    return svg[start:] if start > 0 else svg


def render_html(ir, emoji=True):
    """Render the IR as a self-contained HTML page wrapping the inline SVG.

    Adds: legend (only states present in the graph), critical-path footer
    if `ir.critical_path` is set, max-width centering, and responsive
    `svg { max-width: 100% }` so it scales to the viewport.
    """
    svg = _strip_svg_prolog(_dot_to_svg(ir, emoji=emoji))

    close_id = ir.get("close")
    if close_id is not None:
        title_text = f"plan-dag — close #{close_id}"
    else:
        title_text = "plan-dag"
    title = html_escape(title_text)

    cp = ir.get("critical_path")
    if cp:
        path = " → ".join(
            "close" if str(n) == "close" else f"#{n}" for n in cp
        )
        footer = f'<p class="cp"><b>Critical path:</b> {html_escape(path)}</p>\n'
    else:
        footer = ""

    return _HTML_TEMPLATE.format(
        title=title, heading=title, svg=svg, footer=footer,
    )


def render_png(ir, out_path, emoji=True):
    """Render the IR as a high-quality PNG.

    Pipeline: dot -Tsvg → headless Chromium (via Playwright) → PNG. Going
    through the browser instead of `dot -Tpng` gives sharper text and
    correct anti-aliasing at high DPI, which matters when the PNG is
    surfaced to the user as an inline chat image.
    """
    if shutil.which("node") is None:
        sys.exit(
            "--as=png requires Node (node ≥18) on PATH for Playwright."
        )
    script_dir = Path(__file__).resolve().parent
    svg_to_png = script_dir / "svg-to-png.mjs"
    if not svg_to_png.exists():
        sys.exit(f"--as=png: missing helper {svg_to_png}")

    svg = _dot_to_svg(ir, emoji=emoji)
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
    ap = argparse.ArgumentParser(description="Render plan DAG IR.")
    ap.add_argument("ir", help="path to JSON IR, or '-' for stdin")
    ap.add_argument(
        "--as", dest="target", default=None,
        choices=["ascii", "dot", "svg", "html", "png"],
        help="output target. Default: top-to-bottom box-drawing via graphviz "
             "(requires `dot`; auto-falls back to --as=ascii when missing). "
             "--as=svg: styled inline SVG (requires `dot`; stdout by default, "
             "or --out <path>). "
             "--as=html: standalone HTML page wrapping the SVG with a legend "
             "and critical-path footer (requires `dot`; stdout by default, "
             "or --out <path>). "
             "--as=png: high-quality PNG via graphviz SVG + headless "
             "Chromium (requires `dot`, `node`, and Playwright Chromium; "
             "--out is required). "
             "--as=ascii: pure-ASCII tree, no external deps. "
             "--as=dot: raw DOT source.",
    )
    ap.add_argument(
        "--out", default=None,
        help="output file path. Required for --as=png; optional for "
             "--as=dot / --as=svg / --as=html (default stdout); "
             "ignored for the default box-drawing and --as=ascii targets.",
    )
    ap.add_argument(
        "--emoji", default="auto", choices=["auto", "on", "off"],
        help="emoji status indicators in node labels. auto (default): on for "
             "--as=dot, --as=svg, --as=html, and --as=png; off for "
             "text/ascii (whose layout math assumes single-width "
             "characters). on/off forces it. Emoji requires a color emoji "
             "font on the rendering system; turn off if you see tofu boxes.",
    )
    args = ap.parse_args()

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

    target = args.target
    if target is None:
        if shutil.which("dot") is None:
            sys.stderr.write(
                "plan-dag-render: `dot` not on PATH; falling back to --as=ascii. "
                "Install graphviz for the default box-drawing renderer.\n"
            )
            target = "ascii"

    # Emoji policy: on for styled / image-producing targets (dot/svg/html/png),
    # off for text-producing targets (tb/ascii) whose layout math assumes
    # single-width characters. `on` / `off` forces it either way.
    if args.emoji == "on":
        emoji_on = True
    elif args.emoji == "off":
        emoji_on = False
    else:
        emoji_on = target in ("dot", "svg", "html", "png")

    def _emit(text):
        # Force UTF-8 on file writes so non-UTF-8 locales don't either
        # corrupt the output (the HTML/SVG advertise UTF-8 and contain
        # emoji + box-drawing glyphs) or raise UnicodeEncodeError.
        if args.out:
            Path(args.out).write_text(text, encoding="utf-8")
        else:
            print(text)

    if target == "dot":
        _emit(render_dot(ir, styled=True, emoji=emoji_on))
    elif target == "ascii":
        print(render_ascii(ir))
    elif target == "svg":
        _emit(render_svg(ir, emoji=emoji_on))
    elif target == "html":
        _emit(render_html(ir, emoji=emoji_on))
    elif target == "png":
        if not args.out:
            sys.exit("--as=png requires --out <path>")
        render_png(ir, args.out, emoji=emoji_on)
    else:
        print(render_tb_boxart(ir))
        cp = ir.get("critical_path")
        if cp:
            path = " → ".join("close" if str(n) == "close" else f"#{n}" for n in cp)
            print(f"\nCritical path: {path}")


if __name__ == "__main__":
    main()
