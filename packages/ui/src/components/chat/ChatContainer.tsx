import { useTranslation } from 'react-i18next';
import type { UIMessage } from '@ai-sdk/react';
import { ChatMessage } from './ChatMessage';
import {
  cn,
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  Loader,
} from '@leanspec/ui-components';
import { MessageSquare } from 'lucide-react';

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

export function ChatContainer({
  messages,
  onSubmit,
  isLoading,
  error,
  onRetry,
  className,
}: ChatContainerProps) {
  const { t } = useTranslation('common');
  const hasMessages = messages.length > 0;

  const handleSubmit = (message: { text: string }) => {
    if (message.text.trim()) {
      onSubmit(message.text);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area with Conversation */}
      <Conversation className="flex-1">
        <ConversationContent>
          {!hasMessages ? (
            <EmptyState />
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                />
              ))}
              {isLoading && <Loader size={20} />}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

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

      {/* Input Area with PromptInput */}
      <div className="border-t bg-background p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={t('chat.placeholder')}
              disabled={isLoading}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div className="flex-1" />
            <PromptInputSubmit
              disabled={isLoading}
              status={isLoading ? 'submitted' : undefined}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
