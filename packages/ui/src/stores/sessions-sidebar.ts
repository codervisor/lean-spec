import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createProjectScopedStorage, migrateToProjectScoped } from '../lib/project-scoped-storage';

interface SessionsSidebarState {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

export const useSessionsSidebarStore = create<SessionsSidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
    }),
    {
      name: 'leanspec:ui:sessionsSidebarCollapsed',
      storage: createJSONStorage(() => createProjectScopedStorage()),
    }
  )
);

if (typeof window !== 'undefined') {
  migrateToProjectScoped('leanspec:ui:sessionsSidebarCollapsed');
}
