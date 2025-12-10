import { useCallback, useEffect, useMemo, useRef } from 'react';
import DesktopLayout from './components/DesktopLayout';
import TitleBar from './components/TitleBar';
import { useProjects } from './hooks/useProjects';
import styles from './app.module.css';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { appLogDir } from '@tauri-apps/api/path';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { getDesktopVersion } from './lib/ipc';

const App = () => {
  const { projects, activeProjectId, uiUrl, loading, error, switchProject, addProject, refreshProjects } = useProjects();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingMenuEvents = useRef<string[]>([]);
  const versionCache = useRef<string>();
  const logDirCache = useRef<string>();

  const postToIframe = useCallback((payload: Record<string, unknown>) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) {
      return false;
    }
    target.postMessage({ source: 'leanspec-desktop', ...payload }, '*');
    return true;
  }, []);

  const flushPendingMenuEvents = useCallback(() => {
    if (!iframeRef.current?.contentWindow) {
      return;
    }

    while (pendingMenuEvents.current.length > 0) {
      const action = pendingMenuEvents.current.shift();
      if (action) {
        postToIframe({ type: 'menu', action });
      }
    }
  }, [postToIframe]);

  const forwardMenuAction = useCallback(
    (action: string) => {
      const delivered = postToIframe({ type: 'menu', action });
      if (!delivered) {
        pendingMenuEvents.current.push(action);
      }
    },
    [postToIframe],
  );

  const ensureDesktopVersion = useCallback(async () => {
    if (versionCache.current) {
      return versionCache.current;
    }
    const resolved = await getDesktopVersion();
    versionCache.current = resolved;
    return resolved;
  }, []);

  const ensureLogDirectory = useCallback(async () => {
    if (logDirCache.current) {
      return logDirCache.current;
    }
    const resolved = await appLogDir();
    logDirCache.current = resolved;
    return resolved;
  }, []);

  useEffect(() => {
    const events = [
      'desktop://menu-new-spec',
      'desktop://menu-find',
      'desktop://menu-toggle-sidebar',
      'desktop://menu-shortcuts',
      'desktop://menu-logs',
      'desktop://menu-about',
    ];

    const subscription = Promise.all(events.map((name) => listen(name, () => forwardMenuAction(name))));

    return () => {
      subscription.then((handlers: UnlistenFn[]) => handlers.forEach((dispose) => dispose()));
    };
  }, [forwardMenuAction]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || data.source !== 'leanspec-ui') {
        return;
      }

      if (data.type !== 'desktop-action') {
        return;
      }

      switch (data.action) {
        case 'open-logs': {
          ensureLogDirectory()
            .then((dir) => {
              if (dir) {
                revealItemInDir(dir).catch((error) => console.error(error));
              }
            })
            .catch((error) => console.error(error));
          break;
        }
        case 'request-logs-path': {
          ensureLogDirectory()
            .then((dir) => {
              if (dir) {
                postToIframe({ type: 'desktop-response', action: 'logs-path', payload: { path: dir } });
              }
            })
            .catch((error) => console.error(error));
          break;
        }
        case 'get-version': {
          ensureDesktopVersion()
            .then((version) => {
              postToIframe({ type: 'desktop-response', action: 'desktop-version', payload: { version } });
            })
            .catch((error) => console.error(error));
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [ensureDesktopVersion, ensureLogDirectory, postToIframe]);

  const iframeSrc = useMemo(() => {
    if (!uiUrl) {
      return undefined;
    }

    const url = new URL(uiUrl);
    url.searchParams.set('desktop', '1');
    if (activeProjectId) {
      url.searchParams.set('project', activeProjectId);
    }
    return url.toString();
  }, [uiUrl, activeProjectId]);

  const handleIframeLoad = useCallback(() => {
    flushPendingMenuEvents();
  }, [flushPendingMenuEvents]);

  return (
    <DesktopLayout
      header={
        <TitleBar
          projects={projects}
          activeProjectId={activeProjectId}
          onProjectSelect={switchProject}
          onAddProject={addProject}
          onRefresh={refreshProjects}
          isLoading={loading}
        />
      }
    >
      {loading && <div className={styles.centerState}>Loading desktop environment…</div>}
      {error && <div className={styles.errorState}>{error}</div>}
      {iframeSrc && !error && (
        <iframe
          key={iframeSrc}
          ref={iframeRef}
          className={styles.desktopFrame}
          src={iframeSrc}
          title="LeanSpec UI"
          onLoad={handleIframeLoad}
        />
      )}
    </DesktopLayout>
  );
};

export default App;
