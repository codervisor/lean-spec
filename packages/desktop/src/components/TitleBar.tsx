import { useEffect, useState } from 'react';
import { ChevronDown, FolderOpenDot, Loader2, LucideIcon, Plus, RotateCcw } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { DesktopProject } from '../types';
import WindowControls from './WindowControls';
import styles from './title-bar.module.css';

const desktopWindow = WebviewWindow.getCurrent();

interface TitleBarProps {
  projects: DesktopProject[];
  activeProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  onAddProject: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const TitleBar = ({
  projects,
  activeProjectId,
  onProjectSelect,
  onAddProject,
  onRefresh,
  isLoading,
}: TitleBarProps) => {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const activeProject = projects.find((project) => project.id === activeProjectId);

  const handleProjectPick = (projectId: string) => {
    onProjectSelect(projectId);
    setProjectMenuOpen(false);
  };

  useEffect(() => {
    const subscriptions = Promise.all([
      listen('desktop://shortcut-quick-switcher', () => setProjectMenuOpen(true)),
      listen('desktop://shortcut-new-spec', () => onAddProject()),
    ]);

    return () => {
      subscriptions.then((handles: UnlistenFn[]) => handles.forEach((dispose) => dispose()));
    };
  }, [onAddProject]);

  return (
    <header className={styles.titleBar} data-tauri-drag-region="true">
      <div className={styles.leftSection}>
        <button
          className={styles.logoButton}
          onClick={() => desktopWindow.show()}
          title="LeanSpec Desktop"
        >
          <span className={styles.logoGlyph}>LS</span>
          <span className={styles.logoText}>LeanSpec</span>
        </button>

        <div className={styles.projectSwitcher}>
          <button
            className={styles.projectButton}
            onClick={() => setProjectMenuOpen((value) => !value)}
            data-tauri-drag-region="false"
          >
            <FolderOpenDot size={16} />
            <span>{activeProject?.name ?? 'Select project'}</span>
            <ChevronDown size={14} />
          </button>

          {projectMenuOpen && (
            <div className={styles.projectMenu}>
              <div className={styles.projectMenuHeader}>Recent Projects</div>
              {projects.length === 0 && <EmptyState icon={FolderOpenDot} label="No projects" />}
              {projects.map((project) => (
                <button
                  key={project.id}
                  className={styles.projectMenuItem}
                  onClick={() => handleProjectPick(project.id)}
                >
                  <span>{project.name}</span>
                  <span className={styles.projectMeta}>{project.path}</span>
                </button>
              ))}
              <div className={styles.projectMenuFooter}>
                <button className={styles.secondaryAction} onClick={onAddProject}>
                  <Plus size={14} /> Add project
                </button>
                <button className={styles.secondaryAction} onClick={onRefresh}>
                  <RotateCcw size={14} /> Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.secondaryAction} onClick={onRefresh} disabled={isLoading}>
          {isLoading ? <Loader2 size={14} className={styles.spin} /> : <RotateCcw size={14} />}
          <span>Reload</span>
        </button>
        <button className={styles.primaryAction} onClick={onAddProject}>
          <Plus size={14} />
          <span>Add Project</span>
        </button>
        <WindowControls />
      </div>
    </header>
  );
};

export default TitleBar;

const EmptyState = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
  <div className={styles.emptyState}>
    <Icon size={16} />
    <span>{label}</span>
  </div>
);
