---
name: watch-ci
description: Watch GitHub Actions CI status for the current branch until completion. Use after pushing changes to monitor build results.
allowed-tools: Bash
---

# Watch CI

Poll the GitHub Actions CI pipeline for the current branch until all jobs finish.

## Environment

The `gh` CLI is **not available** in the Claude VM. Use the GitHub REST API via `curl`.
The repo is `codervisor/lean-spec`.

## Steps

1. Get the current branch:
   ```bash
   BRANCH=$(git branch --show-current)
   ```

2. Find the latest workflow run:
   ```bash
   curl -sH "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/codervisor/lean-spec/actions/runs?branch=$BRANCH&per_page=1" \
     | python3 -c "
   import json, sys
   data = json.load(sys.stdin)
   runs = data.get('workflow_runs', [])
   if not runs:
       print('NO_RUNS'); sys.exit()
   r = runs[0]
   print(f'RUN_ID={r[\"id\"]}')
   print(f'Status: {r[\"status\"]}  Conclusion: {r.get(\"conclusion\") or \"pending\"}  Name: {r[\"name\"]}')"
   ```

3. Poll jobs until all complete (every 60s for Rust builds which take ~8-10 min):
   ```bash
   curl -sH "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/codervisor/lean-spec/actions/runs/$RUN_ID/jobs" \
     | python3 -c "
   import json, sys
   data = json.load(sys.stdin)
   for j in data.get('jobs', []):
       steps = [s for s in j.get('steps', []) if s['status'] == 'in_progress']
       step_info = f' -> {steps[0][\"name\"]}' if steps else ''
       print(f'{j[\"name\"]:40}  {j[\"status\"]:12}  {j.get(\"conclusion\") or \"\"}{step_info}')"
   ```

4. On failure, fetch the failed job logs to diagnose:
   ```bash
   # Get failed job IDs
   curl -sH "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/codervisor/lean-spec/actions/runs/$RUN_ID/jobs" \
     | python3 -c "
   import json, sys
   data = json.load(sys.stdin)
   for j in data.get('jobs', []):
       if j.get('conclusion') == 'failure':
           print(f'FAILED: {j[\"name\"]} (id: {j[\"id\"]})')
           for s in j.get('steps', []):
               if s.get('conclusion') == 'failure':
                   print(f'  Step: {s[\"name\"]}')"
   ```

## CI Structure

- **node** (~2 min): pnpm install, build, typecheck, test
- **rust** (~8-10 min, depends on node): cargo fmt, clippy, build, test, TS binding export

## Reporting

Give the user a brief status update each poll cycle. On completion, summarize:
- Overall result (success/failure)
- Per-job results
- If failed: which step failed and relevant error output
