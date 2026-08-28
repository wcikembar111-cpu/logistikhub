import React, { useState } from 'react';
import { Lock, Mail, KeyRound, Eye, EyeOff, ShieldCheck, Database, User } from 'lucide-react';
import { useAuth } from '../hooks/useSupabase';
import { useNotification } from '../context/NotificationContext';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [identifier, setIdentifier] = useState('admin@admin.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast, showAlert } = useNotification();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = identifier.trim();
    const cleanPass = password.trim();
    
    if (!cleanId || !cleanPass) {
      return showToast('Isi Kredensial', 'Email/Username dan Password wajib diisi', 'warning');
    }

    setLoading(true);
    try {
      await login(cleanId, cleanPass);
      showToast('Login Berhasil', `Selamat datang, Anda berhasil masuk sebagai Admin`, 'success');
      onSuccess();
    } catch (e: any) {
      showAlert('Gagal Login Admin', e.message || 'Email/Username atau Password tidak sesuai', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1055] flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-150 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-slate-200 text-slate-800 animate-scale-up">
        {/* Modal Header */}
        <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex justify-between items-center">
          <h5 className="font-extrabold text-slate-900 flex items-center gap-2.5 m-0 text-base">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
              <Lock size={16} />
            </div>
            Login Admin Beranda
          </h5>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 font-bold text-lg transition-colors bg-transparent border-none cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleLogin} className="p-6 bg-white">
          <div className="mb-4 text-[11px] font-semibold text-blue-900 border border-blue-200 p-2.5 bg-blue-50 rounded-xl flex items-center gap-2">
            <ShieldCheck size={15} className="text-blue-600 shrink-0" />
            <span>Login Administrator sistem beranda (terhubung ke tabel <strong>users</strong>)</span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="mb-3">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Preset Akun Admin:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIdentifier('admin@admin.com');
                  setPassword('Kino.2026');
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  identifier === 'admin@admin.com'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                admin@admin.com
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdentifier('admin');
                  setPassword('Kino.2026');
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  identifier === 'admin'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                admin (Username)
              </button>
            </div>
          </div>
          
          {/* Email / Username Input */}
          <div className="mb-3">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email atau Username:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={15} />
              </div>
              <input 
                type="text" 
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-2xs" 
                placeholder="Email (admin@admin.com) atau Username" 
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <KeyRound size={15} />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white text-slate-900 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-2xs" 
                placeholder="Masukkan Password (e.g. Kino.2026)" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading} 
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'MEMVERIFIKASI...' : 'MASUK SEBAGAI ADMIN'}
          </button>

          {/* Footer Info */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Database size={12} className="text-emerald-600" />
              Database: <code className="font-bold text-slate-700">users</code>
            </span>
            <span>Default: <strong className="text-slate-700 font-mono">Kino.2026</strong></span>
          </div>
        </form>
      </div>
    </div>
  );
}
