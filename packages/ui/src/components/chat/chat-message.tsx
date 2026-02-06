import { memo } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import {
  cn,
  Message,
  MessageContent,
  MessageResponse,
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from '@/library';
import { ToolResultRegistry } from './tool-result-registry';

interface ChatMessageProps {
  message: UIMessage;
  isLast?: boolean;
}

// Tool call info extracted from parts
interface ToolCallInfo {
  toolCallId: string;
  toolName: string;
  input?: unknown;
  output?: unknown;
  state?: string;
  errorMessage?: string; // added error message
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

function extractToolCalls(parts: UIMessage['parts']): ToolCallInfo[] {
  if (!parts) return [];

  const toolCalls: ToolCallInfo[] = [];

  for (const part of parts) {
    if (typeof part !== 'object' || part === null || !('type' in part)) continue;

    const partObj = part as Record<string, unknown>;
    const partType = partObj.type;

    // Handle standard tool-invocation and tool-result parts from AI SDK
    if (partType === 'tool-invocation') {
      const invocation = partObj.toolInvocation as Record<string, unknown> | undefined;
      if (invocation) {
        const errorMessage =
          typeof invocation.error === 'string'
            ? invocation.error
            : typeof invocation.errorMessage === 'string'
              ? invocation.errorMessage
              : undefined;

        toolCalls.push({
          toolCallId: String(invocation.toolCallId ?? ''),
          toolName: String(invocation.toolName ?? ''),
          input: invocation.args,
          output: invocation.result,
          state: invocation.state as string | undefined,
          errorMessage,
        });
      }
    } else if (partType === 'tool-call') {
      // legacy or different format?
      toolCalls.push({
        toolCallId: String(partObj.toolCallId ?? ''),
        toolName: String(partObj.toolName ?? ''),
        input: partObj.args,
        state: 'call'
      });
    } else if (partType === 'tool-result') {
      // This is usually separate part, but we might want to merge it with invocation if possible,
      // or render it separately.
      // In AI SDK UIMessage, parts often contain tool-invocation which has both input and output if complete.
      // If "parts" array has separate tool-invocation and tool-result, we might need to handle it.
      // But typically 'tool-invocation' part (if using Vercel AI SDK 3.1+) updates in-place.
    }

    // Fallback to previous logic if type starts with 'tool-' and not invocation
    else if (String(partType).startsWith('tool-') && 'toolCallId' in partObj) {
      toolCalls.push({
        toolCallId: String(partObj.toolCallId),
        toolName: String(partType).slice(5),
        input: partObj.input,
        output: partObj.output,
        state: partObj.state as string | undefined,
      });
    }
  }

  return toolCalls;
}

function extractTextContent(parts: UIMessage['parts']): string {
  if (!parts) return '';

  return parts
    .filter((p): p is { type: 'text'; text: string } =>
      typeof p === 'object' &&
      p !== null &&
      'type' in p &&
      (p as { type: unknown }).type === 'text' &&
      'text' in p
    )
    .map(p => p.text)
    .join('');
}

export const ChatMessage = memo(function ChatMessage({ message, isLast }: ChatMessageProps) {
  const toolCalls = extractToolCalls(message.parts);
  const textContent = extractTextContent(message.parts);

  return (
    <Message from={message.role} className={cn(isLast && 'pb-2')}>
      <MessageContent>
        {textContent && <MessageResponse>{textContent}</MessageResponse>}

        {/* Tool Calls */}
        {toolCalls.length > 0 && (
          <div className="space-y-1 mt-2">
            {toolCalls.map((toolCall, index) => (
              <Tool key={toolCall.toolCallId || index}>
                <ToolHeader
                  state={mapToolState(
                    toolCall.state,
                    toolCall.output,
                    toolCall.errorMessage
                  )}
                  toolName={toolCall.toolName}
                  type="dynamic-tool"
                />
                <ToolContent>
                  {toolCall.input !== undefined && (
                    <ToolInput input={toolCall.input} />
                  )}
                  {(toolCall.output !== undefined || toolCall.errorMessage) && (
                    <ToolOutput
                      errorText={toolCall.errorMessage}
                      output={
                        toolCall.output !== undefined
                          ? ToolResultRegistry.render(
                            toolCall.toolName,
                            toolCall.output
                          )
                          : undefined
                      }
                    />
                  )}
                </ToolContent>
              </Tool>
            ))}
          </div>
        )}
      </MessageContent>
    </Message>
  );
});
