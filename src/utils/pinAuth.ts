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

export const DEFAULT_ADMIN_PRESETS: PinUserPreset[] = [
  { username: 'admin', nama: 'Administrator', role: 'admin', isDefault: true },
  { username: 'dede', nama: 'Dede Suparman', role: 'admin', isDefault: true }
];

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

export function matchDbUserCredentials(u: any, cleanUsername: string, cleanPin: string): boolean {
  if (!u) return false;
  if (u.is_active === false || u.is_active === 'false' || u.is_active === 0) {
    return false;
  }

  const uName = String(u.username || '').trim().toLowerCase();
  const uEmail = String(u.email || '').trim().toLowerCase();
  const uFullName = String(u.nama_lengkap || u.nama || u.name || '').trim().toLowerCase();
  const uId = String(u.id || '').trim().toLowerCase();

  const cleanNoSpace = cleanUsername.replace(/[\s._-]+/g, '');
  const uNameNoSpace = uName.replace(/[\s._-]+/g, '');
  const uFullNameNoSpace = uFullName.replace(/[\s._-]+/g, '');
  const emailPrefix = cleanUsername.includes('@') ? cleanUsername.split('@')[0] : cleanUsername;

  const isUserMatch = (
    uName === cleanUsername ||
    uEmail === cleanUsername ||
    uName === emailPrefix ||
    (cleanNoSpace.length >= 3 && uNameNoSpace === cleanNoSpace) ||
    (cleanNoSpace.length >= 3 && uFullNameNoSpace === cleanNoSpace) ||
    uFullName === cleanUsername ||
    (cleanNoSpace.length >= 4 && uFullNameNoSpace.includes(cleanNoSpace)) ||
    (cleanNoSpace.length >= 4 && cleanNoSpace.includes(uFullNameNoSpace)) ||
    (cleanUsername.length > 10 && uId === cleanUsername)
  );

  if (!isUserMatch) return false;

  const dbPin = String(u.pin ?? '').trim();
  const dbPassword = String(u.password ?? '').trim();
  const dbPinCode = String(u.pin_code ?? u.kode_pin ?? u.access_code ?? '').trim();

  const cleanPinNum = cleanPin.replace(/^0+/, '') || '0';
  const dbPinNum = dbPin.replace(/^0+/, '') || '0';
  const dbPinPadded = dbPin.padStart(6, '0');
  const cleanPinPadded = cleanPin.padStart(6, '0');

  const isPinValid = (
    (dbPin && cleanPin === dbPin) ||
    (dbPin && cleanPinPadded === dbPinPadded) ||
    (dbPin && /^\d+$/.test(cleanPin) && /^\d+$/.test(dbPin) && cleanPinNum === dbPinNum) ||
    (dbPassword && cleanPin === dbPassword) ||
    (dbPassword && cleanPin.toLowerCase() === dbPassword.toLowerCase()) ||
    (dbPinCode && cleanPin === dbPinCode)
  );

  return Boolean(isPinValid);
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
  let serverApiChecked = false;
  try {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, pin: cleanPin })
    });

    serverApiChecked = true;
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
  } catch (serverErr) {
    console.warn('Server PIN endpoint unreachable, attempting Direct SQL Database verification...', serverErr);
  }

  // 2. Direct SQL Database Query via Supabase Client (Tabel: admin_users dan fallback ke tabel users)
  try {
    let dbUsers: any[] = [];

    // Check admin_users table first
    const { data: adminUsersData, error: adminUsersErr } = await supabase
      .from('admin_users')
      .select('*');

    if (!adminUsersErr && Array.isArray(adminUsersData) && adminUsersData.length > 0) {
      dbUsers = adminUsersData;
    } else {
      // Fallback: check users table
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*');

      if (!usersErr && Array.isArray(usersData) && usersData.length > 0) {
        dbUsers = usersData;
      }
    }

    if (dbUsers.length > 0) {
      const matchedDbUser = dbUsers.find((u: any) => matchDbUserCredentials(u, cleanUsername, cleanPin));

      if (matchedDbUser) {
        localStorage.removeItem(PIN_FAIL_COUNT_KEY);
        localStorage.removeItem(PIN_LOCKOUT_TIME_KEY);

        const authenticatedUser = {
          username: matchedDbUser.username || cleanUsername,
          nama_lengkap: matchedDbUser.nama_lengkap || matchedDbUser.nama || matchedDbUser.name || matchedDbUser.username || 'Pengguna',
          role: (matchedDbUser.role || 'admin').toLowerCase(),
          email: matchedDbUser.email || `${matchedDbUser.username || cleanUsername}@kino.co.id`
        };

        const generatedToken = btoa(JSON.stringify({ 
          valid: true, 
          username: cleanUsername,
          name: authenticatedUser.nama_lengkap,
          role: authenticatedUser.role,
          iat: Date.now(),
          exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
          sig: cleanPin 
        }));

        if (rememberDevice) {
          localStorage.setItem(PIN_STORAGE_KEY, generatedToken);
          localStorage.setItem(PIN_REMEMBER_KEY, 'true');
        } else {
          sessionStorage.setItem(PIN_STORAGE_KEY, generatedToken);
          localStorage.removeItem(PIN_REMEMBER_KEY);
        }

        localStorage.setItem(PIN_USER_KEY, JSON.stringify(authenticatedUser));
        localStorage.setItem('user', JSON.stringify(authenticatedUser));
        window.dispatchEvent(new Event('userChange'));

        // Update last_login into admin_users or users
        if (matchedDbUser.id) {
          void supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', matchedDbUser.id);
          void supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', matchedDbUser.id);
        }

        updateLastActivity();
        return { 
          success: true, 
          user: authenticatedUser, 
          message: `Login berhasil sebagai ${authenticatedUser.nama_lengkap}.` 
        };
      }
    }
  } catch (sqlDirectErr) {
    console.warn('Direct SQL lookup note:', sqlDirectErr);
  }

  handleFailedAttempt();
  return { 
    success: false, 
    message: `Username "${cleanUsername}" atau PIN / Password tidak sesuai dengan data di tabel admin_users database.` 
  };
}

// Backward-compatible verifyPin wrapper
export async function verifyPin(pin: string, rememberDevice: boolean = true): Promise<VerifyPinResult> {
  const savedUser = getSavedUsername() || 'admin';
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

