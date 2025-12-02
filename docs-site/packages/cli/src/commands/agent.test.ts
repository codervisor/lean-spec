/**
 * Tests for agent command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { listAgents, showAgentStatus } from './agent.js';

describe('Agent Command', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temp directory for test files
    testDir = await mkdtemp(path.join(tmpdir(), 'lean-spec-agent-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);

    // Create basic LeanSpec structure
    await fs.mkdir(path.join(testDir, '.lean-spec', 'templates'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'specs'), { recursive: true });

    // Create config file
    await fs.writeFile(
      path.join(testDir, '.lean-spec', 'config.json'),
      JSON.stringify({
        template: 'spec-template.md',
        specsDir: 'specs',
        structure: {
          pattern: 'flat',
          prefix: '',
          dateFormat: 'YYYYMMDD',
          sequenceDigits: 3,
          defaultFile: 'README.md',
        },
        features: {
          aiAgents: true,
        },
      })
    );

    // Create template file
    await fs.writeFile(
      path.join(testDir, '.lean-spec', 'templates', 'spec-template.md'),
      `---
status: planned
created: '{date}'
---

# {name}

## Overview
`
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('listAgents', () => {
    it('should list available agents as JSON', async () => {
      const originalLog = console.log;
      let output = '';
      console.log = (...args: any[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await listAgents({ json: true });
        const agents = JSON.parse(output.trim());
        
        // Check that default agents are present
        expect(agents).toHaveProperty('claude');
        expect(agents).toHaveProperty('copilot');
        expect(agents).toHaveProperty('aider');
        expect(agents).toHaveProperty('gh-coding');
        
        // Check agent structure
        expect(agents.claude).toHaveProperty('type', 'cli');
        expect(agents.claude).toHaveProperty('available');
        expect(agents.claude).toHaveProperty('isDefault');
        
        expect(agents['gh-coding']).toHaveProperty('type', 'cloud');
      } finally {
        console.log = originalLog;
      }
    });

    it('should indicate default agent', async () => {
      const originalLog = console.log;
      let output = '';
      console.log = (...args: any[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await listAgents({ json: true });
        const agents = JSON.parse(output.trim());
        
        // claude is the default agent
        expect(agents.claude.isDefault).toBe(true);
      } finally {
        console.log = originalLog;
      }
    });
  });

  describe('showAgentStatus', () => {
    it('should show no active sessions when empty', async () => {
      const originalLog = console.log;
      let output = '';
      console.log = (...args: any[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await showAgentStatus(undefined, { json: false });
        expect(output).toContain('No active agent sessions');
      } finally {
        console.log = originalLog;
      }
    });

    it('should output empty object for JSON when no sessions', async () => {
      const originalLog = console.log;
      let output = '';
      console.log = (...args: any[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await showAgentStatus(undefined, { json: true });
        const parsed = JSON.parse(output.trim());
        expect(parsed).toEqual({});
      } finally {
        console.log = originalLog;
      }
    });
  });
});
