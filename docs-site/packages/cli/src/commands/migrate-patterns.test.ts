import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanDocuments } from './migrate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Migration pattern validation tests
 * 
 * These tests validate that our test fixtures accurately represent
 * the migration scenarios we're documenting and supporting.
 */
describe('Migration pattern validation', () => {
  const fixturesRoot = path.resolve(__dirname, '../../test-fixtures/migration-samples');

  describe('Pattern 1: spec-kit (Minimal Changes)', () => {
    const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');

    it('validates pre-migration structure matches spec-kit conventions', async () => {
      // spec-kit uses .specify/specs as root
      const exists = await fs.access(specKitRoot).then(() => true, () => false);
      expect(exists).toBe(true);

      const docs = await scanDocuments(specKitRoot);
      expect(docs.length).toBeGreaterThan(0);

      // Should already have numbered folders (###-name format)
      const paths = docs.map(d => d.path);
      const numberedPaths = paths.filter(p => /\/\d{3}-[a-z-]+\//.test(p));
      expect(numberedPaths.length).toBeGreaterThan(0);

      // Should use spec.md as main file
      const specMdFiles = docs.filter(d => d.name === 'spec.md');
      expect(specMdFiles.length).toBeGreaterThan(0);
    });

    it('identifies migration steps needed', async () => {
      const docs = await scanDocuments(specKitRoot);

      // Migration needs:
      // 1. Move .specify/specs → specs/
      // 2. Rename spec.md → README.md
      // 3. Add frontmatter (backfill from git)
      // 4. Keep other files as-is (plan.md, tasks.md, etc.)

      // Verify current structure
      const specMdCount = docs.filter(d => d.name === 'spec.md').length;
      expect(specMdCount).toBeGreaterThan(0);

      // Verify multi-file specs exist
      const taskMgmtDocs = docs.filter(d => d.path.includes('001-task-management'));
      expect(taskMgmtDocs.length).toBeGreaterThan(1); // Has spec.md + plan.md + tasks.md
    });

    it('verifies content preservation requirements', async () => {
      const specPath = path.join(specKitRoot, '001-task-management', 'spec.md');
      const content = await fs.readFile(specPath, 'utf-8');

      // Content should be preserved exactly (except frontmatter addition)
      expect(content).toContain('# Task Management');
      expect(content).toContain('## Overview');
      expect(content.length).toBeGreaterThan(500);

      // Should NOT have frontmatter yet
      expect(content.startsWith('---')).toBe(false);
    });
  });

  describe('Pattern 2: OpenSpec (Directory Reorganization)', () => {
    const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');

    it('validates split directory structure', async () => {
      const specsPath = path.join(openSpecRoot, 'specs');
      const archivePath = path.join(openSpecRoot, 'changes', 'archive');

      // Should have both active and archived directories
      const specsExists = await fs.access(specsPath).then(() => true, () => false);
      const archiveExists = await fs.access(archivePath).then(() => true, () => false);

      expect(specsExists).toBe(true);
      expect(archiveExists).toBe(true);

      // Should find specs in both
      const specsDocs = await scanDocuments(specsPath);
      const archiveDocs = await scanDocuments(archivePath);

      expect(specsDocs.length).toBe(3);
      expect(archiveDocs.length).toBe(1);
    });

    it('identifies migration steps needed', async () => {
      const specsPath = path.join(openSpecRoot, 'specs');
      const docs = await scanDocuments(specsPath);

      // Migration needs:
      // 1. Merge specs/ and changes/archive/ into single specs/ directory
      // 2. Add sequence numbers (001-, 002-, etc.)
      // 3. Rename spec.md → README.md
      // 4. Add frontmatter (backfill from git)
      // 5. Set archived specs to status: archived

      // Verify folders don't have numbers
      const paths = docs.map(d => d.path);
      const hasNumbers = paths.some(p => /\/\d{3}-/.test(p));
      expect(hasNumbers).toBe(false);

      // Verify all use spec.md
      expect(docs.every(d => d.name === 'spec.md')).toBe(true);
    });

    it('verifies archived spec should be marked complete/archived', async () => {
      const archivePath = path.join(openSpecRoot, 'changes', 'archive');
      const docs = await scanDocuments(archivePath);

      expect(docs.length).toBe(1);

      const archivedDoc = docs[0];
      const content = await fs.readFile(archivedDoc.path, 'utf-8');

      // Should indicate completion
      expect(content).toContain('OAuth');
      expect(content.length).toBeGreaterThan(500);

      // After migration, should be marked as status: complete or archived
    });

    it('verifies date-based archive folder needs conversion', async () => {
      const archivePath = path.join(openSpecRoot, 'changes', 'archive');
      const docs = await scanDocuments(archivePath);

      const archiveDoc = docs[0];

      // Should be in date-based folder (OpenSpec convention)
      expect(archiveDoc.path).toMatch(/\d{4}-\d{2}-\d{2}-/);

      // Migration should convert to numbered folder (LeanSpec convention)
      // changes/archive/2024-11-15-oauth-integration/ → specs/004-oauth-integration/
    });
  });

  describe('Pattern 3: ADR (Complete Restructuring)', () => {
    const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

    it('validates flat file structure', async () => {
      const docs = await scanDocuments(adrRoot);

      // All files should be in same directory (flat structure)
      const dirs = docs.map(d => path.dirname(d.path));
      const uniqueDirs = [...new Set(dirs)];

      expect(uniqueDirs.length).toBe(1);
      expect(docs.length).toBe(4);
    });

    it('identifies migration steps needed', async () => {
      const docs = await scanDocuments(adrRoot);

      // Migration needs:
      // 1. Create folder for each ADR (001-name/, 002-name/, etc.)
      // 2. Move file into folder as README.md
      // 3. Renumber sequentially (0001, 0042, 0105, 0203 → 001, 002, 003, 004)
      // 4. Parse ADR status and map to LeanSpec status
      // 5. Add frontmatter with metadata
      // 6. Add 'adr' tag to all specs

      // Verify sparse numbering
      const fileNames = docs.map(d => d.name).sort();
      const numbers = fileNames.map(name => {
        const match = name.match(/^(\d+)-/);
        return match ? parseInt(match[1], 10) : 0;
      });

      expect(numbers).toContain(1);
      expect(numbers).toContain(42);
      expect(numbers).toContain(105);
      expect(numbers).toContain(203);

      // Max number much larger than count indicates sparse numbering
      expect(Math.max(...numbers)).toBeGreaterThan(numbers.length * 10);
    });

    it('validates ADR status mapping requirements', async () => {
      const adrPath = path.join(adrRoot, '0001-use-microservices.md');
      const content = await fs.readFile(adrPath, 'utf-8');

      // Should have ADR structure
      expect(content).toContain('## Status');
      expect(content).toContain('Accepted');

      // ADR statuses need mapping:
      // "Accepted" → LeanSpec "complete"
      // "Proposed" → LeanSpec "planned"
      // "Superseded" → LeanSpec "archived"
      // "Deprecated" → LeanSpec "archived"

      // Should have consequences section (important for LeanSpec Notes)
      expect(content).toContain('## Consequences');
    });

    it('verifies ADR date extraction', async () => {
      const adrPath = path.join(adrRoot, '0001-use-microservices.md');
      const content = await fs.readFile(adrPath, 'utf-8');

      // ADRs typically have date in content
      const dateMatch = content.match(/Date:\s*(\d{4}-\d{2}-\d{2})/);
      expect(dateMatch).not.toBeNull();

      // This date should be used for created_at in frontmatter
      if (dateMatch) {
        const date = dateMatch[1];
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('identifies ADR content section mapping', async () => {
      const docs = await scanDocuments(adrRoot);

      for (const doc of docs) {
        const content = await fs.readFile(doc.path, 'utf-8');

        // ADR sections should map to LeanSpec sections:
        // Context → Overview
        // Decision → Design
        // Consequences → Notes (positive + negative)

        expect(content).toContain('## Context'); // Maps to Overview
        expect(content).toContain('## Decision'); // Maps to Design
        expect(content).toContain('## Consequences'); // Maps to Notes

        // Some ADRs have subsections under Consequences
        // "Positive" and "Negative" should be preserved
      }
    });
  });

  describe('Migration guide completeness', () => {
    it('validates all migration guides exist', async () => {
      const expectedFiles = [
        'README.md',
        'QUICK-START.md',
        'EXPECTED-OUTPUT.md',
        'SUMMARY.md',
        'INDEX.md',
      ];

      for (const file of expectedFiles) {
        const filePath = path.join(fixturesRoot, file);
        const exists = await fs.access(filePath).then(() => true, () => false);
        expect(exists).toBe(true);

        // Should have substantial content
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content.length).toBeGreaterThan(500);
      }
    });

    it('validates expected output examples for each pattern', async () => {
      const expectedPath = path.join(fixturesRoot, 'EXPECTED-OUTPUT.md');
      const content = await fs.readFile(expectedPath, 'utf-8');

      // Should document all three patterns
      expect(content).toContain('OpenSpec → LeanSpec');
      expect(content).toContain('spec-kit → LeanSpec');
      expect(content).toContain('ADR → LeanSpec');

      // Should show before/after for each
      expect(content).toContain('Before Migration');
      expect(content).toContain('After Migration');

      // Should include frontmatter examples
      expect(content).toContain('status:');
      expect(content).toContain('priority:');
      expect(content).toContain('tags:');
    });

    it('validates quick-start guide has hands-on tutorials', async () => {
      const quickStartPath = path.join(fixturesRoot, 'QUICK-START.md');
      const content = await fs.readFile(quickStartPath, 'utf-8');

      // Should have step-by-step tutorials
      expect(content).toMatch(/Option 1:/i);
      expect(content).toMatch(/Option 2:/i);
      expect(content).toMatch(/Option 3:/i);

      // Should include actual commands
      expect(content).toContain('lean-spec');
      expect(content).toContain('```bash');
    });

    it('validates README has comprehensive strategy guide', async () => {
      const readmePath = path.join(fixturesRoot, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');

      // Should cover all three samples
      expect(content).toContain('spec-kit');
      expect(content).toContain('OpenSpec');
      expect(content).toContain('ADR');

      // Should explain migration complexity
      expect(content).toMatch(/easiest|moderate|complex/i);

      // Should have migration commands
      expect(content).toContain('lean-spec migrate');
    });
  });

  describe('Sample data quality', () => {
    it('validates all specs have realistic content', async () => {
      const samples = [
        path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs'),
        path.join(fixturesRoot, 'openspec-sample', 'openspec'),
        path.join(fixturesRoot, 'adr-sample', 'docs', 'adr'),
      ];

      for (const samplePath of samples) {
        const docs = await scanDocuments(samplePath);
        expect(docs.length).toBeGreaterThan(0);

        for (const doc of docs) {
          // Each spec should have meaningful content
          expect(doc.size).toBeGreaterThan(200);

          const content = await fs.readFile(doc.path, 'utf-8');

          // Should have title
          expect(content).toMatch(/^#\s+/m);

          // Should have multiple sections
          const headingCount = (content.match(/^##\s+/gm) || []).length;
          expect(headingCount).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('validates specs cover diverse topics', async () => {
      const allDocs = await scanDocuments(fixturesRoot);
      const allContent = await Promise.all(
        allDocs.map(async doc => ({
          path: doc.path,
          content: await fs.readFile(doc.path, 'utf-8'),
        }))
      );

      // Should cover different domains
      const topics = {
        auth: allContent.some(d => d.content.toLowerCase().includes('authentication')),
        api: allContent.some(d => d.content.toLowerCase().includes('api')),
        infrastructure: allContent.some(d => d.content.toLowerCase().includes('kubernetes') || 
                                        d.content.toLowerCase().includes('microservices')),
        tasks: allContent.some(d => d.content.toLowerCase().includes('task')),
        notifications: allContent.some(d => d.content.toLowerCase().includes('notification')),
      };

      // Should have variety
      const topicCount = Object.values(topics).filter(Boolean).length;
      expect(topicCount).toBeGreaterThanOrEqual(4);
    });

    it('validates technical depth in samples', async () => {
      const samplePaths = [
        path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs', '001-task-management', 'spec.md'),
        path.join(fixturesRoot, 'openspec-sample', 'openspec', 'specs', 'auth', 'spec.md'),
        path.join(fixturesRoot, 'adr-sample', 'docs', 'adr', '0001-use-microservices.md'),
      ];

      for (const samplePath of samplePaths) {
        const content = await fs.readFile(samplePath, 'utf-8');

        // Should have code blocks or technical details
        const hasCodeBlocks = content.includes('```');
        const hasTechnicalTerms = /API|endpoint|database|service|interface|implementation/i.test(content);

        expect(hasCodeBlocks || hasTechnicalTerms).toBe(true);

        // Should discuss design/architecture
        const hasDesignContent = /design|architecture|approach|solution|implementation/i.test(content);
        expect(hasDesignContent).toBe(true);
      }
    });
  });

  describe('Migration command compatibility', () => {
    it('validates scanDocuments finds all expected files', async () => {
      const specKitDocs = await scanDocuments(
        path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs')
      );
      const openSpecDocs = await scanDocuments(
        path.join(fixturesRoot, 'openspec-sample', 'openspec')
      );
      const adrDocs = await scanDocuments(
        path.join(fixturesRoot, 'adr-sample', 'docs', 'adr')
      );

      // Verify expected counts
      expect(specKitDocs.length).toBeGreaterThan(3); // Multiple files per spec
      expect(openSpecDocs.length).toBe(4); // 3 active + 1 archived
      expect(adrDocs.length).toBe(4); // 4 ADRs
    });

    it('validates no unexpected files are scanned', async () => {
      const allDocs = await scanDocuments(fixturesRoot);

      // Should only include markdown files
      expect(allDocs.every(d => d.name.endsWith('.md') || d.name.endsWith('.markdown'))).toBe(true);

      // Should not include hidden directories
      expect(allDocs.every(d => !d.path.includes('/.git/'))).toBe(true);
      expect(allDocs.every(d => !d.path.includes('/node_modules/'))).toBe(true);

      // Should not include YAML/JSON/other config files
      expect(allDocs.every(d => !d.name.endsWith('.yml'))).toBe(true);
      expect(allDocs.every(d => !d.name.endsWith('.yaml'))).toBe(true);
      expect(allDocs.every(d => !d.name.endsWith('.json'))).toBe(true);
    });

    it('validates document metadata is populated', async () => {
      const docs = await scanDocuments(fixturesRoot);

      for (const doc of docs) {
        // Each document should have required metadata
        expect(doc.path).toBeTruthy();
        expect(doc.name).toBeTruthy();
        expect(doc.size).toBeGreaterThan(0);

        // Path should be absolute
        expect(path.isAbsolute(doc.path)).toBe(true);

        // Name should match file in path
        expect(doc.path).toContain(doc.name);
      }
    });
  });

  describe('Cross-pattern validation', () => {
    it('validates each pattern has unique challenges', async () => {
      const specKitRoot = path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs');
      const openSpecRoot = path.join(fixturesRoot, 'openspec-sample', 'openspec');
      const adrRoot = path.join(fixturesRoot, 'adr-sample', 'docs', 'adr');

      const specKitDocs = await scanDocuments(specKitRoot);
      const openSpecDocs = await scanDocuments(openSpecRoot);
      const adrDocs = await scanDocuments(adrRoot);

      // spec-kit: Already has numbered folders
      const specKitHasNumbers = specKitDocs.some(d => /\/\d{3}-/.test(d.path));
      expect(specKitHasNumbers).toBe(true);

      // OpenSpec: Split directories
      const openSpecInSpecs = openSpecDocs.filter(d => d.path.includes('/specs/'));
      const openSpecInArchive = openSpecDocs.filter(d => d.path.includes('/archive/'));
      expect(openSpecInSpecs.length).toBeGreaterThan(0);
      expect(openSpecInArchive.length).toBeGreaterThan(0);

      // ADR: Flat structure
      const adrDirs = [...new Set(adrDocs.map(d => path.dirname(d.path)))];
      expect(adrDirs.length).toBe(1);
    });

    it('validates consistent quality across all samples', async () => {
      const allSamples = [
        path.join(fixturesRoot, 'spec-kit-sample', '.specify', 'specs'),
        path.join(fixturesRoot, 'openspec-sample', 'openspec'),
        path.join(fixturesRoot, 'adr-sample', 'docs', 'adr'),
      ];

      for (const samplePath of allSamples) {
        const docs = await scanDocuments(samplePath);

        // All samples should have multiple specs
        expect(docs.length).toBeGreaterThan(0);

        // All specs should have substantial content
        for (const doc of docs) {
          expect(doc.size).toBeGreaterThan(200);

          const content = await fs.readFile(doc.path, 'utf-8');
          expect(content.trim().length).toBeGreaterThan(200);

          // Should have clear structure (headings)
          expect(content).toMatch(/^#/m);
        }
      }
    });
  });
});
