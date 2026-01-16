import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useTranslation } from 'react-i18next';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { useProject } from '../contexts';
import { cn } from '../lib/utils';

const models = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'deepseek-r1', label: 'DeepSeek R1' },
];

export function ChatPage() {
  const { t } = useTranslation('common');
  const { currentProject } = useProject();
  const enableAi = import.meta.env.VITE_ENABLE_AI === 'true';
  const projectId = currentProject?.id;
  const [model, setModel] = useState(models[0].value);

  const storageKey = useMemo(
    () => `leanspec-chat:${projectId ?? 'default'}`,
    [projectId]
  );

  const [initialMessages] = useState(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [];
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    setMessages,
  } = useChat({
    api: '/api/chat',
    initialMessages,
    body: {
      projectId,
      model,
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  if (!enableAi) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h1 className="text-xl font-semibold">{t('chat.disabledTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('chat.disabledDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('chat.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('chat.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t('chat.modelLabel')}</label>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            {models.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            onClick={() => setMessages([])}
            disabled={!messages.length}
          >
            {t('chat.clear')}
          </Button>
        </div>
      </div>

      <Card className="flex-1">
        <CardContent className="p-0">
          <div className="h-[60vh] overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">{t('chat.empty')}</div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'rounded-lg px-4 py-3 text-sm whitespace-pre-wrap',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto w-fit max-w-[80%]'
                    : 'bg-muted text-foreground mr-auto w-fit max-w-[80%]'
                )}
              >
                {message.content}
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-muted-foreground">{t('chat.thinking')}</div>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={input}
          onChange={handleInputChange}
          rows={4}
          placeholder={t('chat.placeholder')}
          className="w-full rounded-md border border-border bg-background p-3 text-sm"
        />
        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-xs text-destructive">{error.message}</span>
          ) : (
            <span className="text-xs text-muted-foreground">{t('chat.helper')}</span>
          )}
          <Button type="submit" disabled={isLoading || input.trim().length === 0}>
            {t('chat.send')}
          </Button>
        </div>
      </form>
    </div>
  );
}
