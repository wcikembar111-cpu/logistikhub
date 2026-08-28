import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
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
    const channel = supabase
      .channel('links_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, () => {
        fetchLinks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

export function useTodos() {
  const [todos, setTodos] = useState<TodoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomingNewTodo, setIncomingNewTodo] = useState<(TodoData & { created_at?: string; sender_name?: string; sessionId?: string }) | null>(null);

  const dismissIncomingTodo = useCallback(() => {
    setIncomingNewTodo(null);
  }, []);

  const triggerTodoPopupAlert = useCallback((item: TodoData & { created_at?: string; sender_name?: string; sessionId?: string }, isOwnSession = false) => {
    setIncomingNewTodo(item);
    
    // Play alert chime
    const isUrgent = item.priority === 'mendesak' || item.is_blinking;
    const isHigh = item.priority === 'tinggi';
    const soundCategory = isUrgent ? 'urgent' : isHigh ? 'warning' : 'announcement';
    playBroadcastSound(soundCategory);

    // Trigger system notification for other devices or background tabs
    if (!isOwnSession) {
      triggerSystemBroadcastNotification({
        id: item.id || Date.now().toString(),
        sender_name: item.sender_name || `Public Todo (${(item.priority || 'BIASA').toUpperCase()})`,
        message: `Tugas Baru: "${item.task}"`,
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

    // Listen to real-time WebSockets broadcast channel and DB postgres_changes
    const channel = (supabase.channel('todos_realtime_broadcast_room') as any)
      .on('broadcast', { event: 'new_todo_broadcast' }, (payload: any) => {
        const item = payload.payload;
        if (!item) return;

        // Trigger popup across all other devices/tabs
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
            sender_name: 'Pengguna Public Todo'
          };

          // If incoming popup not yet displayed
          setIncomingNewTodo(prev => {
            if (prev && prev.id === item.id) return prev;
            // Only trigger sound/popup if from different action
            return prev;
          });
        }
        fetchTodos();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'todos' }, () => {
        fetchTodos();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'todos' }, () => {
        fetchTodos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
      sessionId: SESSION_CLIENT_ID
    };
    
    // 1. Optimistic local update
    setTodos(prev => [newTodoPayload, ...prev]);

    // 2. Broadcast immediately over WebSockets channel to all connected devices in realtime
    try {
      const channel = supabase.channel('todos_realtime_broadcast_room');
      await channel.send({
        type: 'broadcast',
        event: 'new_todo_broadcast',
        payload: newTodoPayload
      });
    } catch (err) {
      console.warn('Realtime todo broadcast channel note:', err);
    }

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
    setTodos(prev => prev.filter(t => t.id !== id));
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

export function useAuth() {
  const [user, setUser] = useState<{ email?: string; username?: string; nama?: string; nama_lengkap?: string; role?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('user') || localStorage.getItem('ckb_app_authenticated_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const saved = localStorage.getItem('user') || localStorage.getItem('ckb_app_authenticated_user');
        setUser(saved ? JSON.parse(saved) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('userChange', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('userChange', handleAuthChange);
    };
  }, []);

  const login = async (identifier: string, pinOrPassword: string): Promise<void> => {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanSecret = pinOrPassword.trim();

    try {
      // 1. Direct Supabase Query: admin_users or users table
      if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        try {
          const { data: dbAdminUser, error: adminErr } = await supabase
            .from('admin_users')
            .select('*')
            .ilike('username', cleanIdentifier)
            .eq('is_active', true)
            .single();

          if (!adminErr && dbAdminUser && dbAdminUser.pin === cleanSecret) {
            const u = {
              username: dbAdminUser.username,
              nama: dbAdminUser.nama_lengkap || dbAdminUser.username,
              nama_lengkap: dbAdminUser.nama_lengkap || dbAdminUser.username,
              role: dbAdminUser.role || 'admin',
              email: dbAdminUser.email || `${dbAdminUser.username}@kino.co.id`
            };
            setUser(u);
            localStorage.setItem('user', JSON.stringify(u));
            localStorage.setItem('ckb_app_authenticated_user', JSON.stringify(u));
            window.dispatchEvent(new Event('userChange'));
            return;
          }

          const { data: dbUser, error: dbErr } = await supabase
            .from('users')
            .select('*')
            .or(`email.ilike.${cleanIdentifier},username.ilike.${cleanIdentifier}`)
            .single();

          if (!dbErr && dbUser) {
            if (dbUser.password === cleanSecret || dbUser.pin === cleanSecret) {
              const u = {
                username: dbUser.username || cleanIdentifier,
                email: dbUser.email || (cleanIdentifier.includes('@') ? cleanIdentifier : `${cleanIdentifier}@kino.co.id`),
                nama: dbUser.nama || dbUser.name || dbUser.username || 'User',
                nama_lengkap: dbUser.nama || dbUser.name || dbUser.username || 'User',
                role: dbUser.role || 'operator'
              };
              setUser(u);
              localStorage.setItem('user', JSON.stringify(u));
              localStorage.setItem('ckb_app_authenticated_user', JSON.stringify(u));
              window.dispatchEvent(new Event('userChange'));
              return;
            }
          }
        } catch (dbEx) {
          console.warn('Query users table note:', dbEx);
        }
      }

      // 2. Built-in Admin Presets & Fallbacks (superadmin, admin, dede with Kino.2026 or 089739)
      const isSuperAdminUser = 
        (cleanIdentifier === 'superadmin' || cleanIdentifier === 'superadmin@kino.co.id') &&
        (cleanSecret === '089739' || cleanSecret === 'Kino.2026' || cleanSecret === 'admin');

      const isDefaultAdmin = 
        (cleanIdentifier === 'admin@admin.com' || cleanIdentifier === 'admin') && 
        (cleanSecret === 'Kino.2026' || cleanSecret === '089739' || cleanSecret === 'admin');

      const isDede = 
        (cleanIdentifier === 'dede.suparman@kino.co.id' || cleanIdentifier === 'dede') && 
        (cleanSecret === '089739' || cleanSecret === 'Kino.2026');

      if (isSuperAdminUser || isDefaultAdmin || isDede) {
        const role = isSuperAdminUser ? 'superadmin' : 'admin';
        const u = {
          username: isSuperAdminUser ? 'superadmin' : isDede ? 'dede' : 'admin',
          email: isSuperAdminUser ? 'superadmin@kino.co.id' : isDede ? 'dede.suparman@kino.co.id' : 'admin@admin.com',
          nama: isSuperAdminUser ? 'Super Administrator' : isDede ? 'Dede Suparman' : 'Administrator Logistics',
          nama_lengkap: isSuperAdminUser ? 'Super Administrator' : isDede ? 'Dede Suparman (Supervisor)' : 'Administrator Logistics',
          role
        };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        localStorage.setItem('ckb_app_authenticated_user', JSON.stringify(u));
        window.dispatchEvent(new Event('userChange'));
        return;
      }

      throw new Error(`Email/Username "${cleanIdentifier}" atau Password tidak sesuai. Terhubung ke database "users".`);
    } catch (e: any) {
      throw new Error(e.message || 'Login gagal terjadi kesalahan.');
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('ckb_app_authenticated_user');
    localStorage.removeItem('ckb_app_pin_session_token');
    window.dispatchEvent(new Event('userChange'));
  };

  const rawRole = (user?.role || '').toLowerCase();
  const isSuperAdmin = rawRole === 'superadmin' || user?.username?.toLowerCase() === 'superadmin';
  const isAdmin = isSuperAdmin || rawRole === 'admin' || (!rawRole && user?.username?.toLowerCase() === 'admin');
  const isOperator = rawRole === 'operator';
  const isFullAccess = isSuperAdmin || isAdmin;
  const displayName = user?.nama_lengkap || user?.nama || user?.username || 'Pengguna';

  return { 
    user, 
    role: rawRole || (isSuperAdmin ? 'superadmin' : isAdmin ? 'admin' : 'operator'),
    isAdmin, 
    isSuperAdmin, 
    isOperator,
    isFullAccess, 
    displayName,
    login, 
    logout 
  };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try fetching from server API
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.users)) {
          setUsers(json.users);
          setLoading(false);
          return;
        }
      }

      // 2. Direct Supabase fallback
      const { data, error: dbErr } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!dbErr && data && data.length > 0) {
        setUsers(data as AdminUser[]);
      } else {
        // Fallback default admin accounts
        setUsers([
          {
            id: 'admin-0',
            username: 'superadmin',
            nama_lengkap: 'Super Administrator (Full Akses)',
            email: 'superadmin@kino.co.id',
            role: 'superadmin',
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'admin-1',
            username: 'admin',
            nama_lengkap: 'Administrator Logistics',
            email: 'admin@admin.com',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'admin-2',
            username: 'dede',
            nama_lengkap: 'Dede Suparman (Supervisor)',
            email: 'dede.suparman@kino.co.id',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (err: any) {
      console.warn('Failed to fetch admin users:', err);
      setError(err.message || 'Gagal memuat daftar admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    // Listen to real-time changes on admin_users table
    try {
      const channel = supabase
        .channel('admin_users_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_users' }, () => {
          fetchUsers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {}
  }, [fetchUsers]);

  const addUser = async (newUser: { username: string; pin: string; nama_lengkap?: string; email?: string; role?: string; is_active?: boolean }) => {
    try {
      // 1. Try server API
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menambahkan user admin');
      }

      await fetchUsers();
      return data.user;
    } catch (err: any) {
      // Direct Supabase fallback
      const cleanUser = {
        username: newUser.username.trim().toLowerCase(),
        pin: newUser.pin.trim(),
        nama_lengkap: (newUser.nama_lengkap || 'Administrator').trim(),
        email: (newUser.email || `${newUser.username}@kino.co.id`).trim(),
        role: newUser.role || 'admin',
        is_active: newUser.is_active !== false,
        updated_at: new Date().toISOString()
      };

      const { data: inserted, error: dbError } = await supabase
        .from('admin_users')
        .insert([cleanUser])
        .select()
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      await fetchUsers();
      return inserted;
    }
  };

  const updateUser = async (id: string, updatedFields: Partial<AdminUser>) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal memperbarui data admin');
      }

      await fetchUsers();
      return data.user;
    } catch (err: any) {
      let query = supabase.from('admin_users').update({
        ...updatedFields,
        updated_at: new Date().toISOString()
      });

      if (id.includes('-') && id.length > 20) {
        query = query.eq('id', id);
      } else {
        query = query.ilike('username', id);
      }

      const { data: updated, error: dbError } = await query.select().single();
      if (dbError) throw new Error(dbError.message);

      await fetchUsers();
      return updated;
    }
  };

  const deleteUser = async (id: string) => {
    if (id === 'admin' || id === 'default-admin-1') {
      throw new Error("Akun Admin utama ('admin') tidak dapat dihapus.");
    }

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus user admin');
      }

      await fetchUsers();
      return true;
    } catch (err: any) {
      let query = supabase.from('admin_users').delete();
      if (id.includes('-') && id.length > 20) {
        query = query.eq('id', id);
      } else {
        query = query.ilike('username', id);
      }

      const { error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);

      await fetchUsers();
      return true;
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    return updateUser(id, { is_active: !currentStatus });
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    addUser,
    updateUser,
    deleteUser,
    toggleUserStatus
  };
}

export { useBroadcast } from './useBroadcast';

