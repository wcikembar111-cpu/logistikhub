import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ExternalSupabaseConfig } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Storage keys for External Broadcast Supabase connection
const STORAGE_KEY_URL = 'broadcast_ext_supabase_url';
const STORAGE_KEY_KEY = 'broadcast_ext_supabase_anon_key';
const STORAGE_KEY_TARGET = 'broadcast_ext_sync_target';
const STORAGE_KEY_ENABLED = 'broadcast_ext_enabled';

// Cached external client instance
let cachedExternalClient: SupabaseClient | null = null;
let cachedClientUrl = '';
let cachedClientKey = '';

export function getBroadcastExternalConfig(): ExternalSupabaseConfig {
  const envUrl = import.meta.env.VITE_BROADCAST_SUPABASE_URL || import.meta.env.VITE_EXTERNAL_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_BROADCAST_SUPABASE_ANON_KEY || import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem(STORAGE_KEY_URL);
  const storedKey = localStorage.getItem(STORAGE_KEY_KEY);
  const storedTarget = localStorage.getItem(STORAGE_KEY_TARGET) as ExternalSupabaseConfig['syncTarget'] | null;
  const storedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED);

  const url = storedUrl !== null ? storedUrl : envUrl;
  const anonKey = storedKey !== null ? storedKey : envKey;
  const syncTarget = storedTarget || 'both';
  const enabled = storedEnabled !== null ? storedEnabled === 'true' : Boolean(url && anonKey);

  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    syncTarget,
    enabled
  };
}

export function saveBroadcastExternalConfig(config: ExternalSupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY_URL, config.url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, config.anonKey.trim());
  localStorage.setItem(STORAGE_KEY_TARGET, config.syncTarget);
  localStorage.setItem(STORAGE_KEY_ENABLED, String(config.enabled));

  // Reset cached client if credentials changed
  if (cachedClientUrl !== config.url.trim() || cachedClientKey !== config.anonKey.trim()) {
    cachedExternalClient = null;
  }

  // Dispatch custom event for reactive hook synchronization
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('broadcast-external-config-changed', { detail: config }));
  }
}

export function getExternalSupabaseClient(): SupabaseClient | null {
  const config = getBroadcastExternalConfig();
  if (!config.enabled || !config.url || !config.anonKey) {
    return null;
  }

  // Validate basic URL format
  if (!config.url.startsWith('http://') && !config.url.startsWith('https://')) {
    return null;
  }

  if (cachedExternalClient && cachedClientUrl === config.url && cachedClientKey === config.anonKey) {
    return cachedExternalClient;
  }

  try {
    cachedExternalClient = createClient(config.url, config.anonKey);
    cachedClientUrl = config.url;
    cachedClientKey = config.anonKey;
    return cachedExternalClient;
  } catch (err) {
    console.error('Failed to create external Supabase client:', err);
    return null;
  }
}

export async function testExternalSupabaseConnection(url: string, anonKey: string): Promise<{
  success: boolean;
  message: string;
  tableReady?: boolean;
}> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL Supabase dan Anon Key tidak boleh kosong.' };
  }

  try {
    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return { success: false, message: 'URL Supabase harus diawali dengan https://' };
    }

    const testClient = createClient(trimmedUrl, trimmedKey);

    // Test querying the broadcast_messages table
    const { data, error } = await testClient
      .from('broadcast_messages')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.broadcast_messages" does not exist')) {
        return {
          success: true,
          tableReady: false,
          message: 'Koneksi ke Supabase berhasil! Namun tabel "broadcast_messages" belum dibuat di database tersebut.'
        };
      }
      return {
        success: false,
        message: `Koneksi gagal: ${error.message} (Kode: ${error.code || 'UNKNOWN'})`
      };
    }

    return {
      success: true,
      tableReady: true,
      message: 'Koneksi berhasil! Database & tabel broadcast_messages terhubung sempurna.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungkan: ${err.message || 'Format URL/Key salah atau jaringan terputus.'}`
    };
  }
}

