import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UIMessage } from '@ai-sdk/react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { cn } from '@leanspec/ui-components';
import { Loader2, MessageSquare } from 'lucide-react';

interface ChatContainerProps {
  messages: UIMessage[];
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

function EmptyState() {
  const { t } = useTranslation('common');

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{t('chat.title')}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {t('chat.empty')}
      </p>
    </div>
  );
}

function ThinkingIndicator() {
  const { t } = useTranslation('common');

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{t('chat.thinking')}</span>
    </div>
  );
}

export function ChatContainer({
  messages,
  onSubmit,
  isLoading,
  error,
  onRetry,
  className,
}: ChatContainerProps) {
  const { t } = useTranslation('common');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-border/50">
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
            {isLoading && <ThinkingIndicator />}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20 text-sm text-destructive flex items-center justify-between">
          <span>{error.message || 'An error occurred'}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="underline hover:no-underline text-xs"
            >
              {t('actions.retry')}
            </button>
          )}
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <ChatInput onSubmit={onSubmit} isLoading={isLoading} />
      </div>
    </div>
  );
}
