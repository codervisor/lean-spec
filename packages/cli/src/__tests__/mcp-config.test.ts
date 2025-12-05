/**
 * Unit tests for MCP config generation and management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import {
  generateMcpConfig,
  generateMcpConfigFile,
  createMcpConfig,
  createMcpConfigs,
  detectMcpTools,
  parseMcpConfigFlag,
  getDefaultMcpToolSelection,
  MCP_TOOL_CONFIGS,
  type McpToolKey,
  type McpConfigFile,
} from '../utils/mcp-config.js';

describe('MCP Config Generation', () => {
  describe('generateMcpConfig', () => {
    it('should generate config for claude with workspaceFolder variable', () => {
      const config = generateMcpConfig('/home/user/project', 'claude');
      
      expect(config.command).toBe('npx');
      expect(config.args).toEqual([
        '-y',
        '@leanspec/mcp',
        '--project',
        '${workspaceFolder}',
      ]);
    });

    it('should generate config for vscode with absolute path', () => {
      const config = generateMcpConfig('/home/user/project', 'vscode');
      
      expect(config.command).toBe('npx');
      expect(config.args).toContain('/home/user/project');
      expect(config.args).not.toContain('${workspaceFolder}');
    });

    it('should generate config for cursor with absolute path', () => {
      const config = generateMcpConfig('/home/user/project', 'cursor');
      
      expect(config.command).toBe('npx');
      expect(config.args).toContain('/home/user/project');
    });

    it('should generate config for windsurf with absolute path', () => {
      const config = generateMcpConfig('/home/user/project', 'windsurf');
      
      expect(config.command).toBe('npx');
      expect(config.args).toContain('/home/user/project');
    });
  });

  describe('generateMcpConfigFile', () => {
    it('should generate full config file structure', () => {
      const configFile = generateMcpConfigFile('/home/user/project', 'claude');
      
      expect(configFile).toHaveProperty('mcpServers');
      expect(configFile.mcpServers).toHaveProperty('lean-spec');
      expect(configFile.mcpServers['lean-spec'].command).toBe('npx');
    });
  });

  describe('parseMcpConfigFlag', () => {
    it('should return "all" for "all" input', () => {
      expect(parseMcpConfigFlag('all')).toBe('all');
    });

    it('should return "none" for "none" input', () => {
      expect(parseMcpConfigFlag('none')).toBe('none');
    });

    it('should parse comma-separated tools', () => {
      const result = parseMcpConfigFlag('claude,vscode,cursor');
      expect(result).toEqual(['claude', 'vscode', 'cursor']);
    });

    it('should normalize tool name aliases', () => {
      const result = parseMcpConfigFlag('claude,code,copilot');
      expect(result).toContain('claude');
      expect(result).toContain('vscode');
    });

    it('should handle whitespace in input', () => {
      const result = parseMcpConfigFlag('claude , vscode');
      expect(result).toEqual(['claude', 'vscode']);
    });

    it('should filter out invalid tool names', () => {
      const result = parseMcpConfigFlag('claude,invalid,vscode');
      expect(result).toEqual(['claude', 'vscode']);
    });
  });
});

describe('MCP Config File Operations', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'leanspec-mcp-test-'));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('createMcpConfig', () => {
    it('should create .mcp.json for claude', async () => {
      const result = await createMcpConfig(testDir, 'claude');
      
      expect(result.created).toBe(true);
      expect(result.configPath).toBe('.mcp.json');
      
      const configPath = path.join(testDir, '.mcp.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as McpConfigFile;
      
      expect(config.mcpServers['lean-spec']).toBeDefined();
    });

    it('should create .vscode/mcp.json for vscode', async () => {
      const result = await createMcpConfig(testDir, 'vscode');
      
      expect(result.created).toBe(true);
      expect(result.configPath).toBe('.vscode/mcp.json');
      
      const configPath = path.join(testDir, '.vscode', 'mcp.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as McpConfigFile;
      
      expect(config.mcpServers['lean-spec']).toBeDefined();
    });

    it('should create .cursor/mcp.json for cursor', async () => {
      const result = await createMcpConfig(testDir, 'cursor');
      
      expect(result.created).toBe(true);
      expect(result.configPath).toBe('.cursor/mcp.json');
    });

    it('should create .windsurf/mcp.json for windsurf', async () => {
      const result = await createMcpConfig(testDir, 'windsurf');
      
      expect(result.created).toBe(true);
      expect(result.configPath).toBe('.windsurf/mcp.json');
    });

    it('should merge with existing config', async () => {
      // Create existing config with another MCP server
      const existingConfig: McpConfigFile = {
        mcpServers: {
          'other-server': {
            command: 'node',
            args: ['other-server.js'],
          },
        },
      };
      
      const configPath = path.join(testDir, '.mcp.json');
      await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2));
      
      const result = await createMcpConfig(testDir, 'claude');
      
      expect(result.merged).toBe(true);
      
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content) as McpConfigFile;
      
      // Should have both servers
      expect(config.mcpServers['other-server']).toBeDefined();
      expect(config.mcpServers['lean-spec']).toBeDefined();
    });

    it('should skip if lean-spec already configured', async () => {
      // Create existing config with lean-spec already present
      const existingConfig: McpConfigFile = {
        mcpServers: {
          'lean-spec': {
            command: 'npx',
            args: ['@leanspec/mcp'],
          },
        },
      };
      
      const configPath = path.join(testDir, '.mcp.json');
      await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2));
      
      const result = await createMcpConfig(testDir, 'claude');
      
      expect(result.skipped).toBe(true);
    });
  });

  describe('createMcpConfigs', () => {
    it('should create configs for multiple tools', async () => {
      const results = await createMcpConfigs(testDir, ['claude', 'vscode', 'cursor']);
      
      expect(results).toHaveLength(3);
      expect(results.every(r => r.created)).toBe(true);
      
      // Verify all files exist
      expect(await fs.access(path.join(testDir, '.mcp.json')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(testDir, '.vscode', 'mcp.json')).then(() => true).catch(() => false)).toBe(true);
      expect(await fs.access(path.join(testDir, '.cursor', 'mcp.json')).then(() => true).catch(() => false)).toBe(true);
    });
  });

  describe('detectMcpTools', () => {
    it('should detect claude from .claude directory', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
      
      const results = await detectMcpTools(testDir);
      const claudeResult = results.find(r => r.tool === 'claude');
      
      expect(claudeResult?.detected).toBe(true);
      expect(claudeResult?.reasons).toContain('.claude/ directory found');
    });

    it('should detect claude from CLAUDE.md file', async () => {
      await fs.writeFile(path.join(testDir, 'CLAUDE.md'), '# Claude Instructions');
      
      const results = await detectMcpTools(testDir);
      const claudeResult = results.find(r => r.tool === 'claude');
      
      expect(claudeResult?.detected).toBe(true);
      expect(claudeResult?.reasons).toContain('CLAUDE.md found');
    });

    it('should detect vscode from .vscode directory', async () => {
      await fs.mkdir(path.join(testDir, '.vscode'), { recursive: true });
      
      const results = await detectMcpTools(testDir);
      const vscodeResult = results.find(r => r.tool === 'vscode');
      
      expect(vscodeResult?.detected).toBe(true);
      expect(vscodeResult?.reasons).toContain('.vscode/ directory found');
    });

    it('should detect cursor from .cursor directory', async () => {
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });
      
      const results = await detectMcpTools(testDir);
      const cursorResult = results.find(r => r.tool === 'cursor');
      
      expect(cursorResult?.detected).toBe(true);
    });

    it('should detect cursor from .cursorrules file', async () => {
      await fs.writeFile(path.join(testDir, '.cursorrules'), '# Cursor rules');
      
      const results = await detectMcpTools(testDir);
      const cursorResult = results.find(r => r.tool === 'cursor');
      
      expect(cursorResult?.detected).toBe(true);
      expect(cursorResult?.reasons).toContain('.cursorrules found');
    });

    it('should detect windsurf from .windsurf directory', async () => {
      await fs.mkdir(path.join(testDir, '.windsurf'), { recursive: true });
      
      const results = await detectMcpTools(testDir);
      const windsurfResult = results.find(r => r.tool === 'windsurf');
      
      expect(windsurfResult?.detected).toBe(true);
    });

    it('should return empty reasons for non-detected tools', async () => {
      const results = await detectMcpTools(testDir);
      
      // In empty directory, nothing should be detected
      for (const result of results) {
        if (!result.detected) {
          expect(result.reasons).toHaveLength(0);
        }
      }
    });
  });

  describe('getDefaultMcpToolSelection', () => {
    it('should return detected tools as defaults', async () => {
      await fs.mkdir(path.join(testDir, '.vscode'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });
      
      const { defaults, detected } = await getDefaultMcpToolSelection(testDir);
      
      expect(defaults).toContain('vscode');
      expect(defaults).toContain('cursor');
    });

    it('should return empty defaults when nothing detected', async () => {
      const { defaults } = await getDefaultMcpToolSelection(testDir);
      
      expect(defaults).toEqual([]);
    });
  });
});

describe('MCP Tool Configs', () => {
  it('should have correct config paths for all tools', () => {
    expect(MCP_TOOL_CONFIGS['claude'].configPath).toBe('.mcp.json');
    expect(MCP_TOOL_CONFIGS['vscode'].configPath).toBe('.vscode/mcp.json');
    expect(MCP_TOOL_CONFIGS['cursor'].configPath).toBe('.cursor/mcp.json');
    expect(MCP_TOOL_CONFIGS['windsurf'].configPath).toBe('.windsurf/mcp.json');
  });

  it('should mark claude as using project variable', () => {
    expect(MCP_TOOL_CONFIGS['claude'].usesProjectVariable).toBe(true);
    expect(MCP_TOOL_CONFIGS['vscode'].usesProjectVariable).toBe(false);
    expect(MCP_TOOL_CONFIGS['cursor'].usesProjectVariable).toBe(false);
    expect(MCP_TOOL_CONFIGS['windsurf'].usesProjectVariable).toBe(false);
  });

  it('should have workspace config location for all tools', () => {
    for (const config of Object.values(MCP_TOOL_CONFIGS)) {
      expect(config.configLocation).toBe('workspace');
    }
  });
});
