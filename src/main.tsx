import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { PwaProvider } from './context/PwaContext.tsx';
import { registerServiceWorker } from './pwa.ts';
import './index.css';

// Register PWA Service Worker
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <PwaProvider>
        <App />
      </PwaProvider>
    </NotificationProvider>
  </StrictMode>,
);

