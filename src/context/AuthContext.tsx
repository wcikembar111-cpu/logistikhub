import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { UserSession, UserPermissions, AuthLoginResult } from '../types';

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  canInputIncoming: true,
  canTally: true,
  canEditMasterBarang: true,
  canManageUsers: true,
  canApproveQC: true,
  canAccessDatabase: true
};

export const DEFAULT_PELAKSANA_PERMISSIONS: UserPermissions = {
  canInputIncoming: true,
  canTally: true,
  canEditMasterBarang: false,
  canManageUsers: false,
  canApproveQC: false,
  canAccessDatabase: false
};

const STORAGE_KEY_USER = 'ckb_logistic_session_user';
const STORAGE_KEY_LAST_ACTIVE = 'ckb_logistic_session_last_active';
const LEGACY_STORAGE_KEY = 'ckb_logistic_active_user';

// 30 Minutes Inactivity Auto-Logout (1,800,000 ms)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// 28 Minutes Warning Threshold (1,680,000 ms -> 120s remaining)
const WARNING_THRESHOLD_MS = 28 * 60 * 1000;

interface InactivityWarningState {
  show: boolean;
  remainingSeconds: number;
}

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isPelaksana: boolean;
  permissions: UserPermissions;
  inactivityWarning: InactivityWarningState;
  login: (usernameInput: string, pinInput: string) => Promise<AuthLoginResult>;
  logout: (reason?: 'manual' | 'inactivity' | string) => void;
  resetInactivityTimer: () => void;
  refreshSession: () => Promise<void>;
  updateCurrentUserProfile: (updatedData: Partial<UserSession>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [inactivityWarning, setInactivityWarning] = useState<InactivityWarningState>({
    show: false,
    remainingSeconds: 120
  });

  const lastActiveRef = useRef<number>(Date.now());
  const activityThrottledRef = useRef<number>(0);

  // Initialize session from sessionStorage on mount (Clean up legacy persistent auto-logins)
  useEffect(() => {
    try {
      // Always remove legacy persistent localStorage keys so stale logins do not bypass the login screen
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem('ckb_logistic_last_active_time');

      const storedUser = sessionStorage.getItem(STORAGE_KEY_USER);
      const storedLastActive = sessionStorage.getItem(STORAGE_KEY_LAST_ACTIVE);

      if (storedUser) {
        const parsedUser: UserSession = JSON.parse(storedUser);
        const lastActiveTime = storedLastActive ? parseInt(storedLastActive, 10) : Date.now();
        const now = Date.now();

        // If inactive for > 30 minutes, force clean logout
        if (now - lastActiveTime >= INACTIVITY_TIMEOUT_MS) {
          sessionStorage.removeItem(STORAGE_KEY_USER);
          sessionStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
          setUser(null);
        } else {
          setUser(parsedUser);
          lastActiveRef.current = now;
          sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
        }
      }
    } catch (err) {
      console.error('Failed to load user session from sessionStorage:', err);
      sessionStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update activity timestamp (throttled to avoid spamming sessionStorage)
  const recordUserActivity = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;

    // Reset warning modal if active
    setInactivityWarning(prev => {
      if (prev.show) {
        return { show: false, remainingSeconds: 120 };
      }
      return prev;
    });

    if (now - activityThrottledRef.current > 10000) {
      activityThrottledRef.current = now;
      try {
        sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
      } catch {}
    }
  }, []);

  // Reset inactivity timer explicitly (e.g. from "Tetap Masuk" button)
  const resetInactivityTimer = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    activityThrottledRef.current = now;
    try {
      sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
    } catch {}
    setInactivityWarning({ show: false, remainingSeconds: 120 });
  }, []);

  // Logout function
  const logout = useCallback((reason: 'manual' | 'inactivity' | string = 'manual') => {
    try {
      sessionStorage.removeItem(STORAGE_KEY_USER);
      sessionStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
      sessionStorage.removeItem('should_play_welcome_greeting');
      sessionStorage.removeItem('last_greeted_user_session');
      sessionStorage.removeItem('pending_welcome_user');
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem('ckb_logistic_last_active_time');
      sessionStorage.setItem('ckb_auth_just_logged_out', Date.now().toString());
    } catch {}
    setUser(null);
    setInactivityWarning({ show: false, remainingSeconds: 120 });

    // Broadcast logout event to immediately clean up and clear any login form inputs in the DOM
    window.dispatchEvent(new CustomEvent('ckb-auth-logout'));

    if (reason === 'inactivity' || reason === 'Inactivity') {
      window.dispatchEvent(new CustomEvent('ckb-auth-inactivity-logout'));
    }
  }, []);

  // Inactivity detection interval
  useEffect(() => {
    if (!user) {
      setInactivityWarning({ show: false, remainingSeconds: 120 });
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActiveRef.current;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        // Exceeded 30 minutes -> Auto Logout
        logout('inactivity');
      } else if (elapsed >= WARNING_THRESHOLD_MS) {
        // Between 28 and 30 minutes -> Show Warning Modal with ticking remaining seconds
        const remainingMs = INACTIVITY_TIMEOUT_MS - elapsed;
        const remainingSec = Math.max(1, Math.ceil(remainingMs / 1000));
        setInactivityWarning({
          show: true,
          remainingSeconds: remainingSec
        });
      } else {
        if (inactivityWarning.show) {
          setInactivityWarning({ show: false, remainingSeconds: 120 });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, logout, inactivityWarning.show]);

  // Global user activity event listeners
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'wheel', 'pointerdown'];
    const handleEvent = () => recordUserActivity();

    events.forEach(eventName => {
      window.addEventListener(eventName, handleEvent, { passive: true });
    });

    return () => {
      events.forEach(eventName => {
        window.removeEventListener(eventName, handleEvent);
      });
    };
  }, [user, recordUserActivity]);

  // Sesuai dengan spesifikasi prompt user:
  // Logika Implementasi Fungsi Login (TypeScript / JavaScript)
  const login = async (usernameInput: string, pinInput: string): Promise<AuthLoginResult> => {
    // 1. Sanitasi input
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPin = pinInput.trim();

    if (!cleanUsername || !cleanPin) {
      return { success: false, message: 'Username dan PIN wajib diisi.' };
    }

    try {
      // 2. Cari user di database Supabase berdasarkan username
      const { data: userRecord, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', cleanUsername)
        .maybeSingle();

      if (error) {
        console.error('Database query error:', error);

        // Fallback grace period jika tabel 'users' belum dibuat di Supabase
        if (error.code === '42P01' || error.message.includes('relation "public.users" does not exist')) {
          // Jika admin default mencoba login saat tabel belum ter-deploy di Supabase
          if (cleanUsername === 'admin' && cleanPin === '123456') {
            const defaultAdminSession: UserSession = {
              id: 'usr-admin-default',
              username: 'admin',
              nama: 'Administrator Utama',
              role: 'Admin',
              status: 'Aktif',
              avatar: '',
              email_google: '',
              permissions: DEFAULT_ADMIN_PERMISSIONS,
              loggedInAt: Date.now()
            };
            sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(defaultAdminSession));
            sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVE, Date.now().toString());
            lastActiveRef.current = Date.now();
            setUser(defaultAdminSession);
            return {
              success: true,
              user: defaultAdminSession,
              message: 'Selamat datang, Administrator Utama! (Mode Database Setup)'
            };
          }
          return {
            success: false,
            message: 'Tabel "users" belum dibuat di Supabase. Silakan jalankan Skrip SQL Setup di menu SQL.'
          };
        }

        return { success: false, message: 'Gagal menghubungi database: ' + error.message };
      }

      if (!userRecord) {
        // Fallback default admin jika database masih kosong
        if (cleanUsername === 'admin' && cleanPin === '123456') {
          const defaultAdminSession: UserSession = {
            id: 'usr-admin-default',
            username: 'admin',
            nama: 'Administrator Utama',
            role: 'Admin',
            status: 'Aktif',
            avatar: '',
            email_google: '',
            permissions: DEFAULT_ADMIN_PERMISSIONS,
            loggedInAt: Date.now()
          };
          sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(defaultAdminSession));
          sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVE, Date.now().toString());
          lastActiveRef.current = Date.now();
          setUser(defaultAdminSession);
          return {
            success: true,
            user: defaultAdminSession,
            message: 'Selamat datang, Administrator Utama!'
          };
        }
        return { success: false, message: 'Username tidak ditemukan.' };
      }

      // 3. Cek apakah status user aktif
      if (userRecord.status !== 'Aktif') {
        return { 
          success: false, 
          message: 'Akun Anda berstatus Nonaktif. Silakan hubungi Administrator.' 
        };
      }

      // 4. Verifikasi PIN
      if (userRecord.pin !== cleanPin) {
        return { success: false, message: 'PIN yang Anda masukkan salah.' };
      }

      // 5. Normalisasi objek profil sesi
      const userPermissions: UserPermissions = {
        canInputIncoming: userRecord.permissions?.canInputIncoming ?? (userRecord.role === 'Admin'),
        canTally: userRecord.permissions?.canTally ?? true,
        canEditMasterBarang: userRecord.permissions?.canEditMasterBarang ?? (userRecord.role === 'Admin'),
        canManageUsers: userRecord.permissions?.canManageUsers ?? (userRecord.role === 'Admin'),
        canApproveQC: userRecord.permissions?.canApproveQC ?? (userRecord.role === 'Admin'),
        canAccessDatabase: userRecord.permissions?.canAccessDatabase ?? (userRecord.role === 'Admin'),
      };

      const userSession: UserSession = {
        id: userRecord.id,
        username: userRecord.username,
        nama: userRecord.nama || userRecord.username,
        role: userRecord.role || 'Pelaksana',
        status: userRecord.status || 'Aktif',
        avatar: userRecord.avatar || '',
        email_google: userRecord.email_google || '',
        permissions: userPermissions,
        loggedInAt: Date.now()
      };

      // 6. Simpan sesi ke sessionStorage & Context State
      sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userSession));
      sessionStorage.setItem(STORAGE_KEY_LAST_ACTIVE, Date.now().toString());
      lastActiveRef.current = Date.now();
      setUser(userSession);

      return { 
        success: true, 
        user: userSession, 
        message: `Selamat datang, ${userRecord.nama || userRecord.username}!` 
      };

    } catch (err: any) {
      console.error('Login exception:', err);
      return { 
        success: false, 
        message: 'Terjadi kesalahan sistem: ' + (err?.message || 'Unknown error') 
      };
    }
  };

  const refreshSession = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data) {
        if (data.status !== 'Aktif') {
          logout('inactivity');
          return;
        }
        const updatedPermissions: UserPermissions = {
          canInputIncoming: data.permissions?.canInputIncoming ?? (data.role === 'Admin'),
          canTally: data.permissions?.canTally ?? true,
          canEditMasterBarang: data.permissions?.canEditMasterBarang ?? (data.role === 'Admin'),
          canManageUsers: data.permissions?.canManageUsers ?? (data.role === 'Admin'),
          canApproveQC: data.permissions?.canApproveQC ?? (data.role === 'Admin'),
          canAccessDatabase: data.permissions?.canAccessDatabase ?? (data.role === 'Admin'),
        };

        const updatedSession: UserSession = {
          ...user,
          username: data.username,
          nama: data.nama,
          role: data.role,
          status: data.status,
          avatar: data.avatar || '',
          email_google: data.email_google || '',
          permissions: updatedPermissions
        };

        sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedSession));
        setUser(updatedSession);
      }
    } catch (e) {
      console.error('Failed to refresh user session:', e);
    }
  };

  const updateCurrentUserProfile = (updatedData: Partial<UserSession>) => {
    if (!user) return;
    const updated: UserSession = { ...user, ...updatedData };
    setUser(updated);
    try {
      sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updated));
    } catch {}
  };

  const isAdmin = user?.role === 'Admin' || user?.permissions?.canManageUsers === true;
  const isPelaksana = !isAdmin && (user?.role === 'Pelaksana');
  const permissions = user?.permissions || (isAdmin ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_PELAKSANA_PERMISSIONS);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isAdmin,
        isPelaksana,
        permissions,
        inactivityWarning,
        login,
        logout,
        resetInactivityTimer,
        refreshSession,
        updateCurrentUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
