import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { MachineProvider, ProjectProvider, ThemeProvider, KeyboardShortcutsProvider, SpecsProvider, ChatProvider } from './contexts';
import { GlobalChatWidget } from './components/GlobalChatWidget';
import { useChat } from './contexts';

function AppContent() {
  const { isChatOpen, closeChat } = useChat();

  return (
    <>
      <RouterProvider router={router} />
      <GlobalChatWidget isOpen={isChatOpen} onClose={closeChat} />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <MachineProvider>
        <ProjectProvider>
          <SpecsProvider>
            <KeyboardShortcutsProvider>
              <ChatProvider>
                <AppContent />
              </ChatProvider>
            </KeyboardShortcutsProvider>
          </SpecsProvider>
        </ProjectProvider>
      </MachineProvider>
    </ThemeProvider>
  );
}

export default App;
