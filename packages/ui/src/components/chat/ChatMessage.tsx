import { memo } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { cn } from '@leanspec/ui-components';
import { Bot, User, Check, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
}

function extractToolCalls(parts: UIMessage['parts']): ToolCallInfo[] {
  if (!parts) return [];
  
  const toolCalls: ToolCallInfo[] = [];
  
  for (const part of parts) {
    // Check if it's a tool-related part
    if (typeof part === 'object' && part !== null && 'type' in part) {
      const partType = String((part as { type: unknown }).type);
      
      // Handle tool-* types
      if (partType.startsWith('tool-') && 'toolCallId' in part) {
        toolCalls.push({
          toolCallId: String((part as { toolCallId: unknown }).toolCallId),
          toolName: partType.slice(5), // Remove 'tool-' prefix
          input: (part as { input?: unknown }).input,
          output: (part as { output?: unknown }).output,
          state: (part as { state?: unknown }).state as string | undefined,
        });
      }
      
      // Handle dynamic-tool type
      if (partType === 'dynamic-tool' && 'toolCallId' in part) {
        toolCalls.push({
          toolCallId: String((part as { toolCallId: unknown }).toolCallId),
          toolName: String((part as { toolName?: unknown }).toolName || 'unknown'),
          input: (part as { input?: unknown }).input,
          output: (part as { output?: unknown }).output,
          state: (part as { state?: unknown }).state as string | undefined,
        });
      }
    }
  }
  
  return toolCalls;
}

function ToolDisplay({ toolCall }: { toolCall: ToolCallInfo }) {
  const isComplete = toolCall.state === 'result' || toolCall.output !== undefined;

  return (
    <div className="my-2 rounded-md border bg-muted/50 p-3 text-xs font-mono">
      <div className="flex items-center gap-2 mb-1">
        {isComplete ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
        <span className="font-semibold">{toolCall.toolName}</span>
        <span className="text-muted-foreground">
          {isComplete ? 'completed' : 'running...'}
        </span>
      </div>
      {toolCall.input != null && (
        <pre className="text-[10px] text-muted-foreground overflow-x-auto">
          {JSON.stringify(toolCall.input as Record<string, unknown>, null, 2)}
        </pre>
      )}
    </div>
  );
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

function MessageContent({ message }: { message: UIMessage }) {
  const textContent = extractTextContent(message.parts);

  if (message.role === 'user') {
    return <p className="whitespace-pre-wrap">{textContent}</p>;
  }

  // Assistant message - render as markdown
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const toolCalls = extractToolCalls(message.parts);

  return (
    <div
      className={cn(
        'flex gap-3 py-4 px-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        isLast && !isUser && 'pb-2'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 space-y-2 overflow-hidden',
          isUser ? 'text-right' : 'text-left',
          isUser && 'max-w-[80%] ml-auto',
          !isUser && 'max-w-[90%]'
        )}
      >
        <div
          className={cn(
            'inline-block rounded-lg px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          )}
        >
          <MessageContent message={message} />
        </div>

        {/* Tool Calls */}
        {toolCalls.length > 0 && (
          <div className="space-y-1">
            {toolCalls.map((toolCall, index) => (
              <ToolDisplay 
                key={toolCall.toolCallId || index} 
                toolCall={toolCall} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
