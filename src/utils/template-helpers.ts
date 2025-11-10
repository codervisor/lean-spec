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
  action: 'merge-ai' | 'merge-append' | 'overwrite' | 'skip',
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

    if (action === 'merge-ai' && file === 'AGENTS.md') {
      // Create consolidation prompt for AI to merge intelligently
      const existing = await fs.readFile(filePath, 'utf-8');
      let template = await fs.readFile(templateFilePath, 'utf-8');
      
      // Replace variables in template
      for (const [key, value] of Object.entries(variables)) {
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }

      // Create AI consolidation prompt file
      const promptPath = path.join(cwd, '.lean-spec', 'MERGE-AGENTS-PROMPT.md');
      const aiPrompt = `# AI Prompt: Consolidate AGENTS.md

## Task
Consolidate the existing AGENTS.md with LeanSpec instructions into a single, coherent document.

## Instructions
1. Read both documents below
2. Merge them intelligently:
   - Preserve ALL existing project-specific information (workflows, SOPs, architecture, conventions)
   - Integrate LeanSpec sections where they fit naturally
   - Remove redundancy and ensure coherent flow
   - Keep the tone and style consistent
3. Replace the existing AGENTS.md with the consolidated version

## Existing AGENTS.md
\`\`\`markdown
${existing}
\`\`\`

## LeanSpec Instructions to Integrate
\`\`\`markdown
${template}
\`\`\`

## Output
Create a single consolidated AGENTS.md that:
- Keeps all existing project context and workflows
- Adds LeanSpec commands and principles where appropriate
- Maintains clear structure and readability
- Removes any duplicate or conflicting guidance
`;

      await fs.mkdir(path.dirname(promptPath), { recursive: true });
      await fs.writeFile(promptPath, aiPrompt, 'utf-8');
      
      console.log(chalk.green(`✓ Created AI consolidation prompt`));
      console.log(chalk.cyan(`  → ${promptPath}`));
      console.log('');
      console.log(chalk.yellow('📝 Next steps:'));
      console.log(chalk.gray('  1. Open .lean-spec/MERGE-AGENTS-PROMPT.md'));
      console.log(chalk.gray('  2. Send it to your AI coding assistant (GitHub Copilot, Cursor, etc.)'));
      console.log(chalk.gray('  3. Let AI create the consolidated AGENTS.md'));
      console.log(chalk.gray('  4. Review and commit the result'));
      console.log('');
    } else if (action === 'merge-append' && file === 'AGENTS.md') {
      // Simple append: add LeanSpec section to existing AGENTS.md
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
      console.log(chalk.green(`✓ Appended LeanSpec section to ${file}`));
      console.log(chalk.yellow('  ⚠ Note: May be verbose. Consider consolidating later.'));
    } else if (action === 'overwrite') {
      // Backup existing file and create fresh one
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
      console.log(chalk.gray(`  💡 Your original content is preserved in ${file}.backup`));
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
