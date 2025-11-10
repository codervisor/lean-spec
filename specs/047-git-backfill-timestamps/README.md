---
status: complete
created: '2025-11-04'
tags:
  - enhancement
  - git
  - timestamps
  - analytics
  - migration
priority: medium
related:
  - 046-stats-dashboard-refactor
  - 014-complete-custom-frontmatter
created_at: '2025-11-04T22:58:23+08:00'
updated_at: '2025-11-04T15:08:31.110Z'
assignee: Marvin Zhang
updated: '2025-11-04'
completed_at: '2025-11-04T15:08:31.110Z'
completed: '2025-11-04'
transitions:
  - status: complete
    at: '2025-11-04T15:08:31.110Z'
---

# Backfill Timestamp Frontmatter from Git History

> **Status**: ✅ Complete · **Priority**: Medium · **Created**: 2025-11-04 · **Tags**: enhancement, git, timestamps, analytics, migration
> **Assignee**: Marvin Zhang · **Reviewer**: TBD

**Project**: lean-spec  
**Team**: Core Development

## Overview

Add a utility command to backfill created_at, updated_at, and completed_at timestamps for existing specs by analyzing their git commit history. This will enable velocity tracking and analytics for all historical specs.

**Current State:**
- ✅ Timestamp fields defined in frontmatter schema (`created_at`, `updated_at`, `completed_at`, `transitions`)
- ✅ New specs automatically get timestamps via `enrichWithTimestamps()`
- ❌ Existing specs lack timestamp data (only have date fields: `created`, `completed`)
- ❌ No way to retroactively populate timestamps from git history

**Why This Matters:**
- **Analytics** - Can't calculate cycle times, lead times, or velocity metrics without timestamps
- **Historical insight** - Valuable project data is already in git history, just not in frontmatter
- **Completeness** - New specs get timestamps automatically, but old specs are left behind

**Goals:**
1. Extract first/last commit timestamps from git history for each spec
2. Backfill `created_at`, `updated_at`, `completed_at` fields where missing
3. Provide safe, idempotent command that doesn't overwrite existing timestamps
4. Enable full velocity tracking across entire spec history

## Design

### Command Interface

```bash
# Backfill all specs (timestamps only)
lean-spec backfill

# Backfill with additional fields
lean-spec backfill --assignee    # Add assignee from git author
lean-spec backfill --transitions # Reconstruct full status history
lean-spec backfill --all         # All available fields

# Dry run (show what would be updated)
lean-spec backfill --dry-run

# Backfill specific spec(s)
lean-spec backfill 014 046
lean-spec backfill my-feature

# Force overwrite existing values (rare case)
lean-spec backfill --force
```

### Git Analysis Strategy

For each spec's `README.md`:

**Core timestamps (always backfilled):**

1. **created_at** - Use timestamp from **first commit** that created the file
   ```bash
   git log --follow --format="%aI" --diff-filter=A -- specs/XXX-name/README.md | tail -1
   ```

2. **updated_at** - Use timestamp from **most recent commit**
   ```bash
   git log --format="%aI" -n 1 -- specs/XXX-name/README.md
   ```

3. **completed_at** - Heuristic based on git history:
   - If `status: complete` in frontmatter, use timestamp of commit that changed status to complete
   - Fallback: Use timestamp when `completed` date field was added
   - If neither exists, leave `completed_at` empty

**Optional fields (with flags):**

4. **assignee** (via `--assignee` flag)
   - Extract from first commit author: `git log --follow --format="%an" --diff-filter=A`
   - Only sets if field is currently empty
   - Use case: Attribute specs to their original authors

5. **transitions[]** (via `--transitions` flag)
   - Parse all commits that modified frontmatter `status:` field
   - Build complete status change history: `planned → in-progress → complete`
   - Uses `git log -p` to inspect frontmatter diffs
   - Useful for: Cycle time analysis, understanding workflow patterns

6. **updated** date field (automatically synced with `updated_at`)
   - Convert `updated_at` timestamp to YYYY-MM-DD format
   - Keeps date and timestamp fields in sync

### Implementation Approach

**New file**: `src/commands/backfill-timestamps.ts`

```typescript
interface BackfillResult {
  specPath: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  assignee?: string;
  transitions?: StatusTransition[];
  source: 'git' | 'existing' | 'skipped';
  reason?: string;
}

async function backfillTimestamps(
  options: {
    dryRun?: boolean;
    force?: boolean;
    includeAssignee?: boolean;
    includeTransitions?: boolean;
    specs?: string[]; // specific specs to target
  }
): Promise<BackfillResult[]>
```

**Key functions:**

1. `getFirstCommitTimestamp(specPath: string): Promise<string | null>`
   - Uses `git log --follow --diff-filter=A` to find creation timestamp
   
2. `getLastCommitTimestamp(specPath: string): Promise<string | null>`
   - Uses `git log -n 1` to find most recent modification
   
3. `getCompletionTimestamp(specPath: string): Promise<string | null>`
   - Searches commit history for status change to `complete`
   - Uses `git log -p` to inspect frontmatter changes

4. `getFirstCommitAuthor(specPath: string): Promise<string | null>` (optional)
   - Extracts author name from first commit
   - Uses `git log --follow --format="%an" --diff-filter=A`

5. `parseStatusTransitions(specPath: string): Promise<StatusTransition[]>` (optional)
   - Parses all commits that modified `status:` field
   - Reconstructs full transition history with timestamps
   
6. `applyBackfillUpdates(specPath: string, data: BackfillData, force: boolean)`
   - Only updates missing fields (unless `--force`)
   - Preserves existing timestamps
   - Uses `updateFrontmatter()` from existing API

### Safety Measures

1. **Idempotent** - Running multiple times doesn't break anything
2. **Non-destructive** - Never overwrites existing timestamps (unless `--force`)
3. **Dry-run mode** - Preview changes before applying
4. **Validation** - Verify git history exists before attempting backfill
5. **Error handling** - Graceful failures for specs without git history

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Spec already has timestamps | Skip (unless `--force`) |
| Spec not in git history | Skip with warning |
| Git repo not available | Error with clear message |
| Spec was renamed/moved | Use `--follow` to track history |
| Multiple completion events | Use first transition to `complete` |
| Assignee already set | Skip assignee (unless `--force`) |
| Transitions already exist | Merge with git-derived history |
| Multiple authors | Use first commit author for assignee |

## Plan

- [ ] Implement git timestamp extraction utilities
  - [ ] `getFirstCommitTimestamp()` - file creation
  - [ ] `getLastCommitTimestamp()` - last modification
  - [ ] `getCompletionTimestamp()` - status change detection
  - [ ] `getFirstCommitAuthor()` - spec author (optional)
  - [ ] `parseStatusTransitions()` - full status history (optional)
- [ ] Build backfill command with CLI interface
  - [ ] Support `--dry-run` flag
  - [ ] Support `--force` flag
  - [ ] Support `--assignee` flag (optional backfill)
  - [ ] Support `--transitions` flag (optional backfill)
  - [ ] Support `--all` flag (all optional fields)
  - [ ] Support targeting specific specs
- [ ] Add safety validations
  - [ ] Check git repo exists
  - [ ] Verify spec file exists in git history
  - [ ] Prevent overwrites unless forced
- [ ] Integration with existing frontmatter system
  - [ ] Use `updateFrontmatter()` API
  - [ ] Preserve existing timestamp values
  - [ ] Sync `updated` date field with `updated_at`
- [ ] Add comprehensive tests
  - [ ] Mock git commands
  - [ ] Test dry-run mode
  - [ ] Test idempotency
  - [ ] Test optional flags (assignee, transitions)
  - [ ] Test edge cases (no git history, renamed files)
- [ ] Documentation
  - [ ] Update CLI reference
  - [ ] Add migration guide section
  - [ ] Document timestamp semantics
  - [ ] Document optional backfill fields

## Test

**Unit Tests:**
- [ ] Git timestamp extraction works correctly
- [ ] Dry-run doesn't modify files
- [ ] Force flag overwrites existing values
- [ ] Non-force preserves existing timestamps
- [ ] Handles missing git history gracefully
- [ ] Handles renamed/moved specs with `--follow`
- [ ] Optional flags work correctly (assignee, transitions)

**Integration Tests:**
- [ ] Backfill command updates all specs in test repo
- [ ] Can target specific specs by name or number
- [ ] Progress output is clear and informative
- [ ] Error messages are actionable

**Manual Verification:**
- [ ] Run on lean-spec's own specs (dogfooding)
- [ ] Verify `lean-spec stats` shows velocity data after backfill
- [ ] Check that re-running is safe (idempotent)

**Expected Output (dry-run):**
```
Analyzing git history for 18 specs...

046-stats-dashboard-refactor
  created_at:   2025-11-04T12:57:25Z (git)
  updated_at:   2025-11-04T14:18:46Z (git)
  completed_at: 2025-11-04T13:10:54Z (existing)
  assignee:     Marvin Zhang (git) [--assignee flag]
  transitions:  3 status changes (git) [--transitions flag]

014-complete-custom-frontmatter
  created_at:   2025-11-02T05:11:37Z (git)
  updated_at:   2025-11-04T07:39:49Z (git)
  completed_at: 2025-11-04T07:39:49Z (git - inferred from status)
  assignee:     (existing - alice)

...

Summary:
  18 specs analyzed
  16 would be updated (timestamps)
  5 would get assignee (with --assignee)
  12 would get transitions (with --transitions)
  2 already have complete data
  
Run without --dry-run to apply changes.
Run with --all to include optional fields.
```

## Notes

### Why Not Store in Git Metadata Only?

We could just query git history on-demand for analytics, but:
- ❌ Performance: Git queries are slow for large repos
- ❌ Portability: Specs lose metadata if moved outside git
- ❌ Consistency: Frontmatter is source of truth for all metadata

### Alternative: Git Hooks

Could automatically update `updated_at` on commit via git hooks, but:
- 👎 Requires setup in every repo
- 👎 Doesn't help with existing specs
- 👍 Could complement backfill for ongoing maintenance

### Future Enhancements

- **Automated backfill on `lean-spec init`** - Offer to backfill when initializing in existing project
- **Watch mode** - Continuously sync timestamps from git (via git hooks or daemon)
- **GitHub API integration** - Backfill `issue`, `pr`, `reviewer` from GitHub metadata
- **Commit message parsing** - Extract additional metadata from commit messages
- **Multi-author attribution** - Track all contributors, not just first author

### Scope Boundaries

**Out of scope for v1:**
- ❌ GitHub API integration (issue/PR linking)
- ❌ Reviewer inference (no clear git signal)
- ❌ Epic/milestone extraction (requires external PM tools)

**These could be separate features:**
- `lean-spec sync-github` - Pull issue/PR metadata from GitHub
- `lean-spec import-pm` - Import epic/milestone from Jira/ADO

### Related Specs

- **046-stats-dashboard-refactor** - Stats command will benefit from complete timestamp data
- **014-complete-custom-frontmatter** - Timestamp fields are part of frontmatter schema
