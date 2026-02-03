import { create } from 'zustand';

interface LayoutState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isWideMode: boolean;
  toggleWideMode: () => void;
}

const WIDE_MODE_KEY = 'layout-wide-mode';

function getInitialWideMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(WIDE_MODE_KEY) === 'true';
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  isWideMode: getInitialWideMode(),
  toggleWideMode: () =>
    set((state) => {
      const next = !state.isWideMode;
      if (typeof window !== 'undefined') {
        localStorage.setItem(WIDE_MODE_KEY, String(next));
      }
      return { isWideMode: next };
    }),
}));
