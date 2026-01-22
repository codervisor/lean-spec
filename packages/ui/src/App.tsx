import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { MachineProvider, ProjectProvider, ThemeProvider, KeyboardShortcutsProvider, SpecsProvider, ChatProvider } from './contexts';

function App() {
  return (
    <ThemeProvider>
      <MachineProvider>
        <ProjectProvider>
          <SpecsProvider>
            <KeyboardShortcutsProvider>
              <ChatProvider>
                <RouterProvider router={router} />
              </ChatProvider>
            </KeyboardShortcutsProvider>
          </SpecsProvider>
        </ProjectProvider>
      </MachineProvider>
    </ThemeProvider>
  );
}

export default App;
