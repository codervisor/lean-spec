import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ProjectProvider, ThemeProvider } from './contexts';

function App() {
  return (
    <ThemeProvider>
      <ProjectProvider>
        <RouterProvider router={router} />
      </ProjectProvider>
    </ThemeProvider>
  );
}

export default App;
