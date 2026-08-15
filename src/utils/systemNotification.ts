// System / OS Web Notification & Tab Alert Utilities
import { BroadcastMessage } from '../types';

let originalDocumentTitle = typeof document !== 'undefined' ? document.title : 'CKB Logistic Hub';
let titleFlashInterval: ReturnType<typeof setInterval> | null = null;

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Triggers an OS-level notification banner that appears above any active window/app.
 */
export async function triggerSystemBroadcastNotification(
  broadcast: BroadcastMessage,
  onNotificationClick?: () => void
) {
  // 1. Flash browser tab title if tab is hidden / in background
  if (typeof document !== 'undefined' && document.hidden) {
    const shortMsg = broadcast.message.length > 30 
      ? broadcast.message.substring(0, 30) + '...' 
      : broadcast.message;
    startTabAlert(`🚨 [SIARAN] ${broadcast.sender_name}: ${shortMsg}`);
  }

  // 2. Trigger OS Notification if permitted
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const title = `📢 Siaran dari: ${broadcast.sender_name}`;
  const options: any = {
    body: broadcast.message,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `ckb-broadcast-${broadcast.id || Date.now()}`,
    renotify: true,
    requireInteraction: true, // Keep notification pinned until user interacts (Windows/Mac/Android)
    silent: false,
    data: {
      url: window.location.href,
      broadcastId: broadcast.id,
      senderName: broadcast.sender_name,
      message: broadcast.message
    }
  };

  try {
    // Priority A: Try through active Service Worker registration (handles background/PWA best)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, options);
        return;
      }
    }

    // Priority B: Fallback to standard web Notification instance
    const notif = new Notification(title, options);
    notif.onclick = (e) => {
      e.preventDefault();
      window.focus();
      notif.close();
      stopTabAlert();
      if (onNotificationClick) {
        onNotificationClick();
      }
    };
  } catch (err) {
    console.warn('Could not display system notification:', err);
    // Fallback simple Notification
    try {
      const fallbackNotif = new Notification(title, {
        body: broadcast.message,
        icon: '/favicon.svg'
      });
      fallbackNotif.onclick = () => {
        window.focus();
        fallbackNotif.close();
        stopTabAlert();
        if (onNotificationClick) onNotificationClick();
      };
    } catch (e2) {
      // Ignored
    }
  }
}

/**
 * Alternates the document title between original and alert text
 */
export function startTabAlert(alertText: string) {
  if (typeof document === 'undefined') return;
  
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
  }

  if (!originalDocumentTitle || originalDocumentTitle.includes('🚨')) {
    originalDocumentTitle = 'CKB Logistic Hub';
  }

  let isAlert = true;
  document.title = alertText;

  titleFlashInterval = setInterval(() => {
    document.title = isAlert ? originalDocumentTitle : alertText;
    isAlert = !isAlert;
  }, 900);

  // Auto clear when user returns to this window/tab
  const onFocusOrVisible = () => {
    if (!document.hidden) {
      stopTabAlert();
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    }
  };

  window.addEventListener('focus', onFocusOrVisible);
  document.addEventListener('visibilitychange', onFocusOrVisible);
}

export function stopTabAlert() {
  if (typeof document === 'undefined') return;
  if (titleFlashInterval) {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
  }
  document.title = originalDocumentTitle || 'CKB Logistic Hub';
}
