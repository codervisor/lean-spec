import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import { useMediaQuery } from '../../hooks/use-media-query';
import { 
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button 
} from '@leanspec/ui-components';
import { ResizeHandle } from './ResizeHandle';
import { ChatContainer } from './ChatContainer';
import { ChatHistory } from './ChatHistory';
import { InlineModelSelector } from './InlineModelSelector';
import { useLeanSpecChat } from '../../lib/use-chat';
import { useModelsRegistry } from '../../lib/use-models-registry';
import { useAutoTitle } from '../../hooks/useAutoTitle';
import { X, Plus, Settings, History } from 'lucide-react';

export function ChatSidebar() {
  const navigate = useNavigate();
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
  } = useChat();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isResizing, setIsResizing] = useState(false);

  // Use registry for model selection
  const { defaultSelection } = useModelsRegistry();
  const [model, setModel] = useState<{ providerId: string; modelId: string } | null>(null);
  const pendingMessageRef = useRef<string | null>(null);

  const effectiveModel = model ?? defaultSelection ?? null;
  const currentTitle = activeConversationId 
    ? conversations.find(c => c.id === activeConversationId)?.title 
    : "New Chat";

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

  useAutoTitle({
    activeThreadId: activeConversationId,
    messages,
    threads: conversations,
    onUpdate: refreshConversations
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
        <div className="flex items-center justify-between p-3 border-b bg-muted/30 h-14 gap-2">
          {/* Chat Title */}
          <div className="flex items-center flex-1 min-w-0 mr-2" title={currentTitle || "New Chat"}>
             <span className="font-semibold text-sm truncate">
                {currentTitle || "New Chat"}
             </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={createConversation} title="New Chat (Cmd+Shift+N)">
              <Plus className="h-4 w-4" />
            </Button>
            
            <Popover open={showHistory} onOpenChange={(open) => { if (open !== showHistory) toggleHistory(); }}>
               <PopoverTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-8 w-8" title="History (Cmd+Shift+H)">
                   <History className="h-4 w-4" />
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-[280px] p-0" align="end">
                  <ChatHistory />
               </PopoverContent>
             </Popover>
            
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Settings" onClick={() => navigate('/settings?tab=models')}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleSidebar}
              title="Close (Cmd+Shift+I)"
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
