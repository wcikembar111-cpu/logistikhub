import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  X, 
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useSupabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceLogin?: boolean;
}

export function LoginModal({ isOpen, onClose, forceLogin = false }: LoginModalProps) {
  const { login, user } = useAuth();
  
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanUsername || !cleanPin) {
      setErrorMessage('Username dan PIN wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanUsername, cleanPin);
      if (result.success) {
        setSuccessMessage(result.message);
        setTimeout(() => {
          onClose();
          setUsername('');
          setPin('');
          setSuccessMessage(null);
        }, 700);
      } else {
        setErrorMessage(result.message);
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kesalahan: ' + (err?.message || 'Gagal login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={() => {
        if (!forceLogin) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Accent Gradient Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />

          {!forceLogin && (
            <button 
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0 text-amber-400">
              <Lock size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-amber-300">
                <ShieldCheck size={12} />
                <span>Kino Logistics Studio</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight leading-tight">
                {user ? 'Ganti Akun Pengguna' : 'Masuk ke Sistem'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-blue-200 mt-2 m-0 font-medium">
            Gunakan Username & PIN 4-6 digit Anda untuk mengakses fitur logistik.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          
          {/* Error Message Box */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-shake">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Success Message Box */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Input Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={16} />
              </div>
              <input 
                type="text"
                value={username}
                onChange={e => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="misal: admin, dede, pelaksana1"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Input PIN */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                PIN Keamanan (4-6 Digit)
              </label>
              <button 
                type="button" 
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] font-bold text-blue-900 hover:text-blue-950 flex items-center gap-1 cursor-pointer"
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? 'Sembunyikan' : 'Tampilkan'}</span>
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound size={16} />
              </div>
              <input 
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => {
                  setPin(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Ketik PIN 4-6 digit"
                autoComplete="current-password"
                disabled={loading}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold tracking-wider placeholder:tracking-normal placeholder:text-slate-400 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Action Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Memverifikasi Akun...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
