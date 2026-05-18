#!/usr/bin/env bash
# Tests for plan-dag-render. Exits non-zero on any failure or unexpected
# exit code. Suitable for CI.
#
# Required on PATH:
#   - `dot` (graphviz) — for the SVG pipeline that feeds the PNG rasteriser.
#                        apt install graphviz, or brew install graphviz.
#   - `node` (≥18) + Playwright Chromium — for the PNG rasteriser itself.
#                        npm i -g playwright && npx playwright install chromium.
#
# If `node` / Playwright are missing, the PNG smoke test is skipped (not
# failed) so the validator tests still run in restricted CI environments.

set -u
cd "$(dirname "$0")/.."

if ! command -v dot >/dev/null 2>&1; then
    printf 'plan-dag-render.test: `dot` (graphviz) required on PATH.\n' >&2
    printf 'Install: apt install graphviz, or brew install graphviz.\n' >&2
    exit 2
fi

SCRIPT="scripts/plan-dag-render.py"
FIX="fixtures"

fail=0
pass=0

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "happy.json — PNG smoke"
# Skip markers — any of these in the helper's stderr means the local env is
# missing a Playwright/Chromium piece and the test should be skipped rather
# than fail loudly.
png_skip_re='cannot load Playwright|Executable doesn.t exist|browserType\.launch|playwright install'
if command -v node >/dev/null 2>&1; then
    png_out="$tmp/happy.png"
    "$SCRIPT" "$FIX/happy.json" --out "$png_out" >"$tmp/png.out" 2>"$tmp/png.err"
    rc=$?
    if [ "$rc" -ne 0 ]; then
        if grep -qE "$png_skip_re" "$tmp/png.err"; then
            printf '  skip PNG render (Playwright/Chromium not available)\n'
        else
            fail=$((fail + 1))
            printf '  FAIL PNG render exited %d\n' "$rc"
            sed 's/^/    /' < "$tmp/png.err"
        fi
    elif [ ! -s "$png_out" ]; then
        fail=$((fail + 1))
        printf '  FAIL PNG render produced empty output\n'
    elif ! file "$png_out" 2>/dev/null | grep -q 'PNG image'; then
        fail=$((fail + 1))
        printf '  FAIL PNG output is not a PNG (file: %s)\n' \
            "$(file "$png_out" 2>/dev/null || echo unknown)"
    else
        pass=$((pass + 1))
        printf '  ok  PNG render produced a PNG\n'
    fi

    # stdin mode parity with file-arg mode.
    cat "$FIX/happy.json" | "$SCRIPT" - --out "$tmp/stdin.png" >/dev/null 2>"$tmp/stdin.err"
    rc=$?
    if [ "$rc" -ne 0 ]; then
        if grep -qE "$png_skip_re" "$tmp/stdin.err"; then
            printf '  skip stdin PNG (Playwright/Chromium not available)\n'
        else
            fail=$((fail + 1))
            printf '  FAIL stdin PNG exited %d\n' "$rc"
            sed 's/^/    /' < "$tmp/stdin.err"
        fi
    elif [ ! -s "$tmp/stdin.png" ]; then
        fail=$((fail + 1))
        printf '  FAIL stdin PNG produced empty output\n'
    elif ! file "$tmp/stdin.png" 2>/dev/null | grep -q 'PNG image'; then
        fail=$((fail + 1))
        printf '  FAIL stdin output is not a PNG (file: %s)\n' \
            "$(file "$tmp/stdin.png" 2>/dev/null || echo unknown)"
    else
        pass=$((pass + 1))
        printf '  ok  stdin mode produces PNG\n'
    fi
else
    printf '  skip PNG render (node not on PATH)\n'
fi

echo "missing --out (must fail with guidance)"
"$SCRIPT" "$FIX/happy.json" >"$tmp/noout.out" 2>"$tmp/noout.err"
rc=$?
if [ "$rc" -eq 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL no-args succeeded; --out should be required\n'
elif ! grep -qE 'required.*--out|--out.*required|the following arguments are required' "$tmp/noout.err"; then
    fail=$((fail + 1))
    printf '  FAIL no-args stderr missing --out guidance\n'
    sed 's/^/    /' < "$tmp/noout.err"
else
    pass=$((pass + 1))
    printf '  ok  no --out fails with guidance\n'
fi

echo "internal DOT structural checks (via render_dot)"
# We re-import render_dot to assert the visual encoding holds without
# requiring a full PNG render (which needs Chromium). This keeps coverage
# of the styled-DOT logic in CI environments where Playwright is missing.
py3="$(command -v python3)"
"$py3" - <<'PY' "$FIX/happy.json" > "$tmp/happy.dot" 2>"$tmp/happy.dot.err"
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("pdr", "scripts/plan-dag-render.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
ir = json.loads(open(sys.argv[1]).read())
print(mod.render_dot(ir, emoji=True))
PY
rc=$?
if [ "$rc" -ne 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL render_dot import exited %d\n' "$rc"
    sed 's/^/    /' < "$tmp/happy.dot.err"
else
    # Available-next: #304 is open, only pred (#288) is done → blue highlight.
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
    # Critical-path edges stay unbolded — caller judgement, not topology.
    crit_edges=$(grep -E '"[^"]+"\s*->\s*"[^"]+"\s*\[' "$tmp/happy.dot" | grep -c 'penwidth' || true)
    if [ "$crit_edges" -eq 0 ]; then
        pass=$((pass + 1))
        printf '  ok  no critical-path edge bolding\n'
    else
        fail=$((fail + 1))
        printf '  FAIL %d edges carry explicit penwidth (expected 0)\n' "$crit_edges"
    fi
fi

echo "--emoji=off (visible through PNG-or-skip pathway)"
if command -v node >/dev/null 2>&1; then
    "$SCRIPT" "$FIX/happy.json" --emoji=off --out "$tmp/happy.off.png" \
        >/dev/null 2>"$tmp/off.err"
    rc=$?
    if [ "$rc" -ne 0 ]; then
        if grep -qE "$png_skip_re" "$tmp/off.err"; then
            printf '  skip --emoji=off PNG (Playwright/Chromium not available)\n'
        else
            fail=$((fail + 1))
            printf '  FAIL --emoji=off exited %d\n' "$rc"
            sed 's/^/    /' < "$tmp/off.err"
        fi
    else
        pass=$((pass + 1))
        printf '  ok  --emoji=off renders a PNG\n'
    fi
fi
# Independent of PNG availability: assert the underlying styled DOT is emoji-free.
"$py3" - <<'PY' "$FIX/happy.json" > "$tmp/happy.dot.off" 2>/dev/null
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("pdr", "scripts/plan-dag-render.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
ir = json.loads(open(sys.argv[1]).read())
print(mod.render_dot(ir, emoji=False))
PY
if grep -q '✅\|🟡\|⬜\|🎯\|🏁' "$tmp/happy.dot.off"; then
    fail=$((fail + 1))
    printf '  FAIL --emoji=off leaked emoji into DOT\n'
else
    pass=$((pass + 1))
    printf '  ok  --emoji=off DOT is emoji-free\n'
fi
if grep -q '#288 MCP ✓' "$tmp/happy.dot.off"; then
    pass=$((pass + 1))
    printf '  ok  --emoji=off DOT retains ✓ / … text markers\n'
else
    fail=$((fail + 1))
    printf '  FAIL --emoji=off DOT missing text marker\n'
fi

echo "bad.json (must fail validation before rasterising)"
"$SCRIPT" "$FIX/bad.json" --out "$tmp/bad.png" > "$tmp/bad.out" 2>"$tmp/bad.err"
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
             'critical_path[1]' 'starts with own id'; do
    if grep -qF "$token" "$tmp/bad.err"; then
        pass=$((pass + 1))
        printf '  ok  bad stderr contains: %s\n' "$token"
    else
        fail=$((fail + 1))
        printf '  FAIL bad stderr missing: %s\n' "$token"
    fi
done
# Validation must short-circuit before invoking dot / node — no PNG should appear.
if [ -e "$tmp/bad.png" ]; then
    fail=$((fail + 1))
    printf '  FAIL bad.json produced a PNG despite failing validation\n'
else
    pass=$((pass + 1))
    printf '  ok  bad.json does not produce a PNG\n'
fi

echo "own-id-prefix boundary cases (must pass validation)"
# Labels that mention a *different* issue number must not be rejected.
"$py3" - <<'PY' > "$tmp/ref.out" 2>"$tmp/ref.err"
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("pdr", "scripts/plan-dag-render.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
ir = json.loads('{"nodes":[{"id":"288","label":"MCP (see #500)","status":"done"}],"edges":[]}')
errs = mod.validate(ir)
if errs:
    print("VALIDATION ERRORS:")
    for e in errs: print(" -", e)
    sys.exit(1)
print(mod.render_dot(ir, emoji=False))
PY
rc=$?
if [ "$rc" -ne 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL label referencing another issue rejected (rc=%d)\n' "$rc"
    sed 's/^/    /' < "$tmp/ref.err"
elif ! grep -qF '#288 MCP (see #500) ✓' "$tmp/ref.out"; then
    fail=$((fail + 1))
    printf '  FAIL expected "#288 MCP (see #500) ✓" in DOT, got:\n'
    sed 's/^/    /' < "$tmp/ref.out"
else
    pass=$((pass + 1))
    printf '  ok  label mentioning a different issue passes (no false positive)\n'
fi
# Own id as a *prefix* of a longer id in the label must also pass.
"$py3" - <<'PY' > "$tmp/pref.out" 2>"$tmp/pref.err"
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("pdr", "scripts/plan-dag-render.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
ir = json.loads('{"nodes":[{"id":"28","label":"#288 different","status":"open"}],"edges":[]}')
errs = mod.validate(ir)
if errs:
    for e in errs: print(" -", e)
    sys.exit(1)
print(mod.render_dot(ir, emoji=False))
PY
rc=$?
if [ "$rc" -ne 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL own-id-as-prefix-of-longer-id rejected (rc=%d)\n' "$rc"
    sed 's/^/    /' < "$tmp/pref.err"
elif ! grep -qF '#28 #288 different' "$tmp/pref.out"; then
    fail=$((fail + 1))
    printf '  FAIL expected "#28 #288 different" in DOT, got:\n'
    sed 's/^/    /' < "$tmp/pref.out"
else
    pass=$((pass + 1))
    printf '  ok  own id as prefix of a longer id in label passes\n'
fi

echo "empty-string close (must fail validation)"
# Edges can reference "close" + a falsy ir.close, but render_dot needs a
# real close id to emit the styled sentinel — validation catches the
# empty-string case before render does.
empty_close='{"nodes":[{"id":"1","label":"a","status":"done"}],"edges":[{"from":"1","to":"close","source":"closes"}],"close":""}'
echo "$empty_close" | "$SCRIPT" - --out "$tmp/empty-close.png" \
    > "$tmp/empty-close.out" 2>"$tmp/empty-close.err"
rc=$?
if [ "$rc" -ne 1 ]; then
    fail=$((fail + 1))
    printf '  FAIL empty-string close expected exit 1, got %d\n' "$rc"
elif ! grep -qF 'empty string' "$tmp/empty-close.err"; then
    fail=$((fail + 1))
    printf '  FAIL empty-string close stderr missing guidance:\n'
    sed 's/^/    /' < "$tmp/empty-close.err"
else
    pass=$((pass + 1))
    printf '  ok  empty-string ir.close rejected with guidance\n'
fi

echo "cycle.json (must fail validation with a cycle error)"
"$SCRIPT" "$FIX/cycle.json" --out "$tmp/cycle.png" > "$tmp/cycle.out" 2>"$tmp/cycle.err"
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

echo "missing dot on PATH (must error, not silently fall back)"
PATH="" "$py3" "$SCRIPT" "$FIX/happy.json" --out "$tmp/nodot.png" \
    > "$tmp/nodot.out" 2>"$tmp/nodot.err"
rc=$?
if [ "$rc" -eq 0 ]; then
    fail=$((fail + 1))
    printf '  FAIL render without dot succeeded; expected failure\n'
elif ! grep -qF 'requires `dot` (graphviz)' "$tmp/nodot.err"; then
    fail=$((fail + 1))
    printf '  FAIL stderr without dot missing install guidance\n'
    sed 's/^/    /' < "$tmp/nodot.err"
else
    pass=$((pass + 1))
    printf '  ok  missing dot errors with install guidance\n'
fi

echo
printf 'plan-dag-render.test: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
