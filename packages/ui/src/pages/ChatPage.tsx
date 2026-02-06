import { useTranslation } from 'react-i18next';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { ChatContainer } from '../components/chat';
import { EnhancedModelSelector } from '../components/chat/enhanced-model-selector';
import { InlineModelSelector } from '../components/chat/inline-model-selector';
import { ChatSidebar } from '../components/chat/sidebar/chat-sidebar';
import { ChatSkeleton } from '../components/shared/skeletons';
import { useLeanSpecChat } from '../lib/use-chat';
import { useModelsRegistry } from '../lib/use-models-registry';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useAutoTitle } from '../hooks/useAutoTitle';
import { useChatThreadMutations, useChatThreads } from '../hooks/useChatQuery';
import { Trash2, Settings2 } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { PageContainer } from '../components/shared/page-container';

export function ChatPage() {
  const { t } = useTranslation('common');
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const { defaultSelection, loading: registryLoading } = useModelsRegistry();

  const [selectedModel, setSelectedModel] = useState<{ providerId: string; modelId: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  const pendingMessageRef = useRef<string | null>(null);
  const { data: threads = [] } = useChatThreads(currentProject?.id ?? null);
  const { createThread, updateThread, deleteThread } = useChatThreadMutations(currentProject?.id ?? null);
  const effectiveModel = selectedModel ?? defaultSelection ?? null;

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    reload,
    clearChat,
  } = useLeanSpecChat({
    providerId: effectiveModel?.providerId ?? '',
    modelId: effectiveModel?.modelId ?? '',
    threadId: activeThreadId
  });

  // Title Generation Logic
  useAutoTitle({
    activeThreadId,
    messages,
    threads,
  });

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
      if (!currentProject?.id || !effectiveModel) {
        return;
      }
      const thread = await createThread({ model: effectiveModel });
      setActiveThreadId(thread.id);
      pendingMessageRef.current = text;
    } else {
      sendMessage({ text });
    }
  };

  useEffect(() => {
    if (activeThreadId && pendingMessageRef.current) {
      sendMessage({ text: pendingMessageRef.current });
      pendingMessageRef.current = null;
    }
  }, [activeThreadId, sendMessage]);

  // Update thread model when selectedModel changes
  const currentThread = useMemo(() => 
    threads.find(t => t.id === activeThreadId), 
    [threads, activeThreadId]
  );

  useEffect(() => {
    if (!activeThreadId || !effectiveModel || !currentThread) {
      return;
    }
    if (currentThread.model.providerId === effectiveModel.providerId && currentThread.model.modelId === effectiveModel.modelId) {
      return;
    }
    updateThread({ id: activeThreadId, updates: { model: effectiveModel } })
      .catch((error: Error) => {
        console.warn('Failed to update chat model', error);
      });
  }, [activeThreadId, effectiveModel, currentThread, updateThread]);

  const handleCreateNewChat = async () => {
    if (!currentProject?.id || !effectiveModel) {
      return;
    }
    const thread = await createThread({ model: effectiveModel });
    setActiveThreadId(thread.id);
  }

  const handleDeleteThread = async (id: string) => {
    await deleteThread(id);
    if (activeThreadId === id) {
      setActiveThreadId(undefined);
    }
  }

  const handleRenameThread = async (id: string, newTitle: string) => {
    await updateThread({ id, updates: { title: newTitle } });
  }

  if (projectLoading) {
    return <ChatSkeleton />;
  }

  if (!currentProject) {
    return (
      <PageContainer>
        <Card>
          <CardContent className="p-6 space-y-2">
            <h1 className="text-xl font-semibold">{t('projects.errors.noProjectSelected')}</h1>
            <p className="text-sm text-muted-foreground">{t('projects.description')}</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // Show loading state while registry is loading
  if (registryLoading || !effectiveModel) {
    return (
      <PageContainer>
        <ChatSkeleton />
      </PageContainer>
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
              value={effectiveModel}
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
            footerContent={
              <InlineModelSelector
                value={effectiveModel}
                onChange={setSelectedModel}
                disabled={isLoading}
              />
            }
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-4">{t('chat.emptyState.prompt')}</p>
              <Button onClick={handleCreateNewChat}>{t('chat.newChat')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
