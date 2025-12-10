import { useMemo } from 'react';
import DesktopLayout from './components/DesktopLayout';
import TitleBar from './components/TitleBar';
import { useProjects } from './hooks/useProjects';
import styles from './app.module.css';

const App = () => {
  const { projects, activeProjectId, uiUrl, loading, error, switchProject, addProject, refreshProjects } = useProjects();

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
        <iframe key={iframeSrc} className={styles.desktopFrame} src={iframeSrc} title="LeanSpec UI" />
      )}
    </DesktopLayout>
  );
};

export default App;
