import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { BroadcastMessage, BroadcastCategory } from '../types';
import { playBroadcastSound } from '../utils/broadcastSound';

// Unique session ID to identify current browser tab
const SESSION_CLIENT_ID = typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : 'client-' + Math.random().toString(36).substring(2, 9);

export function useBroadcast() {
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [incomingBroadcast, setIncomingBroadcast] = useState<BroadcastMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('broadcast_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('broadcast_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('broadcast_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40);

      if (!error && data) {
        setMessages(data as BroadcastMessage[]);
      }
    } catch (e) {
      console.error('Error fetching broadcast messages:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to both Supabase Broadcast Channel (instant P2P) & Postgres Realtime DB changes
  useEffect(() => {
    fetchMessages();

    // 1. Supabase WebSockets Realtime Channel
    const broadcastChannel = (supabase.channel('broadcast_intercom_room') as any)
      .on('broadcast', { event: 'new_broadcast' }, (payload: any) => {
        const item = payload.payload;
        if (!item) return;

        // Add to state if not exists
        setMessages(prev => {
          if (prev.some(m => m.id === item.id)) return prev;
          return [item, ...prev];
        });

        // Trigger popup if sent by another device / session
        if (item.sessionId !== SESSION_CLIENT_ID) {
          setIncomingBroadcast(item);
          if (soundEnabledRef.current) {
            playBroadcastSound(item.category || 'info');
          }
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_messages' }, (payload: any) => {
        const newItem = payload.new as BroadcastMessage;
        if (!newItem) return;

        setMessages(prev => {
          if (prev.some(m => m.id === newItem.id)) return prev;
          return [newItem, ...prev];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'broadcast_messages' }, (payload: any) => {
        if (payload.old && payload.old.id) {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        } else {
          fetchMessages();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [fetchMessages]);

  const sendBroadcast = async (data: {
    sender_name: string;
    message: string;
    category?: BroadcastCategory;
    device_info?: string;
  }) => {
    const tempId = crypto.randomUUID();
    const category: BroadcastCategory = data.category || 'info';
    const createdAt = new Date().toISOString();

    const broadcastItem: BroadcastMessage & { sessionId: string } = {
      id: tempId,
      sender_name: data.sender_name.trim() || 'Perangkat Publik',
      message: data.message.trim(),
      category,
      device_info: data.device_info || 'Browser Web',
      created_at: createdAt,
      sessionId: SESSION_CLIENT_ID
    };

    // 1. Optimistic local update
    setMessages(prev => [broadcastItem, ...prev]);

    // 2. Broadcast immediately over websocket channel for zero-lag peer reception
    try {
      const channel = supabase.channel('broadcast_intercom_room');
      await channel.send({
        type: 'broadcast',
        event: 'new_broadcast',
        payload: broadcastItem
      });
    } catch (err) {
      console.warn('Broadcast channel delivery note:', err);
    }

    // 3. Persist to Supabase Database
    try {
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

      if (error) {
        console.error('Supabase DB broadcast save error:', error.message);
      }
    } catch (e) {
      console.error('Failed to save broadcast to database:', e);
    }

    return broadcastItem;
  };

  const deleteMessage = async (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    try {
      const { error } = await supabase.from('broadcast_messages').delete().eq('id', id);
      if (error) {
        console.error('Error deleting broadcast message from database:', error.message);
      }
    } catch (e) {
      console.error('Error deleting broadcast message:', e);
    }
  };

  const clearAllMessages = async () => {
    setMessages([]);
    try {
      // Delete all records from broadcast_messages in Supabase
      const { error } = await supabase
        .from('broadcast_messages')
        .delete()
        .not('id', 'is', null);

      if (error) {
        console.warn('First delete attempt result:', error.message);
        // Fallback filter
        await supabase
          .from('broadcast_messages')
          .delete()
          .neq('sender_name', '___NON_EXISTENT_SENDER_NAME___');
      }
    } catch (e) {
      console.error('Error clearing all broadcast messages from database:', e);
    }
  };

  const dismissIncomingBroadcast = () => {
    setIncomingBroadcast(null);
  };

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
  };

  return {
    messages,
    loading,
    incomingBroadcast,
    soundEnabled,
    sendBroadcast,
    deleteMessage,
    clearAllMessages,
    dismissIncomingBroadcast,
    toggleSound,
    refetch: fetchMessages
  };
}
