#!/usr/bin/env bash
# Golden tests for plan-dag-render. Exits non-zero on any diff or unexpected
# exit code. Suitable for CI.
#
# Required on PATH:
#   - `dot` (graphviz) — for the default (top-to-bottom box-drawing) renderer.
#                        apt install graphviz, or brew install graphviz.

set -u
cd "$(dirname "$0")/.."

if ! command -v dot >/dev/null 2>&1; then
    printf 'plan-dag-render.test: `dot` (graphviz) required on PATH.\n' >&2
    printf 'Install: apt install graphviz, or brew install graphviz.\n' >&2
    exit 2
fi

SCRIPT="scripts/plan-dag-render.py"
FIX="fixtures"
EXP="$FIX/expected"

fail=0
pass=0

assert_eq () {
    local label="$1" got_file="$2" exp_file="$3"
    if diff -u "$exp_file" "$got_file" >/dev/null; then
        pass=$((pass + 1))
        printf '  ok  %s\n' "$label"
    else
        fail=$((fail + 1))
        printf '  FAIL %s\n' "$label"
        diff -u "$exp_file" "$got_file" | sed 's/^/    /'
    fi
}

run_and_compare () {
    # $1 label, $2 fixture, $3 expected suffix (tb|ascii), $4... extra args
    local label="$1" fix="$2" suf="$3"; shift 3
    local base; base="$(basename "$fix" .json)"
    local out="$tmp/$base.$suf"
    "$SCRIPT" "$fix" "$@" > "$out" 2>"$out.err"
    local rc=$?
    if [ "$rc" -ne 0 ]; then
        fail=$((fail + 1))
        printf '  FAIL %s exited %d\n' "$label" "$rc"
        sed 's/^/    /' < "$out.err"
        return
    fi
    assert_eq "$label" "$out" "$EXP/$base.$suf"
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "happy.json"
run_and_compare "happy default (tb)"  "$FIX/happy.json" tb
run_and_compare "happy --as=ascii"    "$FIX/happy.json" ascii --as=ascii
run_and_compare "happy --as=dot (emoji on by default)" \
                                       "$FIX/happy.json" dot --as=dot
run_and_compare "happy --as=dot --emoji=off" \
                                       "$FIX/happy.json" dot.noemoji \
                                       --as=dot --emoji=off

echo "wide.json"
run_and_compare "wide default (tb)"   "$FIX/wide.json"  tb
run_and_compare "wide --as=ascii"     "$FIX/wide.json"  ascii --as=ascii

echo "styled DOT structural checks"
# Available-next: #304 is open, only pred (#288) is done → highlighted in blue.
"$SCRIPT" "$FIX/happy.json" --as=dot > "$tmp/happy.dot" 2>/dev/null
if grep -q '"304"\s*\[.*fillcolor="#cfe2ff"' "$tmp/happy.dot"; then
    pass=$((pass + 1))
    printf '  ok  available-next (#304) gets blue highlight\n'
else
    fail=$((fail + 1))
    printf '  FAIL #304 missing available-next highlight\n'
fi
# #306 is open but blocked (preds #304/#305 not done) → dashed muted style.
if grep -q '"306"\s*\[.*style="filled,rounded,dashed"' "$tmp/happy.dot"; then
    pass=$((pass + 1))
    printf '  ok  blocked-open (#306) gets dashed style\n'
else
    fail=$((fail + 1))
    printf '  FAIL #306 missing dashed blocked-open style\n'
fi
# Close sentinel gets a double border.
if grep -q '"close"\s*\[.*peripheries="2"' "$tmp/happy.dot"; then
    pass=$((pass + 1))
    printf '  ok  close sentinel gets double border\n'
else
    fail=$((fail + 1))
    printf '  FAIL close sentinel missing peripheries="2"\n'
fi
# Edges stay uniform — no penwidth bolding on the declared critical_path.
# (We test by counting how many edge lines carry an explicit penwidth.)
crit_edges=$(grep -E '"[^"]+"\s*->\s*"[^"]+"\s*\[' "$tmp/happy.dot" | grep -c 'penwidth' || true)
if [ "$crit_edges" -eq 0 ]; then
    pass=$((pass + 1))
    printf '  ok  no critical-path edge bolding (subjective; footer-only)\n'
else
    fail=$((fail + 1))
    printf '  FAIL %d edges carry explicit penwidth (expected 0)\n' "$crit_edges"
fi
# --emoji=off strips emoji from labels but keeps the ✓/… markers.
"$SCRIPT" "$FIX/happy.json" --as=dot --emoji=off > "$tmp/happy.dot.off" 2>/dev/null
if grep -q '✅\|🟡\|⬜\|🎯\|🏁' "$tmp/happy.dot.off"; then
    fail=$((fail + 1))
    printf '  FAIL --emoji=off leaked emoji into output\n'
else
    pass=$((pass + 1))
    printf '  ok  --emoji=off strips emoji\n'
fi
if grep -q '#288 MCP ✓' "$tmp/happy.dot.off"; then
    pass=$((pass + 1))
    printf '  ok  --emoji=off retains text markers\n'
else
    fail=$((fail + 1))
    printf '  FAIL --emoji=off missing text marker\n'
fi
# --emoji=on with default (tb) target must NOT affect tb output — the layout
# math assumes single-width chars. The flag is silently inert for tb/ascii.
"$SCRIPT" "$FIX/happy.json" --emoji=on > "$tmp/happy.tb.emoji-on" 2>/dev/null
if diff -u "$EXP/happy.tb" "$tmp/happy.tb.emoji-on" >/dev/null; then
    pass=$((pass + 1))
    printf '  ok  --emoji=on does not affect default (tb) output\n'
else
    fail=$((fail + 1))
    printf '  FAIL --emoji=on altered tb output\n'
fi

echo "bad.json (must fail validation)"
"$SCRIPT" "$FIX/bad.json" > "$tmp/bad.out" 2>"$tmp/bad.err"
rc=$?
if [ "$rc" -ne 1 ]; then
    fail=$((fail + 1))
    printf '  FAIL bad expected exit 1, got %d\n' "$rc"
else
    pass=$((pass + 1))
    printf '  ok  bad exit 1\n'
fi
for token in 'duplicate node id' 'invalid status' 'missing label' \
             'not in declared nodes' 'missing source' 'not in [' \
             'must be an object' 'forbidden character' \
             'reserved for the synthetic CLOSE' 'ir.close is missing' \
             'critical_path[1]'; do
    if grep -qF "$token" "$tmp/bad.err"; then
        pass=$((pass + 1))
        printf '  ok  bad stderr contains: %s\n' "$token"
    else
        fail=$((fail + 1))
        printf '  FAIL bad stderr missing: %s\n' "$token"
    fi
done

echo "cycle.json (must fail validation with a cycle error)"
"$SCRIPT" "$FIX/cycle.json" > "$tmp/cycle.out" 2>"$tmp/cycle.err"
rc=$?
if [ "$rc" -ne 1 ]; then
    fail=$((fail + 1))
    printf '  FAIL cycle expected exit 1, got %d\n' "$rc"
else
    pass=$((pass + 1))
    printf '  ok  cycle exit 1\n'
fi
if grep -qF 'contains a cycle' "$tmp/cycle.err"; then
    pass=$((pass + 1))
    printf '  ok  cycle stderr contains: contains a cycle\n'
else
    fail=$((fail + 1))
    printf '  FAIL cycle stderr missing: contains a cycle\n'
fi

echo "stdin mode"
for tgt in tb ascii; do
    if [ "$tgt" = "tb" ]; then
        cat "$FIX/happy.json" | "$SCRIPT" - > "$tmp/stdin.$tgt" 2>/dev/null
    else
        cat "$FIX/happy.json" | "$SCRIPT" - --as="$tgt" > "$tmp/stdin.$tgt" 2>/dev/null
    fi
    rc=$?
    if [ "$rc" -ne 0 ]; then
        fail=$((fail + 1))
        printf '  FAIL stdin %s exited %d\n' "$tgt" "$rc"
        continue
    fi
    assert_eq "stdin $tgt matches file-arg" "$tmp/stdin.$tgt" "$EXP/happy.$tgt"
done

echo "--as=svg smoke"
"$SCRIPT" "$FIX/happy.json" --as=svg > "$tmp/happy.svg" 2>"$tmp/happy.svg.err"
rc=$?
if [ "$rc" -ne 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg exited %d\n' "$rc"
    sed 's/^/    /' < "$tmp/happy.svg.err"
elif ! grep -q '<svg ' "$tmp/happy.svg"; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg output missing <svg> root\n'
elif ! grep -q '</svg>' "$tmp/happy.svg"; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg output missing </svg> close\n'
elif ! grep -q '#d4edda' "$tmp/happy.svg"; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg missing done-state fill (#d4edda)\n'
elif ! grep -q '#cfe2ff' "$tmp/happy.svg"; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg missing available-next fill (#cfe2ff)\n'
elif ! grep -q '✅' "$tmp/happy.svg"; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg missing emoji (auto-on for SVG)\n'
else
    pass=$((pass + 1))
    printf '  ok  --as=svg emits styled SVG with status fills + emoji\n'
fi
# --as=svg strips the XML prolog (and everything before the `<svg` tag,
# including graphviz's generator comment) so the output is inline-paste-
# safe — it must not start with `<?xml` or `<!DOCTYPE`.
if grep -qE '^(<\?xml|<!DOCTYPE)' "$tmp/happy.svg"; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg still contains XML prolog / DOCTYPE (should be stripped for inline use)\n'
else
    pass=$((pass + 1))
    printf '  ok  --as=svg strips XML prolog / DOCTYPE (inline-safe)\n'
fi
# --as=svg --out writes to a file.
"$SCRIPT" "$FIX/happy.json" --as=svg --out "$tmp/happy.out.svg" >/dev/null 2>&1
if [ -s "$tmp/happy.out.svg" ] && grep -q '<svg ' "$tmp/happy.out.svg"; then
    pass=$((pass + 1))
    printf '  ok  --as=svg --out writes to file\n'
else
    fail=$((fail + 1))
    printf '  FAIL --as=svg --out did not write a valid SVG\n'
fi
# --as=svg --emoji=off strips emoji.
"$SCRIPT" "$FIX/happy.json" --as=svg --emoji=off > "$tmp/happy.svg.off" 2>/dev/null
if grep -q '✅\|🟡\|⬜\|🎯\|🏁' "$tmp/happy.svg.off"; then
    fail=$((fail + 1))
    printf '  FAIL --as=svg --emoji=off leaked emoji\n'
else
    pass=$((pass + 1))
    printf '  ok  --as=svg --emoji=off strips emoji\n'
fi

echo "--as=html smoke"
"$SCRIPT" "$FIX/happy.json" --as=html > "$tmp/happy.html" 2>"$tmp/happy.html.err"
rc=$?
if [ "$rc" -ne 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL --as=html exited %d\n' "$rc"
    sed 's/^/    /' < "$tmp/happy.html.err"
else
    html_ok=1
    for token in '<!DOCTYPE html>' '<title>plan-dag — close #300</title>' \
                 'name="viewport"' \
                 'class="dag"' '<svg ' '</svg>' \
                 'Critical path:' '#301 → #305 → #306 → #307 → close' \
                 '@media (prefers-color-scheme: dark)'; do
        if ! grep -qF -- "$token" "$tmp/happy.html"; then
            fail=$((fail + 1))
            printf '  FAIL --as=html missing token: %s\n' "$token"
            html_ok=0
        fi
    done
    if [ "$html_ok" -eq 1 ]; then
        pass=$((pass + 1))
        printf '  ok  --as=html emits self-contained page with critical-path footer\n'
    fi
    # Legend is intentionally not part of the HTML output — assert it stays gone.
    if grep -qE 'class="legend"|>blocked<|>in-progress<|>available next<' "$tmp/happy.html"; then
        fail=$((fail + 1))
        printf '  FAIL --as=html unexpectedly emitted legend markup\n'
    else
        pass=$((pass + 1))
        printf '  ok  --as=html omits legend (status colors + emoji are self-explanatory)\n'
    fi
fi
# --as=html --out writes to a file.
"$SCRIPT" "$FIX/happy.json" --as=html --out "$tmp/happy.out.html" >/dev/null 2>&1
if [ -s "$tmp/happy.out.html" ] && grep -q '<!DOCTYPE html>' "$tmp/happy.out.html"; then
    pass=$((pass + 1))
    printf '  ok  --as=html --out writes to file\n'
else
    fail=$((fail + 1))
    printf '  FAIL --as=html --out did not write valid HTML\n'
fi
# A graph without a `close` sentinel drops the " — close #N" title suffix
# and the footer disappears when no critical_path is declared.
closeless_ir='{"nodes":[{"id":"1","label":"a","status":"done"},{"id":"2","label":"b","status":"open"}],"edges":[{"from":"1","to":"2","source":"depends-on"}]}'
echo "$closeless_ir" | "$SCRIPT" - --as=html > "$tmp/closeless.html" 2>/dev/null
if grep -q '<title>plan-dag</title>' "$tmp/closeless.html"; then
    pass=$((pass + 1))
    printf '  ok  --as=html omits close suffix when ir.close is unset\n'
else
    fail=$((fail + 1))
    printf '  FAIL --as=html title for closeless IR (got: %s)\n' \
        "$(grep -o '<title>[^<]*</title>' "$tmp/closeless.html" | head -1)"
fi
if grep -q 'Critical path:' "$tmp/closeless.html"; then
    fail=$((fail + 1))
    printf '  FAIL --as=html emitted footer with no critical_path\n'
else
    pass=$((pass + 1))
    printf '  ok  --as=html omits footer when no critical_path declared\n'
fi
echo "--as=dot --out smoke"
"$SCRIPT" "$FIX/happy.json" --as=dot --out "$tmp/happy.out.dot" >/dev/null 2>&1
if [ -s "$tmp/happy.out.dot" ] && grep -q '^digraph plan' "$tmp/happy.out.dot"; then
    pass=$((pass + 1))
    printf '  ok  --as=dot --out writes to file\n'
else
    fail=$((fail + 1))
    printf '  FAIL --as=dot --out did not write valid DOT to file\n'
fi

echo "--as=png smoke (skipped without node + Playwright Chromium)"
# Skip markers — any of these in the helper's stderr means the local env is
# missing a Playwright/Chromium piece and the test should be skipped rather
# than fail loudly.
png_skip_re='cannot load Playwright|Executable doesn.t exist|browserType\.launch|playwright install'
if command -v node >/dev/null 2>&1; then
    png_out="$tmp/happy.png"
    "$SCRIPT" "$FIX/happy.json" --as=png --out "$png_out" >"$tmp/png.out" 2>"$tmp/png.err"
    rc=$?
    if [ "$rc" -ne 0 ]; then
        if grep -qE "$png_skip_re" "$tmp/png.err"; then
            printf '  skip --as=png (Playwright/Chromium not available)\n'
        else
            fail=$((fail + 1))
            printf '  FAIL --as=png exited %d\n' "$rc"
            sed 's/^/    /' < "$tmp/png.err"
        fi
    elif [ ! -s "$png_out" ]; then
        fail=$((fail + 1))
        printf '  FAIL --as=png produced empty output\n'
    elif ! file "$png_out" 2>/dev/null | grep -q 'PNG image'; then
        fail=$((fail + 1))
        printf '  FAIL --as=png output is not a PNG (file: %s)\n' \
            "$(file "$png_out" 2>/dev/null || echo unknown)"
    else
        pass=$((pass + 1))
        printf '  ok  --as=png produced a PNG\n'
    fi

    # Also confirm --as=png errors clearly when --out is missing.
    "$SCRIPT" "$FIX/happy.json" --as=png >"$tmp/png-noout.out" 2>"$tmp/png-noout.err"
    rc=$?
    if [ "$rc" -eq 0 ]; then
        fail=$((fail + 1))
        printf '  FAIL --as=png without --out should fail, got 0\n'
    elif ! grep -q 'requires --out' "$tmp/png-noout.err"; then
        fail=$((fail + 1))
        printf '  FAIL --as=png without --out: stderr missing guidance\n'
    else
        pass=$((pass + 1))
        printf '  ok  --as=png without --out fails with guidance\n'
    fi
else
    printf '  skip --as=png (node not on PATH)\n'
fi

echo "auto-fallback (dot not on PATH → --as=ascii)"
py3="$(command -v python3)"
PATH="" "$py3" "$SCRIPT" "$FIX/happy.json" > "$tmp/fallback.out" 2>"$tmp/fallback.err"
rc=$?
if [ "$rc" -ne 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL fallback exited %d\n' "$rc"
    sed 's/^/    /' < "$tmp/fallback.err"
elif ! grep -q 'falling back to --as=ascii' "$tmp/fallback.err"; then
    fail=$((fail + 1))
    printf '  FAIL fallback: stderr missing fallback note\n'
    sed 's/^/    /' < "$tmp/fallback.err"
else
    pass=$((pass + 1))
    printf '  ok  fallback emits stderr note\n'
    assert_eq "fallback output matches --as=ascii golden" "$tmp/fallback.out" "$EXP/happy.ascii"
fi

echo
printf 'plan-dag-render.test: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
