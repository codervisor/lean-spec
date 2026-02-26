import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  AlertTriangle, ArrowLeft, Download, Copy, Play, Square, RotateCcw, Pause, 
  Activity, Search, Clock, Cpu, Zap, MessageSquare, FileCode
} from 'lucide-react';
import { 
  Button, cn, Badge, ScrollArea, Separator,
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/library';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import type { Session, SessionLog, SessionStreamEvent } from '../types/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { EmptyState } from '../components/shared/empty-state';
import { PageTransition } from '../components/shared/page-transition';
import { PageContainer } from '../components/shared/page-container';
import { AcpConversation } from '../components/sessions/acp-conversation';
import {
  SESSION_STATUS_STYLES,
  estimateSessionCost,
  formatSessionDuration,
  formatTokenCount,
} from '../lib/session-utils';
import { RunnerLogo } from '../components/library/ai-elements/runner-logo';
import {
  appendStreamEvent,
  getAcpFilterType,
  isAcpSession,
  parseSessionLog,
  parseStreamEventPayload,
  type AcpFilterType,
} from '../lib/session-stream';

export function SessionDetailPage() {
  const { t } = useTranslation('common');
  const { sessionId, projectId } = useParams<{ sessionId: string; projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, loading: projectLoading } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const projectReady = !projectId || currentProject?.id === projectId;

  const [session, setSession] = useState<Session | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [streamEvents, setStreamEvents] = useState<SessionStreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [respondingPermissionIds, setRespondingPermissionIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set());
  const [displayMode, setDisplayMode] = useState<'messages' | 'verbose'>('messages');
  const [copySuccess, setCopySuccess] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId || !projectReady || projectLoading) return;
    setLoading(true);
    try {
      const data = await api.getSession(sessionId);
      setSession(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sessions.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [projectLoading, projectReady, sessionId, t]);

  const loadLogs = useCallback(async () => {
    if (!sessionId || !projectReady || projectLoading) return;
    setLogsLoading(true);
    try {
      const data = await api.getSessionLogs(sessionId);
      setLogs(data);
      const nextStreamEvents = data
        .reduce<SessionStreamEvent[]>((acc, log) => appendStreamEvent(acc, parseSessionLog(log)), []);
      setStreamEvents(nextStreamEvents);
    } finally {
      setLogsLoading(false);
    }
  }, [projectLoading, projectReady, sessionId]);

  useEffect(() => {
    void loadSession();
    void loadLogs();
  }, [loadSession, loadLogs]);

  useEffect(() => {
    if (!session || session.status !== 'running') return;

    const base = import.meta.env.VITE_API_URL || window.location.origin;
    const wsUrl = base.replace(/^http/, 'ws') + `/api/sessions/${session.id}/stream`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const streamEvent = parseStreamEventPayload(payload);
        if (streamEvent) {
          setStreamEvents((prev) => appendStreamEvent(prev, streamEvent));
          if (streamEvent.type === 'log') {
            setLogs((prev) => [
              ...prev,
              {
                id: Date.now(),
                timestamp: streamEvent.timestamp,
                level: streamEvent.level,
                message: streamEvent.message,
              },
            ]);
          }
        }
      } catch {
        // ignore malformed
      }
    };

    return () => ws.close();
  }, [session]);

  useEffect(() => {
    const container = logRef.current;
    if (!container) return;
    
    // Attempt to find the viewport if using ScrollArea
    const viewport = container.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (viewport) {
       viewport.scrollTop = viewport.scrollHeight;
    } else {
       container.scrollTop = container.scrollHeight;
    }
  }, [logs]);

  const isAcp = isAcpSession(session);

  const availableLevels = useMemo(() => {
    if (!isAcp) {
      return Array.from(new Set(logs.map((log) => log.level))).sort();
    }
    const filters: AcpFilterType[] = ['messages', 'thoughts', 'tools', 'plan'];
    return filters.filter((filter) => streamEvents.some((event) => getAcpFilterType(event) === filter));
  }, [isAcp, logs, streamEvents]);

  const showHeartbeatLogs = displayMode === 'verbose';

  const filteredLogs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (!showHeartbeatLogs && log.message.includes('Session still running')) return false;
      if (levelFilter.size > 0 && !levelFilter.has(log.level)) return false;
      if (normalizedQuery) {
        const haystack = `${log.level} ${log.message}`.toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });
  }, [levelFilter, logs, searchQuery, showHeartbeatLogs]);

  const filteredStreamEvents = useMemo(() => {
    if (!isAcp) return [];
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return streamEvents.filter((event) => {
      // In messages mode, hide log-type events (they show in verbose)
      if (displayMode === 'messages' && event.type === 'log') return false;
      if (event.type === 'log' && !showHeartbeatLogs && event.message.includes('Session still running')) return false;

      const category = getAcpFilterType(event);
      if (levelFilter.size > 0) {
        if (!category || !levelFilter.has(category)) return false;
      }

      if (!normalizedQuery) return true;

      if (event.type === 'acp_message') {
        return event.content.toLowerCase().includes(normalizedQuery);
      }
      if (event.type === 'acp_thought') {
        return event.content.toLowerCase().includes(normalizedQuery);
      }
      if (event.type === 'acp_tool_call') {
        return `${event.tool} ${JSON.stringify(event.args)} ${JSON.stringify(event.result ?? '')}`
          .toLowerCase()
          .includes(normalizedQuery);
      }
      if (event.type === 'acp_plan') {
        return event.entries.some((entry) => entry.title.toLowerCase().includes(normalizedQuery));
      }
      return false;
    });
  }, [isAcp, levelFilter, searchQuery, streamEvents, showHeartbeatLogs, displayMode]);

  const durationLabel = session ? formatSessionDuration(session) : null;
  const tokenLabel = session ? formatTokenCount(session.tokenCount) : null;
  const costEstimate = session ? estimateSessionCost(session.tokenCount) : null;

  const shortId = (id: string) => id.length > 12 ? id.slice(0, 8) : id;

  const handleToggleLevel = (level: string) => {
    setLevelFilter((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const handleStart = async () => {
    if (!session) return;
    await api.startSession(session.id);
    await loadSession();
  };

  const handleStop = async () => {
    if (!session) return;
    await api.stopSession(session.id);
    await loadSession();
  };

  const handlePause = async () => {
    if (!session) return;
    await api.pauseSession(session.id);
    await loadSession();
  };

  const handleResume = async () => {
    if (!session) return;
    await api.resumeSession(session.id);
    await loadSession();
  };

  const handleRestart = async () => {
    if (!session || !currentProject?.path) return;
    const created = await api.createSession({
      projectPath: currentProject.path,
      specIds: session.specIds ?? [],
      runner: session.runner,
      mode: session.mode,
    });
    await api.startSession(created.id);
    navigate(`${basePath}/sessions/${created.id}`);
  };

  const handleAcpResumeSession = async () => {
    if (!session) return;
    await api.startSession(session.id);
    await loadSession();
  };

  const getLogPayload = () => {
    if (isAcp) return JSON.stringify(filteredStreamEvents, null, 2);
    return filteredLogs.map((log) => `[${log.timestamp}] ${log.level.toUpperCase()} ${log.message}`).join('\n');
  };

  const handleDownload = () => {
    const exportPayload = getLogPayload();
    const blob = new Blob([exportPayload], {
      type: isAcp ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${sessionId ?? t('sessions.export.fallbackName')}.${isAcp ? 'json' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const MAX_COPY_SIZE = 500_000; // ~500KB clipboard limit

  const handleCopyLogs = async () => {
    const payload = getLogPayload();
    const text = payload.length > MAX_COPY_SIZE
      ? payload.slice(0, MAX_COPY_SIZE) + '\n\n… (truncated)'
      : payload;
    await navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handlePermissionResponse = async (permissionId: string, option: string) => {
    if (!session) return;

    setRespondingPermissionIds((prev) => {
      const next = new Set(prev);
      next.add(permissionId);
      return next;
    });

    try {
      const updated = await api.respondToSessionPermission(session.id, permissionId, option);
      setSession(updated);
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : t('sessions.errors.load'));
    } finally {
      setRespondingPermissionIds((prev) => {
        const next = new Set(prev);
        next.delete(permissionId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="py-10 text-center text-sm text-muted-foreground">
          {t('actions.loading')}
        </div>
      </PageContainer>
    );
  }

  if (error || !session) {
    return (
      <PageContainer>
        <EmptyState
          icon={AlertTriangle}
          title={t('sessionDetail.state.notFoundTitle')}
          description={error || t('sessionDetail.state.notFoundDescription')}
          tone="error"
          actions={(
            <Link to={`${basePath}/sessions`} className="inline-flex">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('sessions.actions.back')}
              </Button>
            </Link>
          )}
        />
      </PageContainer>
    );
  }

  const canResumeAcpCompletedSession =
    isAcp &&
    (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled');

  return (
    <PageTransition className="flex-1 min-w-0">
      <div className="h-[calc(100vh-3.5rem)] flex flex-col">
        {/* Compact Header - sticky, matching SpecDetailPage */}
        <header className="shrink-0 border-b bg-card">
          <PageContainer
            padding="none"
            contentClassName="px-4 sm:px-6 lg:px-8 py-2 sm:py-3"
          >
            {/* Line 1: Title with runner logo + session ID + status badge */}
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <RunnerLogo runnerId={session.runner} size={24} />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                {t('sessionDetail.title', { id: shortId(session.id) })}
              </h1>
              <Badge variant="outline" className={cn('font-mono uppercase tracking-wider text-[10px] py-0 h-5 flex items-center', SESSION_STATUS_STYLES[session.status])}>
                {t(`sessions.status.${session.status}`)}
              </Badge>
            </div>

            {/* Line 2: Metadata badges - runner, protocol, duration, tokens, cost */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{session.runner}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 opacity-70" />
                <span>{isAcp ? t('sessions.labels.protocolAcp') : t('sessions.labels.protocolCli')}</span>
                <span className="opacity-50">/</span>
                <span className="font-medium text-foreground">{session.mode}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 opacity-70" />
                <span>{durationLabel ?? '—'}</span>
              </div>
              {tokenLabel && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 opacity-70" />
                    <span>{tokenLabel}</span>
                  </div>
                </>
              )}
              {costEstimate != null && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 opacity-70" />
                    <span>{t('sessions.labels.costApprox', { value: costEstimate.toFixed(2) })}</span>
                  </div>
                </>
              )}
            </div>

            {/* Spec IDs */}
            {session.specIds && session.specIds.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1.5">
                <span>{t('sessions.labels.specs')}:</span>
                {session.specIds.map((specId) => (
                  <Link key={specId} to={`${basePath}/specs/${specId}`} className="hover:text-primary hover:underline font-medium">
                    {specId}
                  </Link>
                ))}
              </div>
            )}

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {session.status === 'running' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handlePause()}
                    className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pause className="mr-1.5 h-3.5 w-3.5" />
                    {t('sessions.actions.pause')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleStop()}
                    className="h-8 rounded-full border px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    {t('sessions.actions.stop')}
                  </Button>
                </>
              )}
              {session.status === 'pending' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleStart()}
                  className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {t('sessions.actions.start')}
                </Button>
              )}
              {session.status === 'paused' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleResume()}
                    className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    {t('sessions.actions.resume')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleStop()}
                    className="h-8 rounded-full border px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    {t('sessions.actions.stop')}
                  </Button>
                </>
              )}
              {canResumeAcpCompletedSession && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleAcpResumeSession()}
                  className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  {t('sessions.actions.resume')}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleRestart()}
                className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {t('sessions.actions.restart')}
              </Button>

              <Link to={`${basePath}/sessions`} className="inline-flex">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  {t('sessions.actions.back')}
                </Button>
              </Link>
            </div>
          </PageContainer>
        </header>

        {archiveError && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {archiveError}
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {(!isAcp) ? (
            <div className="flex-1 flex flex-col min-h-0">
               <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20 gap-4">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder={t('sessionDetail.filters.search')}
                          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                       <div className="flex items-center gap-2 font-medium text-sm text-muted-foreground mr-2">
                         <FileCode className="h-4 w-4" />
                         <span>Verbose Logs</span>
                       </div>
                       <div className="h-4 w-px bg-border mx-1" />
                       <div className="flex items-center gap-1">
                        {availableLevels.map((level) => (
                          <button
                            key={level}
                            onClick={() => handleToggleLevel(level)}
                            className={cn(
                              'rounded-md px-2 py-1 text-[10px] font-medium uppercase transition-colors border',
                              levelFilter.has(level)
                                ? 'border-primary/50 bg-primary/10 text-primary'
                                : 'border-transparent text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                      <div className="h-4 w-px bg-border mx-1" />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleDownload} title={t('sessionDetail.actions.download')}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className={cn("h-8 w-8 p-0", copySuccess && "text-emerald-500")} onClick={() => void handleCopyLogs()} title={t('sessionDetail.actions.copyLogs')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                  </div>
               </div>
               <ScrollArea className="flex-1 h-full bg-background" ref={logRef}>
                 <div className="p-4 font-mono text-xs">
                    {logsLoading ? (
                      <div className="text-muted-foreground">{t('actions.loading')}</div>
                    ) : filteredLogs.length === 0 ? (
                      <div className="text-muted-foreground text-center italic opacity-60 py-8">{t('sessions.emptyLogs')}</div>
                    ) : (
                      filteredLogs.map((log) => {
                        const isJson = log.message.trim().startsWith('{') || log.message.trim().startsWith('[');
                        return (
                          <div key={`${log.id}-${log.timestamp}`} className="mb-0.5 group hover:bg-muted/30 -mx-4 px-4 py-1 flex gap-3 items-start border-l-2 border-transparent">
                            <span className="text-muted-foreground/40 whitespace-nowrap select-none w-24 shrink-0 text-[10px] pt-0.5 text-right font-light tabular-nums">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.
                              <span className="opacity-50">{new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}</span>
                            </span>
                            <span className={cn("uppercase text-[10px] font-bold w-14 shrink-0 pt-0.5 select-none text-center rounded-sm bg-muted/30", 
                              log.level === 'error' ? "text-rose-600 bg-rose-500/10 dark:text-rose-400" : 
                              log.level === 'warn' ? "text-amber-600 bg-amber-500/10 dark:text-amber-400" : 
                              log.level === 'info' ? "text-sky-600 bg-sky-500/10 dark:text-sky-400" :
                              log.level === 'debug' ? "text-violet-600 bg-violet-500/10 dark:text-violet-400" :
                              "text-muted-foreground"
                            )}>{log.level}</span>
                            <div className={cn("flex-1 min-w-0 break-all whitespace-pre-wrap leading-relaxed", isJson && "text-emerald-600 dark:text-emerald-400")}>
                              {log.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                 </div>
               </ScrollArea>
            </div>
          ) : (
             <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as 'messages' | 'verbose')} className="flex-1 flex flex-col min-h-0">
              <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/20 gap-4">
                 
                 <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder={t('sessionDetail.filters.search')}
                          className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                       <TabsList className="h-8 bg-muted/50 p-0.5">
                           <TabsTrigger value="messages" className="text-xs h-7 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                             <div className="flex items-center gap-1.5">
                               <MessageSquare className="h-3.5 w-3.5" />
                               <span>{t('sessionDetail.displayMode.messages')}</span>
                             </div>
                           </TabsTrigger>
                           <TabsTrigger value="verbose" className="text-xs h-7 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                             <div className="flex items-center gap-1.5">
                               <FileCode className="h-3.5 w-3.5" />
                               <span>{t('sessionDetail.displayMode.verbose')}</span>
                             </div>
                           </TabsTrigger>
                       </TabsList>

                      <div className="h-4 w-px bg-border mx-1" />
                       <div className="flex items-center gap-1">
                        {availableLevels.filter((level) => level !== 'messages').map((level) => (
                          <button
                            key={level}
                            onClick={() => handleToggleLevel(level)}
                            className={cn(
                              'rounded-md px-2 py-1 text-[10px] font-medium uppercase transition-colors border',
                              levelFilter.has(level)
                                ? 'border-primary/50 bg-primary/10 text-primary'
                                : 'border-transparent text-muted-foreground hover:bg-muted'
                            )}
                          >
                            {isAcp ? t(`sessionDetail.filters.acp.${level}`) : level}
                          </button>
                        ))}
                      </div>
                      <div className="h-4 w-px bg-border mx-1" />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleDownload} title={t('sessionDetail.actions.download')}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className={cn("h-8 w-8 p-0", copySuccess && "text-emerald-500")} onClick={() => void handleCopyLogs()} title={t('sessionDetail.actions.copyLogs')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
              
              <TabsContent value="messages" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden relative">
                <div className="absolute inset-0">
                  <AcpConversation
                    className="h-full border-0 rounded-none bg-transparent"
                    events={filteredStreamEvents}
                    loading={logsLoading}
                    emptyTitle={t('sessions.emptyLogs')}
                    emptyDescription={t('sessionDetail.logsDescription')}
                    onPermissionResponse={(permissionId, option) => {
                      void handlePermissionResponse(permissionId, option);
                    }}
                    isPermissionResponding={(permissionId) => respondingPermissionIds.has(permissionId)}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="verbose" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden relative h-full">
                 <ScrollArea className="h-full bg-background" ref={logRef}>
                   <div className="p-4 font-mono text-xs">
                      {logsLoading ? (
                        <div className="text-muted-foreground">{t('actions.loading')}</div>
                      ) : filteredLogs.length === 0 ? (
                        <div className="text-muted-foreground text-center italic opacity-60 py-8">{t('sessions.emptyLogs')}</div>
                      ) : (
                        filteredLogs.map((log) => {
                          const isJson = log.message.trim().startsWith('{') || log.message.trim().startsWith('[');
                          return (
                            <div key={`${log.id}-${log.timestamp}`} className="mb-0.5 group hover:bg-muted/30 -mx-4 px-4 py-1 flex gap-3 items-start border-l-2 border-transparent">
                              <span className="text-muted-foreground/40 whitespace-nowrap select-none w-24 shrink-0 text-[10px] pt-0.5 text-right font-light tabular-nums">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.
                                <span className="opacity-50">{new Date(log.timestamp).getMilliseconds().toString().padStart(3, '0')}</span>
                              </span>
                              <span className={cn("uppercase text-[10px] font-bold w-14 shrink-0 pt-0.5 select-none text-center rounded-sm bg-muted/30", 
                                log.level === 'error' ? "text-rose-600 bg-rose-500/10 dark:text-rose-400" : 
                                log.level === 'warn' ? "text-amber-600 bg-amber-500/10 dark:text-amber-400" : 
                                log.level === 'info' ? "text-sky-600 bg-sky-500/10 dark:text-sky-400" :
                                log.level === 'debug' ? "text-violet-600 bg-violet-500/10 dark:text-violet-400" :
                                "text-muted-foreground"
                              )}>{log.level}</span>
                              <div className={cn("flex-1 min-w-0 break-all whitespace-pre-wrap leading-relaxed", isJson && "text-emerald-600 dark:text-emerald-400")}>
                                {log.message}
                              </div>
                            </div>
                          );
                        })
                      )}
                   </div>
                 </ScrollArea>
              </TabsContent>
             </Tabs>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
