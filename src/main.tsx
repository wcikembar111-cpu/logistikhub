import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { NotificationProvider } from './context/NotificationContext.tsx';
import { PwaProvider } from './context/PwaContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { OnlineUsersProvider } from './context/OnlineUsersContext.tsx';
import { registerServiceWorker } from './pwa.ts';
import './index.css';

// Register PWA Service Worker
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <OnlineUsersProvider>
        <NotificationProvider>
          <PwaProvider>
            <App />
          </PwaProvider>
        </NotificationProvider>
      </OnlineUsersProvider>
    </AuthProvider>
  </StrictMode>,
);


