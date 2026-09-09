import React from 'react';
import { 
  Users, 
  X, 
  RefreshCw, 
  Monitor, 
  Smartphone, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Activity,
  CircleDot
} from 'lucide-react';
import { ActiveOnlineUser } from '../../types';

interface OnlineUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onlineUsers: ActiveOnlineUser[];
  onlineCount: number;
  onRefresh?: () => void;
  onOpenUserManagement?: () => void;
  isAdmin?: boolean;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Baru saja';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 30) return 'Baru saja';
  if (diffSec < 60) return `${diffSec} detik lalu`;
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
}

function getDeviceIcon(device: string = '') {
  const d = device.toLowerCase();
  if (d.includes('mobile') || d.includes('android') || d.includes('iphone')) {
    return <Smartphone size={13} className="text-emerald-600" />;
  }
  return <Monitor size={13} className="text-blue-600" />;
}

export const OnlineUsersModal: React.FC<OnlineUsersModalProps> = ({
  isOpen,
  onClose,
  onlineUsers,
  onlineCount,
  onRefresh,
  onOpenUserManagement,
  isAdmin = false
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <Users size={22} />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                <CircleDot size={12} className="animate-pulse text-emerald-400" />
                <span>Pemantau Realtime</span>
              </div>
              <h2 className="text-lg font-black text-white m-0 tracking-tight flex items-center gap-2">
                <span>Pengguna Sedang Online</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold">
                  {onlineCount} Aktif
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button 
                type="button"
                onClick={onRefresh}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Segarkan Daftar Online"
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-900 font-medium">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-emerald-600 shrink-0" />
            <span>Memantau sesi login yang sedang terhubung ke sistem.</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md">
            Live Updates
          </span>
        </div>

        {/* User List */}
        <div className="p-4 space-y-2.5 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {onlineUsers.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
              <Users size={32} className="mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="font-bold text-slate-700 m-0">Tidak ada pengguna terdeteksi online saat ini.</p>
              <p className="text-[11px] text-slate-400 m-0 mt-0.5">
                Pastikan pengguna sudah login ke aplikasi.
              </p>
            </div>
          ) : (
            onlineUsers.map(u => {
              const isAdminRole = u.role === 'Admin';
              const initials = u.nama
                ? u.nama.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
                : u.username.slice(0, 2).toUpperCase();

              return (
                <div 
                  key={u.id || u.username}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    u.isSelf 
                      ? 'bg-blue-50/70 border-blue-200 ring-1 ring-blue-300/60 shadow-2xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar with live pulse dot */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-2xs ${
                        isAdminRole 
                          ? 'bg-gradient-to-tr from-blue-700 to-indigo-800' 
                          : 'bg-gradient-to-tr from-slate-700 to-slate-800'
                      }`}>
                        {initials}
                      </div>
                      <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                          {u.nama}
                        </span>
                        {u.isSelf && (
                          <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.2 rounded-md uppercase tracking-wider">
                            Anda
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500">
                          @{u.username}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                          isAdminRole 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {u.role}
                        </span>
                      </div>

                      {/* Device & Activity Info */}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md font-medium">
                          {getDeviceIcon(u.device)}
                          <span>{u.device || 'Desktop'}</span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock size={11} />
                          <span>{formatRelativeTime(u.onlineAt)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Pill on Right */}
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100/80 border border-emerald-300 px-2.5 py-1 rounded-xl shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>ONLINE</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium hidden sm:flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-blue-600" />
            <span>Terhubung otomatis melalui Supabase Presence</span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {isAdmin && onOpenUserManagement && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUserManagement();
                }}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck size={13} />
                <span>Kelola Semua User</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
