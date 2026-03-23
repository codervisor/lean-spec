---
name: watch-ci
description: Watch GitHub Actions CI status for the current commit until completion. Use after pushing changes to monitor build results.
allowed-tools: Bash
---

# Watch CI

Poll the GitHub Actions CI pipeline for the **current HEAD commit** until all jobs finish.

## Environment

The `gh` CLI is **not available** in the Claude VM. Use the GitHub REST API via `curl`.
The repo is `codervisor/lean-spec`.

## Steps

1. Get the current commit SHA and branch:
   ```bash
   SHA=$(git rev-parse HEAD)
   BRANCH=$(git branch --show-current)
   echo "Watching CI for commit $SHA on branch $BRANCH"
   ```

2. Find the workflow run **matching our exact commit**. The API returns runs newest-first; filter by `head_sha`. If the run hasn't appeared yet (GitHub can take a few seconds), retry up to 5 times with 10s waits:
   ```bash
   curl -sH "Accept: application/vnd.github+json" \
     "https://api.github.com/repos/codervisor/lean-spec/actions/runs?branch=$BRANCH&head_sha=$SHA&per_page=1" \
     | python3 -c "
   import json, sys
   data = json.load(sys.stdin)
   runs = data.get('workflow_runs', [])
   if not runs:
       print('NO_RUNS'); sys.exit()
   r = runs[0]
   print(f'RUN_ID={r[\"id\"]}')
   print(f'Status: {r[\"status\"]}  Conclusion: {r.get(\"conclusion\") or \"pending\"}  Commit: {r[\"head_sha\"][:8]}')"
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
