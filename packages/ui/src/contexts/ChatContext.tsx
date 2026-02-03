import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocalStorage } from '@leanspec/ui-components';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { ChatApi, type ChatThread } from '../lib/chat-api';

interface ChatContextType {
  isOpen: boolean;
  sidebarWidth: number;
  activeConversationId: string | null;
  conversations: ChatThread[];
  showHistory: boolean;

  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  selectConversation: (id: string) => void;
  createConversation: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  toggleHistory: () => void;
  refreshConversations: () => Promise<void>;

  // Legacy support
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { currentProject } = useCurrentProject();

  const [isOpen, setIsOpen] = useLocalStorage<boolean>('leanspec.chat.isOpen', false);
  const [sidebarWidth, setSidebarWidth] = useLocalStorage<number>('leanspec.chat.sidebarWidth', 400);
  const [showHistory, setShowHistory] = useLocalStorage<boolean>('leanspec.chat.historyExpanded', false);
  const [activeConversationId, setActiveConversationId] = useLocalStorage<string | null>('leanspec.chat.activeConversationId', null);

  const [conversations, setConversations] = useState<ChatThread[]>([]);

  const refreshConversations = async () => {
    if (!currentProject?.id) {
      setConversations([]);
      return;
    }
    try {
      const threads = await ChatApi.getThreads(currentProject.id);
      setConversations(threads);
    } catch (error) {
      console.error('Failed to load threads:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshConversations();
    }
  }, [isOpen, currentProject?.id]);

  const toggleSidebar = () => setIsOpen((prev: boolean) => !prev);

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
  };

  const createConversation = async () => {
    if (!currentProject?.id) return;
    try {
      const thread = await ChatApi.createThread(currentProject.id, {
        providerId: 'openai',
        modelId: 'gpt-4o'
      });
      await refreshConversations();
      setActiveConversationId(thread.id);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await ChatApi.deleteThread(id);
      setConversations((prev: ChatThread[]) => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const toggleHistory = () => setShowHistory((prev: boolean) => !prev);

  // Legacy compatibility
  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  return (
    <ChatContext.Provider value={{
      isOpen,
      sidebarWidth,
      activeConversationId,
      conversations,
      showHistory,
      toggleSidebar,
      setSidebarWidth,
      selectConversation,
      createConversation,
      deleteConversation,
      toggleHistory,
      refreshConversations,
      // Legacy
      isChatOpen: isOpen,
      openChat,
      closeChat,
      toggleChat: toggleSidebar
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
