import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import type { Session } from '../types/api';
import { useProject } from './ProjectContext';

interface SessionsContextType {
  // Drawer state
  isOpen: boolean;
  toggleDrawer: () => void;
  openDrawer: (specName?: string) => void;
  closeDrawer: () => void;

  // Data
  sessions: Session[];
  activeSessionsCount: number;
  loading: boolean;

  // Filters
  specFilter: string | null;
  setSpecFilter: (specName: string | null) => void;

  // Actions
  createSession: (data: Partial<Session>) => Promise<Session>;
  startSession: (id: string) => Promise<void>;
  stopSession: (id: string) => Promise<void>;
  pauseSession: (id: string) => Promise<void>;
  resumeSession: (id: string) => Promise<void>;

  // Active session context (for logs)
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

const SessionsContext = createContext<SessionsContextType | undefined>(undefined);

export function SessionsProvider({ children }: { children: ReactNode }) {
  const { currentProject } = useProject();
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [specFilter, setSpecFilter] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!currentProject?.id) return;
    setLoading(true);
    try {
      const data = await api.listSessions({});
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen, fetchSessions]);

  useEffect(() => {
    if (!currentProject?.id) return;

    // Initial fetch
    fetchSessions();

    const base = import.meta.env.VITE_API_URL || window.location.origin;
    const wsUrl = base.replace(/^http/, 'ws') + '/api/sessions/stream';
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Handle different event types
          if (payload.type === 'session.created') {
            setSessions(prev => [payload.session, ...prev]);
          } else if (payload.type === 'session.updated' || payload.type === 'session.status') {
            setSessions(prev => prev.map(s => s.id === payload.session.id ? payload.session : s));
          } else if (payload.type === 'session.deleted') {
            setSessions(prev => prev.filter(s => s.id !== payload.sessionId));
          }
        } catch (e) {
          console.error('WebSocket message parse error', e);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error', e);
      };
    } catch (e) {
      console.error('WebSocket connection error', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [currentProject?.id, fetchSessions]);

  const activeSessionsCount = sessions.filter(s => s.status === 'running' || s.status === 'pending').length;

  const toggleDrawer = () => setIsOpen(prev => !prev);

  const openDrawer = (specName?: string) => {
    if (specName) {
      setSpecFilter(specName);
    }
    setIsOpen(true);
  };

  const closeDrawer = () => setIsOpen(false);

  const createSession = async (data: Partial<Session>) => {
    if (!currentProject?.path) throw new Error('No project path');

    const newSession = await api.createSession({
      projectPath: currentProject.path,
      specId: data.specId,
      tool: data.tool || 'claude',
      mode: data.mode || 'autonomous'
    });

    await fetchSessions();
    return newSession;
  };

  const startSession = async (id: string) => {
    await api.startSession(id);
    await fetchSessions();
  };

  const stopSession = async (id: string) => {
    await api.stopSession(id);
    await fetchSessions();
  };

  const pauseSession = async (id: string) => {
    await api.pauseSession(id);
    await fetchSessions();
  };

  const resumeSession = async (id: string) => {
    await api.resumeSession(id);
    await fetchSessions();
  };

  return (
    <SessionsContext.Provider value={{
      isOpen,
      toggleDrawer,
      openDrawer,
      closeDrawer,
      sessions,
      activeSessionsCount,
      loading,
      specFilter,
      setSpecFilter,
      createSession,
      startSession,
      stopSession,
      pauseSession,
      resumeSession,
      activeSessionId,
      setActiveSessionId
    }}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions() {
  const context = useContext(SessionsContext);
  if (!context) {
    throw new Error('useSessions must be used within a SessionsProvider');
  }
  return context;
}
