// Secure User & PIN Authentication Utility & Inactivity Auto-Lock Manager
// Protects the app with Username and 6-Digit PIN with SQL Database Integration (tabel admin_users / users)

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

// User Preset Interface
export interface PinUserPreset {
  username: string;
  nama: string;
  role?: string;
  isDefault?: boolean;
}

export const DEFAULT_ADMIN_PRESETS: PinUserPreset[] = [];

export function getAuthenticatedUser(): { username: string; nama_lengkap: string; role: string; email?: string } | null {
  try {
    const raw = localStorage.getItem(PIN_USER_KEY) || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(PIN_LAST_USER_KEY) || '';
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
  const cleanUsername = (username || '').trim().toLowerCase();
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

  // 1. Primary Method: Verify via Server-Side API (backend queries database)
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
          nama_lengkap: cleanUsername
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
        message: errorData.message || `Username "${cleanUsername}" atau PIN tidak sesuai. Semua kredensial diverifikasi langsung dari database.` 
      };
    }
  } catch (serverErr) {
    console.warn('Server PIN endpoint unreachable, attempting Direct SQL Database verification...', serverErr);
  }

  // 2. Direct SQL Database Query via Supabase Client (Tabel: admin_users / users)
  try {
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      const { data: dbUsers, error: dbErr } = await supabase
        .from('admin_users')
        .select('id, username, pin, password, nama_lengkap, nama, email, role, is_active')
        .eq('is_active', true);

      if (!dbErr && Array.isArray(dbUsers) && dbUsers.length > 0) {
        const cleanNoSpace = cleanUsername.replace(/[\s._-]+/g, '');
        const matchedDbUser = dbUsers.find((u: any) => {
          const uName = String(u.username || '').trim().toLowerCase();
          const uEmail = String(u.email || '').trim().toLowerCase();
          const uFullName = String(u.nama_lengkap || u.nama || '').trim().toLowerCase().replace(/[\s._-]+/g, '');
          const uNameNoSpace = uName.replace(/[\s._-]+/g, '');

          return (
            uName === cleanUsername ||
            uNameNoSpace === cleanNoSpace ||
            uEmail === cleanUsername ||
            uFullName === cleanNoSpace ||
            (cleanNoSpace.length >= 4 && uFullName.includes(cleanNoSpace)) ||
            (cleanNoSpace.length >= 4 && cleanNoSpace.includes(uFullName))
          );
        });

        if (matchedDbUser) {
          const dbPin = String(matchedDbUser.pin || '').trim();
          const dbPassword = String(matchedDbUser.password || '').trim();
          const isPinValid = (dbPin && cleanPin === dbPin) || (dbPassword && cleanPin === dbPassword);

          if (isPinValid) {
            localStorage.removeItem(PIN_FAIL_COUNT_KEY);
            localStorage.removeItem(PIN_LOCKOUT_TIME_KEY);

            const authenticatedUser = {
              username: matchedDbUser.username || cleanUsername,
              nama_lengkap: matchedDbUser.nama_lengkap || matchedDbUser.nama || matchedDbUser.username || 'Pengguna',
              role: (matchedDbUser.role || 'admin').toLowerCase(),
              email: matchedDbUser.email || `${matchedDbUser.username || cleanUsername}@kino.co.id`
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

            // Update last_login into admin_users
            void supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', matchedDbUser.id);

            updateLastActivity();
            return { success: true, user: authenticatedUser };
          }
        }
      }
    }
  } catch (sqlDirectErr) {
    console.warn('Direct SQL lookup note:', sqlDirectErr);
  }

  handleFailedAttempt();
  return { 
    success: false, 
    message: `Username "${cleanUsername}" atau PIN / Password tidak sesuai dengan data di database.` 
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

