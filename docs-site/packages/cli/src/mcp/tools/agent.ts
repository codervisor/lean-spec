/**
 * Agent tools - MCP tools for AI agent orchestration
 * 
 * Implements spec 123: AI Coding Agent Integration for Automated Spec Orchestration
 */

import { z } from 'zod';
import {
  runAgent,
  showAgentStatus,
  listAgents,
  type AgentType,
} from '../../commands/agent.js';
import { formatErrorMessage } from '../helpers.js';
import type { ToolDefinition } from '../types.js';

/**
 * Agent run tool definition
 */
export function agentRunTool(): ToolDefinition {
  return [
    'agent_run',
    {
      title: 'Run Agent',
      description: 'Dispatch spec(s) to an AI coding agent for implementation. The agent will receive the spec content as context and can start working on the implementation.',
      inputSchema: {
        specs: z.array(z.string()).describe('Spec(s) to dispatch (e.g., ["045", "047"])'),
        agent: z.enum(['claude', 'copilot', 'aider', 'gemini', 'gh-coding', 'continue']).optional().describe('Agent type to use. Defaults to configured default agent.'),
        parallel: z.boolean().optional().describe('Create git worktrees for parallel implementation'),
        statusUpdate: z.boolean().optional().describe('Update spec status to in-progress (default: true)'),
        dryRun: z.boolean().optional().describe('Show what would be done without executing'),
      },
      outputSchema: {
        success: z.boolean(),
        message: z.string(),
        details: z.string().optional(),
        specs: z.array(z.object({
          name: z.string(),
          status: z.string(),
          worktree: z.string().optional(),
        })).optional(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      const originalError = console.error;
      try {
        // Capture output
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };
        console.error = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        await runAgent(input.specs, {
          agent: input.agent,
          parallel: input.parallel,
          statusUpdate: input.statusUpdate,
          dryRun: input.dryRun,
        });

        const output = {
          success: true,
          message: `Dispatched ${input.specs.length} spec(s) to ${input.agent || 'default'} agent`,
          details: capturedOutput.trim(),
        };

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (error) {
        const output = {
          success: false,
          message: formatErrorMessage('Error running agent', error),
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } finally {
        console.log = originalLog;
        console.error = originalError;
      }
    }
  ];
}

/**
 * Agent status tool definition
 */
export function agentStatusTool(): ToolDefinition {
  return [
    'agent_status',
    {
      title: 'Agent Status',
      description: 'Check the status of AI agent sessions for spec implementations.',
      inputSchema: {
        spec: z.string().optional().describe('Specific spec to check status for (optional)'),
      },
      outputSchema: {
        success: z.boolean(),
        sessions: z.record(z.object({
          specPath: z.string(),
          agent: z.string(),
          status: z.string(),
          startedAt: z.string(),
          worktree: z.string().optional(),
          pid: z.number().optional(),
        })).optional(),
        message: z.string().optional(),
      },
    },
    async (input, _extra) => {
      const originalLog = console.log;
      try {
        // Capture JSON output
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        await showAgentStatus(input.spec, { json: true });

        try {
          const sessions = JSON.parse(capturedOutput.trim());
          const output = {
            success: true,
            sessions,
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        } catch {
          const output = {
            success: true,
            message: capturedOutput.trim() || 'No active sessions',
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        }
      } catch (error) {
        const output = {
          success: false,
          message: formatErrorMessage('Error checking agent status', error),
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } finally {
        console.log = originalLog;
      }
    }
  ];
}

/**
 * Agent list tool definition
 */
export function agentListTool(): ToolDefinition {
  return [
    'agent_list',
    {
      title: 'List Agents',
      description: 'List available AI coding agents and their configuration status.',
      inputSchema: {},
      outputSchema: {
        success: z.boolean(),
        agents: z.record(z.object({
          type: z.string(),
          available: z.boolean(),
          isDefault: z.boolean(),
          command: z.string().optional(),
        })).optional(),
        message: z.string().optional(),
      },
    },
    async (_input, _extra) => {
      const originalLog = console.log;
      try {
        // Capture JSON output
        let capturedOutput = '';
        console.log = (...args: any[]) => {
          capturedOutput += args.join(' ') + '\n';
        };

        await listAgents({ json: true });

        try {
          const agents = JSON.parse(capturedOutput.trim());
          const output = {
            success: true,
            agents,
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        } catch {
          const output = {
            success: false,
            message: 'Failed to parse agents list',
          };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        }
      } catch (error) {
        const output = {
          success: false,
          message: formatErrorMessage('Error listing agents', error),
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } finally {
        console.log = originalLog;
      }
    }
  ];
}
