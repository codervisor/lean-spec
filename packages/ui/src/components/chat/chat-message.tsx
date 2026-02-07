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

function renderToolInvocation(
  partObj: Record<string, unknown>,
  key: string | number
) {
  const invocation = partObj.toolInvocation as Record<string, unknown> | undefined;
  if (!invocation) return null;

  const errorMessage =
    typeof invocation.error === 'string'
      ? invocation.error
      : typeof invocation.errorMessage === 'string'
        ? invocation.errorMessage
        : undefined;

  const toolCallId = String(invocation.toolCallId ?? '');
  const toolName = String(invocation.toolName ?? '');
  const input = invocation.args;
  const output = invocation.result;
  const state = invocation.state as string | undefined;

  return (
    <Tool key={toolCallId || key}>
      <ToolHeader
        state={mapToolState(state, output, errorMessage)}
        toolName={toolName}
        type="dynamic-tool"
      />
      <ToolContent>
        {input !== undefined && <ToolInput input={input} />}
        {(output !== undefined || errorMessage) && (
          <ToolOutput
            errorText={errorMessage}
            output={
              output !== undefined
                ? ToolResultRegistry.render(toolName, output)
                : undefined
            }
          />
        )}
      </ToolContent>
    </Tool>
  );
}

function renderLegacyToolPart(
  partObj: Record<string, unknown>,
  key: string | number
) {
  const toolCallId = String(partObj.toolCallId ?? '');
  const partType = String(partObj.type);
  const toolName =
    partType === 'tool-call'
      ? String(partObj.toolName ?? '')
      : partType.slice(5);
  const input = partType === 'tool-call' ? partObj.args : partObj.input;
  const output = partObj.output;
  const state =
    partType === 'tool-call'
      ? 'call'
      : (partObj.state as string | undefined);

  return (
    <Tool key={toolCallId || key}>
      <ToolHeader
        state={mapToolState(state, output)}
        toolName={toolName}
        type="dynamic-tool"
      />
      <ToolContent>
        {input !== undefined && <ToolInput input={input} />}
        {output !== undefined && (
          <ToolOutput
            output={ToolResultRegistry.render(toolName, output)}
          />
        )}
      </ToolContent>
    </Tool>
  );
}

export const ChatMessage = memo(function ChatMessage({ message, isLast }: ChatMessageProps) {
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

          // Tool invocation (AI SDK 3.1+)
          if (partType === 'tool-invocation') {
            return renderToolInvocation(partObj, index);
          }

          // Legacy tool-call part
          if (partType === 'tool-call') {
            return renderLegacyToolPart(partObj, index);
          }

          // tool-result is handled inline within tool-invocation; skip standalone
          if (partType === 'tool-result') {
            return null;
          }

          // Fallback: custom tool-* parts
          if (
            String(partType).startsWith('tool-') &&
            'toolCallId' in partObj
          ) {
            return renderLegacyToolPart(partObj, index);
          }

          return null;
        })}
      </MessageContent>
    </Message>
  );
});
