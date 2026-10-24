import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@fontsource-variable/golos-text';
import '@fontsource-variable/unbounded';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';

// Service Worker полностью удалён, чтобы не кэшировать старые сборки

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
