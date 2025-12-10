import { useCallback, useEffect, useState } from 'react';
import { listen, type Event as TauriEvent, type UnlistenFn } from '@tauri-apps/api/event';
import type { DesktopBootstrapPayload, DesktopProject } from '../types';
import {
  bootstrapDesktop,
  checkForUpdates,
  openAddProjectDialog,
  refreshProjects,
  switchProject,
} from '../lib/ipc';

interface UseProjectsState {
  projects: DesktopProject[];
  activeProjectId?: string;
  uiUrl?: string;
  loading: boolean;
  error?: string;
  config?: DesktopBootstrapPayload['config'];
}

export function useProjects() {
  const [state, setState] = useState<UseProjectsState>({ projects: [], loading: true });

  const applyPayload = useCallback((payload: DesktopBootstrapPayload) => {
    setState({
      projects: payload.projects,
      activeProjectId: payload.activeProjectId,
      uiUrl: payload.uiUrl,
      config: payload.config,
      loading: false,
    });
  }, []);

  useEffect(() => {
    bootstrapDesktop()
      .then(applyPayload)
      .catch((error) => {
        console.error(error);
        setState((prev): UseProjectsState => ({
          ...prev,
          loading: false,
          error: (error as Error)?.message ?? String(error),
        }));
      });
  }, [applyPayload]);

  const handleSwitch = useCallback(
    async (projectId: string) => {
      try {
        const payload = await switchProject(projectId);
        applyPayload(payload);
      } catch (error) {
        console.error(error);
      }
    },
    [applyPayload],
  );

  const handleRefresh = useCallback(async () => {
    try {
      const payload = await refreshProjects();
      applyPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }, [applyPayload]);

  const handleAddProject = useCallback(async () => {
    try {
      const payload = await openAddProjectDialog();
      applyPayload(payload);
    } catch (error) {
      console.error(error);
    }
  }, [applyPayload]);

  const handleCheckUpdates = useCallback(async () => {
    try {
      await checkForUpdates();
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const unlisten = listen<DesktopBootstrapPayload>(
      'desktop://state-updated',
      (event: TauriEvent<DesktopBootstrapPayload>) => {
        applyPayload(event.payload);
      },
    );

    return () => {
      unlisten.then((dispose: UnlistenFn) => dispose());
    };
  }, [applyPayload]);

  useEffect(() => {
    const subscriptions = Promise.all([
      listen<string>('desktop://tray-switch-project', (event: TauriEvent<string>) => {
        if (event.payload) {
          handleSwitch(event.payload);
        }
      }),
      listen('desktop://tray-refresh-projects', () => {
        handleRefresh();
      }),
      listen('desktop://tray-add-project', () => {
        handleAddProject();
      }),
      listen('desktop://tray-check-updates', () => {
        handleCheckUpdates();
      }),
    ]);

    return () => {
      subscriptions.then((listeners: UnlistenFn[]) => listeners.forEach((dispose) => dispose()));
    };
  }, [handleAddProject, handleCheckUpdates, handleRefresh, handleSwitch]);

  return {
    ...state,
    switchProject: handleSwitch,
    refreshProjects: handleRefresh,
    addProject: handleAddProject,
  };
}
