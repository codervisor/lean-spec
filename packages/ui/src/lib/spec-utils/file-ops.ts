/**
 * Atomic file operations (inlined from @leanspec/core)
 * 
 * Implements write-then-rename pattern for atomic filesystem operations.
 * This prevents race conditions and partial writes during spec create/update.
 * 
 * @see spec 181-typescript-deprecation-rust-migration
 */

import { writeFile, rename, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

/**
 * Atomically write content to a file
 * 
 * Uses the standard write-then-rename pattern which is atomic on both
 * POSIX (rename) and Windows (MoveFileEx with MOVEFILE_REPLACE_EXISTING).
 * 
 * Process:
 * 1. Write content to temporary file (filename.tmp-RANDOM)
 * 2. Atomically rename temp file to target (overwrites existing)
 * 3. Cleanup temp file on error
 * 
 * @param filePath - Target file path to write
 * @param content - Content to write
 * @throws Error if write or rename fails
 */
export async function atomicWriteFile(
  filePath: string,
  content: string
): Promise<void> {
  // Generate unique temp file name (prevents collisions in concurrent operations)
  const tmpPath = `${filePath}.tmp-${randomBytes(6).toString('hex')}`;
  
  try {
    // Step 1: Write to temporary file
    await writeFile(tmpPath, content, 'utf-8');
    
    // Step 2: Atomic rename (overwrites target file)
    // This is atomic on both POSIX and Windows filesystems
    await rename(tmpPath, filePath);
  } catch (error) {
    // Step 3: Cleanup temp file on error (best effort)
    try {
      await unlink(tmpPath);
    } catch {
      // Ignore cleanup errors (file might not exist)
    }
    
    // Re-throw original error
    throw error;
  }
}
