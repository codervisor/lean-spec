import { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useMediaQuery } from '../../hooks/use-media-query';
import { cn } from '@leanspec/ui-components';
import { ResizeHandle } from './ResizeHandle';
import { ChatContainer } from './ChatContainer';
import { useLeanSpecChat } from '../../lib/use-chat';
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

  // Model state (simplified for now, default to openai/gpt-4o)
  const [model] = useState({ providerId: 'openai', modelId: 'gpt-4o' });

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    reload,
  } = useLeanSpecChat({
    providerId: model.providerId,
    modelId: model.modelId,
    threadId: activeConversationId || undefined
  });

  const handleSendMessage = async (text: string) => {
    if (!activeConversationId) {
      await createConversation();
      // Note: The hook won't pick up the new threadId immediately for this message.
      // This is a known limitation in this rough implementation.
    }

    sendMessage({ text });
    setTimeout(refreshConversations, 2000);
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
          />
        </div>
      </aside>
    </>
  );
}
