import { MessageSquare, Trash2, Search } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';
import { Input } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function ChatHistory() {
  const { t } = useTranslation('common');
  const { conversations, selectConversation, activeConversationId, deleteConversation } = useChat();
  const [search, setSearch] = useState('');
  const defaultTitle = t('chat.newChat');

  const filteredConversations = conversations.filter(c =>
    (c.title || defaultTitle).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full max-h-[400px]">
      <div className="p-2 sticky top-0 bg-popover z-10 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t('chat.history.searchPlaceholder')}
            className="h-8 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        {filteredConversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t('chat.history.empty')}</p>
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
                <MessageSquare className="h-3 w-3 flex-shrink-0 opacity-70" />
                <span className="truncate text-xs">{conv.title || defaultTitle}</span>
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
  );
}
