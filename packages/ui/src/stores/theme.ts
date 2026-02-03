/**
 * Zustand Theme Store - PoC
 *
 * Replaces ThemeContext with a simpler Zustand store.
 * Benefits:
 * - No Provider component needed
 * - Direct import, no useContext boilerplate
 * - Smaller bundle impact (~2KB vs React Context overhead)
 * - Built-in persistence middleware available (not used here for comparison)
 */
import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

export const STORAGE_KEY = 'leanspec-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system';
}

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const initialTheme = getInitialTheme();
const initialResolvedTheme = initialTheme === 'system' ? getSystemTheme() : (initialTheme as 'light' | 'dark');

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  resolvedTheme: initialResolvedTheme,

  setTheme: (newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;

    // Apply to document
    const root = document.documentElement;
    root.classList.add('changing-theme');
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    setTimeout(() => root.classList.remove('changing-theme'), 50);

    set({ theme: newTheme, resolvedTheme: resolved });
  },
}));

// Initialize theme on document and listen for system changes
if (typeof window !== 'undefined') {
  // Apply initial theme
  const state = useThemeStore.getState();
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(state.resolvedTheme);

  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const { theme } = useThemeStore.getState();
      if (theme === 'system') {
        const newResolved = getSystemTheme();
        const root = document.documentElement;
        root.classList.add('changing-theme');
        root.classList.remove('light', 'dark');
        root.classList.add(newResolved);
        setTimeout(() => root.classList.remove('changing-theme'), 50);
        useThemeStore.setState({ resolvedTheme: newResolved });
      }
    });
  }
}
