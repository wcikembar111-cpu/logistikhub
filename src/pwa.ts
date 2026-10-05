/**
 * PWA Service Worker Registration & Lifecycle Management
 */

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);

          // Check for updates immediately
          reg.update().catch(() => {});

          // Check for updates periodically (every 10 minutes)
          setInterval(() => {
            reg.update().catch(() => {});
          }, 10 * 60 * 1000);

          // Check on update found
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[PWA] New version ready, skipWaiting...');
                    installingWorker.postMessage({ type: 'SKIP_WAITING' });
                  } else {
                    console.log('[PWA] App cached for offline use.');
                  }
                }
              };
            }
          };

          // If there is already a worker waiting, activate it immediately
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });

      // Reload page automatically when new service worker takes over control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('[PWA] Controller changed, refreshing page for latest update...');
          window.location.reload();
        }
      });

      // Check for updates when the user returns or focuses the window/tab
      window.addEventListener('focus', () => {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update().catch(() => {});
        });
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          navigator.serviceWorker.getRegistration().then((reg) => {
            reg?.update().catch(() => {});
          });
        }
      });
    });
  }
}

/**
 * Manually force clear all service worker caches and refresh the app
 */
export async function forceUpdatePwa() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log('[PWA] All caches cleared manually.');
    }
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
      }
    }
    window.location.reload();
  } catch (e) {
    console.error('Failed to force update PWA:', e);
    window.location.reload();
  }
}
