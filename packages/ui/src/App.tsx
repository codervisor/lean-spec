import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ProjectProvider, ThemeProvider, KeyboardShortcutsProvider, SpecsProvider } from './contexts';

function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <SpecsProvider>
          <KeyboardShortcutsProvider>
            <RouterProvider router={router} />
          </KeyboardShortcutsProvider>
        </SpecsProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;
