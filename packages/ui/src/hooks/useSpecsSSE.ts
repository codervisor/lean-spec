import { useCallback, useEffect } from 'react';
import { useSpecSync } from '@/library';
import { useInvalidateSpecs } from './useSpecsQuery';
import { useMachineStore } from '../stores/machine';

export function useSpecsSSE() {
  const invalidate = useInvalidateSpecs();
  const { machineModeEnabled } = useMachineStore();

  const handleSpecChange = useCallback(() => {
    invalidate();
  }, [invalidate]);

  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  const sseEnabledEnv = import.meta.env.VITE_SSE_ENABLED as string | undefined;
  const sseEnabled = sseEnabledEnv ? sseEnabledEnv === 'true' : !isTauri;
  const apiBaseUrl = import.meta.env.VITE_API_URL as string | undefined;
  const defaultSseUrl = apiBaseUrl
    ? `${apiBaseUrl.replace(/\/$/, '')}/api/events/specs`
    : '/api/events/specs';
  const sseUrl = (import.meta.env.VITE_SSE_URL as string | undefined) || defaultSseUrl;
  const reconnectMs = Number.parseInt(
    (import.meta.env.VITE_SSE_RECONNECT_MS as string | undefined) || '3000',
    10
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
      invalidate();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [invalidate, machineModeEnabled]);
}
