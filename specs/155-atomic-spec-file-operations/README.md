---
status: complete
created: '2025-12-09'
tags:
  - reliability
  - core
  - bug-fix
priority: high
created_at: '2025-12-09T01:40:46.581Z'
updated_at: '2025-12-09T01:46:57.680Z'
transitions:
  - status: in-progress
    at: '2025-12-09T01:41:28.238Z'
  - status: complete
    at: '2025-12-09T01:46:57.680Z'
completed_at: '2025-12-09T01:46:57.680Z'
completed: '2025-12-09'
---

# Atomic Spec File Operations

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-12-09 · **Tags**: reliability, core, bug-fix

## Overview

Implement atomic file write operations for spec create/update to prevent race conditions and partial writes across CLI, MCP, and UI packages.

### Problem

Currently, spec create/update operations use direct `fs.writeFile()` without atomicity guarantees:

1. **Race conditions**: Concurrent updates can corrupt files
2. **Partial writes**: Process crashes mid-write leave corrupted state
3. **No rollback**: Multi-step operations (create + copy templates + link deps) can fail partially
4. **Affects all packages**: CLI, MCP server, and UI all use non-atomic writes

### Solution

Implement atomic file writes using the standard **write-then-rename** pattern, which is atomic on POSIX and Windows filesystems.

## Design

### Atomic Write Pattern

```typescript
// Write to temp file → Atomic rename
async function atomicWriteFile(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp-${randomBytes(6).toString('hex')}`;
  
  try {
    await writeFile(tmpPath, content, 'utf-8');
    await rename(tmpPath, filePath); // Atomic operation
  } catch (error) {
    await unlink(tmpPath).catch(() => {}); // Cleanup
    throw error;
  }
}
```

### Implementation Strategy

**Shared implementation in `@leanspec/core`:**
- Create `src/utils/atomic-file.ts` with `atomicWriteFile()` function
- Export from core package for use across CLI, MCP, UI

**Update call sites:**
1. **CLI package** (`packages/cli/src/`):
   - `frontmatter.ts`: `updateFrontmatter()` function
   - `commands/create.ts`: `createSpec()` function (main file + template copies)
   
2. **MCP package** (`packages/mcp/src/`):
   - Uses CLI functions internally, inherits fix automatically
   
3. **UI package** (`packages/ui/src/`):
   - `app/api/projects/[id]/specs/[spec]/metadata/route.ts`: PATCH handler

### Trade-offs

**Pros:**
- Guaranteed atomic writes (no partial corruption)
- Standard pattern used by npm, git, editors
- Simple implementation (~20 lines)
- Cross-platform (POSIX + Windows)

**Cons:**
- Small performance overhead (extra syscalls)
- Temp file cleanup needed on error
- Requires disk space for temp file

**Decision:** Benefits outweigh costs - reliability is critical for spec operations.

## Plan

- [x] Create spec and design
- [x] Implement `atomicWriteFile()` in `@leanspec/core`
- [x] Update CLI: `frontmatter.ts` to use atomic writes
- [x] Update CLI: `commands/create.ts` to use atomic writes
- [x] Update UI: metadata PATCH endpoint to use atomic writes
- [x] Add unit tests for atomic write function
- [x] Add integration tests for concurrent updates
- [x] Update documentation if needed

## Implementation Summary

### Files Changed

**Core Package (`@leanspec/core`):**
- `src/utils/atomic-file.ts` - New atomic write utility (write-then-rename pattern)
- `src/utils/atomic-file.test.ts` - Unit tests (11 tests, all passing)
- `src/index.ts` - Export `atomicWriteFile` function

**CLI Package (`lean-spec`):**
- `src/frontmatter.ts` - Replace `fs.writeFile` with `atomicWriteFile` in `updateFrontmatter()`
- `src/commands/create.ts` - Replace `fs.writeFile` with `atomicWriteFile` for main file and template copies
- `src/commands/atomic-operations.test.ts` - Integration tests (5 tests, all passing)

**UI Package (`@leanspec/ui`):**
- `src/app/api/projects/[id]/specs/[spec]/metadata/route.ts` - Replace `writeFile` with `atomicWriteFile` in PATCH handler

**MCP Package:**
- No changes needed - uses CLI functions internally, inherits atomic writes automatically

### Test Results

**Unit Tests (Core):** ✅ 11/11 passing
- Write file atomically
- Overwrite existing file
- Handle multi-line content
- Handle unicode content
- No temp files on success
- Cleanup temp files on error
- Concurrent writes to different files
- Concurrent writes to same file
- Handle empty content
- Handle large content
- Propagate write errors

**Integration Tests (CLI):** ✅ 5/5 passing
- Concurrent spec updates without corruption
- Concurrent spec creations without conflicts
- No temp files after operations
- File integrity across rapid updates
- Update during read operations

## Test

### Unit Tests

```typescript
describe('atomicWriteFile', () => {
  it('should write file atomically', async () => {
    await atomicWriteFile(testPath, 'content');
    expect(await readFile(testPath, 'utf-8')).toBe('content');
  });

  it('should cleanup temp file on error', async () => {
    // Mock rename to fail
    await expect(atomicWriteFile(testPath, 'content')).rejects.toThrow();
    // Verify no temp files left behind
    const files = await readdir(dirname(testPath));
    expect(files.filter(f => f.includes('.tmp-'))).toHaveLength(0);
  });

  it('should overwrite existing file', async () => {
    await writeFile(testPath, 'old');
    await atomicWriteFile(testPath, 'new');
    expect(await readFile(testPath, 'utf-8')).toBe('new');
  });
});
```

### Integration Tests

```typescript
describe('concurrent spec updates', () => {
  it('should handle concurrent updates without corruption', async () => {
    await createSpec('test-spec');
    
    // Simulate concurrent updates
    await Promise.all([
      updateSpec('001-test-spec', { status: 'in-progress' }),
      updateSpec('001-test-spec', { priority: 'high' }),
      updateSpec('001-test-spec', { tags: ['api', 'backend'] }),
    ]);
    
    // Verify file is valid (not corrupted)
    const content = await readFile(specPath, 'utf-8');
    const fm = parseFrontmatter(content);
    expect(fm.status).toBeDefined();
    expect(fm.priority).toBeDefined();
    expect(fm.tags).toBeDefined();
  });
});
```

### Manual Testing

1. **Race condition test:**
   ```bash
   # Terminal 1
   lean-spec update 001-test --status=in-progress
   
   # Terminal 2 (same time)
   lean-spec update 001-test --priority=high
   
   # Verify: cat specs/001-test/README.md has valid frontmatter
   ```

2. **Crash recovery test:**
   ```bash
   # Kill process mid-write
   lean-spec create test-spec &
   kill -9 $!
   
   # Verify: no .tmp-* files left, no corrupted specs
   ```

## Notes

### Alternatives Considered

1. **File locking**: More complex, platform-specific, can deadlock
2. **Database transactions**: Over-engineering for filesystem ops
3. **Status quo**: Unacceptable - leads to corrupted specs

### References

- POSIX rename() semantics: atomic replacement
- Windows MoveFileEx() with MOVEFILE_REPLACE_EXISTING: atomic
- Similar patterns: npm, git, VS Code, most editors
