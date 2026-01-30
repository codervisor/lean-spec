import { useState } from 'react';
import { useSessions } from '../../contexts/SessionsContext';
import { useMediaQuery } from '../../hooks/use-media-query';
import { cn } from '@leanspec/ui-components';
import { Button } from '@leanspec/ui-components';
import { X, Plus } from 'lucide-react';
import { ResizeHandle } from '../chat/ResizeHandle';
import { SessionCard } from './SessionCard';
import { SessionCreateForm } from './SessionCreateForm';
import { SessionLogsPanel } from './SessionLogsPanel';

export function SessionsDrawer() {
  const {
    isOpen,
    toggleDrawer,
    sessions,
    specFilter,
    setSpecFilter,
    activeSessionId,
    setActiveSessionId
  } = useSessions();
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [width, setWidth] = useState(360);
  const [isCreating, setIsCreating] = useState(false);

  const effectiveWidth = isMobile ? '100%' : `${width}px`;

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (!specFilter) return true;
    return session.specId === specFilter;
  });

  const activeSessions = filteredSessions.filter(s => ['running', 'pending', 'paused'].includes(s.status));
  const completedSessions = filteredSessions.filter(s => !['running', 'pending', 'paused'].includes(s.status));
  
  // Sort detailed sessions by newer first
  activeSessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  completedSessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const handleCreateClose = () => setIsCreating(false);

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={toggleDrawer}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 right-0 h-full bg-background border-l shadow-xl z-50 transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ width: effectiveWidth }}
      >
        {!isMobile && (
          <ResizeHandle
            onResize={setWidth}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30 h-14 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Sessions</h2>
             {specFilter && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                {specFilter}
                <button 
                  onClick={() => setSpecFilter(null)} 
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleDrawer}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 content-start">
             {activeSessionId ? (
                 <SessionLogsPanel 
                    sessionId={activeSessionId} 
                    onBack={() => setActiveSessionId(null)} 
                 />
             ) : (
                 <div className="flex flex-col gap-4">
                     {isCreating ? (
                         <SessionCreateForm 
                            onCancel={handleCreateClose} 
                            onSuccess={handleCreateClose}
                            defaultSpecId={specFilter || undefined}
                         />
                     ) : (
                        <Button className="w-full" onClick={() => setIsCreating(true)}>
                            <Plus className="mr-2 h-4 w-4" /> New Session
                        </Button>
                     )}
                     
                     {filteredSessions.length === 0 && !isCreating ? (
                         <div className="text-center text-muted-foreground text-sm py-8">
                             {specFilter ? 'No sessions for this spec' : 'No sessions yet'}
                         </div>
                     ) : (
                         <>
                            <div className="flex flex-col gap-3">
                                {activeSessions.map(session => (
                                    <SessionCard key={session.id} session={session} />
                                ))}
                            </div>
                            
                            {completedSessions.length > 0 && (
                                <div className="mt-4">
                                    <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                                        <div className="h-px bg-border flex-1" />
                                        Completed
                                        <div className="h-px bg-border flex-1" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {completedSessions.map(session => (
                                            <SessionCard key={session.id} session={session} compact />
                                        ))}
                                    </div>
                                </div>
                            )}
                         </>
                     )}
                 </div>
             )}
        </div>
      </aside>
    </>
  );
}
