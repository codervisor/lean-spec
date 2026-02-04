# GitHub Actions Troubleshooting

Common issues and their solutions for LeanSpec GitHub Actions workflows.

## CI Workflow Issues

### TypeScript Compilation Errors

**Symptoms**: `node` job fails during typecheck step.

**Solution**:
```bash
# Run locally to see errors
pnpm typecheck

# Fix errors, then push
```

### Test Failures

**Symptoms**: `node` job fails during test step.

**Solution**:
```bash
# Run tests locally
pnpm test

# Run specific package tests
pnpm --filter @leanspec/core test
```

### Rust Formatting Errors

**Symptoms**: `rust` job fails at "Check formatting" step.

**Solution**:
```bash
# Format code
cd rust
cargo fmt

# Commit and push
```

### Clippy Warnings

**Symptoms**: `rust` job fails at "Run clippy" step with warning messages.

**Solution**:
```bash
# Run clippy locally
cd rust
cargo clippy -- -D warnings

# Fix warnings, then push
```

### Spec Validation Errors

**Symptoms**: `rust` job fails at "Validate specs" step.

**Solution**:
```bash
# Run validation locally
lean-spec validate

# Fix spec issues and push
```

---

## Publish Workflow Issues

### Platform Packages Not Propagating

**Symptoms**: `publish-main` job fails waiting for platform packages.

**Cause**: npm registry takes time to propagate new package versions.

**Solution**:
```bash
# Wait and retry the failed job
gh run rerun <run-id> --job <publish-main-job-id>

# Or rerun from publish-main (doesn't rebuild binaries)
gh run rerun <run-id> --failed
```

### Version Mismatch

**Symptoms**: Build fails with version inconsistency errors.

**Solution**:
```bash
# Sync all versions
pnpm sync-versions

# Verify
grep '"version"' package.json packages/*/package.json rust/*/Cargo.toml

# Commit and push
```

### NPM Authentication Failure

**Symptoms**: Publish step fails with 401 or 403 error.

**Cause**: `NPM_TOKEN` secret is invalid or expired.

**Solution**:
1. Generate new npm token: https://www.npmjs.com/settings/tokens
2. Update repository secret: Settings → Secrets → Actions → `NPM_TOKEN`
3. Rerun the workflow

### Binary Not Found

**Symptoms**: Publish step fails because binary doesn't exist.

**Cause**: Rust build failed or artifact download failed.

**Solution**:
```bash
# Check if rust-binaries job succeeded
gh run view <run-id>

# If it failed, check logs
gh run view <run-id> --log-failed

# Rerun entire workflow if binaries need rebuilding
gh run rerun <run-id>
```

### UI Dist Missing

**Symptoms**: Rust build fails because UI dist is missing.

**Cause**: `build-ui` job failed or artifact wasn't uploaded.

**Solution**:
```bash
# Check build-ui job
gh run view <run-id> --job <build-ui-job-id>

# Rerun if needed
gh run rerun <run-id>
```

---

## Desktop Build Issues

### Linux Dependencies Missing

**Symptoms**: Build fails on Ubuntu with missing library errors.

**Cause**: System dependencies not installed.

**Note**: This should be handled automatically by the workflow. If it fails:

```bash
# Check the Install Linux dependencies step
gh run view <run-id> --log
```

### Tauri Build Failure

**Symptoms**: Desktop bundle step fails.

**Solution**:
```bash
# Build locally to debug
pnpm --filter @leanspec/desktop bundle:linux  # or macos/windows

# Check Tauri logs for specific errors
```

---

## General Issues

### Workflow Not Triggering

**Symptoms**: Push or PR doesn't trigger workflow.

**Possible Causes**:
1. Workflow file has syntax errors
2. Branch not matching trigger conditions
3. Path filters not matching changed files

**Solutions**:
```bash
# Validate workflow syntax
gh workflow view ci.yml

# Check workflow triggers
cat .github/workflows/ci.yml | head -20

# Manually trigger to test
gh workflow run ci.yml
```

### Cache Issues

**Symptoms**: Build takes unexpectedly long or uses stale dependencies.

**Solution**:
```bash
# Caches auto-expire, but you can force rebuild
# by changing cache key (edit workflow) or wait 7 days

# Check cache usage
gh api repos/{owner}/{repo}/actions/caches
```

### Rate Limiting

**Symptoms**: API calls fail with rate limit errors.

**Solution**:
```bash
# Check rate limit status
gh api rate_limit

# Wait for reset or use different token
```

### Artifact Expired

**Symptoms**: Can't download artifacts from old run.

**Cause**: Artifacts have 30-day retention (or less).

**Solution**: Trigger new build to generate fresh artifacts.

---

## Debugging Commands

### View Full Logs

```bash
# All logs
gh run view <run-id> --log

# Failed logs only
gh run view <run-id> --log-failed

# Specific job
gh run view <run-id> --job <job-id> --log
```

### Check Run Status

```bash
# Detailed status
gh run view <run-id> --json status,conclusion,jobs --jq '.'

# Job-level status
gh run view <run-id> --json jobs --jq '.jobs[] | "\(.name): \(.status) - \(.conclusion)"'
```

### Compare With Previous Successful Run

```bash
# Get last successful run
LAST_SUCCESS=$(gh run list --workflow ci.yml --status success --limit 1 --json databaseId --jq '.[0].databaseId')

# View it
gh run view $LAST_SUCCESS

# Compare with failed run in browser
gh run view <failed-run-id> --web
gh run view $LAST_SUCCESS --web
```

---

## Getting Help

1. **Check workflow file**: `.github/workflows/<workflow>.yml`
2. **Check job logs**: `gh run view <run-id> --log-failed`
3. **Check GitHub Actions status**: https://www.githubstatus.com/
4. **Check npm status**: https://status.npmjs.org/
