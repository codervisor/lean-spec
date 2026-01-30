import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useSpecSync } from '@leanspec/ui-components';
import { useMachine } from './MachineContext';

interface SpecsContextValue {
  /** Increment this to trigger a refetch of specs in any listening component */
  refreshTrigger: number;
  /** Call this to notify all components that specs data should be refreshed */
  triggerRefresh: () => void;
}

const SpecsContext = createContext<SpecsContextValue | undefined>(undefined);

interface SpecsProviderProps {
  children: ReactNode;
}

export function SpecsProvider({ children }: SpecsProviderProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { machineModeEnabled } = useMachine();

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleSpecChange = useCallback(() => {
    triggerRefresh();
  }, [triggerRefresh]);

  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  const sseEnabledEnv = import.meta.env.VITE_SSE_ENABLED as string | undefined;
  const sseEnabled = sseEnabledEnv ? sseEnabledEnv === 'true' : !isTauri;
  const sseUrl = (import.meta.env.VITE_SSE_URL as string | undefined) || '/api/events/specs';
  const reconnectMs = Number.parseInt(
    (import.meta.env.VITE_SSE_RECONNECT_MS as string | undefined) || '3000',
    10,
  );

  useSpecSync({
    enabled: sseEnabled,
    url: sseUrl,
    reconnectDelayMs: Number.isFinite(reconnectMs) ? reconnectMs : 3000,
    onChange: handleSpecChange,
  });

  useEffect(() => {
    if (!machineModeEnabled) return;
    const interval = window.setInterval(() => {
      triggerRefresh();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [machineModeEnabled, triggerRefresh]);

  return (
    <SpecsContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </SpecsContext.Provider>
  );
}

export function useSpecs() {
  const context = useContext(SpecsContext);
  if (context === undefined) {
    throw new Error('useSpecs must be used within a SpecsProvider');
  }
  return context;
}
