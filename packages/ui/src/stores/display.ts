import { create } from 'zustand';

export type DisplayMode = 'wide' | 'normal';

export const DISPLAY_STORAGE_KEY = 'leanspec-display-mode';

function getInitialDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'normal';
  return (localStorage.getItem(DISPLAY_STORAGE_KEY) as DisplayMode) || 'normal';
}

interface DisplayState {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
}

const initialDisplayMode = getInitialDisplayMode();

export const useDisplayStore = create<DisplayState>((set) => ({
  displayMode: initialDisplayMode,

  setDisplayMode: (newMode: DisplayMode) => {
    localStorage.setItem(DISPLAY_STORAGE_KEY, newMode);
    set({ displayMode: newMode });
  },
}));
