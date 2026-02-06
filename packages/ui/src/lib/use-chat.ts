import { useChat as useAIChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { ChatApi } from './chat-api';
import { useChatMessages, chatKeys } from '../hooks/useChatQuery';
import { useQueryClient } from '@tanstack/react-query';

interface UseLeanSpecChatOptions {
  /** Provider ID (e.g., 'openai', 'anthropic') */
  providerId?: string;
  /** Model ID (e.g., 'gpt-4o', 'claude-sonnet-4-5') */
  modelId?: string;
  /** Thread ID for persistence */
  threadId?: string;
}

export function useLeanSpecChat(options: UseLeanSpecChatOptions = {}) {
  const { currentProject } = useCurrentProject();
  const messagesRef = useRef<UIMessage[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const queryClient = useQueryClient();
  const messagesQuery = useChatMessages(options.threadId ?? null);

  useEffect(() => {
    if (options.threadId) {
      setInitialMessages(messagesQuery.data ?? []);
    } else {
      setInitialMessages([]);
    }
  }, [messagesQuery.data, options.threadId]);

  const baseUrl = import.meta.env.VITE_API_URL || '';
  const api = `${baseUrl}/api/chat`;

  // Use a ref to always provide the latest body values to the transport.
  // The Chat instance from @ai-sdk/react is only recreated when 'id' changes,
  // NOT when transport changes. By passing body as a function that reads from
  // a ref, the transport always resolves the current model/provider values
  // at request time (HttpChatTransport calls resolve(this.body) which supports functions).
  const bodyRef = useRef({
    projectId: currentProject?.id,
    sessionId: options.threadId,
    providerId: options.providerId,
    modelId: options.modelId,
  });
  bodyRef.current = {
    projectId: currentProject?.id,
    sessionId: options.threadId,
    providerId: options.providerId,
    modelId: options.modelId,
  };

  // Create transport once per api endpoint — body is resolved dynamically via the ref
  const transport = useMemo(() => new DefaultChatTransport({
    api,
    body: () => bodyRef.current,
  }), [api]);

  const chatHook = useAIChat({
    id: options.threadId || 'new-chat',
    transport,
    onFinish: async ({ messages }) => {
      // Store messages after each completion
      if (options.threadId) {
        try {
          await ChatApi.saveMessages(options.threadId, messages, {
            providerId: options.providerId,
            modelId: options.modelId,
          });
          queryClient.setQueryData(chatKeys.messages(options.threadId), messages);
        } catch (error) {
          console.warn('[LeanSpec Chat] Failed to persist messages:', error);
        }
      }
    },
    onError: (error) => {
      console.error('[LeanSpec Chat] Error:', error);
    },
  });

  // Keep track of messages for clearing
  messagesRef.current = chatHook.messages;

  // Sync messages when initialMessages change (e.g. loading a different thread)
  // Only sync when threadId or initialMessages actually change, NOT on status changes
  // to avoid overwriting streamed messages when streaming finishes
  useEffect(() => {
     if (options.threadId) {
         chatHook.setMessages(initialMessages);
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages, options.threadId]);

  const clearChat = useCallback(() => {
    chatHook.setMessages([]);
    if (options.threadId) {
        ChatApi.saveMessages(options.threadId, [], {
          providerId: options.providerId,
          modelId: options.modelId,
        }).catch((error) => {
          console.warn('[LeanSpec Chat] Failed to clear messages:', error);
        });
    }
  }, [chatHook, options.modelId, options.providerId, options.threadId]);

  // Map the new API to our expected interface
  const isLoading = chatHook.status === 'submitted' || chatHook.status === 'streaming' || messagesQuery.isLoading;

  return {
    messages: chatHook.messages,
    sendMessage: chatHook.sendMessage,
    setMessages: chatHook.setMessages,
    error: chatHook.error,
    status: chatHook.status,
    isLoading,
    stop: chatHook.stop,
    reload: chatHook.regenerate,
    clearChat,
  };
}

export type { UIMessage };
