import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Button,
  Input,
  Separator
} from '@/library';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Pencil
} from 'lucide-react';
import type { ChatThread, ChatStorageInfo } from '../../../lib/chat-api';
import { ChatApi } from '../../../lib/chat-api';
import { cn } from '@/library';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

interface ChatSidebarProps {
  threads: ChatThread[];
  activeThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  className?: string;
}

export function ChatSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  onRenameThread,
  className
}: ChatSidebarProps) {
  const { t } = useTranslation('common');
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [storageInfo, setStorageInfo] = useState<ChatStorageInfo | null>(null);

  useEffect(() => {
    let active = true;
    ChatApi.getStorageInfo()
      .then((info) => {
        if (active) {
          setStorageInfo(info);
        }
      })
      .catch(() => {
        if (active) {
          setStorageInfo(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const filteredThreads = useMemo(() => {
    if (!searchQuery) return threads;
    return threads.filter(t =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.preview.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [threads, searchQuery]);

  const groupedThreads = useMemo(() => {
    const groups: Record<string, ChatThread[]> = {
      today: [],
      yesterday: [],
      previous7days: [],
      older: []
    };

    filteredThreads.forEach(thread => {
      const date = dayjs(thread.updatedAt);
      if (date.isToday()) {
        groups.today.push(thread);
      } else if (date.isYesterday()) {
        groups.yesterday.push(thread);
      } else if (date.isAfter(dayjs().subtract(7, 'day'))) {
        groups.previous7days.push(thread);
      } else {
        groups.older.push(thread);
      }
    });

    return groups;
  }, [filteredThreads]);

  if (collapsed) {
    return (
      <div className={cn("flex flex-col border-r w-[60px] items-center py-4 gap-4 bg-muted/10", className)}>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)} title={t('chat.expandSidebar')}>
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={onNewChat} title={t('chat.newChat')}>
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col border-r w-[280px] h-full bg-muted/10", className)}>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {/* Logo or Title could go here, for now just sidebar toggle */}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)} className="ml-auto" title={t('chat.collapseSidebar')}>
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>

        <Button onClick={onNewChat} className="justify-start gap-2 w-full" variant="outline">
          <Plus className="h-4 w-4" />
          {t('chat.newChat')}
        </Button>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('chat.searchPlaceholder')}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-6">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm mb-2">
              {searchQuery ? t('chat.noSearchResults') : t('chat.noConversations')}
            </p>
            {!searchQuery && (
              <p className="text-xs">
                {t('chat.startConversation')}
              </p>
            )}
          </div>
        ) : (
          <>
            <ThreadListGroup title={t('chat.today')} threads={groupedThreads.today} activeId={activeThreadId} onSelect={onSelectThread} onDelete={onDeleteThread} onRename={onRenameThread} />
            <ThreadListGroup title={t('chat.yesterday')} threads={groupedThreads.yesterday} activeId={activeThreadId} onSelect={onSelectThread} onDelete={onDeleteThread} onRename={onRenameThread} />
            <ThreadListGroup title={t('chat.previous7Days')} threads={groupedThreads.previous7days} activeId={activeThreadId} onSelect={onSelectThread} onDelete={onDeleteThread} onRename={onRenameThread} />
            <ThreadListGroup title={t('chat.older')} threads={groupedThreads.older} activeId={activeThreadId} onSelect={onSelectThread} onDelete={onDeleteThread} onRename={onRenameThread} />
          </>
        )}
      </div>

      <Separator />
      <div className="px-4 py-3 text-xs text-muted-foreground space-y-1">
        {storageInfo ? (
          <>
            <div>{t('chat.storageUsage', { size: formatBytes(storageInfo.sizeBytes, t) })}</div>
            <div className="truncate" title={storageInfo.path}>
              {t('chat.storageLocation', { path: storageInfo.path })}
            </div>
          </>
        ) : (
          <div>{t('chat.storageUnavailable')}</div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number, t: TFunction<'common'>): string {
  if (bytes === 0) return t('chat.storageUnits.zero');
  const k = 1024;
  const sizes = [
    t('chat.storageUnits.byte'),
    t('chat.storageUnits.kilobyte'),
    t('chat.storageUnits.megabyte'),
    t('chat.storageUnits.gigabyte'),
    t('chat.storageUnits.terabyte'),
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function ThreadListGroup({
  title,
  threads,
  activeId,
  onSelect,
  onDelete,
  onRename
}: {
  title: string,
  threads: ChatThread[],
  activeId?: string,
  onSelect: (id: string) => void,
  onDelete: (id: string) => void,
  onRename: (id: string, title: string) => void
}) {
  if (threads.length === 0) return null;

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-muted-foreground px-2 pb-1">{title}</h3>
      {threads.map(thread => (
        <ConversationItem
          key={thread.id}
          thread={thread}
          isActive={thread.id === activeId}
          onSelect={() => onSelect(thread.id)}
          onDelete={() => onDelete(thread.id)}
          onRename={(newTitle) => onRename(thread.id, newTitle)}
        />
      ))}
    </div>
  );
}

function ConversationItem({
  thread,
  isActive,
  onSelect,
  onDelete,
  onRename
}: {
  thread: ChatThread,
  isActive: boolean,
  onSelect: () => void,
  onDelete: () => void,
  onRename: (newTitle: string) => void
}) {
  const { t } = useTranslation('common');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(thread.title);

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRename(editTitle);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-sm transition-colors relative",
        isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />

      {isEditing ? (
        <form onSubmit={handleSaveRename} className="flex-1">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-6 py-0 px-1 text-xs"
            autoFocus
            onBlur={() => setIsEditing(false)}
            onClick={(e) => e.stopPropagation()}
          />
        </form>
      ) : (
        <div className="flex-1 overflow-hidden">
          <div className="truncate font-medium">{thread.title}</div>
          <div className="truncate text-xs text-muted-foreground opacity-70">
            {thread.preview || t('chat.noMessagesYet')}
          </div>
        </div>
      )}

      {!isEditing && isActive && (
        <div className="absolute right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-accent shadow-sm rounded-md">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(true);
          }}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
