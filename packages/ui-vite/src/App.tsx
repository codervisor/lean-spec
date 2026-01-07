import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ProjectProvider, ThemeProvider, KeyboardShortcutsProvider } from './contexts';

function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <KeyboardShortcutsProvider>
          <RouterProvider router={router} />
        </KeyboardShortcutsProvider>
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;
