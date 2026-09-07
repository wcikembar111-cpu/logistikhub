import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getExternalSupabaseClient, getBroadcastExternalConfig } from '../supabase';

const STORAGE_KEY_HIDDEN_MENUS = 'hidden_menu_ids';
const SHARED_VISIBILITY_CHANNEL = 'menu_visibility_realtime_broadcast';

// Unique session ID to identify the local tab / browser instance
const SESSION_CLIENT_ID = typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : 'client-' + Math.random().toString(36).substring(2, 9);

export function useMenuVisibility() {
  const [hiddenMenuIds, setHiddenMenuIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HIDDEN_MENUS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cached hidden menu IDs:', e);
    }
    return [];
  });

  const [loading, setLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const channelRef = useRef<any>(null);

  // Broadcast helper to notify all browser windows and devices in realtime
  const broadcastVisibilityChange = useCallback(async (newHiddenIds: string[]) => {
    try {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'menu_visibility_update',
          payload: {
            hiddenIds: newHiddenIds,
            senderId: SESSION_CLIENT_ID,
            timestamp: Date.now()
          }
        });
      }
    } catch (err) {
      console.warn('Failed to broadcast menu visibility change:', err);
    }

    // Also broadcast to external Supabase instance if configured
    try {
      const extClient = getExternalSupabaseClient();
      const extConfig = getBroadcastExternalConfig();
      if (extClient && extConfig.enabled && extConfig.syncTarget !== 'primary') {
        const extChannel = extClient.channel(SHARED_VISIBILITY_CHANNEL);
        await extChannel.send({
          type: 'broadcast',
          event: 'menu_visibility_update',
          payload: {
            hiddenIds: newHiddenIds,
            senderId: SESSION_CLIENT_ID,
            timestamp: Date.now()
          }
        });
      }
    } catch (err) {
      console.warn('Failed to broadcast to external Supabase:', err);
    }
  }, []);

  // Fetch hidden menus from Supabase (Checks dedicated 'menu_visibility' table first, then 'settings')
  const fetchHiddenMenus = useCallback(async () => {
    try {
      // 1. Try dedicated table 'menu_visibility' first to prevent any clash with existing settings table
      const { data: dedicatedData, error: dedicatedError } = await supabase
        .from('menu_visibility')
        .select('*')
        .eq('id', 'hidden_menus')
        .maybeSingle();

      if (!dedicatedError && dedicatedData) {
        let remoteList: string[] = [];
        if (Array.isArray(dedicatedData.hidden_ids)) {
          remoteList = dedicatedData.hidden_ids;
        } else if (typeof dedicatedData.hidden_ids === 'string') {
          try {
            const parsed = JSON.parse(dedicatedData.hidden_ids);
            if (Array.isArray(parsed)) remoteList = parsed;
          } catch {}
        }

        setHiddenMenuIds(remoteList);
        localStorage.setItem(STORAGE_KEY_HIDDEN_MENUS, JSON.stringify(remoteList));
        return;
      }

      // 2. Fallback to 'settings' table if menu_visibility table doesn't exist or has no row
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 'hidden_menus')
        .maybeSingle();

      if (!error && data) {
        let remoteList: string[] = [];
        if (Array.isArray(data.order)) {
          remoteList = data.order;
        } else if (Array.isArray(data.messages)) {
          remoteList = data.messages;
        } else if (Array.isArray(data.hidden_ids)) {
          remoteList = data.hidden_ids;
        } else if (typeof data.messages === 'string') {
          try {
            const parsed = JSON.parse(data.messages);
            if (Array.isArray(parsed)) remoteList = parsed;
          } catch {}
        }

        setHiddenMenuIds(remoteList);
        localStorage.setItem(STORAGE_KEY_HIDDEN_MENUS, JSON.stringify(remoteList));
      }
    } catch (e) {
      console.warn('Error fetching hidden menus from database:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up Supabase Realtime subscription and broadcast room
  useEffect(() => {
    fetchHiddenMenus();

    const channel = supabase
      .channel(`${SHARED_VISIBILITY_CHANNEL}_${SESSION_CLIENT_ID}`)
      // Listen to changes on dedicated menu_visibility table
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_visibility', filter: 'id=eq.hidden_menus' },
        () => {
          fetchHiddenMenus();
        }
      )
      // Listen to changes on settings table fallback
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: 'id=eq.hidden_menus' },
        () => {
          fetchHiddenMenus();
        }
      )
      // Listen to realtime broadcast messages (works instantly even without database tables)
      .on('broadcast', { event: 'menu_visibility_update' }, ({ payload }) => {
        if (payload && Array.isArray(payload.hiddenIds)) {
          // If update came from another tab/device, apply immediately
          if (payload.senderId !== SESSION_CLIENT_ID) {
            setHiddenMenuIds(payload.hiddenIds);
            localStorage.setItem(STORAGE_KEY_HIDDEN_MENUS, JSON.stringify(payload.hiddenIds));
          }
        }
      })
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Listen for storage events across tabs in the same browser
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_HIDDEN_MENUS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setHiddenMenuIds(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Error cleaning up menu visibility channel:', e);
      }
    };
  }, [fetchHiddenMenus]);

  // Persist updated hidden list to local storage, broadcast, and Supabase
  const persistHiddenMenus = useCallback(async (newHiddenIds: string[]) => {
    // 1. Instant local update
    setHiddenMenuIds(newHiddenIds);
    try {
      localStorage.setItem(STORAGE_KEY_HIDDEN_MENUS, JSON.stringify(newHiddenIds));
    } catch (e) {
      console.warn('Failed to write to localStorage:', e);
    }

    // 2. Realtime broadcast to all connected devices across network (zero-latency WebSocket)
    broadcastVisibilityChange(newHiddenIds);

    // 3. Persistent write to Supabase:
    // Try dedicated 'menu_visibility' table first
    try {
      const { error: dedicatedErr } = await supabase.from('menu_visibility').upsert({
        id: 'hidden_menus',
        hidden_ids: newHiddenIds,
        updated_at: new Date().toISOString()
      });

      if (!dedicatedErr) {
        return; // Successfully saved to dedicated table
      }

      // If dedicated table does not exist or returned error, try fallback to 'settings' table
      const { error: settingsErr } = await supabase.from('settings').upsert({
        id: 'hidden_menus',
        order: newHiddenIds,
        messages: newHiddenIds
      });

      if (settingsErr) {
        console.warn('Could not persist to Supabase tables. State is active via Realtime Broadcast & localStorage:', {
          dedicatedErr,
          settingsErr
        });
      }
    } catch (err) {
      console.warn('Network or schema note when saving hidden menus to Supabase:', err);
    }
  }, [broadcastVisibilityChange]);

  const isMenuHidden = useCallback((menuId: string): boolean => {
    return hiddenMenuIds.includes(menuId);
  }, [hiddenMenuIds]);

  const hideMenu = useCallback(async (menuId: string) => {
    if (hiddenMenuIds.includes(menuId)) return;
    const nextList = [...hiddenMenuIds, menuId];
    await persistHiddenMenus(nextList);
  }, [hiddenMenuIds, persistHiddenMenus]);

  const unhideMenu = useCallback(async (menuId: string) => {
    if (!hiddenMenuIds.includes(menuId)) return;
    const nextList = hiddenMenuIds.filter(id => id !== menuId);
    await persistHiddenMenus(nextList);
  }, [hiddenMenuIds, persistHiddenMenus]);

  const toggleMenuVisibility = useCallback(async (menuId: string) => {
    if (hiddenMenuIds.includes(menuId)) {
      await unhideMenu(menuId);
    } else {
      await hideMenu(menuId);
    }
  }, [hiddenMenuIds, hideMenu, unhideMenu]);

  const unhideAllMenus = useCallback(async () => {
    await persistHiddenMenus([]);
  }, [persistHiddenMenus]);

  const hideMultipleMenus = useCallback(async (menuIds: string[]) => {
    const combined = Array.from(new Set([...hiddenMenuIds, ...menuIds]));
    await persistHiddenMenus(combined);
  }, [hiddenMenuIds, persistHiddenMenus]);

  return {
    hiddenMenuIds,
    isMenuHidden,
    hideMenu,
    unhideMenu,
    toggleMenuVisibility,
    unhideAllMenus,
    hideMultipleMenus,
    loading,
    isRealtimeConnected,
    refetch: fetchHiddenMenus
  };
}
