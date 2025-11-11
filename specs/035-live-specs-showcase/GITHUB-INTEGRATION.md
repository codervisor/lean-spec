# GitHub Integration Strategy

This document details how LeanSpec Web integrates with GitHub to sync and display specs from public repositories.

## Overview

GitHub serves as the **source of truth** for all spec content. The database acts as a performance/caching layer for fast queries and search. This design ensures:
- Content integrity (GitHub is authoritative)
- Performance (database handles queries)
- Scalability (decouple from GitHub API limits)

## Sync Mechanisms

### 1. Manual Trigger (MVP)
Users add a GitHub repo via web UI, triggering immediate sync.

**Flow:**
```
User submits GitHub URL
    ↓
Validate URL format and repo existence
    ↓
Create project record in database
    ↓
Queue sync job
    ↓
Fetch and parse specs from repo
    ↓
Store in database
    ↓
Show success/error to user
```

**Implementation:**
- Web form with GitHub URL input
- API endpoint: `POST /api/projects`
- Validation checks before creating project
- Sync runs immediately (or queued if heavy)

### 2. Scheduled Sync (Phase 2)
Automatic background sync to keep cached specs fresh.

**Strategy:**
- **Featured projects**: Sync every 6 hours
- **Active projects**: Sync daily
- **Inactive projects**: Sync weekly
- **Configurable** per project priority

**Implementation:**
- Vercel Cron Jobs or external scheduler (Upstash QStash)
- Queue-based processing (BullMQ or Quirrel)
- Exponential backoff on failures
- Configurable sync intervals

### 3. GitHub Webhooks (Phase 4 - Future)
Real-time updates when specs change in GitHub.

**Flow:**
```
GitHub repo push event
    ↓
Webhook received by API
    ↓
Verify webhook signature
    ↓
Check if specs/ directory changed
    ↓
Queue incremental sync
    ↓
Update only changed specs
```

**Requirements:**
- Webhook endpoint: `POST /api/webhooks/github`
- Webhook secret verification
- Event filtering (only push to main/master)
- Idempotent processing

## Sync Process Details

### Discovery Phase
**Goal:** Find all spec files in the repository.

**Steps:**
1. Fetch repository tree via GitHub API:
   ```
   GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
   ```
2. Filter files matching spec patterns:
   - `specs/*/README.md` (main spec files)
   - `specs/*/DESIGN.md`, `IMPLEMENTATION.md`, etc. (sub-specs)
3. Exclude archived specs (optional):
   - `specs/archived/**`

**Optimization:**
- Use tree API (single request) vs. contents API (multiple requests)
- Cache tree SHA and use conditional requests (ETag)
- Only fetch tree if repo updated since last sync

### Parsing Phase
**Goal:** Extract spec metadata and content.

**Steps:**
1. Download spec file content via GitHub API:
   ```
   GET /repos/{owner}/{repo}/contents/{path}
   ```
2. Parse frontmatter using existing `spec-loader.ts`:
   - Extract: status, priority, tags, assignee, timestamps
   - Parse relationships: depends_on, related
3. Extract markdown content (body)
4. Generate GitHub URL for direct linking

**Reuse:**
- Import and use existing `spec-loader.ts` from CLI
- Ensures consistency between CLI and web
- Shared validation logic

### Storage Phase
**Goal:** Upsert specs into database.

**Steps:**
1. **Upsert project** record:
   - Update `last_synced_at`, `stars`, `description`
2. **Upsert specs**:
   - Match by `(project_id, spec_number)` or `(project_id, file_path)`
   - Update if content changed (compare hash)
   - Insert if new spec
3. **Handle deletions**:
   - Track specs in previous sync
   - Mark as deleted or remove if no longer in repo
4. **Upsert relationships**:
   - Parse `depends_on` and `related` fields
   - Create relationship records
   - Handle cross-project references (future)
5. **Log sync results**:
   - Record in `sync_logs` table
   - Count: added, updated, deleted, errors

**Transaction:**
- Wrap entire sync in database transaction
- Rollback on errors
- Atomic updates per project

## Rate Limiting Strategy

GitHub API has strict rate limits:
- **Authenticated**: 5000 requests/hour
- **Unauthenticated**: 60 requests/hour

### Handling Strategies

**1. Conditional Requests**
Use ETags to skip unchanged resources.

```javascript
const response = await octokit.request({
  url: '/repos/{owner}/{repo}/git/trees/{sha}',
  headers: {
    'If-None-Match': lastETag // from database
  }
});

if (response.status === 304) {
  // Not modified, use cached data
  return;
}
```

**2. Response Caching**
Cache GitHub API responses in database or Redis.

**3. Request Batching**
Batch multiple spec file fetches using:
- Tree API (recursive) for discovery
- Blobs API for content (single commit)

**4. Rate Limit Monitoring**
Track remaining quota:

```javascript
const { data: rateLimit } = await octokit.rateLimit.get();
console.log(`Remaining: ${rateLimit.rate.remaining}/${rateLimit.rate.limit}`);

if (rateLimit.rate.remaining < 100) {
  // Pause syncing, wait for reset
  await waitForReset(rateLimit.rate.reset);
}
```

**5. Exponential Backoff**
Retry failed requests with increasing delays:

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(2 ** i * 1000); // 1s, 2s, 4s
    }
  }
}
```

**6. Prioritization**
Prioritize sync jobs:
1. Manual user-triggered syncs (immediate)
2. Featured projects (high priority)
3. Active projects (medium priority)
4. Inactive projects (low priority)

## Public Repo Discovery

How users find and add LeanSpec projects.

### Manual Submission
Users paste GitHub URL directly.

**Validation:**
1. Parse URL to extract `owner/repo`
2. Check if repo exists and is public
3. Verify `specs/` directory exists
4. Check for LeanSpec-compatible frontmatter
5. Create project and sync

### GitHub Topic Tag
Repos tag themselves with `leanspec` topic.

**Discovery:**
```
GET /search/repositories?q=topic:leanspec
```

**Automation:**
- Periodic search for new repos
- Auto-add to featured/suggested list
- Require manual approval before indexing

### GitHub Search
Search for repos with `specs/` directory + frontmatter pattern.

**Query:**
```
GET /search/code?q=status+priority+created_at+in:file+path:specs/
```

**Challenges:**
- GitHub code search is limited
- High false-positive rate
- Manual curation required

### Featured/Curated List
Maintain curated list of high-quality examples.

**Criteria:**
- Well-documented specs
- Active development
- Good examples of LeanSpec methodology
- Variety of project types

**Management:**
- Admin UI to feature projects
- Database flag: `is_featured`
- Displayed prominently on home page

## Error Handling

### Common Errors

**1. Repo Not Found (404)**
- Repo deleted or made private
- Invalid URL

**Action:**
- Mark project as unavailable
- Notify project owner (if contact info available)
- Keep in database (don't delete) for history

**2. Rate Limit Exceeded (429/403)**
- Too many sync requests

**Action:**
- Pause syncing until reset
- Queue job for later
- Alert administrators

**3. Parse Errors**
- Invalid frontmatter
- Malformed markdown

**Action:**
- Log detailed error
- Store spec with error flag
- Continue with other specs (don't fail entire sync)

**4. Network Timeouts**
- GitHub API slow or unavailable

**Action:**
- Retry with exponential backoff
- Mark sync as failed after max retries
- Alert if persistent

### Sync Status Tracking

Track sync operations in `sync_logs` table:

```typescript
interface SyncLog {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  specsAdded: number;
  specsUpdated: number;
  specsDeleted: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
}
```

**Benefits:**
- Debugging sync issues
- Performance monitoring
- User-facing sync history
- Audit trail

## Data Consistency

### Handling Deleted Specs

**Scenario:** Spec exists in database but not in GitHub repo.

**Options:**

**Option A: Soft Delete (Recommended)**
- Mark spec as `deleted_at` timestamp
- Keep in database for history
- Hide from main UI
- Show in "Deleted Specs" section (optional)

**Option B: Hard Delete**
- Remove from database entirely
- Cleaner database
- Lose historical data

**Decision:** Use soft delete for MVP, can add hard delete later.

### Handling Spec Moves

**Scenario:** Spec moved from `001-feature` to `archived/001-feature`.

**Detection:**
- Check file path changes
- Compare spec numbers and names

**Action:**
- Update `file_path` in database
- Update `status` to 'archived' if moved to archived/
- Preserve spec ID (maintain relationships)

### Handling Conflicts

**Scenario:** Database and GitHub out of sync.

**Resolution:**
- GitHub is always source of truth
- Overwrite database with GitHub content
- Log conflicts in sync logs
- Alert if frequent conflicts (data integrity issue)

## GitHub API Client Configuration

```typescript
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Personal access token
  userAgent: 'leanspec-web/1.0.0',
  throttle: {
    onRateLimit: (retryAfter, options) => {
      console.warn(`Rate limit hit, retrying after ${retryAfter}s`);
      return true; // Retry automatically
    },
    onSecondaryRateLimit: (retryAfter, options) => {
      console.warn(`Secondary rate limit hit`);
      return false; // Don't retry
    }
  }
});
```

**Configuration:**
- Use GitHub App (higher rate limits) or Personal Access Token
- Token scopes: `public_repo` (read-only)
- Store token in environment variables
- Rotate tokens if approaching limits

## Future Enhancements

### Private Repo Support (Phase 4)
- GitHub OAuth flow for user authentication
- User grants access to private repos
- Sync user-specific specs (visible only to them)
- Store access tokens securely (encrypted)

### Real-Time Sync via Webhooks
- GitHub webhook for push events
- Incremental sync (only changed files)
- WebSocket or SSE for live updates in UI
- Sub-second latency from push to UI update

### Multi-Branch Support
- Sync specs from multiple branches (dev, staging, prod)
- Branch selector in UI
- Show spec evolution across branches
- Diff view between branches

### Cross-Repo Relationships
- Specs in one repo depend on specs in another
- Visualize cross-project dependencies
- Requires careful ID management
- Useful for microservices/monorepo setups

## Testing Strategy

### Sync Testing
- Mock GitHub API responses
- Test error scenarios (404, 429, timeout)
- Test partial failures (some specs succeed, some fail)
- Test idempotency (sync multiple times, same result)

### Integration Tests
- Test against real GitHub repos (test fixtures)
- Verify correct parsing of various spec formats
- Test sync with large repos (100+ specs)
- Test rate limiting behavior

### Performance Tests
- Sync time for repos with varying spec counts
- Database query performance with large datasets
- Concurrent sync operations
- Memory usage during sync
