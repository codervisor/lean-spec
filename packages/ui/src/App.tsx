import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { router } from './router';
import { KeyboardShortcutsProvider, ChatProvider, ToastProvider } from './contexts';
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
