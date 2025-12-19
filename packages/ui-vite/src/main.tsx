import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import '@leanspec/ui-components/styles.css'
import { router } from './router'
import { ProjectProvider, ThemeProvider } from './contexts'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ProjectProvider>
        <RouterProvider router={router} />
      </ProjectProvider>
    </ThemeProvider>
  </StrictMode>,
)
