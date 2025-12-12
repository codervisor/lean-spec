import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DesktopLayout from './components/DesktopLayout';
import TitleBar from './components/TitleBar';
import { ProjectsManager } from './components/ProjectsManager';
import { useProjects } from './hooks/useProjects';
import styles from './app.module.css';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { appLogDir } from '@tauri-apps/api/path';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { checkForUpdates, getDesktopVersion } from './lib/ipc';

const App = () => {
  const {
    projects,
    activeProjectId,
    uiUrl,
    loading,
    error,
    switchProject,
    addProject,
    refreshProjects,
    toggleFavorite,
    removeProject,
    renameProject,
  } = useProjects();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingMenuEvents = useRef<string[]>([]);
  const versionCache = useRef<string>('');
  const logDirCache = useRef<string>('');
  const [projectsManagerOpen, setProjectsManagerOpen] = useState(false);

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
    const menuHandlers: Record<string, () => void> = {
      'desktop://menu-new-spec': () => forwardMenuAction('desktop://menu-new-spec'),
      'desktop://menu-open-project': () => addProject(),
      'desktop://menu-switch-project': () => forwardMenuAction('desktop://menu-switch-project'),
      'desktop://menu-find': () => forwardMenuAction('desktop://menu-find'),
      'desktop://menu-refresh': () => refreshProjects(),
      'desktop://menu-toggle-sidebar': () => forwardMenuAction('desktop://menu-toggle-sidebar'),
      'desktop://menu-manage-projects': () => setProjectsManagerOpen(true),
      'desktop://menu-shortcuts': () => forwardMenuAction('desktop://menu-shortcuts'),
      'desktop://menu-logs': () => forwardMenuAction('desktop://menu-logs'),
      'desktop://menu-about': () => forwardMenuAction('desktop://menu-about'),
      'desktop://menu-updates': () => {
        checkForUpdates().catch((error) => console.error(error));
      },
    };

    const subscription = Promise.all(
      Object.entries(menuHandlers).map(([name, handler]) => listen(name, handler)),
    );

    return () => {
      subscription.then((handlers: UnlistenFn[]) => handlers.forEach((dispose) => dispose()));
    };
  }, [addProject, forwardMenuAction, refreshProjects]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setProjectsManagerOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          onManageProjects={() => setProjectsManagerOpen(true)}
          isLoading={loading}
        />
      }
    >
      {loading && <div className={styles.centerState}>Loading desktop environment…</div>}
      {error && (
        <div className={styles.errorState}>
          <div style={{ fontSize: '1.2em', fontWeight: 600 }}>Unable to start UI server</div>
          <div>{error}</div>
          {error.includes('Node.js') && (
            <div style={{ marginTop: '1rem', fontSize: '0.9em', color: 'rgba(255, 255, 255, 0.7)' }}>
              <p>
                <strong>Ubuntu/Debian:</strong> <code>sudo apt install nodejs</code>
              </p>
              <p>
                <strong>Fedora/RHEL:</strong> <code>sudo dnf install nodejs</code>
              </p>
              <p>
                <strong>Arch:</strong> <code>sudo pacman -S nodejs</code>
              </p>
            </div>
          )}
        </div>
      )}
      {projectsManagerOpen && !loading && (
        <ProjectsManager
          projects={projects}
          activeProjectId={activeProjectId}
          onClose={() => setProjectsManagerOpen(false)}
          onOpenProject={(projectId) => {
            switchProject(projectId);
            setProjectsManagerOpen(false);
          }}
          onAddProject={addProject}
          onRefresh={refreshProjects}
          onToggleFavorite={toggleFavorite}
          onRemoveProject={removeProject}
          onRenameProject={renameProject}
        />
      )}
      {iframeSrc && !error && !projectsManagerOpen && (
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
