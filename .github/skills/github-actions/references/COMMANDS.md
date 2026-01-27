# GitHub Actions Commands Reference

Complete reference for GitHub CLI commands to manage workflows.

## Prerequisites

```bash
# Ensure GitHub CLI is installed and authenticated
gh auth status

# If not authenticated
gh auth login
```

## Workflow Listing

### List Workflows

```bash
# List all workflow files
gh workflow list

# Output example:
# CI                    active  1234567  ci.yml
# Publish to npm        active  1234568  publish.yml
# Desktop Build         active  1234569  desktop-build.yml
```

### View Workflow Details

```bash
# View workflow definition
gh workflow view ci.yml

# View in browser
gh workflow view ci.yml --web
```

## Run Management

### List Runs

```bash
# List recent runs (all workflows)
gh run list
gh run list --limit 20

# Filter by workflow
gh run list --workflow ci.yml
gh run list --workflow publish.yml

# Filter by status
gh run list --status success
gh run list --status failure
gh run list --status in_progress
gh run list --status queued

# Filter by branch
gh run list --branch main
gh run list --branch feature-xyz

# Combine filters
gh run list --workflow ci.yml --branch main --limit 5

# JSON output for scripting
gh run list --workflow ci.yml --json databaseId,status,conclusion --jq '.[] | "\(.databaseId): \(.status) - \(.conclusion)"'
```

### View Run Details

```bash
# View run summary
gh run view <run-id>

# View with jobs
gh run view <run-id> --verbose

# View logs of all jobs
gh run view <run-id> --log

# View only failed job logs
gh run view <run-id> --log-failed

# View specific job logs
gh run view <run-id> --job <job-id>

# Open in browser
gh run view <run-id> --web

# Exit with run's conclusion status code
gh run view <run-id> --exit-status
```

### Watch Runs

```bash
# Watch run until completion
gh run watch <run-id>

# Watch with exit status
gh run watch <run-id> --exit-status

# Watch latest run of a workflow
RUN_ID=$(gh run list --workflow publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID
```

### Trigger Runs

```bash
# Trigger workflow (simple)
gh workflow run ci.yml

# Trigger with inputs
gh workflow run publish.yml --field dev=true
gh workflow run publish.yml --field dev=true --field dry_run=true

# Trigger for specific branch
gh workflow run ci.yml --ref feature-branch

# Trigger with JSON inputs
gh workflow run publish.yml --json '{"dev": true, "dry_run": false}'
```

### Rerun Workflows

```bash
# Rerun all jobs
gh run rerun <run-id>

# Rerun only failed jobs
gh run rerun <run-id> --failed

# Rerun with debug logging
gh run rerun <run-id> --debug

# Rerun specific job
gh run rerun <run-id> --job <job-id>
```

### Cancel Runs

```bash
# Cancel a run
gh run cancel <run-id>

# Cancel all in-progress runs of a workflow
for id in $(gh run list --workflow ci.yml --status in_progress --json databaseId --jq '.[].databaseId'); do
  gh run cancel $id
done
```

## Artifact Management

### List Artifacts

```bash
# List artifacts for a run
gh run view <run-id>

# List artifacts via API (more details)
gh api repos/{owner}/{repo}/actions/runs/<run-id>/artifacts
```

### Download Artifacts

```bash
# Download all artifacts from a run
gh run download <run-id>

# Download to specific directory
gh run download <run-id> --dir ./artifacts

# Download specific artifact
gh run download <run-id> --name ui-dist
gh run download <run-id> --name binaries-linux-x64
gh run download <run-id> --name binaries-darwin-arm64

# Download multiple artifacts
gh run download <run-id> --name ui-dist --name binaries-linux-x64
```

## Common Patterns

### Get Latest Run ID

```bash
# Latest run of any workflow
gh run list --limit 1 --json databaseId --jq '.[0].databaseId'

# Latest run of specific workflow
gh run list --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId'

# Latest successful run
gh run list --workflow ci.yml --status success --limit 1 --json databaseId --jq '.[0].databaseId'
```

### Check If Workflow Is Running

```bash
# Check for in-progress runs
IN_PROGRESS=$(gh run list --workflow ci.yml --status in_progress --json databaseId --jq 'length')
if [ "$IN_PROGRESS" -gt 0 ]; then
  echo "Workflow is currently running"
fi
```

### Wait For Completion

```bash
# Trigger and wait
gh workflow run publish.yml --field dev=true
sleep 5  # Wait for run to register
RUN_ID=$(gh run list --workflow publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch $RUN_ID --exit-status
```

### Get Run Conclusion

```bash
# Get conclusion of specific run
gh run view <run-id> --json conclusion --jq '.conclusion'

# Possible values: success, failure, cancelled, skipped, timed_out
```

### Debug Failed Run

```bash
# Full debugging sequence
RUN_ID=<run-id>

# 1. Get conclusion
gh run view $RUN_ID --json conclusion --jq '.conclusion'

# 2. List failed jobs
gh run view $RUN_ID --json jobs --jq '.jobs[] | select(.conclusion == "failure") | .name'

# 3. View failed logs
gh run view $RUN_ID --log-failed

# 4. Rerun failed jobs
gh run rerun $RUN_ID --failed
```

## JSON Output Reference

### Common Fields

```bash
# Run fields
gh run list --json databaseId,status,conclusion,name,createdAt,updatedAt

# Available fields:
# - databaseId: Unique run identifier
# - status: queued, in_progress, completed
# - conclusion: success, failure, cancelled, skipped, timed_out
# - name: Workflow name
# - event: push, pull_request, workflow_dispatch, release
# - headBranch: Branch that triggered the run
# - createdAt, updatedAt: Timestamps
```

### JQ Examples

```bash
# Get run IDs only
gh run list --json databaseId --jq '.[].databaseId'

# Filter failed runs
gh run list --json databaseId,conclusion --jq '.[] | select(.conclusion == "failure") | .databaseId'

# Format as table
gh run list --json databaseId,name,status,conclusion --jq '.[] | "\(.databaseId)\t\(.name)\t\(.status)\t\(.conclusion)"'
```

## Environment Variables

```bash
# Set default repo (if not in repo directory)
export GH_REPO=codervisor/lean-spec

# Use specific token
export GH_TOKEN=ghp_xxxx
```
