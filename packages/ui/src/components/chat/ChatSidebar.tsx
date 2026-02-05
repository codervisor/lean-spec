import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useMediaQuery } from '../../hooks/use-media-query';
import { cn } from '@leanspec/ui-components';
import { ResizeHandle } from './ResizeHandle';
import { ChatContainer } from './ChatContainer';
import { InlineModelSelector } from './InlineModelSelector';
import { useLeanSpecChat } from '../../lib/use-chat';
import { useModelsRegistry } from '../../lib/use-models-registry';
import { X, Plus, Settings, History, MessageSquare } from 'lucide-react';
import { Button } from '@leanspec/ui-components';

export function ChatSidebar() {
  const {
    toggleSidebar,
    isOpen,
    sidebarWidth,
    setSidebarWidth,
    activeConversationId,
    createConversation,
    refreshConversations,
    conversations,
    showHistory,
    toggleHistory,
    selectConversation,
  } = useChat();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isResizing, setIsResizing] = useState(false);

  // Use registry for model selection
  const { defaultSelection } = useModelsRegistry();
  const [model, setModel] = useState<{ providerId: string; modelId: string } | null>(null);
  const pendingMessageRef = useRef<string | null>(null);

  const effectiveModel = model ?? defaultSelection ?? null;

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    reload,
  } = useLeanSpecChat({
    providerId: effectiveModel?.providerId ?? '',
    modelId: effectiveModel?.modelId ?? '',
    threadId: activeConversationId || undefined
  });

  // Send pending message when thread becomes active
  useEffect(() => {
    if (activeConversationId && pendingMessageRef.current && effectiveModel) {
      sendMessage({ text: pendingMessageRef.current });
      pendingMessageRef.current = null;
      setTimeout(refreshConversations, 2000);
    }
  }, [activeConversationId, effectiveModel, sendMessage, refreshConversations]);

  const handleSendMessage = async (text: string) => {
    if (!effectiveModel) {
      // Don't allow sending messages until model is initialized
      console.warn('Cannot send message: model not initialized');
      return;
    }
    if (!activeConversationId) {
      // Store message to send after conversation is created
      pendingMessageRef.current = text;
      await createConversation();
    } else {
      sendMessage({ text });
      setTimeout(refreshConversations, 2000);
    }
  };

  // Prevent keyboard shortcuts from triggering when typing in the chat sidebar
  const handleSidebarKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    // Stop propagation for inputs/textareas to prevent global shortcuts
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      e.stopPropagation();
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
        onKeyDown={handleSidebarKeyDown}
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
            <Button 
              variant={showHistory ? "secondary" : "ghost"} 
              size="icon" 
              className="h-8 w-8" 
              onClick={toggleHistory} 
              title="Chat History"
            >
              <History className="h-4 w-4" />
            </Button>
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

        {/* Conversation History Panel */}
        {showHistory && (
          <div className="border-b bg-muted/20 max-h-64 overflow-y-auto">
            <div className="p-2 space-y-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      selectConversation(conv.id);
                      toggleHistory();
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      "hover:bg-muted/50",
                      conv.id === activeConversationId 
                        ? "bg-muted font-medium" 
                        : "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      <span className="truncate">{conv.title || 'New Chat'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

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
              effectiveModel ? (
                <InlineModelSelector
                  value={effectiveModel}
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
