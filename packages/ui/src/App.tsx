import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { MachineProvider, ProjectProvider, ThemeProvider, KeyboardShortcutsProvider, SpecsProvider } from './contexts';

function App() {
  return (
    <ThemeProvider>
      <MachineProvider>
        <ProjectProvider>
          <SpecsProvider>
            <KeyboardShortcutsProvider>
              <RouterProvider router={router} />
            </KeyboardShortcutsProvider>
          </SpecsProvider>
        </ProjectProvider>
      </MachineProvider>
    </ThemeProvider>
  );
}

export default App;
