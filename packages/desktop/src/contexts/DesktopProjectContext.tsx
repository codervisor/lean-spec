/**
 * Desktop Project Context - Bridges desktop project state with ui's ProjectContext
 * 
 * This context wraps the UI ProjectProvider and provides desktop-specific
 * project management that's compatible with Tauri IPC.
 */

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import type { DesktopProject } from '../types';

interface DesktopProjectContextValue {
  projectId: string;
  projects: DesktopProject[];
  onSwitchProject: (projectId: string) => void;
}

const DesktopProjectContext = createContext<DesktopProjectContextValue | null>(null);

interface DesktopProjectProviderProps {
  projectId: string;
  projects: DesktopProject[];
  onSwitchProject: (projectId: string) => void;
  children: ReactNode;
}

export function DesktopProjectProvider({
  projectId,
  projects,
  onSwitchProject,
  children,
}: DesktopProjectProviderProps) {
  // Inject project ID into the window object for the UI bundle to detect
  useEffect(() => {
    // Set a global flag that the UI bundle can check
    (window as any).__DESKTOP_PROJECT_ID__ = projectId;
    (window as any).__DESKTOP_PROJECTS__ = projects;

    return () => {
      delete (window as any).__DESKTOP_PROJECT_ID__;
      delete (window as any).__DESKTOP_PROJECTS__;
    };
  }, [projectId, projects]);

  return (
    <DesktopProjectContext.Provider value={{ projectId, projects, onSwitchProject }}>
      {children}
    </DesktopProjectContext.Provider>
  );
}

export function useDesktopProject() {
  const context = useContext(DesktopProjectContext);
  if (!context) {
    throw new Error('useDesktopProject must be used within DesktopProjectProvider');
  }
  return context;
}
