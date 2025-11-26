/**
 * Agent command - Dispatch specs to AI coding agents
 * 
 * Implements spec 123: AI Coding Agent Integration for Automated Spec Orchestration
 * 
 * This command enables dispatching specs to various AI coding agents like:
 * - Claude Code (CLI-based, local)
 * - GitHub Copilot CLI (CLI-based, local)
 * - Aider (CLI-based, local)
 * - GitHub Coding Agent (cloud-based, creates PRs)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import { spawn, type ChildProcess } from 'node:child_process';
import { loadConfig, saveConfig, type LeanSpecConfig } from '../config.js';
import { getSpec, loadAllSpecs } from '../spec-loader.js';
import { updateSpec } from './update.js';
import { resolveSpecPath } from '../utils/path-helpers.js';
import { sanitizeUserInput } from '../utils/ui.js';
import { getStatusIndicator } from '../utils/colors.js';

/**
 * Supported agent types
 */
export type AgentType = 'claude' | 'copilot' | 'aider' | 'gemini' | 'gh-coding' | 'continue';

/**
 * Agent execution mode
 */
export type AgentMode = 'cli' | 'cloud';

/**
 * Agent configuration in config file
 */
export interface AgentConfig {
  type: AgentMode;
  command?: string;
  args?: string[];
  contextTemplate?: string;
  provider?: string; // For cloud agents
}

/**
 * Extended config with agents
 */
interface AgentsConfig {
  default?: string;
  [key: string]: AgentConfig | string | undefined;
}

/**
 * Agent session status
 */
export interface AgentSession {
  specPath: string;
  agent: AgentType;
  status: 'running' | 'completed' | 'failed' | 'pending';
  startedAt: string;
  worktree?: string;
  pid?: number;
  exitCode?: number;
  error?: string;
}

// Track active sessions in memory (could be persisted to disk for real implementation)
const activeSessions: Map<string, AgentSession> = new Map();

/**
 * Default agent configurations
 */
const DEFAULT_AGENTS: Record<string, AgentConfig> = {
  claude: {
    type: 'cli',
    command: 'claude',
    contextTemplate: `Implement the following LeanSpec specification:

---
{spec_content}
---

Please follow the spec's design, plan, and test sections. Update the spec status to 'complete' when done.`,
  },
  copilot: {
    type: 'cli',
    command: 'gh',
    args: ['copilot', 'suggest'],
    contextTemplate: `Help implement this specification:

{spec_content}`,
  },
  aider: {
    type: 'cli',
    command: 'aider',
    args: ['--message'],
    contextTemplate: `Implement the following spec:

{spec_content}`,
  },
  gemini: {
    type: 'cli',
    command: 'gemini',
    contextTemplate: `Implement the following specification:

{spec_content}`,
  },
  'gh-coding': {
    type: 'cloud',
    provider: 'github',
  },
  continue: {
    type: 'cli',
    command: 'continue',
    contextTemplate: `{spec_content}`,
  },
};

/**
 * Get agents config from LeanSpec config with type safety
 */
function getAgentsFromConfig(config: LeanSpecConfig): AgentsConfig | undefined {
  // The agents property may exist on config but is not in the base interface
  // It's added dynamically when agents are configured
  const configWithAgents = config as LeanSpecConfig & { agents?: AgentsConfig };
  return configWithAgents.agents;
}

/**
 * Get agent configuration, merging defaults with user config
 */
export async function getAgentConfig(
  agentName: string,
  config: LeanSpecConfig
): Promise<AgentConfig | null> {
  // Check user-defined agents first
  const userAgents = getAgentsFromConfig(config);
  const userAgent = userAgents?.[agentName];
  if (userAgent && typeof userAgent !== 'string') {
    return { ...DEFAULT_AGENTS[agentName], ...userAgent };
  }
  
  // Fall back to defaults
  if (DEFAULT_AGENTS[agentName]) {
    return DEFAULT_AGENTS[agentName];
  }
  
  return null;
}

/**
 * Get default agent from config or use 'claude' as fallback
 */
export async function getDefaultAgent(config: LeanSpecConfig): Promise<string> {
  const userAgents = getAgentsFromConfig(config);
  return userAgents?.default || 'claude';
}

/**
 * Check if an agent command is available in PATH
 */
async function isAgentAvailable(agentConfig: AgentConfig): Promise<boolean> {
  if (agentConfig.type === 'cloud') {
    // Cloud agents don't need local command
    return true;
  }
  
  const command = agentConfig.command;
  if (!command) return false;
  
  return new Promise((resolve) => {
    const child = spawn('which', [command], { stdio: 'pipe' });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

/**
 * Load spec content for agent context
 */
async function loadSpecContent(specPath: string): Promise<string> {
  const spec = await getSpec(specPath);
  if (!spec) {
    throw new Error(`Spec not found: ${specPath}`);
  }
  
  // Use fullPath from spec info which is the directory path
  const specDir = spec.fullPath;
  let content = '';
  
  // Read all markdown files in spec directory
  try {
    const files = await fs.readdir(specDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    for (const file of mdFiles) {
      const filePath = path.join(specDir, file);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      content += `\n\n### ${file}\n\n${fileContent}`;
    }
  } catch {
    // Single file spec - use filePath from spec info
    content = await fs.readFile(spec.filePath, 'utf-8');
  }
  
  return content;
}

/**
 * Create git worktree for parallel spec implementation
 */
async function createWorktree(
  specPath: string,
  specName: string,
  cwd: string
): Promise<string> {
  const worktreePath = path.join(cwd, '.worktrees', `spec-${specName}`);
  const branchName = `feature/${specName}`;
  
  // Create .worktrees directory if needed
  await fs.mkdir(path.join(cwd, '.worktrees'), { recursive: true });
  
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['worktree', 'add', worktreePath, '-b', branchName], {
      cwd,
      stdio: 'pipe',
    });
    
    let stderr = '';
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(worktreePath);
      } else {
        // Check if branch already exists
        if (stderr.includes('already exists')) {
          // Try to add worktree with existing branch
          const child2 = spawn('git', ['worktree', 'add', worktreePath, branchName], {
            cwd,
            stdio: 'pipe',
          });
          child2.on('close', (code2) => {
            if (code2 === 0) {
              resolve(worktreePath);
            } else {
              reject(new Error(`Failed to create worktree: ${stderr}`));
            }
          });
        } else {
          reject(new Error(`Failed to create worktree: ${stderr}`));
        }
      }
    });
  });
}

/**
 * Run CLI-based agent
 */
async function runCliAgent(
  specPath: string,
  agentConfig: AgentConfig,
  worktreePath?: string
): Promise<ChildProcess> {
  const content = await loadSpecContent(specPath);
  const context = agentConfig.contextTemplate?.replace('{spec_content}', content) || content;
  
  const command = agentConfig.command!;
  const args = [...(agentConfig.args || [])];
  
  // For agents that take message as argument
  if (args.includes('--message') || command === 'aider') {
    args.push(context);
  }
  
  const child = spawn(command, args, {
    cwd: worktreePath || process.cwd(),
    stdio: 'inherit',
    detached: false,
  });
  
  return child;
}

/**
 * Run cloud-based agent (GitHub Coding Agent)
 */
async function runCloudAgent(
  specPath: string,
  _agentConfig: AgentConfig
): Promise<void> {
  // For cloud agents, we'd typically:
  // 1. Create an issue from the spec (if not exists)
  // 2. Trigger the cloud agent via API
  // 3. Monitor for PR creation
  
  console.log(chalk.yellow('Cloud agent integration requires GitHub API configuration.'));
  console.log(chalk.gray('The spec content has been prepared for manual dispatch.'));
  
  const content = await loadSpecContent(specPath);
  console.log('');
  console.log(chalk.cyan('=== Spec Content for Cloud Agent ==='));
  console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
  console.log('');
  console.log(chalk.gray('To use GitHub Coding Agent:'));
  console.log(chalk.gray('  1. Create a GitHub Issue with the spec content'));
  console.log(chalk.gray('  2. Assign to the GitHub Coding Agent'));
  console.log(chalk.gray('  3. The agent will create a PR automatically'));
}

/**
 * Agent command implementation
 */
export function agentCommand(): Command {
  const cmd = new Command('agent')
    .description('Dispatch specs to AI coding agents for automated implementation');

  // Run subcommand
  cmd.command('run')
    .description('Dispatch spec(s) to an AI coding agent')
    .argument('<specs...>', 'Spec(s) to dispatch (e.g., "045" or "045 047 048")')
    .option('--agent <type>', 'Agent type (claude, copilot, aider, gemini, gh-coding)', 'claude')
    .option('--parallel', 'Create worktrees for parallel implementation')
    .option('--no-status-update', 'Do not update spec status to in-progress')
    .option('--dry-run', 'Show what would be done without executing')
    .action(async (specs: string[], options: { 
      agent: string; 
      parallel?: boolean;
      statusUpdate?: boolean;
      dryRun?: boolean;
    }) => {
      await runAgent(specs, options);
    });

  // Status subcommand
  cmd.command('status')
    .description('Check status of agent sessions')
    .argument('[spec]', 'Specific spec to check (optional)')
    .option('--json', 'Output as JSON')
    .action(async (spec: string | undefined, options: { json?: boolean }) => {
      await showAgentStatus(spec, options);
    });

  // List subcommand
  cmd.command('list')
    .description('List available AI agents')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      await listAgents(options);
    });

  // Config subcommand
  cmd.command('config')
    .description('Configure default agent')
    .argument('<agent>', 'Agent name to set as default')
    .action(async (agent: string) => {
      await setDefaultAgent(agent);
    });

  // Default action (show help)
  cmd.action(() => {
    cmd.help();
  });

  return cmd;
}

/**
 * Run agent for spec(s)
 */
export async function runAgent(
  specs: string[],
  options: {
    agent?: string;
    parallel?: boolean;
    statusUpdate?: boolean;
    dryRun?: boolean;
  } = {}
): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  // Determine agent to use
  const agentName = options.agent || await getDefaultAgent(config);
  const agentConfig = await getAgentConfig(agentName, config);
  
  if (!agentConfig) {
    console.error(chalk.red(`Unknown agent: ${agentName}`));
    console.log(chalk.gray('Available agents: claude, copilot, aider, gemini, gh-coding'));
    process.exit(1);
  }
  
  // Check agent availability (skip in dry-run mode)
  const available = await isAgentAvailable(agentConfig);
  if (!available && agentConfig.type === 'cli' && !options.dryRun) {
    console.error(chalk.red(`Agent not found: ${agentConfig.command}`));
    console.log(chalk.gray(`Make sure ${agentConfig.command} is installed and in your PATH.`));
    process.exit(1);
  }
  
  console.log('');
  console.log(chalk.green(`🤖 Dispatching to ${chalk.cyan(agentName)} agent`));
  console.log('');
  
  // Resolve spec paths
  const resolvedSpecs: string[] = [];
  for (const spec of specs) {
    const resolved = await resolveSpecPath(spec, cwd, specsDir);
    if (!resolved) {
      console.error(chalk.red(`Spec not found: ${sanitizeUserInput(spec)}`));
      process.exit(1);
    }
    resolvedSpecs.push(resolved);
  }
  
  // Show what will be done
  console.log(chalk.bold('Specs to process:'));
  for (const specPath of resolvedSpecs) {
    const spec = await getSpec(specPath);
    if (spec) {
      const status = getStatusIndicator(spec.frontmatter.status);
      console.log(`  • ${sanitizeUserInput(spec.name)} ${status}`);
    } else {
      console.log(`  • ${sanitizeUserInput(path.basename(specPath))}`);
    }
  }
  console.log('');
  
  if (options.dryRun) {
    console.log(chalk.yellow('Dry run mode - no actions will be taken'));
    console.log('');
    console.log(chalk.cyan('Would execute:'));
    for (const specPath of resolvedSpecs) {
      const spec = await getSpec(specPath);
      const specName = spec?.name || path.basename(specPath);
      console.log(`  1. Update ${specName} status to in-progress`);
      if (options.parallel) {
        console.log(`  2. Create worktree at .worktrees/spec-${specName}`);
        console.log(`  3. Create branch feature/${specName}`);
      }
      console.log(`  ${options.parallel ? '4' : '2'}. Launch ${agentName} agent with spec context`);
    }
    return;
  }
  
  // Process each spec
  for (const specPath of resolvedSpecs) {
    const spec = await getSpec(specPath);
    const specName = spec?.name || path.basename(specPath);
    
    console.log(chalk.bold(`Processing: ${specName}`));
    
    // Update status to in-progress
    if (options.statusUpdate !== false) {
      try {
        await updateSpec(specName, { status: 'in-progress' });
        console.log(chalk.green(`  ✓ Updated status to in-progress`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not update status: ${(error as Error).message}`));
      }
    }
    
    // Create worktree for parallel development
    let worktreePath: string | undefined;
    if (options.parallel) {
      try {
        worktreePath = await createWorktree(specPath, specName, cwd);
        console.log(chalk.green(`  ✓ Created worktree at ${worktreePath}`));
      } catch (error) {
        console.log(chalk.yellow(`  ⚠ Could not create worktree: ${(error as Error).message}`));
      }
    }
    
    // Create session
    const session: AgentSession = {
      specPath,
      agent: agentName as AgentType,
      status: 'running',
      startedAt: new Date().toISOString(),
      worktree: worktreePath,
    };
    
    // Dispatch to agent
    if (agentConfig.type === 'cli') {
      console.log(chalk.cyan(`  → Launching ${agentName}...`));
      
      try {
        const child = await runCliAgent(specPath, agentConfig, worktreePath);
        session.pid = child.pid;
        activeSessions.set(specName, session);
        
        child.on('close', (code) => {
          const sess = activeSessions.get(specName);
          if (sess) {
            sess.status = code === 0 ? 'completed' : 'failed';
            sess.exitCode = code ?? undefined;
          }
        });
        
        child.on('error', (error) => {
          const sess = activeSessions.get(specName);
          if (sess) {
            sess.status = 'failed';
            sess.error = error.message;
          }
        });
        
        console.log(chalk.green(`  ✓ Agent launched (PID: ${child.pid})`));
      } catch (error) {
        session.status = 'failed';
        session.error = (error as Error).message;
        activeSessions.set(specName, session);
        console.error(chalk.red(`  ✗ Failed to launch agent: ${(error as Error).message}`));
      }
    } else {
      // Cloud agent
      activeSessions.set(specName, session);
      await runCloudAgent(specPath, agentConfig);
    }
    
    console.log('');
  }
  
  console.log(chalk.green('✨ Agent dispatch complete'));
  console.log(chalk.gray('Use `lean-spec agent status` to check progress'));
}

/**
 * Show agent session status
 */
export async function showAgentStatus(
  spec: string | undefined,
  options: { json?: boolean } = {}
): Promise<void> {
  if (spec) {
    const session = activeSessions.get(spec);
    if (!session) {
      if (options.json) {
        console.log(JSON.stringify({ error: `No active session for spec: ${spec}` }));
      } else {
        console.log(chalk.yellow(`No active session for spec: ${spec}`));
      }
      return;
    }
    
    if (options.json) {
      console.log(JSON.stringify(session, null, 2));
    } else {
      console.log('');
      console.log(chalk.cyan(`Agent Session: ${spec}`));
      console.log(`  Agent: ${session.agent}`);
      console.log(`  Status: ${getSessionStatusIndicator(session.status)}`);
      console.log(`  Started: ${session.startedAt}`);
      if (session.worktree) {
        console.log(`  Worktree: ${session.worktree}`);
      }
      if (session.pid) {
        console.log(`  PID: ${session.pid}`);
      }
      if (session.error) {
        console.log(`  Error: ${chalk.red(session.error)}`);
      }
      console.log('');
    }
    return;
  }
  
  // Show all sessions
  const sessions = Array.from(activeSessions.entries());
  
  if (options.json) {
    const data = Object.fromEntries(sessions);
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  
  if (sessions.length === 0) {
    console.log(chalk.gray('No active agent sessions'));
    return;
  }
  
  console.log('');
  console.log(chalk.green('=== Agent Sessions ==='));
  console.log('');
  
  for (const [specName, session] of sessions) {
    console.log(`${chalk.bold(specName)}`);
    console.log(`  Agent: ${session.agent} | Status: ${getSessionStatusIndicator(session.status)}`);
    if (session.worktree) {
      console.log(`  Worktree: ${chalk.dim(session.worktree)}`);
    }
  }
  console.log('');
}

/**
 * Get colored status indicator for agent session
 */
function getSessionStatusIndicator(status: AgentSession['status']): string {
  switch (status) {
    case 'running':
      return chalk.blue('🔄 Running');
    case 'completed':
      return chalk.green('✅ Completed');
    case 'failed':
      return chalk.red('❌ Failed');
    case 'pending':
      return chalk.yellow('⏳ Pending');
    default:
      return status;
  }
}

/**
 * List available agents
 */
export async function listAgents(options: { json?: boolean } = {}): Promise<void> {
  const config = await loadConfig();
  const defaultAgent = await getDefaultAgent(config);
  
  const agents: Record<string, { type: AgentMode; available: boolean; isDefault: boolean; command?: string }> = {};
  
  for (const [name, agentConfig] of Object.entries(DEFAULT_AGENTS)) {
    const available = await isAgentAvailable(agentConfig);
    agents[name] = {
      type: agentConfig.type,
      available,
      isDefault: name === defaultAgent,
      command: agentConfig.command,
    };
  }
  
  // Add user-defined agents
  const userAgents = getAgentsFromConfig(config);
  if (userAgents) {
    for (const [name, agentConfig] of Object.entries(userAgents)) {
      if (name !== 'default' && !agents[name] && typeof agentConfig !== 'string') {
        const available = await isAgentAvailable(agentConfig);
        agents[name] = {
          type: agentConfig.type,
          available,
          isDefault: name === defaultAgent,
          command: agentConfig.command,
        };
      }
    }
  }
  
  if (options.json) {
    console.log(JSON.stringify(agents, null, 2));
    return;
  }
  
  console.log('');
  console.log(chalk.green('=== Available AI Agents ==='));
  console.log('');
  
  console.log(chalk.bold('CLI-based (local):'));
  for (const [name, info] of Object.entries(agents)) {
    if (info.type === 'cli') {
      const defaultMarker = info.isDefault ? chalk.green(' (default)') : '';
      const availableMarker = info.available ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${availableMarker} ${name}${defaultMarker} ${chalk.dim(`(${info.command})`)}`);
    }
  }
  
  console.log('');
  console.log(chalk.bold('Cloud-based:'));
  for (const [name, info] of Object.entries(agents)) {
    if (info.type === 'cloud') {
      const defaultMarker = info.isDefault ? chalk.green(' (default)') : '';
      console.log(`  • ${name}${defaultMarker}`);
    }
  }
  
  console.log('');
  console.log(chalk.gray('Set default: lean-spec agent config <agent>'));
  console.log(chalk.gray('Run agent:   lean-spec agent run <spec> --agent <agent>'));
  console.log('');
}

/**
 * Set default agent in config
 */
export async function setDefaultAgent(agent: string): Promise<void> {
  const config = await loadConfig();
  
  // Check if agent exists
  const agentConfig = await getAgentConfig(agent, config);
  if (!agentConfig) {
    console.error(chalk.red(`Unknown agent: ${agent}`));
    console.log(chalk.gray('Available agents: claude, copilot, aider, gemini, gh-coding'));
    process.exit(1);
  }
  
  // Update config with proper typing
  const configWithAgents = config as LeanSpecConfig & { agents?: AgentsConfig };
  configWithAgents.agents = configWithAgents.agents || {};
  configWithAgents.agents.default = agent;
  await saveConfig(configWithAgents);
  
  console.log(chalk.green(`✓ Default agent set to: ${agent}`));
}
