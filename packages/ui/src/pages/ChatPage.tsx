import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { ChatContainer } from '../components/chat';
import { EnhancedModelSelector } from '../components/chat/EnhancedModelSelector';
import { ChatSidebar } from '../components/chat/sidebar/ChatSidebar';
import { useLeanSpecChat } from '../lib/use-chat';
import { useProject } from '../contexts';
import { Trash2, Settings2, Sliders } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { ChatApi, type ChatThread } from '../lib/chat-api';
import type { UIMessage } from '@ai-sdk/react';

// Helper to extract text content from UIMessage parts
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

export function ChatPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { currentProject, loading: projectLoading } = useProject();
  const enableAi = import.meta.env.VITE_ENABLE_AI !== 'false';

  const [selectedModel, setSelectedModel] = useState<{ providerId: string; modelId: string }>({
    providerId: 'openai',
    modelId: 'gpt-4o',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);

  // Load threads
  const loadThreads = useCallback(async () => {
    try {
      const loadedThreads = await ChatApi.getThreads();
      setThreads(loadedThreads);
    } catch (e) {
      console.error("Failed to load threads", e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    ChatApi.getThreads()
      .then((loadedThreads) => {
        if (!cancelled) {
          setThreads(loadedThreads);
        }
      })
      .catch((e) => {
        console.error("Failed to load threads", e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    reload,
    clearChat,
  } = useLeanSpecChat({
    providerId: selectedModel.providerId,
    modelId: selectedModel.modelId,
    threadId: activeThreadId
  });

  // Title Generation Logic
  useEffect(() => {
    if (activeThreadId && messages.length >= 2) {
      const thread = threads.find(t => t.id === activeThreadId);
      // Only update if title is default 'New Chat'
      if (thread && thread.title === 'New Chat') {
        const timer = setTimeout(async () => {
          let generatedTitle = "Conversation";
          const userMsg = messages.find((m: UIMessage) => m.role === 'user');
          if (userMsg) {
            // Simple heuristic for now: first 30 chars of user message
            // In production this should call an LLM
            const text = extractTextFromMessage(userMsg);
            generatedTitle = text.slice(0, 30) + (text.length > 30 ? "..." : "");
          }

          await ChatApi.updateThread(activeThreadId, { title: generatedTitle });
          loadThreads();
        }, 2000); // Wait a bit to not flicker too fast
        return () => clearTimeout(timer);
      }
    }
  }, [messages, activeThreadId, threads, loadThreads]);

  // Handle threads
  const handleSelectThread = (id: string) => {
    setActiveThreadId(id);
    const thread = threads.find(t => t.id === id);
    if (thread) {
      setSelectedModel(thread.model);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeThreadId) {
      const thread = await ChatApi.createThread(selectedModel);
      setActiveThreadId(thread.id);
      await loadThreads();
      // We can't send message here because the hook needs to update with new threadId
      // This creates a UX issue where the first message might need to be clicked again or we need to wait.
      // For now, we rely on the user having created a chat or create one implicitly and ASK them to retry? 
      // Or just creating the thread sets the state, useLeanSpecChat sees it, and we can call sendMessage?
      // No, because sendMessage is a stable function reference from previous render? useAIChat usually returns stable sendMessage.
      // But it uses the ID passed *during render*. 

      // Actually, let's auto-select a thread if none exists on mount.
    } else {
      sendMessage({ text });
      setTimeout(loadThreads, 1000);
    }
  };

  const handleCreateNewChat = async () => {
    const thread = await ChatApi.createThread(selectedModel);
    setActiveThreadId(thread.id);
    loadThreads();
  }

  const handleDeleteThread = async (id: string) => {
    await ChatApi.deleteThread(id);
    if (activeThreadId === id) {
      setActiveThreadId(undefined);
    }
    loadThreads();
  }

  const handleRenameThread = async (id: string, newTitle: string) => {
    await ChatApi.updateThread(id, { title: newTitle });
    loadThreads();
  }

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

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">{t('actions.loading')}</div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h1 className="text-xl font-semibold">{t('projects.errors.noProjectSelected')}</h1>
            <p className="text-sm text-muted-foreground">{t('projects.description')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ChatSidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewChat={handleCreateNewChat}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        className="flex-shrink-0"
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div>
            <h1 className="text-lg font-semibold">{threads.find(t => t.id === activeThreadId)?.title || t('chat.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('chat.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Model Settings Toggle */}
            <Button
              variant={showSettings ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              title={t('chat.toggleModelSettings')}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            {/* Advanced Settings */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('settings')}
              title={t('chat.settings.title')}
            >
              <Sliders className="h-4 w-4" />
            </Button>
            {/* Clear Chat */}
            <Button
              variant="ghost"
              size="icon"
              onClick={clearChat}
              disabled={messages.length === 0}
              title={t('chat.clear')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-2 border-b bg-muted/50">
            <EnhancedModelSelector
              value={selectedModel}
              onChange={(m) => {
                setSelectedModel(m);
              }}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Chat Container */}
        {activeThreadId ? (
          <ChatContainer
            messages={messages}
            onSubmit={(text) => handleSendMessage(text)}
            isLoading={isLoading}
            error={error as Error | null}
            onRetry={reload}
            className="flex-1 min-h-0"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-4">Select a conversation or start a new one.</p>
              <Button onClick={handleCreateNewChat}>New Chat</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
