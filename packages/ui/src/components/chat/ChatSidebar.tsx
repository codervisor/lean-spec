import { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useMediaQuery } from '../../hooks/use-media-query';
import { cn } from '@leanspec/ui-components';
import { ResizeHandle } from './ResizeHandle';
import { ChatContainer } from './ChatContainer';
import { InlineModelSelector } from './InlineModelSelector';
import { useLeanSpecChat } from '../../lib/use-chat';
import { useModelsRegistry } from '../../lib/use-models-registry';
import { X, Plus, Settings } from 'lucide-react';
import { Button } from '@leanspec/ui-components';

export function ChatSidebar() {
  const {
    toggleSidebar,
    isOpen,
    sidebarWidth,
    setSidebarWidth,
    activeConversationId,
    createConversation,
    refreshConversations
  } = useChat();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isResizing, setIsResizing] = useState(false);

  // Use registry for model selection
  const { defaultSelection } = useModelsRegistry();
  const [model, setModel] = useState<{ providerId: string; modelId: string } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Initialize model from defaultSelection once registry is ready
  useEffect(() => {
    if (defaultSelection && !model) {
      setModel(defaultSelection);
    }
  }, [defaultSelection, model]);

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    reload,
  } = useLeanSpecChat({
    providerId: model?.providerId ?? '',
    modelId: model?.modelId ?? '',
    threadId: activeConversationId || undefined
  });

  // Send pending message when thread becomes active
  useEffect(() => {
    if (activeConversationId && pendingMessage) {
      sendMessage({ text: pendingMessage });
      setPendingMessage(null);
      setTimeout(refreshConversations, 2000);
    }
  }, [activeConversationId, pendingMessage, sendMessage, refreshConversations]);

  const handleSendMessage = async (text: string) => {
    if (!activeConversationId) {
      // Store message to send after conversation is created
      setPendingMessage(text);
      await createConversation();
    } else {
      sendMessage({ text });
      setTimeout(refreshConversations, 2000);
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "bg-background border-l shadow-xl flex flex-col overflow-hidden",
          !isResizing && "transition-all duration-300 ease-in-out",
          isMobile
            ? `fixed top-0 right-0 h-full z-50 ${isOpen ? "translate-x-0" : "translate-x-full"}`
            : "sticky top-14 h-[calc(100vh-3.5rem)]"
        )}
        style={{ width: isMobile ? '100%' : (isOpen ? `${sidebarWidth}px` : 0) }}
      >
        {!isMobile && (
          <ResizeHandle
            onResize={setSidebarWidth}
            onResizeStart={() => setIsResizing(true)}
            onResizeEnd={() => setIsResizing(false)}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30 h-14">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createConversation} title="New Chat">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebar}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 min-h-0 bg-background">
          <ChatContainer
            messages={messages}
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            error={error as Error | null}
            onRetry={reload}
            className="h-full"
            footerContent={
              model ? (
                <InlineModelSelector
                  value={model}
                  onChange={setModel}
                  disabled={isLoading}
                />
              ) : null
            }
          />
        </div>
      </aside>
    </>
  );
}
