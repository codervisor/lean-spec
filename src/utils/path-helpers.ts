import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Create a regex pattern to match spec directories with sequence numbers
 * Handles optional date prefixes like 20251103-001-name
 */
export function createSpecDirPattern(): RegExp {
  // Match spec directories, handling optional date prefix
  // Patterns:
  // - 001-name (simple sequence)
  // - 20251103-001-name (date prefix + sequence)
  // - spec-001-name (custom prefix + sequence)
  // We look for: optional-prefix + NNN + dash + name
  // The sequence is 2-4 digits (to avoid matching 8-digit dates as sequences)
  // Requires dash followed by letter to ensure this is a spec directory name
  return /(?:^|\D)(\d{2,4})-[a-z]/i;
}

/**
 * Get next global sequence number across entire specs directory
 */
export async function getGlobalNextSeq(specsDir: string, digits: number): Promise<string> {
  try {
    // Recursively find all spec directories with sequence numbers
    const seqNumbers: number[] = [];
    const specPattern = createSpecDirPattern();
    
    async function scanDirectory(dir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          
          // Check if this is a spec directory (NNN-name format)
          const match = entry.name.match(specPattern);
          if (match) {
            const seqNum = parseInt(match[1], 10);
            if (!isNaN(seqNum) && seqNum > 0) {
              seqNumbers.push(seqNum);
            }
          }
          
          // Skip archived directory to avoid confusion
          if (entry.name === 'archived') continue;
          
          // Recursively scan subdirectories (for custom pattern grouping)
          const subDir = path.join(dir, entry.name);
          await scanDirectory(subDir);
        }
      } catch {
        // Directory doesn't exist or can't be read
      }
    }
    
    await scanDirectory(specsDir);
    
    if (seqNumbers.length === 0) {
      return '1'.padStart(digits, '0');
    }
    
    const maxSeq = Math.max(...seqNumbers);
    return String(maxSeq + 1).padStart(digits, '0');
  } catch {
    return '1'.padStart(digits, '0');
  }
}

/**
 * Get next sequence number for a date directory (legacy, kept for backward compatibility)
 */
export async function getNextSeq(dateDir: string, digits: number): Promise<string> {
  try {
    const specPattern = createSpecDirPattern();
    const entries = await fs.readdir(dateDir, { withFileTypes: true });
    const seqNumbers = entries
      .filter((e) => e.isDirectory() && specPattern.test(e.name))
      .map((e) => {
        const match = e.name.match(specPattern);
        return match ? parseInt(match[1], 10) : NaN;
      })
      .filter((n) => !isNaN(n));

    if (seqNumbers.length === 0) {
      return '1'.padStart(digits, '0');
    }

    const maxSeq = Math.max(...seqNumbers);
    return String(maxSeq + 1).padStart(digits, '0');
  } catch {
    return '1'.padStart(digits, '0');
  }
}

/**
 * Resolve spec path in multiple ways:
 * 1. Absolute path as given
 * 2. Relative to current directory
 * 3. Relative to specs directory
 * 4. Search by spec name in all subdirectories (flat or grouped)
 * 5. Search by sequence number only
 */
export async function resolveSpecPath(
  specPath: string,
  cwd: string,
  specsDir: string
): Promise<string | null> {
  // Try absolute path
  if (path.isAbsolute(specPath)) {
    try {
      await fs.access(specPath);
      return specPath;
    } catch {
      return null;
    }
  }

  // Try relative to cwd
  const cwdPath = path.resolve(cwd, specPath);
  try {
    await fs.access(cwdPath);
    return cwdPath;
  } catch {
    // Continue to next method
  }

  // Try relative to specs directory
  const specsPath = path.join(specsDir, specPath);
  try {
    await fs.access(specsPath);
    return specsPath;
  } catch {
    // Continue to next method
  }

  // Search by sequence number only (e.g., "5" or "005")
  const seqMatch = specPath.match(/^0*(\d+)$/);
  if (seqMatch) {
    const seqNum = parseInt(seqMatch[1], 10);
    const result = await searchBySequence(specsDir, seqNum);
    if (result) return result;
  }

  // Last resort: search for spec name in all subdirectories
  const specName = specPath.replace(/^.*\//, ''); // Get last part
  const result = await searchInAllDirectories(specsDir, specName);
  return result;
}

/**
 * Search for a spec by sequence number across all directories
 */
async function searchBySequence(specsDir: string, seqNum: number): Promise<string | null> {
  const specPattern = createSpecDirPattern();
  
  async function scanDirectory(dir: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // Check if this matches the sequence number
        const match = entry.name.match(specPattern);
        if (match) {
          const entrySeq = parseInt(match[1], 10);
          if (entrySeq === seqNum) {
            return path.join(dir, entry.name);
          }
        }
        
        // Skip archived directory in main search
        if (entry.name === 'archived') continue;
        
        // Recursively search subdirectories
        const subDir = path.join(dir, entry.name);
        const result = await scanDirectory(subDir);
        if (result) return result;
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    
    return null;
  }
  
  return scanDirectory(specsDir);
}

/**
 * Search for a spec by name in all subdirectories
 */
async function searchInAllDirectories(specsDir: string, specName: string): Promise<string | null> {
  async function scanDirectory(dir: string): Promise<string | null> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        // Check if this matches the spec name
        if (entry.name === specName) {
          return path.join(dir, entry.name);
        }
        
        // Skip archived directory in main search
        if (entry.name === 'archived') continue;
        
        // Recursively search subdirectories
        const subDir = path.join(dir, entry.name);
        const result = await scanDirectory(subDir);
        if (result) return result;
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
    
    return null;
  }
  
  return scanDirectory(specsDir);
}
