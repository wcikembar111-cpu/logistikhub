import { useEffect, useState } from 'react';
import { AlertOctagon, AlertTriangle, Bell, Info, Megaphone, Volume2, X, MessageSquare, Reply } from 'lucide-react';
import { BroadcastMessage } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';

interface IncomingBroadcastPopupProps {
  broadcast: BroadcastMessage | null;
  onClose: () => void;
  onReply?: (senderName: string) => void;
  soundEnabled: boolean;
}

export function IncomingBroadcastPopup({
  broadcast,
  onClose,
  onReply,
  soundEnabled
}: IncomingBroadcastPopupProps) {
  const [autoCloseTimer, setAutoCloseTimer] = useState<number>(30); // 30 seconds default countdown

  useEffect(() => {
    if (!broadcast) return;

    // Reset countdown timer
    setAutoCloseTimer(30);
    const interval = setInterval(() => {
      setAutoCloseTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [broadcast, onClose]);

  if (!broadcast) return null;

  const isUrgent = broadcast.category === 'urgent';
  const isWarning = broadcast.category === 'warning';
  const isAnnouncement = broadcast.category === 'announcement';

  const categoryStyles = {
    urgent: {
      border: 'border-red-500 ring-4 ring-red-400/40',
      bgHeader: 'bg-red-600 text-white',
      badge: 'bg-red-100 text-red-700 border-red-300',
      icon: <AlertOctagon className="w-8 h-8 text-white animate-bounce" />,
      title: 'SIARAN MENDESAK (URGENT)',
      accentBtn: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      border: 'border-amber-500 ring-4 ring-amber-400/40',
      bgHeader: 'bg-amber-500 text-white',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: <AlertTriangle className="w-8 h-8 text-white animate-pulse" />,
      title: 'PERINGATAN OPERASIONAL',
      accentBtn: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    announcement: {
      border: 'border-emerald-500 ring-4 ring-emerald-400/40',
      bgHeader: 'bg-emerald-600 text-white',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: <Megaphone className="w-8 h-8 text-white" />,
      title: 'PENGUMUMAN RESMI',
      accentBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    info: {
      border: 'border-blue-600 ring-4 ring-blue-400/30',
      bgHeader: 'bg-blue-900 text-white',
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
      icon: <Info className="w-8 h-8 text-white" />,
      title: 'PESAN SIARAN PUBLIK',
      accentBtn: 'bg-blue-900 hover:bg-blue-950 text-white'
    }
  };

  const currentTheme = categoryStyles[broadcast.category] || categoryStyles.info;

  const timeFormatted = new Date(broadcast.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden border-2 ${currentTheme.border} animate-in zoom-in-95 duration-200 flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className={`p-4 sm:p-5 flex items-center justify-between gap-3 ${currentTheme.bgHeader} relative overflow-hidden`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs shrink-0 shadow-inner">
              {currentTheme.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full border border-white/30 text-white">
                  {currentTheme.title}
                </span>
                <span className="text-[11px] font-bold text-white/90">
                  {timeFormatted} WIB
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase mt-0.5 truncate m-0">
                Pesan Dari: {broadcast.sender_name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {soundEnabled && (
              <button
                onClick={() => playBroadcastSound(broadcast.category)}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
                title="Bunyikan Ulang Nada Siaran"
              >
                <Volume2 size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
              title="Tutup Pesan"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Content Body */}
        <div className="p-6 bg-gradient-to-b from-slate-50 to-white flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <MessageSquare size={14} className="text-blue-900" />
              <span>Isi Pesan Siaran:</span>
            </div>
            {broadcast.device_info && (
              <span className="text-[10px] text-slate-400 font-medium italic">
                Dikirim via {broadcast.device_info}
              </span>
            )}
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm text-slate-800 text-sm sm:text-base font-bold leading-relaxed whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
            {broadcast.message}
          </div>

          {/* Progress Timer Auto-Dismiss */}
          <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-slate-400 px-1">
            <span>Menutup otomatis dalam {autoCloseTimer} detik</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full transition-all duration-1000 ${
                isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-900'
              }`}
              style={{ width: `${(autoCloseTimer / 30) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-3">
          {onReply && (
            <button
              onClick={() => {
                onClose();
                onReply(broadcast.sender_name);
              }}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Reply size={15} /> Balas Siaran
            </button>
          )}

          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer ${currentTheme.accentBtn}`}
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
