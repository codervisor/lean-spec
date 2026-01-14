import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Layout context value for managing layout-specific UI state.
 * Currently manages mobile sidebar visibility and wide mode preference.
 */
interface LayoutContextValue {
  /** Whether the mobile main sidebar is open */
  mobileSidebarOpen: boolean;
  /** Toggle the mobile main sidebar */
  toggleMobileSidebar: () => void;
  /** Whether wide mode is enabled (removes max-w-7xl constraint) */
  isWideMode: boolean;
  /** Toggle wide mode */
  toggleWideMode: () => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

/**
 * Provider for layout-specific UI state.
 * Wraps the Layout component to provide mobile sidebar state management.
 */
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isWideMode, setIsWideMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('layout-wide-mode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('layout-wide-mode', String(isWideMode));
  }, [isWideMode]);

  const value = useMemo(
    () => ({
      mobileSidebarOpen,
      toggleMobileSidebar: () => setMobileSidebarOpen((prev) => !prev),
      isWideMode,
      toggleWideMode: () => setIsWideMode((prev) => !prev),
    }),
    [mobileSidebarOpen, isWideMode]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

/**
 * Hook to access layout context.
 * Must be used within a LayoutProvider.
 */
export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
