import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UIMessage } from '@ai-sdk/react';
import type { ReactNode } from 'react';
import type { SourceDocumentUIPart } from 'ai';
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
  usePromptInputReferencedSources,
  Alert,
  AlertDescription,
} from '@/library';
import { MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { useCurrentProject } from '../../hooks/useProjectQuery';
import { useSpecsList } from '../../hooks/useSpecsQuery';
import type { Spec } from '../../types/api';
import { SpecContextTrigger, SpecContextChips } from '../spec-context-attachments';

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

function toSourceDocument(spec: Spec): SourceDocumentUIPart {
  return {
    type: 'source-document',
    sourceId: spec.specName,
    title: spec.title ?? spec.specName,
    filename: spec.specName,
    mediaType: 'text/markdown',
  } as SourceDocumentUIPart;
}

function extractSourceId(source: SourceDocumentUIPart): string | null {
  const sourceId = (source as { sourceId?: string }).sourceId;
  const title = (source as { title?: string }).title;
  const filename = (source as { filename?: string }).filename;
  return sourceId ?? title ?? filename ?? null;
}

/**
 * Syncs lifted selectedSpecIds state into PromptInput's referencedSources
 * so they are included on submit. Must be rendered inside <PromptInput>.
 */
function SpecRefsSync({
  specs,
  selectedSpecIds,
}: {
  specs: Spec[];
  selectedSpecIds: string[];
}) {
  const refs = usePromptInputReferencedSources();
  const prevRef = useRef<string[]>([]);

  useEffect(() => {
    const prev = new Set(prevRef.current);
    const next = new Set(selectedSpecIds);

    // Remove deselected
    for (const source of refs.sources) {
      const id = extractSourceId(source);
      if (id && !next.has(id)) {
        refs.remove(source.id);
      }
    }

    // Add newly selected
    for (const specId of selectedSpecIds) {
      if (!prev.has(specId)) {
        const spec = specs.find((s) => s.specName === specId);
        if (spec) {
          refs.add(toSourceDocument(spec));
        }
      }
    }

    prevRef.current = selectedSpecIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to selectedSpecIds changes
  }, [selectedSpecIds, specs]);

  return null;
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
  const { currentProject } = useCurrentProject();
  const specsQuery = useSpecsList(currentProject?.id ?? null);
  const specs = (specsQuery.data as Spec[] | undefined) ?? [];
  const hasMessages = messages.length > 0 || error;
  const [selectedSpecIds, setSelectedSpecIds] = useState<string[]>([]);

  const handleSubmit = (message: { text: string; referencedSources: SourceDocumentUIPart[] }) => {
    if (message.text.trim()) {
      const referencedSpecs = message.referencedSources
        .map((source) => extractSourceId(source))
        .filter((value): value is string => Boolean(value));

      const textWithContext = referencedSpecs.length
        ? `${t('chat.specContextPrefix')}\n${referencedSpecs.map((id) => `- ${id}`).join('\n')}\n\n${message.text}`
        : message.text;

      onSubmit(textWithContext);
      setSelectedSpecIds([]);
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

      {/* Input Area */}
      <div className="border-t bg-background">
        {/* Selected spec chips — above the prompt input */}
        <SpecContextChips
          specs={specs}
          selectedSpecIds={selectedSpecIds}
          onSelectedSpecIdsChange={setSelectedSpecIds}
          className="px-4 pt-3"
        />

        <div className="p-4 pt-2">
          <PromptInput onSubmit={handleSubmit}>
            <SpecRefsSync specs={specs} selectedSpecIds={selectedSpecIds} />
            <PromptInputBody>
              <PromptInputTextarea
                ref={inputRef}
                className="text-sm"
                placeholder={t('chat.placeholder')}
                disabled={isLoading}
                data-chat-input="true"
              />
            </PromptInputBody>
            <PromptInputFooter className="py-1">
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <SpecContextTrigger
                  specs={specs}
                  selectedSpecIds={selectedSpecIds}
                  onSelectedSpecIdsChange={setSelectedSpecIds}
                  searchPlaceholder={t('sessions.select.search')}
                  emptyLabel={t('sessions.select.empty')}
                  triggerLabel={t('chat.attachSpec')}
                />
                {footerContent}
              </div>
              <PromptInputSubmit
                disabled={isLoading}
                status={isLoading ? 'submitted' : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
