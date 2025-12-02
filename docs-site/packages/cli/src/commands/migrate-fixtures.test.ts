import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanDocuments } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Migration with test fixtures', () => {
  const fixturesRoot = path.resolve(__dirname, '../../test-fixtures/migration-samples');

  describe('spec-kit sample', () => {
    const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');

    it('should find all spec-kit documents', async () => {
      const docs = await scanDocuments(specKitRoot);

      // Should find spec.md files and other markdown files
      expect(docs.length).toBeGreaterThan(0);
      
      // Check for specific known files
      const fileNames = docs.map(d => d.name);
      expect(fileNames).toContain('spec.md');
    });

    it('should find spec.md in task-management folder', async () => {
      const taskMgmtPath = path.join(specKitRoot, '001-task-management');
      const docs = await scanDocuments(taskMgmtPath);

      // Should find spec.md, plan.md, tasks.md
      expect(docs.length).toBeGreaterThanOrEqual(3);
      
      const fileNames = docs.map(d => d.name);
      expect(fileNames).toContain('spec.md');
      expect(fileNames).toContain('plan.md');
      expect(fileNames).toContain('tasks.md');
    });

    it('should find all three spec folders', async () => {
      const docs = await scanDocuments(specKitRoot);
      
      // spec-kit has 3 specs: 001-task-management, 002-user-authentication, 003-notifications
      // Each has at least 1 markdown file
      const paths = docs.map(d => d.path);
      
      expect(paths.some(p => p.includes('001-task-management'))).toBe(true);
      expect(paths.some(p => p.includes('002-user-authentication'))).toBe(true);
      expect(paths.some(p => p.includes('003-notifications'))).toBe(true);
    });

    it('should skip YAML files in contracts directory', async () => {
      const docs = await scanDocuments(specKitRoot);
      
      // Should not include .yml files
      const fileNames = docs.map(d => d.name);
      expect(fileNames.every(name => !name.endsWith('.yml'))).toBe(true);
      expect(fileNames.every(name => !name.endsWith('.yaml'))).toBe(true);
    });

    it('should detect multi-file specs', async () => {
      const taskMgmtPath = path.join(specKitRoot, '001-task-management');
      const docs = await scanDocuments(taskMgmtPath);

      // task-management has multiple markdown files (complex spec)
      expect(docs.length).toBeGreaterThan(1);
    });

    it('should detect single-file specs', async () => {
      const authPath = path.join(specKitRoot, '002-user-authentication');
      const docs = await scanDocuments(authPath);

      // user-authentication has only spec.md (simple spec)
      expect(docs.length).toBe(1);
      expect(docs[0].name).toBe('spec.md');
    });
  });

  describe('OpenSpec sample', () => {
    const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');

    it('should find all OpenSpec documents', async () => {
      const docs = await scanDocuments(openSpecRoot);

      // Should find 4 specs: auth, api-gateway, user-management, oauth-integration (archived)
      expect(docs.length).toBe(4);
      
      const fileNames = docs.map(d => d.name);
      expect(fileNames.every(name => name === 'spec.md')).toBe(true);
    });

    it('should find specs in specs directory', async () => {
      const specsPath = path.join(openSpecRoot, 'specs');
      const docs = await scanDocuments(specsPath);

      // Should find 3 active specs
      expect(docs.length).toBe(3);
      
      const paths = docs.map(d => d.path);
      expect(paths.some(p => p.includes('auth'))).toBe(true);
      expect(paths.some(p => p.includes('api-gateway'))).toBe(true);
      expect(paths.some(p => p.includes('user-management'))).toBe(true);
    });

    it('should find archived specs in changes/archive', async () => {
      const archivePath = path.join(openSpecRoot, 'changes', 'archive');
      const docs = await scanDocuments(archivePath);

      // Should find 1 archived spec
      expect(docs.length).toBe(1);
      
      const paths = docs.map(d => d.path);
      expect(paths.some(p => p.includes('oauth-integration'))).toBe(true);
    });

    it('should identify need for directory merging', async () => {
      // OpenSpec has split directories that need merging
      const specsPath = path.join(openSpecRoot, 'specs');
      const archivePath = path.join(openSpecRoot, 'changes', 'archive');
      
      const specsCount = (await scanDocuments(specsPath)).length;
      const archiveCount = (await scanDocuments(archivePath)).length;
      
      // Should have documents in both directories
      expect(specsCount).toBeGreaterThan(0);
      expect(archiveCount).toBeGreaterThan(0);
      
      // Total should be 4
      expect(specsCount + archiveCount).toBe(4);
    });

    it('should verify all specs use same filename', async () => {
      const docs = await scanDocuments(openSpecRoot);

      // All OpenSpec specs use 'spec.md'
      const fileNames = docs.map(d => d.name);
      expect(fileNames.every(name => name === 'spec.md')).toBe(true);
    });
  });

  describe('ADR sample', () => {
    const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

    it('should find all ADR documents', async () => {
      const docs = await scanDocuments(adrRoot);

      // Should find 4 ADRs
      expect(docs.length).toBe(4);
    });

    it('should find ADRs with numeric prefixes', async () => {
      const docs = await scanDocuments(adrRoot);
      
      const fileNames = docs.map(d => d.name);
      expect(fileNames).toContain('0001-use-microservices.md');
      expect(fileNames).toContain('0042-event-sourcing-audit.md');
      expect(fileNames).toContain('0105-graphql-api.md');
      expect(fileNames).toContain('0203-kubernetes-deployment.md');
    });

    it('should identify need for renumbering', async () => {
      const docs = await scanDocuments(adrRoot);
      
      // ADR numbers are sparse (0001, 0042, 0105, 0203)
      // Need to be renumbered to (001, 002, 003, 004)
      const fileNames = docs.map(d => d.name).sort();
      
      // Extract numbers
      const numbers = fileNames.map(name => {
        const match = name.match(/^(\d+)-/);
        return match ? parseInt(match[1], 10) : 0;
      });
      
      // Should have gaps in numbering
      expect(numbers).toContain(1);
      expect(numbers).toContain(42);
      expect(numbers).toContain(105);
      expect(numbers).toContain(203);
      
      // Sequential numbering would be different
      const sequential = [1, 2, 3, 4];
      expect(numbers).not.toEqual(sequential);
    });

    it('should identify flat file structure', async () => {
      const docs = await scanDocuments(adrRoot);
      
      // All ADRs are in flat structure (no subdirectories per spec)
      const paths = docs.map(d => path.dirname(d.path));
      const uniqueDirs = [...new Set(paths)];
      
      // All should be in same directory
      expect(uniqueDirs.length).toBe(1);
    });

    it('should verify ADR file sizes are substantial', async () => {
      const docs = await scanDocuments(adrRoot);
      
      // ADRs should have meaningful content (>100 bytes)
      docs.forEach(doc => {
        expect(doc.size).toBeGreaterThan(100);
      });
    });
  });

  describe('Cross-sample comparisons', () => {
    it('should find different total counts across samples', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

      const specKitDocs = await scanDocuments(specKitRoot);
      const openSpecDocs = await scanDocuments(openSpecRoot);
      const adrDocs = await scanDocuments(adrRoot);

      // Different counts indicate different complexity levels
      expect(specKitDocs.length).toBeGreaterThan(0);
      expect(openSpecDocs.length).toBe(4); // Known count
      expect(adrDocs.length).toBe(4); // Known count
      
      // spec-kit has more files due to multi-file specs
      expect(specKitDocs.length).toBeGreaterThan(openSpecDocs.length);
    });

    it('should identify different naming conventions', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

      const specKitDocs = await scanDocuments(specKitRoot);
      const openSpecDocs = await scanDocuments(openSpecRoot);
      const adrDocs = await scanDocuments(adrRoot);

      // spec-kit: spec.md, plan.md, tasks.md
      const specKitNames = new Set(specKitDocs.map(d => d.name));
      expect(specKitNames.has('spec.md')).toBe(true);

      // OpenSpec: all spec.md
      const openSpecNames = new Set(openSpecDocs.map(d => d.name));
      expect(openSpecNames.size).toBe(1);
      expect(openSpecNames.has('spec.md')).toBe(true);

      // ADR: numbered files with descriptive names
      const adrNames = adrDocs.map(d => d.name);
      expect(adrNames.every(name => /^\d{4}-.*\.md$/.test(name))).toBe(true);
    });

    it('should identify different directory structures', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

      const specKitDocs = await scanDocuments(specKitRoot);
      const openSpecDocs = await scanDocuments(openSpecRoot);
      const adrDocs = await scanDocuments(adrRoot);

      // spec-kit: already has numbered folders
      const specKitPaths = specKitDocs.map(d => d.path);
      expect(specKitPaths.some(p => /\/\d{3}-/.test(p))).toBe(true);

      // OpenSpec: folders without numbers
      const openSpecPaths = openSpecDocs.map(d => d.path);
      expect(openSpecPaths.some(p => /\/auth\//.test(p))).toBe(true);
      expect(openSpecPaths.some(p => /\/\d{3}-/.test(p))).toBe(false);

      // ADR: flat structure with numbered files
      const adrPaths = adrDocs.map(d => path.dirname(d.path));
      const uniqueAdrDirs = [...new Set(adrPaths)];
      expect(uniqueAdrDirs.length).toBe(1); // All in same dir
    });
  });

  describe('Migration complexity indicators', () => {
    it('should identify spec-kit as easiest migration', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');
      const docs = await scanDocuments(specKitRoot);
      const paths = docs.map(d => d.path);

      // Already has numbered folders (###-name format)
      const hasNumberedFolders = paths.some(p => /\/\d{3}-/.test(p));
      expect(hasNumberedFolders).toBe(true);

      // Uses spec.md (just needs rename to README.md)
      const hasSpecMd = docs.some(d => d.name === 'spec.md');
      expect(hasSpecMd).toBe(true);

      // Complexity score: LOW (minimal changes needed)
    });

    it('should identify OpenSpec as moderate complexity', async () => {
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');
      const specsPath = path.join(openSpecRoot, 'specs');
      const archivePath = path.join(openSpecRoot, 'changes', 'archive');

      const specsDocs = await scanDocuments(specsPath);
      const archiveDocs = await scanDocuments(archivePath);

      // Has split directories (needs merging)
      expect(specsDocs.length).toBeGreaterThan(0);
      expect(archiveDocs.length).toBeGreaterThan(0);

      // No numbered folders (needs numbering)
      const paths = [...specsDocs, ...archiveDocs].map(d => d.path);
      const hasNumberedFolders = paths.some(p => /\/\d{3}-/.test(p));
      expect(hasNumberedFolders).toBe(false);

      // Complexity score: MODERATE (directory reorganization needed)
    });

    it('should identify ADR as highest complexity', async () => {
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');
      const docs = await scanDocuments(adrRoot);

      // Flat structure (needs folder creation)
      const dirs = docs.map(d => path.dirname(d.path));
      const uniqueDirs = [...new Set(dirs)];
      expect(uniqueDirs.length).toBe(1);

      // Sparse numbering (needs complete renumbering)
      const fileNames = docs.map(d => d.name);
      const hasGaps = fileNames.some(name => {
        const match = name.match(/^(\d+)-/);
        return match && parseInt(match[1], 10) > 10;
      });
      expect(hasGaps).toBe(true);

      // Single files that need to become folders
      const paths = docs.map(d => d.path);
      expect(paths.every(p => p.endsWith('.md'))).toBe(true);

      // Complexity score: HIGH (complete reorganization needed)
    });
  });

  describe('Content validation', () => {
    it('should verify spec-kit content has frontmatter structure', async () => {
      const specPath = path.join(
        fixturesRoot,
        'spec-kit-sample',
        '.specify',
        'specs',
        '001-task-management',
        'spec.md'
      );

      const content = await fs.readFile(specPath, 'utf-8');

      // Should have markdown headings
      expect(content).toContain('# Task Management');
      expect(content).toContain('## Overview');

      // Should have substantial content
      expect(content.length).toBeGreaterThan(500);
    });

    it('should verify OpenSpec content structure', async () => {
      const specPath = path.join(
        fixturesRoot,
        'openspec-sample',
        'openspec',
        'specs',
        'auth',
        'spec.md'
      );

      const content = await fs.readFile(specPath, 'utf-8');

      // Should have standard sections
      expect(content).toContain('# User Authentication');
      expect(content).toContain('## Overview');
      expect(content).toContain('## Problem Statement');

      // Should have technical content
      expect(content.length).toBeGreaterThan(500);
    });

    it('should verify ADR content has decision structure', async () => {
      const adrPath = path.join(
        fixturesRoot,
        'adr-sample',
        'docs',
        'adr',
        '0001-use-microservices.md'
      );

      const content = await fs.readFile(adrPath, 'utf-8');

      // Should have ADR structure
      expect(content).toContain('# 1. Use Microservices');
      expect(content).toContain('## Status');
      expect(content).toContain('## Context');
      expect(content).toContain('## Decision');
      expect(content).toContain('## Consequences');

      // Should indicate status
      expect(content).toContain('Accepted');

      // Should have substantial rationale
      expect(content.length).toBeGreaterThan(500);
    });

    it('should verify all samples have unique content', async () => {
      const specKitPath = path.join(
        fixturesRoot,
        'spec-kit-sample',
        '.specify',
        'specs',
        '001-task-management',
        'spec.md'
      );
      const openSpecPath = path.join(
        fixturesRoot,
        'openspec-sample',
        'openspec',
        'specs',
        'auth',
        'spec.md'
      );
      const adrPath = path.join(
        fixturesRoot,
        'adr-sample',
        'docs',
        'adr',
        '0001-use-microservices.md'
      );

      const specKitContent = await fs.readFile(specKitPath, 'utf-8');
      const openSpecContent = await fs.readFile(openSpecPath, 'utf-8');
      const adrContent = await fs.readFile(adrPath, 'utf-8');

      // All should be different
      expect(specKitContent).not.toBe(openSpecContent);
      expect(openSpecContent).not.toBe(adrContent);
      expect(adrContent).not.toBe(specKitContent);

      // All should have meaningful content
      expect(specKitContent.length).toBeGreaterThan(500);
      expect(openSpecContent.length).toBeGreaterThan(500);
      expect(adrContent.length).toBeGreaterThan(500);
    });
  });

  describe('Migration guide validation', () => {
    it('should have comprehensive documentation', async () => {
      const readmePath = path.join(fixturesRoot, 'README.md');
      const quickStartPath = path.join(fixturesRoot, 'QUICK-START.md');
      const expectedPath = path.join(fixturesRoot, 'EXPECTED-OUTPUT.md');

      // All guide files should exist
      await expect(fs.access(readmePath)).resolves.toBeUndefined();
      await expect(fs.access(quickStartPath)).resolves.toBeUndefined();
      await expect(fs.access(expectedPath)).resolves.toBeUndefined();

      // Should have substantial content
      const readmeContent = await fs.readFile(readmePath, 'utf-8');
      const quickStartContent = await fs.readFile(quickStartPath, 'utf-8');
      const expectedContent = await fs.readFile(expectedPath, 'utf-8');

      expect(readmeContent.length).toBeGreaterThan(1000);
      expect(quickStartContent.length).toBeGreaterThan(1000);
      expect(expectedContent.length).toBeGreaterThan(1000);
    });

    it('should reference all three sample types', async () => {
      const readmePath = path.join(fixturesRoot, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');

      // Should mention all sample types
      expect(content).toContain('spec-kit');
      expect(content).toContain('OpenSpec');
      expect(content).toContain('ADR');
    });

    it('should provide expected output for each sample', async () => {
      const expectedPath = path.join(fixturesRoot, 'EXPECTED-OUTPUT.md');
      const content = await fs.readFile(expectedPath, 'utf-8');

      // Should have migration output for each
      expect(content).toContain('OpenSpec → LeanSpec');
      expect(content).toContain('spec-kit → LeanSpec');
      expect(content).toContain('ADR → LeanSpec');

      // Should show before/after structure
      expect(content).toContain('Before Migration');
      expect(content).toContain('After Migration');
    });
  });
});
