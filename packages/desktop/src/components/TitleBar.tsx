import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, FolderOpenDot, Loader2, LucideIcon, Plus, RotateCcw } from 'lucide-react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen, emit, type UnlistenFn } from '@tauri-apps/api/event';
import type { DesktopProject } from '../types';
import WindowControls from './WindowControls';
import DesktopMenu from './DesktopMenu';
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
  const projectSwitcherRef = useRef<HTMLDivElement>(null);
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
    <>
      {projectMenuOpen && createPortal(
        <div 
          className={styles.backdrop} 
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setProjectMenuOpen(false);
          }}
          data-tauri-drag-region="false"
        />,
        document.body
      )}
      <header className={styles.titleBar} data-tauri-drag-region="true">
        <div className={styles.leftSection}>
        <DesktopMenu 
          onAddProject={onAddProject}
          onRefresh={onRefresh}
        />

        <div ref={projectSwitcherRef} className={styles.projectSwitcher}>
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
                <button className={styles.secondaryAction} onClick={() => {
                  setProjectMenuOpen(false);
                  onAddProject();
                }}>
                  <Plus size={14} /> Add project
                </button>
                <button className={styles.secondaryAction} onClick={() => {
                  setProjectMenuOpen(false);
                  onRefresh();
                }}>
                  <RotateCcw size={14} /> Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

        <div className={styles.rightSection}>
          <WindowControls />
        </div>
      </header>
    </>
  );
};

export default TitleBar;

const EmptyState = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
  <div className={styles.emptyState}>
    <Icon size={16} />
    <span>{label}</span>
  </div>
);
