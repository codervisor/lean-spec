import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { checkSpecs, autoCheckIfEnabled } from './commands/check.js';
import { createSpec } from './commands/create.js';
import { saveConfig } from './config.js';

describe('checkSpecs', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create temporary directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lspec-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    // Initialize basic config
    await fs.mkdir(path.join(tmpDir, '.lean-spec', 'templates'), { recursive: true });
    await saveConfig({
      template: 'spec-template.md',
      templates: { default: 'spec-template.md' },
      specsDir: 'specs',
      structure: {
        pattern: 'flat',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      features: {
        aiAgents: true,
        examples: true,
      },
    });

    // Create template
    const templateContent = `---
status: planned
created: {date}
---

# {name}

## Overview
<!-- What are we solving? Why now? -->
`;
    await fs.writeFile(
      path.join(tmpDir, '.lean-spec', 'templates', 'spec-template.md'),
      templateContent,
      'utf-8'
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should detect duplicate sequences', async () => {
    // Create two specs with same sequence
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(specsDir, '001-feature-a'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '001-feature-a', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature A',
      'utf-8'
    );
    await fs.mkdir(path.join(specsDir, '001-feature-b'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '001-feature-b', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature B',
      'utf-8'
    );

    const hasConflicts = await checkSpecs({ silent: true });
    expect(hasConflicts).toBe(false); // Returns false when conflicts exist
  });

  it('should pass when no conflicts', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(specsDir, '001-feature-a'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '001-feature-a', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature A',
      'utf-8'
    );
    await fs.mkdir(path.join(specsDir, '002-feature-b'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '002-feature-b', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature B',
      'utf-8'
    );

    const hasConflicts = await checkSpecs({ silent: true });
    expect(hasConflicts).toBe(true); // Returns true when no conflicts
  });

  it('should respect silent mode', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(specsDir, '001-feature-a'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '001-feature-a', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature A',
      'utf-8'
    );
    await fs.mkdir(path.join(specsDir, '001-feature-b'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '001-feature-b', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature B',
      'utf-8'
    );

    // Silent mode should not output anything
    const hasConflicts = await checkSpecs({ silent: true });
    expect(hasConflicts).toBe(false);
  });

  it('should handle date prefix in conflict detection', async () => {
    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(specsDir, '20251103-001-feature-a'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '20251103-001-feature-a', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature A',
      'utf-8'
    );
    await fs.mkdir(path.join(specsDir, '20251103-001-feature-b'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '20251103-001-feature-b', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature B',
      'utf-8'
    );

    const hasConflicts = await checkSpecs({ silent: true });
    expect(hasConflicts).toBe(false); // Should detect conflict
  });
});

describe('autoCheckIfEnabled', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lspec-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    await fs.mkdir(path.join(tmpDir, '.lean-spec', 'templates'), { recursive: true });
    const templateContent = `---
status: planned
created: {date}
---

# {name}

## Overview
`;
    await fs.writeFile(
      path.join(tmpDir, '.lean-spec', 'templates', 'spec-template.md'),
      templateContent,
      'utf-8'
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should skip check when autoCheck is false', async () => {
    await saveConfig({
      template: 'spec-template.md',
      templates: { default: 'spec-template.md' },
      specsDir: 'specs',
      autoCheck: false,
      structure: {
        pattern: 'flat',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      features: {
        aiAgents: true,
        examples: true,
      },
    });

    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(specsDir, '001-feature-a'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '001-feature-a', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature A',
      'utf-8'
    );
    await fs.mkdir(path.join(specsDir, '001-feature-b'), { recursive: true });
    await fs.writeFile(
      path.join(specsDir, '001-feature-b', 'README.md'),
      '---\nstatus: planned\ncreated: "2025-11-03"\n---\n\n# Feature B',
      'utf-8'
    );

    // Should not throw or output anything
    await autoCheckIfEnabled();
  });

  it('should run check when autoCheck is not disabled', async () => {
    await saveConfig({
      template: 'spec-template.md',
      templates: { default: 'spec-template.md' },
      specsDir: 'specs',
      structure: {
        pattern: 'flat',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      features: {
        aiAgents: true,
        examples: true,
      },
    });

    const specsDir = path.join(tmpDir, 'specs');
    await fs.mkdir(specsDir, { recursive: true });

    // Should not throw
    await autoCheckIfEnabled();
  });
});

describe('createSpec with --no-prefix', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lspec-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);

    await fs.mkdir(path.join(tmpDir, '.lean-spec', 'templates'), { recursive: true });
    
    const templateContent = `---
status: planned
created: {date}
---

# {name}

## Overview
`;
    await fs.writeFile(
      path.join(tmpDir, '.lean-spec', 'templates', 'spec-template.md'),
      templateContent,
      'utf-8'
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should skip prefix when noPrefix flag is true', async () => {
    await saveConfig({
      template: 'spec-template.md',
      templates: { default: 'spec-template.md' },
      specsDir: 'specs',
      structure: {
        pattern: 'flat',
        prefix: '{YYYYMMDD}-',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      features: {
        aiAgents: true,
        examples: true,
      },
    });

    await createSpec('test-feature', { noPrefix: true });

    const specDir = path.join(tmpDir, 'specs', '001-test-feature');
    const exists = await fs.access(specDir).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should apply date prefix by default', async () => {
    await saveConfig({
      template: 'spec-template.md',
      templates: { default: 'spec-template.md' },
      specsDir: 'specs',
      structure: {
        pattern: 'flat',
        prefix: '{YYYYMMDD}-',
        dateFormat: 'YYYYMMDD',
        sequenceDigits: 3,
        defaultFile: 'README.md',
      },
      features: {
        aiAgents: true,
        examples: true,
      },
    });

    await createSpec('test-feature');

    // Check that directory with date prefix exists
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;
    
    const specDir = path.join(tmpDir, 'specs', `${datePrefix}-001-test-feature`);
    const exists = await fs.access(specDir).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});
