import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@leanspec/ui/styles.css';
import '@leanspec/ui/app.css';
import { i18n } from '@leanspec/ui';
import './styles.css';

void i18n;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
