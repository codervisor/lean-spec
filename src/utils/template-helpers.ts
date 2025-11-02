import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';

/**
 * Detect common system prompt files in a directory
 */
export async function detectExistingSystemPrompts(cwd: string): Promise<string[]> {
  const commonFiles = [
    'AGENTS.md',
    '.cursorrules',
    '.github/copilot-instructions.md',
  ];

  const found: string[] = [];
  for (const file of commonFiles) {
    try {
      await fs.access(path.join(cwd, file));
      found.push(file);
    } catch {
      // File doesn't exist
    }
  }
  return found;
}

/**
 * Handle existing system prompt files based on user's chosen action
 */
export async function handleExistingFiles(
  action: 'merge' | 'backup' | 'skip',
  existingFiles: string[],
  templateDir: string,
  cwd: string,
  variables: Record<string, string> = {}
): Promise<void> {
  for (const file of existingFiles) {
    const filePath = path.join(cwd, file);
    const templateFilePath = path.join(templateDir, 'files', file);

    // Check if template has this file
    try {
      await fs.access(templateFilePath);
    } catch {
      // Template doesn't have this file, skip
      continue;
    }

    if (action === 'merge' && file === 'AGENTS.md') {
      // Append LeanSpec section to existing AGENTS.md
      const existing = await fs.readFile(filePath, 'utf-8');
      let template = await fs.readFile(templateFilePath, 'utf-8');
      
      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }

      const merged = `${existing}

---

## LeanSpec Integration

${template.split('\n').slice(1).join('\n')}`;

      await fs.writeFile(filePath, merged, 'utf-8');
      console.log(chalk.green(`✓ Merged LeanSpec section into ${file}`));
    } else if (action === 'backup') {
      // Backup existing file
      const backupPath = `${filePath}.backup`;
      await fs.rename(filePath, backupPath);
      console.log(chalk.yellow(`✓ Backed up ${file} → ${file}.backup`));

      // Copy template file with variable substitution
      let content = await fs.readFile(templateFilePath, 'utf-8');
      
      // Replace variables in content
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
      
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(chalk.green(`✓ Created new ${file}`));
    }
    // If skip, do nothing with this file
  }
}

/**
 * Recursively copy directory with variable substitution and skip list
 */
export async function copyDirectory(
  src: string,
  dest: string,
  skipFiles: string[] = [],
  variables: Record<string, string> = {}
): Promise<void> {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Check if this file should be skipped
    if (skipFiles.includes(entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, skipFiles, variables);
    } else {
      // Only copy if file doesn't exist
      try {
        await fs.access(destPath);
        // File exists, skip it
      } catch {
        // File doesn't exist, copy it with variable substitution
        let content = await fs.readFile(srcPath, 'utf-8');
        
        // Replace variables in content
        for (const [key, value] of Object.entries(variables)) {
          content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        
        await fs.writeFile(destPath, content, 'utf-8');
      }
    }
  }
}

/**
 * Get project name from package.json or directory name
 */
export async function getProjectName(cwd: string): Promise<string> {
  try {
    const packageJsonPath = path.join(cwd, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);
    if (pkg.name) {
      return pkg.name;
    }
  } catch {
    // package.json not found or invalid
  }
  
  // Fallback to directory name
  return path.basename(cwd);
}
