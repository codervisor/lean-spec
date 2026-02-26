import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Hash,
  Timer,
} from 'lucide-react';
import {
  Button,
  cn,
  formatRelativeTime,
  ScrollArea,
  SearchInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/library';
import { useTranslation } from 'react-i18next';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSessions } from '../hooks/useSessionsQuery';
import { useSessionsSidebarStore } from '../stores/sessions-sidebar';
import { sessionStatusConfig, formatSessionDuration } from '../lib/session-utils';
import { RunnerLogo } from './library/ai-elements/runner-logo';
import { SessionStatusBadge } from './session-status-badge';
import type { Session, SessionStatus } from '../types/api';

interface SessionsNavSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function SessionsNavSidebar({ mobileOpen = false, onMobileOpenChange }: SessionsNavSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const sessionsQuery = useSessions(resolvedProjectId ?? null);
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';

  const sessions = useMemo(() => (sessionsQuery.data as Session[]) ?? [], [sessionsQuery.data]);
  const loading = !currentProject || sessionsQuery.isLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const { collapsed, setCollapsed } = useSessionsSidebarStore();

  const activeSessionId = useMemo(() => {
    const match = location.pathname.match(/\/sessions\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : '';
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sessions-nav-sidebar-width',
      collapsed ? '0px' : '280px'
    );
  }, [collapsed]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (!mobileOpen) return;
    onMobileOpenChange?.(false);
  }, [location.pathname, onMobileOpenChange, mobileOpen]);

  const uniqueStatuses = useMemo(() => {
    const statuses = sessions.map((s) => s.status).filter(Boolean) as SessionStatus[];
    return Array.from(new Set(statuses)).sort();
  }, [sessions]);

  const hasActiveFilters = statusFilter.length > 0;

  const filteredSessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = sessions.filter((session) => {
      if (statusFilter.length > 0 && !statusFilter.includes(session.status)) return false;
      if (normalizedQuery) {
        const haystack = [
          session.id,
          session.runner,
          session.prompt ?? '',
          ...(session.specIds ?? []),
        ].join(' ').toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });

    // Sort by most recent first
    return filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [searchQuery, sessions, statusFilter]);

  const handleSessionClick = useCallback((session: Session) => {
    navigate(`${basePath}/sessions/${session.id}`);
    if (mobileOpen) onMobileOpenChange?.(false);
  }, [basePath, navigate, mobileOpen, onMobileOpenChange]);

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const { t, i18n } = useTranslation('common');

  const sidebarVisible = mobileOpen || !collapsed;

  return (
    <div className="relative">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => onMobileOpenChange?.(false)}
        />
      )}

      <aside
        className={cn(
          'border-r bg-background flex flex-col overflow-hidden transition-all duration-300 flex-shrink-0',
          mobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-[280px] shadow-xl'
            : 'hidden lg:flex lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]',
          collapsed && !mobileOpen ? 'lg:w-0 lg:border-r-0' : 'lg:w-[280px]'
        )}
      >
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">{t('sessionsPage.title')}</h2>

            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={hasActiveFilters ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 w-7 p-0"
                    title={t('specsNavSidebar.filtersLabel')}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-0" align="start" sideOffset={8}>
                  <div className="flex items-center justify-between px-4 py-2 border-b">
                    <span className="font-medium text-sm py-1">{t('sessionsPage.filters.status')}</span>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto px-2 py-1 text-xs"
                        onClick={() => setStatusFilter([])}
                      >
                        {t('specsNavSidebar.clearFilters')}
                      </Button>
                    )}
                  </div>
                  <div className="p-2 space-y-1">
                    {uniqueStatuses.map((status) => {
                      const cfg = sessionStatusConfig[status];
                      const StatusIcon = cfg?.icon;
                      return (
                        <div
                          key={status}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer group"
                          onClick={() => toggleStatus(status)}
                        >
                          <div className={cn(
                            'flex items-center justify-center w-4 h-4 border rounded transition-colors',
                            statusFilter.includes(status) ? 'bg-primary border-primary text-primary-foreground' : 'group-hover:border-primary/50'
                          )}>
                            {statusFilter.includes(status) && <Check className="h-3 w-3" />}
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
                            <span className="text-sm">{t(`sessions.status.${status}`)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>

              {onMobileOpenChange && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 lg:hidden"
                  onClick={() => onMobileOpenChange(false)}
                  title={t('actions.close')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hidden lg:flex"
                onClick={() => setCollapsed(true)}
                title={t('sessionsSidebar.collapse')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('sessionsSidebar.searchPlaceholder')}
            showShortcut={false}
            className="h-9 text-sm"
          />
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 rounded-md bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {t('sessionsSidebar.noResults')}
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {filteredSessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const duration = formatSessionDuration(session);
                const title = session.prompt
                  || (session.specIds?.length ? session.specIds.join(', ') : null)
                  || session.id.slice(0, 8);

                return (
                  <button
                    key={session.id}
                    onClick={() => handleSessionClick(session)}
                    className={cn(
                      'w-full text-left rounded-md px-2.5 py-2 transition-colors group overflow-hidden',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center gap-1.5 w-full min-w-0">
                      <RunnerLogo runnerId={session.runner} size={20} className="shrink-0" />
                      <span className="truncate text-xs leading-relaxed flex-1">{title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 ml-[22px] w-[calc(100%-22px)]">
                      <SessionStatusBadge
                        status={session.status}
                        iconOnly
                        responsive={false}
                      />
                      {duration && (
                        <span className="inline-flex items-center gap-1 h-5 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-muted text-muted-foreground shrink-0">
                          <Timer className="h-3 w-3" />
                          {duration}
                        </span>
                      )}
                      {session.startedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(session.startedAt, i18n.language)}
                        </span>
                      )}
                    </div>
                    {(session.specIds?.length ?? 0) > 0 && (
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5 ml-[22px] w-[calc(100%-22px)] flex items-center gap-0.5">
                        <Hash className="h-3 w-3 shrink-0" />
                        <span className="truncate">{session.specIds.join(', ')}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {t('sessionsPage.count', { count: filteredSessions.length })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hidden lg:flex"
            onClick={() => setCollapsed(true)}
            title={t('sessionsSidebar.collapse')}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </aside>

      {!sidebarVisible && (
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex h-9 w-5 p-0 absolute z-50 top-2 left-0 bg-background border border-l-0 rounded-r-md rounded-l-none shadow-md hover:w-6 hover:bg-accent transition-all items-center justify-center"
          onClick={() => setCollapsed(false)}
          title={t('sessionsSidebar.expand')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
