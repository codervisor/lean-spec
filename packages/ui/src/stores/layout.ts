import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  // Main sidebar (mobile open state - not persisted, transient)
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Wide mode for content area
  isWideMode: boolean;
  toggleWideMode: () => void;

  // Main sidebar collapsed state (persisted)
  mainSidebarCollapsed: boolean;
  setMainSidebarCollapsed: (collapsed: boolean) => void;
  toggleMainSidebar: () => void;

  // Settings sidebar collapsed state (persisted)
  settingsSidebarCollapsed: boolean;
  setSettingsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSettingsSidebar: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Mobile sidebar open state (transient)
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Wide mode
      isWideMode: false,
      toggleWideMode: () => set((state) => ({ isWideMode: !state.isWideMode })),

      // Main sidebar collapsed
      mainSidebarCollapsed: false,
      setMainSidebarCollapsed: (collapsed) => set({ mainSidebarCollapsed: collapsed }),
      toggleMainSidebar: () => set((state) => ({ mainSidebarCollapsed: !state.mainSidebarCollapsed })),

      // Settings sidebar collapsed
      settingsSidebarCollapsed: false,
      setSettingsSidebarCollapsed: (collapsed) => set({ settingsSidebarCollapsed: collapsed }),
      toggleSettingsSidebar: () => set((state) => ({ settingsSidebarCollapsed: !state.settingsSidebarCollapsed })),
    }),
    {
      name: 'leanspec:layout',
      partialize: (state) => ({
        isWideMode: state.isWideMode,
        mainSidebarCollapsed: state.mainSidebarCollapsed,
        settingsSidebarCollapsed: state.settingsSidebarCollapsed,
      }),
    }
  )
);
