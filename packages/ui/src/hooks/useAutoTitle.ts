import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import type { UIMessage } from '@ai-sdk/react';
import { ChatApi, type ChatThread } from '../lib/chat-api';
import { useCurrentProject } from './useProjectQuery';
import { useQueryClient } from '@tanstack/react-query';
import { chatKeys } from './useChatQuery';

function extractTextFromMessage(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
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

export function useAutoTitle({
  activeThreadId,
  messages,
  threads,
  onUpdate
}: {
  activeThreadId: string | null | undefined;
  messages: UIMessage[];
  threads: ChatThread[];
  onUpdate?: () => void;
}) {
  const { t } = useTranslation('common');
  const { currentProject } = useCurrentProject();
  const inFlightRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const placeholderTitle = t('chat.autoTitle.generating');
  const defaultTitle = t('chat.newChat');
  const legacyDefaultTitle = i18next.t('chat.newChat', { lng: 'en' });

  useEffect(() => {
    if (activeThreadId && messages.length >= 2) {
      const thread = threads.find(t => t.id === activeThreadId);
      // Only update if title is default 'New Chat'
      // Also check if assistant has responded (length >= 2 usually implies user + assistant)
      if (thread && (thread.title === defaultTitle || thread.title === legacyDefaultTitle || !thread.title)) {
        if (inFlightRef.current === activeThreadId) return;
        inFlightRef.current = activeThreadId;

        if (currentProject?.id) {
          queryClient.setQueryData<ChatThread[]>(
            chatKeys.threads(currentProject.id),
            (prev = []) =>
              prev.map((item) =>
                item.id === activeThreadId && (item.title === defaultTitle || item.title === legacyDefaultTitle || !item.title)
                  ? { ...item, title: placeholderTitle }
                  : item
              )
          );
        }

        const timer = setTimeout(async () => {
          let generatedTitle = '';
          const userMsg = messages.find((m: UIMessage) => m.role === 'user');
          const text = userMsg ? extractTextFromMessage(userMsg).trim() : '';

          try {
            if (text) {
              generatedTitle = await ChatApi.generateTitle({
                text,
                projectId: currentProject?.id,
                providerId: thread.model?.providerId,
                modelId: thread.model?.modelId,
              });
            }
          } catch (error) {
            console.warn('Auto title generation failed, falling back', error);
          }

          if (!generatedTitle && text) {
            generatedTitle = text.slice(0, 50) + (text.length > 50 ? '...' : '');
          }

          if (generatedTitle) {
            try {
              await ChatApi.updateThread(activeThreadId, { title: generatedTitle });
              if (currentProject?.id) {
                queryClient.invalidateQueries({
                  queryKey: chatKeys.threads(currentProject.id),
                });
              }
              if (onUpdate) onUpdate();
            } catch (error) {
              console.error('Failed to auto-update title', error);
            }
          } else if (currentProject?.id) {
            queryClient.invalidateQueries({
              queryKey: chatKeys.threads(currentProject.id),
            });
          }

          inFlightRef.current = null;
        }, 800); // Keep a short delay to avoid flicker

        return () => clearTimeout(timer);
      }
    }
  }, [messages, activeThreadId, threads, onUpdate, currentProject?.id, queryClient, placeholderTitle, defaultTitle, legacyDefaultTitle]);
}
