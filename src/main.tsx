import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { PwaProvider } from './context/PwaContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { registerServiceWorker } from './pwa.ts';
import './index.css';

// Register PWA Service Worker
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <PwaProvider>
          <App />
        </PwaProvider>
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>,
);


