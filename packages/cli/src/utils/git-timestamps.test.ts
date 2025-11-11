import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  isGitRepository,
  getFirstCommitTimestamp,
  getLastCommitTimestamp,
  getCompletionTimestamp,
  getFirstCommitAuthor,
  parseStatusTransitions,
  extractGitTimestamps,
  fileExistsInGit,
} from './git-timestamps.js';

// Mock execSync
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

describe('git-timestamps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('returns true when inside a git repository', () => {
      vi.mocked(execSync).mockReturnValue('true\n' as any);
      expect(isGitRepository()).toBe(true);
    });

    it('returns false when not inside a git repository', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Not a git repository');
      });
      expect(isGitRepository()).toBe(false);
    });
  });

  describe('getFirstCommitTimestamp', () => {
    it('returns timestamp of first commit', () => {
      const timestamp = '2025-11-01T10:30:00Z';
      vi.mocked(execSync).mockReturnValue(timestamp + '\n' as any);
      
      expect(getFirstCommitTimestamp('/path/to/spec/README.md')).toBe(timestamp);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git log --follow --format="%aI" --diff-filter=A'),
        expect.any(Object)
      );
    });

    it('returns null when no commit found', () => {
      vi.mocked(execSync).mockReturnValue('' as any);
      expect(getFirstCommitTimestamp('/path/to/spec/README.md')).toBeNull();
    });

    it('returns null on error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Git error');
      });
      expect(getFirstCommitTimestamp('/path/to/spec/README.md')).toBeNull();
    });
  });

  describe('getLastCommitTimestamp', () => {
    it('returns timestamp of most recent commit', () => {
      const timestamp = '2025-11-04T14:20:00Z';
      vi.mocked(execSync).mockReturnValue(timestamp + '\n' as any);
      
      expect(getLastCommitTimestamp('/path/to/spec/README.md')).toBe(timestamp);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git log --format="%aI" -n 1'),
        expect.any(Object)
      );
    });

    it('returns null when no commit found', () => {
      vi.mocked(execSync).mockReturnValue('' as any);
      expect(getLastCommitTimestamp('/path/to/spec/README.md')).toBeNull();
    });
  });

  describe('getCompletionTimestamp', () => {
    it('returns null when status never changed to complete', () => {
      const gitLog = `abc123|2025-11-03T12:00:00Z
Author: Test User <test@example.com>
Date:   Mon Nov 3 12:00:00 2025

    Update status

diff --git a/specs/042-test/README.md b/specs/042-test/README.md
--- a/specs/042-test/README.md
+++ b/specs/042-test/README.md
@@ -1,5 +1,5 @@
 ---
-status: planned
+status: in-progress
 created: '2025-11-01'
 ---`;
      
      vi.mocked(execSync).mockReturnValue(gitLog as any);
      expect(getCompletionTimestamp('/path/to/spec/README.md')).toBeNull();
    });

    it('returns null on error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Git error');
      });
      expect(getCompletionTimestamp('/path/to/spec/README.md')).toBeNull();
    });
  });

  describe('getFirstCommitAuthor', () => {
    it('returns author name from first commit', () => {
      vi.mocked(execSync).mockReturnValue('Marvin Zhang\n' as any);
      
      expect(getFirstCommitAuthor('/path/to/spec/README.md')).toBe('Marvin Zhang');
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git log --follow --format="%an" --diff-filter=A'),
        expect.any(Object)
      );
    });

    it('returns null when no author found', () => {
      vi.mocked(execSync).mockReturnValue('' as any);
      expect(getFirstCommitAuthor('/path/to/spec/README.md')).toBeNull();
    });
  });

  describe('parseStatusTransitions', () => {
    it('filters out invalid status values', () => {
      const gitLog = `abc123|2025-11-01T10:00:00Z
Author: Test User <test@example.com>
Date:   Mon Nov 1 10:00:00 2025

    Add spec with invalid status

diff --git a/specs/042-test/README.md b/specs/042-test/README.md
new file mode 100644
+++ b/specs/042-test/README.md
@@ -1,5 +1,5 @@
 ---
+status: invalid-status
+created: '2025-11-01'
+---`;
      
      vi.mocked(execSync).mockReturnValue(gitLog as any);
      const transitions = parseStatusTransitions('/path/to/spec/README.md');
      
      expect(transitions).toHaveLength(0);
    });

    it('returns empty array on error', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Git error');
      });
      expect(parseStatusTransitions('/path/to/spec/README.md')).toEqual([]);
    });
  });

  describe('extractGitTimestamps', () => {
    beforeEach(() => {
      // Default mocks for different git commands
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('--diff-filter=A') && cmdStr.includes('"%aI"')) {
          return '2025-11-01T10:00:00Z\n' as any;
        }
        if (cmdStr.includes('-n 1') && cmdStr.includes('"%aI"')) {
          return '2025-11-04T14:00:00Z\n' as any;
        }
        if (cmdStr.includes('--diff-filter=A') && cmdStr.includes('"%an"')) {
          return 'Marvin Zhang\n' as any;
        }
        return '' as any;
      });
    });

    it('extracts core timestamps', () => {
      const data = extractGitTimestamps('/path/to/spec/README.md');
      
      expect(data.created_at).toBe('2025-11-01T10:00:00Z');
      expect(data.updated_at).toBe('2025-11-04T14:00:00Z');
      expect(data.assignee).toBeUndefined();
      expect(data.transitions).toBeUndefined();
    });

    it('includes assignee when requested', () => {
      const data = extractGitTimestamps('/path/to/spec/README.md', {
        includeAssignee: true,
      });
      
      expect(data.assignee).toBe('Marvin Zhang');
    });
  });

  describe('fileExistsInGit', () => {
    it('returns true when file exists in git history', () => {
      vi.mocked(execSync).mockReturnValue('abc123\n' as any);
      expect(fileExistsInGit('/path/to/spec/README.md')).toBe(true);
    });

    it('returns false when file does not exist in git history', () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('File not found');
      });
      expect(fileExistsInGit('/path/to/spec/README.md')).toBe(false);
    });
  });
});
