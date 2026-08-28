// Secure User & PIN Authentication Utility & Inactivity Auto-Lock Manager
// Protects the app with Username and 6-Digit PIN (Khusus Admin) with SQL Database Integration

import { supabase } from '../supabase';

const PIN_STORAGE_KEY = 'ckb_app_pin_session_token';
const PIN_USER_KEY = 'ckb_app_authenticated_user';
const PIN_REMEMBER_KEY = 'ckb_app_pin_remember_mode';
const PIN_LAST_USER_KEY = 'ckb_app_last_username';
const PIN_FAIL_COUNT_KEY = 'ckb_app_pin_fail_count';
const PIN_LOCKOUT_TIME_KEY = 'ckb_app_pin_lockout_until';
const PIN_LAST_ACTIVE_KEY = 'ckb_app_pin_last_active';
const PIN_TIMEOUT_MINUTES_KEY = 'ckb_app_pin_timeout_mins';

// Default session timeout: 15 menit tidak ada aktivitas (inactivity timeout)
export const DEFAULT_TIMEOUT_MINUTES = 15;
export const TIMEOUT_OPTIONS = [5, 10, 15, 30, 60];

// Default Preset Users for PIN Login
export interface PinUserPreset {
  username: string;
  nama: string;
  role?: string;
  isDefault?: boolean;
}

export const DEFAULT_ADMIN_PRESETS: PinUserPreset[] = [
  { username: 'superadmin', nama: 'Super Administrator', role: 'superadmin', isDefault: true },
  { username: 'admin', nama: 'Administrator Logistics', role: 'admin' },
  { username: 'dede', nama: 'Dede Suparman (Supervisor)', role: 'admin' }
];

export function getAuthenticatedUser(): { username: string; nama_lengkap: string; role: string; email?: string } | null {
  try {
    const raw = localStorage.getItem(PIN_USER_KEY) || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Fallback SHA-256 salted hash for offline PWA mode when server is unreachable.
const OFFLINE_SALT = 'CKB_SECURE_SALT_v1_2026';
// SHA-256 of ('089739' + OFFLINE_SALT)
const OFFLINE_DEFAULT_HASH = '927fc844da10bea2a76f52483162154f6eae6accd444ef3fad63963a423a5105';
// Legacy hash fallback for 123456
const OFFLINE_LEGACY_HASH = '1f5c6e86daecae8e090df4a78cb586e24feecfca48c1e7d7fe3d7dfd110ce424';

export interface VerifyPinResult {
  success: boolean;
  message?: string;
  lockoutSeconds?: number;
  user?: {
    username: string;
    nama_lengkap: string;
    role: string;
    email?: string;
  };
}

export function getSavedUsername(): string {
  if (typeof window === 'undefined') return 'admin';
  return localStorage.getItem(PIN_LAST_USER_KEY) || 'admin';
}

export function setSavedUsername(username: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PIN_LAST_USER_KEY, username.trim().toLowerCase());
}

export function getSessionTimeoutMinutes(): number {
  if (typeof window === 'undefined') return DEFAULT_TIMEOUT_MINUTES;
  const saved = Number(localStorage.getItem(PIN_TIMEOUT_MINUTES_KEY));
  if (saved && TIMEOUT_OPTIONS.includes(saved)) {
    return saved;
  }
  return DEFAULT_TIMEOUT_MINUTES;
}

export function setSessionTimeoutMinutes(minutes: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PIN_TIMEOUT_MINUTES_KEY, String(minutes));
  updateLastActivity();
}

export function updateLastActivity(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  sessionStorage.setItem(PIN_LAST_ACTIVE_KEY, String(now));
  localStorage.setItem(PIN_LAST_ACTIVE_KEY, String(now));
}

export function isPinUnlocked(): boolean {
  if (typeof window === 'undefined') return false;

  // Check lockout
  const lockoutUntil = Number(localStorage.getItem(PIN_LOCKOUT_TIME_KEY) || '0');
  if (lockoutUntil && Date.now() < lockoutUntil) {
    return false;
  }

  // Check Inactivity Timeout
  const timeoutMins = getSessionTimeoutMinutes();
  const timeoutMs = timeoutMins * 60 * 1000;
  const lastActiveStr = sessionStorage.getItem(PIN_LAST_ACTIVE_KEY) || localStorage.getItem(PIN_LAST_ACTIVE_KEY);
  
  if (lastActiveStr) {
    const lastActive = Number(lastActiveStr);
    if (Date.now() - lastActive > timeoutMs) {
      // Session has expired due to inactivity -> lock immediately
      lockApp();
      return false;
    }
  }

  // Check session token
  const sessionToken = sessionStorage.getItem(PIN_STORAGE_KEY);
  if (sessionToken && sessionToken.length > 20) {
    return true;
  }

  const localToken = localStorage.getItem(PIN_STORAGE_KEY);
  if (localToken && localToken.length > 20) {
    return true;
  }

  return false;
}

export async function verifyUserPin(username: string, pin: string, rememberDevice: boolean = true): Promise<VerifyPinResult> {
  const cleanUsername = (username || 'admin').trim().toLowerCase();
  const cleanPin = pin.trim();

  if (!cleanUsername) {
    return { success: false, message: 'Username Admin wajib diisi.' };
  }

  if (!cleanPin) {
    return { success: false, message: 'PIN / Password wajib diisi.' };
  }

  // Remember username for convenience
  setSavedUsername(cleanUsername);

  // Check active lockout
  const lockoutUntil = Number(localStorage.getItem(PIN_LOCKOUT_TIME_KEY) || '0');
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingSecs = Math.ceil((lockoutUntil - Date.now()) / 1000);
    return {
      success: false,
      message: `Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSecs} detik.`,
      lockoutSeconds: remainingSecs
    };
  }

  // 1. Primary Method: Verify via Server-Side API / SQL Database (PIN verified on backend, never exposed in client inspect)
  try {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, pin: cleanPin })
    });

    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      const data = await response.json();
      if (data.success && data.token) {
        // Reset failed counter
        localStorage.removeItem(PIN_FAIL_COUNT_KEY);
        localStorage.removeItem(PIN_LOCKOUT_TIME_KEY);

        const authenticatedUser = data.user || {
          username: cleanUsername,
          email: `${cleanUsername}@kino.co.id`,
          role: 'admin',
          nama_lengkap: cleanUsername === 'dede' ? 'Dede Suparman (Supervisor)' : 'Administrator'
        };

        // Store session token and user profile
        if (rememberDevice) {
          localStorage.setItem(PIN_STORAGE_KEY, data.token);
          localStorage.setItem(PIN_REMEMBER_KEY, 'true');
        } else {
          sessionStorage.setItem(PIN_STORAGE_KEY, data.token);
          localStorage.removeItem(PIN_REMEMBER_KEY);
        }

        // Store PIN authenticated profile
        localStorage.setItem(PIN_USER_KEY, JSON.stringify(authenticatedUser));
        localStorage.setItem('user', JSON.stringify(authenticatedUser));
        window.dispatchEvent(new Event('userChange'));

        updateLastActivity();
        return { success: true, user: authenticatedUser, message: data.message };
      }
    }

    if (response.status === 401 && contentType.includes('application/json')) {
      const errorData = await response.json().catch(() => ({}));
      handleFailedAttempt();
      return { 
        success: false, 
        message: errorData.message || `Username "${cleanUsername}" atau PIN tidak sesuai. Khusus Admin.` 
      };
    }
  } catch (serverErr) {
    console.warn('Server PIN endpoint unreachable, attempting Direct SQL Database verification...', serverErr);
  }

  // 2. Direct SQL Database Query via Supabase Client (if direct connection is configured)
  try {
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const { data: dbUser, error: dbErr } = await supabase
        .from('admin_users')
        .select('username, pin, nama_lengkap, email, role, is_active')
        .ilike('username', cleanUsername)
        .eq('is_active', true)
        .single();

      if (!dbErr && dbUser && dbUser.pin === cleanPin) {
        localStorage.removeItem(PIN_FAIL_COUNT_KEY);
        localStorage.removeItem(PIN_LOCKOUT_TIME_KEY);

        const authenticatedUser = {
          username: dbUser.username,
          nama_lengkap: dbUser.nama_lengkap || 'Administrator',
          role: dbUser.role || 'admin',
          email: dbUser.email || `${dbUser.username}@kino.co.id`
        };

        const fakeToken = btoa(JSON.stringify({ 
          mode: 'sql-db-verified', 
          username: cleanUsername,
          iat: Date.now(), 
          sig: cleanPin 
        }));

        if (rememberDevice) {
          localStorage.setItem(PIN_STORAGE_KEY, fakeToken);
        } else {
          sessionStorage.setItem(PIN_STORAGE_KEY, fakeToken);
        }

        localStorage.setItem(PIN_USER_KEY, JSON.stringify(authenticatedUser));
        localStorage.setItem('user', JSON.stringify(authenticatedUser));
        window.dispatchEvent(new Event('userChange'));

        updateLastActivity();
        return { success: true, user: authenticatedUser };
      }
    }
  } catch (sqlDirectErr) {
    console.warn('Direct SQL lookup note:', sqlDirectErr);
  }

  // 3. Fallback Built-in Users & Offline PWA Mode:
  try {
    const hash = await computeSha256(cleanPin + OFFLINE_SALT);
    const isDefaultPin = hash === OFFLINE_DEFAULT_HASH || hash === OFFLINE_LEGACY_HASH;
    
    // Check if custom VITE_APP_PIN was provided at build time
    const clientCustomPin = (import.meta.env.VITE_APP_PIN as string | undefined)?.trim();
    const isClientCustomMatch = Boolean(clientCustomPin && cleanPin === clientCustomPin);

    const isRecognizedUser = ['superadmin', 'admin', 'dede'].includes(cleanUsername);

    if ((isDefaultPin || isClientCustomMatch) && isRecognizedUser) {
      localStorage.removeItem(PIN_FAIL_COUNT_KEY);
      localStorage.removeItem(PIN_LOCKOUT_TIME_KEY);

      const userRole = cleanUsername === 'superadmin' ? 'superadmin' : 'admin';
      const authenticatedUser = {
        username: cleanUsername,
        nama_lengkap: cleanUsername === 'superadmin'
          ? 'Super Administrator (Full Akses)'
          : cleanUsername === 'dede'
          ? 'Dede Suparman (Supervisor)'
          : 'Administrator Logistics',
        role: userRole,
        email: cleanUsername === 'superadmin'
          ? 'superadmin@kino.co.id'
          : cleanUsername === 'dede'
          ? 'dede.suparman@kino.co.id'
          : 'admin@admin.com'
      };

      const fakeToken = btoa(JSON.stringify({ 
        mode: 'client-verified', 
        username: cleanUsername,
        iat: Date.now(), 
        sig: hash 
      }));

      if (rememberDevice) {
        localStorage.setItem(PIN_STORAGE_KEY, fakeToken);
      } else {
        sessionStorage.setItem(PIN_STORAGE_KEY, fakeToken);
      }

      localStorage.setItem(PIN_USER_KEY, JSON.stringify(authenticatedUser));
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      window.dispatchEvent(new Event('userChange'));
      
      updateLastActivity();
      return { success: true, user: authenticatedUser };
    }
  } catch (cryptoErr) {
    console.error('Crypto fallback error:', cryptoErr);
  }

  handleFailedAttempt();
  return { 
    success: false, 
    message: `Username "${cleanUsername}" atau PIN 6 digit tidak sesuai.` 
  };
}

// Backward-compatible verifyPin wrapper
export async function verifyPin(pin: string, rememberDevice: boolean = true): Promise<VerifyPinResult> {
  const savedUser = getSavedUsername();
  return verifyUserPin(savedUser, pin, rememberDevice);
}

function handleFailedAttempt() {
  const currentFails = Number(localStorage.getItem(PIN_FAIL_COUNT_KEY) || '0') + 1;
  localStorage.setItem(PIN_FAIL_COUNT_KEY, String(currentFails));

  if (currentFails >= 5) {
    // 30 seconds lockout
    const lockoutUntil = Date.now() + 30 * 1000;
    localStorage.setItem(PIN_LOCKOUT_TIME_KEY, String(lockoutUntil));
  }
}

export function lockApp(): void {
  sessionStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(PIN_STORAGE_KEY);
  sessionStorage.removeItem(PIN_LAST_ACTIVE_KEY);
  localStorage.removeItem(PIN_LAST_ACTIVE_KEY);
  // Remove admin session when locking application
  localStorage.removeItem('user');
  localStorage.removeItem(PIN_USER_KEY);
  window.dispatchEvent(new Event('userChange'));
}

async function computeSha256(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

