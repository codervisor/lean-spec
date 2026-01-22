import { History, ChevronDown, MessageSquare, Trash2, Search } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { Badge, Input } from '@leanspec/ui-components';
import { cn } from '../../lib/utils';
import { useState } from 'react';

export function ChatHistory() {
  const { conversations, showHistory, toggleHistory, selectConversation, activeConversationId, deleteConversation } = useChat();
  const [search, setSearch] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="border-b">
      <button
        onClick={toggleHistory}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Conversations</span>
          <Badge variant="secondary" className="h-5 px-1.5 min-w-[20px] justify-center text-[10px]">{conversations.length}</Badge>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          showHistory && "rotate-180"
        )} />
      </button>

      {showHistory && (
        <div className="p-2 space-y-2 bg-muted/10">
          <div className="relative px-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="h-8 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1 px-2">
            {filteredConversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No conversations found</p>
            ) : (
              filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  className={cn(
                    "group flex items-center justify-between px-2 py-2 rounded-md transition-colors cursor-pointer text-sm",
                    activeConversationId === conv.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                  onClick={() => selectConversation(conv.id)}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <MessageSquare className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
