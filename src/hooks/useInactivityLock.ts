import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  updateLastActivity, 
  isPinUnlocked, 
  lockApp, 
  getSessionTimeoutMinutes, 
  setSessionTimeoutMinutes 
} from '../utils/pinAuth';

interface UseInactivityLockOptions {
  onLock: () => void;
  enabled?: boolean;
}

export function useInactivityLock({ onLock, enabled = true }: UseInactivityLockOptions) {
  const [timeoutMinutes, setTimeoutMinutesState] = useState<number>(() => getSessionTimeoutMinutes());
  const lastUpdateRef = useRef<number>(Date.now());

  const handleUserActivity = useCallback(() => {
    if (!enabled) return;
    const now = Date.now();
    // Throttle writing to storage to once every 3 seconds
    if (now - lastUpdateRef.current > 3000) {
      lastUpdateRef.current = now;
      updateLastActivity();
    }
  }, [enabled]);

  // Handle timeout duration change
  const updateTimeoutMinutes = (mins: number) => {
    setSessionTimeoutMinutes(mins);
    setTimeoutMinutesState(mins);
  };

  // Explicit manual lock
  const lockNow = useCallback(() => {
    lockApp();
    onLock();
  }, [onLock]);

  useEffect(() => {
    if (!enabled) return;

    // Initial activity register
    updateLastActivity();

    // Event listeners for detecting user activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const listener = () => handleUserActivity();

    events.forEach(event => {
      window.addEventListener(event, listener, { passive: true });
    });

    // Background interval check every 5 seconds to detect if inactivity duration exceeded
    const interval = setInterval(() => {
      if (!isPinUnlocked()) {
        lockNow();
      }
    }, 5000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, listener);
      });
      clearInterval(interval);
    };
  }, [enabled, handleUserActivity, lockNow]);

  return {
    timeoutMinutes,
    updateTimeoutMinutes,
    lockNow
  };
}
