import { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, Settings } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@leanspec/ui-components';
import { ChatContainer } from './chat';
import { EnhancedModelSelector } from './chat/EnhancedModelSelector';
import { useLeanSpecChat } from '../lib/use-chat';
import { useProject } from '../contexts';
import { ChatApi, type ChatThread } from '../lib/chat-api';
import type { UIMessage } from '@ai-sdk/react';
import { cn } from '../lib/utils';

interface GlobalChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function GlobalChatWidget({ isOpen, onClose }: GlobalChatWidgetProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useProject();

  const [selectedModel, setSelectedModel] = useState<{ providerId: string; modelId: string }>({
    providerId: 'openai',
    modelId: 'gpt-4o',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Load threads
  const loadThreads = useCallback(async () => {
    try {
      if (!currentProject?.id) {
        setThreads([]);
        return;
      }
      const loadedThreads = await ChatApi.getThreads(currentProject.id);
      setThreads(loadedThreads);

      // Auto-select last active thread
      if (!activeThreadId && loadedThreads.length > 0) {
        setActiveThreadId(loadedThreads[0].id);
      }
    } catch (e) {
      console.error("Failed to load threads", e);
    }
  }, [currentProject?.id, activeThreadId]);

  useEffect(() => {
    if (isOpen && currentProject?.id) {
      loadThreads();
    }
  }, [isOpen, currentProject?.id, loadThreads]);

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    reload,
  } = useLeanSpecChat({
    providerId: selectedModel.providerId,
    modelId: selectedModel.modelId,
    threadId: activeThreadId
  });

  // Title Generation Logic
  useEffect(() => {
    if (activeThreadId && messages.length >= 2) {
      const thread = threads.find(t => t.id === activeThreadId);
      if (thread && thread.title === 'New Chat') {
        const timer = setTimeout(async () => {
          let generatedTitle = "Conversation";
          const userMsg = messages.find((m: UIMessage) => m.role === 'user');
          if (userMsg) {
            const text = extractTextFromMessage(userMsg);
            generatedTitle = text.slice(0, 30) + (text.length > 30 ? "..." : "");
          }

          await ChatApi.updateThread(activeThreadId, { title: generatedTitle });
          loadThreads();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, activeThreadId, threads, loadThreads]);

  const handleSendMessage = async (text: string) => {
    if (!activeThreadId) {
      if (!currentProject?.id) {
        return;
      }
      const thread = await ChatApi.createThread(currentProject.id, selectedModel);
      setActiveThreadId(thread.id);
      await loadThreads();
      setPendingMessage(text);
    } else {
      sendMessage({ text });
      setTimeout(loadThreads, 1000);
    }
  };

  useEffect(() => {
    if (activeThreadId && pendingMessage) {
      sendMessage({ text: pendingMessage });
      setPendingMessage(null);
      setTimeout(loadThreads, 1000);
    }
  }, [activeThreadId, pendingMessage, sendMessage, loadThreads]);

  const handleOpenSettings = () => {
    const targetPath = projectId
      ? `/projects/${projectId}/chat/settings`
      : currentProject?.id
        ? `/projects/${currentProject.id}/chat/settings`
        : '/chat/settings';
    navigate(targetPath);
    onClose();
  };

  const handleOpenFullChat = () => {
    const targetPath = projectId
      ? `/projects/${projectId}/chat`
      : currentProject?.id
        ? `/projects/${currentProject.id}/chat`
        : '/chat';
    navigate(targetPath);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <Card
        className={cn(
          "w-full max-w-2xl h-[600px] flex flex-col pointer-events-auto",
          "shadow-2xl border-2",
          "animate-in slide-in-from-bottom-4 duration-300"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-semibold">{t('chat.title')}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(!showSettings)}
              title={t('chat.toggleModelSettings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenFullChat}
            >
              {t('chat.openFullChat', 'Full Chat')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              title={t('actions.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-2 border-b bg-muted/50 space-y-2">
            <EnhancedModelSelector
              value={selectedModel}
              onChange={(m) => {
                setSelectedModel(m);
              }}
              disabled={isLoading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSettings}
              className="w-full"
            >
              {t('chat.settings.title')}
            </Button>
          </div>
        )}

        {/* Chat Container */}
        <div className="flex-1 min-h-0">
          <ChatContainer
            messages={messages}
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            error={error as Error | null}
            onRetry={reload}
            className="h-full"
          />
        </div>
      </Card>
    </div>
  );
}
