import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { LinkData, TodoData, AnnouncementData } from '../types';

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
  }, []);

  const addLink = async (link: Omit<LinkData, 'id'>) => {
    const tempId = crypto.randomUUID();
    const newLink = { ...link, id: tempId, created_at: new Date().toISOString() } as LinkData;
    setLinks(prev => [newLink, ...prev]);
    const { error } = await supabase.from('links').insert([link]);
    if (error) {
      alert(`Gagal menyimpan ke database Supabase: ${error.message}\n\nSolusi: Pastikan tabel "links" sudah dibuat dan matikan RLS (DISABLE ROW LEVEL SECURITY) atau tambahkan POLICY di Supabase SQL Editor.`);
      setLinks(prev => prev.filter(l => l.id !== tempId));
    } else {
      fetchLinks();
    }
  };

  const updateLink = async (id: string, link: Partial<Omit<LinkData, 'id'>>) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, ...link } : l));
    const { error } = await supabase.from('links').update(link).eq('id', id);
    if (error) {
      alert(`Gagal memperbarui aplikasi di Supabase: ${error.message}`);
      fetchLinks();
    } else {
      fetchLinks();
    }
  };

  const deleteLink = async (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    const { error } = await supabase.from('links').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus aplikasi dari Supabase: ${error.message}`);
      fetchLinks();
    }
  };

  return { links, loading, addLink, updateLink, deleteLink };
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase.from('todos').select('*').order('created_at', { ascending: false });
      if (!error && data) setTodos(data as TodoData[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = async (task: string) => {
    const tempId = crypto.randomUUID();
    const newTodo = { id: tempId, task, status: 'no', created_at: new Date().toISOString() } as TodoData;
    setTodos(prev => [newTodo, ...prev]);
    const { error } = await supabase.from('todos').insert([{ task, status: 'no' }]);
    if (error) {
      alert(`Gagal menyimpan tugas. Pesan: ${error.message}. Pastikan Anda menonaktifkan RLS (Row Level Security) di tabel "todos" pada Supabase agar public dapat menambah data.`);
      setTodos(prev => prev.filter(t => t.id !== tempId));
    } else {
      fetchTodos();
    }
  };

  const updateTodoStatus = async (id: string, status: TodoData['status']) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    const { error } = await supabase.from('todos').update({ status }).eq('id', id);
    if (error) {
      alert(`Gagal mengubah status. Pesan: ${error.message}. Pastikan Anda menonaktifkan RLS di tabel "todos".`);
    } else {
      fetchTodos();
    }
  };

  const updateTodo = async (id: string, updates: Partial<Omit<TodoData, 'id'>>) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const { error } = await supabase.from('todos').update(updates).eq('id', id);
    if (error) {
      alert(`Gagal memperbarui tugas. Pesan: ${error.message}. Pastikan Anda menonaktifkan RLS di tabel "todos".`);
    } else {
      fetchTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus tugas. Pesan: ${error.message}. Pastikan Anda menonaktifkan RLS di tabel "todos".`);
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

  return { todos, loading, addTodo, updateTodoStatus, updateTodo, deleteTodo, deleteCompletedTodos };
}

export function useAnnouncements() {
  const [messages, setMessages] = useState<string[]>([]);
  
  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase.from('settings').select('messages').eq('id', 'announcements').single();
      if (!error && data) setMessages(data.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const updateMessages = async (newMessages: string[]) => {
    setMessages(newMessages);
    await supabase.from('settings').upsert({ id: 'announcements', messages: newMessages });
    fetchAnnouncements();
  };

  return { messages, updateMessages };
}

export function useMenuOrder() {
  const [menuOrder, setMenuOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('menu_order');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

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
          localStorage.setItem('menu_order', JSON.stringify(remoteOrder));
        }
      }
    } catch (e) {
      console.error('Error fetching menu order from database:', e);
    }
  };

  useEffect(() => {
    fetchMenuOrder();
  }, []);

  const saveMenuOrder = async (newOrder: string[]) => {
    setMenuOrder(newOrder);
    try {
      localStorage.setItem('menu_order', JSON.stringify(newOrder));
    } catch (e) {
      console.error('Error saving menu_order to localStorage:', e);
    }

    try {
      // Try upserting with both 'order' and 'messages' for column compatibility
      const payload: any = { id: 'menu_order', order: newOrder, messages: newOrder };
      const { error } = await supabase.from('settings').upsert(payload);
      if (error) {
        // Fallback if 'order' column is not present on 'settings'
        await supabase.from('settings').upsert({ id: 'menu_order', messages: newOrder });
      }
    } catch (e) {
      console.error('Error saving menu_order to Supabase:', e);
    }
  };

  return { menuOrder, saveMenuOrder };
}

export function useAuth() {
  const [user, setUser] = useState<{email: string} | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleAuthChange = () => {
      const saved = localStorage.getItem('user');
      setUser(saved ? JSON.parse(saved) : null);
    };
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('userChange', handleAuthChange);
    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('userChange', handleAuthChange);
    };
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      // Hardcoded fallback for immediate access
      if (email === 'admin@admin.com' && password === 'Kino.2026') {
        const u = { email };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('userChange'));
        return;
      }

      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error("Kredensial Supabase (URL/KEY) belum diisi di Environment Variables.");
      }

      // Coba autentikasi menggunakan tabel users
      const { data, error } = await supabase
        .from('users')
        .select('email, password')
        .eq('email', email)
        .eq('password', password)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
           throw new Error('Email atau password salah (atau data tidak ditemukan).');
        }
        if (error.code === '42P01') {
           throw new Error('Tabel users belum ada. Jalankan supabase_schema.sql di SQL Editor.');
        }
        throw new Error(error.message);
      }

      if (data) {
        const u = { email: data.email };
        setUser(u);
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('userChange'));
        return;
      }
    } catch (e: any) {
      throw new Error(e.message || 'Login gagal terjadi kesalahan.');
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userChange'));
  };

  return { user, isAdmin: !!user, login, logout };
}
