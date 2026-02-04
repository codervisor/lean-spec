import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayMode = 'wide' | 'normal';

interface DisplayState {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      displayMode: 'normal',
      setDisplayMode: (newMode) => set({ displayMode: newMode }),
    }),
    {
      name: 'leanspec-display-mode',
    }
  )
);
