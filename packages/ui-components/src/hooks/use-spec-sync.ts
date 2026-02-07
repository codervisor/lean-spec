import { useEffect, useRef } from 'react';

export type SpecSyncEventType = 'created' | 'modified' | 'deleted';

export interface SpecSyncEvent {
  changeType: SpecSyncEventType;
  path: string;
}

export interface SpecSyncOptions {
  enabled?: boolean;
  url?: string;
  reconnectDelayMs?: number;
  onChange?: (event: SpecSyncEvent) => void;
}

export function useSpecSync({
  enabled = true,
  url = '/api/events/specs',
  reconnectDelayMs = 3000,
  onChange,
}: SpecSyncOptions = {}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const connect = () => {
      if (closedRef.current || document.visibilityState === 'hidden') return;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        if (!event.data) return;
        try {
          const payload = JSON.parse(event.data) as SpecSyncEvent;
          onChange?.(payload);
        } catch (error) {
          console.error('Failed to parse spec sync event', error);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      if (reconnectTimerRef.current !== null) return;
      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, reconnectDelayMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        return;
      }

      if (!eventSourceRef.current) {
        connect();
      }
    };

    closedRef.current = false;
    connect();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      closedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, onChange, reconnectDelayMs, url]);
}