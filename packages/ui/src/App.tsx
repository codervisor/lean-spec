import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { router } from './router';
import { KeyboardShortcutsProvider, ChatProvider, ToastProvider } from './contexts';
import { queryClient } from './lib/query-client';
import { useSpecsSSE } from './hooks/useSpecsSSE';
import { useSessionsStream } from './hooks/useSessionsQuery';
import { useCurrentProject } from './hooks/useProjectQuery';
import { useSessionsUiStore } from './stores/sessions-ui';
import { useProjectScopedStoreSync } from './lib/project-store-sync';

function AppDataSync() {
  const { currentProject } = useCurrentProject();
  const isDrawerOpen = useSessionsUiStore((state) => state.isDrawerOpen);
  
  useSpecsSSE();
  // Only poll sessions when the drawer is open to avoid unnecessary API calls
  useSessionsStream(currentProject?.id ?? null, { enabled: isDrawerOpen });
  
  // Rehydrate project-scoped stores when project changes
  useProjectScopedStoreSync();
  
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <KeyboardShortcutsProvider>
          <ChatProvider>
            <AppDataSync />
            <RouterProvider router={router} />
          </ChatProvider>
        </KeyboardShortcutsProvider>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
