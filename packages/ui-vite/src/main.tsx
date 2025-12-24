import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@leanspec/ui-components/styles.css'
import './lib/i18n'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
