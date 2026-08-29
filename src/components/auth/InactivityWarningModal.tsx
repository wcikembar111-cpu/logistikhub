import React from 'react';
import { Clock, ShieldAlert, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useSupabase';

export function InactivityWarningModal() {
  const { inactivityWarning, resetInactivityTimer, logout, user } = useAuth();

  if (!inactivityWarning.show || !user) return null;

  const seconds = inactivityWarning.remainingSeconds;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  const formattedTime = `${minutes}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;

  const progressPercent = Math.max(0, Math.min(100, (seconds / 120) * 100));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-center relative overflow-hidden animate-scale-up">
        {/* Glow background accent */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Animated Warning Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4 shadow-xs animate-bounce">
          <Clock size={32} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold tracking-widest uppercase mb-2">
          <AlertTriangle size={12} className="text-amber-600" />
          <span>PERINGATAN INAKTIVITAS</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-slate-800 m-0 tracking-tight">
          Sesi Anda Akan Berakhir
        </h3>

        <p className="text-xs text-slate-600 mt-1 mb-4 font-medium leading-relaxed">
          Tidak ada aktivitas terdeteksi selama 28 menit. Sistem keamanan akan mengeluarkan akun Anda secara otomatis dalam:
        </p>

        {/* Countdown Box */}
        <div className="my-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-inner">
          <div className="text-4xl sm:text-5xl font-black text-amber-600 tracking-tight font-mono">
            {formattedTime}
          </div>
          <span className="text-[11px] font-bold text-amber-700 tracking-wide mt-1 block">
            {seconds} Detik Tersisa
          </span>

          {/* Linear Progress Bar */}
          <div className="w-full bg-amber-200/60 rounded-full h-2 mt-3 overflow-hidden">
            <div 
              className="bg-amber-600 h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-500 italic mb-5">
          Klik tombol <strong>"Tetap Masuk"</strong> untuk memperpanjang sesi kerja Anda.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <button 
            type="button"
            onClick={() => logout('manual')}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <LogOut size={15} />
            <span>Logout Sekarang</span>
          </button>

          <button 
            type="button"
            onClick={resetInactivityTimer}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={15} className="animate-spin" />
            <span>Tetap Masuk</span>
          </button>
        </div>
      </div>
    </div>
  );
}
