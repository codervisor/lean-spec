import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@leanspec/ui-components/styles.css';
import '@leanspec/ui-vite/src/index.css';
import '@leanspec/ui-vite/src/lib/i18n';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
