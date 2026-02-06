import { useTranslation } from 'react-i18next';
import type { UIMessage } from '@ai-sdk/react';
import type { ReactNode } from 'react';
import { ChatMessage } from './chat-message';
import { ThinkingIndicator } from './thinking-indicator';
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
  Alert,
  AlertDescription,
} from '@/library';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';

interface ChatContainerProps {
  messages: UIMessage[];
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
  /** Additional content to render in the prompt input footer (e.g., model selector) */
  footerContent?: ReactNode;
  /** Ref to the prompt input textarea */
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
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
  footerContent,
  inputRef,
}: ChatContainerProps) {
  const { t } = useTranslation('common');
  const hasMessages = messages.length > 0 || error;

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
              {error && (
                <Alert variant="destructive" className="mx-4 my-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error.message || t('chat.error')}</span>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="ml-4 flex items-center gap-1 text-sm underline hover:no-underline"
                      >
                        <RefreshCw className="h-3 w-3" />
                        {t('actions.retry')}
                      </button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {isLoading && <ThinkingIndicator />}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input Area with PromptInput */}
      <div className="border-t bg-background p-4">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              ref={inputRef}
              className="text-sm"
              placeholder={t('chat.placeholder')}
              disabled={isLoading}
              data-chat-input="true"
            />
          </PromptInputBody>
          <PromptInputFooter>
            {footerContent ?? <div className="flex-1" />}
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
