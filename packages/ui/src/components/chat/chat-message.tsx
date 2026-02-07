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

  return (
    <Message from={message.role} className={cn(isLast && 'pb-2')}>
      <MessageContent>
        {message.parts?.map((part, index) => {
          if (typeof part !== 'object' || part === null || !('type' in part)) {
            return null;
          }

          const partObj = part as Record<string, unknown>;
          const partType = partObj.type;

          // Text part
          if (partType === 'text') {
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

          // Persisted tool-call part — merge with matching tool-result
          if (partType === 'tool-call') {
            const callId = String(partObj.toolCallId ?? '');
            const matchingResult = callId ? toolResultMap.get(callId) : undefined;
            const output = matchingResult?.output;

            return renderToolPart(
              {
                toolCallId: callId,
                toolName: String(partObj.toolName ?? ''),
                description: undefined,
                input: partObj.input,
                output,
                state: output !== undefined ? 'result' : 'call',
                errorMessage: undefined,
              },
              index
            );
          }

          // tool-result is merged into tool-call above; skip standalone
          if (partType === 'tool-result') {
            return null;
          }

          return null;
        })}
      </MessageContent>
    </Message>
  );
}
