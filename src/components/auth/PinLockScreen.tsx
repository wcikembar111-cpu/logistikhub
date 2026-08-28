import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Database,
  ArrowRight,
  KeyRound,
  Building2,
  Loader2
} from 'lucide-react';
import { 
  verifyUserPin, 
  getSavedUsername, 
  setSavedUsername,
  DEFAULT_ADMIN_PRESETS
} from '../../utils/pinAuth';
import { supabase } from '../../supabase';
import { PopyMaternityCountdown } from '../countdown/PopyMaternityCountdown';

interface PinLockScreenProps {
  onUnlocked: () => void;
}

interface LoadedUser {
  username: string;
  nama: string;
  role?: string;
  isDefault?: boolean;
}

export function PinLockScreen({ onUnlocked }: PinLockScreenProps) {
  const [username, setUsername] = useState<string>(() => getSavedUsername());
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [authenticatedName, setAuthenticatedName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [shake, setShake] = useState<boolean>(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  const [isCustomUser, setIsCustomUser] = useState<boolean>(false);
  const [availableUsers, setAvailableUsers] = useState<LoadedUser[]>(DEFAULT_ADMIN_PRESETS);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const pinInputRef = useRef<HTMLInputElement>(null);
  const userInputRef = useRef<HTMLInputElement>(null);

  // Live Clock & Date for professional enterprise feel
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s} WIB`);

      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      setCurrentDate(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch registered users list from database (tabel users) for dynamic multi-user selector
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      try {
        let fetched: LoadedUser[] = [];

        // 1. Direct Supabase Query from unified "users" table (Primary Cloud Source of Truth)
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
          const { data, error } = await supabase
            .from('users')
            .select('username, nama_lengkap, nama, role, is_active')
            .eq('is_active', true)
            .order('created_at', { ascending: true });

          if (!error && data && data.length > 0) {
            fetched = data.map((u: any) => ({
              username: u.username,
              nama: u.nama_lengkap || u.nama || u.username,
              role: (u.role || 'admin').toLowerCase(),
              isDefault: ['superadmin', 'admin'].includes(u.username.toLowerCase())
            }));
          }
        }

        // 2. Fallback to API if direct Supabase returned empty
        if (fetched.length === 0) {
          try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
              const json = await res.json();
              if (json.success && Array.isArray(json.users) && json.users.length > 0) {
                fetched = json.users
                  .filter((u: any) => u.is_active !== false)
                  .map((u: any) => ({
                    username: u.username,
                    nama: u.nama_lengkap || u.nama || u.username,
                    role: (u.role || 'admin').toLowerCase(),
                    isDefault: ['superadmin', 'admin'].includes(u.username.toLowerCase())
                  }));
              }
            }
          } catch {}
        }

        if (fetched.length > 0) {
          setAvailableUsers(fetched);
        } else {
          setAvailableUsers(DEFAULT_ADMIN_PRESETS);
        }
      } catch (e) {
        console.warn('Could not fetch dynamic users list, using presets.', e);
        setAvailableUsers(DEFAULT_ADMIN_PRESETS);
      }
    };

    fetchRegisteredUsers();

    // Listen to real-time changes on "users" table so other devices update instantly
    try {
      const channel = supabase
        .channel('pin_screen_realtime_users')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
          fetchRegisteredUsers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {}
  }, []);

  // Synchronize custom user mode with current username
  useEffect(() => {
    const isPreset = availableUsers.some(p => p.username.toLowerCase() === username.toLowerCase());
    setIsCustomUser(!isPreset && Boolean(username));
  }, [username, availableUsers]);

  // Handle Lockout countdown
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSelectPreset = (presetUsername: string) => {
    setUsername(presetUsername);
    setSavedUsername(presetUsername);
    setIsCustomUser(false);
    setErrorMsg('');
    if (pinInputRef.current) {
      pinInputRef.current.focus();
    }
  };

  const submitLogin = async (userToVerify: string, pinToVerify: string) => {
    const cleanUser = (userToVerify || 'admin').trim();
    if (!cleanUser) {
      setErrorMsg('Username Admin tidak boleh kosong.');
      return;
    }

    if (!pinToVerify.trim()) {
      setErrorMsg('PIN / Password wajib diisi.');
      if (pinInputRef.current) pinInputRef.current.focus();
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const result = await verifyUserPin(cleanUser, pinToVerify, rememberDevice);
      if (result.success) {
        setIsSuccess(true);
        setAuthenticatedName(result.user?.nama_lengkap || cleanUser);
        setTimeout(() => {
          onUnlocked();
        }, 500);
      } else {
        setShake(true);
        setErrorMsg(result.message || 'Username atau PIN / Password tidak sesuai.');
        if (result.lockoutSeconds) {
          setLockoutTimer(result.lockoutSeconds);
        }
        setTimeout(() => {
          setShake(false);
          if (pinInputRef.current) pinInputRef.current.focus();
        }, 600);
      }
    } catch {
      setErrorMsg('Gagal memverifikasi akun Admin. Silakan coba lagi.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0 || isVerifying || isSuccess) return;
    submitLogin(username, pin);
  };

  const selectedUserObj = availableUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto"
    >
      {/* Floating Countdown Bar on Top of Lock Screen */}
      <div className="w-full max-w-[440px] flex justify-center mb-3 pointer-events-auto animate-fade-in">
        <PopyMaternityCountdown isAdmin={false} />
      </div>

      {/* Enterprise Modern Login Card */}
      <div className="relative w-full max-w-[430px] rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col text-slate-800 animate-scale-up">
        
        {/* Top Enterprise Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-6 pt-5 pb-4 text-white relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner shrink-0">
                <Building2 size={20} className="text-blue-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black tracking-widest text-blue-300 uppercase leading-none">
                  PT KINO INDONESIA TBK
                </div>
                <h1 className="text-sm font-extrabold text-white tracking-tight m-0 mt-0.5 truncate leading-tight">
                  Logistics & Distribution Portal
                </h1>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] font-bold font-mono text-slate-300">{currentTime}</div>
              <div className="text-[9px] text-slate-400 font-medium">{currentDate}</div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300 font-medium">
            <span className="flex items-center gap-1.5 text-blue-200 font-semibold">
              <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
              Otentikasi Akun & PIN (users)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-400/20">
              Secure v2.6
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 bg-white">
          
          {/* Active Account Selector (User Picker) */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
              <span>Pilih Akun Pengguna:</span>
              {selectedUserObj && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase border ${
                  selectedUserObj.role === 'superadmin' || selectedUserObj.username.toLowerCase() === 'superadmin'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : selectedUserObj.role === 'operator'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-blue-100 text-blue-900 border-blue-300'
                }`}>
                  {selectedUserObj.role === 'superadmin' || selectedUserObj.username.toLowerCase() === 'superadmin'
                    ? '👑 Super Admin (Full Akses)'
                    : selectedUserObj.role || 'Admin'}
                </span>
              )}
            </div>

            <div className="max-h-[160px] overflow-y-auto pr-1 grid grid-cols-3 gap-2">
              {availableUsers.map((u) => {
                const isSelected = !isCustomUser && username.toLowerCase() === u.username.toLowerCase();
                const isSuper = u.role === 'superadmin' || u.username.toLowerCase() === 'superadmin';
                return (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleSelectPreset(u.username)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-left flex flex-col items-center justify-center gap-0.5 cursor-pointer relative ${
                      isSelected
                        ? isSuper
                          ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-400/30 shadow-xs'
                          : 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-400/30 shadow-xs'
                        : isSuper
                        ? 'bg-purple-50/40 hover:bg-purple-50 border-purple-200/80 text-purple-900'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {isSuper && (
                      <span className="absolute -top-1.5 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-[8px] font-black px-1.5 py-0.2 rounded-full shadow-2xs border border-amber-300">
                        FULL
                      </span>
                    )}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] uppercase shadow-2xs mb-0.5 ${
                      isSuper 
                        ? 'bg-purple-600 text-white shadow-purple-200' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isSuper ? '👑' : u.username.slice(0, 2)}
                    </div>
                    <span className="font-extrabold text-[11px] truncate w-full text-center capitalize leading-tight">
                      {u.nama.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-slate-400 font-normal font-mono">
                      @{u.username}
                    </span>
                  </button>
                );
              })}

              {/* Custom Other User Option */}
              <button
                type="button"
                onClick={() => {
                  setIsCustomUser(true);
                  if (userInputRef.current) {
                    userInputRef.current.focus();
                  }
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  isCustomUser
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-400/30 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] shadow-2xs mb-0.5">
                  <User size={12} />
                </div>
                <span className="font-extrabold text-[11px] leading-tight">Akun Lain</span>
                <span className="text-[9px] text-slate-400 font-normal">Ketik Nama</span>
              </button>
            </div>

            {/* Custom Username Input field (when active) */}
            {isCustomUser && (
              <div className="mt-2.5 relative animate-fade-in">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={15} />
                </div>
                <input
                  ref={userInputRef}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setSavedUsername(e.target.value);
                  }}
                  placeholder="Ketik username akun (contoh: supervisor)..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
                />
              </div>
            )}
          </div>

          {/* Standard Password / PIN Input Field */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
              <span className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound size={13} className="text-blue-600" />
                  <span>PIN / Password Akses:</span>
                </span>
                <span className="text-slate-500 font-mono text-[10px] lowercase">
                  user: <strong className="text-blue-700 font-black uppercase font-sans">{username || 'admin'}</strong>
                </span>
              </span>
            </label>

            <div className={`relative ${shake ? 'animate-shake' : ''}`}>
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </div>
              <input
                ref={pinInputRef}
                type={showPassword ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setErrorMsg('');
                }}
                disabled={isVerifying || isSuccess || lockoutTimer > 0}
                placeholder="Ketik PIN / Password..."
                className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed tracking-wider"
                autoFocus
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                tabIndex={-1}
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Controls under Password Field */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1 mt-2">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-slate-300 bg-slate-50 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Ingat Perangkat Ini</span>
              </label>

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-blue-700 transition-colors cursor-pointer text-[10px] font-semibold text-slate-500"
              >
                {showPassword ? 'Tutup Teks' : 'Tampilkan Teks'}
              </button>
            </div>
          </div>

          {/* Error & Feedback Messages */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 mb-3 justify-center animate-fade-in shadow-2xs">
              <AlertCircle size={15} className="text-red-500 shrink-0" />
              <span className="text-center">{errorMsg}</span>
            </div>
          )}

          {lockoutTimer > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center mb-3 animate-pulse shadow-2xs">
              Terkunci sementara selama {lockoutTimer} detik untuk proteksi keamanan.
            </div>
          )}

          {isSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 mb-3 justify-center animate-scale-up shadow-2xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Otentikasi Berhasil! Membuka Portal, {authenticatedName}...</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isVerifying || isSuccess || lockoutTimer > 0 || !pin.trim()}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer mb-3"
          >
            {isVerifying ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Memverifikasi Akses...</span>
              </>
            ) : isSuccess ? (
              <>
                <Unlock size={16} className="text-white" />
                <span>Akses Diberikan</span>
              </>
            ) : (
              <>
                <span>Buka Portal Logistik</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>

          {/* Bottom Card Footer Info */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Database size={11} className="text-emerald-600" />
              Sistem: <code>users</code>
            </span>
            <span>Default PIN: <strong className="font-mono text-slate-800 font-bold">089739</strong></span>
          </div>
        </form>
      </div>
    </div>
  );
}
