import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { useAuthContext } from './AuthContext';
import { ActiveOnlineUser } from '../types';

const LOCAL_STORAGE_ONLINE_KEY = 'ckb_active_online_sessions_v1';
const BROADCAST_CHANNEL_NAME = 'ckb_presence_broadcast';
const HEARTBEAT_INTERVAL_MS = 10000; // 10s heartbeat
const SESSION_EXPIRY_MS = 35000; // 35s expiry

// Generate unique tab/client ID
const CLIENT_SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : 'session-' + Math.random().toString(36).substring(2, 9);

function getDeviceName(): string {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'Desktop';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Mobile';
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/tablet/i.test(ua)) return 'Tablet';
  if (/macintosh|mac os x/i.test(ua)) return 'Mac';
  if (/windows/i.test(ua)) return 'Windows PC';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Web Client';
}

interface StoredSession {
  sessionId: string;
  id: string;
  username: string;
  nama: string;
  role: string;
  avatar?: string;
  device: string;
  onlineAt: number;
  lastActive: number;
}

interface OnlineUsersContextType {
  onlineUsers: ActiveOnlineUser[];
  onlineCount: number;
  loading: boolean;
  isUserOnline: (username: string) => boolean;
  refreshOnlineUsers: () => void;
}

const OnlineUsersContext = createContext<OnlineUsersContextType>({
  onlineUsers: [],
  onlineCount: 0,
  loading: false,
  isUserOnline: () => false,
  refreshOnlineUsers: () => {}
});

export function OnlineUsersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [onlineUsers, setOnlineUsers] = useState<ActiveOnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  const presenceChannelRef = useRef<any>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Helper to read & prune local storage sessions
  const getCleanLocalSessions = useCallback((): StoredSession[] => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_ONLINE_KEY);
      if (!raw) return [];
      const parsed: StoredSession[] = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const now = Date.now();
      return parsed.filter(s => s && s.username && (now - s.lastActive < SESSION_EXPIRY_MS));
    } catch {
      return [];
    }
  }, []);

  // Helper to save local sessions
  const saveLocalSessions = useCallback((sessions: StoredSession[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ONLINE_KEY, JSON.stringify(sessions));
    } catch {}
  }, []);

  // Combine presence and local sessions to produce a single deduplicated list
  const aggregateUsers = useCallback((presenceState: Record<string, any[]> = {}) => {
    const userMap = new Map<string, ActiveOnlineUser>();
    const currentUsername = user?.username?.toLowerCase();

    // 1. Process Supabase Realtime presence state
    Object.values(presenceState).forEach(presences => {
      if (Array.isArray(presences)) {
        presences.forEach(item => {
          if (item && item.username) {
            const key = item.username.toLowerCase();
            const isSelf = currentUsername ? key === currentUsername : false;
            const existing = userMap.get(key);

            if (!existing || (item.lastActive && item.lastActive > existing.lastActive)) {
              userMap.set(key, {
                id: item.id || key,
                username: item.username,
                nama: item.nama || item.username,
                role: item.role || 'Pelaksana',
                avatar: item.avatar || '',
                device: item.device || 'Web Client',
                onlineAt: item.onlineAt || Date.now(),
                lastActive: item.lastActive || Date.now(),
                isSelf
              });
            }
          }
        });
      }
    });

    // 2. Process LocalStorage sessions (pruned)
    const localSessions = getCleanLocalSessions();
    localSessions.forEach(s => {
      const key = s.username.toLowerCase();
      const isSelf = currentUsername ? key === currentUsername : false;
      const existing = userMap.get(key);

      if (!existing) {
        userMap.set(key, {
          id: s.id || key,
          username: s.username,
          nama: s.nama || s.username,
          role: s.role || 'Pelaksana',
          avatar: s.avatar || '',
          device: s.device || 'Web Client',
          onlineAt: s.onlineAt || s.lastActive || Date.now(),
          lastActive: s.lastActive || Date.now(),
          isSelf
        });
      } else {
        if (s.lastActive > existing.lastActive) {
          existing.lastActive = s.lastActive;
        }
        if (isSelf) {
          existing.isSelf = true;
        }
      }
    });

    // 3. Ensure current user is present if authenticated
    if (user && user.username) {
      const selfKey = user.username.toLowerCase();
      if (!userMap.has(selfKey)) {
        userMap.set(selfKey, {
          id: user.id || selfKey,
          username: user.username,
          nama: user.nama || user.username,
          role: user.role || 'Pelaksana',
          avatar: user.avatar || '',
          device: getDeviceName(),
          onlineAt: user.loggedInAt || Date.now(),
          lastActive: Date.now(),
          isSelf: true
        });
      } else {
        const selfUser = userMap.get(selfKey)!;
        selfUser.isSelf = true;
        selfUser.nama = user.nama || selfUser.nama;
        selfUser.role = user.role || selfUser.role;
      }
    }

    // Convert to sorted array: Self first, then Admins, then alphabetical
    const sorted = Array.from(userMap.values()).sort((a, b) => {
      if (a.isSelf && !b.isSelf) return -1;
      if (!a.isSelf && b.isSelf) return 1;
      if (a.role === 'Admin' && b.role !== 'Admin') return -1;
      if (a.role !== 'Admin' && b.role === 'Admin') return 1;
      return a.nama.localeCompare(b.nama);
    });

    setOnlineUsers(sorted);
    setLoading(false);
  }, [user, getCleanLocalSessions]);

  // Push heartbeat to local storage
  const recordLocalHeartbeat = useCallback(() => {
    if (!user || !user.username) return;
    const now = Date.now();
    const clean = getCleanLocalSessions().filter(s => s.sessionId !== CLIENT_SESSION_ID);
    
    clean.push({
      sessionId: CLIENT_SESSION_ID,
      id: user.id || user.username,
      username: user.username,
      nama: user.nama || user.username,
      role: user.role || 'Pelaksana',
      avatar: user.avatar || '',
      device: getDeviceName(),
      onlineAt: user.loggedInAt || now,
      lastActive: now
    });

    saveLocalSessions(clean);
  }, [user, getCleanLocalSessions, saveLocalSessions]);

  // Remove local session on unload or logout
  const removeLocalSession = useCallback(() => {
    try {
      const clean = getCleanLocalSessions().filter(s => s.sessionId !== CLIENT_SESSION_ID);
      saveLocalSessions(clean);
      broadcastChannelRef.current?.postMessage({ type: 'session_removed', sessionId: CLIENT_SESSION_ID });
    } catch {}
  }, [getCleanLocalSessions, saveLocalSessions]);

  // Initialize BroadcastChannel & Cross-tab listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannelRef.current = bc;
        bc.onmessage = () => {
          aggregateUsers(presenceChannelRef.current?.presenceState() || {});
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_ONLINE_KEY) {
        aggregateUsers(presenceChannelRef.current?.presenceState() || {});
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      try {
        broadcastChannelRef.current?.close();
      } catch {}
    };
  }, [aggregateUsers]);

  // Supabase Realtime Presence Setup (Single Provider Instance)
  useEffect(() => {
    if (!user || !user.username) {
      removeLocalSession();
      setOnlineUsers([]);
      setLoading(false);
      return;
    }

    recordLocalHeartbeat();

    const channelName = 'room_online_users_presence';

    // Safely remove any existing channel with the same topic to prevent "cannot add presence callbacks after subscribe()"
    try {
      const existingChannels = supabase.getChannels();
      const existing = existingChannels.find(
        ch => ch.topic === `realtime:${channelName}` || ch.topic === channelName
      );
      if (existing) {
        supabase.removeChannel(existing);
      }
    } catch {}

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.username.toLowerCase()
        }
      }
    });

    presenceChannelRef.current = channel;

    const userPresencePayload = {
      id: user.id || user.username,
      username: user.username,
      nama: user.nama || user.username,
      role: user.role || 'Pelaksana',
      avatar: user.avatar || '',
      device: getDeviceName(),
      onlineAt: user.loggedInAt || Date.now(),
      lastActive: Date.now()
    };

    try {
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          aggregateUsers(state);
        })
        .on('presence', { event: 'join' }, () => {
          const state = channel.presenceState();
          aggregateUsers(state);
        })
        .on('presence', { event: 'leave' }, () => {
          const state = channel.presenceState();
          aggregateUsers(state);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.track(userPresencePayload);
            } catch (err) {
              console.warn('Supabase presence tracking note:', err);
            }
          }
        });
    } catch (e) {
      console.warn('Presence callback attach warning:', e);
    }

    // Initial aggregation
    aggregateUsers({});

    // Periodic Heartbeat Interval
    const heartbeatTimer = setInterval(() => {
      recordLocalHeartbeat();
      if (channel) {
        try {
          channel.track({
            ...userPresencePayload,
            lastActive: Date.now()
          });
        } catch {}
      }
      aggregateUsers(channel?.presenceState() || {});
    }, HEARTBEAT_INTERVAL_MS);

    // Unload & Logout handlers
    const handleBeforeUnload = () => {
      removeLocalSession();
      try {
        channel.untrack();
      } catch {}
    };

    const handleAuthLogout = () => {
      removeLocalSession();
      try {
        channel.untrack();
      } catch {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('ckb-auth-logout', handleAuthLogout);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('ckb-auth-logout', handleAuthLogout);
      removeLocalSession();
      try {
        channel.untrack();
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [user, recordLocalHeartbeat, removeLocalSession, aggregateUsers]);

  // Quick helper to check if a specific username is currently online
  const isUserOnline = useCallback((username: string): boolean => {
    if (!username) return false;
    const target = username.toLowerCase().trim();
    return onlineUsers.some(u => u.username.toLowerCase().trim() === target);
  }, [onlineUsers]);

  // Force manual refresh
  const refreshOnlineUsers = useCallback(() => {
    recordLocalHeartbeat();
    aggregateUsers(presenceChannelRef.current?.presenceState() || {});
  }, [recordLocalHeartbeat, aggregateUsers]);

  const value = {
    onlineUsers,
    onlineCount: onlineUsers.length,
    loading,
    isUserOnline,
    refreshOnlineUsers
  };

  return (
    <OnlineUsersContext.Provider value={value}>
      {children}
    </OnlineUsersContext.Provider>
  );
}

export function useOnlineUsers(): OnlineUsersContextType {
  return useContext(OnlineUsersContext);
}
