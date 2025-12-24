import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Note: @leanspec/ui-components/styles.css removed to avoid duplicate Tailwind utilities
// The component library CSS is now handled by our main index.css
import './lib/i18n'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
