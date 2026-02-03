import { create } from 'zustand';

interface SessionsUiState {
  isDrawerOpen: boolean;
  activeSessionId: string | null;
  specFilter: string | null;
  toggleDrawer: () => void;
  openDrawer: (specName?: string) => void;
  closeDrawer: () => void;
  setSpecFilter: (specName: string | null) => void;
  setActiveSessionId: (id: string | null) => void;
}

export const useSessionsUiStore = create<SessionsUiState>((set) => ({
  isDrawerOpen: false,
  activeSessionId: null,
  specFilter: null,
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  openDrawer: (specName?: string) =>
    set((state) => ({
      isDrawerOpen: true,
      specFilter: specName ?? state.specFilter,
    })),
  closeDrawer: () => set({ isDrawerOpen: false }),
  setSpecFilter: (specName: string | null) => set({ specFilter: specName }),
  setActiveSessionId: (id: string | null) => set({ activeSessionId: id }),
}));
