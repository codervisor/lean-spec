# Claude Code Instructions

## Environment Detection

This repo is developed in two environments:
- **Claude VM** (web sessions): No `gh` CLI available. Use the GitHub REST API directly via `curl` for CI/GitHub operations.
- **Local/Desktop**: `gh` CLI may be available.

Detect the environment:
```bash
# Claude VM: git remote points to local proxy
git remote get-url origin  # http://local_proxy@127.0.0.1:*/git/...
```

## Watching GitHub Actions CI

The `gh` CLI is **not installed** in the Claude VM. Use the GitHub API directly:

```bash
# List runs for current branch
BRANCH=$(git branch --show-current)
curl -sH "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/codervisor/lean-spec/actions/runs?branch=$BRANCH&per_page=5" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for r in data.get('workflow_runs', []):
    print(f'{r[\"id\"]}  {r[\"status\"]:12}  {r.get(\"conclusion\") or \"\":10}  {r[\"name\"]}')"

# Check jobs for a specific run
RUN_ID=<id>
curl -sH "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/codervisor/lean-spec/actions/runs/$RUN_ID/jobs" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for j in data.get('jobs', []):
    steps = [s for s in j.get('steps', []) if s['status'] == 'in_progress']
    step_info = f' -> {steps[0][\"name\"]}' if steps else ''
    print(f'{j[\"name\"]:40}  {j[\"status\"]:12}  {j.get(\"conclusion\") or \"\"}{step_info}')"

# Quick overall status check
curl -sH "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/codervisor/lean-spec/actions/runs/$RUN_ID" \
  | python3 -c "
import json, sys; d = json.load(sys.stdin)
print(f'Status: {d[\"status\"]}  Conclusion: {d.get(\"conclusion\") or \"pending\"}')"
```

Poll every 60-90 seconds for the Rust job (cargo builds take ~8-10 min).

## CI Structure

The CI workflow (`.github/workflows/ci.yml`) has two jobs:
1. **node** — pnpm install, build, typecheck, test (~2 min)
2. **rust** — cargo fmt check, clippy, build, test, TS binding export (~8-10 min, depends on node)

## Project Layout

- `packages/ui/` — React/Vite SPA (TypeScript)
- `rust/leanspec-core/` — Core Rust library
- `rust/leanspec-http/` — Axum HTTP server
- `rust/leanspec-cli/` — CLI tool
- `deploy/` — Cloud deployment configs (Railway, Fly.io, Render)
- `docker/` — Dockerfile for production

## Build Commands

```bash
# TypeScript
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test

# Rust
cargo check -p leanspec-http --manifest-path rust/Cargo.toml
cargo test --manifest-path rust/Cargo.toml -- --test-threads=1
cargo fmt --manifest-path rust/Cargo.toml -- --check
cargo clippy --manifest-path rust/Cargo.toml -- -D warnings
```

## Key Configuration

- **Project sources**: `LEANSPEC_PROJECT_SOURCES=local,github` controls which project import modes are available in the UI
- **API auth**: `LEANSPEC_API_KEY` sets bearer token for API protection
- **Data dir**: `LEANSPEC_DATA_DIR` for persistent storage path
