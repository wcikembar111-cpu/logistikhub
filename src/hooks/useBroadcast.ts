import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  supabase, 
  getExternalSupabaseClient, 
  getBroadcastExternalConfig, 
  saveBroadcastExternalConfig,
  testExternalSupabaseConnection 
} from '../supabase';
import { BroadcastMessage, BroadcastCategory, ExternalSupabaseConfig, DatabaseSyncStatus } from '../types';
import { playBroadcastSound } from '../utils/broadcastSound';
import { 
  triggerSystemBroadcastNotification, 
  getNotificationPermission, 
  requestNotificationPermission, 
  isNotificationSupported,
  stopTabAlert 
} from '../utils/systemNotification';

// Unique session ID to identify current browser tab
const SESSION_CLIENT_ID = typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : 'client-' + Math.random().toString(36).substring(2, 9);

export function useBroadcast() {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [incomingBroadcast, setIncomingBroadcast] = useState<BroadcastMessage | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => getNotificationPermission());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // External Supabase Configuration State
  const [externalConfig, setExternalConfig] = useState<ExternalSupabaseConfig>(() => getBroadcastExternalConfig());
  const [syncStatus, setSyncStatus] = useState<DatabaseSyncStatus>({
    isPrimaryConnected: true,
    isExternalConnected: false,
    externalError: null
  });

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('broadcast_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  // Listen for config changes dispatched across tabs/components
  useEffect(() => {
    const handleConfigChange = () => {
      setExternalConfig(getBroadcastExternalConfig());
    };
    window.addEventListener('broadcast-external-config-changed', handleConfigChange);
    window.addEventListener('storage', handleConfigChange);
    return () => {
      window.removeEventListener('broadcast-external-config-changed', handleConfigChange);
      window.removeEventListener('storage', handleConfigChange);
    };
  }, []);

  const requestSysPermission = useCallback(async () => {
    const res = await requestNotificationPermission();
    setNotificationPermission(res);
    return res;
  }, []);

  // Fetch messages from Primary DB and/or External Supabase DB
  const fetchMessages = useCallback(async () => {
    const config = getBroadcastExternalConfig();
    const extClient = getExternalSupabaseClient();
    const allMessages: BroadcastMessage[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch from Primary DB
    if (config.syncTarget !== 'external') {
      try {
        const { data, error } = await supabase
          .from('broadcast_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        if (!error && data) {
          (data as BroadcastMessage[]).forEach(item => {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              allMessages.push({ ...item, origin: 'primary' });
            }
          });
          setSyncStatus(prev => ({ ...prev, isPrimaryConnected: true }));
        } else if (error) {
          console.warn('Primary DB broadcast fetch note:', error.message);
        }
      } catch (e) {
        console.error('Error fetching primary broadcast messages:', e);
      }
    }

    // 2. Fetch from External Supabase DB (if configured and enabled)
    if (extClient && config.enabled && config.syncTarget !== 'primary') {
      try {
        const { data, error } = await extClient
          .from('broadcast_messages')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(40);

        if (!error && data) {
          (data as BroadcastMessage[]).forEach(item => {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              allMessages.push({ ...item, origin: 'external' });
            }
          });
          setSyncStatus(prev => ({ 
            ...prev, 
            isExternalConnected: true, 
            externalError: null,
            lastSyncedAt: new Date().toISOString()
          }));
        } else if (error) {
          console.warn('External DB broadcast fetch warning:', error.message);
          setSyncStatus(prev => ({ 
            ...prev, 
            isExternalConnected: false, 
            externalError: error.message 
          }));
        }
      } catch (e: any) {
        console.error('Error fetching external broadcast messages:', e);
        setSyncStatus(prev => ({ 
          ...prev, 
          isExternalConnected: false, 
          externalError: e.message || 'Gagal tersambung' 
        }));
      }
    } else {
      setSyncStatus(prev => ({ 
        ...prev, 
        isExternalConnected: false, 
        externalError: null 
      }));
    }

    // Sort combined messages by created_at descending
    allMessages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setMessages(allMessages);
    setLoading(false);
  }, []);

  // Handle incoming broadcast from any connected client / database
  const handleIncomingBroadcast = useCallback((item: BroadcastMessage & { sessionId?: string }, source: 'primary' | 'external') => {
    if (!item || !item.id) return;

    setMessages(prev => {
      if (prev.some(m => m.id === item.id)) return prev;
      return [{ ...item, origin: source }, ...prev];
    });

    // Trigger popup & OS notification if sent by another device or session
    if (item.sessionId !== SESSION_CLIENT_ID) {
      setIncomingBroadcast(item);
      if (soundEnabledRef.current) {
        playBroadcastSound(item.category || 'info');
      }

      // Trigger OS Banner Notification & Flashing Tab title
      triggerSystemBroadcastNotification(item, () => {
        setIncomingBroadcast(item);
      });
    }
  }, []);

  // Listen to both Primary & External Supabase Broadcast Channels (WebSockets) & Postgres Realtime DB
  useEffect(() => {
    fetchMessages();

    // --- 1. Primary Supabase Channel Subscriptions ---
    const primaryChannel = (supabase.channel('broadcast_intercom_room') as any)
      .on('broadcast', { event: 'new_broadcast' }, (payload: any) => {
        handleIncomingBroadcast(payload.payload, 'primary');
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_messages' }, (payload: any) => {
        const newItem = payload.new as BroadcastMessage;
        if (newItem) {
          handleIncomingBroadcast(newItem, 'primary');
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'broadcast_messages' }, (payload: any) => {
        if (payload.old && payload.old.id) {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        } else {
          fetchMessages();
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setSyncStatus(prev => ({ ...prev, isPrimaryConnected: true }));
        }
      });

    // --- 2. External Supabase Channel Subscriptions (Cross-App Broadcast) ---
    let externalChannel: any = null;
    const extClient = getExternalSupabaseClient();
    const currentExtConfig = getBroadcastExternalConfig();

    if (extClient && currentExtConfig.enabled && currentExtConfig.syncTarget !== 'primary') {
      try {
        externalChannel = (extClient.channel('broadcast_intercom_room') as any)
          .on('broadcast', { event: 'new_broadcast' }, (payload: any) => {
            handleIncomingBroadcast(payload.payload, 'external');
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_messages' }, (payload: any) => {
            const newItem = payload.new as BroadcastMessage;
            if (newItem) {
              handleIncomingBroadcast(newItem, 'external');
            }
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'broadcast_messages' }, (payload: any) => {
            if (payload.old && payload.old.id) {
              setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            } else {
              fetchMessages();
            }
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              setSyncStatus(prev => ({ 
                ...prev, 
                isExternalConnected: true, 
                externalError: null,
                lastSyncedAt: new Date().toISOString()
              }));
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setSyncStatus(prev => ({ 
                ...prev, 
                isExternalConnected: false, 
                externalError: `Status channel eksternal: ${status}` 
              }));
            }
          });
      } catch (err) {
        console.error('Failed to subscribe to external Supabase channel:', err);
      }
    }

    return () => {
      supabase.removeChannel(primaryChannel);
      if (externalChannel && extClient) {
        extClient.removeChannel(externalChannel);
      }
    };
  }, [fetchMessages, handleIncomingBroadcast, externalConfig.enabled, externalConfig.url, externalConfig.anonKey, externalConfig.syncTarget]);

  // Send Broadcast simultaneously to Primary and/or External Supabase Databases
  const sendBroadcast = async (data: {
    sender_name: string;
    message: string;
    category?: BroadcastCategory;
    device_info?: string;
  }) => {
    const tempId = crypto.randomUUID();
    const category: BroadcastCategory = data.category || 'info';
    const createdAt = new Date().toISOString();
    const currentConfig = getBroadcastExternalConfig();
    const extClient = getExternalSupabaseClient();

    const broadcastItem: BroadcastMessage & { sessionId: string } = {
      id: tempId,
      sender_name: data.sender_name.trim() || 'Perangkat Publik',
      message: data.message.trim(),
      category,
      device_info: data.device_info || 'Browser Web',
      created_at: createdAt,
      sessionId: SESSION_CLIENT_ID,
      origin: currentConfig.syncTarget === 'both' ? 'dual' : currentConfig.syncTarget === 'external' ? 'external' : 'primary'
    };

    // 1. Optimistic local update
    setMessages(prev => [broadcastItem, ...prev]);

    const shouldSendPrimary = currentConfig.syncTarget === 'both' || currentConfig.syncTarget === 'primary';
    const shouldSendExternal = (currentConfig.syncTarget === 'both' || currentConfig.syncTarget === 'external') && Boolean(extClient && currentConfig.enabled);

    const deliveryResults: { primary: boolean; external: boolean; error?: string } = {
      primary: false,
      external: false
    };

    // 2. Broadcast to Primary Database & WebSocket Room
    if (shouldSendPrimary) {
      try {
        const channel = supabase.channel('broadcast_intercom_room');
        channel.send({
          type: 'broadcast',
          event: 'new_broadcast',
          payload: broadcastItem
        }).catch(e => console.warn('Primary websocket send note:', e));

        const { error } = await supabase.from('broadcast_messages').insert([
          {
            id: tempId,
            sender_name: broadcastItem.sender_name,
            message: broadcastItem.message,
            category: broadcastItem.category,
            device_info: broadcastItem.device_info,
            created_at: createdAt
          }
        ]);

        if (!error) {
          deliveryResults.primary = true;
        } else {
          console.warn('Primary Supabase DB broadcast save error:', error.message);
        }
      } catch (err: any) {
        console.error('Failed to broadcast to primary DB:', err);
      }
    }

    // 3. Broadcast to External Database & WebSocket Room (Aplikasi Lain)
    if (shouldSendExternal && extClient) {
      try {
        const extChannel = extClient.channel('broadcast_intercom_room');
        extChannel.send({
          type: 'broadcast',
          event: 'new_broadcast',
          payload: broadcastItem
        }).catch(e => console.warn('External websocket send note:', e));

        const { error } = await extClient.from('broadcast_messages').insert([
          {
            id: tempId,
            sender_name: broadcastItem.sender_name,
            message: broadcastItem.message,
            category: broadcastItem.category,
            device_info: broadcastItem.device_info,
            created_at: createdAt
          }
        ]);

        if (!error) {
          deliveryResults.external = true;
          setSyncStatus(prev => ({ 
            ...prev, 
            isExternalConnected: true, 
            externalError: null,
            lastSyncedAt: new Date().toISOString()
          }));
        } else {
          console.warn('External Supabase DB broadcast save note:', error.message);
          deliveryResults.error = error.message;
        }
      } catch (err: any) {
        console.error('Failed to broadcast to external DB:', err);
        deliveryResults.error = err.message;
      }
    }

    return {
      ...broadcastItem,
      delivery: deliveryResults
    };
  };

  const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));

    // Delete from Primary DB
    try {
      await supabase.from('broadcast_messages').delete().eq('id', id);
    } catch (e) {
      console.error('Error deleting from primary DB:', e);
    }

    // Delete from External DB if active
    const extClient = getExternalSupabaseClient();
    if (extClient) {
      try {
        await extClient.from('broadcast_messages').delete().eq('id', id);
      } catch (e) {
        console.error('Error deleting from external DB:', e);
      }
    }
  };

  const clearAllMessages = async () => {
    setMessages([]);

    // Clear from Primary DB
    try {
      const { error } = await supabase
        .from('broadcast_messages')
        .delete()
        .not('id', 'is', null);

      if (error) {
        await supabase
          .from('broadcast_messages')
          .delete()
          .neq('sender_name', '___NON_EXISTENT___');
      }
    } catch (e) {
      console.error('Error clearing primary DB messages:', e);
    }

    // Clear from External DB
    const extClient = getExternalSupabaseClient();
    if (extClient) {
      try {
        const { error } = await extClient
          .from('broadcast_messages')
          .delete()
          .not('id', 'is', null);

        if (error) {
          await extClient
            .from('broadcast_messages')
            .delete()
            .neq('sender_name', '___NON_EXISTENT___');
        }
      } catch (e) {
        console.error('Error clearing external DB messages:', e);
      }
    }
  };

  const updateExternalConfig = (config: ExternalSupabaseConfig) => {
    saveBroadcastExternalConfig(config);
    setExternalConfig(config);
  };

  const testExternalConnection = async (url: string, anonKey: string) => {
    return await testExternalSupabaseConnection(url, anonKey);
  };

  const dismissIncomingBroadcast = () => {
    setIncomingBroadcast(null);
    stopTabAlert();
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  return {
    messages,
    loading,
    incomingBroadcast,
    soundEnabled,
    notificationPermission,
    isNotificationSupported: isNotificationSupported(),
    requestNotificationPermission: requestSysPermission,
    sendBroadcast,
    deleteMessage,
    clearAllMessages,
    dismissIncomingBroadcast,
    toggleSound,
    refetch: fetchMessages,
    externalConfig,
    updateExternalConfig,
    testExternalConnection,
    syncStatus,
    isExternalConfigured: Boolean(externalConfig.enabled && externalConfig.url && externalConfig.anonKey)
  };
}


