import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { router } from './router';
import { KeyboardShortcutsProvider, ChatProvider } from './contexts';
import { queryClient } from './lib/query-client';
import { useSpecsSSE } from './hooks/useSpecsSSE';
import { useSessionsStream } from './hooks/useSessionsQuery';
import { useCurrentProject } from './hooks/useProjectQuery';

function AppDataSync() {
  const { currentProject } = useCurrentProject();
  useSpecsSSE();
  useSessionsStream(currentProject?.id ?? null);
  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KeyboardShortcutsProvider>
        <ChatProvider>
          <AppDataSync />
          <RouterProvider router={router} />
        </ChatProvider>
      </KeyboardShortcutsProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
