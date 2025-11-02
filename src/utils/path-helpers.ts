import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Get next sequence number for a date directory
 */
export async function getNextSeq(dateDir: string, digits: number): Promise<string> {
  try {
    const entries = await fs.readdir(dateDir, { withFileTypes: true });
    const seqNumbers = entries
      .filter((e) => e.isDirectory() && /^\d{2,3}-.+/.test(e.name))
      .map((e) => parseInt(e.name.split('-')[0], 10))
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
 * 4. Search by spec name in date directories
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

  // Last resort: search for spec name in date directories
  const specName = specPath.replace(/^.*\//, ''); // Get last part
  try {
    const entries = await fs.readdir(specsDir, { withFileTypes: true });
    const dateDirs = entries.filter(e => e.isDirectory() && e.name !== 'archived');

    for (const dateDir of dateDirs) {
      const testPath = path.join(specsDir, dateDir.name, specName);
      try {
        await fs.access(testPath);
        return testPath;
      } catch {
        // Keep searching
      }
    }
  } catch {
    // Specs dir doesn't exist
  }

  return null;
}
