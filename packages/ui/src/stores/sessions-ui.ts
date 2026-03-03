import { create } from 'zustand';

interface SessionsUiState {
  isDrawerOpen: boolean;
  activeSessionId: string | null;
  specFilter: string | null;
  createDialogNonce: number;
  toggleDrawer: () => void;
  openDrawer: (specName?: string) => void;
  closeDrawer: () => void;
  openCreateDialog: (specName?: string) => void;
  setSpecFilter: (specName: string | null) => void;
  setActiveSessionId: (id: string | null) => void;
}

export const useSessionsUiStore = create<SessionsUiState>((set) => ({
  isDrawerOpen: false,
  activeSessionId: null,
  specFilter: null,
  createDialogNonce: 0,
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  openDrawer: (specName?: string) =>
    set((state) => ({
      isDrawerOpen: true,
      specFilter: specName ?? state.specFilter,
    })),
  closeDrawer: () => set({ isDrawerOpen: false }),
  openCreateDialog: (specName?: string) =>
    set((state) => ({
      createDialogNonce: state.createDialogNonce + 1,
      specFilter: specName ?? state.specFilter,
      isDrawerOpen: false,
    })),
  setSpecFilter: (specName: string | null) => set({ specFilter: specName }),
  setActiveSessionId: (id: string | null) => set({ activeSessionId: id }),
}));
