import type { UIMessage } from '@ai-sdk/react';
import {
  cn,
  Message,
  MessageContent,
  MessageResponse,
  Tool,
  ToolBody,
  ToolContent,
  ToolHeader,
  type ToolPart,
} from '@/library';
import { ToolResultRegistry } from './tool-result-registry';

interface ChatMessageProps {
  message: UIMessage;
  isLast?: boolean;
}

const toolStates = new Set<ToolPart['state']>([
  'input-streaming',
  'input-available',
  'approval-requested',
  'approval-responded',
  'output-available',
  'output-error',
  'output-denied',
]);

function mapToolState(
  state: string | undefined,
  output: unknown,
  errorMessage?: string
): ToolPart['state'] {
  if (state && toolStates.has(state as ToolPart['state'])) {
    return state as ToolPart['state'];
  }

  if (state === 'error' || errorMessage) {
    return 'output-error';
  }

  if (state === 'result' || output !== undefined) {
    return 'output-available';
  }

  if (state === 'call' || state === 'running' || state === 'pending') {
    return 'input-available';
  }

  return 'input-streaming';
}

function renderToolPart(
  props: {
    toolCallId: string;
    toolName: string;
    description: string | undefined;
    input: unknown;
    output: unknown;
    state: string | undefined;
    errorMessage: string | undefined;
  },
  key: string | number
) {
  const { toolCallId, toolName, description, input, output, state, errorMessage } = props;
  const renderedOutput =
    output !== undefined
      ? ToolResultRegistry.render(toolName, output)
      : undefined;

  // Extract title/description from input if available
  const inputObj = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const displayTitle = typeof inputObj.title === 'string' ? inputObj.title : undefined;
  const displayDescription = typeof inputObj.description === 'string' ? inputObj.description : description;

  return (
    <Tool key={toolCallId || key}>
      <ToolHeader
        title={displayTitle}
        description={displayDescription}
        state={mapToolState(state, output, errorMessage)}
        toolName={toolName}
        type="dynamic-tool"
      />
      <ToolContent>
        <ToolBody
          input={input}
          output={renderedOutput}
          rawOutput={output}
          errorText={errorMessage}
        />
      </ToolContent>
    </Tool>
  );
}

/**
 * Pattern to match server-injected error text parts.
 * These are added by the Rust server as `\n\n**Error:** <error_text>`.
 */
const SERVER_ERROR_TEXT_RE = /^\s*\*\*Error:\*\*\s*/;

export function ChatMessage({ message, isLast }: ChatMessageProps) {
  // Build a lookup of tool-result parts by toolCallId so that tool-call parts
  // rendered from persisted messages can find the matching output.
  const toolResultMap = new Map<string, Record<string, unknown>>();
  if (message.parts) {
    for (const part of message.parts) {
      if (
        typeof part === 'object' &&
        part !== null &&
        'type' in part &&
        (part as Record<string, unknown>).type === 'tool-result'
      ) {
        const p = part as Record<string, unknown>;
        const id = String(p.toolCallId ?? '');
        if (id) toolResultMap.set(id, p);
      }
    }
  }

  // Build a set of orphaned tool-call IDs (no matching tool-result).
  // Then scan text parts for error messages to pair with orphaned tools.
  const orphanedToolCalls = new Map<string, { index: number; toolName: string }>();
  const toolErrorTextIndices = new Set<number>();
  const toolCallErrors = new Map<string, string>(); // toolCallId → error message

  if (message.parts) {
    // First pass: find orphaned tool-calls
    for (let i = 0; i < message.parts.length; i++) {
      const p = message.parts[i];
      if (typeof p !== 'object' || p === null || !('type' in p)) continue;
      const pObj = p as Record<string, unknown>;
      if (pObj.type === 'tool-call') {
        const callId = String(pObj.toolCallId ?? '');
        if (callId && !toolResultMap.has(callId)) {
          orphanedToolCalls.set(callId, { index: i, toolName: String(pObj.toolName ?? '') });
        }
      }
    }

    // Second pass: match error text parts to orphaned tool-calls
    if (orphanedToolCalls.size > 0) {
      for (let i = 0; i < message.parts.length; i++) {
        const p = message.parts[i];
        if (typeof p !== 'object' || p === null || !('type' in p)) continue;
        const pObj = p as Record<string, unknown>;
        if (pObj.type === 'text') {
          const text = pObj.text as string;
          if (text && SERVER_ERROR_TEXT_RE.test(text)) {
            const errorMsg = text.replace(SERVER_ERROR_TEXT_RE, '').trim();
            // Find the last orphaned tool-call before this text part
            let lastOrphan: { id: string; toolName: string } | null = null;
            for (const [id, info] of orphanedToolCalls) {
              if (info.index < i) {
                lastOrphan = { id, toolName: info.toolName };
              }
            }
            if (lastOrphan) {
              toolCallErrors.set(lastOrphan.id, errorMsg);
              toolErrorTextIndices.add(i);
              orphanedToolCalls.delete(lastOrphan.id);
            }
          }
        }
      }
    }
  }

  return (
    <Message from={message.role} className={cn(isLast && 'pb-2')}>
      <MessageContent>
        {message.parts?.map((part, index) => {
          if (typeof part !== 'object' || part === null || !('type' in part)) {
            return null;
          }

          const partObj = part as Record<string, unknown>;
          const partType = partObj.type;

          // Text part — suppress if it was absorbed into a tool error
          if (partType === 'text') {
            if (toolErrorTextIndices.has(index)) return null;
            const text = partObj.text as string;
            if (!text) return null;
            return <MessageResponse key={index}>{text}</MessageResponse>;
          }

          // Tool invocation (AI SDK streaming format)
          if (partType === 'tool-invocation') {
            const invocation = partObj.toolInvocation as Record<string, unknown> | undefined;
            if (!invocation) return null;

            return renderToolPart(
              {
                toolCallId: String(invocation.toolCallId ?? ''),
                toolName: String(invocation.toolName ?? ''),
                description:
                  typeof invocation.description === 'string'
                    ? invocation.description
                    : undefined,
                input: invocation.args,
                output: invocation.result,
                state: invocation.state as string | undefined,
                errorMessage:
                  typeof invocation.error === 'string'
                    ? invocation.error
                    : typeof invocation.errorMessage === 'string'
                      ? invocation.errorMessage
                      : undefined,
              },
              index
            );
          }

          // Persisted tool-call part — merge with matching tool-result or error
          if (partType === 'tool-call') {
            const callId = String(partObj.toolCallId ?? '');
            const matchingResult = callId ? toolResultMap.get(callId) : undefined;
            const output = matchingResult?.output ?? matchingResult?.result;

            // Check for error absorbed from text part
            const absorbedError = callId ? toolCallErrors.get(callId) : undefined;
            if (absorbedError) {
              return renderToolPart(
                {
                  toolCallId: callId,
                  toolName: String(partObj.toolName ?? ''),
                  description: undefined,
                  input: partObj.input,
                  output: undefined,
                  state: 'error',
                  errorMessage: absorbedError,
                },
                index
              );
            }

            // Extract error info from tool result
            let errorMessage: string | undefined;
            let isToolError = false;

            if (matchingResult?.isError === true) {
              isToolError = true;
              errorMessage = typeof output === 'string' ? output : JSON.stringify(output);
            } else if (typeof output === 'object' && output !== null) {
              const outputObj = output as Record<string, unknown>;
              if (outputObj.type === 'error-text') {
                isToolError = true;
                errorMessage = typeof outputObj.text === 'string' ? outputObj.text : JSON.stringify(outputObj);
              } else if (outputObj.type === 'error-json') {
                isToolError = true;
                errorMessage = JSON.stringify(outputObj.value ?? outputObj);
              }
            }

            return renderToolPart(
              {
                toolCallId: callId,
                toolName: String(partObj.toolName ?? ''),
                description: undefined,
                input: partObj.input,
                output: isToolError ? undefined : output,
                state: isToolError ? 'error' : (output !== undefined ? 'result' : 'call'),
                errorMessage,
              },
              index
            );
          }

          // tool-result is merged into tool-call above; skip standalone
          if (partType === 'tool-result') {
            return null;
          }

          // Tool error part (thrown errors from tool execution)
          if (partType === 'tool-error') {
            const toolError = partObj.error;
            const errorMsg =
              typeof toolError === 'string'
                ? toolError
                : toolError instanceof Error
                  ? toolError.message
                  : JSON.stringify(toolError);

            return renderToolPart(
              {
                toolCallId: String(partObj.toolCallId ?? ''),
                toolName: String(partObj.toolName ?? ''),
                description: undefined,
                input: partObj.input,
                output: undefined,
                state: 'error',
                errorMessage: errorMsg,
              },
              index
            );
          }

          // skip step-start markers
          if (partType === 'step-start') {
            return null;
          }

          // Dynamic tool part (AI SDK UI Message Stream v1 with dynamic: true)
          if (partType === 'dynamic-tool') {
            return renderToolPart(
              {
                toolCallId: String(partObj.toolCallId ?? ''),
                toolName: String(partObj.toolName ?? ''),
                description: undefined,
                input: partObj.input,
                output: partObj.output,
                state: partObj.state as string | undefined,
                errorMessage:
                  typeof partObj.errorText === 'string'
                    ? partObj.errorText
                    : undefined,
              },
              index
            );
          }

          // Static tool part (AI SDK UI Message Stream v1: type = "tool-{name}")
          if (typeof partType === 'string' && partType.startsWith('tool-')) {
            const toolName = partType.slice(5); // strip "tool-" prefix
            return renderToolPart(
              {
                toolCallId: String(partObj.toolCallId ?? ''),
                toolName,
                description: undefined,
                input: partObj.input,
                output: partObj.output,
                state: partObj.state as string | undefined,
                errorMessage:
                  typeof partObj.errorText === 'string'
                    ? partObj.errorText
                    : undefined,
              },
              index
            );
          }

          return null;
        })}
      </MessageContent>
    </Message>
  );
}
