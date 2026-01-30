import type { Session } from '../../types/api';
import { Button, Card, cn, formatRelativeTime } from '@leanspec/ui-components';
import { Play, Square, Pause, RotateCcw, FileText, Check, X, Clock } from 'lucide-react';
import { useSessions } from '../../contexts/SessionsContext';
import { useTranslation } from 'react-i18next';

interface SessionCardProps {
    session: Session;
    compact?: boolean;
}

export function SessionCard({ session, compact }: SessionCardProps) {
    const { startSession, stopSession, pauseSession, setActiveSessionId } = useSessions();
    const { i18n } = useTranslation();

    const handleAction = async (e: React.MouseEvent, action: () => Promise<void>) => {
        e.stopPropagation();
        await action();
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-1 hover:bg-muted/50 rounded cursor-pointer" onClick={() => setActiveSessionId(session.id)}>
                {session.status === 'completed' ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-500" />}
                <span className="font-medium text-foreground">{session.tool}</span>
                <span>•</span>
                <span className="truncate flex-1">#{session.specId}</span>
                <span>{formatRelativeTime(session.endedAt || session.startedAt, i18n.language)}</span>
                <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto">
                    <FileText className="h-3 w-3" />
                </Button>
            </div>
        );
    }

    return (
        <Card className="p-3 border-l-4 text-sm relative" style={{ borderLeftColor: getStatusColor(session.status) }}>
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <StatusIcon status={session.status} className={cn("h-4 w-4", getStatusTextColor(session.status))} />
                        <span className="font-semibold">{formatStatus(session.status)}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{session.durationMs ? `${Math.round(session.durationMs / 1000)}s` : ''}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {session.tool} • {session.mode}
                    </div>
                    {session.specId && (
                        <div className="font-medium text-primary text-xs mt-1">
                            #{session.specId}
                        </div>
                    )}
                </div>
            </div>

            {session.status === 'running' && (
                <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-primary animate-pulse w-2/3" />
                </div>
            )}

            <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="sm" className="h-7 text-xs px-2 gap-1" onClick={() => setActiveSessionId(session.id)}>
                    <FileText className="h-3 w-3" /> Logs
                </Button>

                {session.status === 'running' && (
                    <>
                        <Button variant="secondary" size="sm" className="h-7 text-xs px-2 gap-1" onClick={(e) => handleAction(e, () => pauseSession(session.id))}>
                            <Pause className="h-3 w-3" /> Pause
                        </Button>
                        <Button variant="destructive" size="sm" className="h-7 text-xs px-2 gap-1" onClick={(e) => handleAction(e, () => stopSession(session.id))}>
                            <Square className="h-3 w-3" /> Stop
                        </Button>
                    </>
                )}

                {session.status === 'pending' && (
                    <Button variant="secondary" size="sm" className="h-7 text-xs px-2 gap-1" onClick={(e) => handleAction(e, () => startSession(session.id))}>
                        <Play className="h-3 w-3" /> Start
                    </Button>
                )}
            </div>
        </Card>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case 'running': return '#10b981'; // green-500
        case 'pending': return '#f59e0b'; // amber-500
        case 'failed': return '#ef4444'; // red-500
        case 'completed': return '#3b82f6'; // blue-500
        default: return '#6b7280'; // gray-500
    }
}

function getStatusTextColor(status: string) {
    switch (status) {
        case 'running': return 'text-green-500';
        case 'pending': return 'text-amber-500';
        case 'failed': return 'text-destructive';
        case 'completed': return 'text-blue-500';
        default: return 'text-muted-foreground';
    }
}

function StatusIcon({ status, className }: { status: string, className?: string }) {
    switch (status) {
        case 'running': return <RotateCcw className={cn("animate-spin", className)} />;
        case 'pending': return <Clock className={className} />;
        case 'failed': return <X className={className} />;
        case 'completed': return <Check className={className} />;
        default: return <Clock className={className} />;
    }
}

function formatStatus(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}
