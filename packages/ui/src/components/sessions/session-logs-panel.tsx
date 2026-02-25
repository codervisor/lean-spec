import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Pause, Square, Download } from 'lucide-react';
import { api } from '../../lib/api';
import type { SessionLog, Session } from '../../types/api';
import { useSessionMutations } from '../../hooks/useSessionsQuery';
import { useCurrentProject } from '../../hooks/useProjectQuery';
import { Button, cn } from '@/library';
import { useTranslation } from 'react-i18next';
import { AcpConversation } from './acp-conversation';
import { appendStreamEvent, isAcpSession, parseSessionLog } from '../../lib/session-stream';
import type { SessionStreamEvent } from '../../types/api';

interface SessionLogsPanelProps {
    sessionId: string;
    onBack: () => void;
}

export function SessionLogsPanel({ sessionId, onBack }: SessionLogsPanelProps) {
    const { t } = useTranslation('common');
    const { currentProject } = useCurrentProject();
    const { stopSession, pauseSession } = useSessionMutations(currentProject?.id ?? null);
    const [session, setSession] = useState<Session | null>(null);
    const [logs, setLogs] = useState<SessionLog[]>([]);
    const [streamEvents, setStreamEvents] = useState<SessionStreamEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const s = await api.getSession(sessionId);
                setSession(s);
                const l = await api.getSessionLogs(sessionId);
                setLogs(l);
                const parsed = l
                    .slice()
                    .reverse()
                    .reduce<SessionStreamEvent[]>((acc, log) => appendStreamEvent(acc, parseSessionLog(log)), []);
                setStreamEvents(parsed);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();

        const interval = setInterval(fetchDetails, 2000);
        return () => clearInterval(interval);
    }, [sessionId]);

    useEffect(() => {
        if (autoScroll && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    if (loading && !session) return <div className="p-4 text-xs">{t('actions.loading')}</div>;

    const isAcp = isAcpSession(session);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2 p-1">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="font-semibold text-sm truncate">
                    {session?.runner}{(session?.specIds?.length ?? 0) > 0 ? ` • #${session?.specIds[0]}` : ''}
                </div>
                <div className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                    {isAcp ? t('sessions.labels.protocolAcp') : t('sessions.labels.protocolCli')}
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2 px-1">
                {session?.status === 'running' && (
                    <>
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => session && pauseSession(session.id)}>
                            <Pause className="h-3 w-3 mr-1" /> {t('sessions.actions.pause')}
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs flex-1" onClick={() => session && stopSession(session.id)}>
                            <Square className="h-3 w-3 mr-1" /> {t('sessions.actions.stop')}
                        </Button>
                    </>
                )}
            </div>

            <div className="flex items-center justify-between mb-2 px-1">
                <div className="text-xs font-semibold">{t('sessions.labels.logs')}</div>
                <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                        <Download className="h-3 w-3" />
                    </Button>
                    <Button
                        size="sm"
                        variant={autoScroll ? "secondary" : "ghost"}
                        className="h-6 text-[10px] px-2"
                        onClick={() => setAutoScroll(!autoScroll)}
                    >
                        {t('sessions.labels.autoScroll')}
                    </Button>
                </div>
            </div>

            {isAcp ? (
                <div className="flex-1 min-h-0">
                    <AcpConversation
                        events={streamEvents}
                        loading={loading}
                        emptyTitle={t('sessions.emptyLogs')}
                        emptyDescription={t('sessionDetail.logsDescription')}
                    />
                </div>
            ) : (
                <div ref={logRef} className="flex-1 bg-muted/50 rounded-md p-2 overflow-y-auto text-[10px] font-mono whitespace-pre-wrap">
                    {logs.map((log) => (
                        <div key={`${log.timestamp}-${log.id}`} className="mb-1">
                            <span className="text-muted-foreground">[{log.timestamp.split('T')[1]?.split('.')[0]}]</span>{' '}
                            <span className={cn("font-bold", log.level === 'error' ? "text-red-500" : "text-blue-500")}>{log.level.toUpperCase()}</span>{' '}
                            <span>{log.message}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
