import { Message, MessageContent } from '@leanspec/ui-components';

export function ThinkingIndicator() {
  return (
    <Message from="assistant" className="animate-in fade-in duration-300" data-testid="thinking-indicator">
      <MessageContent className="min-w-[60px] py-3 px-4">
        <div className="flex space-x-1.5 items-center justify-center">
           <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.32s]"></span>
           <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both] [animation-delay:-0.16s]"></span>
           <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-[bounce_1.4s_infinite_ease-in-out_both]"></span>
        </div>
      </MessageContent>
    </Message>
  );
}
