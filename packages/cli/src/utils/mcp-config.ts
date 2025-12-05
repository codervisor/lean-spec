import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';

/**
 * MCP configuration types
 */
export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export interface McpConfigFile {
  mcpServers: Record<string, McpServerConfig>;
}

/**
 * MCP-capable AI tool configuration
 */
export interface McpToolConfig {
  id: string;
  name: string;
  description: string;
  configPath: string;
  configLocation: 'workspace' | 'global';
  usesProjectVariable: boolean; // Whether the tool supports ${PWD} or similar
  detection?: {
    directories?: string[];
    files?: string[];
  };
}

export type McpToolKey = 'claude' | 'vscode' | 'cursor' | 'windsurf';

/**
 * MCP tool configurations
 */
export const MCP_TOOL_CONFIGS: Record<McpToolKey, McpToolConfig> = {
  'claude': {
    id: 'claude',
    name: 'Claude',
    description: 'Claude (.mcp.json)',
    configPath: '.mcp.json',
    configLocation: 'workspace',
    usesProjectVariable: true,
    detection: {
      directories: ['.claude'],
      files: ['CLAUDE.md', '.claude.json'],
    },
  },
  vscode: {
    id: 'vscode',
    name: 'VS Code',
    description: 'VS Code with GitHub Copilot (.vscode/mcp.json)',
    configPath: '.vscode/mcp.json',
    configLocation: 'workspace',
    usesProjectVariable: false,
    detection: {
      directories: ['.vscode'],
    },
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor (.cursor/mcp.json)',
    configPath: '.cursor/mcp.json',
    configLocation: 'workspace',
    usesProjectVariable: false,
    detection: {
      directories: ['.cursor'],
      files: ['.cursorrules'],
    },
  },
  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    description: 'Windsurf (.windsurf/mcp.json)',
    configPath: '.windsurf/mcp.json',
    configLocation: 'workspace',
    usesProjectVariable: false,
    detection: {
      directories: ['.windsurf'],
      files: ['.windsurfrules'],
    },
  },
};

/**
 * Detection result for MCP tools
 */
export interface McpToolDetectionResult {
  tool: McpToolKey;
  detected: boolean;
  reasons: string[];
}

/**
 * Detect which MCP-capable tools are likely in use
 */
export async function detectMcpTools(cwd: string): Promise<McpToolDetectionResult[]> {
  const results: McpToolDetectionResult[] = [];

  for (const [key, config] of Object.entries(MCP_TOOL_CONFIGS)) {
    const reasons: string[] = [];
    const detection = config.detection;

    if (!detection) {
      results.push({ tool: key as McpToolKey, detected: false, reasons: [] });
      continue;
    }

    // Check directories
    if (detection.directories) {
      for (const dir of detection.directories) {
        const dirPath = path.join(cwd, dir);
        try {
          const stat = await fs.stat(dirPath);
          if (stat.isDirectory()) {
            reasons.push(`${dir}/ directory found`);
          }
        } catch {
          // Directory doesn't exist
        }
      }
    }

    // Check files
    if (detection.files) {
      for (const file of detection.files) {
        const filePath = path.join(cwd, file);
        try {
          await fs.access(filePath);
          reasons.push(`${file} found`);
        } catch {
          // File doesn't exist
        }
      }
    }

    results.push({
      tool: key as McpToolKey,
      detected: reasons.length > 0,
      reasons,
    });
  }

  return results;
}

/**
 * Generate MCP server configuration for a specific tool
 */
export function generateMcpConfig(
  projectPath: string,
  tool: McpToolKey
): McpServerConfig {
  const config = MCP_TOOL_CONFIGS[tool];

  // Use ${PWD} for tools that support it, otherwise use absolute path
  const projectArg = config.usesProjectVariable
    ? '${workspaceFolder}'
    : projectPath;

  return {
    command: 'npx',
    args: ['-y', '@leanspec/mcp', '--project', projectArg],
  };
}

/**
 * Generate a full MCP config file object
 */
export function generateMcpConfigFile(
  projectPath: string,
  tool: McpToolKey
): McpConfigFile {
  return {
    mcpServers: {
      'lean-spec': generateMcpConfig(projectPath, tool),
    },
  };
}

/**
 * Result of MCP config creation
 */
export interface McpConfigResult {
  tool: McpToolKey;
  configPath: string;
  created?: boolean;
  merged?: boolean;
  skipped?: boolean;
  backupPath?: string;
  error?: string;
}

/**
 * Read existing MCP config file
 */
async function readMcpConfig(configPath: string): Promise<McpConfigFile | null> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as McpConfigFile;
  } catch {
    return null;
  }
}

/**
 * Write MCP config file with proper formatting
 */
async function writeMcpConfig(
  configPath: string,
  config: McpConfigFile
): Promise<void> {
  const dir = path.dirname(configPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

/**
 * Create or update MCP config for a specific tool
 */
export async function createMcpConfig(
  cwd: string,
  tool: McpToolKey
): Promise<McpConfigResult> {
  const toolConfig = MCP_TOOL_CONFIGS[tool];
  const configPath = path.join(cwd, toolConfig.configPath);
  const absoluteProjectPath = path.resolve(cwd);

  try {
    // Check if config already exists
    const existingConfig = await readMcpConfig(configPath);

    if (existingConfig) {
      // Check if lean-spec is already configured
      if (existingConfig.mcpServers?.['lean-spec']) {
        return {
          tool,
          configPath: toolConfig.configPath,
          skipped: true,
        };
      }

      // Merge: add lean-spec to existing config
      const newServerConfig = generateMcpConfig(absoluteProjectPath, tool);
      existingConfig.mcpServers = existingConfig.mcpServers || {};
      existingConfig.mcpServers['lean-spec'] = newServerConfig;

      await writeMcpConfig(configPath, existingConfig);

      return {
        tool,
        configPath: toolConfig.configPath,
        merged: true,
      };
    }

    // Create new config
    const newConfig = generateMcpConfigFile(absoluteProjectPath, tool);
    await writeMcpConfig(configPath, newConfig);

    return {
      tool,
      configPath: toolConfig.configPath,
      created: true,
    };
  } catch (error) {
    return {
      tool,
      configPath: toolConfig.configPath,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create MCP configs for multiple tools
 */
export async function createMcpConfigs(
  cwd: string,
  tools: McpToolKey[]
): Promise<McpConfigResult[]> {
  const results: McpConfigResult[] = [];

  for (const tool of tools) {
    const result = await createMcpConfig(cwd, tool);
    results.push(result);
  }

  return results;
}

/**
 * Print MCP config results with appropriate formatting
 */
export function printMcpConfigResults(results: McpConfigResult[]): void {
  for (const result of results) {
    const config = MCP_TOOL_CONFIGS[result.tool];

    if (result.created) {
      console.log(chalk.green(`✓ ${config.name}: Created ${result.configPath}`));
    } else if (result.merged) {
      console.log(chalk.green(`✓ ${config.name}: Added lean-spec to ${result.configPath}`));
    } else if (result.skipped) {
      console.log(chalk.yellow(`⚠ ${config.name}: Already configured in ${result.configPath}`));
    } else if (result.error) {
      console.log(chalk.red(`✗ ${config.name}: ${result.error}`));
    }
  }
}

/**
 * Get default MCP tool selection based on detection
 */
export async function getDefaultMcpToolSelection(
  cwd: string
): Promise<{ defaults: McpToolKey[]; detected: McpToolDetectionResult[] }> {
  const detectionResults = await detectMcpTools(cwd);
  const detectedTools = detectionResults
    .filter((r) => r.detected)
    .map((r) => r.tool);

  // If any tools detected, use those as defaults
  if (detectedTools.length > 0) {
    return { defaults: detectedTools, detected: detectionResults };
  }

  // Default to Claude if nothing detected (most common for LeanSpec users)
  return { defaults: ['claude'], detected: detectionResults };
}

/**
 * Parse --mcp-config flag value
 */
export function parseMcpConfigFlag(value: string): McpToolKey[] | 'all' | 'none' {
  if (value === 'all') {
    return 'all';
  }
  if (value === 'none') {
    return 'none';
  }

  const tools = value.split(',').map((t) => t.trim().toLowerCase());
  const validTools: McpToolKey[] = [];

  for (const tool of tools) {
    // Handle aliases
    const normalized = normalizeToolName(tool);
    if (normalized && isValidMcpTool(normalized)) {
      validTools.push(normalized);
    }
  }

  return validTools;
}

/**
 * Normalize tool name aliases
 */
function normalizeToolName(tool: string): McpToolKey | null {
  const aliases: Record<string, McpToolKey> = {
    'claude': 'claude',
    'claude-code': 'claude',
    'claudecode': 'claude',
    'vscode': 'vscode',
    'vs-code': 'vscode',
    'code': 'vscode',
    'copilot': 'vscode',
    'cursor': 'cursor',
    'windsurf': 'windsurf',
  };

  return aliases[tool] || null;
}

/**
 * Check if a tool key is valid
 */
function isValidMcpTool(tool: string): tool is McpToolKey {
  return tool in MCP_TOOL_CONFIGS;
}
