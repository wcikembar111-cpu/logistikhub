import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getExternalSupabaseClient, getBroadcastExternalConfig } from '../supabase';
import { LinkData, TodoData, TodoPriority, AdminUser, parseTodoTask, formatTodoTask } from '../types';
import { playBroadcastSound } from '../utils/broadcastSound';
import { triggerSystemBroadcastNotification } from '../utils/systemNotification';

// Unique session ID to identify the local tab / browser instance
const SESSION_CLIENT_ID = typeof crypto !== 'undefined' && crypto.randomUUID 
  ? crypto.randomUUID() 
  : 'client-' + Math.random().toString(36).substring(2, 9);

export function useLinks() {
  const [links, setLinks] = useState<LinkData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = async () => {
    try {
      const { data, error } = await supabase.from('links').select('*').order('created_at', { ascending: false });
      if (!error && data) setLinks(data as LinkData[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    const uniqueChannelName = `links_realtime_${SESSION_CLIENT_ID}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        fetchLinks();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Error removing links channel:', e);
      }
    };
  }, []);

  const addLink = async (link: Omit<LinkData, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newLink = { ...link, id: tempId, created_at: new Date().toISOString() } as LinkData;
    setLinks(prev => [newLink, ...prev]);
    const { error } = await supabase.from('links').insert([link]);
    if (error) {
      alert(`Gagal menyimpan ke database: ${error.message}\n\nSolusi: Pastikan tabel "links" sudah dibuat di database.`);
      setLinks(prev => prev.filter(l => l.id !== tempId));
    } else {
      fetchLinks();
    }
  };

  const updateLink = async (id: string, link: Partial<Omit<LinkData, 'id'>>) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...link } : l));
    const { error } = await supabase.from('links').update(link).eq('id', id);
    if (error) {
      alert(`Gagal memperbarui aplikasi di database: ${error.message}`);
      fetchLinks();
    } else {
      fetchLinks();
    }
  };

  const deleteLink = async (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus aplikasi dari database: ${error.message}`);
      fetchLinks();
    }
  };

  return { links, loading, addLink, updateLink, deleteLink };
}

// Constant shared channel topic for all devices and apps
const SHARED_TODOS_CHANNEL = 'todos_realtime_broadcast_room';

// Helper to broadcast todo events to primary and external connected apps
async function broadcastTodoRealtime(payload: any) {
  try {
    const channel = supabase.channel(SHARED_TODOS_CHANNEL);
    await channel.send({
      type: 'broadcast',
      event: 'todo_broadcast',
      payload
    });
  } catch (e) {
    console.warn('Primary todos realtime broadcast note:', e);
  }

  try {
    const extClient = getExternalSupabaseClient();
    const currentConfig = getBroadcastExternalConfig();
    if (extClient && currentConfig.enabled && currentConfig.syncTarget !== 'primary') {
      const extChannel = extClient.channel(SHARED_TODOS_CHANNEL);
      await extChannel.send({
        type: 'broadcast',
        event: 'todo_broadcast',
        payload
      });
    }
  } catch (e) {
    console.warn('External todos realtime broadcast note:', e);
  }
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingNewTodo, setIncomingNewTodo] = useState<(TodoData & { created_at?: string; sender_name?: string; sessionId?: string; action?: 'created' | 'updated' | 'status_changed' | 'deleted' }) | null>(null);

  const lastAlertedActionRef = useRef<{ id: string; action: string; timestamp: number } | null>(null);

  const dismissIncomingTodo = useCallback(() => {
    setIncomingNewTodo(null);
  }, []);

  const triggerTodoPopupAlert = useCallback((item: TodoData & { created_at?: string; sender_name?: string; sessionId?: string; action?: 'created' | 'updated' | 'status_changed' | 'deleted' }, isOwnSession = false) => {
    // Avoid double-firing identical alert in a tight 2s window
    const now = Date.now();
    const action = item.action || 'created';
    if (
      lastAlertedActionRef.current &&
      lastAlertedActionRef.current.id === item.id &&
      lastAlertedActionRef.current.action === action &&
      now - lastAlertedActionRef.current.timestamp < 2000
    ) {
      return;
    }
    lastAlertedActionRef.current = { id: item.id || '', action, timestamp: now };

    setIncomingNewTodo(item);
    
    // Play alert chime
    const isUrgent = item.priority === 'mendesak' || item.is_blinking;
    const isHigh = item.priority === 'tinggi';
    const soundCategory = isUrgent ? 'urgent' : isHigh ? 'warning' : 'announcement';
    playBroadcastSound(soundCategory);

    // Trigger system notification for other devices or background tabs
    if (!isOwnSession) {
      const statusLabel = item.status === 'close' ? 'DONE / SELESAI' : item.status === 'onproses' ? 'ON PROSES' : 'TODO';
      const notifMsg = 
        action === 'status_changed'
          ? `Status Tugas Diperbarui: "${item.task}" → ${statusLabel}`
          : action === 'updated'
          ? `Tugas Diperbarui: "${item.task}"`
          : `Tugas Baru: "${item.task}"`;

      triggerSystemBroadcastNotification({
        id: item.id || Date.now().toString(),
        sender_name: item.sender_name || `Public Todo (${(item.priority || 'BIASA').toUpperCase()})`,
        message: notifMsg,
        category: isUrgent ? 'urgent' : isHigh ? 'warning' : 'announcement',
        created_at: item.created_at || new Date().toISOString()
      }, () => {
        setIncomingNewTodo(item);
      });
    }
  }, []);

  const fetchTodos = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('todos').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const parsedTodos = data.map((t: any) => {
          const parsed = parseTodoTask(t.task, t.priority, t.is_blinking);
          return {
            ...t,
            task: parsed.cleanTask,
            priority: parsed.priority,
            is_blinking: parsed.isBlinking
          };
        });
        setTodos(parsedTodos as TodoData[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();

    // 1. Primary Supabase Channel Subscriptions for Todos
    const channel = (supabase.channel(SHARED_TODOS_CHANNEL, {
      config: { broadcast: { self: false } }
    }) as any)
      .on('broadcast', { event: 'todo_broadcast' }, (payload: any) => {
        const item = payload.payload;
        if (!item) return;

        // Trigger popup across all other devices/tabs
        if (item.sessionId !== SESSION_CLIENT_ID) {
          triggerTodoPopupAlert(item, false);
          fetchTodos();
        }
      })
      .on('broadcast', { event: 'new_todo_broadcast' }, (payload: any) => {
        const item = payload.payload;
        if (!item) return;

        if (item.sessionId !== SESSION_CLIENT_ID) {
          triggerTodoPopupAlert(item, false);
          fetchTodos();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'todos' }, (payload: any) => {
        const newRow = payload.new;
        if (newRow) {
          const parsed = parseTodoTask(newRow.task, newRow.priority, newRow.is_blinking);
          const item = {
            id: newRow.id,
            task: parsed.cleanTask,
            priority: parsed.priority,
            is_blinking: parsed.isBlinking,
            status: newRow.status,
            created_at: newRow.created_at || new Date().toISOString(),
            sender_name: 'Pengguna Public Todo',
            action: 'created' as const
          };
          triggerTodoPopupAlert(item, false);
        }
        fetchTodos();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'todos' }, (payload: any) => {
        const updatedRow = payload.new;
        if (updatedRow) {
          const parsed = parseTodoTask(updatedRow.task, updatedRow.priority, updatedRow.is_blinking);
          const item = {
            id: updatedRow.id,
            task: parsed.cleanTask,
            priority: parsed.priority,
            is_blinking: parsed.isBlinking,
            status: updatedRow.status,
            created_at: updatedRow.created_at || new Date().toISOString(),
            sender_name: 'Pengguna Public Todo',
            action: 'status_changed' as const
          };
          triggerTodoPopupAlert(item, false);
        }
        fetchTodos();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'todos' }, () => {
        fetchTodos();
      })
      .subscribe();

    // 2. External Supabase Channel Subscription (if configured for cross-app sync)
    let extChannel: any = null;
    const extClient = getExternalSupabaseClient();
    const currentExtConfig = getBroadcastExternalConfig();
    if (extClient && currentExtConfig.enabled && currentExtConfig.syncTarget !== 'primary') {
      try {
        extChannel = (extClient.channel(SHARED_TODOS_CHANNEL, {
          config: { broadcast: { self: false } }
        }) as any)
          .on('broadcast', { event: 'todo_broadcast' }, (payload: any) => {
            const item = payload.payload;
            if (!item) return;
            if (item.sessionId !== SESSION_CLIENT_ID) {
              triggerTodoPopupAlert(item, false);
              fetchTodos();
            }
          })
          .subscribe();
      } catch (e) {
        console.warn('External todo channel setup note:', e);
      }
    }

    // Periodic sync & visibility catch-up
    const interval = setInterval(fetchTodos, 10000);
    const handleFocus = () => fetchTodos();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        console.warn('Error removing primary todos channel:', e);
      }
      if (extChannel && extClient) {
        try {
          extClient.removeChannel(extChannel);
        } catch (e) {
          console.warn('Error removing external todos channel:', e);
        }
      }
    };
  }, [fetchTodos, triggerTodoPopupAlert]);

  const addTodo = async (task: string, priority: TodoPriority = 'rendah', isBlinking: boolean = false, senderName?: string) => {
    const formattedTask = formatTodoTask(task, priority, isBlinking);
    const tempId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const newTodoPayload = { 
      id: tempId, 
      task, 
      status: 'no' as const, 
      priority, 
      is_blinking: isBlinking, 
      created_at: createdAt,
      sender_name: senderName || 'Public Todo',
      sessionId: SESSION_CLIENT_ID,
      action: 'created' as const
    };
    
    // 1. Optimistic local update
    setTodos(prev => [newTodoPayload, ...prev]);

    // 2. Broadcast immediately over WebSockets channel to all connected devices in realtime
    await broadcastTodoRealtime(newTodoPayload);

    // 3. Save to Supabase DB
    const { error } = await supabase.from('todos').insert([{ task: formattedTask, status: 'no' }]);
    if (error) {
      alert(`Gagal menyimpan tugas. Pesan: ${error.message}.`);
      setTodos(prev => prev.filter(t => t.id !== tempId));
    } else {
      fetchTodos();
    }
  };

  const updateTodoStatus = async (id: string, status: TodoData['status']) => {
    const existing = todos.find(t => t.id === id);
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status } : t));

    const formattedTask = existing ? formatTodoTask(existing.task, existing.priority || 'rendah', !!existing.is_blinking) : undefined;
    const updatePayload: any = { status };
    if (formattedTask) {
      updatePayload.task = formattedTask;
    }

    // Broadcast status change immediately to all users & all devices
    const updateEventPayload = {
      id,
      task: existing ? existing.task : 'Tugas',
      priority: existing ? existing.priority : 'rendah',
      is_blinking: existing ? existing.is_blinking : false,
      status,
      previousStatus: existing ? existing.status : undefined,
      created_at: new Date().toISOString(),
      sender_name: 'Pengguna Public Todo',
      sessionId: SESSION_CLIENT_ID,
      action: 'status_changed' as const
    };
    await broadcastTodoRealtime(updateEventPayload);

    const { error } = await supabase.from('todos').update(updatePayload).eq('id', id);
    if (error) {
      alert(`Gagal mengubah status. Pesan: ${error.message}.`);
      fetchTodos();
    } else {
      fetchTodos();
    }
  };

  const updateTodo = async (id: string, updates: Partial<Omit<TodoData, 'id'>>) => {
    const existing = todos.find(t => t.id === id);
    if (!existing) return;

    const newCleanTask = updates.task !== undefined ? updates.task : existing.task;
    const newPriority = updates.priority !== undefined ? updates.priority : (existing.priority || 'rendah');
    const newBlinking = updates.is_blinking !== undefined ? updates.is_blinking : !!existing.is_blinking;
    const newStatus = updates.status !== undefined ? updates.status : existing.status;

    const formattedTask = formatTodoTask(newCleanTask, newPriority, newBlinking);

    setTodos(prev => prev.map(t => t.id === id ? { 
      ...t, 
      task: newCleanTask, 
      priority: newPriority, 
      is_blinking: newBlinking, 
      status: newStatus 
    } : t));

    // Broadcast edit immediately to all users & all devices
    const editEventPayload = {
      id,
      task: newCleanTask,
      priority: newPriority,
      is_blinking: newBlinking,
      status: newStatus,
      created_at: new Date().toISOString(),
      sender_name: 'Pengguna Public Todo',
      sessionId: SESSION_CLIENT_ID,
      action: (updates.status !== undefined && updates.status !== existing.status) ? ('status_changed' as const) : ('updated' as const)
    };
    await broadcastTodoRealtime(editEventPayload);

    const { error } = await supabase.from('todos').update({
      task: formattedTask,
      status: newStatus
    }).eq('id', id);

    if (error) {
      alert(`Gagal memperbarui tugas. Pesan: ${error.message}.`);
      fetchTodos();
    } else {
      fetchTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    const existing = todos.find(t => t.id === id);
    setTodos(prev => prev.filter(t => t.id !== id));

    // Broadcast deletion
    await broadcastTodoRealtime({
      id,
      task: existing ? existing.task : '',
      action: 'deleted' as const,
      sessionId: SESSION_CLIENT_ID
    });

    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus tugas. Pesan: ${error.message}.`);
      fetchTodos();
    }
  };

  const deleteCompletedTodos = async () => {
    const doneCount = todos.filter(t => t.status === 'close').length;
    if (doneCount === 0) return;

    setTodos(prev => prev.filter(t => t.status !== 'close'));
    const { error } = await supabase.from('todos').delete().eq('status', 'close');
    if (error) {
      console.error(`Gagal menghapus tugas selesai: ${error.message}`);
      fetchTodos();
    }
  };

  return { 
    todos, 
    loading, 
    addTodo, 
    updateTodoStatus, 
    updateTodo, 
    deleteTodo, 
    deleteCompletedTodos,
    incomingNewTodo,
    dismissIncomingTodo
  };
}

export function useMenuOrder() {
  const [menuOrder, setMenuOrder] = useState<string[]>([]);

  const fetchMenuOrder = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 'menu_order').single();
      if (!error && data) {
        let remoteOrder: string[] | null = null;
        if (Array.isArray(data.order)) {
          remoteOrder = data.order;
        } else if (Array.isArray(data.messages)) {
          remoteOrder = data.messages;
        } else if (typeof data.messages === 'string') {
          try {
            remoteOrder = JSON.parse(data.messages);
          } catch {}
        }

        if (remoteOrder && remoteOrder.length > 0) {
          setMenuOrder(remoteOrder);
        }
      }
    } catch (e) {
      console.error('Error fetching menu order from database:', e);
    }
  };

  useEffect(() => {
    fetchMenuOrder();
    const channel = supabase
      .channel('menu_order_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => {
        fetchMenuOrder();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveMenuOrder = async (newOrder: string[]) => {
    setMenuOrder(newOrder);
    try {
      const payload: any = { id: 'menu_order', order: newOrder, messages: newOrder };
      const { error } = await supabase.from('settings').upsert(payload);
      if (error) {
        await supabase.from('settings').upsert({ id: 'menu_order', messages: newOrder });
      }
    } catch (e) {
      console.error('Error saving menu_order to Supabase:', e);
    }
  };

  return { menuOrder, saveMenuOrder };
}

export { useAuthContext as useAuth } from '../context/AuthContext';
export { useBroadcast } from './useBroadcast';

