import { memo } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { cn } from '@leanspec/ui-components';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ToolExecution } from './ToolExecution';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
        if(invocation) {
             toolCalls.push({
                 toolCallId: String(invocation.toolCallId ?? ''),
                 toolName: String(invocation.toolName ?? ''),
                 input: invocation.args,
                 output: invocation.result,
                 state: invocation.state as string | undefined,
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

function MessageContent({ message }: { message: UIMessage }) {
  const textContent = extractTextContent(message.parts);

  if (message.role === 'user') {
    return <p className="whitespace-pre-wrap text-sm">{textContent}</p>;
  }

  // Assistant message - render as markdown
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-sm break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { className, children, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match;
            return !isInline && match ? (
              <div className="rounded-md overflow-hidden my-2">
                 <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{ margin: 0, padding: '0.75rem' }}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
              </div>
            ) : (
              <code className={cn("bg-muted px-1 py-0.5 rounded font-mono text-xs", className)} {...rest}>
                {children}
              </code>
            )
          }
        }}
      >
        {textContent}
      </ReactMarkdown>
    </div>
  );
}

export const ChatMessage = memo(function ChatMessage({ message, isLast }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const toolCalls = extractToolCalls(message.parts);

  return (
    <div
      className={cn(
        'flex gap-3 py-4 px-2 hover:bg-muted/10 transition-colors',
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
         {/* Only show standard bubble background for simple text messages, 
             for usage with tools or complex markdown we might want less constraints?
             But current design uses blocks. 
         */}
        <div
          className={cn(
            'inline-block text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-lg px-4 py-2'
              : 'text-foreground'
          )}
        >
          <MessageContent message={message} />
        </div>

        {/* Tool Calls */}
        {toolCalls.length > 0 && (
          <div className="space-y-1 mt-2">
            {toolCalls.map((toolCall, index) => (
              <ToolExecution 
                key={toolCall.toolCallId || index} 
                {...toolCall} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
