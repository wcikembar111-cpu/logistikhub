import { Radio, Volume2, VolumeX, Send, Bell, BellRing, Check } from 'lucide-react';
import { BroadcastMessage } from '../../types';

interface BroadcastBarProps {
  onOpenBroadcastModal: () => void;
  latestBroadcast: BroadcastMessage | null;
  messageCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => Promise<any>;
  isNotificationSupported?: boolean;
}

export function BroadcastBar({
  onOpenBroadcastModal,
  latestBroadcast,
  messageCount,
  soundEnabled,
  onToggleSound,
  notificationPermission,
  onRequestNotificationPermission,
  isNotificationSupported = true
}: BroadcastBarProps) {
  return (
    <div className="glass-box min-h-[46px] py-1 px-3 sm:px-4 flex flex-wrap items-center justify-between gap-2.5 mb-6 !rounded-2xl border border-white/70 shadow-xs bg-white/40">
      {/* Left: Broadcast Status & Latest Message Preview */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-2.5 py-1 rounded-xl font-black text-[11px] uppercase tracking-wider shrink-0 shadow-xs">
          <Radio size={13} className="text-amber-400 animate-pulse" />
          <span>SIARAN PUBLIK</span>
        </div>

        <div className="min-w-0 flex-1 hidden sm:flex items-center gap-2 overflow-hidden text-xs">
          {latestBroadcast ? (
            <div className="flex items-center gap-1.5 truncate text-slate-700 font-semibold">
              <span className="font-extrabold text-blue-900 uppercase">
                [{latestBroadcast.sender_name}]:
              </span>
              <span className="truncate text-slate-600">
                "{latestBroadcast.message}"
              </span>
            </div>
          ) : (
            <span className="text-slate-500 font-medium text-[11px]">
              Kirim pengumuman instan ke seluruh perangkat yang sedang online.
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {/* Toggle / Request OS Desktop Notification */}
        {isNotificationSupported && (
          notificationPermission === 'granted' ? (
            <div 
              className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 bg-emerald-50 text-emerald-700 border-emerald-300"
              title="Notifikasi Sistem/OS Aktif: Pesan siaran otomatis melayang di layar meskipun membuka aplikasi/tab lain"
            >
              <Bell size={13} className="text-emerald-600" />
              <span className="hidden lg:inline text-[10px]">Notif OS Aktif</span>
            </div>
          ) : (
            <button
              onClick={onRequestNotificationPermission}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs animate-pulse"
              title="Klik untuk mengaktifkan notifikasi pop-up desktop agar siaran tetap muncul saat Anda membuka tab/aplikasi lain"
            >
              <BellRing size={13} className="text-amber-600 animate-bounce" />
              <span className="hidden md:inline text-[10px]">Aktifkan Notif Layar</span>
            </button>
          )
        )}

        {/* Toggle Sound */}
        <button
          onClick={onToggleSound}
          className={`p-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-400 border-slate-300 hover:bg-slate-200 line-through'
          }`}
          title={soundEnabled ? 'Suara Siaran Aktif (Klik untuk Mute)' : 'Suara Siaran Dimatikan'}
        >
          {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          <span className="hidden md:inline">{soundEnabled ? 'Audio On' : 'Mute'}</span>
        </button>

        {/* Kirim Siaran Button */}
        <button
          onClick={onOpenBroadcastModal}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-950 hover:to-indigo-950 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Send size={12} className="text-amber-300" />
          <span>Kirim Siaran</span>
          {messageCount > 0 && (
            <span className="bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full text-[9px] font-black">
              {messageCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
