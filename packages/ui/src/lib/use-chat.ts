import { useChat as useAIChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useProject } from '../contexts';
import { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { ChatApi } from './chat-api';

interface UseLeanSpecChatOptions {
  /** Provider ID (e.g., 'openai', 'anthropic') */
  providerId?: string;
  /** Model ID (e.g., 'gpt-4o', 'claude-sonnet-4-5') */
  modelId?: string;
  /** Thread ID for persistence */
  threadId?: string;
}

export function useLeanSpecChat(options: UseLeanSpecChatOptions = {}) {
  const { currentProject } = useProject();
  const messagesRef = useRef<UIMessage[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load initial messages when threadId changes
  useEffect(() => {
    let active = true;
    if (options.threadId) {
        setLoadingHistory(true);
        ChatApi.getMessages(options.threadId).then(msgs => {
            if (active) {
                setInitialMessages(msgs);
                setLoadingHistory(false);
            }
        });
    } else {
        setInitialMessages([]);
    }
    return () => { active = false; };
  }, [options.threadId]);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
  const api = `${baseUrl}/api/chat`;

  // Create transport with proper options
  const transport = useMemo(() => new DefaultChatTransport({
    api,
    body: {
      projectId: currentProject?.id,
      providerId: options.providerId,
      modelId: options.modelId,
    },
  }), [api, currentProject?.id, options.providerId, options.modelId]);

  const chatHook = useAIChat({
    id: options.threadId || 'new-chat',
    transport,
    onFinish: ({ messages }) => {
      // Store messages after each completion
      if (options.threadId) {
        ChatApi.saveMessages(options.threadId, messages);
      }
    },
    onError: (error) => {
      console.error('[LeanSpec Chat] Error:', error);
    },
  });

  // Keep track of messages for clearing
  messagesRef.current = chatHook.messages;

  // Sync messages when initialMessages change (e.g. loading a different thread)
  // useAIChat doesn't automatically reset messages when initialMessages prop changes unless we force it or use key
  useEffect(() => {
     if (options.threadId && chatHook.status !== 'submitted' && chatHook.status !== 'streaming') {
         chatHook.setMessages(initialMessages);
     }
  }, [initialMessages, options.threadId, chatHook.status]);

  const clearChat = useCallback(() => {
    chatHook.setMessages([]);
    if (options.threadId) {
        ChatApi.saveMessages(options.threadId, []);
    }
  }, [chatHook, options.threadId]);

  // Map the new API to our expected interface
  const isLoading = chatHook.status === 'submitted' || chatHook.status === 'streaming' || loadingHistory;

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
