import { useChat as useAIChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useProject } from '../contexts';
import { useMemo, useRef, useCallback } from 'react';

const CHAT_STORAGE_KEY = 'leanspec-chat-history';

function getStoredMessages(): UIMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function storeMessages(messages: UIMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // Ignore storage errors
  }
}

function clearStoredMessages() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CHAT_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

interface UseLeanSpecChatOptions {
  /** Optional model override */
  model?: string;
}

export function useLeanSpecChat(options: UseLeanSpecChatOptions = {}) {
  const { currentProject } = useProject();
  const messagesRef = useRef<UIMessage[]>([]);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333';
  const api = `${baseUrl}/api/chat`;

  // Create transport with proper options
  const transport = useMemo(() => new DefaultChatTransport({
    api,
    body: {
      projectId: currentProject?.id,
      model: options.model,
    },
  }), [api, currentProject?.id, options.model]);

  const chatHook = useAIChat({
    id: 'leanspec-chat',
    transport,
    messages: getStoredMessages(),
    onFinish: ({ messages }) => {
      // Store messages after each completion
      storeMessages(messages);
    },
    onError: (error) => {
      console.error('[LeanSpec Chat] Error:', error);
    },
  });

  // Keep track of messages for clearing
  messagesRef.current = chatHook.messages;

  const clearChat = useCallback(() => {
    chatHook.setMessages([]);
    clearStoredMessages();
  }, [chatHook]);

  // Map the new API to our expected interface
  const isLoading = chatHook.status === 'submitted' || chatHook.status === 'streaming';

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

