import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SpecsContextValue {
  /** Increment this to trigger a refetch of specs in any listening component */
  refreshTrigger: number;
  /** Call this to notify all components that specs data should be refreshed */
  triggerRefresh: () => void;
}

const SpecsContext = createContext<SpecsContextValue | undefined>(undefined);

interface SpecsProviderProps {
  children: ReactNode;
}

export function SpecsProvider({ children }: SpecsProviderProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <SpecsContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </SpecsContext.Provider>
  );
}

export function useSpecs() {
  const context = useContext(SpecsContext);
  if (context === undefined) {
    throw new Error('useSpecs must be used within a SpecsProvider');
  }
  return context;
}
